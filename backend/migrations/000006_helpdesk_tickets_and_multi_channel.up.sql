-- 000006_helpdesk_tickets_and_multi_channel.up.sql

-- 1. Extend workspace_members with department
ALTER TABLE workspace_members 
ADD COLUMN IF NOT EXISTS department VARCHAR(50) NOT NULL DEFAULT 'sales';

-- 2. Extend workspace_channels with name, department, assigned user, qr
ALTER TABLE workspace_channels 
ADD COLUMN IF NOT EXISTS channel_name VARCHAR(100) NOT NULL DEFAULT 'WhatsApp Official',
ADD COLUMN IF NOT EXISTS department VARCHAR(50) NOT NULL DEFAULT 'support',
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS qr_code TEXT DEFAULT '';

-- 3. Extend conversations with department and channel_id
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES workspace_channels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS department VARCHAR(50) NOT NULL DEFAULT 'support';

-- 4. Create tickets table for After-Sales Support & Helpdesk
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT 'complaint', -- 'complaint', 'technical', 'billing', 'general', 'feature_request'
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',      -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(50) NOT NULL DEFAULT 'open',          -- 'open', 'in_progress', 'escalated', 'resolved', 'closed'
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    department VARCHAR(50) NOT NULL DEFAULT 'support',   -- 'support', 'technical', 'billing', 'sales'
    sla_due_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create ticket_activities table for internal notes / chatter / audit trail
CREATE TABLE IF NOT EXISTS ticket_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL DEFAULT 'note', -- 'note', 'status_change', 'assignment_change', 'escalation'
    note TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_tickets_workspace ON tickets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tickets_conversation ON tickets(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities ON ticket_activities(ticket_id, created_at ASC);

-- 6. Seed sample data for testing
DO $$
DECLARE
    v_ws_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_user_id UUID := '11111111-1111-1111-1111-111111111111'; -- Budi Santoso
    v_t1_id UUID := '77777777-7777-7777-7777-777777777701';
    v_t2_id UUID := '77777777-7777-7777-7777-777777777702';
BEGIN
    -- Update existing default channel
    UPDATE workspace_channels 
    SET channel_name = 'WhatsApp CS Hotline', department = 'support'
    WHERE workspace_id = v_ws_id AND session_name = 'default';

    -- Insert Sales channel
    INSERT INTO workspace_channels (workspace_id, channel_type, phone_number, session_name, status, is_active, channel_name, department, assigned_user_id)
    VALUES (
        v_ws_id,
        'whatsapp',
        '+6281288889999',
        'sales_team',
        'connected',
        true,
        'WhatsApp Tim Sales',
        'sales',
        v_user_id
    ) ON CONFLICT (workspace_id, channel_type, session_name) DO UPDATE 
    SET channel_name = EXCLUDED.channel_name, department = EXCLUDED.department;

    -- Seed 1 Open Ticket
    INSERT INTO tickets (id, workspace_id, ticket_number, subject, description, category, priority, status, assigned_to_id, created_by_id, department, sla_due_at, created_at)
    VALUES (
        v_t1_id,
        v_ws_id,
        'TCK-202610-001',
        'Kendala Integrasi NFC Reader di Outlet 3',
        'Pelanggan melaporkan terminal NFC tidak merespon saat tapping kartu Google Maps Review di cabang Buah Batu.',
        'technical',
        'high',
        'in_progress',
        v_user_id,
        v_user_id,
        'technical',
        NOW() + INTERVAL '24 hours',
        NOW() - INTERVAL '3 hours'
    ) ON CONFLICT (id) DO NOTHING;

    -- Seed note for t1
    INSERT INTO ticket_activities (ticket_id, user_id, activity_type, note, created_at)
    VALUES 
    (v_t1_id, v_user_id, 'note', 'Tiket dibuat oleh CS Hotline. Sudah dicek firmware terminal versi 2.1.', NOW() - INTERVAL '3 hours'),
    (v_t1_id, v_user_id, 'status_change', 'Status diubah ke In Progress. Menunggu tim teknis mengirimkan patch pembaruan.', NOW() - INTERVAL '1 hour')
    ON CONFLICT DO NOTHING;

    -- Seed 1 Resolved Ticket
    INSERT INTO tickets (id, workspace_id, ticket_number, subject, description, category, priority, status, assigned_to_id, created_by_id, department, sla_due_at, resolved_at, created_at)
    VALUES (
        v_t2_id,
        v_ws_id,
        'TCK-202610-002',
        'Permintaan Faktur Pajak Bulan September',
        'Finance PT Digital Niaga meminta revisi faktur pajak tagihan langganan tahunan.',
        'billing',
        'medium',
        'resolved',
        v_user_id,
        v_user_id,
        'billing',
        NOW() + INTERVAL '48 hours',
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '1 day'
    ) ON CONFLICT (id) DO NOTHING;
END $$;
