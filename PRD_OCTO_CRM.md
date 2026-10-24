Product Requirements Document · Draft v1.0

Isi dokumen:

- Business model dan strategi pasar
- Product vision dan target customer
- User journey dan business workflow
- Modul, fitur, dan acceptance criteria
- Monetisasi dan unit economics
- Domain model, API, arsitektur, dan keamanan
- Roadmap, metrik produk, dan risiko bisnis

# PRD OCTO CRM

Versi 1.0 · 18 Oktober 2026 · Status: Draft untuk validasi bisnis

## 1. Executive Summary

### 1.1 Product overview

OCTO CRM adalah platform Customer Relationship Management berbasis SaaS yang membantu bisnis mengelola calon pelanggan, pelanggan aktif, peluang penjualan, interaksi, aktivitas tim, dan tindak lanjut dalam satu workspace.

OCTO CRM bukan sekadar buku alamat digital. Produk ini harus membantu bisnis menjawab pertanyaan operasional seperti:

- Siapa saja calon pelanggan yang harus dihubungi hari ini?
- Dari mana calon pelanggan berasal?
- Berapa nilai peluang penjualan yang sedang berjalan?
- Peluang mana yang berisiko hilang karena tidak ditindaklanjuti?
- Siapa yang bertanggung jawab terhadap setiap pelanggan?
- Pelanggan mana yang berpotensi melakukan pembelian berulang?
- Apakah proses penjualan tim benar-benar menghasilkan konversi?

### 1.2 Positioning

Nama: OCTO CRM

Tagline: Know Your Customers. Grow Your Relationships.

Brand tagline: ONE PLATFORM. MANY POSSIBILITIES.

Value proposition:

> OCTO CRM membantu bisnis merapikan data pelanggan, mengelola peluang penjualan, dan memastikan tidak ada tindak lanjut penting yang terlewat—tanpa harus memulai dengan sistem yang rumit.

### 1.3 Visi

Menjadi workspace hubungan pelanggan yang mudah digunakan oleh bisnis Indonesia untuk mengubah interaksi menjadi hubungan jangka panjang dan pertumbuhan yang terukur.

### 1.4 Misi

1. Menyatukan informasi pelanggan dan prospek dalam satu sumber data.
2. Membuat setiap peluang penjualan memiliki status, pemilik, dan langkah berikutnya.
3. Membantu bisnis memahami konversi dan efektivitas proses penjualan.
4. Mendukung pertumbuhan bisnis dari satu orang hingga tim dan beberapa cabang.
5. Menjaga keamanan, privasi, dan kepemilikan data pelanggan.

### 1.5 Prinsip produk

- Action over administration: pengguna diarahkan ke tindakan berikutnya, bukan hanya melihat tabel.
- Simple to start, scalable to grow: sederhana bagi pemula, tetapi tetap bisa digunakan ketika bisnis berkembang.
- Progressive complexity: fitur lanjutan diperkenalkan sesuai kebutuhan.
- Data ownership: pelanggan dapat mengekspor data bisnisnya.
- Honest automation: automasi dan integrasi harus benar-benar berfungsi sebelum diklaim tersedia.
- Privacy by design: data dikumpulkan sesuai kebutuhan dan tujuan yang jelas.

## 2. Masalah Bisnis yang Ingin Diselesaikan

### 2.1 Kondisi saat ini

Banyak bisnis kecil dan menengah mengelola pelanggan melalui kombinasi:

- WhatsApp pribadi atau WhatsApp Business.
- Spreadsheet.
- Catatan manual.
- Marketplace.
- Formulir online.
- Aplikasi kasir atau sistem reservasi yang terpisah.
- Ingatan pemilik bisnis dan karyawan.

Pendekatan tersebut mungkin cukup ketika volume pelanggan masih kecil. Namun, seiring pertumbuhan, masalah mulai muncul.

| Masalah                        | Dampak bisnis                       | Solusi OCTO CRM                   |
| ------------------------------ | ----------------------------------- | --------------------------------- |
| Data tersebar                  | Sulit memperoleh gambaran pelanggan | Centralized contact database      |
| Follow-up terlupakan           | Peluang penjualan hilang            | Task dan reminder                 |
| Status prospek tidak jelas     | Owner kesulitan memantau sales      | Sales pipeline                    |
| Riwayat pelanggan hilang       | Ketergantungan pada individu        | Contact timeline                  |
| Sumber lead tidak tercatat     | Sulit menilai pemasaran             | Lead source tracking              |
| Pelanggan lama tidak dihubungi | Repeat order terlewat               | Segmentasi dan retention workflow |
| Data duplikat                  | Laporan tidak akurat                | Duplicate detection               |
| Kinerja tim tidak terlihat     | Sulit mengevaluasi proses           | Dashboard dan reporting           |

### 2.2 Problem statement

Bisnis membutuhkan sistem yang cukup sederhana untuk dipakai setiap hari, tetapi cukup terstruktur untuk memastikan data pelanggan, proses penjualan, dan aktivitas tindak lanjut tidak hilang ketika bisnis berkembang.

### 2.3 Business outcome

OCTO CRM harus membantu pelanggan:

