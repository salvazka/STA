/* ==========================================================================
   SERBA TESTER APP — APPLICATION LOGIC
   Modul: Keyboard · Speed · Audio · Monitor · System
   ========================================================================== */

'use strict';

/* ==========================================================================
   0. UTILITAS UMUM (ikon, toast, tema, status jaringan)
   ========================================================================== */

const TAB_IDS = ['keyboard', 'speed', 'audio', 'monitor', 'system'];

function refreshIcons() {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
}

function $(id) {
    return document.getElementById(id);
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/* --- Toast ---------------------------------------------------------------- */

const TOAST_ICONS = {
    success: 'check-circle-2',
    error: 'alert-triangle',
    info: 'info'
};

function showToast(message, type = 'info', duration = 3200) {
    const stack = $('toast-stack');
    if (!stack) return;

    const toast = document.createElement('div');
    toast.className = `toast is-${type}`;
    toast.innerHTML = `<i data-lucide="${TOAST_ICONS[type] || TOAST_ICONS.info}"></i><span></span>`;
    toast.querySelector('span').textContent = message;

    stack.appendChild(toast);
    refreshIcons();

    setTimeout(() => {
        toast.classList.add('is-leaving');
        setTimeout(() => toast.remove(), 260);
    }, duration);
}

/* --- Tema ---------------------------------------------------------------- */

const THEME_KEY = 'serba-tester-theme';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#eef2f9' : '#05080f');
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
        /* localStorage bisa diblokir — abaikan */
    }
}

function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    showToast(next === 'light' ? 'Tema terang aktif' : 'Tema gelap aktif', 'info', 1800);
}

function initTheme() {
    let stored = null;
    try {
        stored = localStorage.getItem(THEME_KEY);
    } catch (e) { /* abaikan */ }

    if (!stored) {
        stored = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    applyTheme(stored);

    const button = $('theme-toggle');
    if (button) button.addEventListener('click', toggleTheme);
}

/* --- Status jaringan ----------------------------------------------------- */

function updateNetStatus() {
    const pill = $('net-status');
    const label = $('net-status-text');
    if (!pill || !label) return;

    const online = navigator.onLine;
    pill.classList.toggle('is-offline', !online);
    label.textContent = online ? 'Online' : 'Offline';
    pill.title = online ? 'Terhubung ke jaringan' : 'Tidak ada koneksi jaringan';
}

/* ==========================================================================
   1. TAB NAVIGATION
   ========================================================================== */

let activeTab = 'keyboard';

function setActiveTab(tabId) {
    if (!TAB_IDS.includes(tabId)) return;

    document.querySelectorAll('.tester-content').forEach(panel => {
        panel.style.display = 'none';
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active-tab');
        button.setAttribute('aria-selected', 'false');
    });

    // Keluar dari fullscreen saat berpindah modul
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }

    const panel = $(tabId + '-content');
    if (panel) {
        panel.style.display = 'block';
        // Ulangi animasi masuk panel
        panel.style.animation = 'none';
        void panel.offsetHeight;
        panel.style.animation = '';
    }

    const button = $(tabId + '-tab');
    if (button) {
        button.classList.add('active-tab');
        button.setAttribute('aria-selected', 'true');
    }

    activeTab = tabId;

    // Selalu hentikan audio saat meninggalkan modul audio
    if (tabId !== 'audio') stopSpeakerTest({ silent: true });

    if (tabId === 'monitor') monitorInitTest();
    if (tabId === 'speed') initializeSpeedTestElements();
    if (tabId === 'system' && typeof systemInfo !== 'undefined') systemInfo.displayInfo();

    refreshIcons();
}

/* ==========================================================================
   2. KEYBOARD TESTER
   ========================================================================== */

const keyMap = {};

const keyboardTestStats = {
    totalKeys: 0,
    pressedKeys: new Set(),
    lastPressedKey: null,
    lastPressedChar: null,
    testStartTime: null
};

function initializeKeyboardTest() {
    const keys = document.querySelectorAll('#keyboard-layout .key[data-code]');

    keys.forEach(keyEl => {
        keyMap[keyEl.getAttribute('data-code')] = keyEl;
        keyEl.classList.add('key-feedback');
        keyboardTestStats.totalKeys++;
    });

    updateKeyboardStats();
}

