# Undangan Pernikahan Digital + CMS

Undangan pernikahan online dengan panel admin (CMS) untuk mengelola seluruh isi undangan tanpa menyentuh kode — lengkap dengan RSVP, moderasi ucapan, manajemen tamu, dan manajemen media.

Dibangun untuk kebutuhan nyata satu undangan (bukan SaaS multi-tenant), dengan dua komponen:

| Folder | Isi | Stack |
|---|---|---|
| `frontend/` | Halaman undangan + Studio Undangan (CMS) | HTML, CSS, vanilla JS (ES modules), esbuild, nginx |
| `api/` | REST API konten, RSVP, ucapan, media, tamu | PHP 8.2 (Kamu Framework), PostgreSQL 16 |

## Fitur

**Halaman undangan**
- Cover dengan nama tamu personal (`?to=Nama&g=slug&k=key`)
- Countdown, akad & resepsi, lokasi + Google Maps, dress code
- Love story, galeri carousel, love gift (transfer/QRIS/hadiah)
- Ucapan & RSVP: hadir/tidak hadir, balasan, like, GIF (Tenor opsional)
- Musik latar, tema terang/gelap/auto, confetti, layout responsif
- Hidrasi konten dari API saat halaman dibuka; jika API gagal, markup statis dipakai sebagai fallback

**Studio Undangan (`/admin`)**
- **Dashboard** — ringkasan, statistik tamu/RSVP, kelengkapan konten, status publikasi
- **Profil Mempelai** — nama, orang tua, foto, deskripsi
- **Info Pernikahan** — tanggal & zona waktu, countdown, akad/resepsi, venue, Maps, dress code
- **Konten Undangan** — opening, kutipan, love story, galeri, love gift, penutup
- **Media** — upload/preview/replace/delete, dipakai lintas field
- **Daftar Tamu** — CRUD, link personal, status RSVP, export CSV
- **Ucapan & RSVP** — moderasi: edit nama/kehadiran/isi, balas sebagai mempelai, hapus, like, cari, export CSV
- **Tampilan** — warna aksen, font, mode, animasi, musik, background, live preview
- **Publikasi** — draft vs published, preview token, URL, SEO
- **Akun & Keamanan** — profil, zona waktu, izin tamu, filter kata, Tenor key, ganti password

## Menjalankan

### 1. Database + API

```bash
cd api
cp .env.example .env
# isi: APP_KEY, JWT_KEY (string acak panjang), DB_PASS, BASEURL
docker compose up -d --build
```

Buat skema awal (urutan penting, idempoten):

```bash
# tabel bawaan framework: users, comments, likes
docker exec -i <db-container> psql -U "$DB_USER" -d "$DB_NAME" -f /path/to/database/schema/*.php  # lewat `php saya migrasi` di image
# tabel CMS: invitations, media, guests, comments.guest_id
docker exec -i <db-container> psql -U "$DB_USER" -d "$DB_NAME" < database/schema/cms.sql
```

> Catatan: runner `php saya migrasi` pada framework ini mengeksekusi **semua** file migrasi setiap kali (tanpa tabel pelacak), jadi untuk database yang sudah hidup gunakan DDL idempoten `database/schema/cms.sql` lewat `psql`.

### 2. Frontend

```bash
cd frontend
npm install
npm run build        # menghasilkan dist/guest.js, dist/admin.js, dist/cms.js
docker compose up -d --build
```

Sesuaikan di `frontend/index.html`:
- `data-key` → access key milik user undangan (didapat dari tabel `users.access_key`, lihat juga panel Akun)
- `data-url="/"` → biarkan relatif; nginx mem-proxy `/api/` ke container API
- nama domain pada tag SEO/OG (`meta.url`, `canonical`)

## Struktur API

```
POST   /api/session                login admin (JWT)
GET    /api/v2/content             konten published (?preview=<token> untuk draft)
GET    /api/v2/comment             daftar ucapan (q, per, next)
POST   /api/comment                kirim ucapan / balasan
PUT    /api/comment/{own}          edit ucapan (admin boleh ubah nama)
DELETE /api/comment/{own}          hapus ucapan + balasan
POST   /api/comment/{uuid}         like
PATCH  /api/comment/{uuid}         unlike
GET    /api/admin/overview         ringkasan CMS
GET    /api/admin/content          draft + published + versi
PUT    /api/admin/content          simpan draft
POST   /api/admin/publish          publish draft
POST   /api/admin/preview-token    token preview draft (HMAC, 30 menit)
GET/POST/PUT/DELETE /api/admin/media[/{id}]
GET/POST/PUT/DELETE /api/admin/guests[/{id}]
GET    /api/admin/guests/export    CSV tamu
GET    /api/download               CSV ucapan
GET    /api/media?f=<file>         sajikan media publik
PATCH  /api/user                   profil/izin admin
```

## Keamanan

- `.env` (berisi `DB_PASS`, `JWT_KEY`, `APP_KEY`) **tidak** disertakan dalam repo. Isi sendiri dari `.env.example`.
- `frontend/index.html` di repo ini memakai placeholder `data-key="ISI_DENGAN_ACCESS_KEY_UNDANGAN"`. Ganti dengan access key asli sebelum deploy.
- Access key bersifat publik (tertanam di halaman) dan hanya boleh memberi akses tamu, bukan admin. Admin memakai JWT dari `POST /api/session`.
- Media hasil upload disimpan di volume `api/storage/uploads` dan disajikan lewat API (bukan docroot), agar path tidak bisa ditebak.
- Rotasi access key akan memutus hidrasi konten & komentar sampai `index.html` diperbarui dan di-rebuild.

## Kredit

- Halaman undangan dan komponen awalnya berbasis [dewanakl/undangan](https://github.com/dewanakl/undangan) (MIT).
- API memakai [Kamu Framework](https://github.com/kamu/framework).
- Lapisan CMS, hidrasi konten, moderasi RSVP, manajemen media/tamu, dan panel admin ditambahkan di atasnya.

## Lisensi

MIT — lihat `frontend/LICENSE`.