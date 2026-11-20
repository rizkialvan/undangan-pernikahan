import { api } from './api.js';

/**
 * State konten (draft) + sinkronisasi ke server.
 */
export const store = (() => {

    let draft = null;
    let published = null;
    let info = {
        version: 0,
        is_live: true,
        published_at: null,
        updated_at: null,
        has_changes: false
    };

    let dirty = false;
    let saving = false;
    let publishing = false;

    const listeners = new Set();

    const notify = () => listeners.forEach((fn) => fn(getState()));

    const clone = (value) => JSON.parse(JSON.stringify(value ?? {}));

    const getState = () => ({
        draft,
        published,
        info,
        dirty,
        saving,
        publishing
    });

    const get = (path, fallback = '') => {
        if (!draft) {
            return fallback;
        }

        const value = String(path).split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), draft);

        return value === undefined || value === null ? fallback : value;
    };

    const set = (path, value) => {
        if (!draft) {
            return;
        }

        const keys = String(path).split('.');
        let target = draft;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (typeof target[key] !== 'object' || target[key] === null) {
                target[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
            }
            target = target[key];
        }

        target[keys[keys.length - 1]] = value;
        dirty = true;
        notify();
    };

    /**
     * Isi nilai default tanpa menandai draft sebagai berubah.
     * Dipakai panel yang butuh struktur baru (mis. urutan section) saat
     * konten lama belum memilikinya.
     */
    const ensure = (path, value) => {
        if (!draft) {
            return;
        }

        const keys = String(path).split('.');
        let target = draft;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (typeof target[key] !== 'object' || target[key] === null) {
                target[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
            }
            target = target[key];
        }

        const last = keys[keys.length - 1];
        if (target[last] === undefined || target[last] === null) {
            target[last] = value;
            notify();
        }
    };

    const load = async () => {
        const data = await api.content();

        draft = data.draft ?? null;
        published = data.published ?? null;
        info = {
            version: data.version ?? 0,
            is_live: data.is_live ?? true,
            published_at: data.published_at ?? null,
            updated_at: data.updated_at ?? null,
            has_changes: data.has_changes ?? false
        };
        dirty = false;
        notify();

        return data;
    };

    const save = async () => {
        if (!draft || saving) {
            return false;
        }

        saving = true;
        notify();

        try {
            const data = await api.save(draft);
            published = data.published ?? published;
            info = {
                version: data.version ?? info.version,
                is_live: data.is_live ?? info.is_live,
                published_at: data.published_at ?? info.published_at,
                updated_at: data.updated_at ?? info.updated_at,
                has_changes: data.has_changes ?? true
            };
            dirty = false;

            return true;
        } finally {
            saving = false;
            notify();
        }
    };

    const publish = async () => {
        if (publishing) {
            return false;
        }

        publishing = true;
        notify();

        try {
            if (dirty) {
                await save();
            }

            const data = await api.publish();
            published = data.draft ?? draft;
            info = {
                version: data.version ?? info.version,
                is_live: data.is_live ?? true,
                published_at: data.published_at ?? info.published_at,
                updated_at: data.updated_at ?? info.updated_at,
                has_changes: false
            };

            return true;
        } finally {
            publishing = false;
            notify();
        }
    };

    const revert = async () => {
        const data = await api.revert();
        draft = data.draft ?? draft;
        info = {
            version: data.version ?? info.version,
            is_live: data.is_live ?? info.is_live,
            published_at: data.published_at ?? info.published_at,
            updated_at: data.updated_at ?? info.updated_at,
            has_changes: data.has_changes ?? false
        };
        dirty = false;
        notify();
    };

    const completeness = () => {
        if (!draft) {
            return 0;
        }

        const checks = [
            draft.couple?.bride?.name,
            draft.couple?.bride?.father,
            draft.couple?.bride?.mother,
            draft.couple?.groom?.name,
            draft.couple?.groom?.father,
            draft.couple?.groom?.mother,
            draft.couple?.bride?.photo,
            draft.couple?.groom?.photo,
            draft.settings?.date_iso,
            draft.events?.venue?.address,
            draft.events?.venue?.maps,
            draft.events?.items?.length >= 2,
            draft.story?.items?.length >= 1,
            draft.gallery?.length >= 3,
            draft.quotes?.length >= 1,
            draft.cover?.photo,
            draft.music?.src || draft.music?.enabled === false,
            draft.meta?.couple_label
        ];

        const done = checks.filter(Boolean).length;
        return Math.round((done / checks.length) * 100);
    };

    const inviteUrl = () => {
        const base = draft?.meta?.url || window.location.origin + '/';
        try {
            return new URL(base).toString();
        } catch {
            return String(base);
        }
    };

    const subscribe = (fn) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
    };

    return {
        load,
        get,
        set,
        ensure,
        save,
        publish,
        revert,
        completeness,
        inviteUrl,
        subscribe,
        getState,
        isDirty: () => dirty,
        data: () => draft,
        reset: () => {
            draft = null;
            published = null;
            dirty = false;
            info = { version: 0, is_live: true, published_at: null, updated_at: null, has_changes: false };
            notify();
        }
    };
})();