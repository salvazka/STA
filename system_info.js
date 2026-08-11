/* ==========================================================================
   SYSTEM INFORMATION MODULE
   Mengumpulkan dan menampilkan kemampuan browser, layar, hardware,
   dukungan Web API, koneksi, dan metrik performa halaman.
   ========================================================================== */

'use strict';

class SystemInfo {
    constructor() {
        this.info = {};
        this.refreshRate = null;
        this.refreshRatePending = false;
        this.gatherInfo();
    }

    /* ----------------------------------------------------------------------
       PENGUMPULAN DATA
       ---------------------------------------------------------------------- */

    gatherInfo() {
        this.info.browser = {
            name: this.getBrowserName(),
            version: this.getBrowserVersion(),
            engine: this.getEngineName(),
            platform: navigator.platform || 'Tidak diketahui',
            language: navigator.language || 'Tidak diketahui',
            cookieEnabled: navigator.cookieEnabled,
            online: navigator.onLine
        };

        this.info.screen = {
            resolution: `${screen.width} × ${screen.height}`,
            viewport: `${window.innerWidth} × ${window.innerHeight}`,
            available: `${screen.availWidth} × ${screen.availHeight}`,
            colorDepth: `${screen.colorDepth}-bit`,
            devicePixelRatio: (window.devicePixelRatio || 1).toFixed(2) + '×',
            refreshRate: this.refreshRate ? `${this.refreshRate} Hz` : 'Mengukur…',
            orientation: this.getOrientation()
        };

        this.info.hardware = {
            cores: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} thread` : 'Tidak diketahui',
            memory: navigator.deviceMemory ? `± ${navigator.deviceMemory} GB` : 'Tidak diekspos browser',
            gpu: this.getGpuRenderer(),
            maxTouchPoints: `${navigator.maxTouchPoints || 0} titik`,
            touchSupport: 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0
        };

        this.info.apis = {
            webAudio: !!(window.AudioContext || window.webkitAudioContext),
            webGL: this.detectWebGL(),
            canvas: !!document.createElement('canvas').getContext,
            localStorage: this.testLocalStorage(),
            serviceWorker: 'serviceWorker' in navigator,
            webRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
            fullscreen: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
            clipboard: !!(navigator.clipboard && navigator.clipboard.writeText),
            geolocation: 'geolocation' in navigator,
            notifications: 'Notification' in window
        };

        this.info.connection = this.getConnectionInfo();
        this.info.performance = this.getPerformanceInfo();
    }

    getBrowserName() {
        const ua = navigator.userAgent;
        if (ua.includes('Edg/')) return 'Microsoft Edge';
        if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Safari')) return 'Safari';
        return 'Tidak diketahui';
    }

    getBrowserVersion() {
        const ua = navigator.userAgent;
        const patterns = [/Edg\/(\d+)/, /OPR\/(\d+)/, /Firefox\/(\d+)/, /Chrome\/(\d+)/, /Version\/(\d+).*Safari/];

        for (const pattern of patterns) {
            const match = ua.match(pattern);
            if (match) return match[1];
        }
        return 'Tidak diketahui';
    }

    getEngineName() {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox')) return 'Gecko';
        if (ua.includes('Chrome') || ua.includes('Edg/')) return 'Blink';
        if (ua.includes('Safari')) return 'WebKit';
        return 'Tidak diketahui';
    }

    getOrientation() {
        if (screen.orientation && screen.orientation.type) {
            return screen.orientation.type.includes('portrait') ? 'Portrait' : 'Landscape';
        }
        return window.innerWidth >= window.innerHeight ? 'Landscape' : 'Portrait';
    }

    getGpuRenderer() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return 'WebGL tidak tersedia';

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return gl.getParameter(gl.RENDERER) || 'Tidak diekspos browser';

            return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Tidak diekspos browser';
        } catch (error) {
            return 'Tidak diketahui';
        }
    }

    detectWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (error) {
            return false;
        }
    }

    testLocalStorage() {
        try {
            localStorage.setItem('__st_test__', '1');
            localStorage.removeItem('__st_test__');
            return true;
        } catch (error) {
            return false;
        }
    }

    getConnectionInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        if (!connection) {
            return { supported: false };
        }

        return {
            effectiveType: (connection.effectiveType || 'tidak diketahui').toUpperCase(),
            downlink: connection.downlink ? `± ${connection.downlink} Mbps` : 'Tidak diketahui',
            rtt: typeof connection.rtt === 'number' ? `${connection.rtt} ms` : 'Tidak diketahui',
            saveData: !!connection.saveData
        };
    }

    getPerformanceInfo() {
        const result = {};
        const navEntry = performance.getEntriesByType
            ? performance.getEntriesByType('navigation')[0]
            : null;

        if (navEntry) {
            result.loadTime = this.formatMs(navEntry.loadEventEnd);
            result.domReady = this.formatMs(navEntry.domContentLoadedEventEnd);
            result.transferSize = navEntry.transferSize ? `${(navEntry.transferSize / 1024).toFixed(1)} KB` : 'Tidak diketahui';
        } else if (performance.timing) {
            const timing = performance.timing;
            result.loadTime = this.formatMs(timing.loadEventEnd - timing.navigationStart);
            result.domReady = this.formatMs(timing.domContentLoadedEventEnd - timing.navigationStart);
        }

        const paint = performance.getEntriesByType
            ? performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')
            : null;
        result.firstPaint = paint ? this.formatMs(paint.startTime) : 'Tidak tersedia';

        if (performance.memory && performance.memory.usedJSHeapSize) {
            result.jsHeap = `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB`;
        }

        return result;
    }

    formatMs(value) {
        if (!Number.isFinite(value) || value <= 0) return 'Tidak tersedia';
        return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
    }

    /* ----------------------------------------------------------------------
       PENGUKURAN REFRESH RATE (relevan untuk tes monitor)
       ---------------------------------------------------------------------- */

    measureRefreshRate() {
        if (this.refreshRate || this.refreshRatePending) return;
        this.refreshRatePending = true;

        const timestamps = [];
        const SAMPLE_COUNT = 60;

        const sample = time => {
            timestamps.push(time);
            if (timestamps.length <= SAMPLE_COUNT) {
                requestAnimationFrame(sample);
                return;
            }

            const deltas = timestamps.slice(1).map((t, i) => t - timestamps[i]).filter(d => d > 0);
            const median = deltas.sort((a, b) => a - b)[Math.floor(deltas.length / 2)];

            this.refreshRate = median ? Math.round(1000 / median) : null;
            this.refreshRatePending = false;

            if (this.refreshRate) {
                this.info.screen.refreshRate = `${this.refreshRate} Hz`;
                this.displayInfo();
            }
        };

        requestAnimationFrame(sample);
    }

    /* ----------------------------------------------------------------------
       RENDER
       ---------------------------------------------------------------------- */

    get sections() {
        return [
            {
                title: 'Browser',
                icon: 'globe',
                color: 'var(--cyan)',
                data: this.info.browser,
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
                color: 'var(--violet)',
                data: this.info.screen,
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
                data: this.info.hardware,
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
                data: this.info.apis,
                labels: {
                    webAudio: 'Web Audio',
                    webGL: 'WebGL',
                    canvas: 'Canvas 2D',
                    localStorage: 'Local Storage',
                    serviceWorker: 'Service Worker',
                    webRTC: 'WebRTC',
                    fullscreen: 'Fullscreen',
                    clipboard: 'Clipboard',
                    geolocation: 'Geolocation',
                    notifications: 'Notifications'
                }
            },
            {
                title: 'Koneksi',
                icon: 'wifi',
                color: 'var(--blue)',
                data: this.info.connection,
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
                data: this.info.performance,
                labels: {
                    loadTime: 'Waktu muat',
                    domReady: 'DOM siap',
                    firstPaint: 'First paint',
                    transferSize: 'Ukuran transfer',
                    jsHeap: 'JS heap terpakai'
                }
            }
        ];
    }

    displayInfo() {
        const container = document.getElementById('system-info-container');
        if (!container) return;

        // Segarkan nilai yang bisa berubah (viewport, online, orientasi)
        this.gatherInfo();

        const cards = this.sections
            .map(section => this.createInfoCard(section))
            .join('');

        container.innerHTML = `<div class="info-grid">${cards}</div>`;

        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            lucide.createIcons();
        }

        this.measureRefreshRate();
    }

    createInfoCard({ title, icon, color, data, labels }) {
        const keys = Object.keys(labels).filter(key => data[key] !== undefined);

        const rows = keys.map(key => {
            const raw = data[key];
            const value = typeof raw === 'boolean'
                ? `<span class="status-badge ${raw ? 'is-yes' : 'is-no'}">${raw ? 'Ya' : 'Tidak'}</span>`
                : this.escapeHtml(String(raw));

            return `<div class="info-row">
                <span class="info-key">${this.escapeHtml(labels[key])}</span>
                <span class="info-val">${value}</span>
            </div>`;
        }).join('');

        return `<article class="info-card" style="--ic-color:${color}">
            <header class="info-card-head">
                <span class="info-card-icon"><i data-lucide="${icon}"></i></span>
                <span class="info-card-title">${this.escapeHtml(title)}</span>
            </header>
            <div class="info-rows">${rows}</div>
        </article>`;
    }

    escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ----------------------------------------------------------------------
       EKSPOR
       ---------------------------------------------------------------------- */

    toJson() {
        return JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                userAgent: navigator.userAgent,
                ...this.info
            },
            null,
            2
        );
    }

    notify(message, type) {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(message);
        }
    }

    async copyInfo() {
        const text = this.toJson();

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const area = document.createElement('textarea');
                area.value = text;
                area.setAttribute('readonly', '');
                area.style.position = 'fixed';
                area.style.opacity = '0';
                document.body.appendChild(area);
                area.select();
                document.execCommand('copy');
                area.remove();
            }
            this.notify('Informasi sistem disalin ke clipboard', 'success');
        } catch (error) {
            console.error('Gagal menyalin:', error);
            this.notify('Gagal menyalin ke clipboard', 'error');
        }
    }

    exportInfo() {
        try {
            const blob = new Blob([this.toJson()], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `serba-tester-system-info-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);

            this.notify('Berkas system info diunduh', 'success');
        } catch (error) {
            console.error('Gagal mengekspor:', error);
            this.notify('Gagal mengekspor system info', 'error');
        }
    }
}

// Instance global yang dipakai oleh index.html dan script.js
const systemInfo = new SystemInfo();
window.systemInfo = systemInfo;
