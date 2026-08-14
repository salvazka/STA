/* ==========================================================================
   TES KECEPATAN INTERNET — REALTIME
   Ping   : beberapa round-trip, dilaporkan median + jitter
   Download: N stream fetch paralel, ReadableStream dibaca sambil dihitung
   Upload : N stream XHR paralel, HANYA byte yang dikonfirmasi server dihitung

   Catatan akurasi:
   - Throughput dihitung dengan jendela geser 1 detik, bukan selisih 100 ms,
     supaya satu lonjakan sesaat tidak membuat angka (terutama "puncak") meledak.
   - Untuk upload, `xhr.upload.onprogress` TIDAK dipakai sebagai sumber angka.
     `event.loaded` hanya berarti "sudah masuk buffer socket OS", bukan
     "sudah diterima server", sehingga hasilnya jauh lebih tinggi dari kenyataan.
   - Mengukur ke `localhost` berarti mengukur loopback (bukan internet).
     Karena itu target uji otomatis dialihkan ke server publik saat di localhost.
   ========================================================================== */

import { $, $$, clamp, formatMs, formatSpeed, wait } from '../lib/dom.js';
import { createChart } from '../lib/chart.js';
import { refreshIcons } from '../lib/icons.js';
import { showToast } from '../lib/toast.js';

const CONFIG = {
    ping: { samples: 8, gapMs: 70 },
    download: { durationMs: 8000, streams: 4, chunkBytes: 20 * 1024 * 1024 },
    // Chunk kecil: konfirmasi server datang lebih sering sehingga angka live
    // tetap halus, dan tetap aman di bawah batas body Vercel (~4,5 MB).
    upload: { durationMs: 8000, streams: 3, chunkBytes: 1024 * 1024 },
    sampleMs: 100,
    smoothWindowMs: 1000,
    warmupMs: 1500
};

const PROGRESS = {
    ping: { from: 0, to: 15 },
    download: { from: 15, to: 60 },
    upload: { from: 60, to: 100 }
};

const SPEED_STEPS = [10, 25, 50, 100, 250, 500, 1000, 2500];
const PING_STEPS = [25, 50, 100, 250, 500, 1000];

const ARC_LENGTH = Math.PI * 130;

const MODES = {
    idle: { unit: 'Mbps', label: 'Idle', base: 100, decimals: 2, steps: SPEED_STEPS },
    ping: { unit: 'ms', label: 'Ping', base: 50, decimals: 1, steps: PING_STEPS },
    download: { unit: 'Mbps', label: 'Download', base: 100, decimals: 2, steps: SPEED_STEPS },
    upload: { unit: 'Mbps', label: 'Upload', base: 50, decimals: 2, steps: SPEED_STEPS }
};

const QUALITY_LABELS = {
    excellent: 'Sangat baik',
    good: 'Baik',
    fair: 'Cukup',
    poor: 'Lemah',
    testing: 'Menguji…',
    ready: 'Siap'
};

const DOWNLOAD_TIERS = [50, 25, 10];
const UPLOAD_TIERS = [20, 10, 5];

/* ==========================================================================
   TARGET PENGUKURAN
   ========================================================================== */

const rand = () => Math.random().toString(36).slice(2);

const TARGETS = {
    app: {
        label: 'Server aplikasi',
        note: 'Mengukur jalur ke server tempat aplikasi ini di-deploy.',
        ping: () => `/api/ping?r=${rand()}`,
        download: bytes => `/api/download?bytes=${bytes}&r=${rand()}`,
        upload: () => '/api/upload'
    },
    cloudflare: {
        label: 'Cloudflare',
        note: 'Mengukur ke server publik Cloudflare terdekat — mendekati hasil speedtest umum.',
        ping: () => `https://speed.cloudflare.com/__down?bytes=1&r=${rand()}`,
        download: bytes => `https://speed.cloudflare.com/__down?bytes=${bytes}&r=${rand()}`,
        upload: () => 'https://speed.cloudflare.com/__up'
    }
};

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0', '']);

/** Apakah aplikasi diakses dari mesin ini sendiri (loopback)? */
function isLoopback() {
    return location.protocol === 'file:' || LOOPBACK_HOSTS.has(location.hostname);
}

