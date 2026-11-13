-- ==============================================================================
-- 000017_invoicing_payment_and_drip_automations.up.sql
-- Invoicing, Quotations, Payment Gateway Simulator & WhatsApp Drip Automations
-- ==============================================================================

-- 1. Invoices & Quotations
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
    type VARCHAR(30) NOT NULL DEFAULT 'invoice', -- 'quotation', 'invoice'
    status VARCHAR(30) NOT NULL DEFAULT 'draft',  -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00, -- PPN (11%)
    discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    terms TEXT DEFAULT 'Pembayaran jatuh tempo dalam 14 hari sejak tanggal penerbitan.',
    payment_method VARCHAR(50) DEFAULT 'qris', -- 'qris', 'va_bca', 'va_mandiri', 'bank_transfer'
    payment_reference VARCHAR(100),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_deal_id ON invoices(deal_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- 2. Invoice & Quotation Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    item_name VARCHAR(200) NOT NULL,
    sku VARCHAR(100),
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- 3. Automation Workflows (WhatsApp Drip & Follow-up Rules)
CREATE TABLE IF NOT EXISTS automation_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL, -- 'lead_inactive_24h', 'deal_stage_changed', 'invoice_paid', 'scheduled_timer'
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    action_type VARCHAR(50) NOT NULL,  -- 'send_whatsapp', 'create_task', 'change_deal_stage'
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    execution_count INT NOT NULL DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_workflows_ws ON automation_workflows(workspace_id);

-- 4. Automation Execution Logs
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL, -- 'lead', 'deal', 'contact', 'invoice'
    target_id VARCHAR(100) NOT NULL,
    target_name VARCHAR(150),
    status VARCHAR(30) NOT NULL DEFAULT 'success', -- 'success', 'failed'
    action_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_workflow_id ON automation_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_ws ON automation_logs(workspace_id);

-- 5. Seed default workflows for workspaces
INSERT INTO automation_workflows (workspace_id, name, description, trigger_type, trigger_config, action_type, action_config, is_active, execution_count)
SELECT 
    id,
    'Auto Follow-up Prospek Dingin 24 Jam',
    'Mengirim sapaan WhatsApp otomatis jika prospek baru tidak merespons dalam 24 jam pertama',
    'lead_inactive_24h',
    '{"inactive_hours": 24}'::jsonb,
    'send_whatsapp',
    '{"template": "Halo {{name}}, apakah ada informasi paket yang bisa kami bantu jelaskan lebih lanjut?"}'::jsonb,
    true,
    14
FROM workspaces
ON CONFLICT DO NOTHING;

INSERT INTO automation_workflows (workspace_id, name, description, trigger_type, trigger_config, action_type, action_config, is_active, execution_count)
SELECT 
    id,
    'Kirim Ucapan & Invoice saat Deal Won',
    'Otomatis kirim ucapan terima kasih dan konfirmasi invoice saat deal ditutup Won',
    'deal_stage_changed',
    '{"target_stage": "won"}'::jsonb,
    'send_whatsapp',
    '{"template": "Terima kasih atas kepercayaan Anda bermitra dengan OCTO! Invoice resmi telah diterbitkan."}'::jsonb,
    true,
    8
FROM workspaces
ON CONFLICT DO NOTHING;

INSERT INTO automation_workflows (workspace_id, name, description, trigger_type, trigger_config, action_type, action_config, is_active, execution_count)
SELECT 
    id,
    'Auto Stock-Out saat Invoice Lunas (QRIS/VA)',
    'Membuat mutasi pengurangan stok gudang otomatis saat invoice terkonfirmasi lunas',
    'invoice_paid',
    '{"auto_stock_out": true}'::jsonb,
    'change_deal_stage',
    '{"target_stage": "won"}'::jsonb,
    true,
    5
FROM workspaces
ON CONFLICT DO NOTHING;