1. Mengurangi prospek yang tidak tertindaklanjuti.
2. Mempercepat pencatatan dan pencarian informasi pelanggan.
3. Meningkatkan visibilitas terhadap pipeline penjualan.
4. Mengurangi ketergantungan pada catatan pribadi karyawan.
5. Memperbaiki kualitas data dan konsistensi operasional.
6. Mengidentifikasi peluang repeat order berdasarkan data yang tersedia.

Catatan: peningkatan penjualan bukan hasil yang boleh dijamin hanya karena menggunakan CRM. Produk menyediakan sistem dan visibilitas untuk membantu bisnis memperbaiki prosesnya.

## 3. Target Pasar dan Strategi Segmentasi

### 3.1 Rekomendasi pasar awal

Untuk tahap pertama, OCTO CRM sebaiknya tidak langsung menyasar semua jenis perusahaan. Pilih segmen yang memiliki masalah berulang, proses yang cukup sederhana, dan kebutuhan yang dapat diselesaikan tanpa integrasi enterprise.

| Segmen                     | Kebutuhan utama                         | Prioritas        |
| -------------------------- | --------------------------------------- | ---------------- |
| UMKM dengan repeat order   | Database pelanggan dan tindak lanjut    | Sangat tinggi    |
| Bisnis jasa lokal          | Prospek, jadwal, dan riwayat layanan    | Sangat tinggi    |
| Freelancer dan solopreneur | Pengelolaan kontak dan klien            | Tinggi           |
| Tim sales B2B kecil        | Pipeline dan peluang penjualan          | Tinggi           |
| F&B independen             | Pelanggan, event, dan catering leads    | Tinggi           |
| Retail multi-cabang        | Segmentasi dan koordinasi cabang        | Menengah         |
| Enterprise                 | Governance, SSO, dan integrasi kompleks | Rendah untuk MVP |

### 3.2 Ideal Customer Profile (ICP)

Target pelanggan ideal memiliki karakteristik berikut:

- Mempunyai puluhan hingga ribuan kontak pelanggan atau prospek.
- Menerima prospek dari lebih dari satu kanal.
- Memiliki proses follow-up yang berulang.
- Masih menggunakan spreadsheet atau beberapa aplikasi terpisah.
- Memiliki pemilik atau admin yang bersedia menjaga kualitas data.
- Bersedia membayar apabila produk terbukti menghemat waktu atau membantu proses penjualan.

### 3.3 Persona pengguna

#### Persona A — Business Owner

Tujuan: mengetahui kondisi bisnis tanpa harus mengejar setiap karyawan.

Kebutuhan:

- Dashboard ringkas.
- Nilai pipeline.
- Daftar follow-up terlambat.
- Laporan hasil penjualan.
- Ringkasan aktivitas tim.

#### Persona B — Sales atau Customer Service

Tujuan: menangani prospek dan pelanggan secara konsisten.

Kebutuhan:

- Daftar pekerjaan harian.
- Profil pelanggan.
- Riwayat interaksi.
- Pengingat tindak lanjut.
- Perubahan status prospek yang cepat.

#### Persona C — Admin

Tujuan: menjaga database tetap rapi dan dapat dipercaya.

Kebutuhan:

- Import dan export CSV.
- Pengelolaan anggota.
- Pengaturan field.
- Deteksi duplikasi.
- Pengaturan akses.

#### Persona D — Marketing

Tujuan: memahami sumber prospek dan segmen pelanggan.

Kebutuhan:

- Lead source.
- Tags dan segmentasi.
- Ringkasan konversi.
- Status izin komunikasi pemasaran jika relevan.

## 4. Model Bisnis OCTO CRM

### 4.1 Business model

Model utama yang direkomendasikan adalah Software as a Service (SaaS) dengan sistem langganan bulanan atau tahunan.

Pelanggan membayar untuk menggunakan workspace CRM dengan kapasitas dan fitur sesuai paket.

### 4.2 Sumber pendapatan

| Sumber               | Deskripsi                                      | Tahap                      |
| -------------------- | ---------------------------------------------- | -------------------------- |
| Subscription         | Langganan per workspace                        | Utama                      |
| Team upgrade         | Paket dengan lebih banyak pengguna dan kontrol | Growth                     |
| Advanced reporting   | Laporan lanjutan                               | Growth                     |
| Automation add-on    | Automasi tambahan                              | Setelah validasi           |
| Setup service        | Bantuan setup pipeline dan field               | Opsional                   |
| Data migration       | Bantuan migrasi data pelanggan                 | Opsional                   |
| Integration add-on   | Integrasi pihak ketiga atau ekosistem OCTO     | Setelah integrasi tersedia |
| Multi-branch package | Dukungan beberapa cabang                       | Advanced                   |

### 4.3 Struktur paket yang diusulkan

Ini adalah hipotesis produk yang perlu diuji, bukan harga final.

