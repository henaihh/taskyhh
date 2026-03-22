-- Migration for Admin Panel and Client Invitation System
-- Run this in your Supabase SQL editor

-- Create client_repos table
CREATE TABLE IF NOT EXISTS client_repos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  repo_url text,
  display_name text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text NOT NULL,
  repos jsonb, -- array of {repo_url, display_name}
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  accepted boolean DEFAULT false
);

-- Add role column to user_profiles if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN role text DEFAULT 'client' CHECK (role IN ('admin', 'client'));
  END IF;
END $$;

-- Set admin role for the admin user
UPDATE user_profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'hlace.henry@gmail.com'
);

-- Enable RLS
ALTER TABLE client_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_repos
-- Admin can see all, clients see their own
CREATE POLICY "Admin can view all client_repos" ON client_repos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Client can view own repos" ON client_repos
  FOR SELECT TO authenticated
  USING (email = auth.email());

-- Admin can insert/update/delete client_repos
CREATE POLICY "Admin can insert client_repos" ON client_repos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update client_repos" ON client_repos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete client_repos" ON client_repos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for invitations
-- Admin can see all invitations
CREATE POLICY "Admin can view all invitations" ON invitations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Admin can insert/update/delete invitations
CREATE POLICY "Admin can insert invitations" ON invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update invitations" ON invitations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete invitations" ON invitations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Enhanced RLS policies for tasks - Admin can see all tasks
CREATE POLICY "Admin can view all tasks" ON tasks
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Enhanced RLS policies for user_profiles - Admin can see all profiles
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Update or create the trigger function to handle invitations
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (id, display_name, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url',
    'client'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    avatar_url = NEW.raw_user_meta_data ->> 'avatar_url';

  -- Set admin role for admin user
  IF new.email = 'hlace.henry@gmail.com' THEN
    UPDATE public.user_profiles 
    SET role = 'admin' 
    WHERE id = new.id;
  END IF;

  RETURN new;
END;
$$ language plpgsql security definer;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_repos_email ON client_repos(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);