# Dokumen IFA (Interface Agreement): Spesifikasi REST API Lengkap OCTO-CRM

> **Versi Dokumen:** 2.0  
> **Penulis:** Paige (Technical Writer - BMAD Team)  
> **Base URL Default:** `http://localhost:8080/api/v1` (Lokal) / `https://api-crm.octocrm.id/api/v1` (Production/Staging)

---

## 1. Konvensi Umum & Header API

### Standar Header Permintaan (Request Headers):
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <JWT_TOKEN>
```

### Standar Format Respon (Standard Envelope):
```json
// Respon Sukses (200 OK / 201 Created)
{
  "success": true,
  "message": "Operasi berhasil",
  "data": { ... }
}

// Respon Error (400 Bad Request / 401 Unauthorized / 403 Forbidden / 500 Server Error)
{
  "success": false,
  "error": "Pesan deskripsi kesalahan"
}
```

---

## 2. Modul Autentikasi (`/auth`)

### 2.1 Login Pengguna
- **Metode:** `POST /api/v1/auth/login`
- **Autentikasi:** Publik (No Token)
- **Request Body:**
  ```json
  {
    "email": "budi@octocrm.id",
    "password": "password123"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1Ni...",
      "user": {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "budi@octocrm.id",
        "full_name": "Budi Santoso",
        "is_superadmin": false
      },
      "workspaces": [
        {
          "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          "name": "PT Maju Bersama Solusindo",
          "role": "owner"
        }
      ]
    }
  }
  ```

### 2.2 Pendaftaran Pengguna Baru
- **Metode:** `POST /api/v1/auth/register`
- **Request Body:**
  ```json
  {
    "email": "sales@perusahaan.com",
    "password": "securepassword",
    "full_name": "Ahmad Sales",
    "workspace_name": "PT Usaha Baru"
  }
  ```

---

## 3. Modul Prospek Masuk & Integrasi Formulir (`/integrations`)

### 3.1 Inbound Lead Intake (Public Webhook / Form Website / Hermes AI)
- **Metode:** `POST /api/v1/workspaces/:workspace_id/integrations/lead-intake`
- **Autentikasi:** Publik / Workspace Token
- **Request Body:**
  ```json
  {
    "full_name": "Bambang Sudirman",
    "phone": "+6281234567890",
    "email": "bambang@sudirman.com",
    "company_name": "PT Sudirman Perkasa",
    "product_interest": "Paket Enterprise CRM",
    "estimated_value": 75000000,
    "message": "Tertarik implementasi untuk 20 staf penjualan",
    "form_type": "Hermes AI Agent",
    "consent_given": true
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Lead successfully ingested into CRM",
    "data": {
      "contact_id": "42e2ab59-29e5-4b36-8c3d-9e062eac259b",
      "company_id": "002c60fa-723c-45cf-b6ba-93aeda73bed3",
      "deal_id": "a7682678-868c-45ed-b329-2d461b1d5729",
      "task_id": "db199de4-af1b-4cff-b357-13fab680a919"
    }
  }
  ```

### 3.2 Webhook Meta Ads (Facebook & Instagram Lead Generation Forms)
- **Verifikasi Handshake (Challenge):**
  - **Metode:** `GET /api/v1/workspaces/:workspace_id/integrations/meta/webhook` atau `GET /api/v1/webhooks/meta-leads`
  - **Query Params:** `hub.mode=subscribe&hub.challenge=CHALLENGE_CODE&hub.verify_token=octo_meta_token`
  - **Response `200 OK`:** Plaintext `CHALLENGE_CODE`
- **Penerima Leads Masuk (Real-time Event):**
  - **Metode:** `POST /api/v1/workspaces/:workspace_id/integrations/meta/webhook` atau `POST /api/v1/webhooks/meta-leads`
  - **Request Body (Direct Bridge atau Standard Meta Graph Webhook):**
    ```json
    {
      "full_name": "Clarissa Aurelia",
      "phone": "081299887766",
      "email": "clarissa@aurorabeauty.id",
      "company_name": "Aurora Beauty Cosmetics",
      "platform": "instagram",
      "campaign_name": "IG-Reels-Promo-Q2"
    }
    ```
  - **Response `200 OK`:**
    ```json
    {
      "success": true,
      "message": "Meta Ads Lead successfully processed",
      "data": {
        "contact_id": "847d3b21-c1f9-4e74-b8ca-47748b353b16",
        "company_id": "da1d519f-a6f3-4184-bb59-c1d3a7a4a854",
        "deal_id": "c86ec187-0220-4ab7-b958-958a08cd1ed3",
        "tags": ["Lead Intake", "Meta Ads (Instagram)", "Campaign:IG-Reels-Promo-Q2"]
      }
    }
    ```

### 3.3 Webhook TikTok Ads (Lead Generation)
- **Verifikasi Handshake:** `GET /api/v1/workspaces/:workspace_id/integrations/tiktok/webhook?challenge=CHALLENGE`
- **Penerima Leads:** `POST /api/v1/workspaces/:workspace_id/integrations/tiktok/webhook`
- **Response `200 OK`:** Menghasilkan kontak dan deal teratribusi `TikTok Ads`.

---

## 4. Modul Pipeline & Peluang Penjualan (`/deals`)

### 4.1 Menampilkan Seluruh Peluang (Deals)
- **Metode:** `GET /api/v1/workspaces/:workspace_id/deals`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "ffffffff-ffff-ffff-ffff-ffffffffff01",
        "title": "Implementasi POS & CRM Multi-Store",
        "value": 85000000,
        "currency": "IDR",
        "stage_name": "Proposal",
        "stage_probability": 60,
        "company_name": "PT Digital Niaga Indonesia",
        "contact_name": "Andi Wijaya",
        "priority": 2,
        "status": "open"
      }
    ]
  }
  ```