| Fitur               | Free                | Starter             | Growth          | Business        |
| ------------------- | ------------------- | ------------------- | --------------- | --------------- |
| Contact management  | Ya                  | Ya                  | Ya              | Ya              |
| Sales pipeline      | Terbatas            | Ya                  | Ya              | Ya              |
| Task dan reminder   | Ya                  | Ya                  | Ya              | Ya              |
| CSV import/export   | Batas wajar         | Ya                  | Ya              | Ya              |
| Dashboard           | Dasar               | Dasar               | Lanjutan        | Lanjutan        |
| Anggota tim         | Terbatas            | Beberapa            | Lebih banyak    | Sesuai paket    |
| Custom fields       | Terbatas            | Dasar               | Lebih fleksibel | Lebih fleksibel |
| Automation          | Tidak               | Terbatas atau tidak | Ya              | Ya              |
| Multi-pipeline      | Tidak               | Terbatas            | Ya              | Ya              |
| Granular permission | Dasar               | Dasar               | Lebih detail    | Lanjutan        |
| Integrasi           | Tidak atau terbatas | Sesuai paket        | Sesuai paket    | Sesuai kontrak  |

### 4.4 Prinsip monetisasi

- Jangan mengunci fitur ekspor data sebagai cara memaksa pelanggan berlangganan.
- Tampilkan batas paket dengan jelas.
- Jelaskan kapan trial berakhir dan apakah pembayaran otomatis dimulai.
- Jangan mengklaim integrasi tersedia jika belum dibangun.
- Hindari biaya berdasarkan jumlah kontak yang membuat pelanggan enggan menyimpan seluruh database bisnisnya.
- Bila batas kontak digunakan, definisi kontak yang dihitung harus jelas.
- Biaya provider eksternal harus dijelaskan secara transparan.

### 4.5 Unit economics

OCTO CRM perlu mengukur:

- MRR: pendapatan langganan berulang bulanan.
- ARPA: pendapatan rata-rata per akun berbayar.
- CAC: biaya mendapatkan pelanggan baru.
- Gross margin: pendapatan dikurangi biaya layanan langsung, dibagi pendapatan.
- Logo churn: persentase pelanggan yang berhenti.
- Net revenue retention: perubahan pendapatan dari pelanggan yang sudah ada.
- Payback period: estimasi waktu untuk mengembalikan biaya akuisisi.

Jangan menentukan target angka final sebelum tersedia data pelanggan, biaya operasional, dan hasil eksperimen harga.

## 5. Posisi OCTO CRM dalam Ekosistem OCTO

OCTO CRM menjadi produk yang mengelola hubungan pelanggan. Produk OCTO lain dapat menyediakan kemampuan yang saling melengkapi.

| Produk        | Tanggung jawab                                                                      |
| ------------- | ----------------------------------------------------------------------------------- |
| OCTO CRM      | Kontak, prospek, interaksi, pipeline, dan follow-up                                 |
| OCTO Tap      | NFC/QR yang mengarahkan pelanggan ke URL atau pengalaman yang ditentukan            |
| OCTO Insights | Analitik dari sumber data yang benar-benar tersedia                                 |
| OCTO Loyalty  | Poin, reward, tier, dan program loyalitas jika telah dibangun                       |
| OCTO Business | Pengelolaan bisnis atau portal terpadu, sesuai ruang lingkup produk yang diputuskan |

### 5.1 Contoh alur integrasi

1. Pelanggan memindai NFC/QR OCTO Tap.
2. Pelanggan membuka halaman yang dituju.
3. Jika pelanggan ingin menjadi kontak bisnis, ia mengisi formulir atau mendaftar dengan memberikan informasi yang diperlukan.
4. Data yang diberikan secara sah dapat dicatat ke OCTO CRM.
5. Tim bisnis melakukan follow-up atau mencatat interaksi.
6. OCTO Insights dapat menganalisis event yang tersedia dan terdefinisi.
7. OCTO Loyalty dapat menggunakan data keanggotaan atau transaksi yang terintegrasi dan diizinkan.

Batas penting: pemindaian NFC/QR atau pembukaan Google Review tidak otomatis mengungkap identitas pengunjung. CRM hanya boleh mengaitkan seseorang dengan data yang memang diberikan atau diperoleh melalui integrasi yang sah.

## 6. Product Scope

### 6.1 MVP — wajib tersedia

- Registrasi, login, dan pengelolaan sesi.
- Workspace bisnis.
- Undangan anggota.
- Role dan permission dasar.
- Contact management.
- Company management sederhana.
- Lead dan sales pipeline.
- Task dan reminder.
- Contact timeline.
- Dashboard dasar.
- Import CSV dengan preview dan validasi.
- Export data.
- Search, filter, sorting, dan tags.
- Custom fields terbatas.
- Deteksi kandidat duplikasi.
- Audit event penting.
- Pengelolaan pengaturan workspace.

### 6.2 Growth — setelah MVP tervalidasi

- Form capture untuk lead.
- Segmentasi tersimpan.
- Automasi rule sederhana.
- Notifikasi tambahan.
- Integrasi kanal resmi.
- Laporan funnel lebih lengkap.
- API dan webhooks.
- Role lebih terperinci.
- Fitur kolaborasi tim.

### 6.3 Advanced

- Multi-pipeline.
- Multi-cabang.
- Approval workflow.
- Advanced reporting.
- Integrasi bisnis yang lebih kompleks.
- Audit dan governance lanjutan.
- SSO atau kemampuan enterprise jika kebutuhan pelanggan membenarkannya.

### 6.4 Out of scope MVP

- Membaca otomatis pesan pribadi WhatsApp.
- Mengambil kontak dari perangkat tanpa izin.
- Pengiriman pesan massal tanpa integrasi resmi.
- Sistem accounting lengkap.
- POS dan inventori lengkap.
- Payroll.
- Call center dan telephony.
- AI prediktif tanpa dataset dan validasi memadai.

