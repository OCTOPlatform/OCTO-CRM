DROP TABLE IF EXISTS broadcast_recipients;
DROP TABLE IF EXISTS broadcast_campaigns;
DROP TABLE IF EXISTS quotation_items;
DROP TABLE IF EXISTS quotations;
DROP TABLE IF EXISTS workspace_automations;

ALTER TABLE deals DROP COLUMN IF EXISTS handover_ticket_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS ai_summary;
ALTER TABLE conversations DROP COLUMN IF EXISTS sentiment;
ALTER TABLE tickets DROP COLUMN IF EXISTS is_sla_breached;
ALTER TABLE tickets DROP COLUMN IF EXISTS first_responded_at;
ALTER TABLE tickets DROP COLUMN IF EXISTS frt_due_at;