---

### 4.2 Membuat Peluang Baru
- **Metode:** `POST /api/v1/workspaces/:workspace_id/deals`
- **Request Body:**
  ```json
  {
    "title": "Pengadaan Sistem CRM Cabang Surabaya",
    "value": 50000000,
    "currency": "IDR",
    "stage_id": "dddddddd-dddd-dddd-dddd-dddddddddd01",
    "contact_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01",
    "company_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01",
    "priority": 3,
    "notes": "Prioritas tinggi, target closing bulan ini"
  }
  ```

### 4.3 Memindahkan Stage Deal (Drag & Drop Kanban)
- **Metode:** `PATCH /api/v1/workspaces/:workspace_id/deals/:deal_id/stage`
- **Request Body:**
  ```json
  {
    "stage_id": "dddddddd-dddd-dddd-dddd-dddddddddd04",
    "lost_reason": ""
  }
  ```

---

## 5. Modul Kontak & Perusahaan (`/contacts`, `/companies`)

### 5.1 Menampilkan Kontak dengan Pencarian
- **Metode:** `GET /api/v1/workspaces/:workspace_id/contacts?search=Andi`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01",
        "first_name": "Andi",
        "last_name": "Wijaya",
        "email": "andi.wijaya@digitalniaga.co.id",
        "phone": "081234567890",
        "company_name": "PT Digital Niaga Indonesia",
        "job_title": "Direktur Operasional",
        "tags": ["VIP", "B2B", "Retail"]
      }
    ]
  }
  ```

---

---

## 6. Modul Tugas & Tindak Lanjut (`/tasks`)

### 6.1 Menampilkan Tugas
- **Metode:** `GET /api/v1/workspaces/:workspace_id/tasks`
- **Filter Query:** `?status=pending&due_date=today`

### 6.2 Membuat Tugas Baru (Follow-up Reminder)
- **Metode:** `POST /api/v1/workspaces/:workspace_id/tasks`
- **Request Body:**
  ```json
  {
    "title": "Hubungi kembali untuk follow-up penawaran",
    "description": "Kirimkan revisi proposal diskon 5% via WhatsApp",
    "due_date": "2026-11-15",
    "priority": "high",
    "deal_id": "ffffffff-ffff-ffff-ffff-ffffffffff01"
  }
  ```

---

## 7. Modul Omnichannel Inbox & WhatsApp (`/inbox`, `/webhooks`)

### 7.1 Webhook Penerima Pesan WhatsApp (WAHA / Provider)
- **Metode:** `POST /api/v1/webhooks/whatsapp`
- **Headers:** `Content-Type: application/json`
- **Fungsi:** Menerima pesan masuk dari WAHA container, memicu auto-reply bot atau meneruskan pesan ke antrean Omnichannel Inbox.

### 7.2 Mengirim Pesan Balasan CS / Agen
- **Metode:** `POST /api/v1/workspaces/:workspace_id/inbox/conversations/:conversation_id/messages`
- **Request Body:**
  ```json
  {
    "content": "Halo Kak, penawaran harga sudah kami kirimkan ke email ya.",
    "message_type": "text"
  }
  ```

### 7.3 Public WebChat Send (Live Chat Widget)
- **Metode:** `POST /api/v1/workspaces/:workspace_id/inbox/webchat/send`
- **Autentikasi:** Publik
- **Request Body:**
  ```json
  {
    "visitor_id": "web-9a8b7c-171829000",
    "name": "Pengunjung Web",
    "phone": "+6281295099738",
    "email": "tamu@website.com",
    "message": "Halo, apakah ada promo paket akhir tahun?"
  }
  ```

---

## 8. Modul AI Copilot (`/ai`)

### 8.1 AI Summarize Chat (Ringkasan & Sentimen)
- **Metode:** `POST /api/v1/workspaces/:workspace_id/ai/summarize-chat`
- **Request Body:**
  ```json
  {
    "conversation_id": "99999999-9999-9999-9999-999999999999"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "summary": "Pelanggan menanyakan diskon untuk pengadaan 30 workstation...",
      "key_points": [
        "Kebutuhan 30 meja & kursi ergonomis",
        "Budget maksimal Rp 45.000.000",
        "Target pengiriman akhir bulan"
      ],
      "sentiment": "positive",
      "sentiment_score": 8.5,
      "next_action": "Kirimkan Quotation resmi sebelum hari Jumat"
    }
  }
  ```

### 8.2 AI Suggest Replies (Rekomendasi Balasan Cepat)
- **Metode:** `POST /api/v1/workspaces/:workspace_id/ai/suggest-replies`
- **Request Body:**
  ```json
  {
    "conversation_id": "99999999-9999-9999-9999-999999999999"
  }
  ```
- **Response `200 OK`:** Menghasilkan 3 alternatif draf balasan ramah, profesional, dan to-the-point.

---

## 9. Modul Laporan & Atribusi Marketing (`/reports`)

### 9.1 Laporan Evaluasi Sumber Prospek & ROI Saluran
- **Metode:** `GET /api/v1/workspaces/:workspace_id/reports/lead-sources`
- **Query Params:**
  - `period`: `7d` (Mingguan), `30d` (Bulanan, default), `custom`, `all`
  - `start_date`: `YYYY-MM-DD` (diisi jika `period=custom`)
  - `end_date`: `YYYY-MM-DD` (diisi jika `period=custom`)
  - `compare`: `true` (menghitung pertumbuhan dibanding periode sebelumnya MoM/WoW)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "lead_source": "Meta Ads (Instagram)",
        "count": 145,
        "total_deals": 42,
        "won_deals": 18,
        "total_value": 180000000.0,
        "conversion_rate": 42.9,
        "previous_count": 110,
        "growth_pct": 31.8
      },
      {
        "lead_source": "Google Ads",
        "count": 35,
        "total_deals": 12,
        "won_deals": 10,
        "total_value": 250000000.0,
        "conversion_rate": 83.3,
        "previous_count": 28,
        "growth_pct": 25.0
      }
    ]
  }
  ```

