-- ==============================================================================
-- seed_realistic_test_data.sql
-- Injeksi data uji nyata (Real Enterprise Test Data) untuk OCTO-CRM
-- Menghapus data dummy/kosong dan mengisi data deal, invoice, dan komisi nyata.
-- ==============================================================================

-- 1. Bersihkan transaksi komisi dummy yang bernilai 0 atau tidak valid
DELETE FROM sales_commissions WHERE deal_amount <= 0 OR commission_amount <= 0;

-- 2. Setup Data Nyata untuk Workspace PT Maju Bersama Solusindo (aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)
DO $$
DECLARE
    ws_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    pipe_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    stage_won_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd06';
    stage_nego_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd05';
    stage_prop_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd04';
    
    budi_id UUID := '11111111-1111-1111-1111-111111111111';
    reza_id UUID := '33333333-3333-3333-3333-333333333333';
    siti_id UUID := '22222222-2222-2222-2222-222222222222';
    
    plan_id UUID;
    deal1_id UUID;
    deal2_id UUID;
    deal3_id UUID;
    deal4_id UUID;
    deal5_id UUID;
    inv1_id UUID;
    inv2_id UUID;
    inv3_id UUID;
    inv4_id UUID;
    inv5_id UUID;
    current_period VARCHAR(20) := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
