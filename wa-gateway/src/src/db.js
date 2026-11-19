import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({
    ...config.db,
    max: 4,
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    console.error('[db] idle client error', err.message);
});

export const query = (text, values = []) => pool.query(text, values);

const SESSION_TYPES = {
    status: 'text',
    qr: 'text',
    phone: 'text',
    last_error: 'text',
    qr_at: 'timestamp',
    connected_at: 'timestamp',
};

/**
 * Simpan status sesi WhatsApp supaya CMS (PHP) bisa membacanya tanpa
 * memanggil gateway langsung.
 * Cast eksplisit diperlukan karena Postgres tidak bisa menebak tipe
 * parameter yang nilainya null.
 */
export const saveSession = async (userId, patch = {}) => {
    await query(
        `insert into wa_sessions (user_id, name, status)
         values ($1, 'default', 'disconnected')
         on conflict (user_id, name) do nothing`,
        [userId],
    );

    const fields = [];
    const values = [];
    let i = 1;

    for (const [key, value] of Object.entries(patch)) {
        const type = SESSION_TYPES[key];

        if (!type) {
            continue;
        }

        fields.push(`${key} = $${i++}::${type}`);
        values.push(value);
    }

    if (fields.length === 0) {
        return;
    }

    values.push(userId);
    await query(
        `update wa_sessions set ${fields.join(', ')}, updated_at = now()
         where user_id = $${i} and name = 'default'`,
        values,
    );
};

export const readSession = async (userId) => {
    const res = await query(
        `select user_id, phone, status, qr, qr_at, last_error, connected_at, updated_at
         from wa_sessions where user_id = $1 and name = 'default'`,
        [userId],
    );

    return res.rows[0] ?? null;
};

export const readSettings = async (userId) => {
    const res = await query('select * from wa_settings where user_id = $1', [userId]);

    return res.rows[0] ?? null;
};