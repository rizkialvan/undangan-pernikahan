import { video } from './video.js';
import { image } from './image.js';
import { audio } from './audio.js';
import { progress } from './progress.js';
import { util } from '../../common/util.js';
import { bs } from '../../libs/bootstrap.js';
import { loader } from '../../libs/loader.js';
import { theme } from '../../common/theme.js';
import { lang } from '../../common/language.js';
import { storage } from '../../common/storage.js';
import { session } from '../../common/session.js';
import { offline } from '../../common/offline.js';
import { comment } from '../components/comment.js';
import * as confetti from '../../libs/confetti.js';
import { pool, request, HTTP_GET } from '../../connection/request.js';
import { content } from './content.js';

export const guest = (() => {

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let information = null;

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let config = null;

    /**
     * @returns {void}
     */
    const countDownDate = () => {
        const raw = document.body.getAttribute('data-time') ?? '';
        const count = new Date(String(raw).replace(' ', 'T')).getTime();

        if (!Number.isFinite(count)) {
            document.getElementById('cms-countdown')?.classList.add('d-none');
            return;
        }

        /**
         * @param {number} num 
         * @returns {string}
         */
        const pad = (num) => num < 10 ? `0${num}` : `${num}`;

        const day = document.getElementById('day');
        const hour = document.getElementById('hour');
        const minute = document.getElementById('minute');
        const second = document.getElementById('second');

        /**
         * Acara sudah lewat: tampilkan keterangan, bukan angka 00 yang terlihat rusak.
         * @returns {void}
         */
        const showPassed = () => {
            const wrap = document.getElementById('cms-countdown');
            if (wrap) {
                wrap.innerHTML = '<p class="m-0 p-2" style="font-size:0.95rem;">Acara telah berlangsung — terima kasih atas doa dan kehadirannya.</p>';
            }
        };

        if (count - Date.now() <= 0) {
            showPassed();
            return;
        }

        const updateCountdown = () => {
            // Jangan pernah menghitung naik setelah hari H lewat.
            const distance = count - Date.now();

            if (distance <= 0) {
                showPassed();
                return;
            }

            day.textContent = pad(Math.floor(distance / (1000 * 60 * 60 * 24)));
            hour.textContent = pad(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
            minute.textContent = pad(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)));
            second.textContent = pad(Math.floor((distance % (1000 * 60)) / 1000));

            util.timeOut(updateCountdown, 1000 - (Date.now() % 1000));
        };

        util.timeOut(updateCountdown);
    };

    /**
     * @returns {void}
     */
    const showGuestName = () => {
        /**
         * Ambil nama tamu dari query string secara aman.
         * Dulu memakai split('to=') sehingga ikut menyeret &g=... &k=...
         */
        const params = new URLSearchParams(window.location.search);
        let name = params.get('to');

        if (name !== null) {
            name = name.trim();
        }

        if (!name) {
            name = null;
        }

        if (name) {
            const guestName = document.getElementById('guest-name');
            const div = document.createElement('div');
            div.classList.add('m-2');

            const template = `<small class="mt-0 mb-1 mx-0 p-0">${util.escapeHtml(guestName?.getAttribute('data-message'))}</small><p class="m-0 p-0" style="font-size: 1.25rem">${util.escapeHtml(name)}</p>`;
            util.safeInnerHTML(div, template);

            guestName?.appendChild(div);
        }

        const form = document.getElementById('form-name');
        if (form) {
            form.value = information.get('name') ?? name;
        }
    };

    /**
     * @returns {Promise<void>}
     */
    const slide = async () => {
        const interval = 6000;
        const slides = document.querySelectorAll('.slide-desktop');

        if (!slides || slides.length === 0) {
            return;
        }

        const desktopEl = document.getElementById('root')?.querySelector('.d-sm-block');
        if (!desktopEl) {
            return;
        }

        desktopEl.dispatchEvent(new Event('undangan.slide.stop'));

        if (window.getComputedStyle(desktopEl).display === 'none') {
            return;
        }

        if (slides.length === 1) {
            await util.changeOpacity(slides[0], true);
            return;
        }

        let index = 0;
        for (const [i, s] of slides.entries()) {
            if (i === index) {
                s.classList.add('slide-desktop-active');
                await util.changeOpacity(s, true);
                break;
            }
        }

        let run = true;
        const nextSlide = async () => {
            await util.changeOpacity(slides[index], false);
            slides[index].classList.remove('slide-desktop-active');

            index = (index + 1) % slides.length;

            if (run) {
                slides[index].classList.add('slide-desktop-active');
                await util.changeOpacity(slides[index], true);
            }

            return run;
        };

        desktopEl.addEventListener('undangan.slide.stop', () => {
            run = false;
        });

        const loop = async () => {
            if (await nextSlide()) {
                util.timeOut(loop, interval);
            }
        };

        util.timeOut(loop, interval);
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {void}
     */
    const open = (button) => {
        button.disabled = true;
        document.body.scrollIntoView({ behavior: 'instant' });
        document.getElementById('root').classList.remove('opacity-0');

        if (theme.isAutoMode()) {
            document.getElementById('button-theme').classList.remove('d-none');
        }

        slide();
        theme.spyTop();

        confetti.basicAnimation();
        util.timeOut(confetti.openAnimation, 1500);

        document.dispatchEvent(new Event('undangan.open'));
        util.changeOpacity(document.getElementById('welcome'), false).then((el) => el.remove());
    };

    /**
     * @param {HTMLImageElement} img
     * @returns {void}
     */
    const modal = (img) => {
        document.getElementById('button-modal-click').setAttribute('href', img.src);
        document.getElementById('button-modal-download').setAttribute('data-src', img.src);

        const i = document.getElementById('show-modal-image');
        i.src = img.src;
        i.width = img.width;
        i.height = img.height;
        bs.modal('modal-image').show();
    };

    /**
     * @returns {void}
     */
    const modalImageClick = () => {
        document.getElementById('show-modal-image').addEventListener('click', (e) => {
            const abs = e.currentTarget.parentNode.querySelector('.position-absolute');

            abs.classList.contains('d-none')
                ? abs.classList.replace('d-none', 'd-flex')
                : abs.classList.replace('d-flex', 'd-none');
        });
    };

    /**
     * @param {HTMLDivElement} div 
     * @returns {void}
     */
    const showStory = (div) => {
        if (navigator.vibrate) {
            navigator.vibrate(500);
        }

        confetti.tapTapAnimation(div, 100);
        util.changeOpacity(div, false).then((e) => e.remove());
    };

    /**
     * @returns {void}
     */
    const closeInformation = () => information.set('info', true);

    /**
     * @returns {void}
     */
    const normalizeArabicFont = () => {
        document.querySelectorAll('.font-arabic').forEach((el) => {
            el.innerHTML = String(el.innerHTML).normalize('NFC');
        });
    };

    /**
     * @returns {void}
     */
    const animateSvg = () => {
        document.querySelectorAll('svg').forEach((el) => {
            if (el.hasAttribute('data-class')) {
                util.timeOut(() => el.classList.add(el.getAttribute('data-class')), parseInt(el.getAttribute('data-time')));
            }
        });
    };

    /**
     * @returns {void}
     */
    /**
     * Hitung URL Google Calendar saat diklik (bukan saat boot) supaya tanggal
     * yang datang belakangan / fallback data-time tetap terpakai.
     *
     * @returns {string|null}
     */
    const calendarUrl = () => {
        const cms = content.data() ?? {};
        const raw = cms.settings?.date_iso ?? document.body.getAttribute('data-time') ?? '';

        const start = new Date(String(raw).replace(' ', 'T'));
        if (Number.isNaN(start.getTime())) {
            return null;
        }

        /**
         * @param {Date} d
         * @returns {string}
         */
        const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const label = cms.meta?.couple_label ?? 'Wedding Invitation';
        const venue = cms.events?.venue ?? {};

        const url = new URL('https://calendar.google.com/calendar/render');
        url.search = new URLSearchParams({
            action: 'TEMPLATE',
            text: `The Wedding of ${label}`,
            dates: `${formatDate(start)}/${formatDate(end)}`,
            details: cms.opening?.text ?? '',
            location: venue.address ?? '',
            ctz: cms.settings?.timezone ?? config.get('tz') ?? 'Asia/Jakarta',
        }).toString();

        return url.toString();
    };

    const buildGoogleCalendar = () => {
        const button = document.getElementById('button-calendar');
        if (!button) {
            return;
        }

        button.addEventListener('click', () => {
            const url = calendarUrl();

            if (!url) {
                util.notify('Tanggal acara belum diatur.').error();
                return;
            }

            window.open(url, '_blank');
        });
    };

    /**
     * @returns {object}
     */
    const loaderLibs = () => {
        progress.add();

        /**
         * @param {{aos: boolean, confetti: boolean}} opt
         * @returns {void}
         */
        const load = (opt) => {
            loader(opt)
                .then(() => progress.complete('libs'))
                .catch(() => progress.invalid('libs'));
        };

        return {
            load,
        };
    };

    /**
     * @returns {Promise<void>}
     */
    let booted = false;

    const booting = async () => {
        if (booted) {
            return;
        }

        booted = true;
        animateSvg();
        countDownDate();
        showGuestName();
        modalImageClick();
        normalizeArabicFont();
        buildGoogleCalendar();

        if (information.has('presence')) {
            document.getElementById('form-presence').value = information.get('presence') ? '1' : '2';
        }

        if (information.get('info')) {
            document.getElementById('information')?.remove();
        }

        // wait until welcome screen is show.
        await util.changeOpacity(document.getElementById('welcome'), true);

        // remove loading screen and show welcome screen.
        await util.changeOpacity(document.getElementById('loading'), false).then((el) => el.remove());
    };

    /**
     * @returns {void}
     */
    const pageLoaded = async () => {
        lang.init();
        offline.init();
        comment.init();
        progress.init();

        config = storage('config');
        information = storage('information');

        const token = document.body.getAttribute('data-key');
        const params = new URLSearchParams(window.location.search);

        // Hidrasi konten CMS sebelum media dihitung progress-nya.
        await content.load(token, params.get('preview'));

        // Link tamu personal (?g=slug): simpan id tamu untuk laporan RSVP.
        const guestSlug = params.get('g');
        if (guestSlug && token) {
            try {
                const res = await request(HTTP_GET, '/api/v2/guest?g=' + encodeURIComponent(guestSlug)).token(params.get('k') ?? token).withTimeout(6000).send();
                if (res?.data?.id) {
                    information.set('guest_id', res.data.id);
                }
            } catch (err) {
                console.warn('guest link tidak dikenali', err);
            }
        }

        const vid = video.init();
        const img = image.init();
        const aud = audio.init();
        const lib = loaderLibs();

        window.addEventListener('resize', util.debounce(slide));
        document.addEventListener('undangan.progress.done', () => booting());
        document.addEventListener('hide.bs.modal', () => document.activeElement?.blur());
        document.getElementById('button-modal-download').addEventListener('click', (e) => {
            img.download(e.currentTarget.getAttribute('data-src'));
        });

        if (!token || token.length <= 0) {
            document.getElementById('comment')?.remove();
            document.querySelector('a.nav-link[href="#comment"]')?.closest('li.nav-item')?.remove();

            vid.load();
            img.load();
            aud.load();
            lib.load({ confetti: document.body.getAttribute('data-confetti') === 'true' });
        }

        if (token && token.length > 0) {
            // add 2 progress for config and comment.
            // before img.load();
            progress.add();
            progress.add();

            // if don't have data-src.
            if (!img.hasDataSrc()) {
                img.load();
            }

            session.guest(params.get('k') ?? token).then(({ data }) => {
                document.dispatchEvent(new Event('undangan.session'));
                progress.complete('config');

                if (img.hasDataSrc()) {
                    img.load();
                }

                vid.load();
                aud.load();
                lib.load({ confetti: data.is_confetti_animation });

                comment.show()
                    .then(() => progress.complete('comment'))
                    .catch(() => progress.invalid('comment'));

            }).catch((err) => {
                // API tidak tersedia (restart, rate limit, jaringan): jangan kunci
                // tamu di layar loading — tampilkan undangan dengan konten statis.
                console.warn('config gagal dimuat, lanjut tanpa API', err);

                progress.complete('config');

                if (img.hasDataSrc()) {
                    img.load();
                }

                vid.load();
                aud.load();
                lib.load({ confetti: false });
                comment.show()
                    .catch(() => {})
                    .finally(() => progress.complete('comment'));
            });
        }
    };

    /**
     * @returns {object}
     */
    const init = () => {
        theme.init();
        session.init();

        if (session.isAdmin()) {
            storage('user').clear();
            storage('owns').clear();
            storage('likes').clear();
            storage('session').clear();
            storage('comment').clear();
        }

        window.addEventListener('load', () => {
            pool.init(pageLoaded, [
                'image',
                'video',
                'audio',
                'libs',
                'gif',
            ]);
        });

        return {
            util,
            theme,
            comment,
            guest: {
                open,
                modal,
                showStory,
                closeInformation,
            },
        };
    };

    return {
        init,
    };
})();