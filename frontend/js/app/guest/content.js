import { util } from '../../common/util.js';
import { request, HTTP_GET } from '../../connection/request.js';
import { ensureFontStylesheet, fontStack, googleFontsUrl, isCatalogFamily } from '../../common/fonts.js';
import { appearance } from '../../common/appearance.js';

/**
 * Hidrasi konten undangan dari CMS.
 *
 * Prinsip: kalau API gagal / belum pernah publish, markup statis di
 * index.html tetap dipakai apa adanya (fallback), jadi halaman tidak pernah
 * rusak karena CMS.
 */
export const content = (() => {

    /** @type {object|null} */
    let data = null;

    /** @type {object|null} */
    let meta = null;

    const esc = (v) => util.escapeHtml(v ?? '');

    const setText = (selector, value) => {
        if (value === null || value === undefined || value === '') {
            return;
        }

        document.querySelectorAll(selector).forEach((el) => {
            el.textContent = String(value);
        });
    };

    const setImage = (selector, value) => {
        if (!value) {
            return;
        }

        document.querySelectorAll(selector).forEach((el) => {
            el.setAttribute('data-src', String(value));
            const src = el.getAttribute('src');
            if (!src || src.length === 0) {
                el.setAttribute('src', './assets/images/placeholder.webp');
            }
        });
    };

    const applyMeta = (c) => {
        const m = c.meta ?? {};

        if (m.title) {
            document.title = m.title;
            document.querySelectorAll('meta[property="og:title"], meta[name="title"]').forEach((el) => el.setAttribute('content', m.title));
        }

        if (m.description) {
            document.querySelectorAll('meta[name="description"], meta[property="og:description"]').forEach((el) => el.setAttribute('content', m.description));
        }

        if (m.og_image) {
            document.querySelectorAll('meta[property="og:image"], meta[property="og:image:secure_url"]').forEach((el) => el.setAttribute('content', m.og_image));
        }

        if (m.url) {
            document.querySelectorAll('meta[property="og:url"]').forEach((el) => el.setAttribute('content', m.url));
            document.querySelectorAll('link[rel="canonical"]').forEach((el) => el.setAttribute('href', m.url));
        }
    };

    const applyCover = (c) => {
        const cover = c.cover ?? {};

        setText('#welcome .cover-eyebrow', cover.eyebrow);
        setImage('#welcome img[alt="background"]', cover.photo);
        setText('#welcome .cover-names', c.meta?.couple_label);

        const guest = document.getElementById('guest-name');
        if (guest && cover.guest_message) {
            guest.setAttribute('data-message', cover.guest_message);
        }
    };

    const applyHome = (c) => {
        const home = c.home ?? {};

        setText('#home .home-title', home.title);
        setImage('#home .home-photo', home.photo);
        setImage('#home .home-bg', home.background);
        setText('.home-names', c.meta?.couple_label);

        // Label tanggal diturunkan dari date_iso supaya tidak mungkin beda
        // dengan tanggal yang dipakai countdown / Google Calendar.
        const iso = c.settings?.date_iso;
        const parsed = iso ? new Date(String(iso).replace(' ', 'T')) : null;
        const dateLabel = parsed && !Number.isNaN(parsed.getTime())
            ? new Intl.DateTimeFormat('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: c.settings?.timezone || 'Asia/Jakarta',
            }).format(parsed)
            : home.date_label;

        setText('.home-date', dateLabel);

        const calendar = document.getElementById('button-calendar');
        if (calendar) {
            calendar.classList.toggle('d-none', home.calendar_enabled === false);
        }
    };

    const applyOpening = (c) => {
        const opening = c.opening ?? {};

        setText('#bride .opening-bismillah', opening.bismillah);
        setText('#bride .opening-greeting', opening.greeting);
        setText('#bride .opening-text', opening.text);
    };

    const applyCouple = (c) => {
        ['bride', 'groom'].forEach((role) => {
            const person = c.couple?.[role];
            if (!person) {
                return;
            }

            setImage(`[data-person="${role}"] img`, person.photo);
            setText(`[data-person="${role}"] .person-name`, person.name);
            setText(`[data-person="${role}"] .person-order`, person.order);
            setText(`[data-person="${role}"] .person-father`, person.father);
            setText(`[data-person="${role}"] .person-mother`, person.mother);

            const img = document.querySelector(`[data-person="${role}"] img`);
            if (img && person.name) {
                img.setAttribute('alt', person.name);
            }

            const desc = document.querySelector(`[data-person="${role}"] .person-desc`);
            if (desc) {
                desc.textContent = person.description ?? '';
                desc.classList.toggle('d-none', !person.description);
            }
        });
    };

    const applyQuotes = (c) => {
        const wrap = document.getElementById('cms-quotes');
        if (!wrap) {
            return;
        }

        const quotes = Array.isArray(c.quotes) ? c.quotes : [];
        if (quotes.length === 0) {
            return;
        }

        const html = quotes.map((q) => `
            <div class="bg-theme-auto mt-4 p-3 shadow rounded-4" data-aos="fade-down" data-aos-duration="2000">
                <p class="p-1 mb-2" style="font-size: 0.95rem;">${esc(q.text)}</p>
                <p class="m-0 p-0 text-theme-auto" style="font-size: 0.95rem;">${esc(q.source)}</p>
            </div>
        `).join('');

        util.safeInnerHTML(wrap, html);
    };

    const applyStory = (c) => {
        const story = c.story ?? {};

        const videoWrap = document.getElementById('video-love-stroy');
        if (videoWrap) {
            if (story.video) {
                videoWrap.setAttribute('data-src', story.video);
            } else {
                videoWrap.remove();
            }
        }

        const list = document.getElementById('cms-story');
        if (!list) {
            return;
        }

        const items = Array.isArray(story.items) ? story.items : [];
        if (items.length === 0) {
            return;
        }

        const html = items.map((item, i) => `
            <div class="row">
                <div class="col-auto position-relative">
                    <p class="position-relative d-flex justify-content-center align-items-center bg-theme-auto border border-secondary border-2 opacity-100 rounded-circle m-0 p-0 z-1" style="width: 2rem; height: 2rem;">${i + 1}</p>
                    <hr class="position-absolute top-0 start-50 translate-middle-x border border-secondary h-100 z-0 opacity-100 m-0 rounded-4 shadow-none">
                </div>
                <div class="col mt-1 mb-3 ps-0">
                    <p class="fw-bold mb-2">${esc(item.title)}</p>
                    <p class="small mb-0" style="white-space: pre-line;">${esc(item.text)}</p>
                </div>
            </div>
        `).join('');

        util.safeInnerHTML(list, html);
    };

    const applyEvents = (c) => {
        const events = c.events ?? {};

        setText('#wedding-date .events-title', events.title);

        const list = document.getElementById('cms-events');
        if (list) {
            const items = Array.isArray(events.items) ? events.items : [];
            if (items.length > 0) {
                const html = items.map((item, i) => `
                    <div class="py-2" data-aos="${i % 2 === 0 ? 'fade-right' : 'fade-left'}" data-aos-duration="1500">
                        <h2 class="font-esthetic m-0 py-2" style="font-size: 2rem;">${esc(item.name)}</h2>
                        ${item.date_label ? `<p class="m-0" style="font-size: 1rem;">${esc(item.date_label)}</p>` : ''}
                        <p class="m-0" style="font-size: 0.95rem;">${esc(item.time)}</p>
                        ${item.place ? `<p class="mb-0" style="font-size: 0.9rem;">${esc(item.place)}</p>` : ''}
                        ${item.note ? `<p class="mb-0 text-theme-auto" style="font-size: 0.85rem;">${esc(item.note)}</p>` : ''}
                    </div>
                `).join('');
                util.safeInnerHTML(list, html);
            }
        }

        const dress = events.dresscode ?? {};
        setText('#wedding-date .dresscode-text', dress.text);

        const colors = document.getElementById('cms-dresscode');
        if (colors && Array.isArray(dress.colors) && dress.colors.length > 0) {
            const html = dress.colors.map((color) => `
                <div class="shadow rounded-circle border border-secondary" style="width: 3rem; height: 3rem; background-color: ${esc(color)};"></div>
            `).join('');
            util.safeInnerHTML(colors, html);
        }

        const venue = events.venue ?? {};
        setText('#wedding-date .venue-address', venue.address);

        document.querySelectorAll('#wedding-date .venue-maps').forEach((a) => {
            if (venue.maps) {
                a.setAttribute('href', venue.maps);
            }
        });
    };

    const applyGallery = (c) => {
        const items = Array.isArray(c.gallery) ? c.gallery : [];
        if (items.length === 0) {
            return;
        }

        const half = Math.ceil(items.length / 2);
        const halves = [items.slice(0, half), items.slice(half)];
        const ids = ['carousel-image-one', 'carousel-image-two'];

        ids.forEach((id, index) => {
            const carousel = document.getElementById(id);
            if (!carousel) {
                return;
            }

            const list = halves[index] ?? [];
            if (list.length === 0) {
                carousel.remove();
                return;
            }

            const indicators = carousel.querySelector('.carousel-indicators');
            const inner = carousel.querySelector('.carousel-inner');

            if (indicators) {
                const html = list.map((_, i) => `
                    <button type="button" data-bs-target="#${id}" data-bs-slide-to="${i}" class="${i === 0 ? 'active' : ''}" ${i === 0 ? 'aria-current="true"' : ''} aria-label="Slide ${i + 1}"></button>
                `).join('');
                util.safeInnerHTML(indicators, html);
            }

            if (inner) {
                const html = list.map((g, i) => `
                    <div class="carousel-item ${i === 0 ? 'active' : ''}">
                        <img src="./assets/images/placeholder.webp" data-src="${esc(g.src)}" alt="${esc(g.alt)}" class="d-block w-100 img-gallery cursor-pointer" onclick="undangan.guest.modal(this)">
                    </div>
                `).join('');
                util.safeInnerHTML(inner, html);
            }
        });
    };

    const applyGift = (c) => {
        const gift = c.gift ?? {};
        const section = document.getElementById('cms-gift-section');

        if (!section) {
            return;
        }

        if (gift.enabled === false) {
            section.remove();
            return;
        }

        setText('#cms-gift-section .gift-intro', gift.intro);

        const container = section.querySelector('.container');
        if (!container) {
            return;
        }

        container.querySelectorAll('.bg-theme-auto').forEach((el) => el.remove());

        const icons = {
            transfer: 'fa-money-bill-transfer',
            qris: 'fa-qrcode',
            gift: 'fa-gift'
        };

        const html = (Array.isArray(gift.accounts) ? gift.accounts : []).map((acc, i) => {
            const icon = icons[acc.type] ?? icons.transfer;
            const holder = acc.holder ? `<i class="fa-regular fa-user fa-sm me-1"></i>${esc(acc.holder)}` : '';

            let detail = '';

            if (acc.type === 'transfer') {
                detail = `
                    <p class="m-0" style="font-size: 0.9rem;"><i class="fa-solid fa-building-columns me-1"></i>${esc(acc.bank)}</p>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <p class="m-0 p-0" style="font-size: 0.85rem;"><i class="fa-solid fa-credit-card me-1"></i>${esc(acc.number)}</p>
                        <button class="btn btn-outline-auto btn-sm shadow-sm rounded-4 py-0" style="font-size: 0.75rem;" data-copy="${esc(acc.number)}" onclick="undangan.util.copy(this)"><i class="fa-solid fa-copy"></i></button>
                    </div>
                `;
            }

            if (acc.type === 'qris') {
                detail = acc.image ? `
                    <div class="d-flex justify-content-center align-items-center">
                        <img src="./assets/images/placeholder.webp" data-src="${esc(acc.image)}" alt="donate" class="img-fluid rounded-3 mx-auto bg-white">
                    </div>
                ` : '';
            }

            if (acc.type === 'gift') {
                detail = `
                    ${acc.phone ? `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <p class="m-0 p-0" style="font-size: 0.85rem;"><i class="fa-solid fa-phone-volume me-1"></i>${esc(acc.phone)}</p>
                        <button class="btn btn-outline-auto btn-sm shadow-sm rounded-4 py-0" style="font-size: 0.75rem;" data-copy="${esc(acc.phone)}" onclick="undangan.util.copy(this)"><i class="fa-solid fa-copy"></i></button>
                    </div>` : ''}
                    ${acc.address ? `
                    <div class="d-flex justify-content-between align-items-center">
                        <p class="my-0 p-0 text-truncate me-2" style="font-size: 0.85rem;"><i class="fa-solid fa-location-dot me-1"></i>${esc(acc.address)}</p>
                        <button class="btn btn-outline-auto btn-sm shadow-sm rounded-4 py-0" style="font-size: 0.75rem;" data-copy="${esc(acc.address)}" onclick="undangan.util.copy(this)"><i class="fa-solid fa-copy"></i></button>
                    </div>` : ''}
                `;
            }

            return `
                <div class="bg-theme-auto rounded-4 shadow p-3 mx-4 mt-4 text-start" data-aos="fade-up" data-aos-duration="2500">
                    <i class="fa-solid ${icon} fa-lg"></i>
                    <p class="d-inline">${esc(acc.label)}</p>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <p class="m-0 p-0" style="font-size: 0.95rem;">${holder}</p>
                        <button class="btn btn-outline-auto btn-sm shadow-sm rounded-4 py-0" style="font-size: 0.75rem;" data-bs-toggle="collapse" data-bs-target="#collapseGift${i}"><i class="fa-solid fa-circle-info fa-sm me-1"></i>Info</button>
                    </div>
                    <div class="collapse" id="collapseGift${i}">
                        <hr class="my-2 py-1">
                        ${detail}
                    </div>
                </div>
            `;
        }).join('');

        if (html !== '') {
            container.insertAdjacentHTML('beforeend', html);
        }
    };

    const applyClosing = (c) => {
        const closing = c.closing ?? {};

        setText('.closing-thanks', closing.thanks);
        setText('.closing-greeting', closing.greeting);
        setText('.closing-doa', closing.doa);
        setText('.closing-credit', closing.credit);
    };

    const applyMusic = (c) => {
        const music = c.music ?? {};

        if (music.enabled === false || !music.src) {
            document.body.removeAttribute('data-audio');
            document.body.removeAttribute('data-audio-volume');
            return;
        }

        document.body.setAttribute('data-audio', music.src);

        // Volume diatur admin lewat CMS (0-100). Di luar rentang -> biarkan default player.
        const volume = Number(music.volume);

        if (Number.isFinite(volume) && volume >= 0 && volume <= 100) {
            document.body.setAttribute('data-audio-volume', String(Math.round(volume)));
        } else {
            document.body.removeAttribute('data-audio-volume');
        }
    };

    /**
     * Pasang font pilihan admin. Font katalog sudah self-hosted; nama font di
     * luar katalog memakai Google Fonts seperti sebelumnya.
     */
    const applyFontFamily = (family, cssVariable) => {
        const name = String(family ?? '').replace(/["'\\]/g, '').trim();

        if (name === '' || !document.documentElement) {
            return;
        }

        document.documentElement.style.setProperty(cssVariable, fontStack(name));

        if (isCatalogFamily(name)) {
            ensureFontStylesheet();
            return;
        }

        // Fallback: font kustom di luar katalog -> muat dari Google Fonts.
        const linkId = cssVariable === '--cms-font-body' ? 'cms-font-body' : 'cms-font';
        let link = document.getElementById(linkId);

        if (!link) {
            link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }

        link.href = googleFontsUrl(name);
    };

    const applyTheme = (c) => {
        const theme = c.theme ?? {};

        if (theme.mode && ['auto', 'light', 'dark'].includes(theme.mode)) {
            document.documentElement.setAttribute('data-bs-theme', theme.mode);
        }

        const displayFont = String(theme.font ?? '').trim();
        const bodyFont = String(theme.font_body ?? '').trim();

        applyFontFamily(displayFont, '--cms-font-display');
        applyFontFamily(bodyFont, '--cms-font-body');

        // Token warna, palet, gerak, dan efek dipasang oleh modul appearance.
        appearance.apply(theme);

        if (displayFont || bodyFont) {
            ensureThemeStyle(displayFont, bodyFont);
        }

    };

    const applySettings = (c) => {
        const settings = c.settings ?? {};

        if (settings.date_iso) {
            // 'YYYY-MM-DD HH:mm:ss+07:00' tidak diparse konsisten di semua browser
            // (Safari menolak format non-ISO) -> normalisasi ke 'T'.
            const date = new Date(String(settings.date_iso).replace(' ', 'T'));

            if (!Number.isNaN(date.getTime())) {
                const pad = (n) => String(n).padStart(2, '0');
                const value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
                document.body.setAttribute('data-time', value);
            }
        }

        if (settings.countdown === false) {
            document.getElementById('cms-countdown')?.classList.add('d-none');
        }
    };


    /**
     * Aturan kecil untuk warna aksen & font pilihan admin.
     * Ditulis sebagai <style> supaya tidak perlu build ulang CSS.
     */
    const ensureThemeStyle = (font, bodyFont) => {
        let style = document.getElementById('cms-theme-style');

        if (!style) {
            style = document.createElement('style');
            style.id = 'cms-theme-style';
            document.head.appendChild(style);
        }

        const rules = [];

        if (font) {
            rules.push(`
                .font-esthetic, .home-title, .cover-names { font-family: ${fontStack(font)} !important; }
            `);
        }

        if (bodyFont) {
            // Font isi: berlaku untuk teks umum, tapi tidak menimpa judul
            // (.font-esthetic) maupun tulisan arab (.arabic).
            rules.push(`
                body, p, .lead, .btn, .form-control { font-family: ${fontStack(bodyFont, 'sans-serif')} !important; }
            `);
        }

        style.textContent = rules.join('\n');
    };

    const apply = (c) => {
        if (!c || typeof c !== 'object') {
            return;
        }

        data = c;

        try {
            applyMeta(c);
            applyCover(c);
            applyHome(c);
            applyOpening(c);
            applyCouple(c);
            applyQuotes(c);
            applyStory(c);
            applyEvents(c);
            applyGallery(c);
            applyGift(c);
            applyClosing(c);
            applyMusic(c);
            applyTheme(c);
            applySettings(c);

            document.dispatchEvent(new Event('undangan.content.applied'));
        } catch (err) {
            console.error('content apply failed', err);
        }
    };

    const load = async (token, preview = null) => {
        if (!token) {
            return null;
        }

        let path = '/api/v2/content';
        if (preview) {
            path += '?preview=' + encodeURIComponent(preview);
        }

        try {
            const res = await request(HTTP_GET, path).token(token).withTimeout(8000).send();
            meta = res?.data ?? null;

            if (meta?.content) {
                apply(meta.content);
                return meta;
            }
        } catch (err) {
            console.warn('content load failed, memakai markup statis', err);
        }

        return null;
    };

    return {
        load,
        apply,
        data: () => data,
        meta: () => meta,
    };
})();