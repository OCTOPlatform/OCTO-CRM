# Panduan Instalasi & Deployment Hermes Agent + Skill OCTO-CRM di Server Staging

Dokumen ini memuat panduan lengkap *step-by-step* untuk memasang (**install**), mengonfigurasi, dan menghubungkan **Hermes Agent** beserta skill **`octo-crm`** pada server staging (Linux Ubuntu / Debian VPS).

---

## 📋 Prasyarat Server Staging

Pastikan server staging memenuhi kriteria berikut:
- **Sistem Operasi:** Ubuntu 22.04 / 24.04 LTS atau distro Linux modern lainnya.
- **Python:** Versi 3.10+ (disarankan 3.11/3.12) dan paket `python3-pip`, `python3-venv`, `curl`, `git`.
- **Akses Jaringan:** Server dapat mengakses endpoint backend OCTO-CRM (baik `http://127.0.0.1:8080/api/v1` jika 1 server, atau `https://api-staging.domainanda.com/api/v1`).
- **API Key LLM:** Kunci API untuk inference model (Google Gemini, OpenRouter, Anthropic, atau OpenAI).

---

## 🚀 Langkah 1: Install Paket Dasar di Server Staging

Login ke server staging melalui SSH, lalu jalankan:

```bash
sudo apt update && sudo apt install -y curl git python3 python3-pip python3-venv
```

---

## 🤖 Langkah 2: Install Hermes Agent

Jalankan skrip instalasi resmi Hermes Agent:

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

Setelah instalasi selesai, tambahkan binary `hermes` ke PATH profil Anda:
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Verifikasi bahwa Hermes Agent sudah terpasang:
```bash
hermes version
```

---

## 🔑 Langkah 3: Konfigurasi Provider AI (LLM) di Hermes

Konfigurasikan model AI yang akan digunakan oleh Hermes Agent:

```bash
hermes setup
```
*Atau* set API Key via environment variable (contoh menggunakan Gemini API Key):
```bash
echo 'export GEMINI_API_KEY="AIzaSy..."' >> ~/.bashrc
source ~/.bashrc
```

Pastikan status lingkungan sudah hijau:
```bash
hermes status
```

---

## 📦 Langkah 4: Pasang Skill `octo-crm` di Server Staging

### Cara A: Salin dari Mesin Lokal via SCP (Paling Cepat)
Jalankan perintah ini **dari komputer lokal Anda**:
```bash
scp -r ~/.hermes/skills/octo-crm user@IP_SERVER_STAGING:~/.hermes/skills/
```

---

### Cara B: Setup Manual di Server Staging
Jika menyalin langsung di server staging, buat direktori skill:
```bash
mkdir -p ~/.hermes/skills/octo-crm/scripts ~/.hermes/skills/octo-crm/state
```

1. **Buat file `~/.hermes/skills/octo-crm/config.json`:**
```json
{
  "api_url": "https://api-staging.domainanda.com/api/v1",
  "workspace_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "email": "bot@octocrm.id",
  "password": "password123",
  "token": ""
}
```

2. **Salin file `octo_client.py`:**
Salin isi dari repository atau buat di `~/.hermes/skills/octo-crm/scripts/octo_client.py`, lalu beri hak akses eksekusi:
```bash
chmod +x ~/.hermes/skills/octo-crm/scripts/octo_client.py
```

3. **Salin file `SKILL.md`:**
Salin ke `~/.hermes/skills/octo-crm/SKILL.md`.

---

## 🧪 Langkah 5: Verifikasi & Uji Koneksi

1. **Periksa apakah skill dikenali oleh Hermes:**
```bash
hermes skills list
```
*(Pastikan baris `octo-crm` berstatus `enabled`)*

2. **Uji kesehatan koneksi ke backend OCTO-CRM:**
```bash
python3 ~/.hermes/skills/octo-crm/scripts/octo_client.py health
```
Output yang diharapkan:
```json
{
  "status": "ok",
  "service": "OCTO CRM API"
}
```

3. **Uji pembacaan pipeline Deals:**
```bash
python3 ~/.hermes/skills/octo-crm/scripts/octo_client.py list-deals
```

4. **Uji interaksi AI otonom Hermes:**
```bash
hermes -s octo-crm chat -q "Cek status OCTO CRM dan ringkas 2 deal terbaru di pipeline"
```

---

## 🌐 Langkah 6 (Opsional): Menjalankan Gateway / Background Service di Staging

Jika Anda ingin Hermes Agent aktif terus-menerus melayani pesan (misal via Telegram Bot atau WhatsApp):

1. **Konfigurasikan platform perpesanan:**
```bash
hermes gateway setup
```

2. **Pasang sebagai background service (systemd di Linux):**
```bash
hermes gateway install
hermes gateway start
```

3. **Cek status service:**
```bash
hermes gateway status
```

---

## 🛠️ Ringkasan Parameter Environment Staging

| Variable | Deskripsi | Contoh Nilai |
|---|---|---|
| `OCTO_API_URL` | Endpoint base API OCTO-CRM staging | `https://api-staging.octocrm.id/api/v1` |
| `OCTO_WORKSPACE_ID` | UUID Workspace staging | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` |
| `OCTO_EMAIL` | Akun bot/admin khusus integrasi | `bot@octocrm.id` |
| `OCTO_PASSWORD` | Password akun bot | `password123` |
| `OCTO_JWT_TOKEN` | (Opsional) Token JWT permanen/service token | `eyJhbGciOiJIUzI1Ni...` |
