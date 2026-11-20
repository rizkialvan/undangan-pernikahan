import { cache } from '../connection/cache.js';

/**
 * Pemuatan aset animasi tambahan.
 *
 * Catatan penting:
 * - AOS sudah DIHAPUS. Reveal on scroll sekarang ditangani
 *   `js/app/guest/reveal.js` (IntersectionObserver, tanpa CDN), jadi tidak ada
 *   lagi request ke jsDelivr hanya untuk animasi.
 * - Kegagalan confetti / font tambahan TIDAK boleh menggagalkan progress
 *   loader: keduanya dekoratif. Dulu satu CDN yang lambat bisa membuat layar
 *   loading tidak pernah selesai.
 */

const safe = (promise) => promise.catch(() => undefined);

/**
 * @param {ReturnType<typeof cache>} c
 * @returns {Promise<void>}
 */
const loadConfetti = (c) => {
    const url = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.js';

    return c.get(url).then((uri) => new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.onerror = rej;
        sc.onload = () => {
            typeof window.confetti === 'undefined' ? rej(new Error('Confetti library failed to load')) : res();
        };

        sc.src = uri;
        document.head.appendChild(sc);
    }));
};

/**
 * @param {ReturnType<typeof cache>} c
 * @returns {Promise<void>}
 */
const loadAdditionalFont = (c) => {

    const fonts = [
        { css: 'https://fonts.googleapis.com/css2?family=Sacramento&display=swap', family: 'Sacramento' },
        { css: 'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic&display=swap', family: 'Noto Naskh Arabic' },
    ];

    /**
     * @param {object}
     * @returns {Promise<void>}
     */
    const loadFont = ({ css, family }) => c.get(css).then((uri) => new Promise((res, rej) => {
        const link = document.createElement('link');
        link.onload = res;
        link.onerror = rej;

        link.rel = 'stylesheet';
        link.href = uri;
        document.head.appendChild(link);
    })).then(() => document.fonts.load(`1em "${family}"`));

    return Promise.all(fonts.map(loadFont));
};

/**
 * @param {Object} [opt]
 * @param {boolean} [opt.confetti=true] - Load Confetti library
 * @param {boolean} [opt.additionalFont=true] - Load Additional Font
 * @returns {Promise<void>}
 */
export const loader = (opt = {}) => {
    const promises = [];
    const c = cache('libs').withForceCache();

    if (opt?.confetti ?? true) {
        promises.push(safe(loadConfetti(c)));
    }

    if (opt?.additionalFont ?? true) {
        promises.push(safe(loadAdditionalFont(c)));
    }

    return Promise.all(promises);
};