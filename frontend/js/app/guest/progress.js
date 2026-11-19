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
    let done = false;

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
     * @returns {void}
     */
    const updateBar = () => {
        if (bar) {
            bar.style.width = Math.min((loaded / total) * 100, 100).toString() + '%';
        }
    };

    /**
     * @param {string} type
     * @param {boolean} skipped
     * @returns {void}
     */
    const log = (type, skipped) => {
        (window.__undanganProgressLog = window.__undanganProgressLog || []).push(type + ':' + loaded + '/' + total + (skipped ? ':skip' : ''));

        if (info) {
            info.innerText = `Loading ${type} ${skipped ? 'dilewati' : 'complete'} ${showInformation()}`;
        }
    };

    /**
     * Selesai (normal maupun karena aset dilewati): buka undangan sekali saja.
     * @returns {void}
     */
    const finish = () => {
        if (done) {
            return;
        }

        done = true;
        valid = false;
        document.dispatchEvent(new Event('undangan.progress.done'));
    };

    /**
     * @param {string} type
     * @param {boolean} [skip=false]
     * @returns {void}
     */
    const complete = (type, skip = false) => {
        if (done || loaded >= total) {
            return;
        }

        loaded += 1;
        log(type, skip);
        updateBar();

        if (loaded >= total) {
            finish();
        }
    };

    /**
     * Aset gagal dimuat: jangan matikan undangan, hitung sebagai selesai (dilewati).
     * Satu foto 404 tidak boleh membuat tamu tidak bisa masuk sama sekali.
     *
     * @param {string} type
     * @returns {void}
     */
    const fail = (type) => {
        if (done) {
            return;
        }

        normalizeIfNeeded();

        loaded = Math.min(loaded + 1, total);
        log(type, true);
        updateBar();

        if (loaded >= total) {
            finish();
        }
    };

    /**
     * Marker fatal lama. Dipertahankan agar pemanggil lama tetap bekerja,
     * tetapi kini berperilaku sebagai "lewati", bukan mengunci halaman.
     *
     * @param {string} type
     * @returns {void}
     */
    const invalid = (type) => {
        if (done) {
            return;
        }

        console.warn(`Aset gagal dimuat: ${type} (dilewati)`);
        document.dispatchEvent(new Event('undangan.progress.invalid'));
        fail(type);
    };

    /**
     * Jaga agar counter tidak melebihi total (mis. elemen dobel dihitung dua kali).
     * @returns {void}
     */
    const normalizeIfNeeded = () => {
        if (total > 0 && loaded >= total) {
            loaded = total - 1;
        }
    };

    /**
     * Tidak ada lagi pembatalan global: satu aset gagal tidak boleh
     * membatalkan fetch aset lain (dulu invalid() me-resolve promise ini
     * sehingga satu CDN mati membuat semua gambar ikut gagal).
     *
     * @returns {null}
     */
    const getAbort = () => null;

    /**
     * Watchdog: jaringan lambat tidak boleh menahan tamu di layar loading.
     * Setelah batas waktu, sisa aset dianggap selesai dan undangan dibuka;
     * aset yang menyusul tetap tampil begitu termuat.
     *
     * @param {number} [timeout=45000]
     * @returns {void}
     */
    const watchdog = (timeout = 45000) => {
        window.setTimeout(() => {
            if (done) {
                return;
            }

            console.warn(`Watchdog: melanjutkan tanpa menunggu aset lambat (${loaded}/${total})`);
            loaded = total;
            updateBar();

            if (info) {
                info.innerText = 'Melanjutkan tanpa menunggu aset lambat...';
            }

            finish();
        }, timeout);
    };

    const init = () => {
        info = document.getElementById('progress-info');
        bar = document.getElementById('progress-bar');
        info?.classList.remove('d-none');
        watchdog();
    };

    // Hook debug ringan untuk QA (tidak mengubah perilaku).
    window.__undanganProgressState = () => ({ total, loaded, valid, done });

    return {
        init,
        add,
        invalid,
        fail,
        complete,
        getAbort,
    };
})();