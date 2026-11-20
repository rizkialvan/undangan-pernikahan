import { store } from './store.js';
import { ui } from './ui.js';
import { themePresets, contrastRatio, onAccent } from '../../common/theme-presets.js';

const { esc, icon } = ui;

const TABS = [
    { key: 'tema', label: 'Tema' },
    { key: 'warna', label: 'Warna' },
    { key: 'gerak', label: 'Gerak' },
    { key: 'efek', label: 'Efek' },
    { key: 'latar', label: 'Latar' }
];

const PALETTE = [
    { key: 'bg', label: 'Latar halaman' },
    { key: 'surface', label: 'Kartu / panel' },
    { key: 'surface_alt', label: 'Kartu alternatif' },
    { key: 'text', label: 'Teks utama' },
    { key: 'muted', label: 'Teks sekunder' },
    { key: 'line', label: 'Garis / border' }
];

const REVEALS = [
    { value: 'fade-up', label: 'Naik lembut (fade-up)' },
    { value: 'fade', label: 'Pudar (fade)' },
    { value: 'zoom', label: 'Membesar (zoom)' },
    { value: 'blur', label: 'Fokus dari blur' },
    { value: 'mask', label: 'Terbuka dari bawah (mask)' },
    { value: 'slide-left', label: 'Geser dari kanan' },
    { value: 'slide-right', label: 'Geser dari kiri' },
    { value: 'none', label: 'Tanpa animasi' }
];

const EASINGS = [
    { value: 'out-expo', label: 'Halus menurun (expo)' },
    { value: 'out-quad', label: 'Lembut (quad)' },
    { value: 'in-out', label: 'Seimbang (in-out)' },
    { value: 'spring', label: 'Memantul (spring)' },
    { value: 'linear', label: 'Linear' }
];

const COVERS = [
    { value: 'curtain', label: 'Tirai naik' },
    { value: 'fade', label: 'Pudar' },
    { value: 'zoom', label: 'Zoom menjauh' },
    { value: 'flip', label: 'Putar 3D' },
    { value: 'none', label: 'Langsung terbuka' }
];

const FLOATERS = [
    { value: 'none', label: 'Tidak ada' },
    { value: 'hearts', label: 'Hati (love)' },
    { value: 'rose', label: 'Kelopak mawar' },
    { value: 'sakura', label: 'Kelopak sakura' },
    { value: 'stars', label: 'Bintang' },
    { value: 'leaves', label: 'Daun' },
    { value: 'gold', label: 'Serbuk emas' },
    { value: 'snow', label: 'Salju' },
    { value: 'custom', label: 'Gambar sendiri (dari galeri media)' }
];

const num = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const themeOf = () => store.get('theme', {}) ?? {};

let activeTab = 'tema';

const presetCard = (preset) => {
    const active = themeOf().preset === preset.slug;
    const palette = preset.palette;
    const bg = palette.bg || '#ffffff';
    const surface = palette.surface || '#f8f9fa';
    const accent = preset.accent;
    const text = palette.text || '#212529';

    return `
        <button class="preset-card${active ? ' is-active' : ''}" type="button" data-preset="${esc(preset.slug)}">
            <span class="preset-shot" style="background:${esc(bg)};color:${esc(text)}">
                <span class="preset-names" style="font-family:'${esc(preset.fonts.display)}',serif">Dinda &amp; Jose</span>
                <span class="preset-date">RABU, 15 MARET 2023</span>
                <span class="preset-btn" style="background:${esc(accent)};color:${esc(onAccent(accent))}">Open Invitation</span>
            </span>
            <span class="preset-meta" style="background:${esc(surface)};color:${esc(text)}">
                <span class="preset-name">${esc(preset.name)}</span>
                <span class="preset-tag">${esc(preset.tagline)}</span>
                <span class="preset-dots">
                    ${[bg, surface, accent, text].map((c) => `<i style="background:${esc(c)}"></i>`).join('')}
                </span>
                <span class="preset-spec">${esc(preset.fonts.display)}${preset.fonts.body ? ' / ' + esc(preset.fonts.body) : ''}</span>
            </span>
            ${active ? `<span class="preset-check">${icon('check', 12)}</span>` : ''}
        </button>
    `;
};

const paletteField = ({ key, label }) => {
    const value = themeOf().palette?.[key] ?? '';
    return `
        <div class="palette-row">
            <label class="field">
                <span class="label">${esc(label)}</span>
                <div class="input-group">
                    <input type="color" class="color-input" data-bind="theme.palette.${key}" value="${esc(value || '#ffffff')}">
                    <input class="input" data-bind="theme.palette.${key}" value="${esc(value)}" placeholder="kosong = bawaan" maxlength="9">
                    <button class="btn btn-sm btn-ghost" type="button" data-clear-palette="${key}" title="Kosongkan">${icon('refresh', 13)}</button>
                </div>
            </label>
        </div>
    `;
};