BEGIN
    -- Pastikan target omset tim bulanan Rp 350.000.000
    INSERT INTO sales_team_targets (workspace_id, period, target_amount)
    VALUES (ws_id, current_period, 350000000.00)
    ON CONFLICT (workspace_id, period) DO UPDATE SET target_amount = 350000000.00;

    -- Ambil skema komisi aktif untuk workspace ini
    SELECT id INTO plan_id FROM sales_commission_plans WHERE workspace_id = ws_id AND is_active = true LIMIT 1;
    IF plan_id IS NULL THEN
        INSERT INTO sales_commission_plans (workspace_id, name, calculation_type, base_rate, threshold_amount, bonus_rate, is_active)
        VALUES (ws_id, 'Skema Insentif Juara 2026', 'tiered_threshold', 3.50, 50000000.00, 6.00, true)
        RETURNING id INTO plan_id;
    END IF;

    -- Update atau buat Deal 1: PT Digital Niaga Indonesia (Budi Santoso - Rp 120.000.000 WON)
    INSERT INTO deals (workspace_id, pipeline_id, stage_id, owner_id, title, value, currency, status, notes, updated_at)
    VALUES (ws_id, pipe_id, stage_won_id, budi_id, 'Lisensi Enterprise CRM & WhatsApp Omnichannel - PT Digital Niaga Indonesia', 120000000.00, 'IDR', 'won', 'Closing deal enterprise 100 user & integrasi WhatsApp gateway', NOW() - INTERVAL '1 day')
    RETURNING id INTO deal1_id;

    -- Invoice 1 Lunas via QRIS
    INSERT INTO invoices (workspace_id, deal_id, invoice_number, issue_date, due_date, type, status, subtotal, tax_amount, total_amount, payment_method, payment_reference, paid_at)
    VALUES (ws_id, deal1_id, 'INV-202611-0011', CURRENT_DATE - 1, CURRENT_DATE + 13, 'invoice', 'paid', 108108108.00, 11891892.00, 120000000.00, 'qris', 'QRIS-OCTO-DNI-001', NOW() - INTERVAL '1 day')
    RETURNING id INTO inv1_id;

    -- Komisi Deal 1 untuk Budi (3.5% = Rp 4.200.000)
    INSERT INTO sales_commissions (workspace_id, user_id, deal_id, invoice_id, plan_id, deal_title, deal_amount, commission_rate, commission_amount, status, period, notes, created_at)
    VALUES (ws_id, budi_id, deal1_id, inv1_id, plan_id, 'Lisensi Enterprise CRM & WhatsApp Omnichannel - PT Digital Niaga Indonesia', 120000000.00, 3.50, 4200000.00, 'approved', current_period, 'Komisi deal enterprise PT Digital Niaga', NOW() - INTERVAL '1 day');

    -- Deal 2: PT Sinergi Prima Logistik (Budi Santoso - Rp 85.000.000 WON)
    INSERT INTO deals (workspace_id, pipeline_id, stage_id, owner_id, title, value, currency, status, notes, updated_at)
    VALUES (ws_id, pipe_id, stage_won_id, budi_id, 'Integrasi Fleet Tracking & B2B Telematics - PT Sinergi Prima Logistik', 85000000.00, 'IDR', 'won', 'Paket kustomisasi fleet tracking & CRM dispatcher', NOW() - INTERVAL '2 hours')
    RETURNING id INTO deal2_id;

    INSERT INTO invoices (workspace_id, deal_id, invoice_number, issue_date, due_date, type, status, subtotal, tax_amount, total_amount, payment_method, payment_reference, paid_at)
    VALUES (ws_id, deal2_id, 'INV-202611-0012', CURRENT_DATE, CURRENT_DATE + 14, 'invoice', 'paid', 76576576.00, 8423424.00, 85000000.00, 'va_bca', 'VA-BCA-829102931', NOW() - INTERVAL '2 hours')
    RETURNING id INTO inv2_id;

    INSERT INTO sales_commissions (workspace_id, user_id, deal_id, invoice_id, plan_id, deal_title, deal_amount, commission_rate, commission_amount, status, period, notes, created_at)
    VALUES (ws_id, budi_id, deal2_id, inv2_id, plan_id, 'Integrasi Fleet Tracking & B2B Telematics - PT Sinergi Prima Logistik', 85000000.00, 3.50, 2975000.00, 'approved', current_period, 'Komisi closing PT Sinergi Prima Logistik', NOW() - INTERVAL '2 hours');

    -- Deal 3: Klinik Medika Sehat Utama (Reza Pratama - Rp 65.000.000 WON)
    INSERT INTO deals (workspace_id, pipeline_id, stage_id, owner_id, title, value, currency, status, notes, updated_at)
    VALUES (ws_id, pipe_id, stage_won_id, reza_id, 'Sistem Reservasi Online & Pasien CRM - Klinik Medika Sehat Utama', 65000000.00, 'IDR', 'won', 'Implementasi CRM 5 cabang klinik & reminder WhatsApp otomatis', NOW() - INTERVAL '2 days')
    RETURNING id INTO deal3_id;

    INSERT INTO invoices (workspace_id, deal_id, invoice_number, issue_date, due_date, type, status, subtotal, tax_amount, total_amount, payment_method, payment_reference, paid_at)
    VALUES (ws_id, deal3_id, 'INV-202611-0013', CURRENT_DATE - 2, CURRENT_DATE + 12, 'invoice', 'paid', 58558558.00, 6441442.00, 65000000.00, 'qris', 'QRIS-OCTO-MEDIKA-03', NOW() - INTERVAL '2 days')
    RETURNING id INTO inv3_id;

    INSERT INTO sales_commissions (workspace_id, user_id, deal_id, invoice_id, plan_id, deal_title, deal_amount, commission_rate, commission_amount, status, period, notes, created_at)
    VALUES (ws_id, reza_id, deal3_id, inv3_id, plan_id, 'Sistem Reservasi Online & Pasien CRM - Klinik Medika Sehat Utama', 65000000.00, 3.50, 2275000.00, 'approved', current_period, 'Komisi implementasi Klinik Medika Sehat', NOW() - INTERVAL '2 days');

    -- Deal 4: PT Retail Nusantara Gemilang (Reza Pratama - Rp 50.000.000 WON)
    INSERT INTO deals (workspace_id, pipeline_id, stage_id, owner_id, title, value, currency, status, notes, updated_at)
    VALUES (ws_id, pipe_id, stage_won_id, reza_id, 'Implementasi POS & CRM Multi-Store - PT Retail Nusantara Gemilang', 50000000.00, 'IDR', 'won', 'Integrasi POS kasir & CRM membership', NOW() - INTERVAL '5 hours')
    RETURNING id INTO deal4_id;

    INSERT INTO invoices (workspace_id, deal_id, invoice_number, issue_date, due_date, type, status, subtotal, tax_amount, total_amount, payment_method, payment_reference, paid_at)
    VALUES (ws_id, deal4_id, 'INV-202611-0014', CURRENT_DATE, CURRENT_DATE + 14, 'invoice', 'paid', 45045045.00, 4954955.00, 50000000.00, 'va_mandiri', 'VA-MANDIRI-9912039', NOW() - INTERVAL '5 hours')
    RETURNING id INTO inv4_id;

    INSERT INTO sales_commissions (workspace_id, user_id, deal_id, invoice_id, plan_id, deal_title, deal_amount, commission_rate, commission_amount, status, period, notes, created_at)
    VALUES (ws_id, reza_id, deal4_id, inv4_id, plan_id, 'Implementasi POS & CRM Multi-Store - PT Retail Nusantara Gemilang', 50000000.00, 3.50, 1750000.00, 'approved', current_period, 'Komisi closing PT Retail Nusantara', NOW() - INTERVAL '5 hours');

    -- Deal 5: CV Berkah Kuliner Nusantara (Siti Rahmawati - Rp 45.000.000 WON)
    INSERT INTO deals (workspace_id, pipeline_id, stage_id, owner_id, title, value, currency, status, notes, updated_at)
    VALUES (ws_id, pipe_id, stage_won_id, siti_id, 'Paket WhatsApp Broadcast & Loyalty Membership - CV Berkah Kuliner Nusantara', 45000000.00, 'IDR', 'won', 'CRM loyalty membership & kampanye broadcast promo', NOW() - INTERVAL '3 days')
    RETURNING id INTO deal5_id;

    INSERT INTO invoices (workspace_id, deal_id, invoice_number, issue_date, due_date, type, status, subtotal, tax_amount, total_amount, payment_method, payment_reference, paid_at)
    VALUES (ws_id, deal5_id, 'INV-202611-0015', CURRENT_DATE - 3, CURRENT_DATE + 11, 'invoice', 'paid', 40540540.00, 4459460.00, 45000000.00, 'qris', 'QRIS-OCTO-BERKAH-05', NOW() - INTERVAL '3 days')
    RETURNING id INTO inv5_id;

    INSERT INTO sales_commissions (workspace_id, user_id, deal_id, invoice_id, plan_id, deal_title, deal_amount, commission_rate, commission_amount, status, period, notes, created_at)
    VALUES (ws_id, siti_id, deal5_id, inv5_id, plan_id, 'Paket WhatsApp Broadcast & Loyalty Membership - CV Berkah Kuliner Nusantara', 45000000.00, 3.50, 1575000.00, 'approved', current_period, 'Komisi closing CV Berkah Kuliner', NOW() - INTERVAL '3 days');

    -- Deal Aktif Terbuka (Open Deals) untuk demo closing langsung:
    INSERT INTO deals (workspace_id, pipeline_id, stage_id, owner_id, title, value, currency, status, notes, updated_at)
    VALUES 
    (ws_id, pipe_id, stage_nego_id, budi_id, 'Transformasi Digital Omnichannel CS - PT Bank Mega Ventura', 95000000.00, 'IDR', 'open', 'Tahap final negosiasi SLA & add-on chatbot WhatsApp', NOW()),
    (ws_id, pipe_id, stage_prop_id, reza_id, 'Sistem Otomasi Drip Marketing & Invoicing - PT Surya Kencana Distribusi', 60000000.00, 'IDR', 'open', 'Pengiriman proposal penawaran harga & simulasi QRIS', NOW()),
    (ws_id, pipe_id, stage_nego_id, siti_id, 'Solusi Helpdesk SLA & Multi-Agent CS - CV Sentosa Jaya Logistik', 30000000.00, 'IDR', 'open', 'Uji coba demo portal tiket CS multi-cabang', NOW());

