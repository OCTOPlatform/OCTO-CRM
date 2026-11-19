-- ==============================================================================
-- 000020_autogopay_merchant_qris_integration.up.sql
-- Integrasi Dynamic QRIS GoPay Merchant via AutoGoPay Gateway
-- ==============================================================================

ALTER TABLE workspace_payment_settings 
ADD COLUMN IF NOT EXISTS autogopay_api_key VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS autogopay_merchant_name VARCHAR(150) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS invoice_qris_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'autogopay', -- 'autogopay', 'midtrans', 'xendit'
    transaction_id VARCHAR(100) NOT NULL DEFAULT '',
    order_id VARCHAR(100) NOT NULL DEFAULT '',
    amount BIGINT NOT NULL DEFAULT 0,
    qr_string TEXT NOT NULL DEFAULT '',
    qr_url TEXT NOT NULL DEFAULT '',
    checkout_url TEXT NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'settlement', 'paid', 'expire', 'cancel'
    generate_count INT NOT NULL DEFAULT 1,
    transaction_time TIMESTAMPTZ,
    expiry_time TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_qris_tx_inv ON invoice_qris_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_qris_tx_order ON invoice_qris_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_qris_tx_trx ON invoice_qris_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_invoice_qris_tx_ws ON invoice_qris_transactions(workspace_id);