// Di localhost, mengukur ke /api = mengukur RAM, bukan internet.
let targetId = isLoopback() ? 'cloudflare' : 'app';

const target = () => TARGETS[targetId];

function renderTargetNote() {
    $$('#speed-targets .preset-chip').forEach(chip => {
        chip.classList.toggle('is-active', chip.dataset.target === targetId);
    });

    const note = $('target-note');
    if (!note) return;

    if (targetId === 'app' && isLoopback()) {
        note.className = 'target-note is-warning';
        note.textContent = 'Peringatan: aplikasi berjalan di localhost, jadi ini mengukur loopback '
            + '(kecepatan RAM/CPU), bukan koneksi internet Anda. Angkanya akan sangat tinggi dan tidak berarti.';
        return;
    }

    note.className = 'target-note';
    note.textContent = target().note;
}

/* ==========================================================================
   STATE
   ========================================================================== */

let chart = null;
let gauge = { ...MODES.idle, max: MODES.idle.base };

const run = {
    active: false,
    controller: null,
    phase: 'idle',
    bytes: 0,          // byte yang sudah PASTI terkirim/diterima
    peak: 0,
    startedAt: 0,
    lastDataAt: 0,     // kapan byte terakhir dikonfirmasi
    markBytes: null,   // titik awal pengukuran (setelah warm-up)
    markTime: 0
};

const results = { ping: null, jitter: null, download: null, upload: null };

/* ==========================================================================
   GAUGE
   ========================================================================== */

function renderGaugeMeta() {
    const unit = $('gauge-unit');
    if (unit) unit.textContent = gauge.unit;

    const label = $('gauge-phase');
    if (label) label.textContent = gauge.label;

    const min = $('gauge-min');
    if (min) min.textContent = '0';

    const max = $('gauge-max');
    if (max) max.textContent = String(gauge.max);

    chart?.setUnit(gauge.unit);
}

function ensureRange(value) {
    if (value <= gauge.max * 0.9) return;

    const next = gauge.steps.find(step => value <= step * 0.9) ?? gauge.steps.at(-1);
    if (next > gauge.max) {
        gauge.max = next;
        renderGaugeMeta();
    }
}

function setGaugeMode(name) {
    const mode = MODES[name] ?? MODES.idle;
    gauge = { ...mode, max: mode.base };
    renderGaugeMeta();
    setGauge(0);
}

function setGauge(value) {
    const safe = Number.isFinite(value) && value > 0 ? value : 0;
    ensureRange(safe);

    const ratio = clamp(safe / gauge.max, 0, 1);

    const needle = $('needle');
    if (needle) needle.style.transform = `translateX(-50%) rotate(${ratio * 180 - 90}deg)`;

    const arc = $('gauge-arc');
    if (arc) arc.style.strokeDashoffset = String(ARC_LENGTH * (1 - ratio));

    const readout = $('current-speed');
    if (readout) readout.textContent = safe.toFixed(gauge.decimals);
}

/* ==========================================================================
   STATUS / PROGRESS / FASE
   ========================================================================== */

function setStatus(html) {
    const el = $('status-text');
    if (el) el.innerHTML = html;
}

function setProgress(percent) {
    const value = clamp(percent, 0, 100);

    const fill = $('speed-progress-fill');
    if (fill) fill.style.width = `${value}%`;

    $('speed-progress-bar')?.setAttribute('aria-valuenow', String(Math.round(value)));
}

function setPhaseState(phase, state) {
    const el = $(`phase-${phase}`);
    if (!el) return;

    el.classList.remove('is-active', 'is-done');
    if (state) el.classList.add(`is-${state}`);
}

function resetPhases() {
    ['ping', 'download', 'upload'].forEach(phase => setPhaseState(phase, null));
}

function qualityOf(value, tiers) {
    if (value > tiers[0]) return 'excellent';
    if (value > tiers[1]) return 'good';
    if (value > tiers[2]) return 'fair';
    return 'poor';
}

