import fs from 'node:fs';
import path from 'node:path';
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import { config } from './config.js';
import { saveSession } from './db.js';

const logger = pino({ level: process.env.WA_LOG_LEVEL ?? 'silent' });

/** Normalisasi nomor Indonesia: 08xx / 8xx / +62 8xx -> 628xx */
export const normalizePhone = (raw) => {
    let digits = String(raw ?? '').replace(/[^\d]/g, '');

    if (digits.startsWith('0')) {
        digits = '62' + digits.slice(1);
    } else if (digits.startsWith('8')) {
        digits = '62' + digits;
    } else if (digits.startsWith('620')) {
        digits = '62' + digits.slice(3);
    }

    return digits;
};

export const toJid = (phone) => `${normalizePhone(phone)}@s.whatsapp.net`;

export class Wasession {
    constructor(userId) {
        this.userId = Number(userId);
        this.sock = null;
        this.status = 'disconnected';
        this.qr = null;
        this.phone = null;
        this.lastError = null;
        this.retry = 0;
        this.starting = false;
        this.dir = path.join(config.authDir, String(this.userId));
    }

    hasAuth() {
        try {
            return fs.existsSync(path.join(this.dir, 'creds.json'));
        } catch {
            return false;
        }
    }

    async persist(patch) {
        try {
            await saveSession(this.userId, patch);
        } catch (err) {
            console.error('[session] gagal simpan status', err.message);
        }
    }

    async qrPng() {
        if (!this.qr) {
            return null;
        }

        return QRCode.toDataURL(this.qr, { margin: 1, width: 320 });
    }

    async start({ force = false } = {}) {
        if (this.starting) {
            return this.status;
        }

        if (this.sock && !force && ['connected', 'qr', 'connecting'].includes(this.status)) {
            return this.status;
        }

        this.starting = true;
        this.status = 'connecting';
        await this.persist({ status: 'connecting', last_error: null });

        try {
            fs.mkdirSync(this.dir, { recursive: true });
            const { state, saveCreds } = await useMultiFileAuthState(this.dir);
            const { version } = await fetchLatestBaileysVersion();

            this.sock = makeWASocket({
                version,
                auth: state,
                logger,
                printQRInTerminal: false,
                browser: Browsers.ubuntu('Chrome'),
                markOnlineOnConnect: false,
                syncFullHistory: false,
                // Wajib: tanpa ini Baileys tidak mengunggah thumbnail resolusi
                // penuh, kartu preview hanya dapat gambar mini (atau kosong).
                generateHighQualityLinkPreview: true,
            });

            this.sock.ev.on('creds.update', saveCreds);

            // Status pesan keluar: 0=error 1=pending 2=server 3=diterima perangkat 4=dibaca
            this.sock.ev.on('messages.update', (updates) => {
                for (const u of updates ?? []) {
                    if (!u.key?.fromMe) {
                        continue;
                    }

                    console.log(`[ack] ${u.key.id} status=${u.update?.status ?? '?'}`);
                }
            });

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    this.qr = qr;
                    this.status = 'qr';
                    await this.persist({ status: 'qr', qr, qr_at: new Date().toISOString() });
                }

                if (connection === 'open') {
                    this.retry = 0;
                    this.status = 'connected';
                    this.qr = null;
                    this.phone = (this.sock?.user?.id ?? '').split(':')[0] || null;
                    await this.persist({
                        status: 'connected',
                        phone: this.phone,
                        qr: null,
                        connected_at: new Date().toISOString(),
                        last_error: null,
                    });
                    console.log(`[session ${this.userId}] connected as ${this.phone}`);
                }

                if (connection === 'close') {
                    const code = lastDisconnect?.error?.output?.statusCode;
                    const loggedOut = code === DisconnectReason.loggedOut;
                    this.status = 'disconnected';
                    this.qr = null;

                    await this.persist({
                        status: 'disconnected',
                        qr: null,
                        last_error: loggedOut ? 'sesi logout / tidak valid' : `terputus (${code ?? 'unknown'})`,
                    });

                    if (loggedOut) {
                        try {
                            fs.rmSync(this.dir, { recursive: true, force: true });
                        } catch { /* ignore */ }
                        console.log(`[session ${this.userId}] logged out`);
                        return;
                    }

                    this.retry += 1;
                    const wait = Math.min(60000, 5000 * this.retry);
                    console.log(`[session ${this.userId}] reconnect in ${wait}ms (attempt ${this.retry})`);
                    setTimeout(() => this.start({ force: true }).catch(() => {}), wait);
                }
            });
        } catch (err) {
            this.status = 'disconnected';
            this.lastError = err.message;
            await this.persist({ status: 'disconnected', last_error: err.message });
            console.error('[session] start gagal', err.message);
        } finally {
            this.starting = false;
        }

        return this.status;
    }

    async logout() {
        try {
            await this.sock?.logout();
        } catch { /* ignore */ }

        this.sock = null;
        this.status = 'disconnected';
        this.qr = null;
        this.phone = null;

        try {
            fs.rmSync(this.dir, { recursive: true, force: true });
        } catch { /* ignore */ }

        await this.persist({ status: 'disconnected', qr: null, phone: null, connected_at: null });
    }

    async presence(jid, type) {
        try {
            await this.sock.sendPresenceUpdate(type, jid);
        } catch { /* presence bukan kritikal */ }
    }

    async isRegistered(phone) {
        const jid = toJid(phone);

        try {
            const res = await this.sock.onWhatsApp(jid);
            const first = Array.isArray(res) ? res[0] : res;

            if (!first) {
                return null;
            }

            if (first.exists === false) {
                return null;
            }

            // WhatsApp sudah migrasi ke LID; kirim ke LID kalau tersedia
            // (mengirim ke @s.whatsapp.net berakhir "waiting for this message").
            return first.lid ?? first.jid ?? jid;
        } catch (err) {
            console.warn('[session] onWhatsApp gagal', err.message);
            return null;
        }
    }

    async sendText(jid, text) {
        if (!this.sock || this.status !== 'connected') {
            throw new Error('sesi WhatsApp belum terhubung');
        }

        const sent = await this.sock.sendMessage(jid, { text });

        console.log(`[sent] ${sent?.key?.id} -> ${jid}`);

        const ext = sent?.message?.extendedTextMessage ?? {};
        const thumb = Buffer.isBuffer(ext.jpegThumbnail) ? ext.jpegThumbnail : null;

        if (ext.title || ext.canonicalUrl || thumb) {
            console.log(
                `[session] preview ok: "${String(ext.title ?? '').slice(0, 60)}" `
                + `thumb=${thumb ? thumb.length : 0}B hq=${ext.thumbnailDirectPath ? 'yes' : 'no'}`,
            );
        } else {
            console.warn('[session] preview kosong (link tidak terdeteksi / fetch gagal)');
        }

        return sent?.key?.id ?? null;
    }
}

const sessions = new Map();

export const getSession = (userId) => {
    const id = Number(userId);

    if (!sessions.has(id)) {
        sessions.set(id, new Wasession(id));
    }

    return sessions.get(id);
};

export const allSessions = () => [...sessions.values()];