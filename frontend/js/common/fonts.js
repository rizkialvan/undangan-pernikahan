import catalog from './fonts.json';

/**
 * Katalog font undangan (self-hosted, lihat tools/fetch-fonts.mjs).
 *
 * Dipakai dua sisi:
 *  - CMS (js/app/cms/*) untuk pemilih font + pratinjau langsung.
 *  - Halaman tamu (js/app/guest/content.js) untuk memasang font pilihan admin.
 *
 * Font di luar katalog tetap didukung lewat Google Fonts (perilaku lama),
 * supaya draft/lamat yang sudah menyimpan nama font lain tidak rusak.
 */
export const FONT_STACKS = {
    serif: 'serif',
    script: 'cursive',
    sans: 'sans-serif',
    display: 'serif'
};

export const FONT_CATEGORIES = [
    { key: 'all', label: 'Semua' },
    { key: 'serif', label: 'Serif klasik' },
    { key: 'script', label: 'Tulisan tangan' },
    { key: 'sans', label: 'Sans modern' },
    { key: 'display', label: 'Dekoratif' }
];

export const FONTS = catalog.map((item) => ({
    family: item.family,
    category: item.category ?? 'serif',
    slug: String(item.family).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}));

const BY_FAMILY = new Map(FONTS.map((f) => [f.family, f]));

/** Cari entri katalog (case-insensitive). */
export const findFont = (family) => {
    if (!family) {
        return null;
    }

    const key = String(family).trim();

    return BY_FAMILY.get(key) ?? FONTS.find((f) => f.family.toLowerCase() === key.toLowerCase()) ?? null;
};

export const isCatalogFamily = (family) => Boolean(findFont(family));

/**
 * Nilai `font-family` siap pakai. Nama dibersihkan dari kutip agar tidak bisa
 * menyuntik CSS lewat konten CMS.
 */
export const fontStack = (family, fallback = 'serif') => {
    const clean = String(family ?? '').replace(/["'\\]/g, '').trim();

    if (clean === '') {
        return '';
    }

    const entry = findFont(clean);

    return `'${clean}', ${FONT_STACKS[entry?.category ?? 'serif'] ?? fallback}`;
};

/** URL absolut CSS @font-face self-hosted. */
export const FONTS_CSS_URL = '/assets/fonts/fonts.css';

/** URL Google Fonts untuk nama font di luar katalog (fallback lama). */
export const googleFontsUrl = (family, weights = '') => {
    const name = String(family ?? '').replace(/["'\\]/g, '').trim();

    if (name === '') {
        return '';
    }

    const slug = encodeURIComponent(name).replace(/%20/g, '+');

    return `https://fonts.googleapis.com/css2?family=${slug}${weights ? `:wght@${weights}` : ''}&display=swap`;
};

/**
 * Pastikan stylesheet font katalog sudah terpasang di halaman.
 * @returns {HTMLLinkElement|null}
 */
export const ensureFontStylesheet = (doc = document) => {
    if (!doc || !doc.head) {
        return null;
    }

    let link = doc.getElementById('cms-fonts');

    if (!link) {
        link = doc.createElement('link');
        link.id = 'cms-fonts';
        link.rel = 'stylesheet';
        link.href = FONTS_CSS_URL;
        doc.head.appendChild(link);
    }

    return link;
};

/** Daftar font sesuai kategori/tema pencarian. */
export const filterFonts = ({ category = 'all', query = '' } = {}) => {
    const q = String(query ?? '').trim().toLowerCase();

    return FONTS.filter((font) => {
        if (category !== 'all' && font.category !== category) {
            return false;
        }

        return q === '' || font.family.toLowerCase().includes(q);
    });
};