const view = () => {
    const theme = themeOf();
    const palette = theme.palette ?? {};
    const motion = theme.motion ?? {};
    const cover = theme.cover ?? {};
    const fx = theme.fx ?? {};

    const textOnBg = contrastRatio(palette.text || '#212529', palette.bg || '#ffffff');
    const accentOnBg = contrastRatio(theme.accent || '#8c7853', palette.bg || '#ffffff');
    const lowContrast = (textOnBg !== null && textOnBg < 4.5) || (accentOnBg !== null && accentOnBg < 3);

    return `
        <div class="theme-panel">
            <div class="theme-tabs" role="tablist">
                ${TABS.map((t) => `<button class="theme-tab${t.key === activeTab ? ' is-active' : ''}" type="button" role="tab" data-tab="${t.key}">${esc(t.label)}</button>`).join('')}
            </div>

            <section class="theme-section" data-panel="tema"${activeTab === 'tema' ? '' : ' hidden'}>
                <div class="card">
                    <div class="card-head">
                        <div><h2>Preset tema</h2><p>Sekali klik mengisi warna, font, gerak, dan efek. Semua masih bisa diubah manual setelahnya.</p></div>
                        <span class="pill">${themePresets.length} pilihan</span>
                    </div>
                    <div class="preset-grid">
                        ${themePresets.map(presetCard).join('')}
                    </div>
                    <p class="hint" style="margin-top:12px;">Preset "Bawaan sekarang" mengosongkan palet supaya tampilan produksi yang lama tetap sama.</p>
                </div>
            </section>

            <section class="theme-section" data-panel="warna"${activeTab === 'warna' ? '' : ' hidden'}>
                <div class="card">
                    <div class="card-head">
                        <div><h2>Warna aksen</h2><p>Dipakai tombol, badge, dan garis aksen.</p></div>
                        <span class="contrast-badge${lowContrast ? ' is-warn' : ''}" data-contrast>
                            ${textOnBg !== null ? `Teks ${textOnBg.toFixed(1)}:1` : '—'} · Aksen ${accentOnBg !== null ? accentOnBg.toFixed(1) + ':1' : '—'}
                        </span>
                    </div>
                    <div class="color-row">
                        ${themePresets.filter((p) => p.slug !== 'default').map((p) => `<button class="swatch ${theme.accent === p.accent ? 'is-active' : ''}" type="button" style="background:${esc(p.accent)}" data-swatch="${esc(p.accent)}" title="${esc(p.name)}"></button>`).join('')}
                        <input type="color" class="color-input" data-bind="theme.accent" value="${esc(theme.accent || '#8c7853')}">
                    </div>
                    <div class="grid grid-2" style="margin-top:14px;">
                        <label class="field"><span class="label">Mode tampilan</span>
                            <select class="select" data-bind="theme.mode">
                                <option value="auto" ${theme.mode === 'auto' ? 'selected' : ''}>Ikuti sistem</option>
                                <option value="light" ${theme.mode === 'light' ? 'selected' : ''}>Terang</option>
                                <option value="dark" ${theme.mode === 'dark' ? 'selected' : ''}>Gelap</option>
                            </select>
                        </label>
                        <div class="field">
                            <span class="label">Palet</span>
                            <button class="btn btn-sm btn-ghost" type="button" data-clear-all>${icon('refresh', 13)} Kosongkan semua warna</button>
                            <span class="hint">Kosong = memakai warna bawaan tema halaman tamu.</span>
                        </div>
                    </div>
                </div>

                <div class="card" style="margin-top:16px;">
                    <div class="card-head"><div><h2>Palet halaman</h2><p>Enam warna inti. Kosongkan field untuk kembali ke bawaan.</p></div></div>
                    <div class="grid grid-2">
                        ${PALETTE.map(paletteField).join('')}
                    </div>
                    <p class="hint" style="margin-top:12px;">Kontras teks utama minimal 4,5:1 agar tetap terbaca di layar HP.</p>
                </div>
            </section>

            <section class="theme-section" data-panel="gerak"${activeTab === 'gerak' ? '' : ' hidden'}>
                <div class="grid grid-2">
                    <div class="card">
                        <div class="card-head"><div><h2>Animasi muncul</h2><p>Efek saat section masuk layar (menggantikan AOS).</p></div></div>
                        ${ui.selectField({ label: 'Jenis animasi', bind: 'theme.motion.reveal', value: motion.reveal ?? 'fade-up', options: REVEALS })}
                        ${ui.selectField({ label: 'Easing', bind: 'theme.motion.easing', value: motion.easing ?? 'out-expo', options: EASINGS })}

                        <label class="field" style="margin-top:12px;"><span class="label">Durasi <output data-out="motion.duration">${num(motion.duration, 900)}</output> ms</span>
                            <input type="range" class="range" min="200" max="2000" step="50" data-bind="theme.motion.duration" value="${num(motion.duration, 900)}">
                        </label>
                        <label class="field"><span class="label">Jeda antar elemen <output data-out="motion.stagger">${num(motion.stagger, 90)}</output> ms</span>
                            <input type="range" class="range" min="0" max="300" step="10" data-bind="theme.motion.stagger" value="${num(motion.stagger, 90)}">
                        </label>

                        <div class="row" style="justify-content:space-between;margin-top:10px;">
                            <button class="btn btn-sm" type="button" data-demo-play>${icon('play', 13)} Putar contoh</button>
                            <span class="hint">Contoh tidak mengubah konten.</span>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-head"><div><h2>Buka undangan</h2><p>Transisi saat tamu menekan tombol Open Invitation.</p></div></div>
                        ${ui.selectField({ label: 'Transisi cover', bind: 'theme.cover.transition', value: cover.transition ?? 'curtain', options: COVERS })}
                        <label class="field" style="margin-top:12px;"><span class="label">Durasi <output data-out="cover.duration">${num(cover.duration, 1200)}</output> ms</span>
                            <input type="range" class="range" min="300" max="2500" step="50" data-bind="theme.cover.duration" value="${num(cover.duration, 1200)}">
                        </label>
                        <p class="hint" style="margin-top:10px;">Kalau browser tamu tidak mendukung animasi, undangan tetap langsung terbuka.</p>
                    </div>
                </div>

                <div class="card" style="margin-top:16px;">
                    <div class="card-head"><div><h2>Contoh</h2><p>Animasi dijalankan pada kotak di bawah.</p></div></div>
                    <div class="theme-demo" data-demo>
                        <div class="demo-item">The Wedding Of</div>
                        <div class="demo-item demo-title">Dinda &amp; Jose</div>
                        <div class="demo-item">Rabu, 15 Maret 2023</div>
                    </div>
                </div>
            </section>

            <section class="theme-section" data-panel="latar"${activeTab === 'latar' ? '' : ' hidden'}>
                <div class="grid grid-2">
                    <div class="card">
                        <div class="card-head"><div><h2>Latar seluruh halaman</h2><p>Foto yang tampil di belakang semua section undangan.</p></div></div>

                        <label class="field"><span class="label">Gambar latar</span>
                            <div class="input-group">
                                <input class="input" data-bind="theme.background" value="${esc(theme.background ?? '')}" placeholder="/api/media?f=... atau kosong">
                                <button class="btn" type="button" data-pick-media="theme.background">${icon('media', 13)} Pilih</button>
                                <button class="btn btn-sm btn-ghost" type="button" data-clear-bg title="Hapus latar">${icon('refresh', 13)}</button>
                            </div>
                            <span class="hint">Otomatis dikompres ke maks 1600 px + WebP saat diunggah (foto 3 MB biasanya jadi ±200–400 KB).</span>
                        </label>

                        <label class="field" style="margin-top:12px;"><span class="label">Kekuatan latar <output data-out="background_opacity">${num(theme.background_opacity, 100)}</output>%</span>
                            <input type="range" class="range" min="0" max="100" step="5" data-bind="theme.background_opacity" value="${num(theme.background_opacity, 100)}" ${theme.background ? '' : 'disabled'}>
                            <span class="hint">0% = latar tidak terlihat, 100% = paling jelas. Section tetap diberi lapisan warna agar teks terbaca.</span>
                        </label>

                        <p class="hint" style="margin-top:8px;">Kalau gambar belum ada, klik <strong>Pilih</strong> lalu unggah — kompresi berjalan otomatis sebelum file disimpan.</p>
                    </div>

                    <div class="card" style="align-self:start;">
                        <div class="card-head"><div><h2>Pratinjau latar</h2><p>Perkiraan tampilan di halaman tamu.</p></div></div>
                        ${theme.background
                            ? `<div class="bg-preview"><img src="${esc(theme.background)}" alt="Pratinjau latar" style="opacity:${num(theme.background_opacity, 100) / 100}"><span>Dinda &amp; Jose</span></div>`
                            : `<div class="empty" style="padding:34px 16px;"><strong>Belum ada latar</strong>Unggah foto untuk melihat pratinjau.</div>`}
                    </div>
                </div>
            </section>

            <section class="theme-section" data-panel="efek"${activeTab === 'efek' ? '' : ' hidden'}>
                <div class="grid grid-2">
                    <div class="card">
                        <div class="card-head"><div><h2>Efek saat dibuka</h2><p>Confetti dan partikel dekoratif.</p></div></div>
                        ${ui.switchField({ label: 'Aktifkan animasi & efek', bind: 'theme.animation', checked: theme.animation !== false, hint: 'Mematikan ini menonaktifkan semua gerak, partikel, dan overlay — berguna kalau tamu melaporkan HP berat.' })}
                        ${ui.switchField({ label: 'Confetti saat undangan dibuka', bind: 'theme.fx.confetti', checked: fx.confetti !== false })}
                        ${ui.selectField({ label: 'Ikon melayang', bind: 'theme.fx.floaters', value: fx.floaters ?? fx.petals ?? 'none', options: FLOATERS, hint: 'Ikon yang jatuh dari atas layar. Muncul setelah tamu menekan Open Invitation.' })}
                        <label class="field" style="margin-top:12px;"><span class="label">Gambar untuk ikon "Gambar sendiri"</span>
                            <div class="input-group">
                                <input class="input" data-bind="theme.fx.floaters_image" value="${esc(fx.floaters_image ?? '')}" placeholder="/api/media?f=... (kosongkan bila tidak dipakai)">
                                <button class="btn" type="button" data-pick-media="theme.fx.floaters_image">${icon('media', 13)} Pilih</button>
                            </div>
                            <span class="hint">Disarankan PNG/WebP transparan, ukuran ≤ 200 KB. Aktif hanya bila Ikon melayang = Gambar sendiri.</span>
                        </label>
                        ${fx.floaters_image ? `<div class="overlay-preview"><img src="${esc(fx.floaters_image)}" alt="Pratinjau ikon"><button class="btn btn-sm btn-ghost" type="button" data-clear-floaters>${icon('refresh', 13)} Hapus gambar</button></div>` : ''}
                        ${ui.switchField({ label: 'Hati dekorasi di section (SVG di samping foto mempelai)', bind: 'theme.fx.inline_hearts', checked: fx.inline_hearts !== false, hint: 'Matikan jika ingin undangan tanpa hati melayang bawaan — terpisah dari ikon melayang di atas.' })}
                        <label class="field" style="margin-top:12px;"><span class="label">Intensitas <output data-out="fx.intensity">${num(fx.intensity, 2)}</output></span>
                            <input type="range" class="range" min="1" max="3" step="1" data-bind="theme.fx.intensity" value="${num(fx.intensity, 2)}">
                            <span class="hint">1 = ringan (hemat baterai), 3 = paling ramai.</span>
                        </label>
                        ${ui.selectField({ label: 'Kilau kursor', bind: 'theme.fx.cursor', value: fx.cursor ?? 'none', options: [
                            { value: 'none', label: 'Tidak ada' },
                            { value: 'sparkle', label: 'Kilau (desktop)' }
                        ] })}
                    </div>

                    <div class="card">
                        <div class="card-head"><div><h2>Overlay animasi</h2><p>Gambar/GIF/WebP transparan di tepi layar.</p></div></div>
                        <label class="field"><span class="label">File overlay</span>
                            <div class="input-group">
                                <input class="input" data-bind="theme.fx.overlay" value="${esc(fx.overlay ?? '')}" placeholder="/api/media?f=... atau kosong">
                                <button class="btn" type="button" data-pick-media="theme.fx.overlay">${icon('media', 13)} Pilih</button>
                            </div>
                            <span class="hint">Disarankan WebP/APNG (GIF 5–20× lebih berat). Maks 2 MB.</span>
                        </label>
                        ${ui.selectField({ label: 'Posisi', bind: 'theme.fx.overlay_pos', value: fx.overlay_pos ?? 'bottom', options: [
                            { value: 'bottom', label: 'Bawah' },
                            { value: 'top', label: 'Atas' },
                            { value: 'full', label: 'Penuh layar' }
                        ] })}

                        ${fx.overlay ? `<div class="overlay-preview"><img src="${esc(fx.overlay)}" alt="Pratinjau overlay"><button class="btn btn-sm btn-ghost" type="button" data-clear-overlay>${icon('refresh', 13)} Hapus</button></div>` : ''}
                        <p class="hint" style="margin-top:10px;">Overlay dimuat setelah undangan dibuka, jadi tidak memperlambat loading awal.</p>
                    </div>
                </div>
            </section>
        </div>
    `;
};

