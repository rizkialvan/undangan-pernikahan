<?php

namespace App\Support;

/**
 * Skema konten undangan + validasi/normalisasi.
 *
 * Semua teks disimpan sebagai string biasa (bukan HTML). Frontend menulisnya
 * lewat textContent / atribut, jadi tidak ada permukaan XSS dari CMS.
 */
final class InvitationContent
{
    public const MAX_JSON_BYTES = 512000;

    /**
     * Konten awal = isi situs yang sedang tayang (Dinda & Jose),
     * supaya publish pertama tidak mengubah tampilan.
     */
    public static function defaults(): array
    {
        return [
            'meta' => [
                'title' => 'Website Undangan Pernikahan Dinda dan Jose Secara Online',
                'description' => 'Website Undangan Pernikahan Dinda dan Jose Secara Online',
                'couple_label' => 'Dinda & Jose',
                'og_image' => '/assets/images/dj/cover.webp',
                'url' => 'https://undangan.metronetwork.my.id/',
            ],
            'cover' => [
                'eyebrow' => 'The Wedding Of',
                'photo' => '/assets/images/dj/cover.webp',
                'guest_message' => 'Kepada Yth Bapak/Ibu/Saudara/i',
            ],
            'home' => [
                'title' => 'Undangan Pernikahan',
                'photo' => '/assets/images/dj/home.webp',
                'background' => '/assets/images/dj/home-bg.webp',
                'date_label' => 'Rabu, 15 Maret 2023',
                'calendar_enabled' => true,
            ],
            'opening' => [
                'bismillah' => 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ',
                'greeting' => 'Assalamualaikum Warahmatullahi Wabarakatuh',
                'text' => 'Tanpa mengurangi rasa hormat, kami mengundang Anda untuk berkenan menghadiri acara pernikahan kami:',
            ],
            'quotes' => [
                [
                    'text' => 'Dan segala sesuatu Kami ciptakan berpasang-pasangan agar kamu mengingat (kebesaran Allah).',
                    'source' => "QS. Adh-Dhariyat: 49",
                ],
                [
                    'text' => 'dan sesungguhnya Dialah yang menciptakan pasangan laki-laki dan perempuan,',
                    'source' => "QS. An-Najm: 45",
                ],
            ],
            'couple' => [
                'bride' => [
                    'name' => 'Dinda',
                    'order' => 'Putri ke-1',
                    'father' => 'Bapak lorem ipsum',
                    'mother' => 'Ibu lorem ipsum',
                    'photo' => '/assets/images/dj/bride.webp',
                    'description' => '',
                ],
                'groom' => [
                    'name' => 'Jose',
                    'order' => 'Putra ke-1',
                    'father' => 'Bapak lorem ipsum',
                    'mother' => 'Ibu lorem ipsum',
                    'photo' => '/assets/images/dj/groom.webp',
                    'description' => '',
                ],
            ],
            'story' => [
                'video' => '/assets/video/265501_tiny.mp4',
                'items' => [
                    [
                        'title' => '💼 Awal Pertemuan Sederhana',
                        'text' => 'Pada Januari 2025, Jose, seorang desainer grafis berusia 28 tahun, bertemu Dinda, copywriter yang dikenal cerdas dan pendiam, dalam proyek branding perusahaan. Interaksi mereka di ruang rapat terbatas pada urusan kerja, penuh adab dan profesional.',
                    ],
                    [
                        'title' => '💞 Benih Cinta dalam Ujian',
                        'text' => 'Memasuki Februari 2025, proyek mereka menghadapi krisis: klien menolak konsep awal dan mengancam membatalkan kontrak. Di tengah tekanan, Dinda tampil dengan solusi kreatif yang menyelamatkan proyek, membuat Jose terkesan dengan ketenangan dan kecerdasannya.',
                    ],
                    [
                        'title' => '💍 Langkah Menuju Ridha Allah',
                        'text' => 'Proses taaruf berjalan penuh keikhlasan, dengan pendamping yang memastikan setiap langkah sesuai syariat. Pada Maret 2025, setelah istikharah dan mendapat restu keluarga, Jose melamar Dinda dalam acara sederhana namun penuh makna.',
                    ],
                ],
            ],
            'events' => [
                'title' => 'Moment Bahagia',
                'dresscode' => [
                    'text' => 'Busana batik dan bersepatu.',
                    'colors' => ['#ffffff', '#7fffd4', '#32cd32'],
                ],
                'venue' => [
                    'address' => 'RT 10 RW 02, Desa Pajerukan, Kec. Kalibagor, Kab. Banyumas, Jawa Tengah 53191.',
                    'maps' => 'https://goo.gl/maps/ALZR6FJZU3kxVwN86',
                ],
                'items' => [
                    [
                        'name' => 'Akad',
                        'date_label' => '',
                        'time' => 'Pukul 10.00 WIB - Selesai',
                        'place' => '',
                        'note' => '',
                    ],
                    [
                        'name' => 'Resepsi',
                        'date_label' => '',
                        'time' => 'Pukul 13.00 WIB - Selesai',
                        'place' => '',
                        'note' => '',
                    ],
                ],
            ],
            'gallery' => [
                ['src' => '/assets/images/dj/gallery-1.webp', 'alt' => 'image 1'],
                ['src' => '/assets/images/dj/gallery-2.webp', 'alt' => 'image 2'],
                ['src' => '/assets/images/dj/gallery-3.webp', 'alt' => 'image 3'],
                ['src' => '/assets/images/dj/gallery-4.webp', 'alt' => 'image 4'],
                ['src' => '/assets/images/dj/gallery-5.webp', 'alt' => 'image 5'],
                ['src' => '/assets/images/dj/gallery-6.webp', 'alt' => 'image 6'],
            ],
            'gift' => [
                'enabled' => true,
                'intro' => 'Dengan hormat, bagi Anda yang ingin memberikan tanda kasih kepada kami, dapat melalui:',
                'accounts' => [
                    [
                        'type' => 'transfer',
                        'label' => 'Transfer',
                        'holder' => 'Dinda',
                        'bank' => 'Bank Central Asia',
                        'number' => '1234567891234',
                        'image' => '',
                        'phone' => '',
                        'address' => '',
                    ],
                    [
                        'type' => 'qris',
                        'label' => 'Qris',
                        'holder' => 'Jose',
                        'bank' => '',
                        'number' => '',
                        'image' => '/assets/images/donate.png',
                        'phone' => '',
                        'address' => '',
                    ],
                    [
                        'type' => 'gift',
                        'label' => 'Gift',
                        'holder' => 'Jose',
                        'bank' => '',
                        'number' => '',
                        'image' => '',
                        'phone' => '0812345678',
                        'address' => 'RT 10 RW 02, Desa Pajerukan, Kec. Kalibagor, Kab. Banyumas, Jawa Tengah 53191.',
                    ],
                ],
            ],
            'closing' => [
                'thanks' => 'Terima kasih atas perhatian dan doa restu Anda, yang menjadi kebahagiaan serta kehormatan besar bagi kami.',
                'greeting' => 'Wassalamualaikum Warahmatullahi Wabarakatuh',
                'doa' => 'اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَۙ',
                'credit' => 'Jose & Dinda',
            ],
            'music' => [
                'enabled' => true,
                'src' => '/assets/music/pure-love-304010.mp3',
                'title' => 'Pure Love',
                'volume' => 100,
            ],
            'theme' => [
                'preset' => 'default',
                'mode' => 'auto',
                'accent' => '#8c7853',
                'palette' => [
                    'bg' => '',
                    'surface' => '',
                    'surface_alt' => '',
                    'text' => '',
                    'muted' => '',
                    'line' => '',
                ],
                'font' => 'Josefin Sans',
                'font_body' => '',
                'motion' => [
                    'reveal' => 'fade-up',
                    'duration' => 900,
                    'stagger' => 90,
                    'easing' => 'out-expo',
                    'smooth' => false,
                ],
                'cover' => [
                    'transition' => 'curtain',
                    'duration' => 1200,
                ],
                'fx' => [
                    'confetti' => true,
                    'petals' => 'none',
                    'floaters' => 'none',
                    'floaters_image' => '',
                    'inline_hearts' => true,
                    'intensity' => 2,
                    'overlay' => '',
                    'overlay_pos' => 'bottom',
                    'cursor' => 'none',
                ],
                'animation' => true,
                'background' => '',
                'background_opacity' => 100,
            ],
            'layout' => [
                'sections' => ['home', 'bride', 'quotes', 'story', 'date', 'gallery', 'gift', 'comment', 'closing'],
                'hidden' => [],
            ],
            'settings' => [
                'timezone' => 'Asia/Jakarta',
                'date_iso' => '2024-01-01T09:30:00+07:00',
                'countdown' => true,
                'is_live' => true,
            ],
        ];
    }

