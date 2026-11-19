# Lingkungan Dev (Docker)

Stack terpisah dari produksi, dibangun dari **branch `dev`** repo ini.

| Komponen | Produksi | Dev |
|---|---|---|
| Compose project | `undangan` + `undangan-api` | `undangan-dev` |
| Web | `undangan-pernikahan` :3000 | `undangan-dev-web-1` :3010 (https), :3012 (http) |
| API nginx | `undangan-nginx` :3001 | `undangan-dev-nginx-1` :3011 |
| App PHP | `undangan-app` | `undangan-dev-app-1` |
| DB | `undangan-db` (volume `undangan-api_postgres_data`) | `undangan-dev-db-1` (volume `undangan-dev_pgdata`, DB `undangan_dev`) |

## Lokasi di host

```
/opt/stacks/undangan-dev/
├── docker-compose.yml      # 4 service: db, app, nginx, web
├── .env                    # DB_PASS, APP_KEY, JWT_KEY, ACCESS_KEY (dev)
├── nginx-dev.conf          # config web dev (proxy /api/ -> nginx:8080)
├── security-headers.conf   # header keamanan (include di tiap location)
├── dev.crt / dev.key       # TLS self-signed (10.243.255.50)
├── deploy.sh               # tarik branch dev + build + up
├── init.sh                 # migrasi + cms.sql + seed user
├── content.json            # konten awal (salinan produksi)
└── src/                    # clone repo, branch dev
```

## Akses

- Undangan: `https://10.243.255.50:3010/` (sertifikat self-signed — terima peringatan browser)
- API langsung: `http://10.243.255.50:3011/`
- Admin CMS: `https://10.243.255.50:3010/admin`
- User dev: `admin@dev.local` / password dev (di `init.sh` saat seed awal)

> HTTP polos di :3012 akan menampilkan layar error: aplikasi memerlukan secure
> context (Cache API). Untuk uji lokal gunakan tunnel SSH ke `localhost`
> (`ssh -L 3010:127.0.0.1:3010 root@host`) — localhost juga secure context.

## Perintah harian

```bash
cd /opt/stacks/undangan-dev

./deploy.sh           # deploy branch dev (git reset --hard origin/dev + build + up)
docker compose logs -f web app
docker compose exec app php saya migrasi        # runner (berhenti di cms.sql, wajar)
docker compose exec db psql -U undangan_user -d undangan_dev
```

Rebuild hanya web (perubahan frontend):

```bash
git -C src pull && docker compose build web && docker compose up -d web
```

## Catatan yang ditemukan saat menyiapkan dev

1. **APP_KEY format Kamu**: harus `<base64>::<base64>` (dipisah `::`), bukan hex. `Hash::encrypt` memecah APP_KEY dengan `::`.
2. **Jangan `php saya key` saat build**: butuh `.env` dan hasilnya terkunci di layer image. Sudah dihapus dari Dockerfile.
3. **View cache**: `Compiler::compile()` langsung `return` bila `!debug()`, jadi `php saya view:cache` tidak menghasilkan apa pun saat `DEBUG=false`. Jalankan sekali dengan `-e DEBUG=true`, atau set `VIEW_COMPILED_PATH=/cache/views` (base_path menempelkan root tanpa separator).
4. **Router Kamu memotong URI via `base_url()`**: `Request::getValidUrl()` memakai `strpos(base_url(), HTTP_HOST)`. Bila `Host` tanpa port sementara `BASEURL` memuat port, seluruh path dipotong menjadi `/` → semua request 200 HTML / 405. Karena itu proxy meneruskan `Host $http_host` (dengan port).
5. **CSP + blob**: loader gambar/video memakai `URL.createObjectURL`, jadi CSP wajib memuat `blob:` di `img-src`/`media-src`, kalau tidak semua media gagal.
6. **`progress.invalid()` dulu me-resolve promise pembatalan global** → satu aset gagal (mis. CDN libs) membatalkan semua fetch aset lain. Sudah dihapus; kegagalan kini per-aset.
7. **`access_key` minimal 49 karakter** (validasi framework), dan harus sama dengan `data-key` di `index.html`; `deploy.sh` menanamkannya saat build.

## Status perbaikan yang sudah terpasang di dev

Lihat `docs/RENCANA-PERBAIKAN.md` (kolom status).

- Fase 1 (1.1–1.8) selesai dan terverifikasi di browser: halaman tetap terbuka walau aset gagal, countdown lewat waktu menampilkan keterangan, label tanggal dari `date_iso`, tombol kalender & musik tidak mati.
- Infra: header keamanan konsisten di `/`, `/dist/*`, `/admin`; `limit_req` untuk `/api/session` dan `/api/comment`; TLS di web dev.