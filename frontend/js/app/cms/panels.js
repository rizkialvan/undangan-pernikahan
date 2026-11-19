import { api } from './api.js';
import { store } from './store.js';
import { ui } from './ui.js';
import { rsvpPanel } from './rsvp.js';
import { accountPanel } from './account.js';
import { FONT_CATEGORIES, ensureFontStylesheet, filterFonts, fontStack } from '../../common/fonts.js';

const { esc, icon } = ui;

/* ---------- helper tanggal + zona waktu ---------- */

const tzOffsetMinutes = (date, tz) => {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz, hour12: false,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {});

        const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
        return Math.round((asUtc - date.getTime()) / 60000);
    } catch {
        return 420;
    }
};

const offsetString = (minutes) => {
    const sign = minutes < 0 ? '-' : '+';
    const abs = Math.abs(minutes);
    return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
};

const toInputValue = (iso, tz) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const offset = tzOffsetMinutes(date, tz);
    return new Date(date.getTime() + offset * 60000).toISOString().slice(0, 16);
};

const fromInputValue = (value, tz) => {
    if (!value) return '';
    const asUtc = new Date(value + ':00Z');
    if (Number.isNaN(asUtc.getTime())) return '';
    const offset = tzOffsetMinutes(asUtc, tz);
    const dot = value.replace('T', ' ');
    return `${dot}:00${offsetString(offset)}`;
};

const daysUntil = (iso) => {
    const target = new Date(iso).getTime();
    if (Number.isNaN(target)) return 0;
    return Math.max(0, Math.ceil((target - Date.now()) / 86400000));
};

/* ---------- komponen kecil ---------- */

const photoField = (label, path, value, hint = '') => `
    <div class="field">
        <span class="label">${esc(label)}</span>
        <div class="row" style="gap:12px;align-items:center;">
            <div class="thumb" style="width:84px;height:84px;aspect-ratio:1;flex:0 0 auto;cursor:default;">
                <img src="${esc(value || './assets/images/placeholder.webp')}" alt="" onerror="this.style.opacity=.15">
            </div>
            <div class="stack" style="gap:6px;flex:1;">
                <input class="input" data-bind="${esc(path)}" value="${esc(value)}" placeholder="/api/media?f=...">
                <div class="row" style="gap:6px;">
                    <button class="btn btn-sm" type="button" data-pick-media="${esc(path)}">${icon('image', 13)} Pilih media</button>
                    <button class="btn btn-sm btn-ghost" type="button" data-clear-media="${esc(path)}">Kosongkan</button>
                </div>
            </div>
        </div>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
    </div>
`;

const listHead = (index, title, list, i) => `
    <div class="list-item-head">
        <div class="row" style="gap:10px;">
            <span class="list-index">${index + 1}</span>
            <strong style="font-size:13px;">${esc(title)}</strong>
        </div>
        <div class="row" style="gap:2px;">
            <button class="icon-btn" type="button" data-move-up="${esc(list)}.${i}" title="Naik">↑</button>
            <button class="icon-btn" type="button" data-move-down="${esc(list)}.${i}" title="Turun">↓</button>
            <button class="icon-btn" type="button" data-remove-item="${esc(list)}.${i}" title="Hapus">${icon('trash', 14)}</button>
        </div>
    </div>
`;

/* ---------- panel ---------- */