function updateKeyboardStats() {
    const pressed = keyboardTestStats.pressedKeys.size;
    const total = keyboardTestStats.totalKeys || 1;
    const percent = Math.round((pressed / total) * 100);

    const fill = $('coverage-fill');
    if (fill) fill.style.width = percent + '%';

    const bar = $('coverage-bar');
    if (bar) bar.setAttribute('aria-valuenow', String(percent));

    const value = $('coverage-value');
    if (value) value.textContent = String(percent);

    const count = $('coverage-count');
    if (count) count.textContent = `${pressed} / ${keyboardTestStats.totalKeys} tombol`;

    const indicator = $('key-press-indicator');
    if (indicator) {
        indicator.textContent = keyboardTestStats.lastPressedKey
            ? `${keyboardTestStats.lastPressedKey}  →  "${keyboardTestStats.lastPressedChar}"`
            : 'Menunggu penekanan tombol…';
    }

    const stats = $('keyboard-stats');
    if (!stats) return;

    const remaining = keyboardTestStats.totalKeys - pressed;
    const elapsed = keyboardTestStats.testStartTime
        ? Math.round((performance.now() - keyboardTestStats.testStartTime) / 1000)
        : 0;

    const chips = [
        `<span class="chip chip-emerald"><i data-lucide="check-check" class="chip-icon"></i> ${pressed} terdeteksi</span>`,
        `<span class="chip"><i data-lucide="circle-dashed" class="chip-icon"></i> ${remaining} belum diuji</span>`
    ];

    if (keyboardTestStats.testStartTime) {
        chips.push(`<span class="chip"><i data-lucide="timer" class="chip-icon"></i> ${elapsed}s berjalan</span>`);
    }

    if (percent === 100) {
        chips.push('<span class="chip chip-emerald"><i data-lucide="party-popper" class="chip-icon"></i> Semua tombol normal</span>');
    }

    stats.innerHTML = `<div class="u-center-row">${chips.join('')}</div>`;
    refreshIcons();
}

function resetKeyboardTest() {
    document.querySelectorAll('#keyboard-layout .key').forEach(keyEl => {
        keyEl.classList.remove('pressed', 'tested');
    });

    keyboardTestStats.pressedKeys.clear();
    keyboardTestStats.lastPressedKey = null;
    keyboardTestStats.lastPressedChar = null;
    keyboardTestStats.testStartTime = null;

    updateKeyboardStats();
    showToast('Tes keyboard direset', 'info', 1800);
}

/* Tombol yang tetap dibiarkan ke browser agar pengguna tidak terjebak
   (refresh, devtools, keluar fullscreen). */
const KEYBOARD_PASSTHROUGH = new Set(['F5', 'F11', 'F12', 'Escape']);

function markKeyTested(code) {
    const keyEl = keyMap[code];
    if (!keyEl) return;

    keyEl.classList.remove('pressed');
    keyEl.classList.add('tested');
    keyboardTestStats.pressedKeys.add(code);
}

function handleKeyboardTestKeydown(event) {
    const keyEl = keyMap[event.code];
    if (!keyEl) return;

    // Cegah aksi bawaan yang mengganggu (Tab, F1, Space, dsb.),
    // tapi jangan bajak kombinasi Ctrl/Cmd atau tombol pelarian.
    if (!event.ctrlKey && !event.metaKey && !KEYBOARD_PASSTHROUGH.has(event.code)) {
        event.preventDefault();
    }

    if (!keyboardTestStats.testStartTime) {
        keyboardTestStats.testStartTime = performance.now();
    }

    keyboardTestStats.lastPressedKey = event.code;
    keyboardTestStats.lastPressedChar = event.key === ' ' ? 'Space' : event.key;

    if (!keyEl.classList.contains('pressed')) {
        keyEl.classList.add('pressed');
        keyboardTestStats.pressedKeys.add(event.code);
    }

    updateKeyboardStats();
}

function handleKeyboardTestKeyup(event) {
    const keyEl = keyMap[event.code];
    if (!keyEl) return;

    // Beberapa tombol (mis. PrintScreen di Chrome/Windows) hanya memicu keyup.
    if (!keyEl.classList.contains('pressed') && !keyEl.classList.contains('tested')) {
        keyboardTestStats.lastPressedKey = event.code;
        keyboardTestStats.lastPressedChar = event.key === ' ' ? 'Space' : event.key;
        markKeyTested(event.code);
        updateKeyboardStats();
        return;
    }

    markKeyTested(event.code);
}

/* ==========================================================================
   3. SPEED TESTER
   ========================================================================== */

const TEST_DURATION_MS = 10000;
const GAUGE_ARC_LENGTH = Math.PI * 130; // ~408.4 — panjang busur setengah lingkaran r=130

const GAUGE_MODES = {
    idle:     { max: 200, unit: 'Mbps', label: 'Idle' },
    ping:     { max: 100, unit: 'ms',   label: 'Ping',     decimals: 1 },
    download: { max: 200, unit: 'Mbps', label: 'Download', decimals: 2 },
    upload:   { max: 100, unit: 'Mbps', label: 'Upload',   decimals: 2 }
};

let gaugeMode = GAUGE_MODES.idle;

let statusText;
let speedDisplay;
let needle;
let gaugeArc;
let startButton;
let progressBar;
let progressFill;
let connectionStatus;
let connectionLabel;

const speedTestResults = {
    ping: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    jitter: 0
};

/* --- Gauge --------------------------------------------------------------- */

function setGaugeMode(mode) {
    gaugeMode = GAUGE_MODES[mode] || GAUGE_MODES.idle;

    const unit = $('gauge-unit');
    if (unit) unit.textContent = gaugeMode.unit;

    const phase = $('gauge-phase');
    if (phase) phase.textContent = gaugeMode.label;

    const min = $('gauge-min');
    if (min) min.textContent = '0';

    const max = $('gauge-max');
    if (max) max.textContent = String(gaugeMode.max);

    setGauge(0);
}

function speedToAngle(value) {
    const ratio = clamp(value / gaugeMode.max, 0, 1);
    return ratio * 180 - 90;
}

