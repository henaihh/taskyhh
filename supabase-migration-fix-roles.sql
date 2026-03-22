-- Fix: Set role='client' for all existing users that have NULL role
UPDATE user_profiles SET role = 'client' WHERE role IS NULL;

-- Make sure admin is set
UPDATE user_profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'hlace.henry@gmail.com'
);