export const panels = (() => {

    const ctxRef = { navigate: () => {}, rerender: () => {}, overview: null, reloadOverview: async () => {} };

    const setContext = (ctx) => Object.assign(ctxRef, ctx);

    const dashboard = () => {
        const o = ctxRef.overview;
        const draft = store.data() ?? {};
        const pct = store.completeness();

        if (!o) {
            return { title: 'Dashboard', subtitle: 'Ringkasan undangan', html: `<div class="skeleton" style="height:180px"></div>`, mount: () => {} };
        }

        const presence = o.presence ?? { present: 0, absent: 0, total: 0 };
        const dateIso = draft.settings?.date_iso;

        const recent = (o.recent ?? []).map((r) => `
            <div class="kv">
                <span>${esc(r.name)} ${r.presence ? '<span class="badge is-green">Hadir</span>' : '<span class="badge is-red">Tidak hadir</span>'}</span>
                <span class="muted tiny">${esc(String(r.comment ?? '').slice(0, 42))}</span>
            </div>
        `).join('') || '<div class="empty" style="padding:22px">Belum ada ucapan masuk.</div>';

        const html = `
            <div class="hero">
                <div class="hero-body">
                    <p class="hero-eyebrow">Undangan Pernikahan</p>
                    <h2>${esc(draft.meta?.couple_label ?? 'Dinda & Jose')}</h2>
                    <div class="hero-meta">
                        <span>${ui.icon('wedding', 14)} ${esc(draft.home?.date_label ?? 'Tanggal belum diatur')}</span>
                        <span class="muted tiny">versi ${o.content?.version ?? 1} · ${ui.fmtDate(o.content?.published_at)}</span>
                    </div>
                ${dateIso ? `<div class="hero-count">
                    <div><strong>${daysUntil(dateIso)}</strong><span>${daysUntil(dateIso) > 0 ? 'Hari lagi' : 'Hari-H'}</span></div>
                    <div><strong>${(draft.gallery ?? []).length}</strong><span>Foto</span></div>
                    <div><strong>${(draft.story?.items ?? []).length}</strong><span>Cerita</span></div>
                        <div><strong>${(draft.events?.items ?? []).length}</strong><span>Acara</span></div>
                    </div>` : ''}
                </div>
                ${draft.cover?.photo ? `<div class="hero-photo"><img src="${esc(draft.cover.photo)}" alt="" loading="lazy"></div>` : ''}
            </div>

            <div class="grid grid-4" style="margin-bottom:18px;">
                <div class="stat is-gold"><span class="stat-dot"></span><div class="stat-label">Total Tamu</div><div class="stat-value">${o.guests ?? 0}</div><div class="stat-foot">daftar undangan personal</div></div>
                <div class="stat"><div class="stat-label">RSVP Masuk</div><div class="stat-value">${presence.total}</div><div class="stat-foot">ucapan & doa</div></div>
                <div class="stat"><div class="stat-label">Hadir</div><div class="stat-value">${presence.present}</div><div class="stat-foot">konfirmasi datang</div></div>
                <div class="stat"><div class="stat-label">Tidak Hadir</div><div class="stat-value">${presence.absent}</div><div class="stat-foot">berhalangan</div></div>
            </div>

            <div class="grid grid-2">
                <div class="card">
                    <div class="card-head"><div><h2>Kelengkapan Undangan</h2><p>Field penting yang masih kosong akan menurunkan skor ini.</p></div><span class="badge">${pct}%</span></div>
                    <div class="completeness"><i style="width:${pct}%"></i></div>
                    <div class="sep" style="margin:14px 0;"></div>
                    <div class="quick">
                        <div class="quick-item" data-go="couple"><div class="quick-ico">${icon('couple')}</div><div><strong>Profil Mempelai</strong><span>Nama, orang tua, foto</span></div></div>
                        <div class="quick-item" data-go="wedding"><div class="quick-ico">${icon('wedding')}</div><div><strong>Info Pernikahan</strong><span>Tanggal, akad, resepsi</span></div></div>
                        <div class="quick-item" data-go="guests"><div class="quick-ico">${icon('guests')}</div><div><strong>Daftar Tamu</strong><span>Link personal & RSVP</span></div></div>
                        <div class="quick-item" data-go="rsvp"><div class="quick-ico">${icon('heart')}</div><div><strong>Ucapan & RSVP</strong><span>Moderasi & balas tamu</span></div></div>
                        <div class="quick-item" data-go="website"><div class="quick-ico">${icon('website')}</div><div><strong>Publish</strong><span>Status & URL undangan</span></div></div>
                        <div class="quick-item" data-go="account"><div class="quick-ico">${icon('guests')}</div><div><strong>Akun & Keamanan</strong><span>Profil, password, data</span></div></div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-head"><div><h2>Ucapan Terbaru</h2><p>Lima RSVP terakhir dari tamu.</p></div><button class="btn btn-sm btn-ghost" data-go="guests">Lihat tamu</button></div>
                    ${recent}
                </div>
            </div>

            <div class="card card-soft">
                <div class="card-head"><div><h2>Status Website</h2><p>Ringkasan publikasi undangan.</p></div>
                    <span class="pill ${o.content?.is_live ? 'is-live' : 'is-draft'}"><span class="dot"></span>${o.content?.is_live ? 'Live' : 'Draft'}</span>
                </div>
                <div class="kv"><span>Versi terpublish</span><span>${o.content?.version ?? 1}</span></div>
                <div class="kv"><span>Terakhir publish</span><span>${ui.fmtDate(o.content?.published_at, true)}</span></div>
                <div class="kv"><span>Perubahan belum publish</span><span>${o.content?.has_changes ? 'Ada' : 'Tidak ada'}</span></div>
                <div class="kv"><span>Media tersimpan</span><span>${o.media ?? 0} file</span></div>
                <div class="kv"><span>Like ucapan</span><span>${o.likes ?? 0}</span></div>
            </div>
        `;

        return {
            title: 'Dashboard',
            subtitle: 'Ringkasan dan akses cepat',
            html,
            mount(root) {
                root.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => ctxRef.navigate(el.getAttribute('data-go'))));
            }
        };
    };

    const couple = () => {
        const person = (role, title, descendant) => {
            const p = `couple.${role}`;
            const data = store.get(p, {}) ?? {};
            return `
                <div class="card">
                    <div class="card-head"><div><h2>${esc(title)}</h2><p>${esc(descendant)}</p></div><span class="badge">${role === 'bride' ? 'Mempelai Wanita' : 'Mempelai Pria'}</span></div>
                    ${photoField('Foto profil', `${p}.photo`, data.photo ?? '', 'Rasio 1:1, minimal 800×800 px.')}
                    <div class="grid grid-2" style="margin-top:14px;">
                        <label class="field"><span class="label">Nama lengkap</span><input class="input" data-bind="${p}.name" value="${esc(data.name ?? '')}" maxlength="60"></label>
                        <label class="field"><span class="label">Urutan / panggilan</span><input class="input" data-bind="${p}.order" value="${esc(data.order ?? '')}" maxlength="40" placeholder="Putri ke-1"></label>
                        <label class="field"><span class="label">Nama ayah</span><input class="input" data-bind="${p}.father" value="${esc(data.father ?? '')}" maxlength="80"></label>
                        <label class="field"><span class="label">Nama ibu</span><input class="input" data-bind="${p}.mother" value="${esc(data.mother ?? '')}" maxlength="80"></label>
                    </div>
                    <label class="field" style="margin-top:14px;"><span class="label">Deskripsi singkat</span><textarea class="textarea" rows="3" maxlength="400" data-bind="${p}.description">${esc(data.description ?? '')}</textarea></label>
                </div>
            `;
        };

        return {
            title: 'Profil Mempelai',
            subtitle: 'Nama, orang tua, foto, dan deskripsi',
            html: `
                <div class="grid grid-2">
                    ${person('bride', store.get('couple.bride.name', 'Mempelai Wanita'), 'Putri dari')}
                    ${person('groom', store.get('couple.groom.name', 'Mempelai Pria'), 'Putra dari')}
                </div>
                <div class="card card-soft">
                    <div class="card-head"><div><h2>Label Pasangan</h2><p>Dipakai di cover, judul, dan kalender.</p></div></div>
                    <label class="field" style="max-width:420px;"><span class="label">Nama pasangan</span><input class="input" data-bind="meta.couple_label" value="${esc(store.get('meta.couple_label', ''))}" maxlength="80" placeholder="Dinda & Jose"></label>
                </div>
            `,
            mount: () => {}
        };
    };

    const wedding = () => {
        const tz = store.get('settings.timezone', 'Asia/Jakarta');
        const iso = store.get('settings.date_iso', '');
        const inputValue = toInputValue(iso, tz);
        const events = store.get('events.items', []) ?? [];
        const venue = store.get('events.venue', {}) ?? {};
        const dress = store.get('events.dresscode', {}) ?? {};

        const eventItems = events.map((ev, i) => `
            <div class="list-item">
                ${listHead(i, ev.name || 'Acara', 'events.items', i)}
                <div class="grid grid-2">
                    <label class="field"><span class="label">Nama acara</span><input class="input" data-bind="events.items.${i}.name" value="${esc(ev.name ?? '')}" maxlength="60"></label>
                    <label class="field"><span class="label">Tanggal</span><input class="input" data-bind="events.items.${i}.date_label" value="${esc(ev.date_label ?? '')}" maxlength="80" placeholder="Sabtu, 12 Juni 2027"></label>
                    <label class="field"><span class="label">Waktu</span><input class="input" data-bind="events.items.${i}.time" value="${esc(ev.time ?? '')}" maxlength="80" placeholder="08.00 - 10.00 WIB"></label>
                    <label class="field"><span class="label">Lokasi / ruang</span><input class="input" data-bind="events.items.${i}.place" value="${esc(ev.place ?? '')}" maxlength="200"></label>
                </div>
                <label class="field" style="margin-top:12px;"><span class="label">Catatan tambahan</span><input class="input" data-bind="events.items.${i}.note" value="${esc(ev.note ?? '')}" maxlength="300" placeholder="Contoh: dilanjutkan ramah tamah"></label>
            </div>
        `).join('');

        const colors = (dress.colors ?? []).map((color, i) => `
            <div class="row" style="gap:6px;">
                <input type="color" class="color-input" data-bind="events.dresscode.colors.${i}" value="${esc(color)}">
                <button class="icon-btn" type="button" data-remove-item="events.dresscode.colors.${i}">${icon('trash', 13)}</button>
            </div>
        `).join('');

        return {
            title: 'Info Pernikahan',
            subtitle: 'Tanggal, countdown, akad & resepsi, lokasi',
            html: `
                <div class="card">
                    <div class="card-head"><div><h2>Tanggal & Countdown</h2><p>Menentukan hitungan hari dan tombol Google Calendar.</p></div></div>
                    <div class="grid grid-3">
                        <label class="field"><span class="label">Tanggal & jam</span><input type="datetime-local" class="input" data-datetime value="${esc(inputValue)}"></label>
                        <label class="field"><span class="label">Zona waktu</span>
                            <select class="select" data-bind="settings.timezone">
                                ${['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Singapore', 'UTC'].map((z) => `<option value="${z}" ${z === tz ? 'selected' : ''}>${z}</option>`).join('')}
                            </select>
                        </label>
                        <div class="field" style="justify-content:center;">
                            ${ui.switchField({ label: 'Tampilkan countdown', bind: 'settings.countdown', checked: store.get('settings.countdown', true) !== false })}
                        </div>
                    </div>
                    <p class="hint" style="margin:10px 0 0;">Hitungan: <strong>${esc(toInputValue(iso, tz).replace('T', ' '))}</strong> (${esc(tz)}) — sisa ${daysUntil(iso)} hari.</p>
                </div>

                <div class="card">
                    <div class="card-head"><div><h2>Rangkaian Acara</h2><p>Akad, resepsi, atau acara lain. Maksimal 4.</p></div><button class="btn btn-sm" data-add-item="events.items">${icon('plus', 13)} Tambah acara</button></div>
                    ${eventItems || '<div class="empty"><strong>Belum ada acara</strong>Tambahkan akad dan resepsi.</div>'}
                </div>

                <div class="card">
                    <div class="card-head"><div><h2>Lokasi & Maps</h2><p>Alamat lengkap dan tautan peta.</p></div></div>
                    <label class="field"><span class="label">Alamat acara</span><textarea class="textarea" rows="2" maxlength="300" data-bind="events.venue.address">${esc(venue.address ?? '')}</textarea></label>
                    <label class="field" style="margin-top:12px;"><span class="label">Google Maps URL</span><input class="input" data-bind="events.venue.maps" value="${esc(venue.maps ?? '')}" maxlength="500" placeholder="https://maps.app.goo.gl/..."></label>
                </div>

                <div class="card">
                    <div class="card-head"><div><h2>Dress Code</h2><p>Keterangan dan palet warna untuk tamu.</p></div><button class="btn btn-sm" data-add-item="events.dresscode.colors">${icon('plus', 13)} Warna</button></div>
                    <label class="field"><span class="label">Keterangan</span><input class="input" data-bind="events.dresscode.text" value="${esc(dress.text ?? '')}" maxlength="200"></label>
                    <div class="row" style="margin-top:12px;">${colors}</div>
                </div>
            `,
            mount(root) {
                const input = root.querySelector('[data-datetime]');
                input?.addEventListener('change', () => {
                    store.set('settings.date_iso', fromInputValue(input.value, store.get('settings.timezone', 'Asia/Jakarta')));
                    ctxRef.rerender();
                });
            }
        };
    };

    const content = () => {
        const quotes = store.get('quotes', []) ?? [];
        const story = store.get('story.items', []) ?? [];
        const gallery = store.get('gallery', []) ?? [];
        const gift = store.get('gift', {}) ?? {};
        const accounts = gift.accounts ?? [];

        const quoteItems = quotes.map((q, i) => `
            <div class="list-item">
                ${listHead(i, 'Kutipan', 'quotes', i)}
                <label class="field"><span class="label">Teks</span><textarea class="textarea" rows="2" maxlength="400" data-bind="quotes.${i}.text">${esc(q.text ?? '')}</textarea></label>
                <label class="field" style="margin-top:10px;"><span class="label">Sumber</span><input class="input" data-bind="quotes.${i}.source" value="${esc(q.source ?? '')}" maxlength="80"></label>
            </div>
        `).join('');

        const storyItems = story.map((s, i) => `
            <div class="list-item">
                ${listHead(i, s.title || 'Cerita', 'story.items', i)}
                <label class="field"><span class="label">Judul</span><input class="input" data-bind="story.items.${i}.title" value="${esc(s.title ?? '')}" maxlength="120"></label>
                <label class="field" style="margin-top:10px;"><span class="label">Isi cerita</span><textarea class="textarea" rows="4" maxlength="2000" data-bind="story.items.${i}.text">${esc(s.text ?? '')}</textarea></label>
            </div>
        `).join('');

        const galleryItems = gallery.map((g, i) => `
            <div class="list-item" style="padding:12px;">
                <div class="row" style="gap:12px;align-items:flex-start;">
                    <div class="thumb" style="width:78px;height:78px;flex:0 0 auto;cursor:default;">
                        <img src="${esc(g.src)}" alt="" loading="lazy">
                    </div>
                    <div class="stack" style="gap:6px;flex:1;">
                        <input class="input" data-bind="gallery.${i}.src" value="${esc(g.src ?? '')}" placeholder="/api/media?f=...">
                        <input class="input" data-bind="gallery.${i}.alt" value="${esc(g.alt ?? '')}" placeholder="Deskripsi foto" maxlength="80">
                        <div class="row" style="gap:4px;">
                            <button class="btn btn-sm" data-pick-media="gallery.${i}.src">${icon('image', 12)} Ganti</button>
                            <button class="icon-btn" data-move-up="gallery.${i}">↑</button>
                            <button class="icon-btn" data-move-down="gallery.${i}">↓</button>
                            <button class="icon-btn" data-remove-item="gallery.${i}">${icon('trash', 13)}</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        const accountItems = accounts.map((a, i) => `
            <div class="list-item">
                ${listHead(i, a.label || 'Rekening', 'gift.accounts', i)}
                <div class="grid grid-2">
                    <label class="field"><span class="label">Jenis</span>
                        <select class="select" data-bind="gift.accounts.${i}.type">
                            ${[['transfer', 'Transfer bank'], ['qris', 'QRIS'], ['gift', 'Hadiah / kirim barang']].map(([v, l]) => `<option value="${v}" ${a.type === v ? 'selected' : ''}>${l}</option>`).join('')}
                        </select>
                    </label>
                    <label class="field"><span class="label">Label</span><input class="input" data-bind="gift.accounts.${i}.label" value="${esc(a.label ?? '')}" maxlength="40"></label>
                    <label class="field"><span class="label">Atas nama</span><input class="input" data-bind="gift.accounts.${i}.holder" value="${esc(a.holder ?? '')}" maxlength="80"></label>
                    <label class="field"><span class="label">Bank</span><input class="input" data-bind="gift.accounts.${i}.bank" value="${esc(a.bank ?? '')}" maxlength="80"></label>
                    <label class="field"><span class="label">Nomor rekening</span><input class="input" data-bind="gift.accounts.${i}.number" value="${esc(a.number ?? '')}" maxlength="40"></label>
                    <label class="field"><span class="label">No. HP / WhatsApp</span><input class="input" data-bind="gift.accounts.${i}.phone" value="${esc(a.phone ?? '')}" maxlength="30"></label>
                </div>
                <label class="field" style="margin-top:10px;"><span class="label">Alamat pengiriman</span><input class="input" data-bind="gift.accounts.${i}.address" value="${esc(a.address ?? '')}" maxlength="300"></label>
                ${photoField('Gambar QRIS', `gift.accounts.${i}.image`, a.image ?? '', 'Hanya untuk jenis QRIS.')}
            </div>
        `).join('');

        return {
            title: 'Konten Undangan',
            subtitle: 'Opening, kutipan, cerita, galeri, hadiah, penutup',
            html: `
                <div class="card">
                    <div class="card-head"><div><h2>Opening</h2><p>Salam pembuka setelah cover.</p></div></div>
                    <label class="field"><span class="label">Bismillah / pembuka arab</span><input class="input" data-bind="opening.bismillah" value="${esc(store.get('opening.bismillah', ''))}" maxlength="160" dir="auto"></label>
                    <div class="grid grid-2" style="margin-top:12px;">
                        <label class="field"><span class="label">Salam</span><input class="input" data-bind="opening.greeting" value="${esc(store.get('opening.greeting', ''))}" maxlength="160"></label>
                        <label class="field"><span class="label">Judul halaman awal</span><input class="input" data-bind="home.title" value="${esc(store.get('home.title', ''))}" maxlength="120"></label>
                    </div>
                    <label class="field" style="margin-top:12px;"><span class="label">Kalimat undangan</span><textarea class="textarea" rows="2" maxlength="500" data-bind="opening.text">${esc(store.get('opening.text', ''))}</textarea></label>
                    <div class="grid grid-2" style="margin-top:12px;">
                        ${photoField('Foto cover', 'cover.photo', store.get('cover.photo', ''))}
                        ${photoField('Foto bulat halaman awal', 'home.photo', store.get('home.photo', ''))}
                    </div>
                </div>

                <div class="card">
                    <div class="card-head"><div><h2>Kutipan / Ayat</h2><p>Ditampilkan di blok setelah profil mempelai.</p></div><button class="btn btn-sm" data-add-item="quotes">${icon('plus', 13)} Kutipan</button></div>
                    ${quoteItems || '<div class="empty"><strong>Belum ada kutipan</strong></div>'}
                </div>

                <div class="card">
                    <div class="card-head"><div><h2>Love Story</h2><p>Timeline perjalanan hubungan.</p></div><button class="btn btn-sm" data-add-item="story.items">${icon('plus', 13)} Bagian</button></div>
                    ${storyItems || '<div class="empty"><strong>Belum ada cerita</strong></div>'}
                    <div class="sep" style="margin:14px 0;"></div>
                    <div class="field" style="margin-top:14px;">
                        <span class="label">Video story (opsional)</span>
                        <div class="input-group">
                            <input class="input" data-bind="story.video" value="${esc(store.get('story.video', ''))}" placeholder="/api/media?f=... atau /assets/video/...">
                            <button class="btn" data-pick-media="story.video" data-kind="video">${icon('media', 13)} Pilih</button>
                            <button class="btn btn-ghost" data-clear-media="story.video">Kosongkan</button>
                        </div>
                        <span class="hint">MP4/WebM maks 40 MB. Jika dikosongkan, blok video hilang dari undangan.</span>
                    </div>
                    ${store.get('story.video', '')
                        ? `<video class="preview-video" src="${esc(store.get('story.video', ''))}" controls preload="metadata" playsinline></video>`
                        : '<div class="note" style="margin-top:10px;">Belum ada video — tamu tidak akan melihat blok video di bagian Love Story.</div>'}
                </div>

                <div class="card">
                    <div class="card-head"><div><h2>Galeri</h2><p>${gallery.length} foto. Urutan menentukan tampilan carousel.</p></div><button class="btn btn-sm btn-gold" data-add-gallery>${icon('plus', 13)} Tambah foto</button></div>
                    <div class="stack">${galleryItems || '<div class="empty"><strong>Belum ada foto</strong>Tambahkan minimal 3 foto.</div>'}</div>
                </div>

                <div class="card">
                    <div class="card-head"><div><h2>Love Gift</h2><p>Rekening, QRIS, dan alamat hadiah.</p></div>
                        <div class="row">${ui.switchField({ label: 'Tampilkan', bind: 'gift.enabled', checked: gift.enabled !== false })}</div>
                    </div>
                    <label class="field"><span class="label">Kalimat pengantar</span><textarea class="textarea" rows="2" maxlength="400" data-bind="gift.intro">${esc(gift.intro ?? '')}</textarea></label>
                    <div class="sep" style="margin:14px 0;"></div>
                    <div class="row" style="justify-content:space-between;margin-bottom:10px;"><span class="section-label" style="margin:0;">Akun</span><button class="btn btn-sm" data-add-item="gift.accounts">${icon('plus', 13)} Akun</button></div>
                    ${accountItems || '<div class="empty"><strong>Belum ada akun</strong></div>'}
                </div>

                <div class="card">
                    <div class="card-head"><div><h2>Penutup</h2><p>Kalimat terima kasih dan salam penutup.</p></div></div>
                    <label class="field"><span class="label">Terima kasih</span><textarea class="textarea" rows="2" maxlength="500" data-bind="closing.thanks">${esc(store.get('closing.thanks', ''))}</textarea></label>
                    <div class="grid grid-2" style="margin-top:12px;">
                        <label class="field"><span class="label">Salam penutup</span><input class="input" data-bind="closing.greeting" value="${esc(store.get('closing.greeting', ''))}" maxlength="160"></label>
                        <label class="field"><span class="label">Doa / hamdalah</span><input class="input" data-bind="closing.doa" value="${esc(store.get('closing.doa', ''))}" maxlength="200" dir="auto"></label>
                    </div>
                </div>
            `,
            mount(root) {
                root.querySelector('[data-add-gallery]')?.addEventListener('click', () => {
                    ui.pickMedia({
                        kind: 'image',
                        onSelect: (url) => {
                            const list = store.get('gallery', []) ?? [];
                            list.push({ src: url, alt: `Foto ${list.length + 1}` });
                            store.set('gallery', list);
                            ctxRef.rerender();
                        }
                    });
                });
            }
        };
    };

    const media = () => ({
        title: 'Media',
        subtitle: 'Foto, musik, dan video undangan',
        html: `
            <div class="card">
                <div class="dropzone" data-drop>
                    ${icon('upload', 24)}
                    <strong>Tarik file ke sini atau klik untuk upload</strong>
                    <span>JPG, PNG, WEBP, GIF (maks 12 MB) · MP3 (20 MB) · MP4 (40 MB)</span>
                    <input type="file" hidden accept="image/*,audio/*,video/*" data-file>
                </div>
                <div class="row" style="margin-top:14px;gap:6px;" data-filters>
                    <button class="btn btn-sm btn-dark" data-filter="all">Semua</button>
                    <button class="btn btn-sm" data-filter="image">Foto</button>
                    <button class="btn btn-sm" data-filter="audio">Audio</button>
                    <button class="btn btn-sm" data-filter="video">Video</button>
                    <span class="muted tiny" style="margin-left:auto;" data-count></span>
                </div>
            </div>
            <div class="card">
                <div class="card-head"><div><h2>Galeri Media</h2><p>URL media bisa dipakai di semua field gambar.</p></div></div>
                <div data-grid><div class="skeleton" style="height:160px"></div></div>
            </div>
        `,
        mount(root) {
            let items = [];
            let filter = 'all';

            const grid = root.querySelector('[data-grid]');
            const count = root.querySelector('[data-count]');

            const render = () => {
                const list = filter === 'all' ? items : items.filter((m) => m.kind === filter);
                count.textContent = `${list.length} file`;

                if (list.length === 0) {
                    grid.innerHTML = '<div class="empty"><strong>Belum ada media</strong>Upload foto atau musik untuk mulai.</div>';
                    return;
                }

                grid.innerHTML = `<div class="thumbs">${list.map((m) => `
                    <div class="thumb" data-id="${m.id}">
                        ${m.kind === 'image'
                            ? `<img src="${esc(m.url)}" alt="${esc(m.original_name ?? '')}" loading="lazy">`
                            : `<div style="display:grid;place-items:center;height:100%;color:#8a6c3c;">${icon(m.kind === 'audio' ? 'music' : 'media', 32)}</div>`}
                        <div class="thumb-actions">
                            <button data-act="copy" title="Salin URL">${icon('link', 12)}</button>
                            <button data-act="replace" title="Ganti file">${icon('upload', 12)}</button>
                            <button data-act="delete" title="Hapus">${icon('trash', 12)}</button>
                        </div>
                        <div class="thumb-meta"><span>${esc((m.original_name ?? m.filename).slice(0, 16))}</span><span>${ui.fmtBytes(m.size)}</span></div>
                    </div>
                `).join('')}</div>`;

                grid.querySelectorAll('.thumb').forEach((node) => {
                    const id = Number(node.getAttribute('data-id'));
                    const item = items.find((m) => m.id === id);

                    node.querySelector('[data-act="copy"]').addEventListener('click', (e) => {
                        e.stopPropagation();
                        ui.copy(item.url, 'URL media disalin');
                    });

                    node.querySelector('[data-act="delete"]').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (!await ui.confirm({ title: 'Hapus media?', message: 'File akan dihapus permanen dan gambar yang memakainya bisa rusak.', confirmLabel: 'Hapus', danger: true })) return;

                        try {
                            await api.deleteMedia(item.id);
                            items = items.filter((m) => m.id !== item.id);
                            render();
                            ui.toast('Media dihapus');
                        } catch (err) {
                            ui.toast(err.message, 'error');
                        }
                    });

                    const input = node.querySelector('[data-act="replace"]');
                    input.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = item.kind === 'image' ? 'image/*' : item.kind === 'audio' ? 'audio/*' : 'video/*';
                        fileInput.addEventListener('change', async () => {
                            const file = fileInput.files?.[0];
                            if (!file) return;
                            try {
                                ui.toast('Mengganti file…');
                                await api.replaceMedia(item.id, file);
                                const data = await api.media();
                                items = data.items ?? [];
                                render();
                                ui.toast('File diganti, URL tetap sama');
                            } catch (err) {
                                ui.toast(err.message, 'error');
                            }
                        });
                        fileInput.click();
                    });
                });
            };

            const load = async () => {
                try {
                    const data = await api.media();
                    items = data.items ?? [];
                    render();
                } catch (err) {
                    grid.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
                }
            };

            root.querySelectorAll('[data-filter]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    filter = btn.getAttribute('data-filter');
                    root.querySelectorAll('[data-filter]').forEach((b) => b.classList.remove('btn-dark'));
                    btn.classList.add('btn-dark');
                    render();
                });
            });

            const input = root.querySelector('[data-file]');
            root.querySelector('[data-drop]').addEventListener('click', () => input.click());
            root.querySelector('[data-drop]').addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('is-over'); });
            root.querySelector('[data-drop]').addEventListener('dragleave', (e) => e.currentTarget.classList.remove('is-over'));
            root.querySelector('[data-drop]').addEventListener('drop', (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('is-over');
                upload(e.dataTransfer.files?.[0]);
            });

            const upload = async (file) => {
                if (!file) return;
                try {
                    ui.toast('Mengunggah ' + file.name + '…');
                    await api.upload(file);
                    await load();
                    ui.toast('Upload selesai');
                } catch (err) {
                    ui.toast(err.message, 'error');
                }
            };

            input.addEventListener('change', () => upload(input.files?.[0]));

            load();
        }
    });

    const guests = () => ({
        title: 'Daftar Tamu',
        subtitle: 'Link personal, RSVP, dan ekspor data',
        html: `
            <div class="card">
                <div class="row" style="justify-content:space-between;gap:10px;">
                    <div class="input-group" style="max-width:360px;flex:1;">
                        <input class="input" data-search placeholder="Cari nama, kategori, atau nomor…">
                    </div>
                    <div class="row" style="gap:6px;">
                        <button class="btn btn-sm" data-export>${icon('download', 13)} Export CSV</button>
                        <button class="btn btn-sm btn-gold" data-add>${icon('plus', 13)} Tambah tamu</button>
                    </div>
                </div>
            </div>
            <div class="card" style="padding:0;overflow:hidden;">
                <div data-table><div class="skeleton" style="height:180px;margin:18px"></div></div>
            </div>
        `,
        mount(root) {
            const holder = root.querySelector('[data-table]');
            let query = '';
            let timer = null;

            const load = async () => {
                try {
                    const data = await api.guests(query ? `q=${encodeURIComponent(query)}&per=200` : 'per=200');
                    const items = data.items ?? [];

                    if (items.length === 0) {
                        holder.innerHTML = `<div class="empty"><strong>Belum ada tamu</strong>Tambahkan tamu untuk mendapat link undangan personal.</div>`;
                        return;
                    }

                    holder.innerHTML = `
                        <div class="table-wrap" style="border:0;">
                            <table>
                                <thead><tr><th>Nama</th><th>Kategori</th><th>WhatsApp</th><th>RSVP</th><th></th></tr></thead>
                                <tbody>
                                    ${items.map((g) => `
                                        <tr data-id="${g.id}">
                                            <td>
                                                <div class="cell-name">${esc(g.name)}</div>
                                                <div class="cell-sub">${esc(g.link).slice(0, 44)}…</div>
                                            </td>
                                            <td>${g.category ? `<span class="badge is-grey">${esc(g.category)}</span>` : '<span class="muted">—</span>'}</td>
                                            <td>${esc(g.phone ?? '—')}</td>
                                            <td>${g.rsvp === null
                                                ? '<span class="badge is-grey">Belum</span>'
                                                : g.rsvp.presence
                                                    ? '<span class="badge is-green">Hadir</span>'
                                                    : '<span class="badge is-red">Tidak hadir</span>'}</td>
                                            <td>
                                                <div class="row-actions">
                                                    <button class="icon-btn" data-copy-link title="Salin link">${icon('link', 14)}</button>
                                                    <button class="icon-btn" data-edit title="Edit">${icon('edit', 14)}</button>
                                                    <button class="icon-btn" data-del title="Hapus">${icon('trash', 14)}</button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="row" style="padding:12px 16px;border-top:1px solid var(--line);justify-content:space-between;">
                            <span class="muted tiny">${items.length} dari ${data.total} tamu</span>
                        </div>
                    `;

                    holder.querySelectorAll('tr[data-id]').forEach((row) => {
                        const id = Number(row.getAttribute('data-id'));
                        const item = items.find((g) => g.id === id);

                        row.querySelector('[data-copy-link]').addEventListener('click', () => ui.copy(item.link, 'Link personal disalin'));
                        row.querySelector('[data-del]').addEventListener('click', async () => {
                            if (!await ui.confirm({ title: 'Hapus tamu?', message: `"${item.name}" akan dihapus dari daftar.`, confirmLabel: 'Hapus', danger: true })) return;
                            try {
                                await api.deleteGuest(id);
                                ui.toast('Tamu dihapus');
                                load();
                            } catch (err) {
                                ui.toast(err.message, 'error');
                            }
                        });
                        row.querySelector('[data-edit]').addEventListener('click', () => openForm(item));
                    });
                } catch (err) {
                    holder.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
                }
            };

            const openForm = (item = null) => {
                const d = ui.drawer({
                    title: item ? 'Edit Tamu' : 'Tambah Tamu',
                    subtitle: item ? item.name : 'Satu tamu = satu link undangan personal',
                    body: `
                        <label class="field"><span class="label">Nama tamu</span><input class="input" data-name value="${esc(item?.name ?? '')}" maxlength="120" placeholder="Budi Santoso"></label>
                        <div class="grid grid-2">
                            <label class="field"><span class="label">Kategori</span><input class="input" data-category value="${esc(item?.category ?? '')}" maxlength="60" placeholder="Keluarga / Kantor"></label>
                            <label class="field"><span class="label">WhatsApp</span><input class="input" data-phone value="${esc(item?.phone ?? '')}" maxlength="30" placeholder="0812xxxx"></label>
                        </div>
                        <label class="field"><span class="label">Catatan</span><textarea class="textarea" rows="2" maxlength="300" data-note>${esc(item?.note ?? '')}</textarea></label>
                        <div class="hint">Link personal memakai format <code>?to=Nama&g=slug</code>, sehingga RSVP tamu otomatis tercatat.</div>
                    `,
                    foot: `<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-gold" data-save>${icon('check', 14)} Simpan</button>`
                });

                d.foot.querySelector('[data-save]').addEventListener('click', async () => {
                    const payload = {
                        name: d.body.querySelector('[data-name]').value.trim(),
                        category: d.body.querySelector('[data-category]').value.trim() || null,
                        phone: d.body.querySelector('[data-phone]').value.trim() || null,
                        note: d.body.querySelector('[data-note]').value.trim() || null
                    };

                    if (payload.name.length < 2) {
                        ui.toast('Nama minimal 2 karakter', 'error');
                        return;
                    }

                    try {
                        if (item) {
                            await api.updateGuest(item.id, payload);
                        } else {
                            const created = await api.createGuest(payload);
                            ui.copy(created.link, 'Tamu ditambahkan, link disalin');
                        }
                        d.close();
                        ui.toast(item ? 'Tamu diperbarui' : 'Tamu ditambahkan');
                        load();
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                });
            };

            root.querySelector('[data-add]').addEventListener('click', () => openForm());
            root.querySelector('[data-export]').addEventListener('click', async () => {
                try {
                    await api.exportGuests();
                    ui.toast('CSV diunduh');
                } catch (err) {
                    ui.toast(err.message, 'error');
                }
            });

            const search = root.querySelector('[data-search]');
            search.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    query = search.value.trim();
                    load();
                }, 280);
            });

            load();
        }
    });

