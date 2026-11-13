# Panduan Pengguna OCTO-CRM (User Guide & Manual)

> **Versi Panduan:** 2.0  
> **Penulis:** Paige (Technical Writer - BMAD Team)  
> **Aplikasi:** OCTO-CRM Web Application

Selamat datang di **OCTO-CRM** — platform manajemen relasi pelanggan cerdas yang dirancang untuk mempercepat pertumbuhan penjualan, merapikan data prospek, dan menyatukan layanan pelanggan (*omnichannel*) dalam satu workspace terpadu.

---

## 📑 Daftar Isi
1. [Masuk ke Sistem & Navigasi Antarmuka](#1-masuk-ke-sistem--navigasi-antarmuka)
2. [Manajemen Kontak & Perusahaan](#2-manajemen-kontak--perusahaan)
3. [Mengelola Pipeline Penjualan (Papan Kanban)](#3-mengelola-pipeline-penjualan-papan-kanban)
4. [Tugas Tindak Lanjut & Halaman Today](#4-tugas-tindak-lanjut--halaman-today)
5. [Omnichannel Live Chat & WhatsApp Inbox](#5-omnichannel-live-chat--whatsapp-inbox)
6. [Bekerja dengan Asisten AI Hermes Agent](#6-bekerja-dengan-asisten-ai-hermes-agent)
7. [Pengaturan Workspace & Template Chatbot](#7-pengaturan-workspace--template-chatbot)
8. [Panduan Monitoring Atribusi Marketing & Integrasi Multi-Channel Leads](#8-panduan-monitoring-atribusi-marketing--integrasi-multi-channel-leads)
9. [Panduan Inventori, Presensi GPS & Formula Penggajian Dinamis](#9-panduan-inventori-presensi-gps--formula-penggajian-dinamis)
10. [Panduan Penawaran Harga (SPH), Invoice, Pembayaran QRIS/VA & Otomasi Drip WhatsApp](#10-panduan-penawaran-harga-sph-invoice-pembayaran-qrisva--otomasi-drip-whatsapp)

---

## 1. Masuk ke Sistem & Navigasi Antarmuka

### Cara Login (Multi-Tenant SaaS):
1. Buka peramban (*browser*) dan akses alamat URL CRM Anda (contoh lokal: `http://localhost:3000/login`).
2. Masukkan **Email Bisnis** terdaftar dan **Kata Sandi**.
3. **Fitur Antarmuka Login:**
   - 👁️ **Lihat Sandi:** Klik ikon mata pada kolom kata sandi untuk memeriksa ketepatan karakter yang diketik.
   - 🔒 **Ingat Saya:** Centang *Ingat email di perangkat ini* agar alamat email Anda tersimpan secara aman di peramban untuk kunjungan berikutnya.
4. Klik tombol **Masuk ke Workspace**.
5. Jika akun Anda terdaftar di lebih dari satu cabang atau perusahaan (multi-workspace), Anda dapat memilih dan berpindah workspace aktif melalui menu *dropdown* di bagian atas bilah sisi (*Sidebar*).

### Mengenal Struktur Menu:
* **Home:** Dashboard performa bisnis dan tugas kerja hari ini (*Today*).
* **Relationships:** Database Kontak individu dan Perusahaan B2B.
* **Omnichannel & Support:** Kotak masuk terpadu obrolan WhatsApp & WebChat, serta Tiket Bantuan CS.
* **Sales & Pipeline:** Papan visual Kanban transaksi penjualan (*Deals*).
* **Operations:** Seluruh daftar tugas tim (*Tasks*) dan Laporan Analitik (*Reports*).
* **Administration:** Konfigurasi anggota tim, hak akses, dan pengaturan Bot otomatis.

---

## 2. Manajemen Kontak & Perusahaan

### Menambah Kontak Baru:
1. Buka menu **Contacts** di sidebar.
2. Klik tombol **+ Tambah Kontak** di pojok kanan atas.
3. Masukkan informasi wajib: Nama Depan dan Nomor Telepon/WhatsApp. Anda juga dapat menghubungkan kontak ini ke Perusahaan yang sudah ada.
4. Klik **Simpan**.

### Fitur Direktori Kontak & Navigasi Cepat:
* **Avatar Inisial Bergradien:** Setiap nama kontak memiliki lingkaran inisial berwarna dinamis untuk mempermudah identifikasi profil secara visual.
* **⚡ 1-Klik Chat WhatsApp Langsung:** Di setiap baris tabel kontak pada kolom nomor telepon, terdapat tombol hijau `[WA]` yang langsung membuka WhatsApp Web/Desktop ke nomor pelanggan tanpa perlu menyimpan nomor terlebih dahulu.
* **Fitur Anti-Duplikasi (*Smart Deduplication*):**
  - Sistem secara otomatis mendeteksi jika ada nomor WhatsApp atau email yang sama telah terdaftar sebelumnya.
  - Jika duplikasi terdeteksi, banner peringatan warna kuning akan muncul.
  - Klik tombol **Bandingkan & Gabungkan (Merge)** untuk menyatukan riwayat dua kontak menjadi satu tanpa kehilangan riwayat transaksi.

### Import & Export CSV:
* Anda dapat mengekspor seluruh database pelanggan ke file Excel/CSV melalui tombol **Export CSV**.
* Untuk mengimpor ribuan kontak sekaligus, gunakan tombol **Import CSV** dan ikuti format template kolom yang disediakan.

---

## 3. Mengelola Pipeline Penjualan (Papan Kanban)

Halaman **Deals Pipeline** menyajikan tahapan penjualan dari awal prospek masuk hingga terjadi kesepakatan (*Closing Won*).

### Membaca Papan Kanban:
Papan dibagi menjadi beberapa tahapan logis:
1. **New Lead (10%):** Prospek baru masuk dari website, formulir, atau pesan WhatsApp.
2. **Contacted (20%):** Tim sales sudah berhasil menghubungi dan menjalin kontak awal.
3. **Qualified (40%):** Kebutuhan dan anggaran pembeli sudah terkonfirmasi.
4. **Proposal (60%):** Penawaran harga atau demo produk telah dikirimkan.
5. **Negotiation (80%):** Pembahasan kontrak final dan syarat pembayaran.
6. **Won (100%):** Transaksi berhasil disepakati dan pembayaran diterima.
7. **Lost (0%):** Prospek membatalkan atau memilih solusi lain (sertakan alasan *Lost Reason*).

### Navigasi & Filter Cepat:
* **Pencarian Cepat:** Ketik nama prospek, nomor telepon, atau nama perusahaan di kolom *Search*.
* **Filter Bar:**
  - `Semua`: Menampilkan seluruh peluang aktif.
  - `Prioritas Tinggi`: Menampilkan peluang berlabel bintang 2 atau 3.
  - `Overdue Tasks`: Peluang yang memiliki tugas tindak lanjut kedaluwarsa.
  - `Hari Ini`: Peluang yang harus ditindaklanjuti pada hari ini.
  - `Peluang Saya`: Peluang yang ditugaskan secara personal kepada Anda.
* **Nilai Terbuka & Estimasi Prorata:** Terpampang di bagian atas untuk memantau potensi omzet kas yang sedang berjalan.

### Memindahkan Status (*Drag & Drop*):
* Tarik kartu deal dan jatuhkan (*drag and drop*) ke kolom tahapan berikutnya seiring kemajuan negosiasi dengan pelanggan.

---

## 4. Tugas Tindak Lanjut & Halaman Today

Keberhasilan penjualan ditentukan oleh kedisiplinan *follow-up*.

1. Buka menu **Today / My Tasks**.
2. Anda akan melihat daftar tugas kerja terbagi menjadi:
   - **🔴 Terlambat (Overdue):** Tugas yang melewati batas waktu jatuh tempo dan harus diprioritaskan sekarang.
   - **🟡 Jatuh Tempo Hari Ini (Due Today):** Aktivitas yang wajib diselesaikan hari ini (telepon, kirim proposal, meeting).
   - **🟢 Mendatang (Upcoming):** Agenda kerja minggu ini.
3. Setelah menyelesaikan panggilan telepon atau chat dengan klien, klik tanda centang untuk menandai tugas telah selesai (*Complete*).

---

## 5. Omnichannel Live Chat & WhatsApp Inbox

Menu **Live Chat & Inbox** menyatukan seluruh percakapan pelanggan dari berbagai kanal ke dalam satu meja kerja terpadu.

### Alur Obrolan & Bantuan AI:
1. **Pesan Masuk:** Pesan dari WhatsApp atau widget chat website langsung berbunyi dan muncul di daftar antrean obrolan.
2. **Diferensiasi Visual Obrolan (Bubble Styling):**
   - ⚪ **Pesan Pelanggan:** Tampil di sisi kiri berlatar putih bersih dengan identitas kontak.
   - 🔵 **Balasan Agen CS Manusia:** Tampil di sisi kanan berlatar Navy `#142740` dengan nama agen pengirim dan centang ganda status pengiriman WhatsApp.
   - 🟣 **Balasan Bot AI (Hermes / Auto-reply):** Tampil di sisi kanan dengan badge khusus `🤖 Asisten Virtual AI` berlatar ungu-indigo cerah, sehingga tim CS dapat membedakan mana pesan yang diketik oleh manusia vs balasan otomatis mesin.
3. **Asisten AI 24/7:** Bot secara otomatis menyapa pelanggan dan menjawab FAQ seputar harga dan jam kerja.
4. **Alih Tugas ke Manusia (Human Handoff):** Jika pelanggan mengetik hal kompleks atau meminta berbicara dengan tim, sistem membunyikan lonceng notifikasi prioritas `bot_handoff` ke layar staf.
5. **AI Copilot (Ikon ✨ Sparkles):**
   - Klik **AI Summarize** untuk merangkum obrolan puluhan pesan menjadi 3 poin singkat.
   - Klik **Smart Reply** untuk mendapatkan saran balasan profesional yang siap Anda kirimkan hanya dengan satu klik.

---

## 6. Bekerja dengan Asisten AI Hermes Agent

Jika tim Anda mengaktifkan **Hermes Agent**, Anda dapat menginstruksikan AI melalui perintah percakapan langsung:

* **Mengecek Data:** *"Hermes, berapa total nilai peluang yang sedang ada di pipeline?"*
* **Mendaftarkan Prospek Baru:** *"Hermes, tolong catat lead baru: Pak Surya dari PT Mega Perkasa, nomor WA 0812999888, berminat paket interior 50 juta"*
  - Hermes akan otomatis membuat Kontak baru, membuat Deal di papan Kanban, dan menjadwalkan tugas *follow-up* tanpa Anda perlu membuka formulir manual.
* **Menjadwalkan Pengingat:** *"Hermes, buatkan task telepon Pak Budi besok jam 10 pagi"*

---

## 7. Pengaturan Workspace & Template Chatbot

Akses menu ini khusus bagi pengguna dengan peran **Admin** atau **Owner**:

1. Buka menu **Settings & Team** di sidebar.
2. **Tab Workspace:** Mengubah nama perusahaan, mata uang default (IDR/USD), dan zona waktu.
3. **Tab Anggota Tim (Team Members):** Mengundang anggota tim baru via email dan mengatur divisi (*Sales, Support, Admin*).
4. **Tab Template Chatbot WA:**
   - Menentukan nama bot sapaan (misal: *Asisten Virtual OCTO*).
   - Menyesuaikan kalimat sambutan saat pelanggan pertama kali mengirim chat WhatsApp.
   - Mengisi jawaban otomatis untuk menu informasi produk, paket harga, dan jam operasional.

---

## 8. Panduan Monitoring Atribusi Marketing & Integrasi Multi-Channel Leads

### 8.1 Menu Pengaturan Integrasi di OCTO-CRM
Buka menu **Settings & Team** di sidebar -> Klik tab **📢 Integrasi Iklan & Leads (Meta, Google, TikTok)** atau buka URL `/settings?tab=ads`. Di sini Anda dapat:
- Menyalin Webhook Callback URL khusus perusahaan Anda dengan 1 klik.
- Menguji pengiriman lead simulasi (*Kirim Uji Coba Lead Meta / TikTok*).
- Menggunakan generator tautan kampanye berpelacak (*UTM Link Builder*) untuk Google Ads.

### 8.2 Menghubungkan Meta Ads (Instagram & Facebook Lead Generation Forms)
1. Buka **Meta Business Suite** atau **Meta Ads Manager** -> Masuk ke pengaturan Instant Form (*Formulir Instan*).
2. Di bagian **Webhook Integration** (atau portal Meta for Developers), masukkan:
   - **Callback URL:** `https://<DOMAIN_CRM>/api/v1/workspaces/<WORKSPACE_ID>/integrations/meta/webhook`
   - **Verify Token:** `octo_meta_token`
3. Berikan izin langganan pada event `leadgen`.
4. Begitu calon pelanggan mengisi form di Instagram/Facebook, data langsung masuk ke OCTO-CRM dalam hitungan detik. Kontak dan Deal baru di pipeline otomatis berlabel `Meta Ads (Instagram)`.

### 8.3 Menghubungkan Google Ads (Search & Performance Max)
1. Buka tab **📢 Integrasi Iklan & Leads** di OCTO-CRM -> Masuk ke bagian **Google Ads**.
2. Masukkan URL landing page website Anda, nama kampanye, dan kata kunci target pada kotak **Generator Tautan Iklan Google Ads**.
3. Salin tautan ber-UTM yang dihasilkan, lalu tempelkan pada kolom **Final URL** di Google Ads Campaign Manager.
4. Setiap prospek yang mengisi formulir di website Anda akan otomatis teratribusi sebagai `Google Ads` di laporan CRM.

### 8.4 Menghubungkan TikTok Ads (Instant Forms)
1. Buka **TikTok Ads Manager** -> Masuk ke menu **Assets** -> **Instant Form**.
2. Pilih **Connect CRM / Third-Party Webhook**.
3. Tempelkan Webhook Callback URL dari menu Settings OCTO-CRM dan simpan.

### 8.5 Membaca Laporan Evaluasi Mingguan & Bulanan di `/reports`
1. Buka menu **Reports & Analytics** di sidebar.
2. Di bagian atas layar, tentukan **Periode Evaluasi**:
   - `[ 7 Hari (Mingguan) ]`: Untuk evaluasi sprint mingguan tim marketing.
   - `[ 30 Hari (Bulanan) ]` *(Default)*: Untuk evaluasi rapat bulanan dan perencanaan alokasi anggaran iklan.
   - `[ Kustom Tanggal ]`: Untuk membandingkan periode kustom (misal bulan ini vs bulan lalu).
3. Centang opsi `[✓] Bandingkan dengan Periode Sebelumnya (MoM / WoW)` untuk melihat pertumbuhan volume leads (% Growth).
4. Perhatikan kolom **Rekomendasi Evaluasi Marketing**:
   - 🚀 **Kencangkan Budget!:** Muncul saat saluran memiliki Win Rate tinggi (≥ 20%) atau total nilai omset won ≥ Rp 25.000.000. Tingkatkan anggaran iklan pada saluran ini!
   - ⚡ **Pertahankan & Optimasi:** Saluran menghasilkan konversi stabil, lanjutkan kampanye dan optimasi script follow-up.
   - ⚠️ **Evaluasi Audiens / Iklan:** Banyak leads masuk tetapi belum ada yang berhasil closing/won. Evaluasi materi kreatif iklan dan penargetan audiens agar leads lebih berkualitas.

---

## 9. Panduan Inventori, Presensi GPS & Formula Penggajian Dinamis

OCTO-CRM kini berevolusi dari sekadar CRM penjualan menjadi sistem operasi bisnis terpadu (*Unified Business Operations*), menghubungkan stok produk, presensi lapangan tim sales, dan perhitungan komisi & gaji secara otomatis berbasis formula dinamis.

### 9.1 Modul Inventori & Produk (`/inventory`)
Menu ini digunakan untuk mengelola katalog produk/jasa yang dijual oleh tim sales:
1. **Navigasi:** Klik menu **Inventori & Produk** di sidebar atau akses URL `/inventory`.
2. **Tambah Produk Baru:** Klik tombol **"+ Tambah Produk"**, masukkan SKU (contoh: `OCTO-DEV-S1`), nama produk, kategori, Harga Pokok Penjualan (HPP / Cost), Harga Jual (Price), stok awal, dan batas minimum stok.
3. **Penyesuaian Stok (Stock In / Out):** Pada tabel produk, klik tombol **"Sesuaikan"** untuk menambah stok masuk (pembelian supplier) atau mencatat stok keluar (penjualan/kerusakan).
4. **Riwayat Mutasi:** Klik tab **"Riwayat Mutasi Stok"** untuk melihat audit log pergerakan stok lengkap dengan keterangan dan stempel waktu.
5. **Indikator Stok Kritis:** Produk dengan stok di bawah batas minimum akan otomatis ditandai badge merah **"Stok Kritis"** untuk mencegah kekurangan barang saat tim sales melakukan penawaran.

### 9.2 Modul Presensi & Kehadiran GPS (`/attendance`)
Menu ini memudahkan pencatatan kehadiran tim sales lapangan maupun kantor:
1. **Navigasi:** Klik menu **Presensi & Absensi** di sidebar atau akses URL `/attendance`.
2. **Jam Digital Real-Time & Deteksi Geolocation:** Sistem menampilkan jam digital real-time beserta titik koordinat GPS akurat Anda.
3. **1-Click Check-In:**
   - Masukkan catatan singkat (misal: *"Kunjungan Klien PT Maju"* atau *"Di Kantor Pusat"*).
   - Klik tombol **"🟢 Check-In Sekarang"**.
   - Sistem otomatis mencatat stempel waktu dan mendeteksi status: **Tepat Waktu** (sebelum pukul 09:00) atau **Terlambat** (di atas pukul 09:00).
4. **1-Click Check-Out & Kalkulasi Lembur:**
   - Setelah jam kerja selesai, klik tombol **"🔴 Check-Out Selesai Kerja"**.
   - Sistem secara otomatis menghitung jam lembur (*overtime hours*) jika Anda check-out di atas pukul 18:00.
5. **Ringkasan Bulanan:** Di bagian atas halaman tersedia kartu KPI ringkasan: Total Hadir, Menit Terlambat, Jam Lembur, dan Izin/Sakit.

### 9.3 Modul Penggajian & Dynamic Formula Builder Sandbox (`/payroll`)
Menu ini memberikan fleksibilitas penuh bagi pemilik bisnis untuk merumuskan perhitungan gaji, komisi penjualan, tunjangan, dan potongan pajak tanpa perlu hardcoding di sistem.

1. **Navigasi:** Klik menu **Penggajian & Komisi** di sidebar atau akses URL `/payroll`.
2. **Tab 1: Rekap Slip Gaji (Payroll Slips):**
   - Menampilkan daftar slip gaji seluruh karyawan untuk periode bulan aktif (contoh: `2026-11`).
   - Tombol **"⚡ Eksekusi Hitung Gaji Bulan Ini"**: Sekali klik, sistem akan mengagregasi data absensi (hari hadir, keterlambatan, lembur) dan omset penjualan CRM (deals `Won`) setiap karyawan, lalu mengevaluasi setiap komponen rumus secara otomatis.
   - Klik **"Lihat Rincian"** pada salah satu karyawan untuk melihat slip gaji resmi, rincian komponen tunjangan, komisi omset, potongan pajak PPh21, dan total *Take Home Pay*.
3. **Tab 2: Formula Builder & Sandbox:**
   - **Clickable Variable Chips:** Anda dapat merancang rumus dengan mengklik chip variabel yang tersedia:
     - `GAJI_POKOK`: Gaji dasar bulanan karyawan.
     - `HARI_HADIR`: Total hari masuk kerja dari modul presensi.
     - `TOTAL_OMSET_WON`: Total nilai penjualan deals yang berhasil ditutup (`Won`) oleh karyawan tersebut di CRM pada bulan berjalan.
     - `JUMLAH_DEAL_WON`: Jumlah transaksi penjualan yang berhasil closing.
     - `JUMLAH_TERLAMBAT`: Frekuensi keterlambatan kehadiran.
     - `TOTAL_JAM_LEMBUR`: Total jam kerja lembur.
   - **Operator Bar:** Tombol operator matematika `+`, `-`, `*`, `/`, `(`, `)`, `,` untuk menyusun ekspresi aritmatika dengan mudah.
   - **Live Formula Simulator Sandbox:**
     - Terdapat kotak simulasi langsung untuk menguji validitas ekspresi rumus sebelum disimpan.
     - Masukkan ekspresi rumus (contoh: `GAJI_POKOK + (HARI_HADIR * 35000) + (TOTAL_OMSET_WON * 0.03) - (JUMLAH_TERLAMBAT * 25000)`).
     - Atur nilai simulasi variabel contoh, lalu klik **"▶️ Jalankan Simulasi Rumus"**.
     - Sistem langsung menampilkan kalkulasi numerik real-time yang aman (*safe AST evaluator*).
   - **Daftar Aturan Rumus Aktif:** Anda dapat mengaktifkan/menonaktifkan rumus tunjangan makan, komisi sales, bonus target, potongan telat, atau pajak PPh21 sesuai kebijakan perusahaan.

---

## 10. Panduan Penawaran Harga (SPH), Invoice, Pembayaran QRIS/VA & Otomasi Drip WhatsApp

OCTO-CRM kini dilengkapi instrumen komersial lengkap untuk mempercepat siklus penutupan penjualan (*sales closing*) dan pengumpulan kas secara instan.

### 10.1 Modul Penawaran & Invoice Tagihan (`/invoices`)
1. **Navigasi:** Klik menu **Penawaran & Invoice** di sidebar atau akses URL `/invoices`.
2. **Penerbitan Surat Penawaran Harga (SPH):**
   - Klik tombol **"+ Buat Penawaran"**.
   - Nomor dokumen otomatis diawali prefix `QUO-YYYYMM-XXXX`.
   - Pilih nama kontak pelanggan dan tautkan ke peluang penjualan (*Deal Kanban*) yang sedang berjalan.
   - Pada bagian **Rincian Barang / Jasa**, Anda dapat memilih produk dari katalog **Inventori** (harga satuan dan SKU otomatis terisi) atau mengetik item kustom.
   - Masukkan diskon dan centang opsi **Terapkan PPN 11%** jika berlaku.
   - Klik **"Terbitkan Dokumen"**.
3. **Penerbitan Invoice Tagihan Resmi:**
   - Klik tombol **"+ Buat Invoice Baru"** (nomor dokumen berawalan `INV-YYYYMM-XXXX`).
   - Tentukan tanggal jatuh tempo dan pilih rekomendasi kanal pembayaran (QRIS / Virtual Account BCA / Mandiri).
4. **Pratinjau & Cetak PDF:**
   - Pada baris invoice, klik tombol **"Lihat / Cetak"** untuk membuka tampilan resmi berkop perusahaan, rincian produk, dan instruksi transfer.
   - Klik **"Cetak PDF"** untuk mengunduh dokumen penagihan.

### 10.2 Simulasi Pembayaran QRIS/VA & Otomasi Lintas-Modul
1. Pada tabel tagihan yang berstatus belum lunas, klik tombol **"⚡ Bayar QRIS"**.
2. Sistem menampilkan kode QRIS Nasional beserta nomor Virtual Account tagihan secara dinamis.
3. Klik tombol **"✅ Konfirmasi Pembayaran Lunas"**:
   - Status invoice seketika berubah menjadi **PAID (Lunas)**.
   - **Otomasi Stok Gudang:** Sistem secara otomatis memotong stok produk yang ada di modul **Inventori** (*Stock Out*).
   - **Otomasi Deal Closing:** Peluang penjualan (*Deal*) yang tertaut di papan Kanban otomatis berpindah ke tahap **WON**.

### 10.3 Modul Otomasi Follow-Up & Drip WhatsApp (`/automations`)
Menu ini mengotomatiskan sapaan penawaran dan pengingat follow-up agar tidak ada prospek yang terabaikan.

1. **Navigasi:** Klik menu **Otomasi Follow-up WA** di sidebar atau akses URL `/automations`.
2. **Katalog Alur Kerja (Workflows):**
   - Menampilkan kartu-kartu aturan aktif:
     - ⏱️ *Auto Follow-up Prospek Dingin 24 Jam:* Menyapa otomatis prospek baru yang belum membalas chat.
     - 🎯 *Kirim Ucapan & Invoice saat Deal Won:* Mengirim ucapan terima kasih dan konfirmasi faktur resmi.
     - 🧾 *Auto Stock-Out saat Invoice Lunas:* Menjamin sinkronisasi stok dan status closing.
   - Tombol toggle **"Aktif / Mati"** untuk mengontrol eksekusi workflow secara langsung.
3. **Membuat Alur Kerja Kustom:**
   - Klik **"+ Buat Workflow Baru"**.
   - Tentukan pemicu (*Trigger*): Prospek tidak membalas, tahap deal bergeser, atau invoice lunas.
   - Tentukan aksi (*Action*): Kirim WhatsApp otomatis, ubah tahap deal, atau buat tugas sales rep.
   - Gunakan chip variabel dinamis (`{{name}}`, `{{phone}}`, `{{company}}`, `{{invoice_url}}`) untuk mempersonalisasi isi chat secara otomatis.
4. **Uji Coba Langsung (Test Run):**
   - Klik tombol **"▶️ Uji Coba"** pada salah satu workflow untuk mensimulasikan pengiriman pesan ke target prospek tertentu.
5. **Riwayat Audit Eksekusi (Audit Logs):**
   - Klik tab **"Riwayat Eksekusi (Audit Logs)"** untuk melihat transparansi waktu pengiriman, target prospek, rincian pesan WhatsApp, dan status keberhasilan pengiriman (*Success*).


