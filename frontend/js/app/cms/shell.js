import { api } from './api.js';
import { store } from './store.js';
import { ui } from './ui.js';
import { panels } from './panels.js';

const { esc, icon } = ui;

const NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', group: 'Ringkasan' },
    { key: 'couple', label: 'Profil Mempelai', icon: 'couple', group: 'Konten' },
    { key: 'wedding', label: 'Info Pernikahan', icon: 'wedding', group: 'Konten' },
    { key: 'content', label: 'Konten Undangan', icon: 'content', group: 'Konten' },
    { key: 'media', label: 'Media', icon: 'media', group: 'Konten' },
    { key: 'layout', label: 'Urutan Section', icon: 'layout', group: 'Konten' },
    { key: 'guests', label: 'Daftar Tamu', icon: 'guests', group: 'Tamu' },
    { key: 'rsvp', label: 'Ucapan & RSVP', icon: 'heart', group: 'Tamu' },
    { key: 'wa', label: 'Kirim WhatsApp', icon: 'whatsapp', group: 'Tamu' },
    { key: 'theme', label: 'Tema & Efek', icon: 'palette', group: 'Website' },
    { key: 'appearance', label: 'Tipografi & Musik', icon: 'appearance', group: 'Website' },
    { key: 'website', label: 'Publikasi', icon: 'website', group: 'Website' },
    { key: 'account', label: 'Akun & Keamanan', icon: 'logout', group: 'Website' }
];

const DEFAULTS = {
    'quotes': () => ({ text: '', source: '' }),
    'story.items': () => ({ title: '', text: '' }),
    'events.items': () => ({ name: 'Acara Baru', date_label: '', time: '', place: '', note: '' }),
    'gift.accounts': () => ({ type: 'transfer', label: 'Transfer', holder: '', bank: '', number: '', image: '', phone: '', address: '' }),
    'events.dresscode.colors': () => '#e8dcc4'
};

