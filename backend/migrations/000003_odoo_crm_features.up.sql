-- 000003_odoo_crm_features.up.sql

-- 1. Add Odoo-like fields to deals table
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS probability INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_lead BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Allow contact_id to be nullable in activities so activities can attach directly to deals
ALTER TABLE activities ALTER COLUMN contact_id DROP NOT NULL;

-- 3. Add index on activities(deal_id) for high performance chatter queries
CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities(deal_id);

-- 4. Update existing deals with initial probability matching their stage probability
UPDATE deals d
SET probability = s.probability
FROM pipeline_stages s
WHERE d.stage_id = s.id AND (d.probability = 0 OR d.probability IS NULL);

-- 5. Give some sample priority and tags to seeded deals for instant visual polish
UPDATE deals 
SET priority = 3, tags = ARRAY['Hot Lead', 'Enterprise'] 
WHERE title ILIKE '%Enterprise%' OR title ILIKE '%12 Cabang%';

UPDATE deals 
SET priority = 2, tags = ARRAY['Hardware', 'NFC'] 
WHERE title ILIKE '%Smart Review%';

UPDATE deals 
SET priority = 1, tags = ARRAY['WhatsApp API'] 
WHERE title ILIKE '%WhatsApp%';
