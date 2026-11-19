# Dokumentasi Teknis Sistem OCTO-CRM

> **Versi Dokumen:** 2.0  
> **Penulis:** Paige (Technical Writer - BMAD Team)  
> **Target Audiens:** Software Engineer, DevOps, System Architect, dan Tim Integrasi

---

## 1. Arsitektur Sistem Tingkat Tinggi (High-Level Architecture)

OCTO-CRM dirancang menggunakan pola **Clean Architecture** pada sisi backend dan **Server & Client Components Next.js 16** pada sisi frontend, memastikan pemisahan tanggung jawab (*separation of concerns*) yang ketat, isolasi multi-tenant yang aman, dan kemudahan skalabilitas.

```mermaid
graph TD
    Client["Browser / Client Apps\n(Next.js 16 Frontend :3000)"]
    WhatsApp["Pengguna WhatsApp\n(Via WAHA Docker :3005)"]
    WebChat["Widget Live Chat\n(Website Pengunjung)"]
    Hermes["Hermes AI Agent\n(Autonomous CLI & Skill)"]

    subgraph "OCTO-CRM Gateway & Backend (:8080)"
        Router["Gin Web Framework Router"]
        Middleware["JWT Auth & Tenant Isolation Middleware"]
        Handlers["HTTP REST Handlers"]
        Services["Business Logic Services\n(Deals, Inbox, Contacts, AI Copilot)"]
        Repos["Database Repositories\n(Sqlx + Raw Prepared Queries)"]
    end

    DB[("PostgreSQL 14+\n(Multi-Tenant Relational DB)")]

    Client --> Router
    WhatsApp -->|Webhook HTTP| Router
    WebChat -->|Public API| Router
    Hermes -->|REST API & Skill| Router

    Router --> Middleware
    Middleware --> Handlers
    Handlers --> Services
    Services --> Repos
    Repos --> DB
```

---

## 2. Rincian Tech Stack & Dependensi

| Layer | Komponen / Framework | Keterangan & Versi |
|---|---|---|
| **Frontend** | **Next.js 16** (App Router) | React 19, TypeScript 5, Tailwind CSS v4, Lucide Icons |
| **Backend** | **Golang 1.22+** | Gin Gonic v1.12, Sqlx v1.4, JWT v5, Bcrypt |
| **Database** | **PostgreSQL 14+** | Skema relasional, UUID v4 / v7, JSONB custom fields |
| **Messaging Gateway** | **WAHA (WhatsApp HTTP API)** | Dockerized headless WhatsApp Web engine (ARM/AMD64) |
| **AI Agent & Copilot** | **Hermes Agent (Nous Research)** | Autonomous tool-calling agent via REST API & local skills |
| **Email Transaksional**| **Brevo / SMTP Relay** | Port 587 / 2525 REST & SMTP delivery |

---

## 3. Skema Database & Relasi Entitas Utama (ERD)

```mermaid
erDiagram
    WORKSPACES ||--o{ USERS : "memiliki member via WORKSPACE_MEMBERS"
    WORKSPACES ||--o{ CONTACTS : "memiliki"
    WORKSPACES ||--o{ COMPANIES : "memiliki"
    WORKSPACES ||--o{ PIPELINES : "memiliki"
    WORKSPACES ||--o{ CONVERSATIONS : "memiliki"
    WORKSPACES ||--o{ TICKETS : "memiliki"

    COMPANIES ||--o{ CONTACTS : "menaungi"
    PIPELINES ||--o{ PIPELINE_STAGES : "memiliki tahapan"
    PIPELINE_STAGES ||--o{ DEALS : "berada pada stage"
    
    CONTACTS ||--o{ DEALS : "terkait prospek"
    CONTACTS ||--o{ TASKS : "terkait follow-up"
    CONTACTS ||--o{ CONVERSATIONS : "berkomunikasi"

    CONVERSATIONS ||--o{ MESSAGES : "berisi percakapan"
    CONVERSATIONS ||--o{ TICKETS : "dapat dieskalasikan menjadi"
    DEALS ||--o{ TASKS : "memiliki aktivitas"
```

### Konvensi Tabel:
- **Primary Key:** Selalu menggunakan tipe `UUID` untuk menghindari ID enumeration attack.
- **Tenant Boundary:** Setiap tabel inti memiliki kolom `workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE`.
- **Audit Trail:** Kolom `created_at` dan `updated_at` bertipe `TIMESTAMPTZ` secara seragam.

