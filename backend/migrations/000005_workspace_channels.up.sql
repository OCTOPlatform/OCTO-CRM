-- 000005_workspace_channels.up.sql

CREATE TABLE IF NOT EXISTS workspace_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
    phone_number VARCHAR(50) NOT NULL,
    session_name VARCHAR(100) NOT NULL DEFAULT 'default',
    status VARCHAR(50) NOT NULL DEFAULT 'connected',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, channel_type, session_name)
);

-- Seed default workspace CS WhatsApp channel with developer test CS number
INSERT INTO workspace_channels (workspace_id, channel_type, phone_number, session_name, status, is_active)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'whatsapp',
    '+6281295099738',
    'default',
    'connected',
    true
) ON CONFLICT (workspace_id, channel_type, session_name) DO UPDATE 
SET phone_number = EXCLUDED.phone_number, status = EXCLUDED.status;
