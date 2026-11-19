# Font & Musik Latar (CMS)

Dua kontrol tampilan yang dipakai sehari-hari di **Studio Undangan → Tampilan**.

## 1. Tipografi (font judul & font isi)

- **Font judul** → `theme.font` (dipakai `.font-esthetic`, `.home-title`, `.cover-names`).
- **Font isi** → `theme.font_body` (dipakai `body`, `p`, `.btn`, `.form-control`).
  Kosong = ikut font bawaan tema (Josefin Sans dari `css/common.css`).

Di panel Tampilan:

1. Pilih target **Font judul** / **Font isi**.
2. Filter kategori (serif, tulisan tangan, sans, dekoratif) atau cari nama font.
3. Klik kartu font → pratinjau di atas langsung berubah, lalu **Save draft** → **Publish**.

Semua font katalog di-host sendiri (`assets/fonts/`), jadi pratinjau tampil tanpa
menunggu CDN dan halaman tamu tidak bergantung ke `fonts.googleapis.com`.

### Menambah font baru

1. Tambahkan baris ke `frontend/js/common/fonts.json`:
   `{ "family": "Nama Font", "category": "serif|script|sans|display" }`
2. Unduh woff2 subset latin + regenerasi CSS:
   ```bash
   cd frontend
   node tools/fetch-fonts.mjs
   ```
   Script mengambil `@font-face` subset latin dari Google Fonts, menyimpan
   `assets/fonts/<slug>/<weight>.woff2`, lalu menulis ulang `assets/fonts/fonts.css`.
3. Commit `fonts.json`, `fonts.css`, dan folder woff2-nya. File yang sudah ada
   tidak diunduh ulang, jadi aman dijalankan berulang.

Font di luar katalog tetap bisa dipakai (mis. diketik manual di draft lama):
`content.js` memuatnya dari Google Fonts seperti perilaku sebelumnya.

### Catatan teknis

- `js/common/fonts.js` adalah satu-satunya sumber daftar font (dipakai CMS dan
  halaman tamu). Jangan menulis daftar font di tempat lain.
- Nama font dibersihkan dari kutip/backslash sebelum masuk CSS, karena nilai ini
  berasal dari input admin.
- CSP nginx sudah mengizinkan `font-src 'self'`, jadi tidak perlu aturan baru.

## 2. Musik latar

Field `music`:

| Field     | Arti                                                              |
|-----------|-------------------------------------------------------------------|
| `enabled` | tombol musik tampil & lagu diputar setelah tamu membuka undangan   |
| `src`     | URL file audio (`/api/media?f=...` hasil upload, atau aset statis) |
| `title`   | judul lagu (otomatis diisi dari nama file saat memilih)            |
| `volume`  | volume awal 0–100 (`data-audio-volume`, dipakai `audio.js`)        |

Alur di panel: **Tampilan → Musik Latar**

- **Uji putar** memutar file langsung di CMS (tanpa publish) + menampilkan durasi.
- **Pilih** membuka galeri media (filter audio); bisa unggah MP3/M4A/WAV baru
  (batas 20 MB) dari dialog yang sama.
- **Pakai lagu bawaan** mengembalikan ke `/assets/music/pure-love-304010.mp3`.
- Volume disimpan di draft; klik **Save draft** lalu **Publish** agar tamu memakai
  nilai baru.

Backend: `api/app/Support/InvitationContent.php` menormalkan `music.volume`
(dipaksa 0–100) dan `theme.font_body` (maks 60 karakter). Tanpa rebuild image
API, field baru akan dibuang saat save.