    /**
     * Gabungkan input admin ke struktur default (drop key asing).
     */
    public static function normalize(mixed $input): array
    {
        $defaults = self::defaults();
        $data = is_array($input) ? $input : [];

        $out = [];

        $out['meta'] = [
            'title' => self::text($data['meta']['title'] ?? null, $defaults['meta']['title'], 160),
            'description' => self::text($data['meta']['description'] ?? null, $defaults['meta']['description'], 300),
            'couple_label' => self::text($data['meta']['couple_label'] ?? null, $defaults['meta']['couple_label'], 80),
            'og_image' => self::url($data['meta']['og_image'] ?? null, $defaults['meta']['og_image']),
            'url' => self::url($data['meta']['url'] ?? null, $defaults['meta']['url']),
        ];

        $out['cover'] = [
            'eyebrow' => self::text($data['cover']['eyebrow'] ?? null, $defaults['cover']['eyebrow'], 80),
            'photo' => self::url($data['cover']['photo'] ?? null, $defaults['cover']['photo']),
            'guest_message' => self::text($data['cover']['guest_message'] ?? null, $defaults['cover']['guest_message'], 120),
        ];

        $out['home'] = [
            'title' => self::text($data['home']['title'] ?? null, $defaults['home']['title'], 120),
            'photo' => self::url($data['home']['photo'] ?? null, $defaults['home']['photo']),
            'background' => self::url($data['home']['background'] ?? null, $defaults['home']['background']),
            'date_label' => self::text($data['home']['date_label'] ?? null, $defaults['home']['date_label'], 80),
            'calendar_enabled' => self::bool($data['home']['calendar_enabled'] ?? null, true),
        ];

        $out['opening'] = [
            'bismillah' => self::text($data['opening']['bismillah'] ?? null, $defaults['opening']['bismillah'], 160),
            'greeting' => self::text($data['opening']['greeting'] ?? null, $defaults['opening']['greeting'], 160),
            'text' => self::text($data['opening']['text'] ?? null, $defaults['opening']['text'], 500),
        ];

        $out['quotes'] = [];
        foreach (array_slice(self::arr($data['quotes'] ?? null), 0, 6) as $i => $q) {
            $out['quotes'][] = [
                'text' => self::text($q['text'] ?? null, '', 400),
                'source' => self::text($q['source'] ?? null, '', 80),
            ];
        }
        if ($out['quotes'] === []) {
            $out['quotes'] = $defaults['quotes'];
        }

        foreach (['bride', 'groom'] as $role) {
            $src = $data['couple'][$role] ?? [];
            $def = $defaults['couple'][$role];
            $out['couple'][$role] = [
                'name' => self::text($src['name'] ?? null, $def['name'], 60),
                'order' => self::text($src['order'] ?? null, $def['order'], 40),
                'father' => self::text($src['father'] ?? null, $def['father'], 80),
                'mother' => self::text($src['mother'] ?? null, $def['mother'], 80),
                'photo' => self::url($src['photo'] ?? null, $def['photo']),
                'description' => self::text($src['description'] ?? null, '', 400),
            ];
        }

        $out['story'] = [
            'video' => self::nullableUrl($data['story']['video'] ?? null, $defaults['story']['video']),
            'items' => [],
        ];
        foreach (array_slice(self::arr($data['story']['items'] ?? null), 0, 12) as $item) {
            $title = self::text($item['title'] ?? null, '', 120);
            $body = self::text($item['text'] ?? null, '', 2000);
            if ($title === '' && $body === '') {
                continue;
            }
            $out['story']['items'][] = ['title' => $title, 'text' => $body];
        }
        if ($out['story']['items'] === []) {
            $out['story']['items'] = $defaults['story']['items'];
        }

        $colors = [];
        foreach (array_slice(self::arr($data['events']['dresscode']['colors'] ?? null), 0, 6) as $c) {
            $c = self::color($c, null);
            if ($c !== null) {
                $colors[] = $c;
            }
        }

        $out['events'] = [
            'title' => self::text($data['events']['title'] ?? null, $defaults['events']['title'], 80),
            'dresscode' => [
                'text' => self::text($data['events']['dresscode']['text'] ?? null, $defaults['events']['dresscode']['text'], 200),
                'colors' => $colors === [] ? $defaults['events']['dresscode']['colors'] : $colors,
            ],
            'venue' => [
                'address' => self::text($data['events']['venue']['address'] ?? null, $defaults['events']['venue']['address'], 300),
                'maps' => self::url($data['events']['venue']['maps'] ?? null, $defaults['events']['venue']['maps']),
            ],
            'items' => [],
        ];
        foreach (array_slice(self::arr($data['events']['items'] ?? null), 0, 4) as $item) {
            $name = self::text($item['name'] ?? null, '', 60);
            if ($name === '') {
                continue;
            }
            $out['events']['items'][] = [
                'name' => $name,
                'date_label' => self::text($item['date_label'] ?? null, '', 80),
                'time' => self::text($item['time'] ?? null, '', 80),
                'place' => self::text($item['place'] ?? null, '', 200),
                'note' => self::text($item['note'] ?? null, '', 300),
            ];
        }
        if ($out['events']['items'] === []) {
            $out['events']['items'] = $defaults['events']['items'];
        }

        $out['gallery'] = [];
        foreach (array_slice(self::arr($data['gallery'] ?? null), 0, 36) as $i => $g) {
            $src = self::url($g['src'] ?? null, null);
            if ($src === null) {
                continue;
            }
            $out['gallery'][] = [
                'src' => $src,
                'alt' => self::text($g['alt'] ?? null, 'image ' . ($i + 1), 80),
            ];
        }
        if ($out['gallery'] === []) {
            $out['gallery'] = $defaults['gallery'];
        }

        $out['gift'] = [
            'enabled' => self::bool($data['gift']['enabled'] ?? null, true),
            'intro' => self::text($data['gift']['intro'] ?? null, $defaults['gift']['intro'], 400),
            'accounts' => [],
        ];
        foreach (array_slice(self::arr($data['gift']['accounts'] ?? null), 0, 6) as $acc) {
            $label = self::text($acc['label'] ?? null, '', 40);
            if ($label === '') {
                continue;
            }
            $type = self::text($acc['type'] ?? null, 'transfer', 20);
            if (!in_array($type, ['transfer', 'qris', 'gift'], true)) {
                $type = 'transfer';
            }
            $out['gift']['accounts'][] = [
                'type' => $type,
                'label' => $label,
                'holder' => self::text($acc['holder'] ?? null, '', 80),
                'bank' => self::text($acc['bank'] ?? null, '', 80),
                'number' => self::text($acc['number'] ?? null, '', 40),
                'image' => self::url($acc['image'] ?? null, ''),
                'phone' => self::text($acc['phone'] ?? null, '', 30),
                'address' => self::text($acc['address'] ?? null, '', 300),
            ];
        }
        if ($out['gift']['accounts'] === []) {
            $out['gift']['accounts'] = $defaults['gift']['accounts'];
        }

        $out['closing'] = [
            'thanks' => self::text($data['closing']['thanks'] ?? null, $defaults['closing']['thanks'], 500),
            'greeting' => self::text($data['closing']['greeting'] ?? null, $defaults['closing']['greeting'], 160),
            'doa' => self::text($data['closing']['doa'] ?? null, $defaults['closing']['doa'], 200),
            'credit' => self::text($data['closing']['credit'] ?? null, $defaults['closing']['credit'], 80),
        ];

        $out['music'] = [
            'enabled' => self::bool($data['music']['enabled'] ?? null, true),
            'src' => self::url($data['music']['src'] ?? null, $defaults['music']['src']),
            'title' => self::text($data['music']['title'] ?? null, $defaults['music']['title'], 80),
            'volume' => max(0, min(100, (int) ($data['music']['volume'] ?? $defaults['music']['volume']))),
        ];

        $mode = self::text($data['theme']['mode'] ?? null, 'auto', 10);
        if (!in_array($mode, ['auto', 'light', 'dark'], true)) {
            $mode = 'auto';
        }

        $out['theme'] = [
            'preset' => self::slug($data['theme']['preset'] ?? null),
            'mode' => $mode,
            'accent' => self::color($data['theme']['accent'] ?? null, $defaults['theme']['accent']),
            'palette' => [
                'bg' => self::colorOrNull($data['theme']['palette']['bg'] ?? null),
                'surface' => self::colorOrNull($data['theme']['palette']['surface'] ?? null),
                'surface_alt' => self::colorOrNull($data['theme']['palette']['surface_alt'] ?? null),
                'text' => self::colorOrNull($data['theme']['palette']['text'] ?? null),
                'muted' => self::colorOrNull($data['theme']['palette']['muted'] ?? null),
                'line' => self::colorOrNull($data['theme']['palette']['line'] ?? null),
            ],
            'font' => self::text($data['theme']['font'] ?? null, $defaults['theme']['font'], 60),
            'font_body' => self::text($data['theme']['font_body'] ?? null, '', 60),
            'motion' => [
                'reveal' => self::enum(
                    $data['theme']['motion']['reveal'] ?? null,
                    'fade-up',
                    ['none', 'fade', 'fade-up', 'zoom', 'blur', 'mask', 'slide-left', 'slide-right']
                ),
                'duration' => self::clampInt($data['theme']['motion']['duration'] ?? null, 900, 200, 2000),
                'stagger' => self::clampInt($data['theme']['motion']['stagger'] ?? null, 90, 0, 300),
                'easing' => self::enum(
                    $data['theme']['motion']['easing'] ?? null,
                    'out-expo',
                    ['linear', 'out-quad', 'out-expo', 'in-out', 'spring']
                ),
                'smooth' => self::bool($data['theme']['motion']['smooth'] ?? null, false),
            ],
            'cover' => [
                'transition' => self::enum(
                    $data['theme']['cover']['transition'] ?? null,
                    'curtain',
                    ['none', 'fade', 'curtain', 'zoom', 'flip']
                ),
                'duration' => self::clampInt($data['theme']['cover']['duration'] ?? null, 1200, 300, 2500),
            ],
            'fx' => [
                'confetti' => self::bool($data['theme']['fx']['confetti'] ?? null, true),
                'petals' => self::enum(
                    $data['theme']['fx']['petals'] ?? null,
                    'none',
                    ['none', 'rose', 'sakura', 'gold', 'snow']
                ),
                'floaters' => self::enum(
                    $data['theme']['fx']['floaters'] ?? null,
                    self::legacyFloaters($data['theme']['fx']['petals'] ?? null),
                    ['none', 'hearts', 'rose', 'sakura', 'gold', 'snow', 'stars', 'leaves', 'custom']
                ),
                'floaters_image' => self::url($data['theme']['fx']['floaters_image'] ?? null, ''),
                'inline_hearts' => self::bool($data['theme']['fx']['inline_hearts'] ?? null, true),
                'intensity' => self::clampInt($data['theme']['fx']['intensity'] ?? null, 2, 1, 3),
                'overlay' => self::url($data['theme']['fx']['overlay'] ?? null, ''),
                'overlay_pos' => self::enum(
                    $data['theme']['fx']['overlay_pos'] ?? null,
                    'bottom',
                    ['top', 'bottom', 'full']
                ),
                'cursor' => self::enum($data['theme']['fx']['cursor'] ?? null, 'none', ['none', 'sparkle']),
            ],
            'animation' => self::bool($data['theme']['animation'] ?? null, true),
            'background' => self::url($data['theme']['background'] ?? null, ''),
            'background_opacity' => self::clampInt($data['theme']['background_opacity'] ?? null, 100, 0, 100),
        ];

        $allowedSections = ['home', 'bride', 'quotes', 'story', 'date', 'gallery', 'gift', 'comment', 'closing'];
        $order = [];
        foreach (self::arr($data['layout']['sections'] ?? null) as $key) {
            if (is_string($key) && in_array($key, $allowedSections, true) && !in_array($key, $order, true)) {
                $order[] = $key;
            }
        }
        foreach ($allowedSections as $key) {
            if (!in_array($key, $order, true)) {
                $order[] = $key;
            }
        }
        $hidden = [];
        foreach (self::arr($data['layout']['hidden'] ?? null) as $key) {
            if (is_string($key) && in_array($key, $allowedSections, true) && !in_array($key, $hidden, true)) {
                $hidden[] = $key;
            }
        }

        $out['layout'] = [
            'sections' => $order,
            'hidden' => $hidden,
        ];

        $tz = self::text($data['settings']['timezone'] ?? null, 'Asia/Jakarta', 70);
        if (!in_array($tz, \DateTimeZone::listIdentifiers(), true)) {
            $tz = 'Asia/Jakarta';
        }

        $dateIso = self::text($data['settings']['date_iso'] ?? null, $defaults['settings']['date_iso'], 40);
        $parsed = date_create($dateIso);
        if ($parsed === false) {
            $dateIso = $defaults['settings']['date_iso'];
        } else {
            $dateIso = $parsed->format('c');
        }

        $out['settings'] = [
            'timezone' => $tz,
            'date_iso' => $dateIso,
            'countdown' => self::bool($data['settings']['countdown'] ?? null, true),
            'is_live' => self::bool($data['settings']['is_live'] ?? null, true),
        ];

        return $out;
    }

