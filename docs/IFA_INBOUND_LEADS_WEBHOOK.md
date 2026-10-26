# Dokumen IFA (Interface Agreement): Inbound Leads Webhook (Formulir Website) ke OCTO-CRM

Dokumen ini mendefinisikan spesifikasi antarmuka teknis (IFA) untuk mengirim data formulir prospek dari website (Contact Form, WordPress Elementor, Landing Page) langsung ke pipeline penjualan (Deals) dan Kontak OCTO-CRM.

---

## 1. Spesifikasi Endpoint

- **Metode:** `POST`
- **URL:** `{API_URL}/workspaces/{WORKSPACE_ID}/integrations/lead-intake`
- **Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json`

---

## 2. Kamus Data (JSON Payload)

| Parameter | Tipe | Wajib? | Keterangan |
|---|---|---|---|
| `full_name` | String | **Ya** | Nama lengkap calon klien / kontak |
| `phone` | String | **Ya** | Nomor telepon atau WhatsApp aktif |
| `email` | String | Opsional | Alamat email calon klien |
| `company_name` | String | Opsional | Nama perusahaan / organisasi |
| `product_interest`| String | Opsional | Layanan atau produk yang diminati |
| `message` | String | Opsional | Catatan atau rincian kebutuhan calon klien |
| `form_type` | String | Opsional | Keterangan jenis form (default: "Website Contact Form") |
| `consent_given` | Boolean| Opsional | Persetujuan GDPR / privasi data (default: true) |
| `utm_source` | String | Opsional | Sumber atribusi iklan (Google, IG, dll) |

---

## 3. Contoh Request Body

```json
{
  "full_name": "Budi Santoso",
  "phone": "+6281295099738",
  "email": "budi.santoso@rejeki.com",
  "company_name": "PT Sumber Rejeki",
  "product_interest": "Paket Interior Kantor",
  "message": "Halo, saya butuh penawaran paket interior kantor untuk 50 staf.",
  "form_type": "Website Contact Form",
  "consent_given": true
}
```

---

## 4. Response Berhasil (`201 Created`)

```json
{
  "success": true,
  "message": "Lead intake berhasil diproses",
  "data": {
    "contact_id": "0192e2b3-0000-7000-8000-000000000001",
    "deal_id": "0192e2b3-0000-7000-8000-000000000002",
    "full_name": "Budi Santoso",
    "status": "lead_created"
  }
}
```
