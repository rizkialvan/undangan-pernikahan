#!/usr/bin/env python3
"""Sinkronkan og:image + meta share di index.html undangan dengan foto cover
yang sedang di-publish di CMS (invitations.content_published -> cover.photo).

- Sumber foto: baris (1) media upload API (path /api/media?f=<file>) atau
  (2) aset statis web (/assets/...).
- Output: <WEB>/assets/images/og/og-<hash12>.jpg, 1200x630, center-crop (bias atas).
- Nama file berubah tiap foto berubah -> cache crawler (WhatsApp/FB) otomatis bypass.
- Hanya file meta share yang disentuh di index.html; data-key & markup lain utuh.
Jalankan manual: python3 /opt/stacks/undangan/tools/og-sync.py
"""

import datetime
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

WEB = "/opt/stacks/undangan"
API_UPLOADS = "/opt/stacks/undangan-api/storage/uploads"
INDEX = os.path.join(WEB, "index.html")
OUT_DIR = os.path.join(WEB, "assets/images/og")
BASE_URL = "https://undangan.metronetwork.my.id"
OG_W, OG_H = 1200, 630
OG_LAYOUT = "blurpad-v2"  # bump kalau komposisi/encoding berubah -> nama file ikut berubah
LOG = "/var/log/undangan-og-sync.log"
DB_USER = "undangan_user"
DB_NAME = "undangan"

INDENT = "    "


def log(msg):
    line = "%s %s" % (datetime.datetime.now().isoformat(timespec="seconds"), msg)
    print(line)
    try:
        with open(LOG, "a") as fh:
            fh.write(line + "\n")
    except OSError:
        pass


