-- 000011_team_inbox_monitoring_governance.up.sql

-- 1. Extend conversations table with SLA, Escalation, and Governance fields
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
ADD COLUMN IF NOT EXISTS is_sla_breached BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS frt_due_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_responded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalated_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS escalated_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS escalation_reason TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- 2. Indexes for monitoring query performance
CREATE INDEX IF NOT EXISTS idx_conversations_sla ON conversations(workspace_id, is_sla_breached);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON conversations(workspace_id, priority);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(workspace_id, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(workspace_id, status);

-- 3. Seed / Update sample data with SLA deadlines and exceptions for testing
UPDATE conversations
SET 
    frt_due_at = NOW() + INTERVAL '15 minutes',
    sla_due_at = NOW() + INTERVAL '4 hours',
    priority = 'medium'
WHERE frt_due_at IS NULL;
