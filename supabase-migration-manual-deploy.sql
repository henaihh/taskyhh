-- Migration to add manual deployment flag for clients
-- Run this in Supabase SQL editor

ALTER TABLE user_profiles 
ADD COLUMN manual_deploy_required boolean DEFAULT false;

ALTER TABLE user_profiles 
ADD COLUMN manual_deploy_reason text;

-- Update existing users who need manual deployment (example: Henry's hhdev project)
-- You'll need to run this for specific users who have manual deployment needs
-- UPDATE user_profiles 
-- SET manual_deploy_required = true, 
--     manual_deploy_reason = 'Vercel collaboration not available on free plan' 
-- WHERE id = 'user-id-here';

COMMENT ON COLUMN user_profiles.manual_deploy_required IS 'Flag to indicate if client requires manual deployment after PR merges';
COMMENT ON COLUMN user_profiles.manual_deploy_reason IS 'Reason why manual deployment is required (e.g., Vercel limitations)';