def psql(sql):
    res = subprocess.run(
        ["docker", "exec", "undangan-db", "psql", "-U", DB_USER, "-d", DB_NAME, "-Atc", sql],
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        raise RuntimeError("psql gagal: %s" % res.stderr.strip())
    return res.stdout.strip()


def local_source(photo, user_id):
    """Ubah nilai cover.photo jadi path file lokal, atau raise."""
    p = photo.strip()
    if not p:
        raise RuntimeError("cover.photo kosong")
    m = re.match(r"^(?:https?://[^/]+)?(/api/media\?f=)(.+)$", p)
    if m:
        fname = m.group(2)
        if not re.fullmatch(r"[A-Za-z0-9._-]+", fname):
            raise RuntimeError("nama media tidak valid: %r" % fname)
        return os.path.join(API_UPLOADS, str(user_id), fname)
    m = re.match(r"^(?:https?://[^/]+)?(/assets/.+)$", p)
    if m:
        return os.path.join(WEB, m.group(1).lstrip("/"))
    raise RuntimeError("format cover.photo tidak dikenali: %r" % p)


def make_og(src, dst):
    """Portrait difoto utuh di tengah dengan latar blur; landscape di-cover-crop."""
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode != "RGB":
            im = im.convert("RGB")

        ratio = im.width / im.height
        if 1.35 <= ratio <= 2.4:
            out = ImageOps.fit(im, (OG_W, OG_H), method=Image.LANCZOS, centering=(0.5, 0.45))
        else:
            bg = ImageOps.fit(im, (OG_W, OG_H), method=Image.LANCZOS, centering=(0.5, 0.45))
            bg = bg.filter(ImageFilter.GaussianBlur(OG_W / 20))
            bg = ImageEnhance.Brightness(bg).enhance(0.55)
            fg = im.resize((max(1, int(im.width * OG_H / im.height)), OG_H), Image.LANCZOS)
            if fg.width > OG_W:
                fg = ImageOps.fit(im, (OG_W, OG_H), method=Image.LANCZOS, centering=(0.5, 0.45))
            bg.paste(fg, ((OG_W - fg.width) // 2, 0))
            out = bg

        out.save(dst, "JPEG", quality=82, optimize=True, progressive=False)


def build_block(url, alt):
    lines = [
        '<meta property="og:image" content="%s">' % url,
        '<meta property="og:image:secure_url" content="%s">' % url,
        '<meta property="og:image:type" content="image/jpeg">',
        '<meta property="og:image:alt" content="%s">' % alt,
        '<meta property="og:image:width" content="%d">' % OG_W,
        '<meta property="og:image:height" content="%d">' % OG_H,
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:image" content="%s">' % url,
        '<link rel="image_src" href="%s">' % url,
        '<meta itemprop="image" content="%s">' % url,
    ]
    return [INDENT + l for l in lines]


OG_START = re.compile(r'^\s*<meta property="og:image"\s')
OG_CONT = re.compile(
    r'^\s*(?:<meta (?:property="og:image:[a-z_]+"|name="twitter:(?:image|card)"|itemprop="image")'
    r'|<link rel="image_src")\s'
)


def existing_alt(text):
    m = re.search(r'<meta property="og:image:alt" content="([^"]*)"', text)
    if m:
        return m.group(1)
    m = re.search(r"<title>([^<]*)</title>", text)
    return m.group(1).strip() if m else "Undangan Pernikahan"


def patch_index(url):
    with open(INDEX, "r", encoding="utf-8") as fh:
        lines = fh.read().splitlines(keepends=True)

    alt = existing_alt("".join(lines))
    block = build_block(url, alt)

    start = None
    for i, line in enumerate(lines):
        if OG_START.match(line):
            start = i
            break
    if start is None:
        raise RuntimeError("blok og:image tidak ditemukan di index.html")

    end = start
    for j in range(start + 1, len(lines)):
        if OG_CONT.match(lines[j]):
            end = j
        else:
            break

    new_block = [b + "\n" for b in block]
    if lines[start:end + 1] == new_block:
        return False

    bak = INDEX + ".bak-og"
    if not os.path.exists(bak):
        shutil.copy2(INDEX, bak)

    new_lines = lines[:start] + new_block + lines[end + 1:]
    joined = "".join(new_lines)
    for key, want in (
        ('<meta property="og:image" ', 1),
        ("og:image:type", 1),
        ("og:image:secure_url", 1),
        ("twitter:image", 1),
        ('rel="image_src"', 1),
        ('itemprop="image"', 1),
    ):
        got = joined.count(key)
        if got != want:
            raise RuntimeError(
                "validasi gagal: %s muncul %d kali (harus %d), index.html tidak diubah"
                % (key, got, want)
            )
    st = os.stat(INDEX)
    fd, tmp = tempfile.mkstemp(dir=WEB, prefix=".index.html.")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write("".join(new_lines))
    os.chmod(tmp, st.st_mode & 0o777)
    try:
        os.chown(tmp, st.st_uid, st.st_gid)
    except PermissionError:
        pass
    os.replace(tmp, INDEX)
    return True


def prune(keep_name):
    for f in sorted(os.listdir(OUT_DIR)):
        if f.startswith("og-") and f.endswith(".jpg") and f != keep_name:
            try:
                os.remove(os.path.join(OUT_DIR, f))
            except OSError:
                pass


WEB_CONTAINER = "undangan-pernikahan"
DOCROOT = "/usr/share/nginx/html"


def md5_file(path):
    with open(path, "rb") as fh:
        return hashlib.md5(fh.read()).hexdigest()


def container_md5(path):
    res = subprocess.run(
        ["docker", "exec", WEB_CONTAINER, "md5sum", path], capture_output=True, text=True
    )
    return res.stdout.split()[0] if res.returncode == 0 else ""


def sync_container(pairs):
    """Image web mem-bake public/ saat build, jadi file yang berubah harus
    disalin ke container yang sedang jalan (tanpa rebuild)."""
    for local, rel in pairs:
        remote = os.path.join(DOCROOT, rel)
        if md5_file(local) == container_md5(remote):
            continue
        parent = os.path.dirname(remote)
        subprocess.run(["docker", "exec", WEB_CONTAINER, "mkdir", "-p", parent], check=True)
        subprocess.run(["docker", "cp", local, "%s:%s" % (WEB_CONTAINER, remote)], check=True)
        log("SYNC container %s" % remote)


def pick_source(user_id):
    """Prioritas: meta.og_image (field 'Gambar share' di CMS), lalu cover.photo.
    Nilai default lama /assets/images/dj/cover.webp dilewati karena itu file
    statis yang tidak pernah ikut berubah saat foto diganti."""
    row = psql(
        "select coalesce(content_published::jsonb->'meta'->>'og_image','') "
        "|| chr(9) || coalesce(content_published::jsonb->'cover'->>'photo','') "
        "from invitations where user_id=%d" % user_id
    )
    og_image, _, cover_photo = row.partition("\t")
    legacy = {"/assets/images/dj/cover.webp"}
    if og_image.strip() and og_image.strip() not in legacy:
        return og_image.strip(), "meta.og_image"
    return cover_photo.strip(), "cover.photo"


def main():
    user_id = 1
    photo, field = pick_source(user_id)
    if not photo:
        log("SKIP: content_published belum punya og_image/cover.photo")
        return 0
    log("SUMBER %s = %s" % (field, photo))

    src = local_source(photo, user_id)
    if not os.path.isfile(src):
        log("ERROR: sumber tidak ada: %s" % src)
        return 1

    with open(src, "rb") as fh:
        digest = hashlib.sha256(fh.read() + OG_LAYOUT.encode()).hexdigest()[:12]
    name = "og-%s.jpg" % digest
    dst = os.path.join(OUT_DIR, name)
    os.makedirs(OUT_DIR, exist_ok=True)

    if not os.path.isfile(dst):
        make_og(src, dst)
        log("BUAT %s (%d byte) dari %s" % (dst, os.path.getsize(dst), src))
    else:
        log("ADA  %s (tidak berubah)" % dst)

    url = "%s/assets/images/og/%s" % (BASE_URL, name)
    if patch_index(url):
        log("PATCH index.html og:image -> %s" % url)
    else:
        log("OK    index.html sudah memakai %s" % url)

    prune(name)
    sync_container(
        [
            (INDEX, "index.html"),
            (dst, "assets/images/og/%s" % name),
        ]
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())