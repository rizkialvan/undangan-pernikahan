#!/usr/bin/env node
/**
 * Unduh font katalog (js/common/fonts.json) dari Google Fonts, simpan
 * woff2 subset latin ke assets/fonts/<slug>/<weight>.woff2 lalu tulis
 * assets/fonts/fonts.css (self-hosted, tanpa CDN).
 *
 *   node tools/fetch-fonts.mjs
 *
 * Jalankan ulang hanya kalau katalog berubah. File yang sudah ada dilewati
 * supaya script bisa dijalankan bolak-balik tanpa download ulang.
 */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const outDir = resolve(root, 'assets/fonts');
const catalog = JSON.parse(await readFile(resolve(root, 'js/common/fonts.json'), 'utf8'));

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const slugify = (family) => family.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const exists = async (file) => {
    try {
        const s = await stat(file);
        return s.size > 0;
    } catch {
        return false;
    }
};

const fetchCss = async (family, weights) => {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${weights.join(';')}&display=swap`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });

    if (!res.ok) {
        return null;
    }

    const css = await res.text();

    return css.includes('@font-face') ? css : null;
};

/** Ambil blok @font-face yang hanya berisi subset latin. */
const latinBlocks = (css) => {
    const blocks = [];
    const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
    let m;

    while ((m = re.exec(css)) !== null) {
        const [full, label, body] = m;
        const isLatin = label === 'latin' || /U\+0000-00FF/.test(body);

        if (!isLatin) {
            continue;
        }

        const weight = Number((body.match(/font-weight:\s*(\d+)/) ?? [])[1] ?? 400);
        const src = (body.match(/src:\s*url\((https:[^)]+)\)/) ?? [])[1];
        const range = (body.match(/unicode-range:\s*([^;]+)/) ?? [])[1];

        if (!src) {
            continue;
        }

        blocks.push({ weight, src, range: (range ?? '').trim(), css: full.trim() });
    }

    return blocks;
};

const results = [];
const failed = [];

await mkdir(outDir, { recursive: true });

for (const entry of catalog) {
    const family = entry.family;
    const slug = slugify(family);

    let blocks = [];

    for (const weights of [[400, 700], [400], [500], [600]]) {
        const css = await fetchCss(family, weights);

        if (css) {
            blocks = latinBlocks(css);

            if (blocks.length > 0) {
                break;
            }
        }
    }

    if (blocks.length === 0) {
        failed.push(family);
        console.warn(`✗ ${family}: tidak ada subset latin`);
        continue;
    }

    await mkdir(resolve(outDir, slug), { recursive: true });

    const faces = [];
    const seen = new Set();

    for (const block of blocks) {
        if (seen.has(block.weight)) {
            continue;
        }

        seen.add(block.weight);

        const file = resolve(outDir, slug, `${block.weight}.woff2`);

        if (!await exists(file)) {
            const bin = await fetch(block.src, { headers: { 'User-Agent': UA } });

            if (!bin.ok) {
                console.warn(`  ! ${family} ${block.weight}: HTTP ${bin.status}`);
                continue;
            }

            await writeFile(file, Buffer.from(await bin.arrayBuffer()));
        }

        faces.push({
            weight: block.weight,
            href: `${slug}/${block.weight}.woff2`,
            range: block.range
        });
    }

    results.push({ family, slug, faces });
    console.log(`✓ ${family} (${faces.map((f) => f.weight).join(', ')})`);
}

const css = `/*
 * Font katalog Studio Undangan — self-hosted dari Google Fonts (OFL).
 * Dibuat otomatis oleh tools/fetch-fonts.mjs; jangan diedit manual.
 * Hanya subset latin; font arab memakai Noto Naskh Arabic dari CDN.
 */
${results.map(({ family, faces }) => faces.map(({ weight, href, range }) => `@font-face {
    font-family: '${family}';
    font-style: normal;
    font-weight: ${weight};
    font-display: swap;
    src: url("${href}") format("woff2");${range ? `\n    unicode-range: ${range};` : ''}
}`).join('\n\n')).join('\n\n')}
`;

await writeFile(resolve(outDir, 'fonts.css'), css, 'utf8');

console.log(`\n${results.length} keluarga font, ${results.reduce((n, r) => n + r.faces.length, 0)} file woff2 -> assets/fonts/`);

if (failed.length > 0) {
    console.error(`Gagal: ${failed.join(', ')}`);
    process.exitCode = 1;
}