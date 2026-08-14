/* ==========================================================================
   TES MONITOR
   Pola layar penuh untuk mendeteksi dead/stuck pixel, banding, uniformity.
   ========================================================================== */

import { $, clamp } from '../lib/dom.js';
import { refreshIcons } from '../lib/icons.js';
import { showToast } from '../lib/toast.js';

const PATTERNS = [
    { name: 'Persiapan', color: '#0b1220', text: 'Klik area ini atau tekan → untuk memulai tes monitor.' },
    { name: 'Hitam Solid', color: '#000000', text: 'Cari titik terang (stuck pixel) pada layar hitam.' },
    { name: 'Putih Solid', color: '#ffffff', text: 'Cari titik gelap (dead pixel) dan noda pada layar putih.', dark: true },
    { name: 'Merah Solid', color: '#ff0000', text: 'Periksa subpiksel merah dan keseragamannya.', dark: true },
    { name: 'Hijau Solid', color: '#00ff00', text: 'Periksa subpiksel hijau dan keseragamannya.', dark: true },
    { name: 'Biru Solid', color: '#0000ff', text: 'Periksa subpiksel biru dan keseragamannya.' },
    { name: 'Abu-abu 25%', color: '#404040', text: 'Periksa keseragaman abu-abu gelap dan bayangan (clouding).' },
    { name: 'Abu-abu 50%', color: '#808080', text: 'Periksa keseragaman abu-abu medium — paling jelas menunjukkan backlight bleed.', dark: true },
    { name: 'Abu-abu 75%', color: '#c0c0c0', text: 'Periksa banding dan gradasi abu-abu terang.', dark: true },
    { name: 'Gradien Abu-abu', color: 'transparent', gradient: 'grayscale', text: 'Periksa transisi gradien: seharusnya halus tanpa garis banding.', dark: true },
    { name: 'Gradien Warna', color: 'transparent', gradient: 'color', text: 'Periksa akurasi dan transisi warna sepanjang spektrum.', dark: true },
    { name: 'Selesai', color: '#0b1220', text: 'Tes monitor selesai. Tekan Selesai untuk kembali, atau ← untuk mengulang pola.' }
];

export const patternCount = PATTERNS.length;

let index = 0;
let area;
let content;
let gradientBox;
let info;
let container;
let onFinish = () => {};

function cache() {
    area = $('monitor-test-area');
    content = $('monitor-test-content');
    gradientBox = $('monitor-gradient-box');
    info = $('monitor-test-info');
    container = $('monitor-content');
}

function apply(next) {
    if (!area) cache();
    if (!area) return;

    if (next >= PATTERNS.length) {
        onFinish();
        showToast('Tes monitor selesai', 'success');
        return;
    }

    index = clamp(next, 0, PATTERNS.length - 1);
    const pattern = PATTERNS[index];

    area.classList.remove('monitor-test-transition');
    void area.offsetHeight;
    area.classList.add('monitor-test-transition');

    area.classList.remove('color-test', 'monitor-black-text');
    area.style.backgroundColor = pattern.color;

    content.style.display = 'block';
    gradientBox.style.display = 'none';

    if (pattern.dark) area.classList.add('monitor-black-text');

    if (pattern.gradient) {
        area.style.backgroundColor = '#ffffff';
        content.style.display = 'none';
        gradientBox.style.display = 'block';
        if (pattern.gradient === 'color') area.classList.add('color-test');
    }

    content.textContent = pattern.text;
    info.textContent = `${pattern.name} (${index + 1}/${PATTERNS.length})`;
}

export const monitorInit = () => {
    cache();
    apply(0);
};

export const monitorNext = () => apply(index + 1);

export const monitorPrev = () => apply(Math.max(0, index - 1));

export function toggleFullScreen() {
    if (!container) cache();
    if (!container) return;

    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
        return;
    }

    const request = container.requestFullscreen
        || container.webkitRequestFullscreen
        || container.msRequestFullscreen;

    if (!request) {
        showToast('Layar penuh tidak didukung browser ini', 'error');
        return;
    }

    Promise.resolve(request.call(container)).catch(() => {
        showToast('Browser menolak mode layar penuh', 'error');
    });
}

function syncFullscreenButton() {
    const button = $('monitor-fullscreen-btn');
    if (!button) return;

    const full = Boolean(document.fullscreenElement);
    button.innerHTML = full
        ? '<i data-lucide="minimize" class="btn-icon-sm"></i> Keluar Layar Penuh'
        : '<i data-lucide="maximize" class="btn-icon-sm"></i> Layar Penuh';
    refreshIcons();
}

export function mountMonitor({ onExit }) {
    cache();
    onFinish = onExit;

    area?.addEventListener('click', monitorNext);
    area?.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            monitorNext();
        }
    });

    $('monitor-next-btn')?.addEventListener('click', monitorNext);
    $('monitor-prev-btn')?.addEventListener('click', monitorPrev);
    $('monitor-fullscreen-btn')?.addEventListener('click', toggleFullScreen);
    $('monitor-exit-btn')?.addEventListener('click', onExit);

    document.addEventListener('fullscreenchange', syncFullscreenButton);
}