/* ---------- tampilan: tipografi & musik ---------- */

    const DEFAULT_SONG = '/assets/music/pure-love-304010.mp3';
    const DEFAULT_DISPLAY_FONT = 'Josefin Sans';

    const fontCard = (font, active) => {
        const stack = fontStack(font.family);

        return `
            <button class="font-card${active ? ' is-active' : ''}" type="button" data-font-pick="${esc(font.family)}" title="${esc(font.family)}">
                <span class="font-card-top">
                    <span class="font-card-name">${esc(font.family)}</span>
                    <span class="font-card-check">${icon('check', 11)}</span>
                </span>
                <span class="font-card-sample" style="font-family:${esc(stack)}">Dinda &amp; Jose</span>
                <span class="font-card-abc" style="font-family:${esc(stack)}">Aa Bb Cc · 15.03.2023</span>
            </button>
        `;
    };

    const appearance = () => {
        const theme = store.get('theme', {}) ?? {};
        const presets = [
            { name: 'Champagne', color: '#b08d57' },
            { name: 'Rosé', color: '#b9736c' },
            { name: 'Sage', color: '#7c8f74' },
            { name: 'Midnight', color: '#4a566b' }
        ];

        return {
            title: 'Tampilan',
            subtitle: 'Tipografi, musik, warna, dan animasi',
            html: `
                <div class="stack">

                    <!-- Tipografi -->
                    <div class="card">
                        <div class="card-head">
                            <div><h2>Tipografi</h2><p>Pilih font judul dan font isi undangan. Pratinjau berubah langsung, tanpa publish.</p></div>
                            <span class="pill" data-font-count>—</span>
                        </div>

                        <div class="typo-preview">
                            <span class="typo-eyebrow">The Wedding Of</span>
                            <div class="typo-names" data-preview-display>Dinda &amp; Jose</div>
                            <p class="typo-date" data-preview-display>Rabu, 15 Maret 2023</p>
                            <p class="typo-body" data-preview-body>Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami.</p>
                            <p class="typo-body" data-preview-body>Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Anda berkenan hadir.</p>
                        </div>

                        <div class="typo-controls">
                            <div class="seg" role="group" aria-label="Target font">
                                <button class="seg-btn is-active" type="button" data-font-target="theme.font">Font judul</button>
                                <button class="seg-btn" type="button" data-font-target="theme.font_body">Font isi</button>
                            </div>
                            <div class="typo-current">
                                <span>Judul: <strong data-current="theme.font">—</strong></span>
                                <span>Isi: <strong data-current="theme.font_body">—</strong></span>
                            </div>
                        </div>

                        <div class="typo-toolbar">
                            <div class="seg seg-sm" role="group" aria-label="Kategori font">
                                ${FONT_CATEGORIES.map((cat, i) => `<button class="seg-btn${i === 0 ? ' is-active' : ''}" type="button" data-font-cat="${esc(cat.key)}">${esc(cat.label)}</button>`).join('')}
                            </div>
                            <input class="input" type="search" data-font-search placeholder="Cari nama font…" autocomplete="off">
                        </div>

                        <div class="font-grid" data-font-grid>
                            ${ui.skeletonRows(3)}
                        </div>

                        <div class="row" style="justify-content:space-between;margin-top:14px;">
                            <button class="btn btn-sm btn-ghost" type="button" data-font-reset>${icon('refresh', 13)} Kembalikan bawaan</button>
                            <span class="hint">Semua font sudah di-host sendiri — tampil tanpa menunggu CDN.</span>
                        </div>
                    </div>

                    <div class="grid grid-2">
                        <div class="stack">

                            <!-- Musik latar -->
                            <div class="card">
                                <div class="card-head">
                                    <div><h2>Musik Latar</h2><p>Lagu yang diputar setelah tamu membuka undangan.</p></div>
                                </div>

                                ${ui.switchField({ label: 'Aktifkan musik', bind: 'music.enabled', checked: store.get('music.enabled', true) !== false })}

                                <div class="audio-box" data-audio-wrap>
                                    <div class="audio-art">${icon('music', 20)}</div>
                                    <div class="audio-info">
                                        <strong data-audio-file>—</strong>
                                        <span class="hint" data-audio-meta>—</span>
                                    </div>
                                    <button class="btn btn-sm" type="button" data-audio-test>${icon('play', 13)} Uji putar</button>
                                </div>
                                <audio data-audio-player preload="metadata" class="audio-el"></audio>

                                <label class="field" style="margin-top:14px;"><span class="label">Judul lagu</span>
                                    <input class="input" data-bind="music.title" value="${esc(store.get('music.title', ''))}" maxlength="80" placeholder="Contoh: Pure Love">
                                </label>

                                <label class="field" style="margin-top:10px;"><span class="label">File audio</span>
                                    <div class="input-group">
                                        <input class="input" data-bind="music.src" value="${esc(store.get('music.src', ''))}" placeholder="/api/media?f=... atau https://...">
                                        <button class="btn" type="button" data-audio-pick>${icon('music', 13)} Pilih</button>
                                    </div>
                                    <span class="hint">MP3 / M4A / WAV, maks 20 MB. Unggah langsung dari dialog "Pilih" bila lagu belum ada di galeri media.</span>
                                </label>

                                <label class="field" style="margin-top:10px;"><span class="label">Volume</span>
                                    <input type="range" class="range" min="0" max="100" step="5" data-bind="music.volume" data-audio-volume>
                                    <span class="hint">Volume awal saat lagu mulai diputar (tamu tetap bisa mematikan lewat tombol musik).</span>
                                </label>

                                <div class="row" style="justify-content:space-between;margin-top:8px;">
                                    <button class="btn btn-sm btn-ghost" type="button" data-audio-default>${icon('refresh', 13)} Pakai lagu bawaan</button>
                                    <span class="hint">Klik Save draft untuk menyimpan.</span>
                                </div>
                            </div>

                            <!-- Warna aksen -->
                            <div class="card">
                                <div class="card-head"><div><h2>Warna Aksen</h2><p>Dipakai pada tombol dan aksen garis.</p></div></div>
                                <div class="color-row">
                                    ${presets.map((p) => `<div class="swatch ${theme.accent === p.color ? 'is-active' : ''}" style="background:${p.color}" data-swatch="${p.color}" title="${p.name}"></div>`).join('')}
                                    <input type="color" class="color-input" data-bind="theme.accent" value="${esc(theme.accent ?? '#b08d57')}">
                                </div>
                                <div class="grid grid-2" style="margin-top:14px;">
                                    <label class="field"><span class="label">Mode tampilan</span>
                                        <select class="select" data-bind="theme.mode">
                                            <option value="auto" ${theme.mode === 'auto' ? 'selected' : ''}>Ikuti sistem</option>
                                            <option value="light" ${theme.mode === 'light' ? 'selected' : ''}>Terang</option>
                                            <option value="dark" ${theme.mode === 'dark' ? 'selected' : ''}>Gelap</option>
                                        </select>
                                    </label>
                                </div>
                                <div class="row" style="margin-top:14px;">${ui.switchField({ label: 'Animasi & confetti', bind: 'theme.animation', checked: theme.animation !== false })}</div>
                            </div>

                        </div>

                        <!-- Live preview -->
                        <div class="card" style="align-self:start;position:sticky;top:92px;">
                            <div class="card-head"><div><h2>Live Preview</h2><p>Pratinjau draft sebelum publish.</p></div>
                                <div class="row" style="gap:4px;">
                                    <button class="btn btn-sm" data-preview-go>${icon('eye', 13)} Buka</button>
                                    <button class="btn btn-sm btn-ghost" data-preview-reload>${icon('refresh', 13)}</button>
                                </div>
                            </div>
                            <iframe class="preview-frame" data-preview src="about:blank" title="Pratinjau undangan"></iframe>
                            <p class="hint" style="margin-top:10px;">Pratinjau memakai konten draft yang sudah tersimpan (klik <strong>Save draft</strong> dulu).</p>
                        </div>
                    </div>

                    <!-- Background -->
                    <div class="card">
                        <div class="card-head"><div><h2>Background</h2><p>Gambar latar seluruh halaman (opsional).</p></div></div>
                        ${photoField('Gambar background', 'theme.background', theme.background ?? '', 'Kosongkan untuk memakai background bawaan tema.')}
                    </div>
                </div>
            `,
            mount(root) {
                /* ---------- tipografi ---------- */
                ensureFontStylesheet();

                const grid = root.querySelector('[data-font-grid]');
                const search = root.querySelector('[data-font-search]');
                const count = root.querySelector('[data-font-count]');
                const catBtns = Array.from(root.querySelectorAll('[data-font-cat]'));
                const targetBtns = Array.from(root.querySelectorAll('[data-font-target]'));
                const state = { target: 'theme.font', category: 'all', query: '' };

                const familyOf = (path) => String(store.get(path, '') ?? '');

                const paintPreview = () => {
                    const display = familyOf('theme.font');
                    const body = familyOf('theme.font_body');

                    root.querySelectorAll('[data-preview-display]').forEach((el) => {
                        el.style.fontFamily = display ? fontStack(display) : '';
                    });
                    root.querySelectorAll('[data-preview-body]').forEach((el) => {
                        el.style.fontFamily = body ? fontStack(body, 'sans-serif') : '';
                    });

                    root.querySelector('[data-current="theme.font"]').textContent = display || 'Bawaan tema';
                    root.querySelector('[data-current="theme.font_body"]').textContent = body || 'Bawaan tema';

                    targetBtns.forEach((btn) => btn.classList.toggle('is-active', btn.getAttribute('data-font-target') === state.target));
                };

                const renderGrid = () => {
                    const list = filterFonts(state);
                    const active = familyOf(state.target);

                    grid.innerHTML = list.length
                        ? list.map((font) => fontCard(font, font.family === active)).join('')
                        : '<p class="hint">Nama font tidak ditemukan. Coba kata kunci lain.</p>';

                    if (count) {
                        count.textContent = `${list.length} font`;
                    }
                };

                grid.addEventListener('click', (e) => {
                    const card = e.target.closest('[data-font-pick]');

                    if (!card) {
                        return;
                    }

                    const picked = card.getAttribute('data-font-pick');
                    store.set(state.target, picked);

                    grid.querySelectorAll('.font-card').forEach((el) => el.classList.toggle('is-active', el === card));
                    paintPreview();
                    ui.toast(`${picked} dipakai untuk ${state.target === 'theme.font' ? 'font judul' : 'font isi'} — klik Save draft untuk menyimpan.`);
                });

                search.addEventListener('input', () => {
                    state.query = search.value;
                    renderGrid();
                });

                catBtns.forEach((btn) => btn.addEventListener('click', () => {
                    state.category = btn.getAttribute('data-font-cat');
                    catBtns.forEach((el) => el.classList.toggle('is-active', el === btn));
                    renderGrid();
                }));

                targetBtns.forEach((btn) => btn.addEventListener('click', () => {
                    state.target = btn.getAttribute('data-font-target');
                    paintPreview();
                    renderGrid();
                }));

                root.querySelector('[data-font-reset]').addEventListener('click', () => {
                    store.set(state.target, state.target === 'theme.font' ? DEFAULT_DISPLAY_FONT : '');
                    renderGrid();
                    paintPreview();
                });

                renderGrid();
                paintPreview();

                /* ---------- musik ---------- */
                const player = root.querySelector('[data-audio-player]');
                const meta = root.querySelector('[data-audio-meta]');
                const fileName = root.querySelector('[data-audio-file]');
                const volumeInput = root.querySelector('[data-audio-volume]');
                const titleInput = root.querySelector('[data-bind="music.title"]');
                const enabledToggle = root.querySelector('[data-bind="music.enabled"]');
                const testBtn = root.querySelector('[data-audio-test]');
                const wrap = root.querySelector('[data-audio-wrap]');

                const prettyName = (item, url) => {
                    const raw = item?.original_name
                        || decodeURIComponent(String(url ?? '').split('/').pop() ?? '').split('?')[0];

                    const base = String(raw)
                        .replace(/\.[a-z0-9]{2,5}$/i, '')
                        .replace(/[-_]+/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();

                    return base ? base.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80) : '';
                };

                const labelFor = (src) => {
                    if (!src) {
                        return 'Belum ada lagu';
                    }

                    if (src.includes('/api/media')) {
                        return 'Lagu dari galeri media';
                    }

                    return decodeURIComponent(String(src).split('/').pop().split('?')[0]) || src;
                };

                const fmtDuration = (seconds) => {
                    if (!Number.isFinite(seconds) || seconds <= 0) {
                        return '';
                    }

                    const m = Math.floor(seconds / 60);
                    const s = Math.round(seconds % 60);

                    return `${m}:${String(s).padStart(2, '0')}`;
                };

                const syncAudio = () => {
                    const src = String(store.get('music.src', '') ?? '');
                    const rawVolume = Number(store.get('music.volume', 100));
                    const volume = Number.isFinite(rawVolume) ? Math.min(100, Math.max(0, rawVolume)) : 100;
                    const enabled = store.get('music.enabled', true) !== false;

                    if (src) {
                        if (player.getAttribute('src') !== src) {
                            player.src = src;
                            player.load();
                        }
                    } else {
                        player.pause();
                        player.removeAttribute('src');
                        player.load();
                    }

                    player.volume = volume / 100;

                    if (volumeInput) {
                        volumeInput.value = String(volume);
                    }

                    if (fileName) {
                        fileName.textContent = labelFor(src);
                    }

                    if (meta) {
                        meta.textContent = src ? (fmtDuration(player.duration) || 'Menyiapkan pemutar…') : 'Undangan tampil tanpa musik.';
                    }

                    if (testBtn) {
                        testBtn.disabled = !src;
                    }

                    wrap?.classList.toggle('is-off', !enabled);
                };

                player.addEventListener('loadedmetadata', () => {
                    if (meta) {
                        meta.textContent = `${fmtDuration(player.duration) || '—'} · siap diputar`;
                    }
                });

                player.addEventListener('error', () => {
                    if (meta && player.getAttribute('src')) {
                        meta.textContent = 'File tidak bisa diputar — cek format atau izin akses.';
                    }
                });

                player.addEventListener('play', () => {
                    testBtn.innerHTML = `${icon('pause', 13)} Jeda`;
                });

                player.addEventListener('pause', () => {
                    testBtn.innerHTML = `${icon('play', 13)} Uji putar`;
                });

                testBtn.addEventListener('click', async () => {
                    if (!player.getAttribute('src')) {
                        return;
                    }

                    if (player.paused) {
                        try {
                            await player.play();
                        } catch (err) {
                            ui.toast(err.message, 'error');
                        }
                    } else {
                        player.pause();
                    }
                });

                volumeInput?.addEventListener('input', () => {
                    const level = Math.min(100, Math.max(0, Number(volumeInput.value) || 0));
                    player.volume = level / 100;
                });

                enabledToggle?.addEventListener('change', syncAudio);

                root.querySelector('[data-audio-pick]').addEventListener('click', () => {
                    ui.pickMedia({
                        kind: 'audio',
                        onSelect: (url, item) => {
                            store.set('music.src', url);

                            if (!String(store.get('music.title', '') ?? '').trim()) {
                                const guess = prettyName(item, url);

                                if (guess) {
                                    store.set('music.title', guess);
                                    if (titleInput) titleInput.value = guess;
                                }
                            }

                            if (store.get('music.enabled', true) === false) {
                                store.set('music.enabled', true);
                                if (enabledToggle) enabledToggle.checked = true;
                            }

                            syncAudio();
                            ui.toast('Lagu dipilih — klik Save draft untuk menyimpan.');
                        }
                    });
                });

                root.querySelector('[data-audio-default]').addEventListener('click', () => {
                    store.set('music.src', DEFAULT_SONG);
                    store.set('music.title', 'Pure Love');
                    store.set('music.enabled', true);

                    if (titleInput) titleInput.value = 'Pure Love';
                    if (enabledToggle) enabledToggle.checked = true;

                    syncAudio();
                    ui.toast('Lagu bawaan dipakai — klik Save draft untuk menyimpan.');
                });

                syncAudio();

                /* ---------- preview iframe ---------- */
                const frame = root.querySelector('[data-preview]');
                const loadPreview = async () => {
                    try {
                        frame.src = await api.previewUrl();
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                };

                root.querySelectorAll('[data-swatch]').forEach((el) => {
                    el.addEventListener('click', () => {
                        store.set('theme.accent', el.getAttribute('data-swatch'));
                        ctxRef.rerender();
                    });
                });

                root.querySelector('[data-preview-reload]').addEventListener('click', loadPreview);
                root.querySelector('[data-preview-go]').addEventListener('click', async () => {
                    try {
                        window.open(await api.previewUrl(), '_blank', 'noopener');
                    } catch (err) {
                        ui.toast(err.message, 'error');
                    }
                });

                loadPreview();
            }
        };
    };


    const website = () => {
        const info = store.getState().info;
        return {
            title: 'Website',
            subtitle: 'Publikasi, URL, dan SEO',
            html: `
                <div class="grid grid-2">
                    <div class="card">
                        <div class="card-head"><div><h2>Publikasi</h2><p>Kontrol status tayang undangan.</p></div>
                            <span class="pill ${info.is_live ? 'is-live' : 'is-draft'}"><span class="dot"></span>${info.is_live ? 'Live' : 'Draft'}</span>
                        </div>
                        ${ui.switchField({ label: 'Undangan dapat diakses tamu', bind: 'settings.is_live', checked: info.is_live, hint: 'Jika dimatikan, halaman publik memakai konten statis bawaan.' })}
                        <div class="sep" style="margin:16px 0;"></div>
                        <div class="kv"><span>Versi terpublish</span><span>${info.version}</span></div>
                        <div class="kv"><span>Terakhir publish</span><span>${ui.fmtDate(info.published_at, true)}</span></div>
                        <div class="kv"><span>Draft terakhir diubah</span><span>${ui.fmtDate(info.updated_at, true)}</span></div>
                        <div class="kv"><span>Perubahan belum publish</span><span>${store.isDirty() || info.has_changes ? '<span class="badge">Ada</span>' : '<span class="badge is-green">Tidak ada</span>'}</span></div>
                        <div class="row" style="margin-top:16px;gap:8px;">
                            <button class="btn btn-gold" data-save-publish>${icon('publish', 14)} Publish sekarang</button>
                            <button class="btn btn-ghost" data-revert>Batalkan draft</button>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-head"><div><h2>URL Undangan</h2><p>Dipakai untuk link personal tamu.</p></div></div>
                        <label class="field"><span class="label">Alamat publik</span><input class="input" data-bind="meta.url" value="${esc(store.inviteUrl())}" maxlength="200"></label>
                        <label class="field" style="margin-top:12px;"><span class="label">Judul halaman (SEO)</span><input class="input" data-bind="meta.title" value="${esc(store.get('meta.title', ''))}" maxlength="160"></label>
                        <label class="field" style="margin-top:12px;"><span class="label">Deskripsi (SEO)</span><textarea class="textarea" rows="2" maxlength="300" data-bind="meta.description">${esc(store.get('meta.description', ''))}</textarea></label>
                        ${photoField('Gambar share (OG image)', 'meta.og_image', store.get('meta.og_image', ''), 'Rekomendasi 1200×630 px.')}
                        <div class="row" style="margin-top:12px;gap:8px;">
                            <a class="btn btn-sm" href="${esc(store.inviteUrl())}" target="_blank" rel="noopener">${icon('external', 13)} Lihat undangan</a>
                            <button class="btn btn-sm btn-ghost" data-copy-url>${icon('copy', 13)} Salin URL</button>
                        </div>
                    </div>
                </div>

                <div class="card card-soft">
                    <div class="card-head"><div><h2>Alur Aman</h2><p>Rekomendasi sebelum membagikan undangan ke tamu.</p></div></div>
                    <div class="quick">
                        <div class="quick-item" data-step="preview">${icon('eye')}<div><strong>1. Cek pratinjau</strong><span>Lihat draft di tab baru</span></div></div>
                        <div class="quick-item" data-step="save">${icon('save')}<div><strong>2. Save draft</strong><span>Simpan perubahan</span></div></div>
                        <div class="quick-item" data-step="publish">${icon('publish')}<div><strong>3. Publish</strong><span>Tayangkan ke publik</span></div></div>
                        <div class="quick-item" data-step="share">${icon('guests')}<div><strong>4. Bagikan</strong><span>Kirim link personal</span></div></div>
                    </div>
                </div>
            `,
            mount(root) {
                root.querySelector('[data-save-publish]').addEventListener('click', () => ctxRef.publish());
                root.querySelector('[data-revert]').addEventListener('click', () => ctxRef.revert());
                root.querySelector('[data-copy-url]').addEventListener('click', () => ui.copy(store.inviteUrl(), 'URL undangan disalin'));
                root.querySelectorAll('[data-step]').forEach((el) => el.addEventListener('click', async () => {
                    const step = el.getAttribute('data-step');
                    if (step === 'publish') return ctxRef.publish();
                    if (step === 'save') return ctxRef.save();
                    if (step === 'preview') {
                        try {
                            window.open(await api.previewUrl(), '_blank', 'noopener');
                        } catch (err) {
                            ui.toast(err.message, 'error');
                        }
                        return;
                    }
                    ctxRef.navigate('guests');
                }));
            }
        };
    };

    return {
        setContext,
        dashboard,
        couple,
        wedding,
        content,
        media,
        guests,
        rsvp: () => rsvpPanel(ctxRef),
        account: () => accountPanel(ctxRef),
        appearance,
        website
    };
})();