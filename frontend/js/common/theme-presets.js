/**
 * Katalog preset tema — dipakai panel CMS (bukan halaman tamu).
 * Halaman tamu hanya membaca nilai konkret di content.theme, jadi menambah
 * preset di sini tidak butuh deploy API.
 */

export const themePresets = [
    {
        "slug": "default",
        "name": "Bawaan sekarang",
        "tagline": "Tampilan produksi saat ini (tanpa palet)",
        "mode": "auto",
        "accent": "#8c7853",
        "palette": {
            "bg": "",
            "surface": "",
            "surface_alt": "",
            "text": "",
            "muted": "",
            "line": ""
        },
        "fonts": {
            "display": "Josefin Sans",
            "body": ""
        },
        "motion": {
            "reveal": "fade-up",
            "duration": 900,
            "stagger": 90,
            "easing": "out-expo",
            "smooth": false
        },
        "cover": {
            "transition": "curtain",
            "duration": 1200
        },
        "fx": {
            "confetti": true,
            "petals": "none",
            "intensity": 2,
            "overlay": "",
            "overlay_pos": "bottom",
            "cursor": "none"
        }
    },
    {
        "slug": "champagne",
        "name": "Champagne",
        "tagline": "Klasik hangat, emas pudar",
        "mode": "light",
        "accent": "#8c7853",
        "palette": {
            "bg": "#f7f2e8",
            "surface": "#fffdf8",
            "surface_alt": "#f1e9da",
            "text": "#2a241d",
            "muted": "#6f6455",
            "line": "#e3d9c6"
        },
        "fonts": {
            "display": "Cormorant Garamond",
            "body": "Josefin Sans"
        },
        "motion": {
            "reveal": "fade-up",
            "duration": 900,
            "stagger": 90,
            "easing": "out-expo",
            "smooth": false
        },
        "cover": {
            "transition": "curtain",
            "duration": 1200
        },
        "fx": {
            "confetti": true,
            "petals": "none",
            "intensity": 2,
            "overlay": "",
            "overlay_pos": "bottom",
            "cursor": "none"
        }
    },
    {
        "slug": "rose-blush",
        "name": "Rosé Blush",
        "tagline": "Lembut, romantis, feminin",
        "mode": "light",
        "accent": "#b9736c",
        "palette": {
            "bg": "#fdf4f2",
            "surface": "#fffaf9",
            "surface_alt": "#f8e7e3",
            "text": "#3a2624",
            "muted": "#7d625f",
            "line": "#ecd8d4"
        },
        "fonts": {
            "display": "Playfair Display",
            "body": "Nunito"
        },
        "motion": {
            "reveal": "fade",
            "duration": 800,
            "stagger": 70,
            "easing": "out-quad",
            "smooth": false
        },
        "cover": {
            "transition": "fade",
            "duration": 1000
        },
        "fx": {
            "confetti": true,
            "petals": "rose",
            "intensity": 2,
            "overlay": "",
            "overlay_pos": "bottom",
            "cursor": "none"
        }
    },
    {
        "slug": "sage-garden",
        "name": "Sage Garden",
        "tagline": "Natural, tenang, botanical",
        "mode": "light",
        "accent": "#7c8f74",
        "palette": {
            "bg": "#f5f7f1",
            "surface": "#fbfdf8",
            "surface_alt": "#e9efe2",
            "text": "#26302a",
            "muted": "#5f6f61",
            "line": "#dde5d6"
        },
        "fonts": {
            "display": "Marcellus",
            "body": "Work Sans"
        },
        "motion": {
            "reveal": "fade-up",
            "duration": 900,
            "stagger": 100,
            "easing": "out-expo",
            "smooth": false
        },
        "cover": {
            "transition": "curtain",
            "duration": 1400
        },
        "fx": {
            "confetti": false,
            "petals": "none",
            "intensity": 1,
            "overlay": "",
            "overlay_pos": "bottom",
            "cursor": "none"
        }
    },
    {
        "slug": "midnight-navy",
        "name": "Midnight Navy",
        "tagline": "Gelap, formal, mewah",
        "mode": "dark",
        "accent": "#c9a96a",
        "palette": {
            "bg": "#0e141d",
            "surface": "#161f2b",
            "surface_alt": "#1f2b39",
            "text": "#eef2f7",
            "muted": "#9aa8ba",
            "line": "#25313f"
        },
        "fonts": {
            "display": "Cinzel",
            "body": "Inter"
        },
        "motion": {
            "reveal": "blur",
            "duration": 1000,
            "stagger": 110,
            "easing": "in-out",
            "smooth": true
        },
        "cover": {
            "transition": "curtain",
            "duration": 1600
        },
        "fx": {
            "confetti": false,
            "petals": "gold",
            "intensity": 2,
            "overlay": "",
            "overlay_pos": "bottom",
            "cursor": "sparkle"
        }
    },
    {
        "slug": "terracotta",
        "name": "Terracotta",
        "tagline": "Hangat, earthy, berani",
        "mode": "light",
        "accent": "#ab5b37",
        "palette": {
            "bg": "#fbf3ec",
            "surface": "#fff9f4",
            "surface_alt": "#f4e3d6",
            "text": "#33221a",
            "muted": "#7a5b4a",
            "line": "#ead6c6"
        },
        "fonts": {
            "display": "DM Serif Display",
            "body": "DM Sans"
        },
        "motion": {
            "reveal": "zoom",
            "duration": 800,
            "stagger": 80,
            "easing": "out-expo",
            "smooth": false
        },
        "cover": {
            "transition": "zoom",
            "duration": 1000
        },
        "fx": {
            "confetti": true,
            "petals": "none",
            "intensity": 2,
            "overlay": "",
            "overlay_pos": "bottom",
            "cursor": "none"
        }
    },
    {
        "slug": "ivory-mono",
        "name": "Ivory Mono",
        "tagline": "Minimal, editorial, monokrom",
        "mode": "light",
        "accent": "#2a241d",
        "palette": {
            "bg": "#ffffff",
            "surface": "#faf9f6",
            "surface_alt": "#f1efe9",
            "text": "#1c1916",
            "muted": "#6b655c",
            "line": "#e6e2da"
        },
        "fonts": {
            "display": "Bodoni Moda",
            "body": "Inter"
        },
        "motion": {
            "reveal": "mask",
            "duration": 1100,
            "stagger": 60,
            "easing": "out-expo",
            "smooth": false
        },
        "cover": {
            "transition": "fade",
            "duration": 900
        },
        "fx": {
            "confetti": false,
            "petals": "none",
            "intensity": 1,
            "overlay": "",
            "overlay_pos": "bottom",
            "cursor": "none"
        }
    },
    {
        "slug": "emerald-luxe",
        "name": "Emerald Luxe",
        "tagline": "Hijau zamrud + aksen emas",
        "mode": "light",
        "accent": "#2f6b52",
        "palette": {
            "bg": "#f2f6f3",
            "surface": "#fbfdfa",
            "surface_alt": "#e3ece6",
            "text": "#14251d",
            "muted": "#5a7166",
            "line": "#d6e3db"
        },
        "fonts": {
            "display": "Prata",
            "body": "Manrope"
        },
        "motion": {
            "reveal": "fade-up",
            "duration": 950,
            "stagger": 90,
            "easing": "out-expo",
            "smooth": false
        },
        "cover": {
            "transition": "curtain",
            "duration": 1400
        },
        "fx": {
            "confetti": false,
            "petals": "gold",
            "intensity": 1,
            "overlay": "",
            "overlay_pos": "bottom",
            "cursor": "none"
        }
    },
    {
        "slug": "sakura",
        "name": "Sakura",
        "tagline": "Manis, pastel, playful",
        "mode": "light",
        "accent": "#c98a9a",
        "palette": {
            "bg": "#fdf5f7",
            "surface": "#fffafc",
            "surface_alt": "#f9e8ee",
            "text": "#3b2930",
            "muted": "#7e6470",
            "line": "#f0dbe2"
        },
        "fonts": {
            "display": "Italiana",
            "body": "Quicksand"
        },
        "motion": {
            "reveal": "fade",
            "duration": 850,
            "stagger": 70,
            "easing": "out-quad",
            "smooth": false
        },
        "cover": {
            "transition": "zoom",
            "duration": 1200
        },
        "fx": {
            "confetti": true,
            "petals": "sakura",
            "intensity": 3,
            "overlay": "",
            "overlay_pos": "full",
            "cursor": "none"
        }
    }
];

export const getPreset = (slug) => themePresets.find((p) => p.slug === slug) ?? themePresets[0];

/** Rasio kontras WCAG (1..21) untuk badge peringatan di CMS. */
export const contrastRatio = (foreground, background) => {
    const parse = (hex) => {
        const value = String(hex ?? '').replace('#', '');
        if (!/^[0-9a-fA-F]{3,8}$/.test(value)) return null;
        const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value.slice(0, 6);
        return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
    };

    const luminance = (hex) => {
        const rgb = parse(hex);
        if (!rgb) return null;
        const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const a = luminance(foreground);
    const b = luminance(background);

    if (a === null || b === null) return null;

    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
};

/** Warna teks yang aman di atas warna aksen. */
export const onAccent = (accent) => {
    const dark = '#1c1916';
    const light = '#ffffff';
    return (contrastRatio(accent, dark) ?? 0) >= (contrastRatio(accent, light) ?? 0) ? dark : light;
};