END $$;

-- 3. Setup Data Nyata untuk Workspace PT Kirana Zein (e0c408e1-4bc2-412f-bf47-e3c31690ff0b)
DO $$
DECLARE
    ws_id UUID := 'e0c408e1-4bc2-412f-bf47-e3c31690ff0b';
    pipe_id UUID := '0cdd76f3-54d7-403a-aa3a-22ebe9418715';
    stage_won_id UUID := '64c2d49d-4fb1-4aa9-ae3b-aa1875fc1808';
    stage_nego_id UUID := '4656029a-8ecf-4979-aea4-3e6f09aab32a';
    
    kirana_id UUID := 'e6b64eba-7d4a-4bb5-96f6-10a863b67bed';
    elzein_id UUID := '77ade4ed-32fd-4606-8662-59ea81fb2f62';
    chandra_id UUID := '449cbdc0-39a0-4901-bd55-b9e4046a7d2e';
    
    plan_id UUID;
    deal_k1 UUID;
    deal_k2 UUID;
    deal_k3 UUID;
    inv_k1 UUID;
    inv_k2 UUID;
    inv_k3 UUID;
    current_period VARCHAR(20) := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
BEGIN
    INSERT INTO sales_team_targets (workspace_id, period, target_amount)
    VALUES (ws_id, current_period, 250000000.00)
    ON CONFLICT (workspace_id, period) DO UPDATE SET target_amount = 250000000.00;

    SELECT id INTO plan_id FROM sales_commission_plans WHERE workspace_id = ws_id AND is_active = true LIMIT 1;

    -- Kirana WON Deal (Rp 75.000.000)
    INSERT INTO deals (workspace_id, pipeline_id, stage_id, owner_id, title, value, currency, status, notes, updated_at)
    VALUES (ws_id, pipe_id, stage_won_id, kirana_id, 'Pengadaan Enterprise CRM & WhatsApp Gateway - PT Prima Perkasa Internasional', 75000000.00, 'IDR', 'won', 'Closing deal enterprise 50 channel', NOW() - INTERVAL '1 day')
    RETURNING id INTO deal_k1;

    INSERT INTO invoices (workspace_id, deal_id, invoice_number, issue_date, due_date, type, status, subtotal, tax_amount, total_amount, payment_method, payment_reference, paid_at)
    VALUES (ws_id, deal_k1, 'INV-KZ-202611-01', CURRENT_DATE - 1, CURRENT_DATE + 13, 'invoice', 'paid', 67567568.00, 7432432.00, 75000000.00, 'qris', 'QRIS-KZ-001', NOW() - INTERVAL '1 day')
    RETURNING id INTO inv_k1;

    INSERT INTO sales_commissions (workspace_id, user_id, deal_id, invoice_id, plan_id, deal_title, deal_amount, commission_rate, commission_amount, status, period, notes, created_at)
    VALUES (ws_id, kirana_id, deal_k1, inv_k1, plan_id, 'Pengadaan Enterprise CRM & WhatsApp Gateway - PT Prima Perkasa Internasional', 75000000.00, 3.50, 2625000.00, 'approved', current_period, 'Komisi PT Prima Perkasa', NOW() - INTERVAL '1 day');

    -- elzein WON Deal (Rp 65.000.000)
    INSERT INTO deals (workspace_id, pipeline_id, stage_id, owner_id, title, value, currency, status, notes, updated_at)
    VALUES (ws_id, pipe_id, stage_won_id, elzein_id, 'Implementasi Modul Invoicing & QRIS Gateway - CV Cahaya Abadi Solusindo', 65000000.00, 'IDR', 'won', 'Closing paket commercial ops', NOW() - INTERVAL '3 hours')
    RETURNING id INTO deal_k2;

    INSERT INTO invoices (workspace_id, deal_id, invoice_number, issue_date, due_date, type, status, subtotal, tax_amount, total_amount, payment_method, payment_reference, paid_at)
    VALUES (ws_id, deal_k2, 'INV-KZ-202611-02', CURRENT_DATE, CURRENT_DATE + 14, 'invoice', 'paid', 58558558.00, 6441442.00, 65000000.00, 'va_bca', 'VA-BCA-KZ-002', NOW() - INTERVAL '3 hours')
    RETURNING id INTO inv_k2;

    INSERT INTO sales_commissions (workspace_id, user_id, deal_id, invoice_id, plan_id, deal_title, deal_amount, commission_rate, commission_amount, status, period, notes, created_at)
    VALUES (ws_id, elzein_id, deal_k2, inv_k2, plan_id, 'Implementasi Modul Invoicing & QRIS Gateway - CV Cahaya Abadi Solusindo', 65000000.00, 3.50, 2275000.00, 'approved', current_period, 'Komisi CV Cahaya Abadi', NOW() - INTERVAL '3 hours');

    -- chandra WON Deal (Rp 40.000.000)
    INSERT INTO deals (workspace_id, pipeline_id, stage_id, owner_id, title, value, currency, status, notes, updated_at)
    VALUES (ws_id, pipe_id, stage_won_id, chandra_id, 'Integrasi API WhatsApp & Chatbot Helpdesk - PT Tri Mega Logistik', 40000000.00, 'IDR', 'won', 'Closing paket integrasi WhatsApp', NOW() - INTERVAL '6 hours')
    RETURNING id INTO deal_k3;

    INSERT INTO invoices (workspace_id, deal_id, invoice_number, issue_date, due_date, type, status, subtotal, tax_amount, total_amount, payment_method, payment_reference, paid_at)
    VALUES (ws_id, deal_k3, 'INV-KZ-202611-03', CURRENT_DATE, CURRENT_DATE + 14, 'invoice', 'paid', 36036036.00, 3963964.00, 40000000.00, 'qris', 'QRIS-KZ-003', NOW() - INTERVAL '6 hours')
    RETURNING id INTO inv_k3;

    INSERT INTO sales_commissions (workspace_id, user_id, deal_id, invoice_id, plan_id, deal_title, deal_amount, commission_rate, commission_amount, status, period, notes, created_at)
    VALUES (ws_id, chandra_id, deal_k3, inv_k3, plan_id, 'Integrasi API WhatsApp & Chatbot Helpdesk - PT Tri Mega Logistik', 40000000.00, 3.50, 1400000.00, 'approved', current_period, 'Komisi PT Tri Mega Logistik', NOW() - INTERVAL '6 hours');
END $$;