---

---

## 10. Modul Inventori & Produk (`/products`)

### 10.1 Menampilkan Katalog Produk
- **Metode:** `GET /api/v1/workspaces/:workspace_id/products`
- **Query Params:** `search`, `category`
- **Response `200 OK`:** Menghasilkan array produk lengkap dengan SKU, HPP, harga jual, stok fisik, dan batas minimum stok.

### 10.2 Penyesuaian Stok Barang (Stock Adjustment)
- **Metode:** `POST /api/v1/workspaces/:workspace_id/products/:id/adjust-stock`
- **Request Body:**
  ```json
  {
    "quantity": 10,
    "type": "in",
    "notes": "Penerimaan PO Supplier #1029"
  }
  ```
- **Response `200 OK`:** Menyesuaikan kuota stok dan mencatat mutasi ke `product_stock_movements`.

---

## 11. Modul Presensi & Absensi GPS (`/attendances`)

### 11.1 Check-In Presensi GPS
- **Metode:** `POST /api/v1/workspaces/:workspace_id/attendances/check-in`
- **Request Body:**
  ```json
  {
    "gps_lat": -6.2088,
    "gps_lng": 106.8456,
    "location_name": "Kantor Pusat / Kunjungan Klien",
    "notes": "Kunjungan meeting prospek B2B"
  }
  ```