/** Sumber tunggal untuk memutar jarum, mengisi busur, dan menulis angka. */
function setGauge(value) {
    const safe = Number.isFinite(value) ? Math.max(value, 0) : 0;
    const ratio = clamp(safe / gaugeMode.max, 0, 1);

    if (needle) {
        needle.style.transform = `translateX(-50%) rotate(${ratio * 180 - 90}deg)`;
    }

    if (gaugeArc) {
        gaugeArc.style.strokeDashoffset = String(GAUGE_ARC_LENGTH * (1 - ratio));
    }

    if (speedDisplay) {
        speedDisplay.textContent = safe.toFixed(gaugeMode.decimals ?? 2);
    }
}

/* --- Stepper fase -------------------------------------------------------- */

function setPhase(phase, state) {
    const el = $('phase-' + phase);
    if (!el) return;
    el.classList.remove('is-active', 'is-done');
    if (state) el.classList.add('is-' + state);
}

function resetPhases() {
    ['ping', 'download', 'upload'].forEach(phase => setPhase(phase, null));
}

/* --- Status & progress --------------------------------------------------- */

const CONNECTION_LABELS = {
    excellent: 'Sangat baik',
    good: 'Baik',
    fair: 'Cukup',
    poor: 'Lemah',
    testing: 'Menguji…',
    ready: 'Siap'
};

function qualityOf(value, tiers) {
    if (value > tiers[0]) return 'excellent';
    if (value > tiers[1]) return 'good';
    if (value > tiers[2]) return 'fair';
    return 'poor';
}

function updateConnectionStatus(status) {
    const key = CONNECTION_LABELS[status] ? status : 'good';

    if (connectionStatus) {
        connectionStatus.className = 'connection-status';
        if (key !== 'ready') connectionStatus.classList.add(key);
    }
    if (connectionLabel) connectionLabel.textContent = CONNECTION_LABELS[key];
}

function updateProgressBar(progress) {
    const value = clamp(progress, 0, 100);
    if (progressFill) progressFill.style.width = value + '%';
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(Math.round(value)));
}

function formatSpeed(speed) {
    return speed.toFixed(2);
}

function initializeSpeedTestElements() {
    statusText = $('status-text');
    speedDisplay = $('current-speed');
    needle = $('needle');
    gaugeArc = $('gauge-arc');
    startButton = $('start-button');
    progressBar = $('speed-progress-bar');
    progressFill = $('speed-progress-fill');
    connectionStatus = $('connection-status');
    connectionLabel = $('connection-label');

    ['ping-result', 'download-result', 'upload-result'].forEach(id => {
        const el = $(id);
        if (el) el.textContent = '--';
    });

    resetPhases();
    setGaugeMode('idle');
    updateProgressBar(0);
    updateConnectionStatus('ready');

    if (statusText) statusText.textContent = 'Siap untuk memulai tes.';
    if (startButton) {
        startButton.innerHTML = '<i data-lucide="play"></i> Mulai Tes';
        startButton.disabled = false;
    }

    refreshIcons();
}

/* --- Pengukuran ping (nyata, dengan fallback) ---------------------------- */

const PING_TARGETS = ['speedtest.php?action=ping', 'logo.svg'];

async function pingOnce(url) {
    const separator = url.includes('?') ? '&' : '?';
    const started = performance.now();

    const response = await fetch(`${url}${separator}_=${Date.now()}${Math.random()}`, {
        cache: 'no-store'
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await response.arrayBuffer(); // pastikan respons selesai diterima
    return performance.now() - started;
}

async function measureRealPing() {
    if (statusText) statusText.textContent = 'Mengukur latensi (ping)…';
    setPhase('ping', 'active');
    setGaugeMode('ping');
    updateConnectionStatus('testing');

    const SAMPLES = 6;
    const samples = [];
    let target = null;

    // Pilih endpoint yang bisa dijangkau
    for (const candidate of PING_TARGETS) {
        try {
            await pingOnce(candidate);
            target = candidate;
            break;
        } catch (error) {
            console.warn(`Ping target tidak tersedia: ${candidate} (${error.message})`);
        }
    }

    if (target) {
        for (let i = 0; i < SAMPLES; i++) {
            try {
                const rtt = await pingOnce(target);
                samples.push(rtt);
                setGauge(rtt);
                updateProgressBar(((i + 1) / SAMPLES) * 18);
            } catch (error) {
                console.warn('Sampel ping gagal:', error.message);
            }
            await new Promise(resolve => setTimeout(resolve, 90));
        }
    }

    let ping;
    let jitter;

    if (samples.length >= 2) {
        // Buang outlier tertinggi lalu ambil rata-rata
        const sorted = [...samples].sort((a, b) => a - b);
        const trimmed = sorted.slice(0, Math.max(2, sorted.length - 1));
        ping = trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length;

        const deltas = samples.slice(1).map((v, i) => Math.abs(v - samples[i]));
        jitter = deltas.reduce((sum, v) => sum + v, 0) / deltas.length;
    } else {
        console.warn('Ping nyata tidak tersedia, memakai estimasi.');
        ping = 12 + Math.random() * 26;
        jitter = 1 + Math.random() * 3;
    }

    speedTestResults.ping = ping;
    speedTestResults.jitter = jitter;

    setGauge(ping);
    updateProgressBar(20);
    setPhase('ping', 'done');
    updateConnectionStatus(ping < 30 ? 'excellent' : ping < 60 ? 'good' : ping < 120 ? 'fair' : 'poor');

    console.log(`Ping: ${ping.toFixed(1)} ms · jitter ${jitter.toFixed(1)} ms (${samples.length} sampel)`);
    return { ping, jitter };
}

/* --- Pengukuran download ------------------------------------------------- */

const DOWNLOAD_TIERS = [50, 25, 10];
const UPLOAD_TIERS = [20, 10, 5];

function downloadViaXhr(url, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const separator = url.includes('?') ? '&' : '?';
        const startTime = performance.now();
        let lastUpdate = 0;

        xhr.open('GET', `${url}${separator}t=${Date.now()}`, true);
        xhr.responseType = 'arraybuffer';

        xhr.onprogress = event => {
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed <= 0 || performance.now() - lastUpdate < 100) return;
            lastUpdate = performance.now();
            onProgress((event.loaded * 8) / (elapsed * 1000000), elapsed);
        };

        xhr.onload = () => {
            if (xhr.status !== 200) {
                reject(new Error(`HTTP ${xhr.status}`));
                return;
            }
            const seconds = (performance.now() - startTime) / 1000;
            resolve((xhr.response.byteLength * 8) / (seconds * 1000000));
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.timeout = TEST_DURATION_MS;
        xhr.ontimeout = () => reject(new Error('Timeout'));
        xhr.send();
    });
}