    public static function encode(array $content): string
    {
        return json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
    }

    public static function decode(?string $json): array
    {
        if (!is_string($json) || $json === '') {
            return self::defaults();
        }

        $data = json_decode($json, true);

        return is_array($data) ? $data : self::defaults();
    }

    private static function arr(mixed $value): array
    {
        return is_array($value) ? array_values($value) : [];
    }

    private static function text(mixed $value, ?string $default, int $max): string
    {
        if (!is_string($value)) {
            return (string) ($default ?? '');
        }

        $value = str_replace(["\r\n", "\r"], "\n", $value);
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
        $value = trim($value);

        if ($value === '' && $default !== null) {
            return $default;
        }

        if (mb_strlen($value, 'UTF-8') > $max) {
            $value = mb_substr($value, 0, $max, 'UTF-8');
        }

        return $value;
    }

    private static function bool(mixed $value, bool $default = false): bool
    {
        if ($value === null) {
            return $default;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Seperti url(), tapi string kosong berarti "tanpa video" (bukan default).
     * Dipakai untuk media opsional seperti video love story.
     */
    private static function nullableUrl(mixed $value, string $default): string
    {
        if ($value === null) {
            return $default;
        }

        if (!is_string($value)) {
            return $default;
        }

        if (trim($value) === '') {
            return '';
        }

        return self::url($value, $default);
    }

    private static function color(mixed $value, ?string $default): string
    {
        if (!is_string($value) || !preg_match('/^#[0-9a-fA-F]{3,8}$/', $value)) {
            return (string) ($default ?? '#8c7853');
        }

        return strtolower($value);
    }

    /**
     * Warna opsional: string kosong berarti "ikut preset/bawaan".
     */
    private static function colorOrNull(mixed $value): string
    {
        if (!is_string($value) || !preg_match('/^#[0-9a-fA-F]{3,8}$/', $value)) {
            return '';
        }

        return strtolower($value);
    }

    /**
     * @param string[] $allowed
     */
    private static function enum(mixed $value, string $default, array $allowed): string
    {
        return is_string($value) && in_array($value, $allowed, true) ? $value : $default;
    }

    /**
     * Kompatibilitas: konten lama hanya punya theme.fx.petals
     * (none|rose|sakura|gold|snow). Nilai itu dipakai sebagai default
     * untuk field baru theme.fx.floaters.
     */
    private static function legacyFloaters(mixed $petals): string
    {
        return is_string($petals) && in_array($petals, ['rose', 'sakura', 'gold', 'snow'], true)
            ? $petals
            : 'none';
    }

    private static function clampInt(mixed $value, int $default, int $min, int $max): int
    {
        if (!is_numeric($value)) {
            return $default;
        }

        return max($min, min($max, (int) $value));
    }

    private static function slug(mixed $value, string $default = 'default'): string
    {
        if (!is_string($value) || !preg_match('/^[a-z0-9-]{2,32}$/', $value)) {
            return $default;
        }

        return $value;
    }

    /**
     * URL/path aman: relatif (/assets/...), http(s), atau kosong.
     */
    private static function url(mixed $value, ?string $default): string
    {
        if (!is_string($value)) {
            return (string) ($default ?? '');
        }

        $value = trim($value);

        if ($value === '') {
            return (string) ($default ?? '');
        }

        if (str_starts_with($value, '/') && !str_starts_with($value, '//')) {
            return mb_substr($value, 0, 500);
        }

        if (preg_match('#^https?://#i', $value)) {
            return mb_substr($value, 0, 500);
        }

        if (preg_match('#^assets/#i', $value)) {
            return mb_substr('/' . $value, 0, 500);
        }

        return (string) ($default ?? '');
    }
}