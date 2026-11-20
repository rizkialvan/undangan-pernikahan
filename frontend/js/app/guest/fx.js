/**
 * Efek dekoratif halaman tamu: kelopak/salju/serbuk emas, overlay gambar,
 * dan kilau kursor.
 *
 * Semua efek dimulai SETELAH tamu menekan "Open Invitation" dan tidak pernah
 * ikut dihitung oleh progress loader — kalau aset gagal dimuat, efeknya saja
 * yang hilang, undangan tetap terbuka.
 */

const COLORS = {
    rose: '#d98c9a',
    sakura: '#f0b6c4',
    snow: '#ffffff',
    gold: '#d8b46a'
};

const PETAL_CLASS = {
    snow: ' fx-petal--snow',
    gold: ' fx-petal--gold'
};

let layer = null;
let overlayEl = null;
let cursorHandler = null;
let cursorTimer = null;

const random = (min, max) => min + Math.random() * (max - min);

const ensureLayer = () => {
    if (layer && layer.isConnected) {
        return layer;
    }

    layer = document.createElement('div');
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    return layer;
};

const clearPetals = () => {
    layer?.remove();
    layer = null;
};

const addPetals = (kind, intensity) => {
    if (!kind || kind === 'none') {
        return;
    }

    const host = ensureLayer();
    const count = { 1: 10, 2: 20, 3: 34 }[Number(intensity)] ?? 20;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
        const el = document.createElement('span');
        const size = kind === 'gold' ? 5 : random(8, 18);

        el.className = 'fx-petal' + (PETAL_CLASS[kind] ?? '');
        el.style.setProperty('--x', `${random(0, 100).toFixed(2)}%`);
        el.style.setProperty('--size', `${size.toFixed(1)}px`);
        el.style.setProperty('--dur', `${random(9, 18).toFixed(1)}s`);
        el.style.setProperty('--delay', `${(-random(0, 12)).toFixed(1)}s`);
        el.style.setProperty('--drift', `${random(-90, 90).toFixed(0)}px`);
        el.style.setProperty('--fx-color', COLORS[kind] ?? COLORS.rose);
        el.style.opacity = kind === 'snow' ? String(random(0.45, 0.85).toFixed(2)) : '';

        fragment.appendChild(el);
    }

    host.replaceChildren(fragment);
};

const addOverlay = (url, position = 'bottom') => {
    removeOverlay();

    if (!url) {
        return;
    }

    const img = document.createElement('img');
    img.className = `fx-overlay fx-overlay--${['top', 'bottom', 'full'].includes(position) ? position : 'bottom'}`;
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.setAttribute('aria-hidden', 'true');
    img.addEventListener('error', () => img.remove(), { once: true });
    img.src = url;

    document.body.appendChild(img);
    overlayEl = img;
};

const removeOverlay = () => {
    overlayEl?.remove();
    overlayEl = null;
};

const stopCursor = () => {
    if (cursorHandler) {
        window.removeEventListener('pointermove', cursorHandler);
        cursorHandler = null;
    }

    clearTimeout(cursorTimer);
    cursorTimer = null;
};

const startCursor = () => {
    if (!window.matchMedia?.('(pointer: fine)').matches) {
        return;
    }

    let last = 0;

    cursorHandler = (e) => {
        const now = Date.now();
        if (now - last < 70) {
            return;
        }
        last = now;

        const dot = document.createElement('span');
        dot.className = 'fx-spark';
        dot.style.left = `${e.clientX}px`;
        dot.style.top = `${e.clientY}px`;
        document.body.appendChild(dot);

        setTimeout(() => dot.remove(), 750);
    };

    window.addEventListener('pointermove', cursorHandler, { passive: true });
};

export const fx = {
    start(config = {}) {
        this.stop();

        addPetals(config.petals, config.intensity);
        addOverlay(config.overlay, config.overlay_pos);

        if (config.cursor === 'sparkle') {
            startCursor();
        }
    },

    stop() {
        clearPetals();
        removeOverlay();
        stopCursor();
    },

    refresh(config = {}) {
        this.start(config);
    }
};