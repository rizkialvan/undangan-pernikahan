import { api } from './api.js';

const ICONS = {
    dashboard: '<path d="M3 12h7V3H3zM14 21h7v-9h-7zM14 3v6h7V3zM3 21h7v-6H3z"/>',
    couple: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    wedding: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M12 14l1.5 3 3 .5-2.2 2.1.5 3-2.8-1.5-2.8 1.5.5-3L7.5 17.5l3-.5z"/>',
    content: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    media: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    guests: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    appearance: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.6-1.4-.4-.4-.6-.9-.6-1.4 0-1.1.9-2 2-2h2.3c2.1 0 3.9-1.8 3.9-3.9C21 6.5 17 2 12 2z"/>',
    website: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    publish: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1z"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>'
};

export const ui = (() => {

    const esc = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const icon = (name, size = 15) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;

    const iconSolid = (name, size = 15) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;

    const fmtDate = (value, withTime = false) => {
        if (!value) {
            return '—';
        }

        const d = new Date(String(value).replace(' ', 'T'));

        if (Number.isNaN(d.getTime())) {
            return String(value);
        }

        return d.toLocaleString('id-ID', withTime
            ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
            : { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const fmtBytes = (bytes) => {
        const n = Number(bytes) || 0;
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
        return (n / 1024 / 1024).toFixed(1) + ' MB';
    };

    const toast = (message, type = 'success') => {
        const holder = document.getElementById('toasts');
        const node = document.createElement('div');
        node.className = `toast is-${type}`;
        node.innerHTML = `<span class="toast-dot"></span><div>${esc(message)}</div>`;
        holder.appendChild(node);

        setTimeout(() => {
            node.style.opacity = '0';
            node.style.transform = 'translateY(6px)';
            node.style.transition = 'opacity .2s ease, transform .2s ease';
            setTimeout(() => node.remove(), 220);
        }, 3600);
    };

    const confirmDialog = ({ title = 'Yakin?', message = '', confirmLabel = 'Ya, lanjutkan', danger = false }) => new Promise((resolve) => {
        const wrap = document.createElement('div');
        wrap.className = 'drawer is-open';
        wrap.innerHTML = `
            <div class="drawer-backdrop"></div>
            <div class="drawer-panel" style="width:min(420px,100%);justify-content:center;background:var(--white);border-radius:20px;height:auto;top:50%;transform:translateY(-50%);right:auto;left:50%;margin-left:-210px;">
                <div class="drawer-body" style="padding:28px;">
                    <div class="login-mark" style="width:46px;height:46px;font-size:18px;">!</div>
                    <h3 style="font-family:var(--font-display);font-size:22px;margin:0;">${esc(title)}</h3>
                    <p class="muted" style="margin:0;">${esc(message)}</p>
                    <div class="row" style="justify-content:flex-end;margin-top:8px;">
                        <button class="btn btn-ghost" data-cancel>Batal</button>
                        <button class="btn ${danger ? 'btn-danger' : 'btn-gold'}" data-ok>${esc(confirmLabel)}</button>
                    </div>
                </div>
            </div>
        `;

        const close = (value) => {
            wrap.remove();
            resolve(value);
        };

        wrap.querySelector('[data-cancel]').addEventListener('click', () => close(false));
        wrap.querySelector('[data-ok]').addEventListener('click', () => close(true));
        wrap.querySelector('.drawer-backdrop').addEventListener('click', () => close(false));
        document.body.appendChild(wrap);
    });

    /**
     * Drawer form generik.
     * @returns {{close: Function, body: HTMLElement, foot: HTMLElement}}
     */
    const drawer = ({ title, subtitle = '', body = '', foot = '', onOpen = null }) => {
        const wrap = document.getElementById('drawer');
        wrap.innerHTML = `
            <div class="drawer-backdrop" data-close></div>
            <div class="drawer-panel" role="dialog" aria-modal="true">
                <div class="drawer-head">
                    <div>
                        <h3>${esc(title)}</h3>
                        ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
                    </div>
                    <button class="icon-btn" data-close aria-label="Tutup">${icon('close')}</button>
                </div>
                <div class="drawer-body">${body}</div>
                ${foot ? `<div class="drawer-foot">${foot}</div>` : ''}
            </div>
        `;

        wrap.classList.add('is-open');

        const close = () => {
            wrap.classList.remove('is-open');
            wrap.innerHTML = '';
        };

        wrap.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));

        const onKey = (e) => {
            if (e.key === 'Escape') {
                close();
                document.removeEventListener('keydown', onKey);
            }
        };
        document.addEventListener('keydown', onKey);

        onOpen?.(wrap);

        return {
            close,
            body: wrap.querySelector('.drawer-body'),
            foot: wrap.querySelector('.drawer-foot')
        };
    };

    const field = ({ label, bind = '', value = '', type = 'text', placeholder = '', hint = '', rows = 3, max = '', min = '', autocomplete = 'off', extra = '' }) => {
        const bindAttr = bind ? ` data-bind="${esc(bind)}"` : '';
        const common = `class="input"${bindAttr} placeholder="${esc(placeholder)}" ${extra}`;

        const control = type === 'textarea'
            ? `<textarea ${common} rows="${rows}" ${max ? `maxlength="${max}"` : ''}>${esc(value)}</textarea>`
            : type === 'select'
                ? ''
                : `<input type="${type}" ${common} value="${esc(value)}" ${max ? `maxlength="${max}"` : ''} ${min ? `min="${min}"` : ''} autocomplete="${esc(autocomplete)}">`;

        return `
            <label class="field">
                <span class="label">${esc(label)}</span>
                ${control}
                ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
            </label>
        `;
    };

    const selectField = ({ label, bind, value, options = [], hint = '' }) => `
        <label class="field">
            <span class="label">${esc(label)}</span>
            <select class="select" data-bind="${esc(bind)}">
                ${options.map((opt) => `<option value="${esc(opt.value)}" ${String(opt.value) === String(value) ? 'selected' : ''}>${esc(opt.label)}</option>`).join('')}
            </select>
            ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
        </label>
    `;

    const switchField = ({ label, bind, checked = false, hint = '' }) => `
        <label class="switch">
            <input type="checkbox" ${bind ? `data-bind="${esc(bind)}"` : ''} ${checked ? 'checked' : ''}>
            <span class="switch-track"></span>
            <span class="switch-label">${esc(label)}</span>
        </label>
        ${hint ? `<div class="hint">${esc(hint)}</div>` : ''}
    `;

    const copy = async (text, message = 'Tautan disalin') => {
        try {
            await navigator.clipboard.writeText(text);
            toast(message);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                toast(message);
            } catch {
                toast('Gagal menyalin', 'error');
            }
            ta.remove();
        }
    };

    const skeletonRows = (n = 3) => Array.from({ length: n }, () => '<div class="skeleton" style="height:16px;margin:10px 0;"></div>').join('');

    /**
     * Picker media: pilih gambar/audio/video dari library atau upload baru.
     */
    const pickMedia = async ({ kind = 'image', onSelect }) => {
        let items = [];

        const renderGrid = () => {
            if (items.length === 0) {
                return '<div class="empty"><strong>Belum ada media</strong>Upload file pertama untuk mulai menggunakan galeri.</div>';
            }

            return `<div class="thumbs">${items.map((m) => `
                <div class="thumb" data-pick="${esc(m.url)}" title="${esc(m.original_name ?? m.filename)}">
                    ${m.kind === 'image'
                        ? `<img src="${esc(m.url)}" alt="${esc(m.original_name ?? '')}" loading="lazy">`
                        : `<div style="display:grid;place-items:center;height:100%;color:#8a6c3c;">${icon(m.kind === 'audio' ? 'music' : 'media', 30)}</div>`}
                    <div class="thumb-meta"><span>${esc((m.original_name ?? '').slice(0, 18) || m.kind)}</span><span>${fmtBytes(m.size)}</span></div>
                </div>
            `).join('')}</div>`;
        };

        const d = drawer({
            title: 'Pilih dari Media',
            subtitle: 'Klik file untuk memakai di konten undangan.',
            body: `
                <div class="dropzone" data-drop>
                    ${icon('upload', 22)}
                    <strong>Upload file baru</strong>
                    <span>JPG, PNG, WEBP, GIF, MP3, MP4 — maks 12 MB (foto)</span>
                    <input type="file" hidden accept="${kind === 'image' ? 'image/*' : kind === 'audio' ? 'audio/*' : '*'}" data-file>
                </div>
                <div data-grid><div class="skeleton" style="height:160px"></div></div>
            `,
            foot: '<button class="btn btn-ghost" data-close>Tutup</button>'
        });

        const grid = d.body.querySelector('[data-grid]');

        const load = async () => {
            try {
                const data = await api.media();
                items = (data?.items ?? []).filter((m) => kind === 'all' || m.kind === kind);
                grid.innerHTML = renderGrid();
            } catch (err) {
                grid.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
            }
        };

        d.body.addEventListener('click', (e) => {
            const pick = e.target.closest('[data-pick]');
            if (pick) {
                onSelect(pick.getAttribute('data-pick'));
                d.close();
            }
        });

        const input = d.body.querySelector('[data-file]');
        d.body.querySelector('[data-drop]').addEventListener('click', () => input.click());

        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) return;

            try {
                toast('Mengunggah…');
                const media = await api.upload(file);
                onSelect(media.url);
                d.close();
            } catch (err) {
                toast(err.message, 'error');
            }
        });

        await load();
    };

    return {
        esc,
        icon,
        iconSolid,
        fmtDate,
        fmtBytes,
        toast,
        confirm: confirmDialog,
        drawer,
        field,
        selectField,
        switchField,
        copy,
        skeletonRows,
        pickMedia
    };
})();