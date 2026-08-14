/* ==========================================================================
   INFORMASI SISTEM
   Membaca kemampuan browser, layar, hardware, Web API, koneksi, dan
   metrik performa halaman. Semua dibaca lokal, tidak dikirim ke mana pun.
   ========================================================================== */

import { $ } from '../lib/dom.js';
import { refreshIcons } from '../lib/icons.js';
import { showToast } from '../lib/toast.js';

let info = {};
let refreshRate = null;
let measuring = false;

/* --- Deteksi ------------------------------------------------------------- */

function browserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Edg/')) return 'Microsoft Edge';
    if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return 'Tidak diketahui';
}

function browserVersion() {
    const patterns = [/Edg\/(\d+)/, /OPR\/(\d+)/, /Firefox\/(\d+)/, /Chrome\/(\d+)/, /Version\/(\d+).*Safari/];
    for (const pattern of patterns) {
        const match = navigator.userAgent.match(pattern);
        if (match) return match[1];
    }
    return 'Tidak diketahui';
}

function engineName() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Gecko';
    if (ua.includes('Chrome') || ua.includes('Edg/')) return 'Blink';
    if (ua.includes('Safari')) return 'WebKit';
    return 'Tidak diketahui';
}

function orientation() {
    if (screen.orientation?.type) {
        return screen.orientation.type.includes('portrait') ? 'Portrait' : 'Landscape';
    }
    return window.innerWidth >= window.innerHeight ? 'Landscape' : 'Portrait';
}

function gpuRenderer() {
    try {
        const gl = document.createElement('canvas').getContext('webgl');
        if (!gl) return 'WebGL tidak tersedia';

        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        return (debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
            || 'Tidak diekspos browser';
    } catch {
        return 'Tidak diketahui';
    }
}

function hasWebGL() {
    try {
        return Boolean(document.createElement('canvas').getContext('webgl'));
    } catch {
        return false;
    }
}

function hasLocalStorage() {
    try {
        localStorage.setItem('__st__', '1');
        localStorage.removeItem('__st__');
        return true;
    } catch {
        return false;
    }
}

function connectionInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return { supported: false };

    return {
        effectiveType: (connection.effectiveType || 'tidak diketahui').toUpperCase(),
        downlink: connection.downlink ? `± ${connection.downlink} Mbps` : 'Tidak diketahui',
        rtt: typeof connection.rtt === 'number' ? `${connection.rtt} ms` : 'Tidak diketahui',
        saveData: Boolean(connection.saveData)
    };
}

function formatDuration(value) {
    if (!Number.isFinite(value) || value <= 0) return 'Tidak tersedia';
    return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
}

function performanceInfo() {
    const result = {};
    const [navigation] = performance.getEntriesByType?.('navigation') ?? [];

    if (navigation) {
        result.loadTime = formatDuration(navigation.loadEventEnd);
        result.domReady = formatDuration(navigation.domContentLoadedEventEnd);
        result.transferSize = navigation.transferSize
            ? `${(navigation.transferSize / 1024).toFixed(1)} KB`
            : 'Tidak diketahui';
    }

    const paint = performance.getEntriesByType?.('paint')
        ?.find(entry => entry.name === 'first-contentful-paint');
    result.firstPaint = paint ? formatDuration(paint.startTime) : 'Tidak tersedia';

    if (performance.memory?.usedJSHeapSize) {
        result.jsHeap = `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB`;
    }

    return result;
}