function setQuality(quality) {
    const key = QUALITY_LABELS[quality] ? quality : 'good';

    const dot = $('connection-status');
    if (dot) {
        dot.className = 'connection-status';
        if (key !== 'ready') dot.classList.add(key);
    }

    const label = $('connection-label');
    if (label) label.textContent = QUALITY_LABELS[key];
}

/* ==========================================================================
   PERHITUNGAN
   ========================================================================== */

/** Throughput rata-rata sejak titik warm-up sampai byte terakhir dikonfirmasi. */
function measuredSpeed() {
    const from = run.markBytes !== null ? run.markTime : run.startedAt;
    const fromBytes = run.markBytes !== null ? run.markBytes : 0;

    const seconds = (run.lastDataAt - from) / 1000;
    if (seconds <= 0) return 0;

    return ((run.bytes - fromBytes) * 8) / (seconds * 1e6);
}

function noteBytes(amount) {
    if (amount <= 0) return;
    run.bytes += amount;
    run.lastDataAt = performance.now();
}

/* ==========================================================================
   SAMPLER
   ========================================================================== */

function preparePhase(phase) {
    const now = performance.now();

    run.phase = phase;
    run.bytes = 0;
    run.peak = 0;
    run.startedAt = now;
    run.lastDataAt = now;
    run.markBytes = null;
    run.markTime = 0;

    setPhaseState(phase, 'active');
    setGaugeMode(phase);
    setQuality('testing');
    chart?.reset();
}

/**
 * Mengubah byte terkumpul menjadi throughput.
 * Memakai jendela geser (smoothWindowMs) supaya angka tidak meledak
 * hanya karena satu paket besar tiba dalam satu tick 100 ms.
 */
function startSampler(phase, onTick) {
    const history = [{ t: performance.now(), bytes: run.bytes }];

    return setInterval(() => {
        const now = performance.now();

        history.push({ t: now, bytes: run.bytes });
        while (history.length > 2 && now - history[0].t > CONFIG.smoothWindowMs) {
            history.shift();
        }

        const oldest = history[0];
        const seconds = (now - oldest.t) / 1000;
        if (seconds <= 0) return;

        const mbps = ((run.bytes - oldest.bytes) * 8) / (seconds * 1e6);

        // Tandai awal pengukuran setelah warm-up (ramp-up TCP diabaikan)
        if (run.markBytes === null && now - run.startedAt >= CONFIG.warmupMs) {
            run.markBytes = run.bytes;
            run.markTime = now;
        }

        // Puncak hanya dicatat setelah warm-up supaya burst awal
        // dari buffer tidak tercatat sebagai puncak.
        if (run.markBytes !== null) {
            run.peak = Math.max(run.peak, mbps);
        }

        setGauge(mbps);
        chart?.push(mbps, phase);
        setLive({
            current: formatSpeed(mbps),
            average: formatSpeed(measuredSpeed()),
            peak: formatSpeed(run.peak)
        });

        onTick?.(now);
    }, CONFIG.sampleMs);
}

function setLive({ current, average, peak, unit = 'Mbps' }) {
    const write = (id, value) => {
        const el = $(id);
        if (el) el.textContent = value;
    };

    write('live-current', current);
    write('live-average', average);
    write('live-peak', peak);

    const unitEl = $('live-unit');
    if (unitEl) unitEl.textContent = unit;
}

function resetLive() {
    setLive({ current: '--', average: '--', peak: '--' });
}

/* ==========================================================================
   JENDELA WAKTU PER FASE
   ========================================================================== */

function phaseWindow(globalSignal, durationMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), durationMs);
    const forward = () => controller.abort();

    globalSignal.addEventListener('abort', forward, { once: true });

    return {
        signal: controller.signal,
        cleanup() {
            clearTimeout(timer);
            globalSignal.removeEventListener('abort', forward);
            controller.abort();
        }
    };
}

/* ==========================================================================
   FASE 1 — PING
   ========================================================================== */

