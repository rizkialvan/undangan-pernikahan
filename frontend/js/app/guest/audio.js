import { progress } from './progress.js';
import { util } from '../../common/util.js';
import { cache } from '../../connection/cache.js';

export const audio = (() => {

    const statePlay = '<i class="fa-solid fa-circle-pause spin-button"></i>';
    const statePause = '<i class="fa-solid fa-circle-play"></i>';

    /**
     * @param {boolean} [playOnOpen=true]
     * @returns {Promise<void>}
     */
    const load = async (playOnOpen = true) => {

        const url = document.body.getAttribute('data-audio');
        if (!url) {
            progress.complete('audio', true);
            return;
        }

        /**
         * @type {HTMLAudioElement|null}
         */
        let audioEl = null;

        // Lagu (2,3 MB) tidak lagi diunduh saat boot: itu yang menahan layar
        // loading. Audio baru diambil setelah tamu menekan "Open Invitation".
        progress.complete('audio', true);

        /**
         * @returns {Promise<HTMLAudioElement>}
         */
        const ensure = async () => {
            if (audioEl) {
                return audioEl;
            }

            audioEl = new Audio(await cache('audio').withForceCache().get(url, progress.getAbort()));
            audioEl.loop = true;
            audioEl.muted = false;
            audioEl.autoplay = false;
            audioEl.controls = false;

            const volume = document.body.getAttribute('data-audio-volume');
            const level = Number(volume);
            if (volume !== null && Number.isFinite(level) && level >= 0 && level <= 100) {
                audioEl.volume = level / 100;
            }

            return audioEl;
        };

        let isPlay = false;
        const music = document.getElementById('button-music');

        /**
         * @returns {Promise<void>}
         */
        const play = async (silent = false) => {
            if (!navigator.onLine || !music) {
                return;
            }

            music.disabled = true;
            try {
                await ensure();
                await audioEl.play();
                isPlay = true;
                music.innerHTML = statePlay;
            } catch (err) {
                // Autoplay bisa ditolak browser; tombol tetap bisa diklik manual.
                // Percobaan otomatis saat membuka undangan tidak perlu memunculkan alert.
                isPlay = false;
                if (!silent) {
                    util.notify(err).error();
                }
            } finally {
                music.disabled = false;
            }
        };

        /**
         * @returns {void}
         */
        const pause = () => {
            isPlay = false;
            if (!audioEl) {
                return;
            }
            audioEl.pause();
            music.innerHTML = statePause;
        };

        document.addEventListener('undangan.open', () => {
            music.classList.remove('d-none');

            if (playOnOpen) {
                play(true);
            }
        });

        music.addEventListener('offline', pause);
        music.addEventListener('click', () => isPlay ? pause() : play());
    };

    /**
     * @returns {object}
     */
    const init = () => {
        progress.add();

        return {
            load,
        };
    };

    return {
        init,
    };
})();