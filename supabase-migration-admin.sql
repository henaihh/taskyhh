-- Migration: Admin Panel + Client Invitation System
-- Run this in the Supabase SQL editor

-- 1. Add role column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'client' CHECK (role IN ('admin', 'client'));

-- Set admin
UPDATE user_profiles SET role = 'admin' WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'hlace.henry@gmail.com'
);

-- 2. Create client_repos table
CREATE TABLE IF NOT EXISTS client_repos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  repo_url text,
  display_name text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 3. Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text NOT NULL,
  repos jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  accepted boolean DEFAULT false
);

-- 4. Enable RLS
ALTER TABLE client_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = user_id AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. RLS Policies for client_repos
CREATE POLICY "Admin full access on client_repos" ON client_repos
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Clients read own repos" ON client_repos
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 6. RLS Policies for invitations
CREATE POLICY "Admin full access on invitations" ON invitations
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can read invitations by token" ON invitations
  FOR SELECT USING (true);

-- 7. Admin RLS policies for existing tables
CREATE POLICY "Admin read all tasks" ON tasks
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admin read all user_profiles" ON user_profiles
  FOR SELECT USING (is_admin(auth.uid()));

-- 8. Update the on_auth_user_created trigger to handle invitations
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  _repo_url text;
  _inv record;
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Check client_repos for pre-assigned repo
  SELECT repo_url INTO _repo_url FROM client_repos WHERE email = NEW.email LIMIT 1;
  IF _repo_url IS NOT NULL THEN
    UPDATE user_profiles SET repo_url = _repo_url WHERE id = NEW.id;
  END IF;

  -- Mark invitations as accepted
  UPDATE invitations
  SET accepted = true, accepted_at = now()
  WHERE email = NEW.email AND accepted = false;

  -- Create client_repos from invitation repos
  FOR _inv IN SELECT * FROM invitations WHERE email = NEW.email LOOP
    IF _inv.repos IS NOT NULL AND jsonb_array_length(_inv.repos) > 0 THEN
      INSERT INTO client_repos (email, repo_url, display_name, created_by)
      SELECT NEW.email, r->>'repo_url', r->>'display_name', NULL
      FROM jsonb_array_elements(_inv.repos) AS r
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Set admin role if applicable
  IF NEW.email = 'hlace.henry@gmail.com' THEN
    UPDATE user_profiles SET role = 'admin' WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (drop if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
