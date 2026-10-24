# OCTO CRM

> **Know Your Customers. Grow Your Relationships.**  
> *ONE PLATFORM. MANY POSSIBILITIES.*

Platform Customer Relationship Management (CRM) berbasis SaaS yang dirancang untuk membantu bisnis dan UMKM mengelola prospek, database pelanggan, alur pipeline penjualan (Kanban), aktivitas tindak lanjut harian, riwayat interaksi tim, serta analitik konversi dalam satu workspace yang rapi dan terstruktur.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router, TypeScript, Tailwind CSS, Lucide Icons)
- **Backend**: Golang 1.22+ (Clean Architecture, Gin Web Framework, JWT Auth, Bcrypt, Sqlx)
- **Database**: PostgreSQL 14+ (Relational schema, UUID primary keys, JSONB custom fields, strict tenant isolation)
- **Migration Engine**: Native Go migration CLI runner (`backend/cmd/migrate`) dengan schema versioning & rollback (`schema_migrations`)
- **API Testing**: Postman Collection v2.1 & Environment variables dengan auto-token capture

---

## 📁 Struktur Direktori

```
OCTO-CRM/
├── PRD_OCTO_CRM.md                 # Product Requirements Document
├── Makefile                        # Perintah terpadu (make migrate-up, make backend, dll)
├── README.md
├── backend/
│   ├── cmd/
│   │   ├── api/main.go             # Server REST API entrypoint
│   │   └── migrate/main.go         # Migration CLI runner (up, down, status)
│   ├── internal/
│   │   ├── config/                 # Konfigurasi env & database
│   │   ├── domain/                 # Domain models, requests & response structs
│   │   ├── handler/                # REST HTTP handlers
│   │   ├── middleware/             # JWT Auth, Workspace tenant boundary, RBAC
│   │   ├── repository/             # Database access queries & transactions
│   │   ├── service/                # Business logic, dedupe, CSV parser, kanban moves
│   │   └── utils/                  # Password hashing & JWT helpers
│   ├── migrations/
│   │   ├── 000001_init_schema.up.sql
│   │   ├── 000001_init_schema.down.sql
│   │   ├── 000002_seed_data.up.sql
│   │   └── 000002_seed_data.down.sql
│   ├── go.mod
│   ├── go.sum
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/             # Login & Register pages (1-Klik demo login)
│   │   │   ├── (dashboard)/        # Main CRM views
│   │   │   │   ├── page.tsx        # Executive Dashboard
│   │   │   │   ├── today/          # Halaman Today / My Tasks (Overdue, Due Today)
│   │   │   │   ├── contacts/       # All Contacts, Dedupe banner, Merge & CSV modals
│   │   │   │   ├── contacts/[id]/  # Contact Detail, Timeline, Deals & Tasks
│   │   │   │   ├── companies/      # Company Directory & Modal
│   │   │   │   ├── pipeline/       # Interactive Kanban Board (Stages, Won/Lost)
│   │   │   │   ├── tasks/          # Complete Task Table & Filters
│   │   │   │   ├── reports/        # Sales Funnel, Lead Sources & Activity Stats
│   │   │   │   ├── settings/       # Workspace Settings, Team RBAC & Audit Logs
│   │   │   │   └── layout.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css         # Identitas visual OCTO CRM
│   │   ├── components/layout/      # Sidebar & Navbar
│   │   ├── lib/                    # API Client, Auth Context, Formatters
│   │   └── types/                  # TypeScript definitions
│   └── package.json
└── postman/
    ├── OCTO_CRM.postman_collection.json    # Koleksi API lengkap
    └── OCTO_CRM.postman_environment.json   # Environment variables
```

---

## 🚀 Panduan Menjalankan Sistem

### 1. Database PostgreSQL

Pastikan PostgreSQL sudah berjalan di komputer Anda, lalu buat database:
```bash
createdb octo_crm
# atau via psql:
# CREATE DATABASE octo_crm;
```

### 2. Konfigurasi Backend & Migrasi Database

Masuk ke folder `backend/`:
```bash
cd backend
cp .env.example .env
```

Sesuaikan isi `.env` jika diperlukan (default menggunakan `postgres://localhost:5432/octo_crm?sslmode=disable`).

Jalankan migrasi database dan data awal (seed):
```bash
# Periksa status migrasi
go run cmd/migrate/main.go -cmd status

# Jalankan semua migrasi pending (up)
go run cmd/migrate/main.go -cmd up

# (Opsional) Rollback migrasi terakhir (down)
# go run cmd/migrate/main.go -cmd down
```

Jalankan server backend Go:
```bash
go run cmd/api/main.go
```
*Server API akan aktif pada port `http://localhost:8080`*.

---

### 3. Menjalankan Frontend Next.js

Buka terminal baru, masuk ke folder `frontend/`:
```bash
cd frontend
npm install
npm run dev
```
*Aplikasi frontend akan aktif pada `http://localhost:3000`*.

---

## 🔑 Akun Demo (Sudah Ter-seed Otomatis)

Anda dapat langsung masuk dengan salah satu akun berikut (tersedia juga tombol **1-Klik Demo Login** di halaman login):

| Nama Pengguna | Email | Password | Role di Workspace |
| --- | --- | --- | --- |
| **Budi Santoso** | `budi@octocrm.id` | `password123` | **Owner** (Akses Penuh) |
| **Siti Rahmawati** | `siti@octocrm.id` | `password123` | **Admin** |
| **Reza Pratama** | `reza@octocrm.id` | `password123` | **Member** (Sales Executive) |

