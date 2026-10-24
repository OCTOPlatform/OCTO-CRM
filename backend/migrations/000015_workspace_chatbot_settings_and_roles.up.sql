-- Migration 000015: Workspace Chatbot Settings and Roles Alignment
CREATE TABLE IF NOT EXISTS workspace_bot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    bot_enabled BOOLEAN NOT NULL DEFAULT true,
    bot_name VARCHAR(150) NOT NULL DEFAULT 'Asisten Virtual OCTO',
    greeting_message TEXT NOT NULL DEFAULT 'Halo {name}! 👋 Selamat datang di Layanan Pelanggan {company}.\n\nSaya adalah Asisten Virtual Otomatis. Saya siap membantu Anda 24/7. Silakan pilih menu informasi berikut:\n\n1️⃣ {menu_1_title}\n2️⃣ {menu_2_title}\n3️⃣ {menu_3_title}\n4️⃣ {menu_4_title}\n\nSilakan ketik nomor (1-4) atau tuliskan pertanyaan Anda langsung ya!',
    menu_1_title VARCHAR(150) NOT NULL DEFAULT 'Informasi Produk & Layanan',
    menu_1_keywords TEXT NOT NULL DEFAULT 'produk,fitur,layanan,keunggulan,kemampuan,apa itu',
    menu_1_response TEXT NOT NULL DEFAULT 'Berikut adalah informasi produk dan layanan unggulan kami. Kami berkomitmen memberikan solusi terbaik untuk kebutuhan Anda.\n\nKetik *2* untuk melihat paket harga, atau ketik *CS* jika ingin berbicara langsung dengan tim kami!',
    menu_2_title VARCHAR(150) NOT NULL DEFAULT 'Paket Harga & Penawaran',
    menu_2_keywords TEXT NOT NULL DEFAULT 'harga,paket,biaya,tarif,langganan,pricelist,berapa',
    menu_2_response TEXT NOT NULL DEFAULT 'Kami menyediakan berbagai paket penawaran fleksibel yang dapat disesuaikan dengan kebutuhan Anda.\n\nKetik *CS* untuk mendapatkan simulasi perhitungan biaya dan proposal penawaran resmi dari tim Sales kami!',
    menu_3_title VARCHAR(150) NOT NULL DEFAULT 'Jam Operasional & Alamat Kantor',
    menu_3_keywords TEXT NOT NULL DEFAULT 'jam operasional,jam kerja,alamat,kantor,lokasi,jadwal',
    menu_3_response TEXT NOT NULL DEFAULT '⏰ *Jam Operasional Kantor:* \nSenin - Jumat: 08:00 - 18:00 WIB\nSabtu: 09:00 - 15:00 WIB\n(Layanan Chatbot & Monitoring Darurat aktif 24/7)\n\n📍 *Alamat Kantor:* \nSilakan hubungi tim kami untuk jadwal kunjungan atau temu langsung.',
    menu_4_title VARCHAR(150) NOT NULL DEFAULT 'Hubungi Tim Customer Service (CS) Manusia',
    menu_4_keywords TEXT NOT NULL DEFAULT 'cs,agen,manusia,bantuan,komplain,keluhan,kendala,bicara',
    menu_4_response TEXT NOT NULL DEFAULT 'Pesan Anda telah kami teruskan ke agen Customer Service (CS) manusia kami. Mohon ditunggu sebentar ya!',
    handoff_message TEXT NOT NULL DEFAULT 'Baik {name}, pertanyaan Anda memerlukan penanganan langsung dari tim Customer Service (CS) kami. 👨‍💼👩‍💼\n\nPesan Anda telah kami alihkan ke agen manusia kami dan tim kami sudah menerima notifikasi prioritas untuk segera membalas percakapan ini.\n\nMohon ditunggu sebentar ya kak, agen CS kami akan segera bergabung dalam obrolan ini! 🙏',
    custom_faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_bot_settings_ws ON workspace_bot_settings(workspace_id);

-- Standardize roles: map any legacy 'supervisor' to 'admin'
UPDATE workspace_members SET role = 'admin' WHERE role = 'supervisor';
UPDATE workspace_invitations SET role = 'admin' WHERE role = 'supervisor';

-- Seed default bot templates for each existing workspace
INSERT INTO workspace_bot_settings (
    workspace_id,
    bot_name,
    greeting_message,
    menu_1_title,
    menu_1_response,
    menu_2_title,
    menu_2_response,
    menu_3_title,
    menu_3_response,
    menu_4_title,
    menu_4_response,
    handoff_message
)
SELECT 
    id,
    'Asisten Virtual ' || name,
    'Halo {name}! 👋 Selamat datang di Layanan Pelanggan ' || name || '.\n\nSaya adalah Asisten Virtual Otomatis. Saya siap membantu Anda 24/7. Silakan pilih menu informasi berikut:\n\n1️⃣ {menu_1_title}\n2️⃣ {menu_2_title}\n3️⃣ {menu_3_title}\n4️⃣ {menu_4_title}\n\nSilakan ketik nomor (1-4) atau tuliskan pertanyaan Anda langsung ya!',
    'Informasi Produk & Layanan',
    'Berikut adalah informasi produk dan layanan unggulan dari ' || name || '. Kami berkomitmen memberikan solusi terbaik untuk kebutuhan Anda.\n\nKetik *2* untuk melihat paket harga, atau ketik *CS* jika ingin berbicara langsung dengan tim kami!',
    'Paket Harga & Penawaran',
    'Kami menyediakan berbagai paket penawaran fleksibel yang dapat disesuaikan dengan kebutuhan Anda.\n\nKetik *CS* untuk mendapatkan simulasi perhitungan biaya dan proposal penawaran resmi dari tim Sales kami!',
    'Jam Operasional & Alamat',
    '⏰ *Jam Operasional Kantor:* \nSenin - Jumat: 08:00 - 18:00 WIB\nSabtu: 09:00 - 15:00 WIB\n(Layanan Chatbot & Monitoring Darurat tetap aktif 24/7)\n\n📍 *Alamat Kantor:* \nSilakan hubungi tim kami untuk jadwal kunjungan atau temu langsung.',
    'Hubungi Tim Customer Service (CS) Manusia',
    'Pesan Anda telah kami alihkan ke agen Customer Service (CS) manusia kami. Mohon ditunggu sebentar ya!',
    'Baik {name}, pertanyaan Anda memerlukan penanganan langsung dari tim Customer Service (CS) kami. 👨‍💼👩‍💼\n\nPesan Anda telah kami alihkan ke agen manusia kami dan tim kami sudah menerima notifikasi prioritas untuk segera membalas percakapan ini.\n\nMohon ditunggu sebentar ya kak, agen CS kami akan segera bergabung dalam obrolan ini! 🙏'
FROM workspaces
ON CONFLICT (workspace_id) DO NOTHING;
