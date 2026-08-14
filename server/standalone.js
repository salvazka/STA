/* ==========================================================================
   SERVER NODE STANDALONE (opsional)
   Menyajikan hasil build `dist/` + endpoint /api tanpa Vercel.
   Jalankan: npm run build && npm run serve
   ========================================================================== */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { apiMiddleware } from './handlers.js';

const PORT = Number(process.env.PORT) || 3000;
const DIST = resolve(process.cwd(), 'dist');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.woff2': 'font/woff2'
};

async function resolveFile(pathname) {
    // Cegah path traversal: tolak apa pun yang keluar dari DIST
    const candidate = resolve(join(DIST, normalize(pathname)));
    if (candidate !== DIST && !candidate.startsWith(DIST + (process.platform === 'win32' ? '\\' : '/'))) {
        return null;
    }

    try {
        const info = await stat(candidate);
        if (info.isDirectory()) return resolveFile(join(pathname, 'index.html'));
        return candidate;
    } catch {
        return null;
    }
}

const server = createServer((req, res) => {
    apiMiddleware(req, res, async () => {
        const { pathname } = new URL(req.url || '/', 'http://localhost');
        const file = (await resolveFile(decodeURIComponent(pathname)))
            ?? (await resolveFile('/index.html'));

        if (!file) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 — jalankan "npm run build" terlebih dahulu.');
            return;
        }

        res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
        createReadStream(file).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`Serba Tester berjalan di http://localhost:${PORT}`);
});