## 7. Alur Bisnis End-to-End

### 7.1 Akuisisi pengguna OCTO CRM

1. Pengunjung membuka landing page.
2. Pengunjung memahami manfaat produk.
3. Pengunjung mencoba demo dengan data sintetis atau mendaftar.
4. Sistem membuat akun dan workspace.
5. Pengguna memilih template berdasarkan kebutuhan bisnis.
6. Pengguna menambahkan atau mengimpor kontak.
7. Pengguna membuat lead atau pipeline.
8. Pengguna menjadwalkan follow-up pertama.
9. Produk membantu pengguna menyelesaikan aktivitas harian.
10. Pengguna ditawari upgrade ketika kebutuhan nyata melebihi paket yang dipakai.

### 7.2 Alur kerja harian

1. Pengguna membuka halaman Today.
2. Sistem menampilkan task jatuh tempo dan aktivitas penting.
3. Pengguna membuka kontak atau lead.
4. Pengguna mencatat hasil interaksi.
5. Pengguna menetapkan langkah berikutnya.
6. Status lead atau deal diperbarui.
7. Dashboard mencerminkan perubahan sesuai definisi metrik.
8. Owner meninjau hambatan proses penjualan.

### 7.3 Alur repeat order

1. Bisnis menentukan segmen pelanggan berdasarkan data yang tersedia.
2. CRM menampilkan daftar kontak yang memenuhi kriteria.
3. Pengguna memeriksa kelayakan dan status izin komunikasi.
4. Pengguna membuat tugas follow-up atau menggunakan kanal resmi yang terintegrasi.
5. Hasil interaksi dicatat.
6. Hasil pembelian hanya dicatat jika dikonfirmasi melalui input atau sumber transaksi yang valid.

## 8. Information Architecture

Struktur menu utama yang diusulkan:

```
OCTO CRM
├── Home
│   ├── Dashboard
│   └── Today / My Tasks
├── Contacts
│   ├── All Contacts
│   ├── Companies
│   ├── Segments
│   └── Import / Export
├── Sales
│   ├── Leads
│   ├── Pipelines
│   └── Deals
├── Activities
│   ├── Tasks
│   ├── Calendar / List
│   └── Activity Timeline
├── Reports
│   ├── Sales Funnel
│   ├── Lead Sources
│   ├── Activities
│   └── Retention (when supported)
├── Automations
│   ├── Rules
│   └── Run History
├── Integrations
│   ├── Connected Apps
│   └── API / Webhooks
└── Settings
    ├── Workspace
    ├── Members & Roles
    ├── Custom Fields
    ├── Pipeline Settings
    ├── Billing
    ├── Security
    └── Data Export
```

Menu yang belum tersedia pada versi awal harus disembunyikan atau diberi status Coming Soon, bukan dibuat seolah-olah sudah berfungsi.

## 9. Functional Requirements

### 9.1 Authentication dan workspace

| ID      | Requirement                                                  | Prioritas |
| ------- | ------------------------------------------------------------ | --------- |
| AUTH-01 | Pengguna dapat registrasi, login, logout, dan reset password | Must      |
| WS-01   | Pengguna dapat menjadi anggota beberapa workspace            | Must      |
| WS-02   | Data dan permission setiap workspace terisolasi              | Must      |
| WS-03   | Owner dapat mengubah nama bisnis dan zona waktu              | Must      |
| ONB-01  | Onboarding mengumpulkan informasi minimum yang diperlukan    | Must      |
| ONB-02  | Pengguna dapat memilih dan memodifikasi template pipeline    | Must      |
| ONB-03  | Checklist onboarding dapat dilanjutkan nanti                 | Should    |

### 9.2 Contact management

Data kontak dasar:

- ID.
- Nama.
- Nomor telepon.
- Email.
- Perusahaan.
- Owner.
- Lead source.
- Tags.
- Notes.
- Status consent bila relevan.
- Created at dan updated at.
- Archived at bila diarsipkan.

Kebutuhan:

- Membuat, membaca, mengubah, mencari, dan mengarsipkan kontak.
- Menghubungkan kontak dengan lead, deal, task, dan activity.
- Melihat timeline interaksi.
- Menandai kandidat duplikasi.
- Melakukan merge dengan konfirmasi.
- Menggunakan custom fields terbatas.
- Mengekspor data sesuai permission.

Acceptance criteria:

- Record tidak bisa diakses dari workspace lain.
- Data opsional boleh kosong.
- Merge mempertahankan relasi dan histori yang relevan.
- Kandidat duplikat ditampilkan untuk diperiksa; merge tidak dilakukan otomatis tanpa aturan aman.

### 9.3 Lead dan pipeline

Fitur:

- Membuat dan mengubah lead.
- Menetapkan owner.
- Menentukan sumber lead.
- Mengatur nilai peluang.
- Memindahkan tahap pipeline.
- Menandai deal won atau lost.
- Menyimpan tanggal estimasi closing.
- Mencatat alasan lost bila diaktifkan.
- Memfilter berdasarkan tahap, owner, source, nilai, dan tanggal.

Contoh pipeline:

```
New
  ↓
Contacted
  ↓
Qualified
  ↓
Proposal
  ↓
Negotiation
  ├── Won
  └── Lost
```