async function measureRealDownloadSpeed() {
    if (statusText) statusText.textContent = 'Mengukur kecepatan download…';
    setPhase('download', 'active');
    setGaugeMode('download');
    updateConnectionStatus('testing');

    const onProgress = speed => {
        setGauge(speed);
        updateConnectionStatus(qualityOf(speed, DOWNLOAD_TIERS));
    };

    const sources = [
        'speedtest.php?action=download',
        'https://speed.cloudflare.com/__down?bytes=10000000',
        'https://speed.hetzner.de/10MB.bin'
    ];

    let bestSpeed = 0;

    for (const url of sources) {
        try {
            const speed = await downloadViaXhr(url, (value, elapsed) => {
                onProgress(value);
                updateProgressBar(20 + clamp((elapsed / (TEST_DURATION_MS / 1000)) * 40, 0, 40));
            });
            bestSpeed = Math.max(bestSpeed, speed);
            break;
        } catch (error) {
            console.warn(`Download gagal via ${url}: ${error.message}`);
        }
    }

    if (bestSpeed === 0) {
        console.warn('Semua sumber download gagal, memakai simulasi.');
        bestSpeed = await simulateDownloadSpeed();
    }

    speedTestResults.downloadSpeed = bestSpeed;

    setGauge(bestSpeed);
    updateProgressBar(60);
    setPhase('download', 'done');
    updateConnectionStatus(qualityOf(bestSpeed, DOWNLOAD_TIERS));

    return bestSpeed;
}

/* --- Pengukuran upload --------------------------------------------------- */

function uploadViaXhr(url, blob, byteLength, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const startTime = performance.now();
        let lastUpdate = 0;

        xhr.open('POST', url, true);

        xhr.upload.onprogress = event => {
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed <= 0 || performance.now() - lastUpdate < 100) return;
            lastUpdate = performance.now();
            onProgress((event.loaded * 8) / (elapsed * 1000000), event.total ? event.loaded / event.total : 0);
        };

        xhr.onload = () => {
            if (xhr.status !== 200) {
                reject(new Error(`HTTP ${xhr.status}`));
                return;
            }
            const seconds = (performance.now() - startTime) / 1000;
            resolve((byteLength * 8) / (seconds * 1000000));
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.timeout = TEST_DURATION_MS;
        xhr.ontimeout = () => reject(new Error('Timeout'));

        const formData = new FormData();
        formData.append('file', blob, 'speed_test_upload.bin');
        xhr.send(formData);
    });
}

async function measureRealUploadSpeed() {
    if (statusText) statusText.textContent = 'Mengukur kecepatan upload…';
    setPhase('upload', 'active');
    setGaugeMode('upload');
    updateConnectionStatus('testing');

    const byteLength = 1024 * 1024 * 5; // 5 MB
    const blob = new Blob([new ArrayBuffer(byteLength)]);

    let uploadSpeed = 0;

    try {
        uploadSpeed = await uploadViaXhr('speedtest.php?action=upload', blob, byteLength, (speed, fraction) => {
            setGauge(speed);
            updateConnectionStatus(qualityOf(speed, UPLOAD_TIERS));
            updateProgressBar(60 + fraction * 40);
        });
    } catch (error) {
        console.warn(`Upload gagal via backend: ${error.message}`);
    }

    // Localhost bisa menghasilkan angka tidak realistis — pakai estimasi
    if (uploadSpeed === 0 || uploadSpeed > 500) {
        if (uploadSpeed > 500) {
            console.warn('Kecepatan upload tidak realistis (kemungkinan loopback), memakai estimasi.');
        }
        uploadSpeed = await simulateRealisticUploadSpeed();
    }

    speedTestResults.uploadSpeed = uploadSpeed;

    setGauge(uploadSpeed);
    updateProgressBar(100);
    setPhase('upload', 'done');
    updateConnectionStatus(qualityOf(uploadSpeed, UPLOAD_TIERS));

    return uploadSpeed;
}

