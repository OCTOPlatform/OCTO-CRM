-- 000008_ultimate_crm_pillars.up.sql

-- 1. Extend tickets with SLA tracking fields
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS frt_due_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_responded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_sla_breached BOOLEAN NOT NULL DEFAULT false;

-- 2. Extend conversations with AI copilot fields & sentiment
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS sentiment VARCHAR(50) NOT NULL DEFAULT 'neutral', -- 'positive', 'neutral', 'negative', 'critical'
ADD COLUMN IF NOT EXISTS ai_summary TEXT DEFAULT '';

-- 3. Extend deals with handover_ticket_id
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS handover_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL;

-- 4. Quotations (CPQ) Table
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'accepted', 'rejected', 'expired'
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) DEFAULT '',
    client_phone VARCHAR(50) DEFAULT '',
    company_name VARCHAR(255) DEFAULT '',
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tax_percentage NUMERIC(5, 2) NOT NULL DEFAULT 11, -- PPN 11% default Indonesia
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    valid_until DATE,
    notes TEXT DEFAULT '',
    terms_conditions TEXT DEFAULT '',
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    order_index INT NOT NULL DEFAULT 0
);

-- 5. WhatsApp Broadcast Campaigns & Recipients
CREATE TABLE IF NOT EXISTS broadcast_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES workspace_channels(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    department VARCHAR(50) NOT NULL DEFAULT 'sales',
    target_filter JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'completed', 'failed'
    scheduled_at TIMESTAMPTZ,
    total_recipients INT NOT NULL DEFAULT 0,
    sent_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    phone_number VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    interpolated_message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMPTZ,
    error_message TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Automations & Triggers Table
CREATE TABLE IF NOT EXISTS workspace_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    automation_type VARCHAR(100) NOT NULL, -- 'deal_won_handover', 'out_of_hours_greeting', 'round_robin_lead'
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, automation_type)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_quotations_workspace ON quotations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_quotations_deal ON quotations(deal_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quo ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_ws ON broadcast_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_camp ON broadcast_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_workspace_automations_ws ON workspace_automations(workspace_id);
