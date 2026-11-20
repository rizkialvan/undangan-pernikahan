/**
 * Urutan section undangan dari CMS.
 *
 * Section dan wave separator-nya dipindah sebagai satu blok: separator yang
 * tepat berada sebelum sebuah section ikut pindah supaya transisinya tidak
 * tertinggal di tempat lama.
 */

const BLOCKS = [
    { key: 'home', sel: '#home', label: 'Home / pembuka' },
    { key: 'bride', sel: '#bride', label: 'Mempelai' },
    { key: 'quotes', sel: '#quotes', label: 'Firman Allah' },
    { key: 'story', sel: '#story', label: 'Kisah cinta' },
    { key: 'date', sel: '#wedding-date', label: 'Tanggal & acara' },
    { key: 'gallery', sel: '#gallery', label: 'Galeri' },
    { key: 'gift', sel: '#cms-gift-section', label: 'Hadiah / rekening' },
    { key: 'comment', sel: '#comment', label: 'Ucapan & RSVP' },
    { key: 'closing', sel: '#closing', label: 'Penutup' }
];

const KEYS = BLOCKS.map((b) => b.key);

// Home adalah hero pembuka; menyembunyikannya membuat undangan kosong.
const PROTECTED = ['home'];

const normalize = (order) => {
    const list = Array.isArray(order) ? order.filter((k) => KEYS.includes(k)) : [];
    const unique = [...new Set(list)];

    KEYS.forEach((key) => {
        if (!unique.includes(key)) {
            unique.push(key);
        }
    });

    return unique;
};

export const layout = {
    defaults: [...KEYS],

    /**
     * @param {string[]} order
     * @returns {string[]} urutan yang benar-benar dipakai
     */
    apply(order, hidden = []) {
        const main = document.querySelector('#root main') ?? document.querySelector('main');

        if (!main) {
            return this.defaults;
        }

        const blocks = new Map();

        BLOCKS.forEach(({ key, sel }) => {
            const el = main.querySelector(sel);
            if (!el) {
                return;
            }

            const prev = el.previousElementSibling;
            const svg = prev && prev.classList.contains('svg-wrapper') ? prev : null;

            blocks.set(key, { el, svg });
        });

        if (blocks.size < 2) {
            return this.defaults;
        }

        const finalOrder = normalize(order);

        finalOrder.forEach((key) => {
            const block = blocks.get(key);
            if (!block) {
                return;
            }

            if (block.svg) {
                main.appendChild(block.svg);
            }

            main.appendChild(block.el);
        });

        const hiddenKeys = new Set(
            (Array.isArray(hidden) ? hidden : []).filter((k) => KEYS.includes(k) && !PROTECTED.includes(k))
        );

        blocks.forEach((block, key) => {
            const off = hiddenKeys.has(key);

            [block.el, block.svg].forEach((node) => {
                if (node) {
                    node.style.display = off ? 'none' : '';
                }
            });

            // Sembunyikan juga menu navigasi yang mengarah ke section itu.
            const id = block.el.id;
            if (id) {
                document.querySelectorAll(`a[href="#${id}"]`).forEach((link) => {
                    const item = link.closest('li') ?? link;
                    item.style.display = off ? 'none' : '';
                });
            }
        });

        return finalOrder;
    }
};