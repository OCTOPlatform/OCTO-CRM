-- 000003_odoo_crm_features.down.sql
DROP INDEX IF EXISTS idx_activities_deal;
ALTER TABLE deals 
DROP COLUMN IF EXISTS priority,
DROP COLUMN IF EXISTS probability,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS is_lead;
