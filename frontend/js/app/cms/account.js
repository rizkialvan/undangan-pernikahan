import { api } from './api.js';
import { ui } from './ui.js';

const { esc, icon } = ui;

const FALLBACK_TZ = [
    'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Singapore',
    'Asia/Kuala_Lumpur', 'Asia/Bangkok', 'Asia/Tokyo', 'Asia/Shanghai',
    'Australia/Perth', 'Europe/London', 'Europe/Amsterdam', 'America/New_York',
    'America/Los_Angeles', 'UTC'
];

/**
 * Panel pengaturan akun (padanan tab "Setting" di dashboard.html):
 * nama, zona waktu, moderasi, tenor, password, access key, unduh data.
 */
export const accountPanel = (ctx) => {

    let me = null;
    let stats = null;

    const zones = (() => {
        try {
            return Intl.supportedValuesOf('timeZone');
        } catch {
            return FALLBACK_TZ;
        }
    })();

    const toggles = (user) => [
        ['filter', 'Filter kata kasar', 'Sensor otomatis kata tidak pantas pada ucapan.', user.is_filter],
        ['confetti_animation', 'Animasi confetti', 'Confetti saat undangan dibuka tamu.', user.is_confetti_animation],
        ['can_reply', 'Tamu boleh membalas', 'Izinkan tamu membalas ucapan tamu lain.', user.can_reply],
        ['can_edit', 'Tamu boleh mengedit', 'Tamu dapat mengubah ucapannya sendiri.', user.can_edit],
        ['can_delete', 'Tamu boleh menghapus', 'Tamu dapat menghapus ucapannya sendiri.', user.can_delete]
    ];

    const loading = () => `<div class="skeleton" style="height:220px"></div>`;

    return {
        title: 'Akun & Keamanan',
        subtitle: 'Profil admin, moderasi, dan kredensial',
        html: `
            <div data-content>${loading()}</div>
        `,
        mount(root) {
            const holder = root.querySelector('[data-content]');

            const render = () => {
                if (!me) {
                    return;
                }

                holder.innerHTML = `
                    <div class="grid grid-2">
                        <div class="stack">
                            <div class="card">
                                <div class="card-head"><div><h2>Profil Admin</h2><p>Nama ini yang tampil saat kamu membalas ucapan tamu.</p></div></div>
                                <label class="field"><span class="label">Nama tampilan</span><input class="input" data-name value="${esc(me.name ?? '')}" maxlength="40"></label>
                                <label class="field" style="margin-top:12px;"><span class="label">Email login</span><input class="input" value="${esc(me.email ?? '')}" readonly disabled></label>
                                <div class="row" style="margin-top:14px;justify-content:flex-end;">
                                    <button class="btn btn-gold" data-save-name>${icon('check', 14)} Simpan nama</button>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-head"><div><h2>Zona Waktu</h2><p>Dipakai untuk menampilkan waktu ucapan dan CSV.</p></div></div>
                                <label class="field">
                                    <span class="label">Timezone</span>
                                    <input class="input" data-tz list="tz-options" value="${esc(me.tz ?? 'Asia/Jakarta')}" autocomplete="off">
                                    <datalist id="tz-options">${zones.map((z) => `<option value="${esc(z)}"></option>`).join('')}</datalist>
                                    <span class="hint">Contoh: Asia/Jakarta (WIB), Asia/Makassar (WITA), Asia/Jayapura (WIT).</span>
                                </label>
                                <div class="row" style="margin-top:12px;justify-content:flex-end;">
                                    <button class="btn btn-gold" data-save-tz>${icon('check', 14)} Simpan zona waktu</button>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-head"><div><h2>Kredensial Undangan</h2><p>Kunci akses tamu yang tertanam di halaman undangan.</p></div></div>
                                <label class="field">
                                    <span class="label">Access key</span>
                                    <div class="input-group">
                                        <input class="input" data-key value="${esc(me.access_key ?? '')}" readonly>
                                        <button class="btn" data-copy-key>${icon('copy', 13)} Salin</button>
                                    </div>
                                    <span class="hint">Kunci ini juga dipakai untuk link personal tamu (parameter <code>k</code>).</span>
                                </label>
                                <div class="sep" style="margin:14px 0;"></div>
                                <p class="note" style="margin:0;">${icon('refresh', 12)} <strong>Rotasi kunci tidak disediakan di sini.</strong> Rotasi memutus halaman undangan (konten & komentar berhenti memuat) sampai <code>index.html</code> diperbarui dan di-rebuild — minta lewat Hermes kalau memang perlu.</p>
                            </div>
                        </div>

                        <div class="stack">
                            <div class="card">
                                <div class="card-head"><div><h2>Moderasi & Tampilan</h2><p>Berlaku untuk semua tamu.</p></div></div>
                                <div class="stack" style="gap:12px;">
                                    ${toggles(me).map(([key, label, hint, value]) => `
                                        <div>
                                            ${ui.switchField({ label, bind: '', checked: Boolean(value), hint })}
                                            <input type="hidden" data-toggle="${esc(key)}" value="${value ? '1' : '0'}">
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-head"><div><h2>Tenor GIF</h2><p>Kunci API Tenor untuk fitur GIF di ucapan.</p></div></div>
                                <label class="field"><span class="label">Tenor API key</span><input class="input" data-tenor value="${esc(me.tenor_key ?? '')}" placeholder="Kosongkan jika tidak dipakai" maxlength="100"></label>
                                <div class="row" style="margin-top:12px;justify-content:flex-end;">
                                    <button class="btn btn-gold" data-save-tenor>${icon('check', 14)} Simpan</button>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-head"><div><h2>Keamanan</h2><p>Ganti password login admin.</p></div></div>
                                <div class="grid grid-2">
                                    <label class="field"><span class="label">Password lama</span><input class="input" type="password" data-old autocomplete="current-password" minlength="8" maxlength="20"></label>
                                    <label class="field"><span class="label">Password baru</span><input class="input" type="password" data-new autocomplete="new-password" minlength="8" maxlength="20"></label>
                                </div>
                                <div class="hint">Panjang 8–20 karakter. Setelah diganti, sesi lain harus login ulang.</div>
                                <div class="row" style="margin-top:12px;justify-content:flex-end;">
                                    <button class="btn btn-gold" data-save-pass>${icon('check', 14)} Ganti password</button>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-head"><div><h2>Data</h2><p>Unduh arsip ucapan dan daftar tamu.</p></div></div>
                                <div class="kv"><span>Total ucapan</span><span>${stats?.comments ?? 0}</span></div>
                                <div class="kv"><span>Like diterima</span><span>${stats?.likes ?? 0}</span></div>
                                <div class="kv"><span>Konfirmasi hadir</span><span>${stats?.present ?? 0}</span></div>
                                <div class="kv"><span>Berhalangan</span><span>${stats?.absent ?? 0}</span></div>
                                <div class="row" style="margin-top:14px;gap:8px;">
                                    <button class="btn btn-sm" data-export-comments>${icon('download', 13)} CSV ucapan</button>
                                    <button class="btn btn-sm" data-export-guests>${icon('download', 13)} CSV tamu</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                bind();
            };

            const bind = () => {
                const q = (sel) => holder.querySelector(sel);

                // toggle moderasi: PATCH langsung
                holder.querySelectorAll('[data-toggle]').forEach((hidden) => {
                    const key = hidden.getAttribute('data-toggle');
                    const input = hidden.previousElementSibling?.querySelector('input[type="checkbox"]');
                    // struktur: <div><label class="switch">...</label><input hidden></div>
                    const checkbox = hidden.parentElement.querySelector('input[type="checkbox"]');

                    checkbox?.addEventListener('change', async () => {
                        try {
                            await api.patchUser({ [key]: checkbox.checked });
                            hidden.value = checkbox.checked ? '1' : '0';
                            ui.toast('Pengaturan disimpan');
                        } catch (err) {
                            checkbox.checked = !checkbox.checked;
                            ui.toast(err.message, 'error');
                        }
                    });
                });

                q('[data-save-name]')?.addEventListener('click', async () => {
                    const name = q('[data-name]').value.trim();
                    if (!name) {
                        ui.toast('Nama tidak boleh kosong', 'error');
                        return;
                    }

                    try {
                        await api.patchUser({ name });
                        me.name = name;
                        ui.toast('Nama diperbarui');
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                });

                q('[data-save-tz]')?.addEventListener('click', async () => {
                    const tz = q('[data-tz]').value.trim();

                    if (!zones.includes(tz)) {
                        ui.toast('Zona waktu tidak dikenali', 'error');
                        return;
                    }

                    try {
                        await api.patchUser({ tz });
                        me.tz = tz;
                        ui.toast('Zona waktu diperbarui');
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                });

                q('[data-save-tenor]')?.addEventListener('click', async () => {
                    const value = q('[data-tenor]').value.trim();

                    try {
                        await api.patchUser({ tenor_key: value.length ? value : null });
                        me.tenor_key = value;
                        ui.toast(value ? 'Tenor key disimpan' : 'Tenor key dihapus');
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                });

                q('[data-save-pass]')?.addEventListener('click', async () => {
                    const oldPassword = q('[data-old]').value;
                    const newPassword = q('[data-new]').value;

                    if (oldPassword.length < 8 || newPassword.length < 8) {
                        ui.toast('Password minimal 8 karakter', 'error');
                        return;
                    }

                    try {
                        await api.patchUser({ old_password: oldPassword, new_password: newPassword });
                        q('[data-old]').value = '';
                        q('[data-new]').value = '';
                        ui.toast('Password diganti');
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                });

                q('[data-copy-key]')?.addEventListener('click', () => ui.copy(me.access_key ?? '', 'Access key disalin'));

                q('[data-export-comments]')?.addEventListener('click', async () => {
                    try {
                        await api.exportComments();
                        ui.toast('CSV ucapan diunduh');
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                });

                q('[data-export-guests]')?.addEventListener('click', async () => {
                    try {
                        await api.exportGuests();
                        ui.toast('CSV tamu diunduh');
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                });
            };

            (async () => {
                try {
                    const [user, st] = await Promise.all([api.me(), api.stats()]);
                    me = user;
                    stats = st;
                    render();
                } catch (err) {
                    holder.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
                }
            })();
        }
    };
};