async function measurePing(signal) {
    preparePhase('ping');
    setStatus('Mengukur latensi…');
    setLive({ current: '--', average: '--', peak: '--', unit: 'ms' });

    const samples = [];

    for (let i = 0; i < CONFIG.ping.samples; i += 1) {
        if (signal.aborted) break;

        try {
            const started = performance.now();
            const response = await fetch(target().ping(), { signal, cache: 'no-store' });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await response.arrayBuffer();

            const rtt = performance.now() - started;
            samples.push(rtt);

            setGauge(rtt);
            chart?.push(rtt, 'ping');

            const sorted = [...samples].sort((a, b) => a - b);
            setLive({
                current: formatMs(rtt),
                average: formatMs(sorted[Math.floor(sorted.length / 2)]),
                peak: formatMs(sorted.at(-1)),
                unit: 'ms'
            });
        } catch (error) {
            if (signal.aborted) break;
            console.warn('Sampel ping gagal:', error.message);
        }

        setProgress(PROGRESS.ping.from + ((i + 1) / CONFIG.ping.samples) * (PROGRESS.ping.to - PROGRESS.ping.from));
        await wait(CONFIG.ping.gapMs);
    }

    if (!samples.length) {
        throw new Error(`Target uji (${target().label}) tidak merespons`);
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const ping = sorted[Math.floor(sorted.length / 2)];
    const jitter = samples.length > 1
        ? samples.slice(1).reduce((sum, value, i) => sum + Math.abs(value - samples[i]), 0) / (samples.length - 1)
        : 0;

    results.ping = ping;
    results.jitter = jitter;

    setGauge(ping);
    setProgress(PROGRESS.ping.to);
    setPhaseState('ping', 'done');
    setQuality(ping < 30 ? 'excellent' : ping < 60 ? 'good' : ping < 120 ? 'fair' : 'poor');

    const value = $('ping-result');
    if (value) value.textContent = formatMs(ping);

    const sub = $('ping-sub');
    if (sub) sub.textContent = `jitter ${formatMs(jitter)} ms · ${samples.length} sampel`;

    return { ping, jitter };
}

/* ==========================================================================
   FASE 2 — DOWNLOAD
   Byte dihitung saat benar-benar dibaca dari stream, jadi sudah "terkonfirmasi".
   ========================================================================== */

async function downloadWorker(signal) {
    while (!signal.aborted) {
        const response = await fetch(target().download(CONFIG.download.chunkBytes), {
            signal,
            cache: 'no-store'
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        // Browser tanpa Streams API: jatuh ke pengukuran per-blok
        if (!response.body) {
            noteBytes((await response.arrayBuffer()).byteLength);
            continue;
        }

        const reader = response.body.getReader();
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                noteBytes(value.byteLength);
            }
        } finally {
            try {
                reader.releaseLock();
            } catch {
                /* stream sudah dilepas */
            }
        }
    }
}

async function measureDownload(globalSignal) {
    preparePhase('download');
    setStatus('Mengukur kecepatan download…');

    const span = PROGRESS.download;
    const sampler = startSampler('download', now => {
        const ratio = (now - run.startedAt) / CONFIG.download.durationMs;
        setProgress(span.from + clamp(ratio, 0, 1) * (span.to - span.from));
        setQuality(qualityOf(measuredSpeed(), DOWNLOAD_TIERS));
    });

    const window_ = phaseWindow(globalSignal, CONFIG.download.durationMs);

    const outcomes = await Promise.allSettled(
        Array.from({ length: CONFIG.download.streams }, async () => {
            try {
                await downloadWorker(window_.signal);
            } catch (error) {
                if (!window_.signal.aborted) throw error;
            }
        })
    );

    window_.cleanup();
    clearInterval(sampler);

    if (run.bytes === 0) {
        const failure = outcomes.find(outcome => outcome.status === 'rejected');
        throw new Error(`Download gagal: ${failure?.reason?.message ?? 'tidak ada data diterima'}`);
    }

    const speed = measuredSpeed();
    results.download = speed;

    setGauge(speed);
    setProgress(span.to);
    setPhaseState('download', 'done');
    setQuality(qualityOf(speed, DOWNLOAD_TIERS));

    const value = $('download-result');
    if (value) value.textContent = formatSpeed(speed);

    const sub = $('download-sub');
    if (sub) sub.textContent = `puncak ${formatSpeed(run.peak)} Mbps · ${(run.bytes / 1048576).toFixed(1)} MB`;

    return speed;
}

/* ==========================================================================
   FASE 3 — UPLOAD
   Hanya byte yang sudah dikonfirmasi server yang dihitung.
   ========================================================================== */

function makePayload(size) {
    const buffer = new Uint8Array(size);
    const MAX_RANDOM = 65536; // batas per panggilan crypto.getRandomValues

    for (let offset = 0; offset < size; offset += MAX_RANDOM) {
        crypto.getRandomValues(buffer.subarray(offset, Math.min(offset + MAX_RANDOM, size)));
    }

    return new Blob([buffer], { type: 'application/octet-stream' });
}

/** Backend sendiri membalas jumlah byte yang diterima; target lain tidak. */
function confirmedBytes(xhr, fallback) {
    try {
        const body = JSON.parse(xhr.responseText);
        if (Number.isFinite(body?.bytes)) return body.bytes;
    } catch {
        /* respons bukan JSON — pakai ukuran payload */
    }
    return fallback;
}

function uploadOnce(payload, signal) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const abort = () => xhr.abort();

        const settle = action => {
            signal.removeEventListener('abort', abort);
            action();
        };

        xhr.open('POST', target().upload(), true);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.timeout = 30000;

        // Sengaja TIDAK memakai xhr.upload.onprogress untuk menghitung byte:
        // event.loaded hanya menandakan data masuk buffer socket OS.

        xhr.onload = () => settle(() => {
            if (xhr.status >= 200 && xhr.status < 300) {
                noteBytes(confirmedBytes(xhr, payload.size));
                resolve();
            } else {
                reject(new Error(`HTTP ${xhr.status}`));
            }
        });

        xhr.onerror = () => settle(() => reject(new Error('Network error')));
        xhr.ontimeout = () => settle(() => reject(new Error('Timeout')));
        xhr.onabort = () => settle(resolve);

        signal.addEventListener('abort', abort, { once: true });
        xhr.send(payload);
    });
}

