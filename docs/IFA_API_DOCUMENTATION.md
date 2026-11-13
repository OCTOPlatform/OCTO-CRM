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