- **Response `200 OK`:** Mencatat kehadiran, stempel waktu, dan status `present` atau `late`.

### 11.2 Check-Out Selesai Kerja
- **Metode:** `POST /api/v1/workspaces/:workspace_id/attendances/check-out`
- **Request Body:** `{ "notes": "Selesai jam kantor" }`
- **Response `200 OK`:** Menghitung jam lembur otomatis jika check-out di atas pukul 18:00.

---

## 12. Modul Penggajian & Formula Builder Dinamis (`/payroll`)

### 12.1 Simulasi Ekspresi Rumus Formula
- **Metode:** `POST /api/v1/workspaces/:workspace_id/payroll/simulate`
- **Request Body:**
  ```json
  {
    "formula_expression": "GAJI_POKOK + (HARI_HADIR * 35000) + (TOTAL_OMSET_WON * 0.03)",
    "sample_variables": {
      "GAJI_POKOK": 5000000,
      "HARI_HADIR": 22,
      "TOTAL_OMSET_WON": 50000000
    }
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "formula_expression": "GAJI_POKOK + (HARI_HADIR * 35000) + (TOTAL_OMSET_WON * 0.03)",
      "evaluated_result": 7270000,
      "variables_used": {
        "GAJI_POKOK": 5000000,
        "HARI_HADIR": 22,
        "TOTAL_OMSET_WON": 50000000
      }
    }
  }
  ```

### 12.2 Eksekusi Kalkulasi Payroll Bulanan
- **Metode:** `POST /api/v1/workspaces/:workspace_id/payroll/generate`
- **Request Body:** `{ "period_month": "2026-11" }`
- **Response `200 OK`:** Menghitung slip gaji seluruh anggota tim dengan menggabungkan data kehadiran dari Presensi dan komisi dari Deals Pipeline yang berstatus `Won`.

---

## 13. Modul Penawaran, Invoice & Payment Gateway (`/invoices`)

### 13.1 Daftar Invoice & Surat Penawaran
- **Metode:** `GET /api/v1/workspaces/:workspace_id/invoices`
- **Query Params:** `type` (`all`, `invoice`, `quotation`), `status` (`all`, `draft`, `sent`, `paid`)
- **Response `200 OK`:** Menghasilkan array dokumen lengkap dengan nomor invoice, relasi kontak/perusahaan, total nilai, status, dan rincian line items.

### 13.2 Pembuatan Invoice / Penawaran Baru
- **Metode:** `POST /api/v1/workspaces/:workspace_id/invoices`
- **Request Body:**
  ```json
  {
    "type": "invoice",
    "invoice_number": "INV-202611-0082",
    "contact_id": "a073aef7-3d86-4f15-9bec-019703d17dcd",
    "deal_id": "b182...-deal-id",
    "due_date": "2026-11-27",
    "payment_method": "qris",
    "tax_amount": 2750000,
    "discount_amount": 1000000,
    "items": [
      {
        "item_name": "OCTO CRM Enterprise License",
        "sku": "OCTO-CRM-LIC",
        "quantity": 1,
        "unit_price": 25000000,
        "discount": 1000000,
        "total_price": 24000000
      }
    ]
  }
  ```
- **Response `201 Created`:** Mengembalikan dokumen invoice terbit lengkap dengan ID dan subtotal terhitung.