export const shell = (() => {

    let current = 'dashboard';
    let overview = null;
    let booted = false;

    const view = () => document.getElementById('view');
    const appRoot = () => document.getElementById('app');

    const getPath = (path) => {
        const keys = path.split('.');
        const arr = store.get(keys.slice(0, keys.length - 1).join('.'), null);
        return { keys, arr };
    };

    /* ---------- topbar ---------- */

    const updateTopbar = () => {
        const state = store.getState();
        const pill = document.getElementById('statusPill');

        if (!pill) return;

        const live = state.info.is_live;
        const dirty = state.dirty || state.info.has_changes;

        pill.className = `pill ${live ? 'is-live' : 'is-draft'}`;
        pill.innerHTML = `<span class="dot"></span>${live ? (dirty ? 'Live · ada perubahan' : 'Live') : 'Draft'}`;

        const saveBtn = document.getElementById('btnSave');
        const publishBtn = document.getElementById('btnPublish');

        if (saveBtn) {
            saveBtn.disabled = state.saving;
            saveBtn.innerHTML = `${icon('save', 14)} <span>${state.saving ? 'Menyimpan…' : 'Save draft'}</span>`;
        }

        if (publishBtn) {
            publishBtn.disabled = state.publishing;
            publishBtn.innerHTML = `${icon('publish', 14)} <span>${state.publishing ? 'Publishing…' : 'Publish'}</span>`;
        }

        const nav = document.getElementById('nav');
        if (nav) {
            nav.querySelectorAll('[data-nav]').forEach((el) => {
                const key = el.getAttribute('data-nav');
                el.classList.toggle('is-active', key === current);
                const badge = el.querySelector('[data-dot]');
                if (badge) {
                    badge.style.display = key === 'website' && dirty ? 'inline-block' : 'none';
                }
            });
        }
    };

    /* ---------- render ---------- */

    const renderNav = () => {
        const groups = [...new Set(NAV.map((n) => n.group))];
        const profile = api.user();

        document.getElementById('nav').innerHTML = groups.map((group) => `
            <div class="nav-label">${esc(group)}</div>
            ${NAV.filter((n) => n.group === group).map((n) => `
                <button class="nav-item" data-nav="${n.key}" type="button">
                    ${icon(n.icon, 17)}
                    <span>${esc(n.label)}</span>
                    <span data-dot style="display:none;margin-left:auto;width:6px;height:6px;border-radius:50%;background:var(--gold-soft);"></span>
                </button>
            `).join('')}
        `).join('');

        document.getElementById('sideUser').textContent = profile?.email ?? 'admin';
        document.getElementById('brandCouple').textContent = store.get('meta.couple_label', 'Undangan') || 'Undangan';
    };

    const render = () => {
        const panel = panels[current]?.();

        if (!panel) {
            return;
        }

        document.getElementById('pageTitle').textContent = panel.title;
        document.getElementById('pageSub').textContent = panel.subtitle ?? '';

        const root = view();
        root.innerHTML = panel.html;
        panel.mount?.(root);

        updateTopbar();
    };

    const rerender = () => render();

    /* ---------- actions ---------- */

    const save = async (silent = false) => {
        try {
            const ok = await store.save();
            if (ok && !silent) {
                ui.toast('Draft tersimpan');
            }
            return ok;
        } catch (err) {
            ui.toast(err.message, 'error');
            return false;
        }
    };

    const publish = async () => {
        if (!await ui.confirm({ title: 'Publish undangan?', message: 'Perubahan draft akan langsung tayang ke semua tamu.', confirmLabel: 'Publish sekarang' })) {
            return;
        }

        try {
            const ok = await store.publish();
            if (ok) {
                ui.toast('Undangan berhasil dipublish');
                await refreshOverview();
                render();
            }
        } catch (err) {
            ui.toast(err.message, 'error');
        }
    };

    const revert = async () => {
        if (!await ui.confirm({ title: 'Batalkan draft?', message: 'Draft akan dikembalikan ke versi yang sedang tayang.', confirmLabel: 'Batalkan draft', danger: true })) {
            return;
        }

        try {
            await store.revert();
            ui.toast('Draft dikembalikan ke versi live');
            render();
        } catch (err) {
            ui.toast(err.message, 'error');
        }
    };

    const refreshOverview = async () => {
        try {
            overview = await api.overview();
        } catch (err) {
            overview = null;
        }
        panels.setContext({ overview });
    };

    /* ---------- binding ---------- */

    const addItem = (path) => {
        const arr = store.get(path, []) ?? [];
        const factory = DEFAULTS[path] ?? (() => ({}));
        arr.push(factory());
        store.set(path, arr);
        rerender();
    };

    const removeItem = (path) => {
        const keys = path.split('.');
        const index = Number(keys.pop());
        const arr = store.get(keys.join('.'), []) ?? [];
        arr.splice(index, 1);
        store.set(keys.join('.'), arr);
        rerender();
    };

    const moveItem = (path, dir) => {
        const keys = path.split('.');
        const index = Number(keys.pop());
        const arr = store.get(keys.join('.'), []) ?? [];
        const target = index + dir;

        if (target < 0 || target >= arr.length) {
            return;
        }

        [arr[index], arr[target]] = [arr[target], arr[index]];
        store.set(keys.join('.'), arr);
        rerender();
    };

    const bindEvents = () => {
        const root = view();

        root.addEventListener('input', (e) => {
            const el = e.target.closest('[data-bind]');
            if (!el) return;

            const path = el.getAttribute('data-bind');
            const value = el.type === 'checkbox' ? el.checked : el.value;
            store.set(path, value);
        });

        root.addEventListener('change', (e) => {
            const el = e.target.closest('[data-bind]');
            if (!el) return;

            const path = el.getAttribute('data-bind');
            const value = el.type === 'checkbox' ? el.checked : el.value;
            store.set(path, value);
        });

        root.addEventListener('click', async (e) => {
            const pick = e.target.closest('[data-pick-media]');
            if (pick) {
                const path = pick.getAttribute('data-pick-media');
                const kind = pick.getAttribute('data-kind') ?? (/\.(audio|music)/i.test(path) ? 'audio' : /video/i.test(path) ? 'video' : 'image');

                ui.pickMedia({
                    kind,
                    onSelect: (url) => {
                        store.set(path, url);
                        rerender();
                    }
                });
                return;
            }

            const clear = e.target.closest('[data-clear-media]');
            if (clear) {
                store.set(clear.getAttribute('data-clear-media'), '');
                rerender();
                return;
            }

            const add = e.target.closest('[data-add-item]');
            if (add) {
                addItem(add.getAttribute('data-add-item'));
                return;
            }

            const remove = e.target.closest('[data-remove-item]');
            if (remove) {
                if (await ui.confirm({ title: 'Hapus item?', message: 'Item ini akan dihapus dari draft.', confirmLabel: 'Hapus', danger: true })) {
                    removeItem(remove.getAttribute('data-remove-item'));
                }
                return;
            }

            const up = e.target.closest('[data-move-up]');
            if (up) {
                const path = up.getAttribute('data-move-up');
                moveItem(path, -1);
                return;
            }

            const down = e.target.closest('[data-move-down]');
            if (down) {
                moveItem(down.getAttribute('data-move-down'), 1);
                return;
            }
        });
    };

    const navigate = (key) => {
        if (!panels[key]) {
            return;
        }

        current = key;
        window.location.hash = '#/' + key;
        appRoot().classList.remove('nav-open');
        render();
    };

    /* ---------- boot ---------- */

    const showLogin = () => {
        document.getElementById('boot').classList.add('d-none');
        document.getElementById('app').classList.add('d-none');
        document.getElementById('login').classList.remove('d-none');
        document.getElementById('loginEmail')?.focus();
    };

    const showApp = async () => {
        document.getElementById('boot').classList.remove('d-none');
        document.getElementById('login').classList.add('d-none');

        try {
            await Promise.all([store.load(), refreshOverview()]);
        } catch (err) {
            ui.toast(err.message, 'error');
            api.clear();
            showLogin();
            return;
        }

        if (!booted) {
            bindEvents();
            booted = true;
        }

        renderNav();
        document.getElementById('app').classList.remove('d-none');
        document.getElementById('boot').classList.add('d-none');

        const fromHash = (window.location.hash.replace('#/', '') || 'dashboard').split('?')[0];
        current = panels[fromHash] ? fromHash : 'dashboard';
        render();

        store.subscribe(() => updateTopbar());

        document.getElementById('btnSave')?.addEventListener('click', () => save());
        document.getElementById('btnPublish')?.addEventListener('click', publish);

        document.getElementById('btnPreview')?.addEventListener('click', async () => {
            try {
                window.open(await api.previewUrl(), '_blank', 'noopener');
            } catch (err) {
                ui.toast(err.message, 'error');
            }
        });

        document.getElementById('nav')?.addEventListener('click', (e) => {
            const item = e.target.closest('[data-nav]');
            if (item) navigate(item.getAttribute('data-nav'));
        });

        document.getElementById('btnLogout')?.addEventListener('click', async () => {
            if (!await ui.confirm({ title: 'Keluar?', message: 'Sesi admin di browser ini akan dihapus.', confirmLabel: 'Keluar' })) return;
            api.clear();
            store.reset();
            window.location.reload();
        });

        document.getElementById('btnMenu')?.addEventListener('click', () => appRoot().classList.toggle('nav-open'));
        window.addEventListener('hashchange', () => {
            const key = window.location.hash.replace('#/', '') || 'dashboard';
            if (panels[key] && key !== current) {
                current = key;
                render();
            }
        });

        window.addEventListener('beforeunload', (e) => {
            if (store.isDirty()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        window.addEventListener('online', () => ui.toast('Koneksi kembali'));
    };

    const init = async () => {
        panels.setContext({
            navigate: (key) => navigate(key),
            rerender,
            save,
            publish,
            revert,
            overview,
            reloadOverview: refreshOverview
        });

        api.onAuthFail(showLogin);

        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const btn = document.getElementById('loginBtn');
            const error = document.getElementById('loginError');

            error.classList.remove('is-on');
            btn.disabled = true;
            btn.textContent = 'Memeriksa…';

            try {
                await api.login(email, password);
                document.getElementById('loginForm').reset();
                await showApp();
            } catch (err) {
                error.textContent = err.message || 'Login gagal.';
                error.classList.add('is-on');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Masuk ke Studio';
            }
        });

        if (api.token()) {
            await showApp();
        } else {
            showLogin();
        }
    };

    return { init, showLogin, showApp, navigate, render, save, publish };
})();