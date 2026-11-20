import { store } from './store.js';
import { ui } from './ui.js';

const { esc, icon } = ui;

const SECTIONS = [
    { key: 'home', label: 'Home / pembuka', hint: 'Hero dengan slideshow dan tombol scroll', anchor: '#home' },
    { key: 'bride', label: 'Mempelai', hint: 'Profil kedua mempelai', anchor: '#bride' },
    { key: 'quotes', label: 'Firman Allah', hint: 'Ayat / kutipan', anchor: '#quotes' },
    { key: 'story', label: 'Kisah cinta', hint: 'Love story + video', anchor: '#story' },
    { key: 'date', label: 'Tanggal & acara', hint: 'Countdown, akad, resepsi, maps', anchor: '#wedding-date' },
    { key: 'gallery', label: 'Galeri', hint: 'Carousel foto', anchor: '#gallery' },
    { key: 'gift', label: 'Hadiah / rekening', hint: 'Transfer & e-wallet', anchor: '#cms-gift-section' },
    { key: 'comment', label: 'Ucapan & RSVP', hint: 'Formulir dan daftar ucapan', anchor: '#comment' },
    { key: 'closing', label: 'Penutup', hint: 'Doa, terima kasih, kredit', anchor: '#closing' }
];

const KEYS = SECTIONS.map((s) => s.key);
const DEFAULT_ORDER = [...KEYS];

const currentOrder = () => {
    const stored = store.get('layout.sections', DEFAULT_ORDER);
    const list = Array.isArray(stored) ? stored.filter((k) => KEYS.includes(k)) : [];
    const unique = [...new Set(list)];

    KEYS.forEach((key) => {
        if (!unique.includes(key)) {
            unique.push(key);
        }
    });

    return unique;
};

const labelOf = (key) => SECTIONS.find((s) => s.key === key) ?? { label: key, hint: '', anchor: '' };

const currentHidden = () => {
    const stored = store.get('layout.hidden', []);
    return Array.isArray(stored) ? [...new Set(stored.filter((k) => KEYS.includes(k)))] : [];
};

const view = () => {
    const order = currentOrder();
    const hidden = currentHidden();
    const dirty = order.join(',') !== DEFAULT_ORDER.join(',');

    return `
        <div class="stack">
            <div class="card">
                <div class="card-head">
                    <div><h2>Urutan section</h2><p>Geser dengan tombol panah, lalu Save draft untuk melihatnya di Preview. Urutan live baru berubah setelah Publish.</p></div>
                    <span class="row" style="gap:6px;">
                        ${hidden.length ? `<span class="pill pill-dim">${hidden.length} disembunyikan</span>` : ''}
                        <span class="pill" data-order-state>${dirty ? 'Urutan custom' : 'Urutan bawaan'}</span>
                    </span>
                </div>

                <div class="order-list">
                    ${order.map((key, index) => {
                        const meta = labelOf(key);
                        return `
                            <div class="order-row${hidden.includes(key) ? ' is-hidden' : ''}">
                                <span class="order-num">${index + 1}</span>
                                <span class="order-meta">
                                    <strong>${esc(meta.label)}${hidden.includes(key) ? ' <em class="order-off">disembunyikan</em>' : ''}</strong>
                                    <small>${esc(meta.hint)} <code>${esc(meta.anchor)}</code></small>
                                </span>
                                <label class="switch switch-sm" title="${key === 'home' ? 'Home tidak bisa disembunyikan' : 'Tampilkan section ini'}">
                                    <input type="checkbox" data-hide="${key}" ${hidden.includes(key) ? 'checked' : ''} ${key === 'home' ? 'disabled' : ''}>
                                    <span class="switch-track"></span>
                                </label>
                                <span class="order-actions">
                                    <button class="btn btn-sm" type="button" data-move-up="layout.sections.${index}" ${index === 0 ? 'disabled' : ''} title="Naikkan">${icon('arrow-up', 13)}</button>
                                    <button class="btn btn-sm" type="button" data-move-down="layout.sections.${index}" ${index === order.length - 1 ? 'disabled' : ''} title="Turunkan">${icon('arrow-down', 13)}</button>
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="row" style="justify-content:space-between;margin-top:14px;gap:10px;flex-wrap:wrap;">
                    <span class="row" style="gap:8px;">
                        <button class="btn btn-sm btn-ghost" type="button" data-order-reset>${icon('refresh', 13)} Kembalikan urutan bawaan</button>
                        ${hidden.length ? `<button class="btn btn-sm btn-ghost" type="button" data-show-all>${icon('eye', 13)} Tampilkan semua</button>` : ''}
                    </span>
                    <span class="hint">Cover pembuka tidak ikut dipindah. Home tidak bisa disembunyikan.</span>
                </div>
            </div>

            <div class="card">
                <div class="card-head"><div><h2>Catatan</h2></div></div>
                <ul class="order-notes">
                    <li>Section dan pembatas gelombangnya berpindah bersama, jadi transisi antar bagian tetap rapi.</li>
                    <li>Menu navigasi bawah (Home, Mempelai, dst.) tetap mengarah ke section yang benar karena memakai anchor.</li>
                    <li>Matikan toggle di kanan untuk <strong>menyembunyikan</strong> section. Isinya tidak dihapus — tinggal nyalakan lagi kapan pun.</li>
                    <li>Menu navigasi yang mengarah ke section tersembunyi ikut disembunyikan otomatis.</li>
                    <li>Kalau ragu, klik <strong>Kembalikan urutan bawaan</strong> — isi konten tidak berubah.</li>
                </ul>
            </div>
        </div>
    `;
};

const mount = (root) => {
    // Konten lama belum punya layout.sections: isi bawaan tanpa membuat dirty.
    store.ensure('layout.sections', [...DEFAULT_ORDER]);
    store.ensure('layout.hidden', []);

    const paint = () => {
        root.innerHTML = view();
        bind();
    };

    const bind = () => {
        root.querySelector('[data-order-reset]')?.addEventListener('click', () => {
            store.set('layout.sections', [...DEFAULT_ORDER]);
            paint();
            ui.toast('Urutan dikembalikan ke bawaan — klik Save draft untuk menyimpan.');
        });

        root.querySelector('[data-show-all]')?.addEventListener('click', () => {
            store.set('layout.hidden', []);
            paint();
            ui.toast('Semua section ditampilkan lagi — klik Save draft untuk menyimpan.');
        });

        root.querySelectorAll('[data-hide]').forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                const key = checkbox.getAttribute('data-hide');
                const hidden = currentHidden();

                if (checkbox.checked) {
                    if (!hidden.includes(key)) hidden.push(key);
                } else {
                    const index = hidden.indexOf(key);
                    if (index >= 0) hidden.splice(index, 1);
                }

                store.set('layout.hidden', hidden);
                paint();
            });
        });
    };

    paint();
};

export const layoutPanel = () => ({
    title: 'Urutan Section',
    subtitle: 'Atur urutan bagian undangan',
    html: view(),
    mount
});