### 13.3 Konfirmasi Pelunasan Pembayaran (QRIS / Virtual Account)
- **Metode:** `POST /api/v1/workspaces/:workspace_id/invoices/:id/pay`
- **Request Body:**
  ```json
  {
    "payment_method": "qris",
    "payment_reference": "QRIS-OCTO-LIVE-882",
    "auto_deduct_stock": true,
    "auto_close_deal": true
  }
  ```
- **Response `200 OK`:**
  - Status invoice diperbarui menjadi `paid`.
  - Mengurangi kuota stok produk terkait di modul Inventori secara otomatis (*Stock Out*).
  - Mengubah status Deal terkait di papan Kanban menjadi `won`.

---

## 14. Modul Otomasi Follow-Up & Drip WhatsApp (`/drip-automations`)

### 14.1 Daftar Alur Kerja Otomasi (Workflows)
- **Metode:** `GET /api/v1/workspaces/:workspace_id/drip-automations`
- **Response `200 OK`:** Menampilkan seluruh alur kerja follow-up, tipe pemicu (*trigger*), aksi otomatis (*action*), dan jumlah eksekusi.

### 14.2 Pembuatan Alur Kerja Otomasi Baru
- **Metode:** `POST /api/v1/workspaces/:workspace_id/drip-automations`
- **Request Body:**
  ```json
  {
    "name": "Auto Follow-up Prospek Dingin 24 Jam",
    "description": "Mengirim sapaan WhatsApp jika prospek tidak membalas dalam 24 jam",
    "trigger_type": "lead_inactive_24h",
    "trigger_config": { "inactive_hours": 24 },
    "action_type": "send_whatsapp",
    "action_config": {
      "template": "Halo {{name}}, apakah ada informasi paket yang bisa kami bantu jelaskan?"
    },
    "is_active": true
  }
  ```
- **Response `201 Created`:** Workflow aktif tersimpan.

### 14.3 Simulasi Eksekusi Alur Kerja (Test Run)
- **Metode:** `POST /api/v1/workspaces/:workspace_id/drip-automations/:id/trigger`
- **Request Body:**
  ```json
  {
    "target_type": "lead",
    "target_name": "Pak Surya (PT Mega Solusindo)",
    "target_id": "test-lead-01"
  }
  ```
- **Response `200 OK`:** Menjalankan aksi ke gateway WAHA dan mencatat riwayat ke log audit.

### 14.4 Riwayat Audit Eksekusi Otomasi (Logs)
- **Metode:** `GET /api/v1/workspaces/:workspace_id/drip-automations/logs?limit=50`
- **Response `200 OK`:** Menghasilkan rekap log eksekusi follow-up dan stempel waktu.

---

## 15. Modul Komisi Penjualan & Live Sales War-Room (`/commissions` & `/war-room`)

### 15.1 Daftar & Pembuatan Skema Komisi (Commission Plans)
- **Metode:** `GET /api/v1/workspaces/:workspace_id/commissions/plans`
- **Response `200 OK`:** Menampilkan seluruh skema aturan komisi aktif dan non-aktif.

- **Metode:** `POST /api/v1/workspaces/:workspace_id/commissions/plans`
- **Request Body:**
  ```json
  {
    "name": "Skema Insentif Juara 2026",
    "calculation_type": "tiered_threshold",
    "base_rate": 3.5,
    "threshold_amount": 50000000,
    "bonus_rate": 6.0,
    "is_active": true
  }
  ```
- **Response `201 Created`:** Mengembalikan objek skema komisi baru.

### 15.2 Daftar Transaksi Komisi & Approval
- **Metode:** `GET /api/v1/workspaces/:workspace_id/commissions`
- **Query Params:** `period` (e.g. `2026-11`), `status` (`pending`, `approved`, `paid_in_payroll`, `rejected`), `user_id`
- **Response `200 OK`:** Mengembalikan array transaksi komisi lengkap dengan relasi nama sales rep, email, deal closing, nilai deal, persentase rate, dan komisi diterima.

