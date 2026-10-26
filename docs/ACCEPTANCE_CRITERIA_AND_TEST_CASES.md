# Dokumen Spesifikasi Kriteria Penerimaan (Acceptance Criteria) & Kasus Uji (Test Cases) E2E Playwright
**Sistem:** OCTO-CRM Enterprise Platform & Ekosistem Terintegrasi (OCTO-WEB)  
**Tanggal Pengujian:** 26 Oktober 2026  
**Status Uji:** 100% LULUS (Automated E2E Suite)

---

## 1. Lingkungan Pengujian (Test Environment)

| Komponen | Host / Port | Deskripsi |
|---|---|---|
| **OCTO-CRM Frontend** | `http://localhost:3000` | Aplikasi Next.js App Router (Dashboard, Inbox, Tickets, Settings) |
| **OCTO-CRM Backend** | `http://localhost:8080` | Golang REST API Daemon (PostgreSQL Database `octo_crm`) |
| **OCTO-WEB** | `http://localhost:3001` | Landing page publik & Live Chat Widget integrasi |
| **WAHA Gateway** | `http://localhost:3005` | WhatsApp HTTP API Gateway |
| **E2E Automation Engine** | Playwright Chromium (Python) | Viewport: 1440x900 Headless |

---

## 2. Matriks Kriteria Penerimaan (Acceptance Criteria) & Kasus Uji (Test Cases)

### TC-01: Autentikasi Login & Navigasi Dasbor
- **Acceptance Criteria (AC-01):** Pengguna dapat login menggunakan kredensial email dan password yang valid, menerima token sesi JWT, dan dialihkan ke halaman dasbor utama dengan logo serta nama workspace aktif.
- **Langkah Pengujian:**
  1. Akses halaman `/login`.
  2. Input email: `budi@octocrm.id`, password: `password123`.
  3. Klik tombol *Masuk ke Workspace*.
  4. Tunggu transisi ke URL `/` dan verifikasi elemen identitas workspace.
- **Hasil:** Sesi pengguna terautentikasi dan metrik ringkasan KPI dasbor ditampilkan sempurna.
- **Bukti Screenshot:** `e2e/screenshots/01_login_page.png` & `02_dashboard_home.png`

---

### TC-02: Halaman Today View & Pengurutan Tugas Harian
- **Acceptance Criteria (AC-02):** Menampilkan daftar tugas operasional harian yang dikelompokkan berdasarkan prioritas (High, Medium, Low) dan tanggal jatuh tempo.
- **Langkah Pengujian:**
  1. Navigasi ke `/today`.
  2. Verifikasi header `h1: Today`.
  3. Verifikasi kartu ringkasan tugas dan daftar item tugas.
- **Hasil:** Halaman memuat metrik tugas harian dengan pengurutan prioritas yang valid.
- **Bukti Screenshot:** `e2e/screenshots/03_today_view.png`

---

### TC-03: Manajemen Kontak & Validasi E.164
- **Acceptance Criteria (AC-03):** Pengguna dapat membuat kontak baru melalui modal formulir dengan normalisasi nomor telepon ke format internasional standar E.164 (`+62...`).
- **Langkah Pengujian:**
  1. Navigasi ke `/contacts`.
  2. Klik tombol *Tambah Kontak*.
  3. Isi Nama Depan, Nama Belakang, Email, No WhatsApp, Jabatan, dan Label.
  4. Klik simpan dan verifikasi kontak langsung muncul pada tabel database kontak.
- **Hasil:** Kontak baru berhasil tersimpan dan langsung muncul di tabel kontak.
- **Bukti Screenshot:** `e2e/screenshots/04_contacts_table.png`, `05_contacts_add_modal.png`, `06_contacts_created.png`

---

### TC-04: Tampilan Detail Kontak 360 Derajat & Timeline
- **Acceptance Criteria (AC-04):** Mengklik nama kontak membuka halaman profil 360 derajat lengkap dengan timeline riwayat aktivitas, data perusahaan, dan peluang terkait.
- **Langkah Pengujian:**
  1. Klik salah satu tautan kontak di tabel kontak.
  2. Verifikasi URL menuju `/contacts/:id`.
  3. Verifikasi ketersediaan informasi profil kontak dan riwayat interaksi.