async function uploadWorker(payload, signal) {
    while (!signal.aborted) {
        await uploadOnce(payload, signal);
    }
}

async function measureUpload(globalSignal) {
    preparePhase('upload');
    setStatus('Mengukur kecepatan upload…');

    const payload = makePayload(CONFIG.upload.chunkBytes);
    const span = PROGRESS.upload;

    const sampler = startSampler('upload', now => {
        const ratio = (now - run.startedAt) / CONFIG.upload.durationMs;
        setProgress(span.from + clamp(ratio, 0, 1) * (span.to - span.from));
        setQuality(qualityOf(measuredSpeed(), UPLOAD_TIERS));
    });

    const window_ = phaseWindow(globalSignal, CONFIG.upload.durationMs);

    const outcomes = await Promise.allSettled(
        Array.from({ length: CONFIG.upload.streams }, async () => {
            try {
                await uploadWorker(payload, window_.signal);
            } catch (error) {
                if (!window_.signal.aborted) throw error;
            }
        })
    );

    window_.cleanup();
    clearInterval(sampler);

    if (run.bytes === 0) {
        const failure = outcomes.find(outcome => outcome.status === 'rejected');
        throw new Error(
            `Upload gagal: ${failure?.reason?.message ?? 'tidak ada chunk yang selesai dalam jendela tes'}`
        );
    }

    const speed = measuredSpeed();
    results.upload = speed;

    setGauge(speed);
    setProgress(span.to);
    setPhaseState('upload', 'done');
    setQuality(qualityOf(speed, UPLOAD_TIERS));

    const value = $('upload-result');
    if (value) value.textContent = formatSpeed(speed);

    const sub = $('upload-sub');
    if (sub) sub.textContent = `puncak ${formatSpeed(run.peak)} Mbps · ${(run.bytes / 1048576).toFixed(1)} MB terkonfirmasi`;

    return speed;
}

/* ==========================================================================
   ORKESTRASI
   ========================================================================== */