---

## 4. Keamanan & Boundary Otorisasi (Security & RBAC)

Sistem menerapkan model otorisasi berlapis:

1. **Authentication Layer (`middleware.AuthMiddleware`):**
   - Memvalidasi token JWT `Bearer <token>` pada setiap *header*.
   - Mengekstrak `user_id` dan memverifikasi masa berlaku (*expiration 168 jam*).
2. **Tenant Boundary (`middleware.WorkspaceMiddleware`):**
   - Memastikan bahwa pengguna yang terautentikasi benar-benar terdaftar sebagai anggota aktif di `workspace_id` yang tertera pada path URL.
   - Menghentikan akses lintas tenant (*Cross-Tenant Data Leakage*) dengan kode `403 Forbidden`.
3. **Role-Based Access Control (RBAC):**
   - `owner`: Kuasa penuh terhadap konfigurasi workspace, tagihan, dan anggota.
   - `admin`: Manajemen operasional, konfigurasi bot, import/export data.
   - `supervisor`: Pengawasan percakapan, takeover chat agen, pemantauan workload CS.
   - `sales` / `support`: Akses terfokus pada prospek (Pre-Sales) atau tiket bantuan (After-Sales).
   - `member`: Akses baca/tulis data dasar harian.

---

## 5. Alur Kerja Omnichannel & AI Copilot

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Pelanggan (WhatsApp)
    participant WAHA as WAHA Container (:3005)
    participant CRM as OCTO Backend (:8080)
    participant DB as PostgreSQL
    participant Hermes as Hermes AI Agent
    actor Agent as Agen CS Manusia (UI :3000)

    Customer->>WAHA: Kirim pesan WhatsApp
    WAHA->>CRM: POST /api/v1/webhooks/whatsapp
    CRM->>DB: Cek / Buat Kontak & Conversation
    alt Bot Aktif
        CRM->>Hermes: Evaluasi pesan & kualifikasi prospek
        Hermes-->>CRM: Respon cerdas + trigger Lead Intake (jika berminat)
        CRM->>WAHA: Kirim pesan balasan otomatis
        WAHA->>Customer: Pesan balasan diterima
    else Pelanggan Meminta CS Manusia (Handoff)
        CRM->>DB: Set BotActive = false, buat Tiket CS
        CRM->>Agent: Broadcast event SSE 'bot_handoff' ke browser
        Agent->>CRM: Agen membalas obrolan di Inbox UI
        CRM->>WAHA: Teruskan balasan agen ke WhatsApp
        WAHA->>Customer: Pesan balasan agen diterima
    end
```

### 5.2 Alur Arsitektur Multi-Channel Lead Ingestion & Attribution Engine

```mermaid
flowchart TD
    subgraph Sources["Saluran Pemasaran (Marketing Channels)"]
        M1["Meta Ads (Instagram Instant Form)"]
        M2["Meta Ads (Facebook Feed Form)"]
        G1["Google Ads (Search & PMax + UTM)"]
        T1["TikTok Ads (Lead Gen Form)"]
        W1["WhatsApp CTWA (Click-to-WhatsApp)"]
        WEB["Website Contact / WebChat"]
        NFC["OCTO Tap (NFC Networking)"]
    end

    subgraph Ingestion["Ingestion Gateway (Gin Engine)"]
        MWH["/integrations/meta/webhook"]
        TWH["/integrations/tiktok/webhook"]
        INT["/integrations/lead-intake"]
    end

    subgraph Service["Business Logic & Attribution Service"]
        NORM["Normalisasi Channel & UTM Extractor"]
        CONT["Upsert Kontak + Tags"]
        DEAL["Create Deal di Pipeline (Stage 1)"]
        TASK["Generate Follow-Up Task untuk Sales Rep"]
    end

    subgraph Analytics["Analytics Engine (/reports/lead-sources)"]
        SQL["SQL Aggregation (Volume, Win Rate %, Won Value IDR)"]
        UI["UI Matriks Atribusi (7 Hari, 30 Hari, Kustom & MoM/WoW)"]
    end

    M1 & M2 --> MWH
    T1 --> TWH
    G1 & W1 & WEB & NFC --> INT
    MWH & TWH & INT --> NORM
    NORM --> CONT & DEAL & TASK
    CONT & DEAL --> SQL
    SQL --> UI