Pipeline harus dapat dikonfigurasi agar tidak memaksakan satu proses untuk semua jenis bisnis.

### 9.4 Task dan reminder

Setiap task minimal memiliki:

- ID.
- Judul.
- Deskripsi opsional.
- Owner.
- Due date/time.
- Priority.
- Status.
- Relasi ke kontak, lead, atau deal.
- Created at dan updated at.

Status:

- Open.
- In Progress.
- Completed.
- Cancelled.

Sistem menghitung status overdue berdasarkan tenggat, status task, dan waktu yang berlaku. Task yang selesai tetap tersedia dalam riwayat.

### 9.5 Dashboard dan laporan

| Metrik              | Definisi awal                                              |
| ------------------- | ---------------------------------------------------------- |
| Open pipeline value | Nilai deal yang masih terbuka                              |
| Won deal value      | Nilai deal yang ditandai won pada periode terpilih         |
| Conversion rate     | Rasio konversi berdasarkan definisi cohort yang konsisten  |
| Lead source         | Jumlah atau nilai peluang berdasarkan sumber yang tercatat |
| Overdue tasks       | Task terbuka yang sudah melewati tenggat                   |
| Activity trend      | Jumlah aktivitas berdasarkan jenis dan periode             |
| Repeat purchase     | Hanya jika tersedia data transaksi yang valid              |

Laporan harus menampilkan definisi metrik dan filter periode. Nilai deal won tidak boleh disebut sebagai pendapatan akuntansi apabila tidak ada sumber transaksi yang mendukungnya.

### 9.6 Import dan export

Import CSV harus mendukung:

- Preview sebelum commit.
- Pemetaan kolom.
- Validasi field.
- Deteksi duplikasi.
- Ringkasan jumlah berhasil, dilewati, dan gagal.
- Laporan error.
- Penanganan file dengan encoding yang sesuai.
- Batas ukuran dan jumlah baris.
- Pemrosesan asynchronous untuk file besar.

Export harus:

- Dibatasi oleh permission.
- Hanya mencakup workspace yang benar.
- Memiliki audit event.
- Menggunakan tautan unduhan sementara bila diperlukan.
- Memiliki kebijakan retensi file.

### 9.7 Automasi

Automasi sederhana direncanakan untuk fase Growth.

Contoh:

```
Trigger:
Lead created

Condition:
Lead source = Website

Action:
Create follow-up task
Assign to sales owner
Set due date = next business day
```

Persyaratan:

- Trigger, kondisi, dan action dapat diperiksa sebelum aktivasi.
- Pengguna dapat menonaktifkan rule.
- Eksekusi tidak boleh menghasilkan duplikasi tanpa kontrol idempotensi.
- Riwayat eksekusi dan error tersedia.
- Pengiriman pesan eksternal memerlukan integrasi resmi dan kontrol izin yang sesuai.

## 10. Role dan Permission

| Aksi                | Owner | Admin                | Member/Agent         | Viewer       |
| ------------------- | ----- | -------------------- | -------------------- | ------------ |
| Mengelola billing   | Ya    | Tidak secara default | Tidak                | Tidak        |
| Mengundang anggota  | Ya    | Sesuai konfigurasi   | Tidak                | Tidak        |
| Mengatur pipeline   | Ya    | Ya                   | Tidak secara default | Tidak        |
| Membuat kontak      | Ya    | Ya                   | Ya                   | Tidak        |
| Mengubah data       | Ya    | Ya                   | Sesuai scope         | Tidak        |
| Melihat data        | Ya    | Ya                   | Sesuai scope         | Sesuai scope |
| Export seluruh data | Ya    | Sesuai izin          | Tidak secara default | Tidak        |
| Melihat audit log   | Ya    | Sesuai izin          | Tidak secara default | Tidak        |

Permission harus diterapkan di backend untuk setiap operasi. Menyembunyikan tombol di frontend bukan kontrol keamanan yang cukup.

## 11. Model Data Konseptual

Model ini adalah baseline domain dan belum merupakan skema database final.

| Entitas               | Fungsi                                  |
| --------------------- | --------------------------------------- |
| User                  | Identitas pengguna                      |
| Workspace             | Batas tenant, pengaturan, dan billing   |
| Membership            | Hubungan user dengan workspace dan role |
| Contact               | Data orang atau pelanggan               |
| Company               | Data perusahaan                         |
| Lead/Deal             | Peluang penjualan                       |
| Pipeline              | Proses penjualan                        |
| PipelineStage         | Tahapan proses                          |
| Activity              | Riwayat interaksi dan aktivitas         |
| Task                  | Tindakan yang harus diselesaikan        |
| Tag                   | Label untuk organisasi data             |
| CustomFieldDefinition | Definisi field tambahan                 |
| CustomFieldValue      | Nilai field tambahan                    |
| ImportJob             | Status dan hasil proses import          |
| AuditEvent            | Riwayat tindakan penting                |
| ConsentRecord         | Catatan izin yang relevan               |
| Subscription          | Status langganan                        |
| AutomationRule        | Definisi aturan automasi                |
| AutomationRun         | Riwayat eksekusi aturan                 |

### Aturan data