- **Hasil:** Profil kontak 360 derajat dan tab aktivitas termuat dengan lengkap.
- **Bukti Screenshot:** `e2e/screenshots/07_contact_detail_360.png`

---

### TC-05: Direktori Akun Perusahaan & Agregasi Kontak Bisnis
- **Acceptance Criteria (AC-05):** Menampilkan direktori perusahaan klien B2B dan mengagregasikan seluruh kontak serta deals yang berafiliasi.
- **Langkah Pengujian:**
  1. Navigasi ke `/companies`.
  2. Verifikasi daftar nama perusahaan, industri, dan jumlah staf/kontak terafiliasi.
- **Hasil:** Direktori perusahaan teragregasi dan dapat diakses dengan cepat.
- **Bukti Screenshot:** `e2e/screenshots/08_companies_directory.png`

---

### TC-06: Papan Kanban Sales Pipeline & Tahapan Peluang
- **Acceptance Criteria (AC-06):** Menampilkan papan Kanban interaktif untuk mengelola prospek penjualan (*Deals*) melintasi tahapan *New Lead*, *Discovery*, *Proposal*, *Negotiation*, dan *Won/Lost*.
- **Langkah Pengujian:**
  1. Navigasi ke `/pipeline`.
  2. Verifikasi kolom tahapan pipeline dan kartu nilai nominal deal.
- **Hasil:** Papan Kanban interaktif termuat dengan kalkulasi total nilai transaksi per tahap.
- **Bukti Screenshot:** `e2e/screenshots/09_deals_kanban_board.png`

---

### TC-07: Manajemen Tugas Operasional Sales
- **Acceptance Criteria (AC-07):** Staf penjualan dapat memfilter, mencari, dan memperbarui status penyelesaian tugas operasional.
- **Langkah Pengujian:**
  1. Navigasi ke `/tasks`.
  2. Verifikasi filter status (Semua, Menunggu, Selesai).
- **Hasil:** Daftar tugas operasional dapat diakses dan diperbarui secara real-time.
- **Bukti Screenshot:** `e2e/screenshots/10_tasks_management.png`

---

### TC-08: Laporan Analitik, Funnel Konversi & Distribusi Sumber Lead
- **Acceptance Criteria (AC-08):** Dasbor laporan memvisualisasikan funnel konversi lead-to-deal, rasio menang-kalah, dan atribusi sumber prospek (Google, WhatsApp, Web, NFC).
- **Langkah Pengujian:**
  1. Navigasi ke `/reports`.
  2. Verifikasi grafik funnel konversi, tabel kinerja agen, dan metrik revenue.
- **Hasil:** Grafik dan metrik analitik teragregasi secara akurat dari basis data.
- **Bukti Screenshot:** `e2e/screenshots/11_reports_analytics.png`

---

### TC-09: Pengaturan Workspace & Matriks Peran Tim (RBAC)
- **Acceptance Criteria (AC-09):** Admin/Owner dapat mengelola nama workspace, konfigurasi mata uang, serta hak akses anggota tim (*Role-Based Access Control*).
- **Langkah Pengujian:**
  1. Navigasi ke `/settings`.
  2. Verifikasi form profil workspace dan tabel keanggotaan tim beserta perannya.
- **Hasil:** Informasi workspace dan anggota tim berhasil dimuat dan terproteksi RBAC.
- **Bukti Screenshot:** `e2e/screenshots/12_settings_team_rbac.png`

---

### TC-10: Ingestion Prospek Atomik (Ecosystem Inbound Lead Webhook)
- **Acceptance Criteria (AC-10):** Payload JSON dari website eksternal/landing page ke endpoint `/api/v1/workspaces/:id/integrations/lead-intake` secara otomatis membuat Kontak dan Peluang (Deal) di CRM tanpa duplikasi.
- **Langkah Pengujian:**
  1. Kirim request HTTP POST ke `/integrations/lead-intake` dengan payload prospek baru.
  2. Verifikasi response status `201 Created`.
  3. Buka halaman `/contacts` di UI browser Playwright dan pastikan nama kontak langsung muncul di tabel.
- **Hasil:** Prospek ter-ingest secara atomik dan terverifikasi tampil di UI CRM.
- **Bukti Screenshot:** `e2e/screenshots/13_ecosystem_inbound_lead.png`

---