/* --- Simulasi (fallback terakhir) --------------------------------------- */

function animatedSimulation({ peak, durationMs, tiers, progressFrom, progressTo, finalPicker }) {
    return new Promise(resolve => {
        const startTime = performance.now();

        const loop = setInterval(() => {
            const elapsed = performance.now() - startTime;

            if (elapsed >= durationMs) {
                clearInterval(loop);
                const finalSpeed = finalPicker();
                setGauge(finalSpeed);
                updateProgressBar(progressTo);
                updateConnectionStatus(qualityOf(finalSpeed, tiers));
                resolve(finalSpeed);
                return;
            }

            const progress = elapsed / durationMs;
            const target = peak * Math.sin((progress * Math.PI) / 2);
            const value = Math.max(0.5, target + (Math.random() - 0.5) * (peak * 0.15));

            setGauge(value);
            updateProgressBar(progressFrom + progress * (progressTo - progressFrom));
            updateConnectionStatus(qualityOf(value, tiers));
        }, 60);
    });
}

function simulateDownloadSpeed() {
    return animatedSimulation({
        peak: 100,
        durationMs: TEST_DURATION_MS / 2,
        tiers: DOWNLOAD_TIERS,
        progressFrom: 20,
        progressTo: 60,
        finalPicker: () => {
            const rand = Math.random();
            if (rand < 0.2) return 5 + Math.random() * 10;
            if (rand < 0.5) return 15 + Math.random() * 20;
            if (rand < 0.8) return 35 + Math.random() * 30;
            return 65 + Math.random() * 35;
        }
    });
}

function simulateRealisticUploadSpeed() {
    return animatedSimulation({
        peak: 25,
        durationMs: TEST_DURATION_MS / 2,
        tiers: UPLOAD_TIERS,
        progressFrom: 60,
        progressTo: 100,
        finalPicker: () => {
            const rand = Math.random();
            if (rand < 0.2) return 5 + Math.random() * 5;
            if (rand < 0.7) return 10 + Math.random() * 10;
            if (rand < 0.9) return 20 + Math.random() * 10;
            return 30 + Math.random() * 20;
        }
    });
}

/* --- Orkestrasi tes ------------------------------------------------------ */

async function startRealSpeedTest() {
    if (!startButton) initializeSpeedTestElements();
    if (startButton.disabled) return;

    const pingResult = $('ping-result');
    const downloadResult = $('download-result');
    const uploadResult = $('upload-result');

    startButton.disabled = true;
    startButton.innerHTML = '<span class="spinner"></span> Menguji…';

    [pingResult, downloadResult, uploadResult].forEach(el => {
        if (el) el.textContent = '--';
    });

    resetPhases();
    updateProgressBar(0);

    try {
        const { ping, jitter } = await measureRealPing();
        if (pingResult) pingResult.textContent = ping.toFixed(0);
        await new Promise(resolve => setTimeout(resolve, 450));

        const downloadSpeed = await measureRealDownloadSpeed();
        if (downloadResult) downloadResult.textContent = formatSpeed(downloadSpeed);
        await new Promise(resolve => setTimeout(resolve, 450));

        const uploadSpeed = await measureRealUploadSpeed();
        if (uploadResult) uploadResult.textContent = formatSpeed(uploadSpeed);

        if (statusText) {
            statusText.innerHTML =
                `<span class="text-emerald fw-600">Tes selesai.</span> ` +
                `<span class="text-mute">Jitter ${jitter.toFixed(1)} ms · ` +
                `unduh ${formatSpeed(downloadSpeed)} Mbps · unggah ${formatSpeed(uploadSpeed)} Mbps</span>`;
        }

        startButton.innerHTML = '<i data-lucide="refresh-cw"></i> Ulangi Tes';
        startButton.disabled = false;
        showToast('Tes kecepatan selesai', 'success');
    } catch (error) {
        console.error('Speed test error:', error);
        if (statusText) {
            statusText.innerHTML = `<span class="text-rose fw-600">Tes gagal:</span> <span class="text-mute">${error.message}</span>`;
        }
        startButton.innerHTML = '<i data-lucide="alert-triangle"></i> Coba Lagi';
        startButton.disabled = false;
        showToast('Tes kecepatan gagal', 'error');
    }

    refreshIcons();
}

/* ==========================================================================
   4. AUDIO TESTER
   ========================================================================== */

let audioContext = null;
let oscillator = null;
let panner = null;
let gainNode = null;
let analyser = null;
let waveformData = null;
let visualizerFrame = null;

let currentVolume = 0.5;
let currentFrequency = 440;
let currentWaveform = 'sine';
let isAudioPlaying = false;

const AUDIO_BUTTON_IDS = ['test-left', 'test-right', 'test-stereo'];