function setRunningUI(running) {
    const start = $('start-button');
    if (start) {
        start.disabled = running;
        start.innerHTML = running
            ? '<span class="spinner"></span> Menguji…'
            : '<i data-lucide="play"></i> Mulai Tes';
    }

    const abort = $('speed-abort');
    if (abort) abort.style.display = running ? 'inline-flex' : 'none';

    $$('#speed-targets .preset-chip').forEach(chip => {
        chip.disabled = running;
    });

    refreshIcons();
}

function clearResults() {
    ['ping-result', 'download-result', 'upload-result'].forEach(id => {
        const el = $(id);
        if (el) el.textContent = '--';
    });

    ['ping-sub', 'download-sub', 'upload-sub'].forEach(id => {
        const el = $(id);
        if (el) el.textContent = '';
    });
}

export function abortSpeedTest() {
    if (run.active) run.controller?.abort();
}

export function resetSpeedTest() {
    abortSpeedTest();
    clearResults();
    resetPhases();
    resetLive();
    setGaugeMode('idle');
    setProgress(0);
    setQuality('ready');
    renderTargetNote();
    chart?.reset();
    setStatus('Siap untuk memulai tes.');
    setRunningUI(false);
}

export async function startSpeedTest() {
    if (run.active) return;

    run.active = true;
    run.controller = new AbortController();
    const { signal } = run.controller;

    Object.keys(results).forEach(key => {
        results[key] = null;
    });

    clearResults();
    resetPhases();
    resetLive();
    setProgress(0);
    setRunningUI(true);

    try {
        const { ping, jitter } = await measurePing(signal);
        if (signal.aborted) throw new DOMException('Dibatalkan', 'AbortError');
        await wait(300);

        const download = await measureDownload(signal);
        if (signal.aborted) throw new DOMException('Dibatalkan', 'AbortError');
        await wait(300);

        const upload = await measureUpload(signal);

        // Tampilkan angka utama (download) di gauge sebagai ringkasan
        setGaugeMode('download');
        setGauge(download);
        const phaseLabel = $('gauge-phase');
        if (phaseLabel) phaseLabel.textContent = 'Selesai';

        const loopbackWarning = targetId === 'app' && isLoopback()
            ? '<br><span class="text-amber">Diukur ke localhost (loopback), bukan internet — angka ini tidak mencerminkan kecepatan koneksi Anda.</span>'
            : '';

        setStatus(
            `<span class="text-emerald fw-600">Tes selesai.</span> `
            + `<span class="text-mute">Via ${target().label} · ping ${formatMs(ping)} ms `
            + `(jitter ${formatMs(jitter)} ms) · unduh ${formatSpeed(download)} Mbps · `
            + `unggah ${formatSpeed(upload)} Mbps</span>${loopbackWarning}`
        );
        showToast('Tes kecepatan selesai', 'success');
    } catch (error) {
        if (error?.name === 'AbortError' || signal.aborted) {
            setStatus('<span class="text-amber fw-600">Tes dibatalkan.</span>');
            showToast('Tes dibatalkan', 'info', 2000);
        } else {
            console.error('Speed test gagal:', error);
            setStatus(`<span class="text-rose fw-600">Tes gagal:</span> <span class="text-mute">${error.message}</span>`);
            showToast('Tes kecepatan gagal', 'error');
        }
        setQuality('ready');
    } finally {
        run.active = false;
        run.controller = null;
        setProgress(0);
        setRunningUI(false);

        const start = $('start-button');
        if (start && results.download !== null) {
            start.innerHTML = '<i data-lucide="refresh-cw"></i> Ulangi Tes';
            refreshIcons();
        }
    }
}

export function mountSpeedTest() {
    chart = createChart($('speed-chart'));

    $('start-button')?.addEventListener('click', startSpeedTest);
    $('speed-abort')?.addEventListener('click', abortSpeedTest);

    $$('#speed-targets .preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (run.active) return;
            targetId = TARGETS[chip.dataset.target] ? chip.dataset.target : targetId;
            renderTargetNote();
            clearResults();
            resetPhases();
            resetLive();
            setGaugeMode('idle');
            chart?.reset();
            setStatus('Siap untuk memulai tes.');
        });
    });

    window.addEventListener('resize', () => chart?.draw());

    resetSpeedTest();
}
