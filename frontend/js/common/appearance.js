/**
 * Penerapan tema dari CMS ke halaman tamu.
 *
 * Semua nilai warna berasal dari backend yang sudah divalidasi sebagai #hex,
 * jadi aman dipasang lewat CSS custom property (tidak ada string bebas yang
 * masuk ke <style>).
 */

const EASING = {
    linear: 'linear',
    'out-quad': 'cubic-bezier(.25,.46,.45,.94)',
    'out-expo': 'cubic-bezier(.16,1,.3,1)',
    'in-out': 'cubic-bezier(.65,0,.35,1)',
    spring: 'cubic-bezier(.34,1.56,.64,1)'
};

const PALETTE_KEYS = ['bg', 'surface', 'surface_alt', 'text', 'muted', 'line'];

let current = null;
let pageBg = null;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const isHex = (value) => typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value);

const luminance = (hex) => {
    const value = String(hex).replace('#', '');
    const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value.slice(0, 6);
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
    const [hi, lo] = luminance(a) > luminance(b) ? [luminance(a), luminance(b)] : [luminance(b), luminance(a)];
    return (hi + 0.05) / (lo + 0.05);
};

const textOn = (accent) => (contrast(accent, '#1c1916') >= contrast(accent, '#ffffff') ? '#1c1916' : '#ffffff');

/**
 * Latar seluruh halaman dipasang sebagai layer tetap di belakang konten.
 * Body saja tidak cukup: setiap <section> punya warna solid sendiri sehingga
 * gambar latar tidak pernah terlihat.
 */
const applyPageBackground = (url, opacity) => {
    const root = document.documentElement;

    if (typeof url !== 'string' || url.trim() === '') {
        pageBg?.remove();
        pageBg = null;
        root.removeAttribute('data-page-bg');
        return;
    }

    if (!pageBg || !pageBg.isConnected) {
        pageBg = document.createElement('div');
        pageBg.className = 'cms-page-bg';
        pageBg.setAttribute('aria-hidden', 'true');

        // <img> + object-fit lebih stabil daripada background-image di WebView
        // mobile: tidak ikut di-repaint/rescale saat address bar hide/show.
        const img = document.createElement('img');
        img.className = 'cms-page-bg-img';
        img.alt = '';
        img.decoding = 'async';
        pageBg.appendChild(img);

        document.body.insertBefore(pageBg, document.body.firstChild);
    }

    const img = pageBg.querySelector('img');
    const clean = url.replace(/["\\]/g, '');

    if (img.getAttribute('src') !== clean) {
        img.src = clean;
    }

    img.onerror = () => {
        pageBg.classList.add('is-broken');
    };

    pageBg.classList.remove('is-broken');
    pageBg.style.opacity = String(opacity / 100);

    root.setAttribute('data-page-bg', '1');
    root.style.setProperty('--cms-bg-opacity', String(opacity / 100));
};

/**
 * @param {object} theme isi content.theme
 * @returns {object} tema yang benar-benar dipakai
 */
export const apply = (theme = {}) => {
    const root = document.documentElement;
    const palette = theme.palette ?? {};
    const motion = theme.motion ?? {};
    const fx = theme.fx ?? {};
    const reduced = prefersReducedMotion();
    const animationOff = theme.animation === false;

    const skin = typeof theme.preset === 'string' && theme.preset !== '' ? theme.preset : 'default';
    root.setAttribute('data-skin', skin);

    // Token palet hanya dipasang bila diisi; kalau kosong, tampilan bawaan
    // (Bootstrap light/dark + guest.css) yang berlaku seperti sebelumnya.
    PALETTE_KEYS.forEach((key) => {
        const value = palette[key];
        if (isHex(value)) {
            root.style.setProperty(`--cms-${key}`, value);
        } else {
            root.style.removeProperty(`--cms-${key}`);
        }
    });

    const accent = isHex(theme.accent) ? theme.accent : '#8c7853';
    root.style.setProperty('--cms-accent', accent);
    root.style.setProperty('--cms-accent-contrast', textOn(accent));

    const duration = Math.min(2000, Math.max(200, Number(motion.duration) || 900));
    const stagger = Math.min(300, Math.max(0, Number(motion.stagger) || 0));

    root.style.setProperty('--cms-motion-ms', `${duration}ms`);
    root.style.setProperty('--cms-stagger', `${stagger}ms`);
    root.style.setProperty('--cms-ease', EASING[motion.easing] ?? EASING['out-expo']);

    const reveal = reduced || animationOff ? 'none' : String(motion.reveal ?? 'fade-up');
    root.setAttribute('data-reveal', reveal);
    root.setAttribute('data-fx-cursor', !reduced && !animationOff && fx.cursor === 'sparkle' ? 'sparkle' : 'none');
    // Hati dekorasi (SVG inline di section) bisa disembunyikan dari CMS.
    root.setAttribute('data-inline-hearts', fx.inline_hearts === false ? 'off' : 'on');

    const bgOpacity = Math.min(100, Math.max(0, Number(theme.background_opacity ?? 100)));
    applyPageBackground(theme.background, bgOpacity);

    document.body.setAttribute('data-confetti', String(!animationOff && fx.confetti !== false));
    document.body.setAttribute('data-animation', animationOff || reduced ? 'off' : 'on');

    current = {
        preset: skin,
        accent,
        motion: { ...motion, reveal, duration, stagger },
        cover: theme.cover ?? {},
        fx: animationOff || reduced ? { ...fx, confetti: false, petals: 'none', floaters: 'none', overlay: '', cursor: 'none' } : fx
    };

    return current;
};

export const appearance = {
    apply,
    current: () => current,
    prefersReducedMotion
};