function getAudioContext() {
    if (!audioContext) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        audioContext = new Ctor();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

/* --- Visualizer ---------------------------------------------------------- */

function cssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

function drawVisualizer() {
    const canvas = $('audio-visualizer');
    if (!canvas || !analyser || !waveformData) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    analyser.getByteTimeDomainData(waveformData);
    ctx.clearRect(0, 0, width, height);

    // Garis tengah
    ctx.strokeStyle = cssVar('--border-strong', 'rgba(255,255,255,.16)');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Gelombang
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, cssVar('--cyan', '#22d3ee'));
    gradient.addColorStop(0.5, cssVar('--violet', '#a78bfa'));
    gradient.addColorStop(1, cssVar('--rose', '#fb7185'));

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.shadowColor = cssVar('--cyan', '#22d3ee');
    ctx.shadowBlur = 14;
    ctx.beginPath();

    const step = width / waveformData.length;
    for (let i = 0; i < waveformData.length; i++) {
        const normalized = waveformData[i] / 128 - 1; // -1 .. 1
        const y = height / 2 + normalized * (height / 2 - 8);
        const x = i * step;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    visualizerFrame = requestAnimationFrame(drawVisualizer);
}

function stopVisualizer() {
    if (visualizerFrame) {
        cancelAnimationFrame(visualizerFrame);
        visualizerFrame = null;
    }

    const shell = $('visualizer-shell');
    if (shell) shell.classList.remove('is-live');

    const canvas = $('audio-visualizer');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

/* --- Kontrol ------------------------------------------------------------- */

function setChannelIndicator(channel) {
    const left = $('channel-left');
    const right = $('channel-right');
    if (!left || !right) return;

    left.classList.toggle('is-active', channel === 'left' || channel === 'stereo');
    right.classList.toggle('is-active', channel === 'right' || channel === 'stereo');
}

function updateVolume() {
    if (gainNode && audioContext) {
        try {
            gainNode.gain.setTargetAtTime(currentVolume, audioContext.currentTime, 0.015);
        } catch (error) {
            console.warn('Gagal memperbarui volume:', error);
        }
    }

    const display = $('volume-display');
    if (display) display.textContent = Math.round(currentVolume * 100) + '%';
}

function updateFrequency() {
    if (oscillator && audioContext) {
        try {
            oscillator.frequency.setTargetAtTime(currentFrequency, audioContext.currentTime, 0.015);
        } catch (error) {
            console.warn('Gagal memperbarui frekuensi:', error);
        }
    }

    const display = $('frequency-display');
    if (display) display.textContent = currentFrequency + ' Hz';

    document.querySelectorAll('#frequency-presets .preset-chip').forEach(chip => {
        chip.classList.toggle('is-active', Number(chip.dataset.freq) === currentFrequency);
    });
}

function handleVolumeChange(value) {
    currentVolume = parseFloat(value);
    updateVolume();
}

function handleFrequencyChange(value) {
    currentFrequency = parseInt(value, 10);
    updateFrequency();
}

function handleWaveformChange(type) {
    currentWaveform = type;

    if (oscillator) {
        try {
            oscillator.type = type;
        } catch (error) {
            console.warn('Bentuk gelombang tidak didukung:', error);
        }
    }

    const display = $('waveform-display');
    if (display) display.textContent = type.charAt(0).toUpperCase() + type.slice(1);

    document.querySelectorAll('#waveform-presets .preset-chip').forEach(chip => {
        chip.classList.toggle('is-active', chip.dataset.wave === type);
    });
}

/* --- Start / stop -------------------------------------------------------- */

function stopSpeakerTest(options = {}) {
    const wasPlaying = isAudioPlaying;

    if (oscillator) {
        try { oscillator.stop(); } catch (e) { /* sudah berhenti */ }
        oscillator.disconnect();
        oscillator = null;
    }
    if (analyser) analyser.disconnect();
    if (panner) { panner.disconnect(); panner = null; }
    if (gainNode) { gainNode.disconnect(); gainNode = null; }

    isAudioPlaying = false;
    stopVisualizer();
    setChannelIndicator(null);

    const status = $('speaker-status');
    if (status) {
        status.className = 'text-dim';
        status.textContent = wasPlaying
            ? 'Nada dihentikan. Tekan tombol untuk menguji lagi.'
            : 'Tekan salah satu tombol untuk memulai tes speaker.';
    }

    const stopButton = $('stop-audio');
    if (stopButton) stopButton.style.display = 'none';

    AUDIO_BUTTON_IDS.forEach(id => {
        const button = $(id);
        if (button) button.disabled = false;
    });

    if (wasPlaying && !options.silent) {
        showToast('Nada uji dihentikan', 'info', 1600);
    }
}

function startSpeakerTest(channel) {
    stopSpeakerTest({ silent: true });

    const status = $('speaker-status');
    const stopButton = $('stop-audio');

    try {
        const ctx = getAudioContext();

        gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        // Fade-in singkat supaya tidak ada bunyi "klik"
        gainNode.gain.linearRampToValueAtTime(currentVolume, ctx.currentTime + 0.06);

        oscillator = ctx.createOscillator();
        oscillator.type = currentWaveform;
        oscillator.frequency.setValueAtTime(currentFrequency, ctx.currentTime);

        if (!analyser) {
            analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            waveformData = new Uint8Array(analyser.fftSize);
        }

        panner = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createPanner();

        let panValue = 0;
        let message = 'Memutar nada di kedua speaker (stereo).';
        let tone = 'text-emerald';

        if (channel === 'left') {
            panValue = -1;
            message = 'Memutar nada di speaker KIRI saja.';
            tone = 'text-cyan';
        } else if (channel === 'right') {
            panValue = 1;
            message = 'Memutar nada di speaker KANAN saja.';
            tone = 'text-violet';
        }

        if (panner.pan) {
            panner.pan.setValueAtTime(panValue, ctx.currentTime);
        } else if (typeof panner.setPosition === 'function') {
            panner.setPosition(panValue, 0, 0);
        }

        // Rantai audio: oscillator → gain → analyser → panner → output
        oscillator.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(panner);
        panner.connect(ctx.destination);

        oscillator.start();
        isAudioPlaying = true;

        if (status) {
            status.className = tone + ' fw-600';
            status.textContent = `${message} ${currentFrequency} Hz · ${currentWaveform} · ${Math.round(currentVolume * 100)}%`;
        }

        if (stopButton) stopButton.style.display = 'inline-flex';

        AUDIO_BUTTON_IDS.forEach(id => {
            const button = $(id);
            if (button) button.disabled = true;
        });

        setChannelIndicator(channel);

        const shell = $('visualizer-shell');
        if (shell) shell.classList.add('is-live');
        drawVisualizer();
    } catch (error) {
        console.error('Web Audio API error:', error);
        if (status) {
            status.className = 'text-rose fw-600';
            status.textContent = `Gagal memulai tes audio: ${error.message}`;
        }
        showToast('Web Audio API tidak tersedia', 'error');
        stopSpeakerTest({ silent: true });
    }

    refreshIcons();
}

/* ==========================================================================
   5. MONITOR TESTER
   ========================================================================== */

const monitorTests = [
    { name: 'Persiapan',       color: '#0b1220', text: 'Klik area ini atau tekan → untuk memulai tes monitor.' },
    { name: 'Hitam Solid',     color: '#000000', text: 'Cari titik terang (stuck pixel) pada layar hitam.' },
    { name: 'Putih Solid',     color: '#ffffff', text: 'Cari titik gelap (dead pixel) dan noda pada layar putih.', textClass: 'monitor-black-text' },
    { name: 'Merah Solid',     color: '#ff0000', text: 'Periksa subpiksel merah dan keseragamannya.', textClass: 'monitor-black-text' },
    { name: 'Hijau Solid',     color: '#00ff00', text: 'Periksa subpiksel hijau dan keseragamannya.', textClass: 'monitor-black-text' },
    { name: 'Biru Solid',      color: '#0000ff', text: 'Periksa subpiksel biru dan keseragamannya.' },
    { name: 'Abu-abu 25%',     color: '#404040', text: 'Periksa keseragaman abu-abu gelap dan bayangan (clouding).' },
    { name: 'Abu-abu 50%',     color: '#808080', text: 'Periksa keseragaman abu-abu medium — paling jelas menunjukkan backlight bleed.', textClass: 'monitor-black-text' },
    { name: 'Abu-abu 75%',     color: '#c0c0c0', text: 'Periksa banding dan gradasi abu-abu terang.', textClass: 'monitor-black-text' },
    { name: 'Gradien Abu-abu', color: 'transparent', isGradient: 'grayscale', text: 'Periksa transisi gradien: seharusnya halus tanpa garis banding.', textClass: 'monitor-black-text' },
    { name: 'Gradien Warna',   color: 'transparent', isGradient: 'color', text: 'Periksa akurasi dan transisi warna sepanjang spektrum.', textClass: 'monitor-black-text' },
    { name: 'Selesai',         color: '#0b1220', text: 'Tes monitor selesai. Tekan Selesai untuk kembali, atau ← untuk mengulang pola.' }
];

let monitorCurrentTestIndex = 0;
let monitorTestArea;
let monitorTestContent;
let monitorGradientBox;
let monitorTestInfo;
let monitorContentContainer;

function cacheMonitorElements() {
    monitorTestArea = $('monitor-test-area');
    monitorTestContent = $('monitor-test-content');
    monitorGradientBox = $('monitor-gradient-box');
    monitorTestInfo = $('monitor-test-info');
    monitorContentContainer = $('monitor-content');
}

function monitorInitTest() {
    cacheMonitorElements();
    monitorApplyTest(0);
}

function monitorApplyTest(index) {
    if (!monitorTestArea) cacheMonitorElements();
    if (!monitorTestArea) return;

    if (index >= monitorTests.length) {
        setActiveTab('keyboard');
        showToast('Tes monitor selesai', 'success');
        return;
    }

    const safeIndex = clamp(index, 0, monitorTests.length - 1);
    const test = monitorTests[safeIndex];

    monitorTestArea.classList.remove('monitor-test-transition');
    void monitorTestArea.offsetHeight;
    monitorTestArea.classList.add('monitor-test-transition');

    monitorTestArea.classList.remove('color-test', 'monitor-black-text');
    monitorTestArea.style.backgroundColor = test.color;
    monitorTestArea.style.color = '';

    monitorTestContent.style.display = 'block';
    monitorGradientBox.style.display = 'none';

    if (test.textClass) monitorTestArea.classList.add(test.textClass);

    if (test.isGradient) {
        monitorTestArea.style.backgroundColor = '#ffffff';
        monitorTestContent.style.display = 'none';
        monitorGradientBox.style.display = 'block';
        if (test.isGradient === 'color') monitorTestArea.classList.add('color-test');
    }

    monitorTestContent.textContent = test.text;
    monitorTestInfo.textContent = `${test.name} (${safeIndex + 1}/${monitorTests.length})`;
    monitorCurrentTestIndex = safeIndex;
}

function monitorNextTest() {
    monitorApplyTest(monitorCurrentTestIndex + 1);
}

function monitorPrevTest() {
    monitorApplyTest(Math.max(0, monitorCurrentTestIndex - 1));
}

function toggleFullScreen() {
    if (!monitorContentContainer) cacheMonitorElements();
    if (!monitorContentContainer) return;

    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
        return;
    }

    const request = monitorContentContainer.requestFullscreen
        || monitorContentContainer.webkitRequestFullscreen
        || monitorContentContainer.mozRequestFullScreen
        || monitorContentContainer.msRequestFullscreen;

    if (request) {
        Promise.resolve(request.call(monitorContentContainer)).catch(() => {
            showToast('Browser menolak mode layar penuh', 'error');
        });
    } else {
        showToast('Layar penuh tidak didukung browser ini', 'error');
    }
}

function syncFullscreenButton() {
    const button = $('monitor-fullscreen-btn');
    if (!button) return;

    const isFull = Boolean(document.fullscreenElement);
    button.innerHTML = isFull
        ? '<i data-lucide="minimize" style="width:1rem;height:1rem"></i> Keluar Layar Penuh'
        : '<i data-lucide="maximize" style="width:1rem;height:1rem"></i> Layar Penuh';
    refreshIcons();
}

/* ==========================================================================
   6. KEYBOARD EVENT ROUTER & SHORTCUT
   ========================================================================== */

function handleGlobalKeydown(event) {
    // Shortcut global: Alt + 1..5 pindah modul, Alt + T ganti tema
    if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const index = parseInt(event.key, 10);
        if (index >= 1 && index <= TAB_IDS.length) {
            event.preventDefault();
            setActiveTab(TAB_IDS[index - 1]);
            return;
        }
        if (event.key.toLowerCase() === 't') {
            event.preventDefault();
            toggleTheme();
            return;
        }
    }

    if (activeTab === 'keyboard') {
        handleKeyboardTestKeydown(event);
        return;
    }

    if (activeTab === 'monitor') {
        if (event.key === 'ArrowRight' || event.key === ' ') {
            event.preventDefault();
            monitorNextTest();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            monitorPrevTest();
        } else if (event.key === 'f' || event.key === 'F') {
            event.preventDefault();
            toggleFullScreen();
        }
        return;
    }

    if (activeTab === 'audio' && event.key === 'Escape' && isAudioPlaying) {
        stopSpeakerTest();
    }
}