- **Metode:** `PUT /api/v1/workspaces/:workspace_id/commissions/:id/status`
- **Request Body:**
  ```json
  {
    "status": "approved",
    "notes": "Disetujui oleh Sales Director"
  }
  ```
- **Response `200 OK`:** Memperbarui status komisi dan mencatat siapa approver-nya.

### 15.3 Ringkasan Komisi Finansial
- **Metode:** `GET /api/v1/workspaces/:workspace_id/commissions/summary?period=2026-11`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "total_accrued": 25000000,
      "total_pending": 5000000,
      "total_approved": 20000000,
      "total_paid_in_payroll": 0,
      "top_earner_name": "Budi Santoso",
      "top_earner_amount": 12500000
    }
  }
  ```

### 15.4 Statistik & Klasemen Siar War-Room TV
- **Metode:** `GET /api/v1/workspaces/:workspace_id/war-room/stats?period=2026-11`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "period": "2026-11",
      "team_target": 250000000,
      "total_revenue_won": 210000000,
      "total_deals_won": 8,
      "total_commission_accrued": 10500000,
      "achievement_percentage": 84.0,
      "leaderboard": [
        {
          "rank": 1,
          "user_id": "user-uuid-1",
          "full_name": "Budi Santoso",
          "deals_won": 5,
          "total_revenue": 140000000,
          "total_commission": 7000000,
          "achievement_percentage": 112.0
        }
      ],
      "recent_celebrations": [
        {
          "deal_id": "deal-uuid-1",
          "deal_title": "Implementasi Enterprise OCTO",
          "amount": 25000000,
          "rep_name": "Budi Santoso",
          "commission_amount": 750000,
          "closed_at": "2026-11-19T10:30:00Z"
        }
      ]
    }
  }
  ```

### 15.5 Pengaturan Target Omset Tim
- **Metode:** `POST /api/v1/workspaces/:workspace_id/war-room/target`
- **Request Body:**
  ```json
  {
    "period": "2026-11",
    "target_amount": 250000000
  }
  ```
- **Response `200 OK`:** Target omset tim tersimpan dan langsung tercermin di visual gauge War-Room.

---

## 16. Endpoint Rekening Bank Perusahaan & QRIS Standar Nasional

Kanal terpusat untuk membaca dan mengonfigurasi nomor rekening perbankan resmi perusahaan dan barcode QRIS Standar Nasional (ASPI / Bank Indonesia) yang otomatis diintegrasikan ke modul penagihan faktur (invoices).

### 16.1 Mendapatkan Pengaturan Rekening & QRIS Perusahaan
- **Metode:** `GET /api/v1/workspaces/:workspace_id/payment-settings`
- **Header:** `Authorization: Bearer <jwt_token>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "77f72236-ecbf-41a3-b452-f4ee0b3b4291",
      "workspace_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "bank_name": "BCA",
      "bank_account_number": "880129994012",
      "bank_account_holder": "PT Maju Bersama Solusindo",
      "qris_image_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021126600016ID.CO.QRIS.WWW...",
      "qris_payload": "00020101021126600016ID.CO.QRIS.WWW01189360052300000123455204599953033605802ID5924PT MAJU BERSAMA SOLUSIN6007JAKARTA61051011062070703A0163045E1A",
      "payment_gateway_provider": "manual",
      "payment_gateway_client_key": "",
      "payment_gateway_server_key": "",
      "payment_gateway_is_production": false,
      "created_at": "2026-11-19T10:00:00Z",
      "updated_at": "2026-11-19T10:00:00Z"
    }
  }
  ```

