-- 000002_seed_data.up.sql

DO $$
DECLARE
    v_user_budi_id UUID := '11111111-1111-1111-1111-111111111111';
    v_user_siti_id UUID := '22222222-2222-2222-2222-222222222222';
    v_user_reza_id UUID := '33333333-3333-3333-3333-333333333333';
    v_ws_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_co_digital_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01';
    v_co_kuliner_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02';
    v_co_logistik_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03';
    v_co_medika_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04';
    v_pipe_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    v_stg_new_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd01';
    v_stg_contacted_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd02';
    v_stg_qualified_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd03';
    v_stg_proposal_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd04';
    v_stg_negotiation_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd05';
    v_stg_won_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd06';
    v_stg_lost_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd07';
    v_c1_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01';
    v_c2_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02';
    v_c3_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03';
    v_c4_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee04';
    v_c5_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee05';
    v_deal1_id UUID := 'ffffffff-ffff-ffff-ffff-ffffffffff01';
    v_deal2_id UUID := 'ffffffff-ffff-ffff-ffff-ffffffffff02';
    v_deal3_id UUID := 'ffffffff-ffff-ffff-ffff-ffffffffff03';
    v_deal4_id UUID := 'ffffffff-ffff-ffff-ffff-ffffffffff04';
    v_deal5_id UUID := 'ffffffff-ffff-ffff-ffff-ffffffffff05';
