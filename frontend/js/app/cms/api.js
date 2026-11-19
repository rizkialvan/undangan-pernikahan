const TOKEN_KEY = 'undangan.cms.token';
const USER_KEY = 'undangan.cms.user';

/**
 * Wrapper API CMS. Semua endpoint admin memakai JWT (Bearer),
 * endpoint konten publik memakai access key (ditangani backend).
 */
export const api = (() => {

    let onUnauthorized = null;

    const token = () => localStorage.getItem(TOKEN_KEY) ?? '';
    const user = () => {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
        } catch {
            return null;
        }
    };

    const setSession = (value, profile = null) => {
        if (value) {
            localStorage.setItem(TOKEN_KEY, value);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }

        if (profile) {
            localStorage.setItem(USER_KEY, JSON.stringify(profile));
        }
    };

    const clear = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    };

    const onAuthFail = (fn) => {
        onUnauthorized = fn;
    };

    const headers = (extra = {}) => {
        const result = { Accept: 'application/json', ...extra };
        const t = token();

        if (t) {
            result.Authorization = 'Bearer ' + t;
        }

        return result;
    };

    const parse = async (res) => {
        let payload = null;

        try {
            payload = await res.json();
        } catch {
            payload = null;
        }

        if (!res.ok) {
            const message = Array.isArray(payload?.error) ? payload.error[0] : (payload?.error ?? `HTTP ${res.status}`);

            if (res.status === 401 || /user not active|not found/i.test(String(message))) {
                clear();
                onUnauthorized?.();
            }

            const err = new Error(String(message));
            err.status = res.status;
            err.payload = payload;
            throw err;
        }

        return payload?.data ?? null;
    };

    const request = async (method, path, options = {}) => {
        const init = {
            method,
            headers: headers(options.headers ?? {}),
            credentials: 'same-origin'
        };

        if (options.body !== undefined) {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(options.body);
        }

        if (options.form) {
            init.body = options.form;
        }

        const res = await fetch(path, init);
        return parse(res);
    };

    return {
        token,
        user,
        setSession,
        clear,
        onAuthFail,

        async login(email, password) {
            const res = await fetch('/api/session', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await parse(res);
            if (!data?.token) {
                throw new Error('Token tidak diterima dari server.');
            }

            setSession(data.token, data.user ?? { email });
            return data;
        },

        overview: () => request('GET', '/api/admin/overview'),
        content: () => request('GET', '/api/admin/content'),
        save: (content) => request('PUT', '/api/admin/content', { body: { content } }),
        publish: () => request('POST', '/api/admin/publish'),
        revert: () => request('POST', '/api/admin/revert'),
        previewToken: () => request('POST', '/api/admin/preview-token'),

        media: () => request('GET', '/api/admin/media'),
        upload: (file, onProgress = null) => new Promise((resolve, reject) => {
            const form = new FormData();
            form.append('file', file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/admin/media');
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('Authorization', 'Bearer ' + token());

            xhr.upload.onprogress = (e) => {
                if (onProgress && e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };

            xhr.onload = () => {
                let payload = null;
                try { payload = JSON.parse(xhr.responseText); } catch { payload = null; }

                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(payload?.data ?? null);
                    return;
                }

                const message = Array.isArray(payload?.error) ? payload.error[0] : (payload?.error ?? `HTTP ${xhr.status}`);
                reject(new Error(String(message)));
            };

            xhr.onerror = () => reject(new Error('Upload gagal: jaringan terputus.'));
            xhr.send(form);
        }),

        replaceMedia: (id, file) => {
            const form = new FormData();
            form.append('file', file);
            return request('PUT', '/api/admin/media/' + id, { form });
        },

        renameMedia: (id, original_name) => request('PUT', '/api/admin/media/' + id, { body: { original_name } }),
        deleteMedia: (id) => request('DELETE', '/api/admin/media/' + id),

        guests: (query = '') => request('GET', '/api/admin/guests' + (query ? '?' + query : '')),
        createGuest: (payload) => request('POST', '/api/admin/guests', { body: payload }),
        updateGuest: (id, payload) => request('PUT', '/api/admin/guests/' + id, { body: payload }),
        deleteGuest: (id) => request('DELETE', '/api/admin/guests/' + id),
        markSent: (id) => request('POST', '/api/admin/guests/' + id + '/sent'),

        // --- Moderasi ucapan & RSVP ---
        comments: ({ per = 10, next = 0, q = '' } = {}) => {
            const params = new URLSearchParams({ per: String(per), next: String(next) });
            if (q) {
                params.set('q', q);
            }
            return request('GET', '/api/v2/comment?' + params.toString());
        },

        createComment: (payload) => request('POST', '/api/comment?lang=id', { body: payload }),
        updateComment: (own, payload) => request('PUT', '/api/comment/' + own + '?lang=id', { body: payload }),
        deleteComment: (own) => request('DELETE', '/api/comment/' + own),
        likeComment: (uuid) => request('POST', '/api/comment/' + uuid),
        unlikeComment: (uuid) => request('PATCH', '/api/comment/' + uuid),

        me: () => request('GET', '/api/user'),
        patchUser: (payload) => request('PATCH', '/api/user', { body: payload }),
        stats: () => request('GET', '/api/stats'),

        async exportComments() {
            const res = await fetch('/api/download', { headers: headers() });
            if (!res.ok) {
                throw new Error('Gagal mengunduh data ucapan.');
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ucapan_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        },

        async exportGuests() {
            const res = await fetch('/api/admin/guests/export', { headers: headers() });
            if (!res.ok) {
                throw new Error('Gagal mengunduh data tamu.');
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tamu_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        },

        async previewUrl() {
            const data = await request('POST', '/api/admin/preview-token');
            const key = document.querySelector('meta[name="invitation-key"]')?.getAttribute('content') ?? '';
            const base = document.querySelector('meta[name="invitation-url"]')?.getAttribute('content') ?? '/';

            const url = new URL(base, window.location.origin);
            url.searchParams.set('preview', data.token);

            return url.toString();
        }
    };
})();