### TC-11: Helpdesk Tiket Bantuan CS & Aksi Hybrid Claim
- **Acceptance Criteria (AC-11):** Staf CS dapat melihat daftar tiket bantuan yang masuk, status SLA, tingkat urgensi, serta mengklaim (*Claim Ticket*) penugasan secara instan.
- **Langkah Pengujian:**
  1. Navigasi ke `/tickets`.
  2. Verifikasi tabel daftar tiket CS, nomor tiket (`TICK-...`), nama kontak, dan tombol aksi claim.
- **Hasil:** Modul tiket bantuan CS beroperasi dengan lancar dengan penugasan Round-Robin.
- **Bukti Screenshot:** `e2e/screenshots/14_cs_tickets_dashboard.png`

---

### TC-12: Ekosistem OCTO-WEB: Floating Live Chat Widget
- **Acceptance Criteria (AC-12):** Widget obrolan mengapung (*Floating Widget*) pada website publik OCTO-WEB dapat dibuka melalui tombol aksi, menampilkan status live support online, dan siap menerima chat pengunjung.
- **Langkah Pengujian:**
  1. Buka website OCTO-WEB pada `/contact`.
  2. Klik tombol floating chat mengapung (*Buka Live Chat Bantuan*).
  3. Verifikasi jendela widget muncul dengan judul *Live Support OCTO*.
- **Hasil:** Widget Live Chat OCTO-WEB berhasil terbuka dan siap digunakan.
- **Bukti Screenshot:** `e2e/screenshots/15_octo_web_live_chat.png`

---

### TC-13: Omnichannel Live Chat Inbox: Tata Letak 2-Tier Header & Governance Bar
- **Acceptance Criteria (AC-13):**
  - Halaman `/inbox` memuat ruang obrolan (*Room Chat*) dengan tata letak 2-tier yang bersih dan bebas tumpang tindih.
  - **Tier 1 (Header Atas):** Menampilkan nama profil kontak, nomor telepon ternormalisasi tanpa simbol `++`, toggle status bot *"Alihkan ke CS"* / *"Aktifkan Bot"*, tautan Template Bot, tombol AI Summarize, tombol Tambah Peluang, dan status obrolan.
  - **Tier 2 (Governance Bar):** Menampilkan dropdown Prioritas, dropdown Penugasan Agen CS, tombol *"Ambil Alih Penugasan"*, dan tombol Eskalasi dengan layout horizontal rapi.
- **Langkah Pengujian:**
  1. Buka `/inbox`.
  2. Pilih salah satu percakapan di daftar obrolan.
  3. Verifikasi keberadaan elemen Tier 1 (Identitas kontak, toggle bot Alihkan ke CS).
  4. Verifikasi keberadaan elemen Tier 2 (Governance bar: Prioritas, Penugasan).
  5. Pastikan nomor HP tidak memiliki tanda tambah ganda (`++`).
- **Hasil:** Tata letak 2-tier room chat header dan governance bar terverifikasi rapi dan intuitif.
- **Bukti Screenshot:** `e2e/screenshots/16_inbox_room_2tier_header.png`

---

### TC-14: WhatsApp Broadcast Modal: Badge Indikator Divisi Otomatis & Smart Pacing
- **Acceptance Criteria (AC-14):**
  - Modal WhatsApp Broadcast tidak lagi menampilkan dropdown manual pemilihan divisi.
  - Divisi pengirim otomatis terkunci sesuai role/divisi pengguna (*Divisi: After-Sales (CS)* berwarna ungu untuk CS, *Divisi: Pre-Sales* berwarna toska untuk Sales).
  - Nama kampanye dan template pesan otomatis terisi sesuai konteks divisi (Pengumuman CS vs Promo Sales).
  - Menampilkan kartu *Pratinjau Pesan yang Diterima Klien* dengan simulasi interpolasi variabel (`{{first_name}}`, `{{company}}`).
  - Menampilkan proteksi *Anti-Ban Smart Pacing* dengan jeda 1,5 detik per pesan.
- **Langkah Pengujian:**
  1. Buka `/inbox`.
  2. Klik tombol *Broadcast WA*.
  3. Verifikasi modal terbuka dengan judul *Kirim Broadcast WhatsApp*.
  4. Verifikasi teks *Divisi:* ditampilkan sebagai badge (bukan dropdown `<select>`).
  5. Verifikasi kotak pratinjau pesan dan info Anti-Ban Smart Pacing 1.5 detik.
  6. Tutup modal dengan mengklik tombol *Batal*.