const applyPreset = (preset) => {
    store.set('theme.preset', preset.slug);
    store.set('theme.mode', preset.mode);
    store.set('theme.accent', preset.accent);

    Object.entries(preset.palette).forEach(([key, value]) => store.set(`theme.palette.${key}`, value));

    store.set('theme.font', preset.fonts.display);
    store.set('theme.font_body', preset.fonts.body ?? '');
    store.set('theme.motion', { ...preset.motion });
    store.set('theme.cover', { ...preset.cover });
    store.set('theme.fx', { ...preset.fx });
};

const mount = (root) => {
    const paint = () => {
        root.innerHTML = view();
        bind();
    };

    const markCustom = () => {
        const current = themeOf().preset;
        if (current !== 'custom') {
            store.set('theme.preset', 'custom');
        }
    };

    const playDemo = () => {
        const box = root.querySelector('[data-demo]');
        if (!box) return;

        const reveal = store.get('theme.motion.reveal', 'fade-up');
        const stagger = num(store.get('theme.motion.stagger', 90), 90);
        const items = Array.from(box.querySelectorAll('.demo-item'));

        box.classList.toggle('is-plain', reveal === 'none');

        items.forEach((el, i) => {
            el.className = `demo-item${i === 1 ? ' demo-title' : ''}`;
            if (reveal === 'none') return;

            void el.offsetWidth;
            el.classList.add('rv', `rv-${reveal}`);
            el.style.setProperty('--rv-delay', `${i * stagger}ms`);
            requestAnimationFrame(() => el.classList.add('is-revealed'));
        });
    };

    const bind = () => {
        root.querySelectorAll('[data-tab]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-tab');
                activeTab = key;

                root.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b === btn));
                root.querySelectorAll('[data-panel]').forEach((panel) => {
                    panel.hidden = panel.getAttribute('data-panel') !== key;
                });
            });
        });

        root.querySelectorAll('[data-preset]').forEach((card) => {
            card.addEventListener('click', () => {
                const preset = themePresets.find((p) => p.slug === card.getAttribute('data-preset'));
                if (preset) {
                    applyPreset(preset);
                    paint();
                    ui.toast(`Tema "${preset.name}" dipakai — klik Save draft untuk menyimpan.`);
                }
            });
        });

        root.querySelectorAll('[data-swatch]').forEach((swatch) => {
            swatch.addEventListener('click', () => {
                store.set('theme.accent', swatch.getAttribute('data-swatch'));
                markCustom();
                paint();
            });
        });

        root.querySelectorAll('[data-clear-palette]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-clear-palette');
                store.set(`theme.palette.${key}`, '');
                markCustom();
                paint();
            });
        });

        root.querySelector('[data-clear-all]')?.addEventListener('click', () => {
            ['bg', 'surface', 'surface_alt', 'text', 'muted', 'line'].forEach((key) => store.set(`theme.palette.${key}`, ''));
            markCustom();
            paint();
        });

        root.querySelector('[data-demo-play]')?.addEventListener('click', playDemo);

        root.querySelector('[data-clear-bg]')?.addEventListener('click', () => {
            store.set('theme.background', '');
            markCustom();
            paint();
        });

        root.querySelector('[data-clear-overlay]')?.addEventListener('click', () => {
            store.set('theme.fx.overlay', '');
            paint();
        });

        root.querySelector('[data-clear-floaters]')?.addEventListener('click', () => {
            store.set('theme.fx.floaters_image', '');
            paint();
        });

        // Slider: perbarui angka tanpa render ulang supaya fokus tidak hilang.
        root.querySelectorAll('input[type="range"]').forEach((range) => {
            range.addEventListener('input', () => {
                const path = range.getAttribute('data-bind') ?? '';
                const key = path.replace('theme.', '');
                const out = root.querySelector(`[data-out="${key}"]`);
                if (out) out.textContent = range.value;
                if (path.includes('theme.')) markCustom();
            });
        });

        // Perubahan manual menandai tema sebagai custom (bukan preset lagi).
        root.querySelectorAll('[data-bind^="theme."]').forEach((el) => {
            el.addEventListener('change', markCustom);
        });
    };

    paint();
};

export const themePanel = () => {
    const base = {
        title: 'Tema & Efek',
        subtitle: 'Preset, warna, gerak, dan efek dekoratif undangan',
        html: view(),
        mount
    };

    return base;
};