```

### 5.3 Arsitektur Unified Business Operations (Inventori, Presensi GPS, & Dynamic Formula Engine)

```mermaid
flowchart TD
    subgraph OpsModules["Modul Operasional Terpadu"]
        INV["📦 Inventori & SKU: Stock Movements (In/Out/Adjust)"]
        ATT["⏱️ Presensi GPS: Geolocation, Status Hadir/Late/Overtime"]
        CRM["💼 CRM Deals: Won Deals & Total Omset Per Sales Rep"]
    end

    subgraph FormulaEngine["Dynamic Formula Engine (Safe Lexer & Parser)"]
        VARS["Variable Binder:\nGAJI_POKOK, HARI_HADIR, TOTAL_OMSET_WON,\nJUMLAH_TERLAMBAT, TOTAL_JAM_LEMBUR"]
        EXP["Expression Parser: AST Toks & Shunting-Yard\n(+, -, *, /, Parentheses, Conditional IF)"]
        RULES["payroll_components:\nAturan Rumus Dinamis yang Dikonfigurasi User"]
    end

    subgraph PayrollExecution["Pipeline Eksekusi Payroll Bulanan"]
        AGG["Aggregator Data Periode (User x Bulan)"]
        EVAL["Formula Evaluator Execution Sandbox"]
        SLIP["payroll_slips:\nItemized Breakdown JSON, Take-Home-Pay, Pajak, Komisi"]
    end

    INV -->|Ketersediaan Stok| CRM
    CRM & ATT --> AGG
    RULES & VARS --> EXP
    AGG & EXP --> EVAL
    EVAL --> SLIP
```

### 5.4 Arsitektur Penawaran, Invoice, QRIS Payment Gateway & Drip Marketing Automations

```mermaid
flowchart TD
    subgraph Commercial["Siklus Penjualan & Penagihan"]
        DEAL["💼 Deal di Pipeline (Negotiation/Proposal)"]
        QUO["📜 Surat Penawaran (Quotation SPH)"]
        INV["🧾 Invoice Resmi (Itemized + PPN 11%)"]
        PAY["💳 Gateway Pelunasan:\nQRIS Nasional, BCA VA, Mandiri VA"]
    end

    subgraph CrossTriggers["Orkestrasi Otomatis Pasca Bayar"]
        STK["📦 Mutasi Gudang: Stock Out Otomatis"]
        WON["🏆 Status Deal Bergeser ke 'WON'"]
        ACC["💰 Kas Masuk & Basis Komisi Payroll"]
    end

    subgraph DripEngine["WhatsApp Drip & Workflow Engine"]
        TRIG["Pemicu:\n- Lead Inactive 24h\n- Deal Won\n- Invoice Paid"]
        RULE["Automation Workflows Builder (Palet Variabel)"]
        WAHA["WAHA Gateway: Pesan WhatsApp Otomatis ke Klien"]
        LOGS["Audit Trail Log Eksekusi Realtime"]
    end

    DEAL -->|Tarik Produk Inventori| QUO
    QUO -->|Konversi ke Tagihan| INV
    INV -->|Generate Kode Pembayaran| PAY
    PAY -->|Konfirmasi Lunas| STK & WON & ACC
    PAY -->|Trigger: Invoice Paid| TRIG
    DEAL -->|Trigger: Inactive / Won| TRIG
    TRIG --> RULE
    RULE --> WAHA
    WAHA --> LOGS
