export const progress = (() => {

    /**
     * @type {HTMLElement|null}
     */
    let info = null;

    /**
     * @type {HTMLElement|null}
     */
    let bar = null;

    let total = 0;
    let loaded = 0;
    let valid = true;

    /**
     * @type {Promise<void>|null}
     */
    let cancelProgress = null;

    /**
     * @returns {void}
     */
    const add = () => {
        total += 1;
    };

    /**
     * @returns {string}
     */
    const showInformation = () => {
        return `(${loaded}/${total}) [${parseInt((loaded / total) * 100).toFixed(0)}%]`;
    };

    /**
     * @param {string} type
     * @param {boolean} [skip=false]
     * @returns {void}
     */
    const complete = (type, skip = false) => {
        if (!valid || loaded >= total) {
            return;
        }

        loaded += 1;
        (window.__undanganProgressLog = window.__undanganProgressLog || []).push(type + ':' + loaded + '/' + total);
        info.innerText = `Loading ${type} ${skip ? 'skipped' : 'complete'} ${showInformation()}`;
        bar.style.width = Math.min((loaded / total) * 100, 100).toString() + '%';

        if (loaded >= total) {
            valid = false;
            cancelProgress = null;
            document.dispatchEvent(new Event('undangan.progress.done'));
        }
    };

    /**
     * @param {string} type
     * @returns {void}
     */
    const invalid = (type) => {
        if (valid) {
            valid = false;
            bar.style.backgroundColor = 'red';
            info.innerText = `Error loading ${type} ${showInformation()}`;
            document.dispatchEvent(new Event('undangan.progress.invalid'));
        }
    };

    /**
     * @returns {Promise<void>|null}
     */
    const getAbort = () => cancelProgress;

    /**
     * Watchdog: jangan biarkan layar loading menggantung tanpa penjelasan.
     * Kalau setelah 30 detik masih belum selesai, tampilkan status gagal + klik untuk reload.
     *
     * @param {number} [timeout=30000]
     * @returns {void}
     */
    const watchdog = (timeout = 30000) => {
        window.setTimeout(() => {
            if (!valid) {
                return;
            }

            valid = false;
            bar.style.backgroundColor = 'red';
            info.classList.remove('d-none');
            info.style.cursor = 'pointer';
            info.innerText = `Gagal memuat (${loaded}/${total}). Klik di sini untuk muat ulang.`;
            info.addEventListener('click', () => window.location.reload());
            document.dispatchEvent(new Event('undangan.progress.invalid'));
        }, timeout);
    };

    const init = () => {
        info = document.getElementById('progress-info');
        bar = document.getElementById('progress-bar');
        info.classList.remove('d-none');
        cancelProgress = new Promise((res) => document.addEventListener('undangan.progress.invalid', res));
        watchdog();
    };

    // Hook debug ringan untuk QA (tidak mengubah perilaku).
    window.__undanganProgressState = () => ({ total, loaded, valid });

    return {
        init,
        add,
        invalid,
        complete,
        getAbort,
    };
})();