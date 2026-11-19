/**
 * Konfigurasi gateway dari environment.
 * Tidak ada default yang berisi secret — semua kredensial wajib dari .env stack.
 */
export const config = {
    port: Number(process.env.PORT ?? 8099),
    token: process.env.WA_TOKEN ?? '',
    authDir: process.env.WA_AUTH_DIR ?? '/data/auth',
    timezone: process.env.TZ ?? 'Asia/Jakarta',
    db: {
        host: process.env.DB_HOST ?? 'undangan-db',
        port: Number(process.env.DB_PORT ?? 5432),
        database: process.env.DB_NAME ?? 'undangan',
        user: process.env.DB_USER ?? 'undangan_user',
        password: process.env.DB_PASS ?? '',
    },
};

export const DEFAULT_SETTINGS = {
    template:
        'Assalamualaikum {nama} 🤍\n\n' +
        'Tanpa mengurangi rasa hormat, kami mengundang {nama} untuk hadir di acara pernikahan kami.\n\n' +
        'Detail acara, lokasi, dan RSVP:\n{link}\n\n' +
        'Merupakan suatu kebahagiaan bagi kami apabila Bapak/Ibu/Saudara berkenan hadir.\n\n' +
        'Terima kasih 🙏',
    delay_min: 45,
    delay_max: 120,
    daily_cap: 50,
    hour_start: 8,
    hour_end: 21,
    paused: false,
};