1. Business records harus memiliki `workspace_id` atau relasi tenant yang dapat diverifikasi.
2. Gunakan ID internal stabil; jangan menggunakan email atau nomor telepon sebagai primary key.
3. Normalisasi nomor telepon dan email untuk pencarian serta deduplikasi.
4. Simpan timestamp secara konsisten dan tampilkan sesuai zona waktu workspace.
5. Bedakan archive, soft delete, dan hard delete.
6. Terapkan constraint dan indeks berdasarkan pola akses yang nyata.
7. Jangan menyimpan data sensitif yang tidak diperlukan oleh fungsi produk.

## 12. Arsitektur Teknis

### 12.1 Pendekatan

Rekomendasi awal: modular monolith dengan Clean Architecture dan Domain-Driven Design (DDD).

Microservices tidak perlu menjadi pilihan awal. Pisahkan domain dan modul secara jelas terlebih dahulu agar biaya operasional tetap terkendali.

### 12.2 Struktur tanggung jawab

```
Delivery / Presentation
        |
        v
Application / Use Cases
        |
        v
Domain
        ^
        |
Infrastructure / Adapters
```

Lapisan domain tidak boleh bergantung pada framework HTTP, database, atau vendor eksternal.

Jika menggunakan Go, standar implementasi yang direkomendasikan:

- Domain entity dan value object memiliki business invariant.
- Use case mengatur alur aplikasi, bukan menjadi tempat seluruh business rule.
- Repository abstraction memisahkan domain/application dari persistence.
- DTO request/response terpisah dari domain model.
- Domain model tidak bergantung pada JSON tags untuk kebutuhan transport.
- TDD menggunakan siklus Red–Green–Refactor.
- Unit test domain dan integration test repository.
- Contract test untuk integrasi.
- End-to-end test untuk alur kritis.
- Dependency mengarah ke dalam sesuai prinsip Clean Architecture.

### 12.3 Modul aplikasi

- Identity & Workspace.
- Contacts & Companies.
- Leads & Pipeline.
- Activities & Tasks.
- Reporting.
- Import/Export.
- Billing & Entitlements.
- Integrations.
- Audit & Compliance.
- Automation.

### 12.4 Contoh API

| Method   | Endpoint                                            | Fungsi                        |
| -------- | --------------------------------------------------- | ----------------------------- |
| POST     | `/v1/workspaces`                                    | Membuat workspace             |
| GET      | `/v1/workspaces/{workspaceId}/contacts`             | Daftar kontak                 |
| POST     | `/v1/workspaces/{workspaceId}/contacts`             | Membuat kontak                |
| GET      | `/v1/workspaces/{workspaceId}/contacts/{contactId}` | Detail kontak                 |
| PATCH    | `/v1/workspaces/{workspaceId}/contacts/{contactId}` | Memperbarui kontak            |
| POST     | `/v1/workspaces/{workspaceId}/contacts/import-jobs` | Memulai import                |
| GET      | `/v1/workspaces/{workspaceId}/import-jobs/{jobId}`  | Melihat status import         |
| GET/POST | `/v1/workspaces/{workspaceId}/pipelines`            | Membaca atau membuat pipeline |
| POST     | `/v1/workspaces/{workspaceId}/deals`                | Membuat deal                  |
| PATCH    | `/v1/workspaces/{workspaceId}/deals/{dealId}/stage` | Mengubah tahap deal           |
| GET/POST | `/v1/workspaces/{workspaceId}/tasks`                | Membaca atau membuat task     |
| GET      | `/v1/workspaces/{workspaceId}/reports/pipeline`     | Laporan pipeline              |
| POST     | `/v1/workspaces/{workspaceId}/exports`              | Memulai export                |

API harus mempunyai versioning, validasi request, error format konsisten, pagination, rate limiting, correlation ID, dan kontrol akses tenant.

## 13. Non-Functional Requirements

| Area             | Target awal                                                                       |
| ---------------- | --------------------------------------------------------------------------------- |
| Availability     | Target rancangan 99,5% per bulan setelah production launch                        |
| Performance      | p95 di bawah 500 ms untuk operasi list/search umum pada beban uji yang disepakati |
| Scalability      | Pagination server-side, indeks, batas penggunaan, dan pekerjaan asynchronous      |
| Security         | HTTPS, least privilege, secret management, dependency scanning                    |
| Tenant isolation | Tidak ada akses lintas workspace                                                  |
| Backup           | Backup terjadwal dan pengujian restore                                            |
| Observability    | Structured logs, metrics, tracing/correlation ID, dan alert                       |
| Accessibility    | Navigasi keyboard, label form, kontras memadai, error yang jelas                  |
| Maintainability  | Modular code, automated tests, migration discipline, dan runbook                  |

Angka di atas adalah target rancangan, bukan SLA yang boleh dipublikasikan sebelum diverifikasi.

## 14. Keamanan dan Privasi

OCTO CRM berpotensi menyimpan data pelanggan dan informasi bisnis yang bersifat rahasia. Karena itu, keamanan harus menjadi bagian dari desain awal.

Persyaratan:

