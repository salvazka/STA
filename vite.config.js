import { defineConfig } from 'vite';
import { apiMiddleware } from './server/handlers.js';

/**
 * Menyediakan endpoint /api/* selama `vite dev` dan `vite preview`,
 * memakai handler yang sama dengan Serverless Function di Vercel.
 */
function speedTestApi() {
    return {
        name: 'serba-tester-api',
        configureServer(server) {
            server.middlewares.use(apiMiddleware);
        },
        configurePreviewServer(server) {
            server.middlewares.use(apiMiddleware);
        }
    };
}

export default defineConfig({
    plugins: [speedTestApi()],
    server: {
        port: 5173,
        open: false
    },
    preview: {
        port: 4173
    },
    build: {
        outDir: 'dist',
        target: 'es2022',
        sourcemap: false,
        chunkSizeWarningLimit: 700
    }
});