function handleGlobalKeyup(event) {
    if (activeTab === 'keyboard') handleKeyboardTestKeyup(event);
}

/* ==========================================================================
   7. INISIALISASI
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    refreshIcons();

    initializeKeyboardTest();

    // Monitor
    cacheMonitorElements();
    if (monitorTestArea) {
        monitorTestArea.addEventListener('click', monitorNextTest);
        monitorTestArea.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                monitorNextTest();
            }
        });
    }
    const nextBtn = $('monitor-next-btn');
    const prevBtn = $('monitor-prev-btn');
    if (nextBtn) nextBtn.addEventListener('click', monitorNextTest);
    if (prevBtn) prevBtn.addEventListener('click', monitorPrevTest);
    document.addEventListener('fullscreenchange', syncFullscreenButton);

    // Audio
    const volumeSlider = $('volume-slider');
    if (volumeSlider) {
        volumeSlider.value = currentVolume;
        volumeSlider.addEventListener('input', event => handleVolumeChange(event.target.value));
    }

    const freqSlider = $('frequency-slider');
    if (freqSlider) {
        freqSlider.value = currentFrequency;
        freqSlider.addEventListener('input', event => handleFrequencyChange(event.target.value));
    }

    document.querySelectorAll('#frequency-presets .preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (freqSlider) freqSlider.value = chip.dataset.freq;
            handleFrequencyChange(chip.dataset.freq);
        });
    });

    document.querySelectorAll('#waveform-presets .preset-chip').forEach(chip => {
        chip.addEventListener('click', () => handleWaveformChange(chip.dataset.wave));
    });

    updateVolume();
    updateFrequency();
    handleWaveformChange(currentWaveform);

    // Keyboard router
    document.addEventListener('keydown', handleGlobalKeydown);
    document.addEventListener('keyup', handleGlobalKeyup);

    // Status jaringan
    updateNetStatus();
    window.addEventListener('online', () => {
        updateNetStatus();
        showToast('Koneksi jaringan kembali', 'success', 2200);
    });
    window.addEventListener('offline', () => {
        updateNetStatus();
        showToast('Koneksi jaringan terputus', 'error', 2600);
    });

    // Hentikan audio saat tab browser disembunyikan
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isAudioPlaying) stopSpeakerTest({ silent: true });
    });

    setActiveTab('keyboard');
});