- Kumpulkan hanya data yang dibutuhkan.
- Jelaskan tujuan pemrosesan data.
- Terapkan kontrol akses berdasarkan role.
- Isolasi data antartenant.
- Enkripsi komunikasi dan manfaatkan enkripsi penyimpanan yang disediakan infrastruktur.
- Jangan menyimpan password plaintext.
- Jangan mencatat token rahasia ke log.
- Batasi data pribadi di telemetry dan analytics.
- Catat aktivitas penting seperti perubahan role, export, merge, dan penghapusan.
- Tetapkan retensi data, file sementara, dan backup.
- Sediakan prosedur permintaan akses, koreksi, export, serta penghapusan data.
- Evaluasi kewajiban UU Pelindungan Data Pribadi Indonesia dan ketentuan lain yang relevan sebelum peluncuran.

### Consent dan komunikasi pemasaran

CRM harus dapat menyimpan status izin komunikasi bila diperlukan, termasuk sumber, tujuan, waktu, dan status penarikan izin.

Izin untuk komunikasi layanan tidak boleh otomatis dianggap sebagai izin promosi. Pengiriman pesan juga harus mematuhi ketentuan kanal dan provider yang digunakan.

## 15. UX dan Product Demo

### 15.1 Visual direction

Gunakan identitas visual OCTO:

| Elemen         | Nilai     |
| -------------- | --------- |
| Deep Navy      | `#142740` |
| Cyan           | `#00AFC4` |
| Soft Cyan      | `#E8F8FA` |
| Warm White     | `#FAFBFC` |
| Soft Gray      | `#F2F5F7` |
| Secondary Text | `#586779` |

Prinsip UX:

- Tampilan bersih dengan whitespace.
- Quick action untuk menambahkan kontak, lead, dan task.
- Halaman kosong berisi panduan tindakan pertama.
- Tabel berubah menjadi list/card pada layar kecil.
- Tindakan destruktif memiliki konfirmasi yang wajar.
- Pengguna bisa memahami definisi metrik.
- Navigasi penting tidak bergantung pada hover.

### 15.2 Demo di website marketing

Demo harus menggunakan data sintetis.

Konten demo:

1. Dashboard dengan angka contoh.
2. Pipeline Kanban yang dapat dipindahkan.
3. Profil pelanggan dengan timeline sintetis.
4. Simulasi membuat kontak.
5. Simulasi membuat reminder.
6. Simulasi mengubah tahap lead.
7. Tombol reset demo.

Seluruh angka dan data harus ditandai sebagai sample data. Jangan mengklaim prototype sebagai aplikasi produksi.

## 16. Metrik Keberhasilan Produk

| Kategori     | Metrik                           | Tujuan                                          |
| ------------ | -------------------------------- | ----------------------------------------------- |
| Acquisition  | Visitor-to-signup                | Mengukur konversi pengunjung                    |
| Activation   | Time to first value              | Mengukur waktu hingga manfaat pertama           |
| Activation   | Workspace activated              | Mengukur workspace yang mulai memakai alur inti |
| Engagement   | Weekly active workspace          | Mengukur penggunaan bermakna                    |
| Engagement   | Follow-up completion rate        | Mengukur penyelesaian tindak lanjut             |
| Data quality | Duplicate rate                   | Mengukur kualitas database                      |
| Sales        | Lead stage conversion            | Mengukur perpindahan tahap                      |
| Retention    | Week-4 workspace retention       | Mengukur penggunaan berulang                    |
| Revenue      | MRR dan trial-to-paid            | Mengukur monetisasi                             |
| Trust        | Export/delete request completion | Mengukur pemenuhan permintaan data              |
| Reliability  | Error rate dan p95 latency       | Mengukur kesehatan sistem                       |

Jangan menentukan target final tanpa baseline dari pengguna beta. Pengukuran harus membedakan aktivitas yang sekadar terjadi dari aktivitas yang benar-benar menghasilkan nilai bagi pengguna.

## 17. Roadmap Pengembangan

| Tahap            | Estimasi indikatif | Output                                                  |
| ---------------- | ------------------ | ------------------------------------------------------- |
| Discovery        | 2–3 minggu         | Interview, workflow, validasi masalah, riset harga      |
| Product design   | 2–4 minggu         | User flow, wireframe, prototype, usability test         |
| MVP engineering  | 6–10 minggu        | Kontak, pipeline, task, dashboard, CSV, roles           |
| Private beta     | 3–5 minggu         | Pilot dengan 5–10 bisnis                                |
| Paid beta/launch | 2–4 minggu         | Billing, support, terms, privacy, operational readiness |
| Growth           | Setelah validasi   | Integrasi, automasi, segmentasi, laporan lanjutan       |

Estimasi tersebut bukan komitmen jadwal. Durasi aktual tergantung kapasitas tim, pilihan teknologi, kebutuhan integrasi, dan temuan validasi.

### Gate sebelum melanjutkan

- Discovery → Design: masalah utama terkonfirmasi melalui interview.
- Design → Engineering: pengguna target dapat menyelesaikan tugas inti melalui prototype.
- Engineering → Beta: alur kritis, isolasi tenant, dan keamanan telah diuji.
- Beta → Paid launch: terdapat penggunaan berulang, proses support, backup/restore, serta kebijakan produk yang siap.
- MVP → Growth: fitur lanjutan didukung bukti kebutuhan dan perhitungan biaya.

## 18. Risiko Bisnis dan Mitigasi