### 16.2 Menyimpan / Memperbarui Rekening Bank & QRIS
- **Metode:** `PUT /api/v1/workspaces/:workspace_id/payment-settings`
- **Header:** `Authorization: Bearer <jwt_token>`, `Content-Type: application/json`
- **Akses:** Khusus role `owner`, `admin`, `supervisor`, atau `is_superadmin`.
- **Request Body:**
  ```json
  {
    "bank_name": "BCA",
    "bank_account_number": "880129994012",
    "bank_account_holder": "PT Maju Bersama Solusindo Tbk",
    "qris_image_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021126600016ID.CO.QRIS.WWW...",
    "qris_payload": "00020101021126600016ID.CO.QRIS.WWW01189360052300000123455204599953033605802ID5924PT MAJU BERSAMA SOLUSIN6007JAKARTA61051011062070703A0163045E1A",
    "payment_gateway_provider": "manual",
    "payment_gateway_client_key": "",
    "payment_gateway_server_key": "",
    "payment_gateway_is_production": false
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Pengaturan rekening dan QRIS perusahaan berhasil disimpan",
    "data": {
      "id": "77f72236-ecbf-41a3-b452-f4ee0b3b4291",
      "workspace_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "bank_name": "BCA",
      "bank_account_number": "880129994012",
      "bank_account_holder": "PT Maju Bersama Solusindo Tbk",
      "qris_image_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...",
      "qris_payload": "...",
      "payment_gateway_provider": "manual",
      "updated_at": "2026-11-19T10:35:00Z"
    }
  }
  ```

---

## 17. Integrasi AutoGoPay (GoPay Merchant Dynamic QRIS)

### 17.1 Generate Dynamic QRIS Sesi AutoGoPay
- **Metode:** `POST /api/v1/workspaces/:workspace_id/invoices/:id/autogopay-qris`
- **Header:** `Authorization: Bearer <jwt_token>`
- **Deskripsi:** Menerbitkan sesi QRIS Dinamis unik dengan nominal terkunci presisi sesuai total tagihan invoice. Menerapkan anti-spam: menggunakan kembali sesi aktif yang masih berlaku (<15 menit) dan membatasi regenerasi maksimal 2 kali per invoice.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "cefa51b3-9a70-4170-b575-844a5e26647c",
      "workspace_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "invoice_id": "e7ba122f-73e7-4864-87ea-c06b5380f905",
      "provider": "autogopay",
      "transaction_id": "AGP-TRX-1729381",
      "order_id": "ORD-GP-1795102537-e7ba",
      "amount": 3607500,
      "qr_string": "00020101021226610014COM.GO-JEK.WWW011893600898000000000002150000000000000005204581253033605802ID5920GOPAY MERCHANT...",
      "qr_url": "https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=...",
      "checkout_url": "https://autogopay.site/pay/AGP-TRX-1729381",
      "status": "pending",
      "generate_count": 1,
      "transaction_time": "2026-11-19T22:35:37Z",
      "expiry_time": "2026-11-19T22:50:37Z",
      "paid_at": null,
      "created_at": "2026-11-19T22:35:37Z",
      "updated_at": "2026-11-19T22:35:37Z"
    }
  }
  ```

### 17.2 Polling Status Transaksi QRIS AutoGoPay
- **Metode:** `GET /api/v1/workspaces/:workspace_id/invoices/:id/autogopay-status`
- **Header:** `Authorization: Bearer <jwt_token>`
- **Deskripsi:** Endpoint auto-poller yang dipanggil frontend setiap 3-4 detik. Mengembalikan status transaksi (`pending`, `settlement`, `expire`).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "transaction_id": "AGP-TRX-1729381",
      "order_id": "ORD-GP-1795102537-e7ba",
      "status": "settlement",
      "paid_at": "2026-11-19T22:37:00Z"
    }
  }
  ```

### 17.3 Webhook Callback Notifikasi AutoGoPay
- **Metode:** `POST /api/v1/workspaces/:workspace_id/integrations/autogopay/webhook`
- **Header:** 
  - `Content-Type: application/json`
  - `X-Signature: <hmac_sha256_hex_digest>` (Enkripsi HMAC-SHA256 dari payload JSON menggunakan AutoGoPay API Key sebagai secret)
- **Deskripsi:** Dipanggil secara real-time oleh server gateway AutoGoPay saat pembayaran dari aplikasi perbankan atau e-wallet diterima. Sistem memvalidasi `X-Signature`, menandai invoice menjadi `PAID`, memotong stok inventori secara otomatis, dan memperbarui peluang Deal menjadi `WON`.
- **Request Body:**
  ```json
  {
    "event": "PAYMENT_RECEIVED",
    "transaction": {
      "order_id": "ORD-GP-1795102537-e7ba",
      "transaction_id": "TX-GP-1729381",
      "gross_amount": 3607500,
      "status": "settlement",
      "payment_type": "qris",
      "transaction_time": "2026-11-19 22:37:00"
    }
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "AutoGoPay webhook processed successfully"
  }
  ```

