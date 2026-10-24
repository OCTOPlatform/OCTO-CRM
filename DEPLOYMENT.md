# Panduan Lengkap Deployment OCTO CRM (Production & Staging)

Panduan ini menjelaskan langkah demi langkah cara men-deploy seluruh ekosistem **OCTO CRM**:
- **Frontend**: [Vercel](https://vercel.com) (Next.js 16)
- **Backend API**: [Railway](https://railway.app) (Golang + Docker)
- **Database**: [Railway PostgreSQL](https://railway.app) (Managed Database)
- **WhatsApp Gateway (WAHA)**: [Railway Docker](https://railway.app) (Engine WhatsApp 24/7)

---

## 🏛️ Arsitektur Sistem Produksi

```
[ Pengguna / Calon Pelanggan ]           [ Tim Sales / Admin CS ]
             │ (WhatsApp)                             │
             ▼                                        ▼
    [ Server WhatsApp ]                     [ Browser / HP ]
             │                                        │
             ▼                                        ▼
    [ WAHA Docker Service ]               [ Frontend CRM (Next.js) ]
       (Port 3000 Railway)                    (Vercel Hosting)
             │ Webhook POST                           │ HTTPS / SSE
             └───────────────► [ Backend Go API ] ◄───┘
                               (Railway Service)
                                      │
                                      ▼
                             [ PostgreSQL Database ]
                               (Railway Managed)
```

---

## 📋 Prasyarat (Akun yang Diperlukan)

1. Akun **[GitHub](https://github.com)** (repositori kode ini di-push ke GitHub).
2. Akun **[Railway](https://railway.app)** (untuk Backend, Database, dan WhatsApp Engine).
3. Akun **[Vercel](https://vercel.com)** (untuk Frontend CRM).

---

## Langkah 1: Setup Database PostgreSQL di Railway

1. Buka [Railway Dashboard](https://railway.app/dashboard) lalu klik **New Project**.
2. Pilih **Provision PostgreSQL**.
3. Tunggu 5-10 detik sampai database aktif.
4. Klik service **Postgres** tersebut > buka tab **Variables**.
5. Anda akan melihat variabel `DATABASE_URL` (format: `postgresql://postgres:password@host:port/railway`). Variabel ini akan otomatis dihubungkan ke Backend.

---

## Langkah 2: Setup WhatsApp Gateway (WAHA) di Railway

WAHA adalah engine open-source yang bertugas menghubungkan nomor WhatsApp CS ke CRM selama 24 jam penuh di cloud.

1. Di dalam project Railway yang sama, klik tombol **+ New** di pojok kanan atas.
2. Pilih **Docker Image**.
3. Masukkan nama image:
   ```text
   devlikeapro/waha:latest
   ```
   *(atau `devlikeapro/waha:noweb`)*
4. Klik **Add**.
5. **Konfigurasi Persistent Volume (Sangat Penting!)**:
   - Klik service WAHA yang baru dibuat > buka tab **Settings**.
   - Gulir ke bagian **Volumes** > klik **Add Volume**.
   - Atur **Mount Path** ke:
     ```text
     /app/.sessions
     ```
   - *Fungsi*: Menyimpan sesi login WhatsApp agar ketika service restart/update, akun WhatsApp CS **tidak ter-logout** dan tidak perlu scan QR ulang.
6. **Konfigurasi Environment Variables WAHA**:
   Buka tab **Variables** pada service WAHA, tambahkan:
   | Key | Value | Keterangan |
   | :--- | :--- | :--- |
   | `WHATSAPP_HOOK_URL` | `https://<DOMAIN-BACKEND-ANDA>/api/v1/webhooks/whatsapp` | URL webhook ke backend Anda (bisa diisi sementara dan diupdate setelah Langkah 3) |
   | `WHATSAPP_HOOK_EVENTS` | `message` | Hanya kirim event pesan masuk |
   | `WAHA_NO_API_KEY` | `True` | Mempermudah integrasi lokal/staging |
   | `WAHA_DASHBOARD_NO_PASSWORD` | `True` | Nonaktifkan password dashboard internal |
7. **Buat Public Domain untuk WAHA**:
   - Buka tab **Settings** > bagian **Networking** > klik **Generate Domain**.
   - Catat domain yang dihasilkan (misal: `https://waha-production-xxxx.up.railway.app`).

---

## Langkah 3: Deploy Backend Go API di Railway

Backend Go telah dilengkapi file `backend/Dockerfile` multi-stage berukuran sangat ringan (~37MB) yang **otomatis menjalankan migrasi database saat startup**.

1. Di project Railway yang sama, klik **+ New** > pilih **GitHub Repo**.
2. Pilih repositori OCTO CRM Anda.
3. Klik service tersebut > buka tab **Settings**:
   - **Root Directory**: Ubah menjadi `/backend`.
   - **Dockerfile Path**: Biarkan `Dockerfile` (otomatis mendeteksi `backend/Dockerfile`).
4. Buka tab **Variables** pada service backend, lalu tambahkan variabel berikut:

   | Key | Value | Catatan |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Klik tombol *Add Reference* lalu pilih database Postgres Railway |
   | `ENVIRONMENT` | `production` | Mode produksi |
   | `PORT` | `8080` | Port listen backend |
   | `JWT_SECRET` | `a8f9c2d1e0b34765918234abcdef0123456789abcdef0123456789abcdef0123` | Buat string acak minimal 32 karakter |
   | `CORS_ORIGIN` | `*` | Atau isi domain Vercel Anda |
   | `WHATSAPP_GATEWAY_URL` | `https://waha-production-xxxx.up.railway.app` | Domain publik WAHA dari Langkah 2 |
   | `WHATSAPP_BUSINESS_NUMBER` | `+6281295099738` | Nomor WhatsApp CS default |
   | `WHATSAPP_VERIFY_TOKEN` | `octo_crm_whatsapp_verify_token` | Token verifikasi webhook |

5. **Buat Public Domain Backend**:
   - Buka tab **Settings** > bagian **Networking** > klik **Generate Domain**.
   - Catat domain backend Anda (misal: `https://backend-production-xxxx.up.railway.app`).
6. **Update Webhook WAHA**:
   - Kembali ke service **WAHA** (Langkah 2) > tab **Variables**.
   - Pastikan nilai `WHATSAPP_HOOK_URL` sudah mengarah ke backend Anda:
     ```text
     https://backend-production-xxxx.up.railway.app/api/v1/webhooks/whatsapp
     ```

> **Catatan Migrasi Otomatis:**
> Saat container backend pertama kali berjalan, file `backend/Dockerfile` secara otomatis menjalankan:
> `./bin/migrate -cmd up -dir ./migrations && ./bin/api`
> Sehingga seluruh tabel PostgreSQL langsung siap pakai tanpa perlu menjalankan SQL manual.

---

## Langkah 4: Deploy Frontend Next.js di Vercel

1. Buka [Vercel Dashboard](https://vercel.com/new).
2. Pilih **Import** pada repositori GitHub OCTO CRM Anda.
3. Di halaman konfigurasi proyek:
   - **Framework Preset**: Pilih `Next.js`.
   - **Root Directory**: Klik **Edit** dan pilih folder **`frontend`**.
4. Buka bagian **Environment Variables** dan tambahkan:
   | Key | Value | Contoh |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_API_URL` | `https://<DOMAIN-BACKEND-RAILWAY>/api/v1` | `https://backend-production-xxxx.up.railway.app/api/v1` |
5. Klik tombol **Deploy**.
6. Tunggu ~1 menit hingga deployment selesai. Vercel akan memberikan domain publik (misal: `https://octo-crm.vercel.app`).

---

## Langkah 5: Verifikasi & Uji Coba

1. Buka URL Vercel Anda di browser (misal `https://octo-crm.vercel.app/login`).
2. Login menggunakan akun default:
   - **Email**: `budi@octocrm.id`
   - **Password**: `password123`
3. Masuk ke menu **Live Chat / Inbox** (`/inbox`).
4. Klik tombol status WhatsApp CS di pojok kiri atas.
5. Modal **Hubungkan WhatsApp CS** akan menampilkan QR Code secara langsung:
   - Buka WhatsApp di smartphone CS > **Perangkat Tertaut** > **Tautkan Perangkat** > Scan QR di layar.
   - Status akan otomatis berubah menjadi **Hijau (Online & Aktif)**.
6. Coba kirim chat dari nomor WhatsApp lain ke nomor CS tersebut.
   - Pesan akan langsung muncul di layar CRM secara *real-time* tanpa perlu me-refresh halaman!

---

## Langkah 6: Custom Domain & SSL (Opsional)

Jika ingin menggunakan domain perusahaan Anda sendiri (misal: `namaperusahaan.com`):

1. **Frontend (Vercel)**:
   - Buka project di Vercel > **Settings** > **Domains**.
   - Masukkan `app.namaperusahaan.com` atau `crm.namaperusahaan.com`.
   - Buat record **CNAME** di DNS provider Anda mengarah ke `cname.vercel-dns.com`.
2. **Backend API (Railway)**:
   - Buka service Backend di Railway > **Settings** > **Custom Domain**.
   - Masukkan `api.namaperusahaan.com`.
   - Buat record **CNAME** di DNS provider Anda sesuai instruksi Railway.
   - Update `NEXT_PUBLIC_API_URL` di Vercel menjadi: `https://api.namaperusahaan.com/api/v1`.

---

## 🛠️ Checklist & Troubleshooting

| Gejala | Penyebab Umum | Solusi |
| :--- | :--- | :--- |
| **CORS Error di Console Browser** | Backend menolak origin Vercel | Pastikan variabel `CORS_ORIGIN=*` di Railway Backend, atau isi domain spesifik Vercel Anda. |
| **Pesan WhatsApp Masuk Tidak Muncul** | URL Webhook di WAHA salah | Periksa variabel `WHATSAPP_HOOK_URL` di WAHA. Pastikan formatnya `https://<DOMAIN-BACKEND>/api/v1/webhooks/whatsapp`. |
| **Scan QR Muncul "Couldn't link device"** | Sesi Baileys timeout atau perangkat tertaut penuh | Klik tombol *Muat Ulang QR* di CRM, dan pastikan daftar perangkat tertaut di ponsel WhatsApp tidak melebihi batas 4 perangkat. |
| **Setelah Deploy Ulang WAHA, Akun WhatsApp Ter-logout** | Volume penyimpanan belum terpasang | Pastikan Anda sudah menambahkan Volume di Railway WAHA dengan mount path `/app/.sessions`. |
