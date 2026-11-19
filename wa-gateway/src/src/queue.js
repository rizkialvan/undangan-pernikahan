import { query, readSettings } from './db.js';
import { DEFAULT_SETTINGS } from './config.js';
import { normalizePhone, toJid } from './wa.js';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/** Sleep yang tetap responsif terhadap pause / koneksi putus. */
const interruptibleSleep = async (seconds, session, isPaused) => {
    const until = Date.now() + seconds * 1000;

    while (Date.now() < until) {
        if (session.status !== 'connected' || await isPaused()) {
            return false;
        }

        await sleep(Math.min(3000, until - Date.now()));
    }

    return true;
};

const settings = async (userId) => {
    const row = await readSettings(userId);

    return { ...DEFAULT_SETTINGS, ...(row ?? {}) };
};

const sentToday = async (userId) => {
    const res = await query(
        `select count(*)::int as total from wa_messages
         where user_id = $1 and status = 'sent' and sent_at >= date_trunc('day', now())`,
        [userId],
    );

    return res.rows[0]?.total ?? 0;
};

const pickJob = async (userId) => {
    const res = await query(
        `update wa_messages set status = 'sending', updated_at = now()
         where id = (
             select id from wa_messages
             where user_id = $1 and status = 'queued' and scheduled_at <= now()
             order by id
             limit 1
             for update skip locked
         )
         returning id, user_id, guest_id, phone, body, attempts`,
        [userId],
    );

    return res.rows[0] ?? null;
};

const markSent = async (job, waId) => {
    await query(
        `update wa_messages set status = 'sent', wa_message_id = $2, sent_at = now(), updated_at = now()
         where id = $1`,
        [job.id, waId],
    );

    if (job.guest_id) {
        await query('update guests set sent_at = now(), updated_at = now() where id = $1', [job.guest_id]);
    }
};

const markSkipped = async (job, reason) => {
    await query(
        `update wa_messages set status = 'skipped', error = $2, updated_at = now() where id = $1`,
        [job.id, reason],
    );
};

const markFailed = async (job, reason, retryAt) => {
    if (retryAt) {
        await query(
            `update wa_messages set status = 'queued', attempts = attempts + 1, error = $2,
             scheduled_at = now() + interval '10 minutes', updated_at = now() where id = $1`,
            [job.id, reason],
        );

        return;
    }

    await query(
        `update wa_messages set status = 'failed', attempts = attempts + 1, error = $2, updated_at = now() where id = $1`,
        [job.id, reason],
    );
};

const pauseAll = async (userId, reason) => {
    await query(
        `update wa_settings set paused = true, updated_at = now() where user_id = $1`,
        [userId],
    ).catch(() => {});

    console.warn(`[worker ${userId}] circuit breaker: ${reason}`);
};

/**
 * Worker antrean: satu pesan per putaran, delay acak antar pesan,
 * kuota harian, jam kirim, validasi nomor, dan circuit breaker.
 */
export const startWorker = (session) => {
    if (session.workerStarted) {
        return;
    }

    session.workerStarted = true;

    const userId = session.userId;
    let consecutiveErrors = 0;

    const loop = async () => {
        for (;;) {
            try {
                if (session.status !== 'connected') {
                    await sleep(5000);
                    continue;
                }

                const cfg = await settings(userId);

                if (cfg.paused) {
                    await sleep(10000);
                    continue;
                }

                const hour = new Date().getHours();
                const inWindow = cfg.hour_start <= cfg.hour_end
                    ? hour >= cfg.hour_start && hour < cfg.hour_end
                    : hour >= cfg.hour_start || hour < cfg.hour_end;

                if (!inWindow) {
                    await sleep(60000);
                    continue;
                }

                if (await sentToday(userId) >= cfg.daily_cap) {
                    await sleep(120000);
                    continue;
                }

                const job = await pickJob(userId);

                if (!job) {
                    await sleep(4000);
                    continue;
                }

                session.currentJob = job;

                const phone = normalizePhone(job.phone);

                if (phone.length < 9 || phone.length > 15) {
                    await markSkipped(job, 'nomor tidak valid');
                    session.currentJob = null;
                    continue;
                }

                const jid = await session.isRegistered(phone);

                if (!jid) {
                    await markSkipped(job, 'nomor tidak terdaftar di WhatsApp');
                    session.currentJob = null;
                    continue;
                }

                // Simulasi manusia: tampak mengetik 2-5 detik sebelum kirim.
                await session.presence(jid, 'composing');
                await sleep(2000 + Math.random() * 3000);
                await session.presence(jid, 'paused');

                const waId = await session.sendText(jid, job.body);
                await markSent({ ...job, phone }, waId);
                session.currentJob = null;

                consecutiveErrors = 0;

                const delay = Math.floor(
                    cfg.delay_min + Math.random() * Math.max(1, cfg.delay_max - cfg.delay_min),
                );
                console.log(`[worker ${userId}] sent #${job.id} -> ${phone}, next in ${delay}s`);
                await interruptibleSleep(delay, session, async () => (await settings(userId)).paused);
            } catch (err) {
                consecutiveErrors += 1;
                console.error(`[worker ${userId}] error:`, err.message);

                const current = session.currentJob;

                if (current) {
                    await markFailed(current, err.message, current.attempts < 2).catch(() => {});
                    session.currentJob = null;
                }

                if (consecutiveErrors >= 5) {
                    await pauseAll(userId, err.message);
                    consecutiveErrors = 0;
                }

                await sleep(15000);
            }
        }
    };

    loop().catch((err) => console.error('[worker] fatal', err));
};