-- Migration 000009: Master Admin & Tenant Whitelist Provisioning

-- 1. Extend users with is_superadmin flag for Platform Operator
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;

-- Mark founder/operator egichandrapratama@gmail.com as the ONLY Platform Master Admin
UPDATE users 
SET is_superadmin = (email = 'egichandrapratama@gmail.com');

-- 2. Extend workspaces with whitelist, plan, quotas, and expiry
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) NOT NULL DEFAULT 'pro',
ADD COLUMN IF NOT EXISTS max_users INT NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS max_channels INT NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '365 days');

CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(status);
CREATE INDEX IF NOT EXISTS idx_users_is_superadmin ON users(is_superadmin);