- **Hasil:** Modal broadcast WhatsApp terverifikasi menampilkan badge divisi otomatis tanpa dropdown manual serta proteksi anti-ban aktif.
- **Bukti Screenshot:** `e2e/screenshots/17_broadcast_divisi_badge_modal.png`

---

### TC-15: Dokumen IFA & Panduan Pengembang Website (Live Chat & Formulir)
- **Acceptance Criteria (AC-15):**
  - Pada halaman `/settings` kartu integrasi website menyediakan akses ke Dokumen IFA resmi.
  - Modal Dokumen IFA menyajikan 2 kategori utama:
    1. *1. Widget Live Chat (WebChat)* (Omnichannel CS)
    2. *2. Formulir Kontak Web (Lead Intake)* (Pre-Sales Deals)
  - Kategori Live Chat menampilkan:
    - Parameter koneksi dinamis: `API BASE URL` dan `WORKSPACE ID` tenant dengan tombol 1-Click Copy.
    - Tab bahasa: Komponen React/Next.js, script Vanilla JS / HTML Embed, dan Spesifikasi REST API (`POST .../inbox/webchat/send` & `GET .../inbox/webchat/messages`).
  - Kategori Formulir menyajikan panduan Elementor, JavaScript, PHP cURL, terminal cURL, dan kamus schema.
- **Langkah Pengujian:**
  1. Buka `/settings`.
  2. Klik tombol *Panduan Integrasi Live Chat*.
  3. Verifikasi modal IFA terbuka dengan tab *1. Widget Live Chat (WebChat)* aktif.
  4. Verifikasi kartu parameter API BASE URL dan WORKSPACE ID.
  5. Uji pergantian sub-tab *Vanilla JS / HTML Embed* dan *Spesifikasi REST API*.
  6. Uji pergantian kategori ke *2. Formulir Kontak Web (Lead Intake)* dan verifikasi panduan Elementor.
  7. Tutup modal panduan.
- **Hasil:** Dokumen IFA dan panduan pengembang interaktif terverifikasi lengkap dan mudah disalin oleh webmaster/tenant.
- **Bukti Screenshot:** `e2e/screenshots/18_ifa_livechat_developer_modal.png`

---

### TC-16: Integrasi End-to-End: WebChat Publik Sinkron ke Omnichannel Inbox
- **Acceptance Criteria (AC-16):**
  - Pengunjung website yang mengirim chat melalui endpoint publik `POST /workspaces/:id/inbox/webchat/send` secara instan membuat percakapan baru di Omnichannel Inbox CRM.
  - Endpoint polling `GET /workspaces/:id/inbox/webchat/messages?visitor_id=...` mengembalikan riwayat pesan pengunjung dan respons tim CS.
  - Percakapan webchat langsung dapat diklik dan dibalas oleh staf CS di antarmuka Room Chat CRM.
- **Langkah Pengujian:**
  1. Kirim chat baru via HTTP POST ke endpoint publik webchat dengan ID pengunjung unik.
  2. Polling riwayat pesan via HTTP GET dan verifikasi status 200 OK dengan isi pesan.
  3. Buka halaman `/inbox` di browser.
  4. Cari dan klik percakapan webchat baru tersebut.
  5. Verifikasi isi chat muncul di Room Chat CRM secara real-time.
- **Hasil:** Alur integrasi end-to-end dari pengunjung web ke Omnichannel Inbox CRM terverifikasi 100% sinkron.
- **Bukti Screenshot:** `e2e/screenshots/19_webchat_omnichannel_sync.png`

---

## 3. Cara Menjalankan Seluruh Suite Uji Otomatis

Jalankan perintah berikut di terminal:

```bash
# Menjalankan Backend Acceptance Criteria Tests (23 Unit / Integration Tests)
python3 e2e/api_runner.py

# Menjalankan Playwright Visual End-to-End Suite (16 Kasus Uji Lengkap)
python3 e2e/playwright_runner.py

# Menjalankan Seluruh Suite Secara Sekaligus
python3 e2e/run_all_tests.py
```