*Workspace Bawaan*: **PT Maju Bersama Solusindo** (`maju-bersama`)

---

## ✨ Fitur-Fitur Utama yang Telah Diimplementasikan

### 1. Multi-Tenant Workspace & RBAC
- Isolasi data setiap workspace secara mutlak via `workspace_id`.
- Dukungan Role-Based Access Control: `Owner`, `Admin`, `Member`, `Viewer`.
- Pengelolaan anggota tim: undang member baru via email, ubah role, dan audit event.

### 2. Manajemen Kontak & Deteksi Duplikasi Cerdas
- Pencatatan kontak lengkap: nama, email, telepon (dengan auto-normalisasi nomor Indonesia `081...` -> `6281...`), perusahaan, jabatan, lead source, tags, dan catatan.
- **Deteksi Kandidat Duplikat**: Otomatis mendeteksi pasangan kontak dengan nomor telepon atau email yang sama.
- **Fitur Merge Contacts**: Memindahkan deals, tasks, dan seluruh riwayat timeline aktivitas dari kontak sekunder ke kontak utama dalam transaksi database yang aman.
- **Ekspor CSV**: Mengunduh seluruh database kontak ke file `.csv` dengan sekali klik.
- **Impor CSV**: Alur 3 tahap (Unggah & Preview 5 baris pertama, Pemetaan kolom otomatis/manual, dan Komit Impor).

### 3. Sales Pipeline & Interactive Kanban Board
- Alur tahapan penjualan terkonfigurasi: `New Lead` -> `Contacted` -> `Qualified` -> `Proposal` -> `Negotiation` -> `Won` / `Lost`.
- Kolom Kanban menampilkan jumlah deal, total nilai peluang dalam Rupiah (Rp), dan persentase probabilitas closing.
- Pemindahan tahap langsung antar kolom.
- Modal pencatatan **Lost Reason** saat deal ditandai gagal untuk evaluasi penjualan.

### 4. Tindak Lanjut Harian (Today / My Tasks) & Reminder
- Deteksi otomatis tugas **Overdue** (terlambat) dengan banner peringatan warna merah.
- Filter berdasarkan `Hari Ini`, `Terlambat / Overdue`, `Mendatang`, dan `Selesai`.
- Centang 1-klik untuk menandai tugas selesai (otomatis mencatat ke riwayat kontak).

### 5. Unified Activity Timeline (Riwayat Interaksi Pelanggan)
- Profil kontak dilengkapi feed aktivitas kronologis: Telepon, Meeting, Chat WhatsApp, Perubahan Tahap Deal, dan Catatan.
- Formulir cepat di halaman detail kontak untuk mencatat hasil telepon atau meeting baru.

### 6. Dashboard Eksekutif & Laporan Analitik
- Metrik utama: **Open Pipeline Value**, **Won Deals Value**, **Database Kontak Aktif**, **Tugas Overdue**, dan **Win Conversion Rate (%)**.
- Visualisasi **Funnel Penjualan** (prospek per tahapan).
- Distribusi **Sumber Prospek (Lead Source)** untuk evaluasi efektivitas kanal pemasaran.
- Ringkasan aktivitas tim penjualan.

### 7. Audit Log Keamanan & Kepatuhan
- Mencatat setiap tindakan penting: pendaftaran user, pembuatan workspace, perubahan role, penggabungan (merge) kontak, ekspor CSV, dan perubahan tahap deal.

---

## 📬 Koleksi Postman (Postman Collection)

File Postman Collection dan Environment telah disertakan pada direktori `postman/`:

1. `postman/OCTO_CRM.postman_collection.json`
2. `postman/OCTO_CRM.postman_environment.json`

### Cara Penggunaan di Postman:
1. Buka aplikasi **Postman**.
2. Klik tombol **Import**, lalu pilih kedua file di folder `postman/`.
3. Pilih Environment **OCTO CRM - Local Dev** di pojok kanan atas Postman.
4. Jalankan request **01. Authentication > Login (Owner Budi)**.
   - *Script test akan secara otomatis menyimpan `token` dan `workspaceId` ke variabel Environment Postman.*
5. Anda dapat langsung menjalankan seluruh request lainnya tanpa perlu copy-paste token manual!

### Grup Endpoint pada Koleksi Postman:
- `01. Authentication`: Register, Login, Get Current User (`/auth/me`), Update Profile.
- `02. Workspaces`: List Workspaces, Create Workspace, Workspace Settings, Members, Invite.
- `03. Contacts & Duplicates`: List Contacts, Search & Filter, Detail, Create, Update, Delete, Detect Duplicates, Merge Contacts, Export CSV, Import CSV Preview & Commit.
- `04. Companies`: List, Create, Get Details, Update, Delete.
- `05. Sales Pipelines & Deals`: List Pipelines & Stages, List Deals, Create Deal, Move Stage (Kanban), Mark Won/Lost.
- `06. Tasks & Reminders`: List All, List Overdue, List Today, Create Task, Toggle Complete.
- `07. Activities & Timeline`: Recent Activity Stream, Contact Timeline, Log Call/Meeting/Note.
- `08. Dashboard & Reports`: Dashboard Summary, Pipeline Funnel, Lead Sources, Activities, Audit Logs.