| Risiko                                | Mitigasi                                             |
| ------------------------------------- | ---------------------------------------------------- |
| Produk terlalu generik                | Fokus pada satu atau dua segmen awal                 |
| Pengguna merasa input data merepotkan | Quick add, import yang baik, dan field wajib minimal |
| Database tidak terawat                | Dedupe, ownership, validasi, dan audit               |
| Fitur berkembang terlalu cepat        | Prioritaskan berdasarkan dampak dan evidence         |
| Integrasi pihak ketiga berubah        | Gunakan adapter boundary dan monitor health          |
| Kebocoran data lintas workspace       | Tenant isolation tests dan security review           |
| Klaim pemasaran berlebihan            | Status Live/Beta/Planned yang jelas                  |
| Biaya support terlalu tinggi          | Onboarding mandiri dan help center                   |
| CAC terlalu mahal                     | Uji referral, konten, partner, dan akuisisi langsung |

## 19. Acceptance Criteria MVP

MVP dinyatakan memenuhi kebutuhan dasar apabila:

- Pengguna dapat membuat akun dan workspace.
- Owner dapat mengundang anggota dan menetapkan role.
- Kontak dapat dibuat, dicari, diedit, dan diarsipkan.
- Kontak dapat dihubungkan dengan lead, deal, task, dan activity.
- Import CSV memiliki preview, validasi, dan laporan hasil.
- Pipeline dapat dikonfigurasi.
- Deal dapat berpindah tahap dengan aturan yang konsisten.
- Pengguna dapat membuat, menyelesaikan, dan melihat task overdue.
- Dashboard menampilkan metrik yang didefinisikan dengan benar.
- Export mengikuti permission dan tenant boundary.
- Pengujian tidak menemukan akses lintas workspace pada jalur kritis.
- Backup dan restore telah diuji.
- Error tidak membocorkan secret atau data pelanggan.
- Demo marketing menggunakan data sintetis dan label yang jelas.
- Kebijakan privasi, terms, retensi data, dan proses penutupan akun tersedia sebelum paid launch.

## 20. Keputusan yang Harus Divalidasi Sebelum Development

| Pertanyaan           | Rekomendasi awal                                                 |
| -------------------- | ---------------------------------------------------------------- |
| Target pertama       | Pilih satu segmen UMKM/jasa atau sales B2B kecil                 |
| Kontak dan lead      | Pisahkan Contact dari Lead/Deal                                  |
| WhatsApp integration | Evaluasi provider resmi setelah MVP                              |
| Harga                | Validasi melalui interview dan eksperimen                        |
| Mobile app           | Responsive web/PWA dahulu                                        |
| OCTO Tap integration | Mulai dari link atau form capture yang jelas                     |
| Custom fields        | Terbatas di MVP                                                  |
| Multi-cabang         | Fase lanjutan                                                    |
| Retensi data         | Tetapkan berdasarkan kebutuhan produk dan kewajiban hukum        |
| Billing provider     | Pilih setelah kebutuhan pembayaran, pajak, dan refund dipastikan |

## 21. Discovery Plan Sebelum Development

Sebelum membangun semua fitur, lakukan validasi berikut:

1. Wawancarai 15–20 calon pelanggan dari segmen yang dipilih.
2. Minta mereka menjelaskan proses pengelolaan pelanggan saat ini.
3. Identifikasi pekerjaan yang sering terlupakan dan proses yang memakan waktu.
4. Amati cara mereka menggunakan spreadsheet atau alat lain.
5. Buat prototype untuk kontak, pipeline, dan follow-up.
6. Uji prototype dengan pengguna yang tidak terlibat dalam pembuatannya.
7. Tanyakan apakah mereka bersedia mencoba produk pada pekerjaan nyata.
8. Uji hipotesis harga dan paket.
9. Pilih 5–10 bisnis sebagai calon pilot.
10. Gunakan hasil pilot untuk menentukan prioritas roadmap.

Kriteria keberhasilan discovery: menemukan masalah yang nyata, berulang, dan cukup bernilai untuk membuat pelanggan mau mengubah kebiasaan atau membayar.

## 22. Glosarium

| Istilah   | Definisi                                                                     |
| --------- | ---------------------------------------------------------------------------- |
| CRM       | Sistem untuk mengelola hubungan dan interaksi pelanggan                      |
| Workspace | Ruang kerja bisnis dengan data, anggota, konfigurasi, dan billing tersendiri |
| Contact   | Orang atau organisasi yang memiliki hubungan dengan bisnis                   |
| Lead      | Calon peluang yang perlu dikualifikasi atau ditindaklanjuti                  |
| Deal      | Peluang penjualan dengan tahap dan hasil yang dapat dilacak                  |
| Pipeline  | Urutan tahap proses penjualan                                                |
| Activity  | Catatan interaksi atau aksi yang telah dilakukan                             |
| Task      | Pekerjaan yang harus diselesaikan oleh seseorang                             |
| Consent   | Catatan izin untuk tujuan pemrosesan tertentu                                |
| MRR       | Monthly Recurring Revenue                                                    |

## 23. Referensi Awal

- Salesforce — [What is CRM?](https://www.salesforce.com/crm/what-is-crm/?utm_source=chatgpt.com)
- HubSpot — [CRM Resources](https://www.hubspot.com/?utm_source=chatgpt.com)
- Peraturan terkait pelindungan data pribadi Indonesia — perlu ditinjau sebelum peluncuran.
