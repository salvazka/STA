/* ==========================================================================
   SPEED TEST BACKEND (Node.js)
   Handler polos bergaya (req, res) sehingga bisa dipakai oleh:
   - Vite dev server (connect middleware)  -> vite.config.js
   - Vercel Serverless Functions           -> api/*.js
   - Node HTTP server biasa                -> server/standalone.js
   ========================================================================== */

import { randomBytes } from 'node:crypto';

/* Batas ukuran (byte) --------------------------------------------------------
   Vercel membatasi body request serverless ~4.5 MB, jadi upload dipecah
   menjadi beberapa chunk kecil oleh klien. */
export const LIMITS = {
    downloadMin: 1024,
    downloadMax: 200 * 1024 * 1024,
    downloadDefault: 25 * 1024 * 1024,
    uploadMax: 4 * 1024 * 1024
};

const CHUNK_SIZE = 64 * 1024;

/* Kumpulan blok acak yang dirotasi agar payload tidak bisa dikompresi
   (kompresi akan membuat hasil pengukuran melambung tidak realistis). */
const RANDOM_POOL = Array.from({ length: 8 }, () => randomBytes(CHUNK_SIZE));

function noStoreHeaders(extra = {}) {
    return {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Timing-Allow-Origin': '*',
        ...extra
    };
}

function sendJson(res, status, payload, extraHeaders = {}) {
    const body = JSON.stringify(payload);
    res.writeHead(status, noStoreHeaders({
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        ...extraHeaders
    }));
    res.end(body);
}

function handlePreflight(req, res) {
    if (req.method !== 'OPTIONS') return false;
    res.writeHead(204, noStoreHeaders({ 'Content-Length': '0' }));
    res.end();
    return true;
}

function parseQuery(req) {
    return new URL(req.url || '/', 'http://localhost').searchParams;
}

function clampInt(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

/* ==========================================================================
   GET /api/ping
   Respons sekecil mungkin — yang diukur klien adalah round-trip time.
   ========================================================================== */

export function ping(req, res) {
    if (handlePreflight(req, res)) return;

    sendJson(res, 200, {
        status: 'pong',
        now: Date.now(),
        region: process.env.VERCEL_REGION || 'local'
    });
}

/* ==========================================================================
   GET /api/download?bytes=N
   Mengalirkan N byte acak. Klien membaca stream sambil mencatat throughput,
   lalu memutus koneksi (AbortController) begitu jendela waktu tes habis.
   ========================================================================== */

export function download(req, res) {
    if (handlePreflight(req, res)) return;

    const total = clampInt(
        parseQuery(req).get('bytes'),
        LIMITS.downloadMin,
        LIMITS.downloadMax,
        LIMITS.downloadDefault
    );

    res.writeHead(200, noStoreHeaders({
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(total),
        // Cegah kompresi & buffering perantara agar pengukuran akurat
        'Content-Encoding': 'identity',
        'X-Accel-Buffering': 'no'
    }));

    let sent = 0;
    let poolIndex = 0;
    let aborted = false;

    const stop = () => { aborted = true; };
    req.once('aborted', stop);
    req.once('close', stop);
    res.once('close', stop);
    res.once('error', stop);

    const pump = () => {
        while (!aborted && sent < total) {
            const remaining = total - sent;
            const block = RANDOM_POOL[poolIndex++ % RANDOM_POOL.length];
            const buffer = remaining >= CHUNK_SIZE ? block : block.subarray(0, remaining);

            sent += buffer.length;

            // res.write() false berarti buffer penuh: tunggu 'drain' (backpressure)
            if (!res.write(buffer)) {
                res.once('drain', pump);
                return;
            }
        }

        if (!aborted) res.end();
    };

    pump();
}

/* ==========================================================================
   POST /api/upload
   Menghitung byte yang benar-benar diterima server dan lama penerimaannya.
   Klien memakai angka ini untuk memverifikasi hasil sisi-klien.
   ========================================================================== */

export function upload(req, res) {
    if (handlePreflight(req, res)) return;

    if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed, gunakan POST' }, { Allow: 'POST, OPTIONS' });
        return;
    }

    const startedAt = process.hrtime.bigint();
    const finish = bytes => {
        const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
        sendJson(res, 200, {
            bytes,
            ms: Math.round(ms * 1000) / 1000,
            mbps: ms > 0 ? Math.round(((bytes * 8) / (ms / 1000) / 1e6) * 1000) / 1000 : 0
        });
    };

    // Runtime Vercel sudah membaca body sebelum handler dipanggil,
    // jadi stream bisa kosong. Pakai req.body kalau tersedia.
    const preParsed = req.body;
    if (preParsed !== undefined && preParsed !== null) {
        finish(byteLengthOf(preParsed));
        return;
    }

    if (req.readableEnded) {
        finish(0);
        return;
    }

    let received = 0;
    let tooLarge = false;

    req.on('data', chunk => {
        received += chunk.length;
        if (received > LIMITS.uploadMax * 2 && !tooLarge) {
            tooLarge = true;
            sendJson(res, 413, { error: 'Payload terlalu besar' });
            req.destroy();
        }
    });

    req.on('end', () => {
        if (!tooLarge) finish(received);
    });

    req.on('error', () => {
        if (!tooLarge && !res.headersSent) {
            sendJson(res, 400, { error: 'Gagal membaca body request' });
        }
    });
}

function byteLengthOf(body) {
    if (Buffer.isBuffer(body)) return body.length;
    if (body instanceof ArrayBuffer) return body.byteLength;
    if (ArrayBuffer.isView(body)) return body.byteLength;
    if (typeof body === 'string') return Buffer.byteLength(body);
    return Buffer.byteLength(JSON.stringify(body));
}

/* ==========================================================================
   ROUTER — dipakai oleh Vite dev middleware & server standalone
   ========================================================================== */

export const ROUTES = {
    '/api/ping': ping,
    '/api/download': download,
    '/api/upload': upload
};

export function apiMiddleware(req, res, next) {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    const handler = ROUTES[pathname];

    if (!handler) {
        if (typeof next === 'function') return next();
        sendJson(res, 404, { error: 'Not found' });
        return undefined;
    }

    try {
        return handler(req, res);
    } catch (error) {
        console.error(`[api] ${pathname} gagal:`, error);
        if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' });
        return undefined;
    }
}
