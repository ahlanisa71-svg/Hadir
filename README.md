# HADIR — Sistem Absensi Pesantren (tahap 1)

Satu aplikasi untuk **Admin** dan **Pengurus**, offline-first, absensi **pengenalan wajah di tablet**, tersinkron ke **Google Sheets** lewat **Google Apps Script**. Website Admin (GitHub Pages) dan APK memakai kode yang sama dan database yang sama.

## Isi proyek
| Berkas | Fungsi |
|---|---|
| `index.html`, `css/`, `js/` | Aplikasi (PWA, tanpa framework). Semua 16 menu berfungsi. |
| `sw.js`, `manifest.webmanifest` | Cache offline & instalasi. |
| `apps-script/Code.gs` | Backend/API Google Apps Script + Google Sheets + Google Drive (backup). |
| `scripts/get-face-models.sh` | Mengunduh face-api.js + model wajah ke `vendor/`. |
| `.github/workflows/pages.yml` | Menerbitkan website Admin ke GitHub Pages. |
| `.github/workflows/apk.yml` | Membangun APK (Capacitor) di GitHub Actions. |

## Pemasangan (urutan disarankan)
### 1. Backend (sekali)
1. Buat Google Spreadsheet kosong → **Extensions › Apps Script** → tempel isi `apps-script/Code.gs`.
2. Jalankan fungsi **`setup`** (beri izin). Buka *Execution log*, **salin KUNCI API**.
3. **Deploy › New deployment › Web app** — *Execute as: Me*, *Who has access: Anyone*. Salin URL `/exec`.
4. (Opsional) jalankan `installDailyBackup` untuk backup harian otomatis ke folder Drive "HADIR Backup".

### 2. Website Admin
Unggah proyek ini ke repositori GitHub, aktifkan **Settings › Pages › Source: GitHub Actions**. Workflow `pages.yml` otomatis mengunduh pustaka wajah dan menerbitkan situs.

### 3. APK
**Actions › Build APK › Run workflow** → unduh `app-debug.apk` dari *Artifacts* → pasang di HP/tablet. (APK debug dapat dipasang langsung; untuk Play Store perlu tanda tangan rilis.)

### 4. Pemakaian pertama
Buka aplikasi → layar **Buat akun Admin** (tidak ada sandi bawaan). Lalu **Backup & Sinkronisasi** → isi URL + Kunci API.
Di tablet/HP lain: pada layar awal pilih **sambungkan ke server** — akun & data otomatis diambil.

### 5. Pengenalan wajah
Pustaka & model **tidak ikut dalam berkas ini** (lingkungan pembuatan tidak punya akses internet ke npm). Jalankan `./scripts/get-face-models.sh` (atau biarkan GitHub Actions melakukannya). Tanpa itu, absensi manual tetap berfungsi dan menu wajah menampilkan pesan yang jelas.

## Hak akses
Admin: penuh. Pengurus: per menu **Tidak ada / Lihat / Kelola**, diatur individual di *Akun & Hak Akses*. Menu yang tidak diizinkan tidak muncul, dan pembukaan langsung dialihkan.

## Kapasitas & desain data
IndexedDB di perangkat (tahan ditutup/restart, `storage.persist` diminta). Sinkronisasi per catatan, *last-write-wins*; ID absensi deterministik (`tanggal|santri|kegiatan`) sehingga absensi ganda tidak mungkin terbentuk, termasuk dari dua tablet. Dirancang untuk 100–500 santri. Google Sheets membatasi ±10 juta sel: untuk >1–2 tahun data absensi, arsipkan/ekspor lalu kosongkan sheet `absensi`.

## Keamanan — yang perlu Anda ketahui
- **Template wajah**: AES-GCM, kunci non-ekstrak di IndexedDB tablet, **tidak pernah dikirim** ke server/Sheets/backup. Konsekuensi: wajah harus didaftarkan di **tiap tablet**; menghapus data aplikasi menghapus template.
- Sandi di-hash PBKDF2-SHA256 (150 rb iterasi), kunci akun dikunci 30 dtk setelah 5 kali salah.
- **Batasan jujur**: hak akses & login dijalankan di sisi aplikasi (arsitektur serverless Sheets). Kunci API dipegang semua perangkat dan hash sandi ikut tersinkron; siapa pun yang memegang Kunci API + URL dapat membaca/menulis database. Jaga kerahasiaan Kunci API (`resetApiKey` untuk mengganti), batasi akses Spreadsheet, dan pertimbangkan backend dengan autentikasi per pengguna bila data makin sensitif.
- Pengenalan wajah **tidak punya deteksi kehidupan (liveness)**: foto cetak berkualitas bisa mengelabui. Sediakan pengawasan; gunakan ambang kecocokan ketat (Pengaturan).
- Data wajah adalah biometrik: dapatkan persetujuan wali dan sediakan jalur manual.

## Status pengujian
Diuji otomatis di Chrome: pembuatan admin, CRUD, impor/ekspor Excel, absensi manual + koreksi + log perubahan, laporan Excel/PDF, hak akses pengurus, persistensi data, mode offline, sinkronisasi ke Code.gs (dijalankan dengan mock Apps Script), tema/bahasa, tampilan 390 px.
**Belum diuji**: kamera & pengenalan wajah di perangkat nyata, build APK di GitHub Actions, deploy Apps Script sungguhan. Uji dengan beberapa santri dulu dan sesuaikan ambang wajah.
Fitur "Cetak" memakai dialog cetak peramban (website); di APK gunakan **Ekspor PDF**.

## Tahap berikutnya
Liveness, backend dengan autentikasi per pengguna, notifikasi WhatsApp ke wali, tanda tangan APK rilis, arsip absensi per tahun.


> **Versi datar (tanpa folder):** semua berkas di satu tingkat agar mudah diunggah dari HP. Berkas `.github/workflows/*.yml` dibuat manual di GitHub.