```

### 5.5 Arsitektur Sales Commission Engine & Live Sales War-Room (Migration 000018)

Modul ini mengotomatiskan pemberian reward komisi kepada tenaga penjualan secara tertutup (*closed-loop*) dari deal closing, pembayaran invoice QRIS, integrasi langsung ke slip gaji bulanan, hingga visualisasi real-time pada TV siar kantor (*Sales War-Room*).

```mermaid
flowchart TD
    subgraph CRM_Sales["Peluang Penjualan (CRM Deals)"]
        DEAL["Deal Closing (WON)"]
    end

    subgraph Commercial["Invoicing & Pembayaran QRIS"]
        INV["Invoice Pelanggan"]
        QRIS["QRIS / Virtual Account (PAID)"]
    end

    subgraph Commission_Engine["Sales Commission Engine"]
        PLAN["Sales Commission Plan (Tiered / Flat)"]
        CALC["Auto-Calculate Commission"]
        COMM_DB[("Buku Besar Komisi: sales_commissions")]
        APP["Manajer Sales Approval"]
    end

    subgraph War_Room["Live Sales War-Room TV Mode"]
        TARGET["Target Omset Tim (sales_team_targets)"]
        GAUGE["Gauge Pencapaian Omset Tim"]
        PODIUM["Podium Top 3 Superstars (Gold/Silver/Bronze)"]
        LEADER["Leaderboard Klasemen Tim"]
        CELEB["Gong Closing / Real-Time Celebration Feed"]
    end

    subgraph HRIS_Payroll["HRIS & Payroll Formula Engine"]
        SLIP["Generate Monthly Payroll Slip"]
        AUTO_KOM["Komponen Gaji: KOMISI_SALES_AUTO"]
    end

    INV -->|Lunas| QRIS
    DEAL -->|Tautkan Tagihan| INV
    QRIS -->|Trigger Invoice Paid| CALC
    PLAN -->|Ambil Rumus & Threshold| CALC
    CALC --> COMM_DB
    COMM_DB --> APP
    APP -->|Status: Approved| AUTO_KOM
    AUTO_KOM --> SLIP
    COMM_DB --> GAUGE & PODIUM & LEADER & CELEB
    TARGET --> GAUGE
```

#### Struktur Data Skema Komisi & War-Room (Migration 000018):
* `sales_commission_plans`: Menyimpan aturan komisi per workspace (tipe: `tiered_threshold`, `percentage_deal`, `fixed_amount`, dengan `base_rate`, `threshold_amount`, dan `bonus_rate`).
* `sales_commissions`: Transaksi komisi individual tenaga penjual yang tertaut ke `deal_id`, `invoice_id`, dan `user_id`. Status: `pending`, `approved`, `paid_in_payroll`, `rejected`.
* `sales_team_targets`: Target omset tim bulanan per workspace (`period` e.g. `'2026-11'`) untuk perhitungan persentase pencapaian War-Room.

### 5.6 Arsitektur Rekening Bank Resmi Perusahaan & QRIS Standar Nasional (Migration 000019)

Fitur ini menyediakan konfigurasi terpusat (*single-source-of-truth*) untuk rekening bank resmi dan barcode QRIS Standar Nasional (ASPI / Bank Indonesia) per workspace. Ketika tim sales menerbitkan invoice atau pelanggan mengakses faktur tagihan, detail rekening dan barcode QRIS resmi langsung ditampilkan secara konsisten, scannable dari seluruh m-Banking dan e-Wallet, serta siap diintegrasikan dengan Payment Gateway otomatis.

```mermaid
flowchart LR
    ADMIN["Owner / Admin Perusahaan"] -->|Atur No Rek & Barcode QRIS| SETTINGS["Settings (/settings?tab=payment)"]
    SETTINGS -->|PUT /payment-settings| DB[("workspace_payment_settings")]
    DB -->|GET /payment-settings| INV_API["Commercial Ops Service"]
    INV_API --> INVOICE_MODAL["Invoice Payment Modal & PDF (/invoices)"]
    INVOICE_MODAL --> CLIENT_PAY["Klien Scan QRIS (BCA, Livin, GoPay) / Transfer Bank PT"]
    CLIENT_PAY -->|Konfirmasi Lunas| AUTO_ACTION["Otomasi: Status Won, Potong Stok Gudang & Hitung Komisi"]