function gather() {
    info = {
        browser: {
            name: browserName(),
            version: browserVersion(),
            engine: engineName(),
            platform: navigator.platform || 'Tidak diketahui',
            language: navigator.language || 'Tidak diketahui',
            cookieEnabled: navigator.cookieEnabled,
            online: navigator.onLine
        },
        screen: {
            resolution: `${screen.width} × ${screen.height}`,
            viewport: `${window.innerWidth} × ${window.innerHeight}`,
            available: `${screen.availWidth} × ${screen.availHeight}`,
            colorDepth: `${screen.colorDepth}-bit`,
            devicePixelRatio: `${(window.devicePixelRatio || 1).toFixed(2)}×`,
            refreshRate: refreshRate ? `${refreshRate} Hz` : 'Mengukur…',
            orientation: orientation()
        },
        hardware: {
            cores: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} thread` : 'Tidak diketahui',
            memory: navigator.deviceMemory ? `± ${navigator.deviceMemory} GB` : 'Tidak diekspos browser',
            gpu: gpuRenderer(),
            maxTouchPoints: `${navigator.maxTouchPoints || 0} titik`,
            touchSupport: 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0
        },
        apis: {
            webAudio: Boolean(window.AudioContext || window.webkitAudioContext),
            webGL: hasWebGL(),
            canvas: Boolean(document.createElement('canvas').getContext),
            streams: typeof ReadableStream !== 'undefined',
            localStorage: hasLocalStorage(),
            serviceWorker: 'serviceWorker' in navigator,
            webRTC: Boolean(window.RTCPeerConnection),
            fullscreen: Boolean(document.documentElement.requestFullscreen),
            clipboard: Boolean(navigator.clipboard?.writeText),
            notifications: 'Notification' in window
        },
        connection: connectionInfo(),
        performance: performanceInfo()
    };
}

/* --- Refresh rate (relevan untuk tes monitor) ---------------------------- */

function measureRefreshRate() {
    if (refreshRate || measuring) return;
    measuring = true;

    const stamps = [];
    const SAMPLES = 60;

    const step = time => {
        stamps.push(time);

        if (stamps.length <= SAMPLES) {
            requestAnimationFrame(step);
            return;
        }

        const deltas = stamps.slice(1)
            .map((value, i) => value - stamps[i])
            .filter(delta => delta > 0)
            .sort((a, b) => a - b);

        const median = deltas[Math.floor(deltas.length / 2)];
        measuring = false;

        if (median) {
            refreshRate = Math.round(1000 / median);
            renderSystemInfo();
        }
    };

    requestAnimationFrame(step);
}

/* --- Render -------------------------------------------------------------- */

const SECTIONS = [
    {
        title: 'Browser',
        icon: 'globe',
        color: 'var(--brand)',
        key: 'browser',
        labels: {
            name: 'Nama',
            version: 'Versi',
            engine: 'Engine',
            platform: 'Platform',
            language: 'Bahasa',
            cookieEnabled: 'Cookie aktif',
            online: 'Terhubung'
        }
    },
    {
        title: 'Layar',
        icon: 'monitor',
        color: 'var(--brand-2)',
        key: 'screen',
        labels: {
            resolution: 'Resolusi',
            viewport: 'Viewport',
            available: 'Area tersedia',
            colorDepth: 'Kedalaman warna',
            devicePixelRatio: 'Pixel ratio',
            refreshRate: 'Refresh rate',
            orientation: 'Orientasi'
        }
    },
    {
        title: 'Hardware',
        icon: 'cpu',
        color: 'var(--emerald)',
        key: 'hardware',
        labels: {
            cores: 'CPU logis',
            memory: 'Memori',
            gpu: 'GPU',
            maxTouchPoints: 'Titik sentuh',
            touchSupport: 'Dukungan sentuh'
        }
    },
    {
        title: 'Dukungan Web API',
        icon: 'plug',
        color: 'var(--amber)',
        key: 'apis',
        labels: {
            webAudio: 'Web Audio',
            webGL: 'WebGL',
            canvas: 'Canvas 2D',
            streams: 'Streams API',
            localStorage: 'Local Storage',
            serviceWorker: 'Service Worker',
            webRTC: 'WebRTC',
            fullscreen: 'Fullscreen',
            clipboard: 'Clipboard',
            notifications: 'Notifications'
        }
    },
    {
        title: 'Koneksi',
        icon: 'wifi',
        color: 'var(--teal)',
        key: 'connection',
        labels: {
            supported: 'Network Information API',
            effectiveType: 'Tipe efektif',
            downlink: 'Estimasi downlink',
            rtt: 'RTT',
            saveData: 'Mode hemat data'
        }
    },
    {
        title: 'Performa Halaman',
        icon: 'zap',
        color: 'var(--rose)',
        key: 'performance',
        labels: {
            loadTime: 'Waktu muat',
            domReady: 'DOM siap',
            firstPaint: 'First paint',
            transferSize: 'Ukuran transfer',
            jsHeap: 'JS heap terpakai'
        }
    }
];

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderCard({ title, icon, color, key, labels }) {
    const data = info[key] ?? {};

    const rows = Object.keys(labels)
        .filter(field => data[field] !== undefined)
        .map(field => {
            const raw = data[field];
            const value = typeof raw === 'boolean'
                ? `<span class="status-badge ${raw ? 'is-yes' : 'is-no'}">${raw ? 'Ya' : 'Tidak'}</span>`
                : escapeHtml(raw);

            return `<div class="info-row">
                <span class="info-key">${escapeHtml(labels[field])}</span>
                <span class="info-val">${value}</span>
            </div>`;
        })
        .join('');

    return `<article class="info-card" style="--ic-color:${color}">
        <header class="info-card-head">
            <span class="info-card-icon"><i data-lucide="${icon}"></i></span>
            <span class="info-card-title">${escapeHtml(title)}</span>
        </header>
        <div class="info-rows">${rows}</div>
    </article>`;
}

export function renderSystemInfo() {
    const container = $('system-info-container');
    if (!container) return;

    gather();
    container.innerHTML = `<div class="info-grid">${SECTIONS.map(renderCard).join('')}</div>`;
    refreshIcons();
    measureRefreshRate();
}

/* --- Ekspor -------------------------------------------------------------- */

function toJson() {
    return JSON.stringify(
        { generatedAt: new Date().toISOString(), userAgent: navigator.userAgent, ...info },
        null,
        2
    );
}

async function copyInfo() {
    const text = toJson();

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(area);
            area.select();
            document.execCommand('copy');
            area.remove();
        }
        showToast('Informasi sistem disalin ke clipboard', 'success');
    } catch (error) {
        console.error('Gagal menyalin:', error);
        showToast('Gagal menyalin ke clipboard', 'error');
    }
}

function exportInfo() {
    try {
        const url = URL.createObjectURL(new Blob([toJson()], { type: 'application/json' }));
        const link = document.createElement('a');

        link.href = url;
        link.download = `serba-tester-system-info-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        showToast('Berkas system info diunduh', 'success');
    } catch (error) {
        console.error('Gagal mengekspor:', error);
        showToast('Gagal mengekspor system info', 'error');
    }
}

export function mountSystemInfo() {
    $('system-refresh')?.addEventListener('click', () => {
        renderSystemInfo();
        showToast('Informasi sistem diperbarui', 'info', 1600);
    });

    $('system-copy')?.addEventListener('click', copyInfo);
    $('system-export')?.addEventListener('click', exportInfo);
}
