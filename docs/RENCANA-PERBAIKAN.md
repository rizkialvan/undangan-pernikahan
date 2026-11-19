# Rencana Perbaikan — hasil audit 19 Nov 2026

Acuan penuh: `references/audit-undangan-2026-11-19.md` (audit 4 peran, bukti file:baris).
Dokumen ini adalah rencana eksekusi: apa yang dikerjakan, urutan, kriteria selesai, dan risiko.

## Prinsip

1. **Konten dulu, kode kemudian.** Undangan yang salah data lebih merusak daripada bug internal.
2. **Perubahan kecil, terverifikasi.** Setiap butir punya cara uji yang bisa diulang (`curl`, browser, SQL).
3. **Dev dulu, live belakangan.** Semua perubahan diuji di stack `undangan-dev` (port 3010/3011) sebelum menyentuh produksi.
4. **Rollback selalu tersedia.** Tag image `:prev` sebelum deploy; backup DB+storage sebelum migrate.

---

## Fase 0 — Konten & keselamatan data (hari ini, tanpa kode)

| # | Tugas | Kriteria selesai |
|---|---|---|
| 0.1 | Isi konten asli di Studio Undangan (nama orang tua, tanggal, venue, maps, rekening, dress code) lalu Publish | `GET /api/v2/content` tidak memuat `lorem`, `1234567891234`, `goo.gl/maps/ALZR6`, `Pajerukan` |
| 0.2 | Set `settings.date_iso` ke tanggal acara; jangan biarkan label tanggal statis | countdown ≥ 1 hari; label tanggal = tanggal `date_iso` |
| 0.3 | Nonaktifkan akun seed `admin@undangan.local` bila tidak dipakai | `select email,is_active from users` → false |
| 0.4 | Backup `pg_dump -Fc` + `tar storage` ke luar host, uji restore ke stack sementara | restore menghasilkan undangan utuh termasuk media |
| 0.5 | `limit_req` nginx untuk `/api/session` & `/api/comment` | 11 request cepat → 503 pada yang ke-11 |

## Fase 1 — Ketahanan frontend (1 deploy)

| # | Tugas | File | Kriteria selesai |
|---|---|---|---|
| 1.1 | Kegagalan aset tidak fatal: `progress.fail()` menaikkan counter dan tetap memicu `done` — **selesai** | `js/app/guest/progress.js`, `image.js`, `video.js`, `audio.js` | terbukti: 1 aset gagal → undangan tetap terbuka |
| 1.2 | Fallback saat `/api/v2/config` gagal: media + komentar tetap dimuat — **selesai** | `js/app/guest/guest.js` | terbukti di dev (catch memuat media + komentar) |
| 1.3 | Hapus `alert()` dari lapisan transport — **selesai** | `js/connection/request.js` | tidak ada popup native |
| 1.4 | Tombol Google Calendar: listener saat boot, URL dihitung saat klik, fallback `data-time` — **selesai** | `js/app/guest/guest.js` | tanggal kosong → ada pesan, tidak diam |
| 1.5 | Tombol musik tidak disabled permanen (`finally`) — **selesai** | `js/app/guest/audio.js` | autoplay ditolak → tombol tetap bisa diklik |
| 1.6 | Countdown lewat waktu: status "acara telah berlangsung" — **selesai** | `js/app/guest/guest.js`, `content.js` | terbukti di dev (tanggal 2024) |
| 1.7 | Label tanggal diturunkan dari `date_iso` — **selesai** | `js/app/guest/content.js` | terbukti: label jadi "Senin, 1 Januari 2024" |
| 1.8 | Parse tanggal tahan Safari (normalisasi `T`) — **selesai** | `content.js`, `guest.js` | perlu uji perangkat iOS |

## Fase 2 — API & data (1–2 deploy)