BEGIN
    -- 1. Insert Users (password is 'password123')
    INSERT INTO users (id, email, password_hash, full_name, avatar_url)
    VALUES 
    (v_user_budi_id, 'budi@octocrm.id', '$2a$10$EH1M/3Mxo9O6d6fHXKBhYeMXsH3rN1UjgacaTWoKIrtv31CTzQIG.', 'Budi Santoso', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'),
    (v_user_siti_id, 'siti@octocrm.id', '$2a$10$EH1M/3Mxo9O6d6fHXKBhYeMXsH3rN1UjgacaTWoKIrtv31CTzQIG.', 'Siti Rahmawati', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'),
    (v_user_reza_id, 'reza@octocrm.id', '$2a$10$EH1M/3Mxo9O6d6fHXKBhYeMXsH3rN1UjgacaTWoKIrtv31CTzQIG.', 'Reza Pratama', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80')
    ON CONFLICT (email) DO NOTHING;

    -- 2. Insert Workspace
    INSERT INTO workspaces (id, name, slug, timezone, currency)
    VALUES (v_ws_id, 'PT Maju Bersama Solusindo', 'maju-bersama', 'Asia/Jakarta', 'IDR')
    ON CONFLICT (slug) DO NOTHING;

    -- 3. Workspace Members
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES 
    (v_ws_id, v_user_budi_id, 'owner'),
    (v_ws_id, v_user_siti_id, 'admin'),
    (v_ws_id, v_user_reza_id, 'member')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    -- 4. Companies
    INSERT INTO companies (id, workspace_id, name, industry, website, phone, email, address)
    VALUES 
    (v_co_digital_id, v_ws_id, 'PT Digital Niaga Indonesia', 'E-Commerce & Retail', 'https://digitalniaga.co.id', '021-5551234', 'info@digitalniaga.co.id', 'Jl. Jend. Sudirman Kav 52, Jakarta Selatan'),
    (v_co_kuliner_id, v_ws_id, 'CV Berkah Kuliner Nusantara', 'Food & Beverage', 'https://berkahkuliner.id', '022-7778899', 'halo@berkahkuliner.id', 'Jl. R.E. Martadinata No. 88, Bandung'),
    (v_co_logistik_id, v_ws_id, 'PT Sinergi Prima Logistik', 'Logistics & Supply Chain', 'https://sinergilogistik.com', '031-8889900', 'contact@sinergilogistik.com', 'Jl. Perak Timur No. 120, Surabaya'),
    (v_co_medika_id, v_ws_id, 'Klinik Medika Sehat Utama', 'Healthcare & Wellness', 'https://medikasehat.com', '021-3334455', 'layanan@medikasehat.com', 'Jl. Boulevard Raya Blok M, Kelapa Gading, Jakarta Utara')
    ON CONFLICT DO NOTHING;

    -- 5. Contacts
    INSERT INTO contacts (id, workspace_id, company_id, first_name, last_name, email, phone, normalized_phone, job_title, lead_source, tags, notes, owner_id)
    VALUES 
    (v_c1_id, v_ws_id, v_co_digital_id, 'Andi', 'Wijaya', 'andi.wijaya@digitalniaga.co.id', '081234567890', '6281234567890', 'Direktur Operasional', 'Website', ARRAY['VIP', 'B2B', 'Retail'], 'Tertarik integrasi sistem POS dan CRM multi-store', v_user_reza_id),
    (v_c2_id, v_ws_id, v_co_kuliner_id, 'Dewi', 'Lestari', 'dewi@berkahkuliner.id', '081298765432', '6281298765432', 'Purchasing & Ops Head', 'Referral', ARRAY['F&B', 'Loyalty'], 'Membutuhkan program loyalitas terintegrasi QR Tap', v_user_reza_id),
    (v_c3_id, v_ws_id, v_co_logistik_id, 'Hendro', 'Susanto', 'hendro@sinergilogistik.com', '081345678901', '6281345678901', 'Chief Executive Officer', 'OCTO Tap', ARRAY['Enterprise', 'Logistics'], 'Bertemu saat business networking di Expo Surabaya', v_user_budi_id),
    (v_c4_id, v_ws_id, v_co_medika_id, 'Rina', 'Savitri', 'rina@medikasehat.com', '081287654321', '6281287654321', 'Marketing Head', 'Instagram', ARRAY['Healthcare', 'Repeat Customer'], 'Sangat puas dengan implementasi tahap 1', v_user_reza_id),
    -- Sample duplicate candidate (same phone number as Andi Wijaya)
    (v_c5_id, v_ws_id, NULL, 'Bambang', 'Irawan', 'bambang.i@gmail.com', '081234567890', '6281234567890', 'Store Manager', 'Organic', ARRAY['Prospect'], 'Nomor kontak sama dengan profil Andi Wijaya - kandidat merge', v_user_reza_id)
    ON CONFLICT DO NOTHING;

    -- 6. Pipelines
    INSERT INTO pipelines (id, workspace_id, name, is_default)
    VALUES (v_pipe_id, v_ws_id, 'Sales Pipeline Utama', true)
    ON CONFLICT DO NOTHING;

    -- 7. Pipeline Stages
    INSERT INTO pipeline_stages (id, pipeline_id, name, order_index, probability, is_won, is_lost)
    VALUES 
    (v_stg_new_id, v_pipe_id, 'New Lead', 0, 10, false, false),
    (v_stg_contacted_id, v_pipe_id, 'Contacted', 1, 20, false, false),
    (v_stg_qualified_id, v_pipe_id, 'Qualified', 2, 40, false, false),
    (v_stg_proposal_id, v_pipe_id, 'Proposal', 3, 60, false, false),
    (v_stg_negotiation_id, v_pipe_id, 'Negotiation', 4, 80, false, false),
    (v_stg_won_id, v_pipe_id, 'Won', 5, 100, true, false),
    (v_stg_lost_id, v_pipe_id, 'Lost', 6, 0, false, true)
    ON CONFLICT DO NOTHING;

    -- 8. Deals
    INSERT INTO deals (id, workspace_id, pipeline_id, stage_id, contact_id, company_id, owner_id, title, value, currency, expected_close_date, status, notes)
    VALUES 
    (v_deal1_id, v_ws_id, v_pipe_id, v_stg_proposal_id, v_c1_id, v_co_digital_id, v_user_reza_id, 'Implementasi POS & CRM Multi-Store', 85000000.00, 'IDR', CURRENT_DATE + INTERVAL '14 days', 'open', 'Proposal teknis telah dikirim via email, menunggu review board.'),
    (v_deal2_id, v_ws_id, v_pipe_id, v_stg_qualified_id, v_c2_id, v_co_kuliner_id, v_user_reza_id, 'Pengadaan Loyalty & Membership System', 45000000.00, 'IDR', CURRENT_DATE + INTERVAL '21 days', 'open', 'Kebutuhan fitur membership QR sudah tervalidasi.'),
    (v_deal3_id, v_ws_id, v_pipe_id, v_stg_negotiation_id, v_c3_id, v_co_logistik_id, v_user_budi_id, 'Integrasi Fleet Tracking & B2B CRM', 120000000.00, 'IDR', CURRENT_DATE + INTERVAL '7 days', 'open', 'Dalam tahap negosiasi term pembayaran termin 3 bulan.'),
    (v_deal4_id, v_ws_id, v_pipe_id, v_stg_won_id, v_c4_id, v_co_medika_id, v_user_reza_id, 'Sistem Reservasi & Pasien CRM Klinik', 35000000.00, 'IDR', CURRENT_DATE - INTERVAL '3 days', 'won', 'Deal disepakati dan pembayaran termin 1 telah diterima.'),
    (v_deal5_id, v_ws_id, v_pipe_id, v_stg_new_id, v_c5_id, NULL, v_user_reza_id, 'Paket Starter CRM 5 User', 15000000.00, 'IDR', CURRENT_DATE + INTERVAL '30 days', 'open', 'Lead baru masuk dari form kontak website.')
    ON CONFLICT DO NOTHING;

    -- 9. Tasks
    INSERT INTO tasks (workspace_id, contact_id, deal_id, assigned_to_id, title, description, due_date, priority, status)
    VALUES 
    (v_ws_id, v_c1_id, v_deal1_id, v_user_reza_id, 'Follow-up penawaran proposal POS Multi-Store', 'Hubungi Pak Andi via telepon untuk mengonfirmasi jadwal presentasi manajemen.', CURRENT_TIMESTAMP - INTERVAL '1 day', 'high', 'open'), -- OVERDUE TASK
    (v_ws_id, v_c2_id, v_deal2_id, v_user_reza_id, 'Meeting demo OCTO Tap loyalty via Zoom', 'Presentasikan alur scan QR dan perolehan loyalty poin ke Bu Dewi.', CURRENT_TIMESTAMP + INTERVAL '3 hours', 'urgent', 'open'), -- DUE TODAY
    (v_ws_id, v_c3_id, v_deal3_id, v_user_budi_id, 'Kirim draft kontrak & kesepakatan SLA', 'Siapkan dokumen final legal bersama tim finance sebelum signing.', CURRENT_TIMESTAMP + INTERVAL '2 days', 'high', 'open'),
    (v_ws_id, v_c4_id, v_deal4_id, v_user_reza_id, 'Onboarding & training staf klinik', 'Sesi pelatihan penggunaan CRM untuk admin registrasi pasien.', CURRENT_TIMESTAMP - INTERVAL '2 days', 'medium', 'completed');

    -- 10. Activities (Timeline)
    INSERT INTO activities (workspace_id, contact_id, deal_id, user_id, type, subject, description)
    VALUES 
    (v_ws_id, v_c1_id, v_deal1_id, v_user_reza_id, 'call', 'Telepon kualifikasi kebutuhan', 'Diskusi kebutuhan sinkronisasi 12 cabang retail dengan sistem inventori pusat.'),
    (v_ws_id, v_c1_id, v_deal1_id, v_user_reza_id, 'meeting', 'Presentasi Demo OCTO CRM', 'Demo fitur sales pipeline dan contact timeline kepada Pak Andi dan tim.'),
    (v_ws_id, v_c2_id, v_deal2_id, v_user_reza_id, 'whatsapp', 'Pengiriman brosur & kalkulator ROI', 'Kirim file PDF skema loyalty dan studi kasus F&B ke Bu Dewi.'),
    (v_ws_id, v_c3_id, v_deal3_id, v_user_budi_id, 'meeting', 'Diskusi Business Networking di Expo', 'Diskusi awal seputar kebutuhan integrasi data armada dan customer logistik.'),
    (v_ws_id, v_c4_id, v_deal4_id, v_user_reza_id, 'status_change', 'Deal Won', 'Deal resmi dimenangkan dan dialihkan ke tahap implementasi.');

    -- 11. Custom Field Definitions
    INSERT INTO custom_field_definitions (workspace_id, entity_type, field_key, field_label, field_type, options, is_required)
    VALUES 
    (v_ws_id, 'contact', 'preferred_contact_method', 'Metode Kontak Prioritas', 'select', ARRAY['WhatsApp', 'Telepon', 'Email', 'Kunjungan Langsung'], false),
    (v_ws_id, 'deal', 'budget_approval_status', 'Status Persetujuan Budget', 'select', ARRAY['Approved', 'Pending Board Review', 'Under Review'], false)
    ON CONFLICT DO NOTHING;

    -- 12. Audit Events
    INSERT INTO audit_events (workspace_id, user_id, action, entity_type, entity_id, description, ip_address)
    VALUES 
    (v_ws_id, v_user_budi_id, 'workspace_created', 'workspace', v_ws_id::text, 'Workspace PT Maju Bersama Solusindo berhasil dibuat', '127.0.0.1'),
    (v_ws_id, v_user_budi_id, 'member_invited', 'user', v_user_reza_id::text, 'Mengundang Reza Pratama sebagai member tim sales', '127.0.0.1'),
    (v_ws_id, v_user_reza_id, 'deal_won', 'deal', v_deal4_id::text, 'Deal Sistem Reservasi & Pasien CRM Klinik ditandai Won', '127.0.0.1');

END $$;
