/**
 * Reveal on scroll — pengganti AOS.
 *
 * Kenapa tidak pakai AOS lagi: AOS 2.3.4 (2020) tidak dirawat dan dulu dimuat
 * dari CDN jsDelivr saat runtime, sehingga animasi bisa gagal total saat CDN
 * lambat/diblokir. Engine ini ±100 baris, tanpa dependensi, dan fail-open:
 * elemen hanya disembunyikan setelah kelas .rv dipasang oleh JS, jadi kalau
 * JS gagal, konten tetap terlihat.
 */

const MAP = {
    'fade-up': 'fade-up',
    'fade-down': 'fade-up',
    'fade-right': 'slide-right',
    'fade-left': 'slide-left',
    'fade': 'fade',
    'zoom-in': 'zoom',
    'zoom-out': 'zoom',
    'flip-up': 'fade-up',
    'flip-down': 'fade-up'
};

const PRESETS = ['fade', 'fade-up', 'zoom', 'blur', 'mask', 'slide-left', 'slide-right'];

let observer = null;
let started = false;

const presetFor = (el, fallback) => {
    const explicit = el.getAttribute('data-reveal-item');
    if (explicit && explicit !== 'auto') {
        return PRESETS.includes(explicit) ? explicit : fallback;
    }

    const aos = el.getAttribute('data-aos');
    if (aos) {
        return MAP[aos] ?? fallback;
    }

    return fallback;
};

const show = (el) => {
    el.classList.add('is-revealed');
};

const collect = () => Array.from(document.querySelectorAll('[data-aos], [data-reveal-item]'));

/**
 * @param {{force?: string}} [options] paksa preset tertentu (dipakai preview CMS)
 */
export const init = (options = {}) => {
    if (started) {
        return;
    }

    const root = document.documentElement;
    const preset = options.force ?? root.getAttribute('data-reveal') ?? 'fade-up';

    if (preset === 'none' || !('IntersectionObserver' in window)) {
        collect().forEach(show);
        started = true;
        return;
    }

    const items = collect();

    if (items.length === 0) {
        started = true;
        return;
    }

    const stagger = Math.min(300, Math.max(0, parseInt(getComputedStyle(root).getPropertyValue('--cms-stagger'), 10) || 0));
    const seen = new Map();

    observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            const el = entry.target;
            const index = seen.get(el) ?? 0;

            el.style.setProperty('--rv-delay', `${Math.min(300, index * stagger)}ms`);
            show(el);
            observer.unobserve(el);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach((el) => {
        const presetName = presetFor(el, preset);
        const parent = el.parentElement ?? document.body;
        const index = seen.get(parent) ?? 0;

        el.classList.add('rv', `rv-${presetName}`);

        const custom = parseInt(el.getAttribute('data-aos-duration'), 10);
        if (Number.isFinite(custom)) {
            el.style.setProperty('--cms-motion-ms', `${Math.min(2500, Math.max(150, custom))}ms`);
        }

        seen.set(parent, Math.min(index + 1, 12));
        seen.set(el, index);
        observer.observe(el);
    });

    started = true;
};

/** Untuk konten yang dirender ulang (mis. preview CMS). */
export const refresh = () => {
    observer?.disconnect();
    observer = null;
    started = false;
    init();
};

export const reveal = { init, refresh };