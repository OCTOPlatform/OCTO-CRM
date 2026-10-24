-- 000011_team_inbox_monitoring_governance.down.sql
DROP INDEX IF EXISTS idx_conversations_status;
DROP INDEX IF EXISTS idx_conversations_assigned;
DROP INDEX IF EXISTS idx_conversations_priority;
DROP INDEX IF EXISTS idx_conversations_sla;

ALTER TABLE conversations
DROP COLUMN IF EXISTS escalated_at,
DROP COLUMN IF EXISTS escalation_reason,
DROP COLUMN IF EXISTS escalated_by_id,
DROP COLUMN IF EXISTS escalated_to_id,
DROP COLUMN IF EXISTS sla_due_at,
DROP COLUMN IF EXISTS first_responded_at,
DROP COLUMN IF EXISTS frt_due_at,
DROP COLUMN IF EXISTS is_sla_breached,
DROP COLUMN IF EXISTS priority;
