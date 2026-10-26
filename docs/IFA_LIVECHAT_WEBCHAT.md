# Dokumen IFA (Interface Agreement): Integrasi Live Chat Website (WebChat) ke OCTO-CRM

Dokumen ini mendefinisikan spesifikasi antarmuka teknis (IFA) untuk menghubungkan widget obrolan langsung (Live Chat Widget) pada website tenant ke sistem **Omnichannel Inbox & Customer Support Ticketing** OCTO-CRM.

---

## 1. Ringkasan Arsitektur & Alur Kerja

```
[ Pengunjung Website ]
         │
         │  1. Kirim Pesan / Inisiasi (POST /inbox/webchat/send)
         ▼
[ OCTO-CRM Public WebChat API ]
         │
         ├─► 2. Cek / Buat Kontak Baru (Customer Identity)
         ├─► 3. Buat / Lanjutkan Percakapan (Channel: webchat)
         ├─► 4. Asisten Virtual Bot Sapaan (Otomatis 24/7)
         └─► 5. Auto-Assign CS & Buat Tiket CS (Round-Robin Support)
         │
         ▲  6. Polling Balasan CS (GET /inbox/webchat/messages)
         │
[ Tim CS Omnichannel Inbox ]
```

### Karakteristik Utama:
- **Autentikasi Publik (No Bearer Token needed):** Endpoint webchat dirancang khusus untuk pengunjung website publik sehingga tidak memerlukan token JWT atau API key rahasia di sisi frontend website.
- **Identitas Pengunjung (Visitor ID):** Dihasilkan oleh frontend website (misal via `localStorage`) dengan format unik, contoh: `web-XXXXX-<timestamp>`.
- **Dukungan CORS Penuh:** Dapat dipanggil langsung dari domain website apa pun (`Access-Control-Allow-Origin: *`).
- **Integrasi Otomatis:**
  - Pesan masuk akan langsung muncul secara real-time di halaman **Live Chat & Omnichannel Inbox** OCTO-CRM.
  - Jika bot aktif, bot akan langsung memberikan respons sapaan.
  - Jika dialihkan ke CS (Human Handoff), sistem otomatis membuat tiket CS baru dan menugaskan staf CS yang sedang online dengan algoritma Round-Robin.

---

## 2. Parameter yang Diperlukan Tenant

Tenant hanya memerlukan 2 parameter untuk menghubungkan widget ke workspace mereka:

| Parameter | Deskripsi | Contoh Nilai |
|-----------|-----------|--------------|
| `API_URL` | Base URL endpoint API OCTO-CRM | `https://api-crm.octocrm.id/api/v1` |
| `WORKSPACE_ID` | UUID Workspace tenant di OCTO-CRM | `0c700000-0000-0000-0000-000000000000` |

---

## 3. Spesifikasi Endpoint REST API

### A. Mengirim Pesan (Inisiasi / Balasan Pengunjung)
- **Metode:** `POST`
- **URL:** `{API_URL}/workspaces/{WORKSPACE_ID}/inbox/webchat/send`
- **Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json`

#### Request Body (JSON):
```json
{
  "visitor_id": "web-9a8b7c-171829000",
  "name": "Budi Santoso",
  "phone": "+6281295099738",
  "email": "budi.santoso@perusahaan.com",
  "message": "Halo, saya ingin menanyakan mengenai integrasi CRM."
}
```

#### Deskripsi Field:
| Field | Tipe | Wajib? | Keterangan |
|---|---|---|---|
| `visitor_id` | String | **Ya** | ID unik pengunjung yang disimpan di browser (misal localStorage) |
| `name` | String | **Ya** | Nama lengkap pengunjung web |
| `message` | String | **Ya** | Teks pesan yang dikirimkan |
| `phone` | String | Opsional | Nomor telepon / WhatsApp aktif |
| `email` | String | Opsional | Alamat email pengunjung |

#### Response Berhasil (`201 Created`):
```json
{
  "success": true,
  "message": "Pesan webchat berhasil dikirim",
  "data": {
    "conversation_id": "84da408e-7df8-428b-a82a-6f8550795ede",
    "message_id": "0192e2b3-5678-7000-9abc-def012345678",
    "sender_name": "Budi Santoso",
    "content": "Halo, saya ingin menanyakan mengenai integrasi CRM.",
    "created_at": "2026-10-26T15:45:00Z"
  }
}
```

---

### B. Mengambil Riwayat Percakapan & Balasan CS (Polling)
- **Metode:** `GET`
- **URL:** `{API_URL}/workspaces/{WORKSPACE_ID}/inbox/webchat/messages?visitor_id={VISITOR_ID}`
- **Headers:**
  - `Accept: application/json`
- **Frekuensi Rekomendasi:** Setiap 3 s.d. 5 detik saat jendela obrolan terbuka.

#### Query Parameter:
| Parameter | Tipe | Wajib? | Keterangan |
|---|---|---|---|
| `visitor_id` | String | **Ya** | ID pengunjung yang sama yang digunakan saat mengirim pesan |

#### Response Berhasil (`200 OK`):
```json
{
  "success": true,
  "data": {
    "conversation_id": "84da408e-7df8-428b-a82a-6f8550795ede",
    "ticket_number": "TICK-20261026-0001",
    "assigned_to_name": "Egi Chandra Pratama",
    "status": "active",
    "messages": [
      {
        "id": "msg-001",
        "sender_type": "customer",
        "sender_name": "Budi Santoso",
        "content": "Halo, saya ingin menanyakan mengenai integrasi CRM.",
        "created_at": "2026-10-26T15:45:00Z"
      },
      {
        "id": "msg-002",
        "sender_type": "agent",
        "sender_name": "Asisten Virtual OCTO",
        "content": "Halo Budi Santoso! 👋 Selamat datang di Layanan Pelanggan kami...",
        "created_at": "2026-10-26T15:45:02Z"
      },
      {
        "id": "msg-003",
        "sender_type": "agent",
        "sender_name": "Egi Chandra Pratama",
        "content": "Halo Pak Budi, saya dari tim support. Ada yang bisa saya bantu?",
        "created_at": "2026-10-26T15:47:15Z"
      }
    ]
  }
}
```

---

## 4. Contoh Kode Implementasi

### A. Komponen React / Next.js
Lihat implementasi referensi lengkap di `frontend/src/app/(dashboard)/settings/page.tsx` atau `LiveChatWidget.tsx` di `OCTO-WEB`.

### B. Drop-In Vanilla JavaScript (Untuk Website HTML / WordPress / Webflow)
Cukup letakkan kode berikut sebelum tag penutup `</body>`:

```html
<!-- OCTO-CRM WebChat Drop-In Script -->
<script>
(function() {
  const WORKSPACE_ID = "0c700000-0000-0000-0000-000000000000";
  const CRM_API_URL = "https://api-crm.octocrm.id/api/v1";

  let vid = localStorage.getItem('octo_webchat_vid');
  if (!vid) {
    vid = 'web-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
    localStorage.setItem('octo_webchat_vid', vid);
  }

  // Kirim pesan pertama:
  window.octoSendChat = async function(name, phone, message) {
    const res = await fetch(`${CRM_API_URL}/workspaces/${WORKSPACE_ID}/inbox/webchat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: vid, name, phone, message })
    });
    return res.json();
  };

  // Ambil pesan CS:
  window.octoGetMessages = async function() {
    const res = await fetch(`${CRM_API_URL}/workspaces/${WORKSPACE_ID}/inbox/webchat/messages?visitor_id=${encodeURIComponent(vid)}`);
    return res.json();
  };
})();
</script>
```
