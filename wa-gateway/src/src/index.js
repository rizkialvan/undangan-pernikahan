import express from 'express';
import { config } from './config.js';
import { query } from './db.js';
import { getSession, normalizePhone, toJid } from './wa.js';
import { startWorker } from './queue.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

/**
 * Gateway hanya dipanggil dari container API (network internal Docker).
 * Token wajib — jangan pernah publish port ini ke publik.
 */
app.use((req, res, next) => {
    if (req.path === '/health') {
        return next();
    }

    const token = req.get('x-wa-token') ?? '';

    if (!config.token || token !== config.token) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    return next();
});

const userIdOf = (req) => {
    const id = Number(req.params.userId ?? 0);

    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }

    return id;
};

const prepare = (userId) => {
    const session = getSession(userId);
    startWorker(session);

    return session;
};

app.get('/health', async (_req, res) => {
    let db = 'ok';

    try {
        await query('select 1');
    } catch {
        db = 'error';
    }

    res.json({ ok: db === 'ok', db, uptime: Math.round(process.uptime()) });
});

app.get('/session/:userId/status', async (req, res) => {
    const userId = userIdOf(req);

    if (!userId) {
        return res.status(400).json({ ok: false, error: 'user id tidak valid' });
    }

    const session = prepare(userId);

    res.json({
        ok: true,
        status: session.status,
        phone: session.phone,
        has_qr: Boolean(session.qr),
        last_error: session.lastError,
    });
});

app.get('/session/:userId/qr', async (req, res) => {
    const userId = userIdOf(req);

    if (!userId) {
        return res.status(400).json({ ok: false, error: 'user id tidak valid' });
    }

    const session = prepare(userId);

    if (session.status !== 'connected' && !session.qr && session.hasAuth()) {
        await session.start();
    }

    res.json({
        ok: true,
        status: session.status,
        phone: session.phone,
        qr: await session.qrPng(),
        qr_raw: session.qr,
    });
});

app.post('/session/:userId/start', async (req, res) => {
    const userId = userIdOf(req);

    if (!userId) {
        return res.status(400).json({ ok: false, error: 'user id tidak valid' });
    }

    const session = prepare(userId);
    const status = await session.start({ force: true });

    res.json({ ok: true, status, phone: session.phone });
});

app.post('/session/:userId/logout', async (req, res) => {
    const userId = userIdOf(req);

    if (!userId) {
        return res.status(400).json({ ok: false, error: 'user id tidak valid' });
    }

    const session = prepare(userId);
    await session.logout();

    res.json({ ok: true, status: session.status });
});

/**
 * Test kirim langsung (tanpa antrean) — dipakai untuk verifikasi koneksi.
 */
app.post('/session/:userId/test-send', async (req, res) => {
    const userId = userIdOf(req);
    const to = String(req.body?.to ?? '');
    const text = String(req.body?.text ?? '').slice(0, 4000);

    if (!userId) {
        return res.status(400).json({ ok: false, error: 'user id tidak valid' });
    }

    if (!normalizePhone(to) || !text) {
        return res.status(400).json({ ok: false, error: 'nomor/teks kosong' });
    }

    const session = prepare(userId);

    try {
        const id = await session.sendText(toJid(to), text);
        res.json({ ok: true, wa_id: id });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

const boot = async () => {
    // Hidupkan kembali sesi yang punya kredensial tersimpan.
    try {
        const rows = await query(`select user_id from wa_sessions where status in ('connected', 'qr', 'connecting')`);

        for (const row of rows.rows) {
            const session = prepare(row.user_id);

            if (session.hasAuth()) {
                await session.start();
            }
        }
    } catch (err) {
        console.error('[boot] gagal memulihkan sesi', err.message);
    }

    app.listen(config.port, '0.0.0.0', () => {
        console.log(`[wa-gateway] listening on :${config.port}`);
    });
};

boot();