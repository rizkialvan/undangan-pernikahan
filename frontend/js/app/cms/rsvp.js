import { api } from './api.js';
import { ui } from './ui.js';

const { esc, icon } = ui;

const deviceLabel = (ua) => {
    if (!ua) {
        return 'Perangkat tidak diketahui';
    }

    const browser = /Edg\//i.test(ua) ? 'Edge'
        : /OPR\/|Opera/i.test(ua) ? 'Opera'
            : /Chrome|CriOS/i.test(ua) ? 'Chrome'
                : /Firefox|FxiOS/i.test(ua) ? 'Firefox'
                    : /Safari/i.test(ua) ? 'Safari' : 'Browser';

    const os = /Android/i.test(ua) ? 'Android'
        : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
            : /Windows NT/i.test(ua) ? 'Windows'
                : /Mac OS X/i.test(ua) ? 'macOS'
                    : /Linux/i.test(ua) ? 'Linux' : 'OS';

    return `${browser} · ${os}`;
};

/**
 * Panel moderasi ucapan & RSVP (padanan fitur dashboard.html).
 */
export const rsvpPanel = (ctx) => {

    const state = {
        page: 0,
        per: 10,
        q: '',
        filter: 'all',
        items: [],
        count: 0,
        stats: null,
        me: null
    };

    const presenceBadge = (presence) => presence
        ? '<span class="badge is-green">Hadir</span>'
        : '<span class="badge is-red">Tidak hadir</span>';

    const actions = (c, isReply) => `
        <div class="cmt-actions">
            <button class="btn btn-sm" data-act="edit" data-own="${esc(c.own ?? '')}" data-uuid="${esc(c.uuid)}">
                ${icon('edit', 12)} Edit
            </button>
            ${isReply ? '' : `<button class="btn btn-sm" data-act="reply" data-uuid="${esc(c.uuid)}">${icon('edit', 12)} Balas</button>`}
            <button class="like-btn ${c.liked ? 'is-on' : ''}" data-act="like" data-uuid="${esc(c.uuid)}" data-like-own="${esc(c.like_own ?? '')}" title="${c.liked ? 'Batalkan suka' : 'Suka'}">
                ${icon('heart', 13)} <span>${Number(c.like_count ?? 0)}</span>
            </button>
            <button class="btn btn-sm btn-danger" data-act="delete" data-own="${esc(c.own ?? '')}" data-name="${esc(c.name)}">
                ${icon('trash', 12)} Hapus
            </button>
        </div>
    `;

    const replyHtml = (c) => `
        <div class="cmt-reply" data-uuid="${esc(c.uuid)}">
            <div class="cmt-head">
                <div>
                    <div class="cmt-name">${esc(c.name)} ${c.is_admin ? '<span class="badge">Mempelai</span>' : ''}</div>
                    <div class="cmt-sub">${esc(c.created_at ?? '')}</div>
                </div>
                ${presenceBadge(c.presence)}
            </div>
            <p class="cmt-body">${esc(c.comment ?? '')}</p>
            ${actions(c, true)}
        </div>
    `;

    const itemHtml = (c) => `
        <div class="cmt ${c.presence ? 'is-present' : 'is-absent'} ${c.is_admin ? 'is-admin' : ''}" data-uuid="${esc(c.uuid)}">
            <div class="cmt-head">
                <div>
                    <div class="cmt-name">${esc(c.name)} ${c.is_admin ? '<span class="badge">Mempelai</span>' : ''}</div>
                    <div class="cmt-sub">${esc(c.created_at ?? '')}</div>
                </div>
                ${presenceBadge(c.presence)}
            </div>
            <p class="cmt-body">${esc(c.comment ?? '')}</p>
            ${c.ip || c.user_agent ? `<div class="cmt-meta"><span>${icon('website', 11)} ${esc(deviceLabel(c.user_agent))}</span><span>IP ${esc(c.ip ?? '—')}</span></div>` : ''}
            ${Array.isArray(c.comments) && c.comments.length ? `<div class="cmt-replies">${c.comments.map(replyHtml).join('')}</div>` : ''}
            ${actions(c, false)}
        </div>
    `;

    const filtered = () => state.items.filter((c) => {
        if (state.filter === 'hadir') return c.presence === true;
        if (state.filter === 'tidak') return c.presence === false;
        return true;
    });

    const listHtml = () => {
        const rows = filtered();

        if (state.loading) {
            return `<div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:120px;margin-top:12px"></div>`;
        }

        if (rows.length === 0) {
            return `<div class="empty"><strong>Belum ada ucapan</strong>Ucapan dan konfirmasi kehadiran tamu akan muncul di sini.</div>`;
        }

        return rows.map(itemHtml).join('');
    };

    const pagerHtml = () => {
        const pages = Math.max(1, Math.ceil(state.count / state.per));
        const page = state.page + 1;

        return `
            <div class="pager">
                <span class="pager-info">Halaman ${page} dari ${pages} · ${state.count} ucapan${state.q ? ` cocok dengan “${esc(state.q)}”` : ''}</span>
                <div class="row" style="gap:6px;">
                    <button class="btn btn-sm" data-page="prev" ${state.page === 0 ? 'disabled' : ''}>‹ Sebelumnya</button>
                    <button class="btn btn-sm" data-page="next" ${page >= pages ? 'disabled' : ''}>Berikutnya ›</button>
                </div>
            </div>
        `;
    };

    return {
        title: 'Ucapan & RSVP',
        subtitle: 'Moderasi ucapan, kehadiran, balasan, dan like',
        html: `
            <div class="card">
                <div class="toolbar">
                    <div class="input-group" style="max-width:340px;flex:1;">
                        <input class="input" data-search placeholder="Cari nama atau isi ucapan…" value="${esc(state.q)}">
                    </div>
                    <button class="btn btn-sm" data-refresh>${icon('refresh', 13)} Muat ulang</button>
                    <button class="btn btn-sm" data-export>${icon('download', 13)} Export CSV</button>
                    <button class="btn btn-sm btn-gold" data-compose>${icon('plus', 12)} Tulis ucapan</button>
                </div>
                <div class="chips" style="margin-top:14px;">
                    <button class="chip ${state.filter === 'all' ? 'is-active' : ''}" data-filter="all">Semua <b data-stat="total">0</b></button>
                    <button class="chip ${state.filter === 'hadir' ? 'is-active' : ''}" data-filter="hadir">Hadir <b data-stat="present">0</b></button>
                    <button class="chip ${state.filter === 'tidak' ? 'is-active' : ''}" data-filter="tidak">Tidak hadir <b data-stat="absent">0</b></button>
                    <span class="chip" style="cursor:default;">${icon('heart', 13)} Like <b data-stat="likes">0</b></span>
                </div>
            </div>

            <div class="card" style="padding:18px 18px 14px;">
                <div data-list>${listHtml()}</div>
                <div data-pager>${pagerHtml()}</div>
            </div>
        `,
        mount(root) {
            const list = root.querySelector('[data-list]');
            const pager = root.querySelector('[data-pager]');
            const search = root.querySelector('[data-search]');

            const paint = () => {
                list.innerHTML = listHtml();
                pager.innerHTML = pagerHtml();
            };

            const paintStats = () => {
                const s = state.stats ?? {};
                const set = (key, value) => {
                    const el = root.querySelector(`[data-stat="${key}"]`);
                    if (el) el.textContent = String(value ?? 0);
                };

                set('total', s.comments ?? 0);
                set('present', s.present ?? 0);
                set('absent', s.absent ?? 0);
                set('likes', s.likes ?? 0);
            };

            const load = async () => {
                state.loading = true;
                paint();

                try {
                    const data = await api.comments({ per: state.per, next: state.page * state.per, q: state.q });
                    state.items = data?.lists ?? [];
                    state.count = Number(data?.count ?? 0);
                } catch (err) {
                    list.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
                    state.items = [];
                } finally {
                    state.loading = false;
                    paint();
                }
            };

            const reloadStats = async () => {
                try {
                    state.stats = await api.stats();
                    paintStats();
                } catch {
                    /* abaikan, statistik bersifat pelengkap */
                }
            };

            const refresh = async () => {
                await Promise.all([load(), reloadStats()]);
            };

            const openEdit = (uuid, reply) => {
                const found = reply
                    ? state.items.flatMap((c) => c.comments ?? []).find((c) => c.uuid === uuid)
                    : state.items.find((c) => c.uuid === uuid);

                if (!found) return;

                const d = ui.drawer({
                    title: 'Edit Ucapan',
                    subtitle: found.name,
                    body: `
                        <label class="field"><span class="label">Nama tamu</span>
                            <input class="input" data-name value="${esc(found.name)}" maxlength="40">
                        </label>
                        <label class="field"><span class="label">Kehadiran</span>
                            <select class="select" data-presence>
                                <option value="1" ${found.presence ? 'selected' : ''}>Hadir</option>
                                <option value="0" ${!found.presence ? 'selected' : ''}>Tidak hadir</option>
                            </select>
                        </label>
                        <label class="field"><span class="label">Ucapan</span>
                            <textarea class="textarea" rows="4" maxlength="1000" data-comment>${esc(found.comment ?? '')}</textarea>
                        </label>
                        <div class="hint">Perubahan langsung tampil di undangan (tanpa publish konten).</div>
                    `,
                    foot: `<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-gold" data-save>${icon('check', 14)} Simpan</button>`
                });

                d.foot.querySelector('[data-save]').addEventListener('click', async () => {
                    const name = d.body.querySelector('[data-name]').value.trim();
                    const presence = d.body.querySelector('[data-presence]').value === '1';
                    const comment = d.body.querySelector('[data-comment]').value.trim();

                    if (!name) {
                        ui.toast('Nama tidak boleh kosong', 'error');
                        return;
                    }

                    if (!comment && !found.gif_url) {
                        ui.toast('Ucapan tidak boleh kosong', 'error');
                        return;
                    }

                    try {
                        await api.updateComment(found.own, { name, presence, comment });
                        d.close();
                        ui.toast('Ucapan diperbarui');
                        refresh();
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                });
            };

            const openReply = (parentUuid, parentName) => {
                const d = ui.drawer({
                    title: 'Balas Ucapan',
                    subtitle: parentName ? `Kepada ${parentName}` : 'Tulis ucapan sebagai mempelai',
                    body: `
                        <label class="field"><span class="label">Kehadiran</span>
                            <select class="select" data-presence>
                                <option value="1" selected>Hadir</option>
                                <option value="0">Tidak hadir</option>
                            </select>
                        </label>
                        <label class="field"><span class="label">Ucapan</span>
                            <textarea class="textarea" rows="4" maxlength="1000" data-comment placeholder="Terima kasih atas doa dan restunya…"></textarea>
                        </label>
                        <div class="hint">Balasan tampil sebagai mempelai dan tidak bisa diedit tamu.</div>
                    `,
                    foot: `<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-gold" data-save>${icon('publish', 14)} Kirim</button>`
                });

                d.foot.querySelector('[data-save]').addEventListener('click', async () => {
                    const comment = d.body.querySelector('[data-comment]').value.trim();
                    const presence = d.body.querySelector('[data-presence]').value === '1';

                    if (!comment) {
                        ui.toast('Ucapan tidak boleh kosong', 'error');
                        return;
                    }

                    try {
                        await api.createComment({
                            id: parentUuid ?? null,
                            name: state.me?.name ?? 'Mempelai',
                            presence,
                            comment,
                            gif_id: null
                        });
                        d.close();
                        ui.toast(parentUuid ? 'Balasan terkirim' : 'Ucapan terkirim');
                        refresh();
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                });
            };

            root.addEventListener('click', async (e) => {
                const filterBtn = e.target.closest('[data-filter]');
                if (filterBtn) {
                    state.filter = filterBtn.getAttribute('data-filter');
                    root.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('is-active', b === filterBtn));
                    paint();
                    return;
                }

                const pageBtn = e.target.closest('[data-page]');
                if (pageBtn) {
                    const dir = pageBtn.getAttribute('data-page');
                    state.page = Math.max(0, state.page + (dir === 'next' ? 1 : -1));
                    load();
                    return;
                }

                if (e.target.closest('[data-refresh]')) {
                    ui.toast('Memuat ulang…');
                    refresh();
                    return;
                }

                if (e.target.closest('[data-export]')) {
                    try {
                        await api.exportComments();
                        ui.toast('CSV ucapan diunduh');
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                    return;
                }

                if (e.target.closest('[data-compose]')) {
                    openReply(null, null);
                    return;
                }

                const act = e.target.closest('[data-act]');
                if (!act) return;

                const kind = act.getAttribute('data-act');
                const uuid = act.getAttribute('data-uuid');

                if (kind === 'edit') {
                    openEdit(uuid, false);
                    return;
                }

                if (kind === 'reply') {
                    const parent = state.items.find((c) => c.uuid === uuid);
                    openReply(uuid, parent?.name);
                    return;
                }

                if (kind === 'delete') {
                    const own = act.getAttribute('data-own');
                    const name = act.getAttribute('data-name');

                    if (!await ui.confirm({ title: 'Hapus ucapan?', message: `Ucapan dari "${name}" beserta balasannya akan dihapus permanen.`, confirmLabel: 'Hapus', danger: true })) {
                        return;
                    }

                    try {
                        await api.deleteComment(own);
                        ui.toast('Ucapan dihapus');
                        refresh();
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                    return;
                }

                if (kind === 'like') {
                    const likeOwn = act.getAttribute('data-like-own');

                    try {
                        if (likeOwn) {
                            await api.unlikeComment(likeOwn);
                        } else {
                            await api.likeComment(uuid);
                        }

                        // muat ulang supaya jumlah & state like akurat
                        await load();
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                }
            });

            let timer = null;
            search.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    state.q = search.value.trim();
                    state.page = 0;
                    load();
                }, 320);
            });

            (async () => {
                try {
                    state.me = await api.me();
                } catch {
                    state.me = null;
                }
                refresh();
            })();
        }
    };
};