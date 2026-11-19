-- ==============================================================================
-- 000019_workspace_payment_and_qris_settings.up.sql
-- Konfigurasi Akun Rekening Perusahaan & Barcode QRIS Resmi Merchant
-- ==============================================================================

CREATE TABLE IF NOT EXISTS workspace_payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
    bank_name VARCHAR(100) NOT NULL DEFAULT 'Bank Mandiri',
    bank_account_number VARCHAR(100) NOT NULL DEFAULT '123-00-9876543-1',
    bank_account_holder VARCHAR(150) NOT NULL DEFAULT 'PT Maju Bersama Solusindo',
    qris_image_url TEXT NOT NULL DEFAULT '',
    qris_payload TEXT NOT NULL DEFAULT '',
    payment_gateway_provider VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual', 'midtrans', 'xendit'
    payment_gateway_client_key VARCHAR(255) NOT NULL DEFAULT '',
    payment_gateway_server_key VARCHAR(255) NOT NULL DEFAULT '',
    payment_gateway_is_production BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_payment_settings_ws ON workspace_payment_settings(workspace_id);

-- Seed pengaturan default untuk setiap workspace yang sudah ada
DO $$
DECLARE
    ws_rec RECORD;
    qr_url TEXT;
BEGIN
    FOR ws_rec IN SELECT id, name FROM workspaces LOOP
        qr_url := 'https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=00020101021126590014ID.LINKAJA.WWW0118936009140000000000021500000000000000051440014ID.GO-PAY.WWW011893600898000000000002150000000000000005204581253033605802ID59' || 
                  REPLACE(ws_rec.name, ' ', '%20') || '6007JAKARTA61051293062070703A016304';

        INSERT INTO workspace_payment_settings (
            workspace_id, bank_name, bank_account_number, bank_account_holder, qris_image_url, qris_payload, payment_gateway_provider
        ) VALUES (
            ws_rec.id,
            CASE 
                WHEN ws_rec.id = 'e0c408e1-4bc2-412f-bf47-e3c31690ff0b' THEN 'Bank Central Asia (BCA)'
                ELSE 'Bank Mandiri'
            END,
            CASE 
                WHEN ws_rec.id = 'e0c408e1-4bc2-412f-bf47-e3c31690ff0b' THEN '882-019-2810'
                ELSE '123-00-9876543-1'
            END,
            ws_rec.name,
            qr_url,
            '00020101021126590014ID.LINKAJA.WWW0118936009140000000000021500000000000000051440014ID.GO-PAY.WWW011893600898000000000002150000000000000005204581253033605802ID5925' || ws_rec.name || '6007JAKARTA61051293062070703A016304',
            'manual'
        )
        ON CONFLICT (workspace_id) DO NOTHING;
    END LOOP;
END $$;