| # | Tugas | File | Kriteria selesai |
|---|---|---|---|
| 2.1 | `PUT /api/admin/content` bermakna *merge* (payload parsial tidak me-reset default) | `CmsController.php`, `InvitationContent.php` | PUT 1 section → section lain utuh |
| 2.2 | `save()` tidak menulis `is_live`; status tayang hanya berubah lewat publish | `CmsController.php` | simpan draft `is_live=false` → situs tetap tayang |
| 2.3 | Publish transaksional + `expected_version` (409 bila bentrok) | `CmsController.php` | dua publish paralel → satu sukses, satu 409 |
| 2.4 | Tabel `invitation_revisions` (riwayat publish, bisa rollback) | `database/schema/cms.sql` | publish menambah 1 baris revisi |
| 2.5 | `likes` unik per aktor: `actor_key` + unique index; like idempoten | `LikeRepositories.php`, DDL | klik like 5x → tetap 1 baris |
| 2.6 | Index: `likes(comment_id)`, `comments(parent_id)`, `comments(user_id,id DESC) WHERE parent_id IS NULL` | DDL | `EXPLAIN` tidak seq scan |
| 2.7 | Runner migrasi ber-tabel pelacak (`schema_migrations`) | `database/` | migrasi 2x → aman |
| 2.8 | `access_key` tidak lagi di URL: `invitations.public_token` + scope guest | `GuestController`, middleware | link `?k=` tidak membuka endpoint tulis |
| 2.9 | Rate limiter Postgres (ganti ketergantungan MongoDB) | `RateLimitMiddleware` | 11 login/menit → 429 |

## Fase 3 — Infra & rilis (sebelum hari-H)

| # | Tugas | Kriteria selesai |
|---|---|---|
| 3.1 | `.dockerignore` (`.env`, `storage`, `cache`, `vendor`, `.git`) + rebuild tanpa cache | `docker history` tidak memuat layer `.env` |
| 3.2 | `display_errors=Off`, `expose_php=Off`, `log_errors=On` di php.ini | `php -i` konfirmasi |
| 3.3 | Header keamanan via satu file `include` di setiap `location` | `curl -I /`, `/admin`, `/dist/guest.js` memuat CSP |
| 3.4 | `BASEURL` publik + teruskan `X-Forwarded-Proto`/`HTTPS` ke PHP | link tamu `https://...` |
| 3.5 | Media via `X-Accel-Redirect` + `Accept-Ranges: bytes` | `curl -r 0-1024` → 206 |
| 3.6 | `pm.max_children` sesuai RAM; healthcheck menyentuh API+DB | health gagal saat API mati |
| 3.7 | Lockfile + `npm ci`; pin base image; tag `:prev` tiap deploy | dua build identik |
| 3.8 | nginx non-root (`USER nginx`, pid/cache di /tmp) | `ps -o user` bukan root |

---

## Lingkungan dev

- Stack: `/opt/stacks/undangan-dev` (compose project `undangan-dev`)
- Container: `undangan-dev-db`, `undangan-dev-app`, `undangan-dev-nginx`, `undangan-dev-web` (nama mengikuti project, tidak menabrak produksi)
- Port: **3010** (web) dan **3011** (API langsung untuk debug)
- DB terpisah: `undangan_dev` di volume `undangan-dev_pgdata`
- Deploy: `cd /opt/stacks/undangan-dev && docker compose up -d --build`
- Media disalin dari produksi (`assets/images/dj`, `assets/music`, `assets/video`) karena tidak masuk repo.

## Urutan deploy yang aman (produksi)

1. `docker tag` image lama ke `:prev` untuk web, app, nginx.
2. Backup DB + storage; catat `access_key` saat ini.
3. Deploy stack API lebih dulu, verifikasi `/api/health`, lalu web.
4. Verifikasi: buka link tamu di HP, klik Open Invitation, cek komentar/RSVP/like, cek header via `curl -I`.
5. Bila gagal: jalankan tag `:prev`, restore data bila perlu (tidak ada rollback tanpa backup).