---

## 18. Endpoint Publik Portal Pembayaran Klien (Zero-Auth External Client)

Untuk memungkinkan klien eksternal melihat tagihan, rincian item, dan melakukan pelunasan via QRIS / Bank Transfer tanpa memerlukan akun login CRM, backend menyediakan rute publik khusus. Seluruh rahasia API (*API Key*, *Server Key*) disanitasi secara otomatis.

### 18.1 Ambil Informasi Pembayaran Publik Invoice
- **Metode:** `GET /api/v1/public/invoices/:identifier`
- **Autentikasi:** Tidak Diperlukan (Rute Publik Bebas Akses)
- **Parameter URL:**
  - `identifier`: Nomor invoice (contoh: `INV-202611-0001`) atau UUID invoice (`a7da3917-bd33-4ecb-9a27-be29621c7f0c`).
- **Deskripsi:** Mengembalikan metadata faktur, daftar item rincian penagihan, nama resmi entitas perusahaan penerbit, instruksi rekening bank, dan barcode QRIS aktif (termasuk sesi QRIS dinamis AutoGoPay aktif jika terpasang).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "invoice": {
        "id": "a7da3917-bd33-4ecb-9a27-be29621c7f0c",
        "invoice_number": "INV-202611-0001",
        "issue_date": "2026-11-13",
        "due_date": "2026-11-27",
        "type": "invoice",
        "status": "draft",
        "subtotal": 25000000,
        "tax_amount": 2750000,
        "discount_amount": 1000000,
        "total_amount": 26750000,
        "notes": "Pengadaan Lisensi OCTO Cloud PBX Enterprise 25 Seats",
        "items": [
          {
            "id": "a7f07b07-4ac8-45d6-99e0-49e1ba68d882",
            "item_name": "OCTO CRM Enterprise License (Annual)",
            "sku": "OCTO-CRM-LIC",
            "quantity": 1,
            "unit_price": 20000000,
            "discount": 1000000,
            "total_price": 19000000
          }
        ]
      },
      "workspace_name": "PT OCTO Technologies Indonesia",
      "payment_settings": {
        "bank_name": "BCA",
        "bank_account_number": "8905575356",
        "bank_account_holder": "PT OCTO Technologies Indonesia",
        "qris_image_url": "https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=000201...",
        "qris_payload": "00020101021126590014ID.LINKAJA.WWW0118...",
        "payment_gateway_provider": "autogopay",
        "autogopay_merchant_name": "OCTO CRM INDONESIA (GOPAY)"
      },
      "qris_transaction": {
        "transaction_id": "AGP-TRX-1729381",
        "order_id": "ORD-GP-1795102537-e7ba",
        "amount": 26750000,
        "qr_string": "00020101021226610014COM.GO-JEK.WWW...",
        "qr_url": "https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=...",
        "checkout_url": "https://autogopay.site/pay/AGP-TRX-1729381",
        "status": "pending",
        "expiry_time": "2026-11-20T10:35:00Z"
      }
    }
  }
  ```

### 18.2 Pengecekan Status Real-Time Publik (Auto-Poller)
- **Metode:** `GET /api/v1/public/invoices/:identifier/status`
- **Autentikasi:** Tidak Diperlukan (Rute Publik Bebas Akses)
- **Deskripsi:** Endpoint poller ringan yang dipanggil frontend klien setiap 3-4 detik. Mengembalikan status tagihan (`draft`, `sent`, `paid`), referensi pembayaran, serta waktu pelunasan `paid_at`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "a7da3917-bd33-4ecb-9a27-be29621c7f0c",
      "invoice_number": "INV-202611-0001",
      "status": "paid",
      "total_amount": 26750000,
      "paid_at": "2026-11-20T10:11:42Z",
      "payment_method": "qris",
      "payment_reference": "TX-GP-1729381"
    }
  }
  ```

