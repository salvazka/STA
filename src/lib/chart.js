/* ==========================================================================
   GRAFIK THROUGHPUT REALTIME
   Area chart ringan di Canvas 2D — satu sampel per interval pengukuran.
   ========================================================================== */

import { cssVar } from './dom.js';

const MAX_SAMPLES = 400;
const Y_STEPS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

const PHASE_COLORS = {
    ping: '--brand',
    download: '--brand-2',
    upload: '--emerald'
};

export function createChart(canvas) {
    if (!canvas) {
        return { reset() {}, push() {}, draw() {}, setUnit() {} };
    }

    const samples = [];
    let unit = 'Mbps';

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(canvas.clientWidth, 1);
        const height = Math.max(canvas.clientHeight, 1);
        const targetW = Math.round(width * dpr);
        const targetH = Math.round(height * dpr);

        if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
        }

        return { width: targetW, height: targetH, dpr };
    }

    function yScale() {
        const peak = samples.reduce((max, s) => Math.max(max, s.mbps), 0);
        return Y_STEPS.find(step => peak <= step * 0.92) ?? Math.ceil(peak / 1000) * 1000;
    }

    function draw() {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height, dpr } = resize();
        ctx.clearRect(0, 0, width, height);

        const padTop = 10 * dpr;
        const padBottom = 4 * dpr;
        const plotH = Math.max(height - padTop - padBottom, 1);
        const max = yScale();

        // Garis grid horizontal
        ctx.strokeStyle = cssVar('--border', 'rgba(255,255,255,.08)');
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        for (let i = 0; i <= 4; i += 1) {
            const y = Math.round(padTop + (plotH / 4) * i) + 0.5;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Label skala maksimum
        ctx.fillStyle = cssVar('--text-mute', '#64748b');
        ctx.font = `${10 * dpr}px ui-monospace, monospace`;
        ctx.textBaseline = 'top';
        ctx.fillText(`${max} ${unit}`, 6 * dpr, 2 * dpr);

        if (samples.length < 2) return;

        const stepX = width / (MAX_SAMPLES - 1);
        const pointAt = i => ({
            x: i * stepX,
            y: padTop + plotH * (1 - Math.min(samples[i].mbps / max, 1))
        });

        // Area terisi
        const activePhase = samples.at(-1).phase;
        const color = cssVar(PHASE_COLORS[activePhase] ?? '--brand', '#34d399');

        const fill = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
        fill.addColorStop(0, `${color}59`);
        fill.addColorStop(1, `${color}00`);

        ctx.beginPath();
        ctx.moveTo(0, padTop + plotH);
        for (let i = 0; i < samples.length; i += 1) {
            const { x, y } = pointAt(i);
            ctx.lineTo(x, y);
        }
        ctx.lineTo(pointAt(samples.length - 1).x, padTop + plotH);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();

        // Garis utama
        ctx.beginPath();
        for (let i = 0; i < samples.length; i += 1) {
            const { x, y } = pointAt(i);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * dpr;
        ctx.lineJoin = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 8 * dpr;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Titik terkini
        const last = pointAt(samples.length - 1);
        ctx.beginPath();
        ctx.arc(last.x, last.y, 3 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    return {
        reset() {
            samples.length = 0;
            draw();
        },
        push(value, phase) {
            samples.push({ mbps: Math.max(value, 0), phase });
            if (samples.length > MAX_SAMPLES) samples.shift();
            draw();
        },
        /** Satuan yang ditampilkan pada label skala (Mbps untuk transfer, ms untuk ping). */
        setUnit(next) {
            unit = next || 'Mbps';
            draw();
        },
        draw
    };
}
