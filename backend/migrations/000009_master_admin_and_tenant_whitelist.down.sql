-- Migration 000009 Down
DROP INDEX IF EXISTS idx_users_is_superadmin;
DROP INDEX IF EXISTS idx_workspaces_status;

ALTER TABLE workspaces 
DROP COLUMN IF EXISTS expires_at,
DROP COLUMN IF EXISTS max_channels,
DROP COLUMN IF EXISTS max_users,
DROP COLUMN IF EXISTS subscription_plan,
DROP COLUMN IF EXISTS status;

ALTER TABLE users 
DROP COLUMN IF EXISTS is_superadmin;