```

#### Struktur Data Pengaturan Rekening & QRIS (Migration 000019):
* `workspace_payment_settings`:
  * `id`: UUID Primary Key.
  * `workspace_id`: Foreign Key ke `workspaces.id` (Unique constraint per workspace).
  * `bank_name`: Nama Bank resmi perusahaan (BCA, Bank Mandiri, BNI, BRI, BSI, CIMB Niaga, dll).
  * `bank_account_number`: Nomor rekening operasional PT untuk penampungan dana invoice.
  * `bank_account_holder`: Nama pemilik rekening resmi sesuai buku tabungan perbankan (PT / Badan Usaha).
  * `qris_image_url`: URL gambar barcode QRIS merchant resmi (ASPI / Bank Indonesia).
  * `qris_payload`: Payload string spesifikasi EMVCo / ASPI resmi.
  * `payment_gateway_provider`: Mode pembayaran (`'manual'`, `'autogopay'`, `'midtrans'`, `'xendit'`).
  * `payment_gateway_client_key`, `payment_gateway_server_key`: Kredensial API gateway (opsional).
  * `payment_gateway_is_production`: Boolean flag lingkungan (Sandbox vs Live Production).
  * `autogopay_api_key`: API Key AutoGoPay Gateway terenkripsi untuk integrasi GoPay Merchant.
  * `autogopay_merchant_name`: Nama merchant resmi GoPay yang dicantumkan pada QRIS.

#### Struktur Data Transaksi QRIS Dinamis (Migration 000020):
Tabel `invoice_qris_transactions` mencatat seluruh sesi pembuatan QRIS dinamis per-tagihan untuk mencegah spam dan menjamin aturan 1 transaksi = 1 QRIS:
* `id`: UUID Primary Key.
* `workspace_id`: Foreign Key ke `workspaces.id`.
* `invoice_id`: Foreign Key ke `invoices.id`.
* `provider`: Nama gateway (`'autogopay'`).
* `transaction_id`: ID unik transaksi dari gateway (misal: `AGP-TRX-1729381`).
* `order_id`: ID pesanan unik internal (misal: `ORD-GP-1795102662-e7ba`).
* `amount`: Nominal tagihan tepat presisi (terkunci otomatis).
* `qr_string`: String spesifikasi EMVCo QRIS dari GoPay Merchant.
* `qr_url`: URL file barcode QRIS dinamis.
* `checkout_url`: URL checkout halaman web GoPay (opsional).
* `status`: Status sesi (`'pending'`, `'settlement'`, `'expire'`, `'cancel'`).
* `generate_count`: Jumlah generasi sesi QRIS untuk invoice ini (maksimum 2x per invoice).
* `transaction_time`: Waktu penerbitan QRIS.
* `expiry_time`: Waktu kedaluwarsa sesi QRIS (15 menit sejak diterbitkan).
* `paid_at`: Stempel waktu penyelesaian transaksi saat webhook diterima.

```mermaid
sequenceDiagram
    autonumber
    actor Klien as Klien / Pembayar
    participant FE as Frontend OCTO (/invoices)
    participant BE as Backend OCTO (Go API)
    participant AGP as AutoGoPay Gateway
    participant GP as GoPay Merchant Network

    Klien->>FE: Buka modal "⚡ Bayar QRIS"
    FE->>BE: POST /invoices/:id/autogopay-qris
    BE->>AGP: POST /qris/generate {amount: TotalAmount}
    AGP-->>BE: 200 OK {order_id, qr_url, qr_string, expiry_time: +15m}
    BE->>FE: 200 OK {InvoiceQRISTransaction}
    FE-->>Klien: Tampilkan Dynamic QRIS & Countdown 15 Menit

    loop Polling Status Tiap 3-4 Detik
        FE->>BE: GET /invoices/:id/autogopay-status
        BE-->>FE: {status: "pending"}
    end

    Klien->>GP: Scan & Transfer via GoPay / BCA Mobile / Mandiri
    GP->>AGP: Transaksi Sukses Diterima
    AGP->>BE: POST /workspaces/:id/integrations/autogopay/webhook (Header X-Signature: HMAC-SHA256)
    Note over BE: Verifikasi Signature HMAC-SHA256 dengan AutoGopayAPIKey
    BE->>BE: Update Invoice Status ke 'paid' & Potong Stok Gudang & Won Deal
    BE-->>AGP: 200 OK {"success": true}

    FE->>BE: GET /invoices/:id/autogopay-status
    BE-->>FE: {status: "settlement"}
    FE-->>Klien: 🎉 Tampilkan "PEMBAYARAN LUNAS / SETTLEMENT" & Tutup Sesi
```

---

## 6. Prosedur Pemeliharaan & Runbook Operasional

### Menjalankan Backend:
```bash
cd backend
go run cmd/api/main.go
# Atau build binary mandiri:
go build -o bin/octo-backend cmd/api/main.go && ./bin/octo-backend
```

### Menjalankan Migrasi Database:
```bash
# Periksa status
go run backend/cmd/migrate/main.go -cmd status
# Jalankan migrasi baru
go run backend/cmd/migrate/main.go -cmd up
```

### Menjalankan Frontend:
```bash
cd frontend
npm run dev     # Mode development (:3000)
# Mode produksi:
npm run build && npm run start
```

### Menjalankan Gateway WhatsApp (WAHA):
```bash
docker compose -f docker-compose.waha.yml up -d
# Akses dashboard WAHA di: http://localhost:3005/dashboard
```
