/* ==========================================================================
   TES KEYBOARD
   ========================================================================== */

import { $, $$ } from '../lib/dom.js';
import { refreshIcons } from '../lib/icons.js';
import { showToast } from '../lib/toast.js';
import { bongoPress, bongoRelease, bongoReset, mountBongo } from './bongo.js';

/* Tombol yang tetap diteruskan ke browser agar pengguna tidak terjebak. */
const PASSTHROUGH = new Set(['F5', 'F11', 'F12', 'Escape']);

const keyMap = new Map();

const stats = {
    total: 0,
    pressed: new Set(),
    lastCode: null,
    lastChar: null,
    startedAt: null
};

export function mountKeyboard() {
    $$('#keyboard-layout .key[data-code]').forEach(el => {
        keyMap.set(el.dataset.code, el);
        el.classList.add('key-feedback');
    });

    stats.total = keyMap.size;

    $('keyboard-reset')?.addEventListener('click', resetKeyboardTest);
    mountBongo({ onToggle: refreshIcons });
    render();
}

/** Dipanggil saat meninggalkan modul keyboard supaya telapak tidak tertinggal
    di posisi menekan (keyup bisa jatuh di luar modul ini). */
export function releaseKeyboardState() {
    bongoReset();
}

function render() {
    const pressed = stats.pressed.size;
    const total = stats.total || 1;
    const percent = Math.round((pressed / total) * 100);

    const fill = $('coverage-fill');
    if (fill) fill.style.width = `${percent}%`;

    $('coverage-bar')?.setAttribute('aria-valuenow', String(percent));

    const value = $('coverage-value');
    if (value) value.textContent = String(percent);

    const count = $('coverage-count');
    if (count) count.textContent = `${pressed} / ${stats.total} tombol`;

    const indicator = $('key-press-indicator');
    if (indicator) {
        indicator.textContent = stats.lastCode
            ? `${stats.lastCode}  →  "${stats.lastChar}"`
            : 'Menunggu penekanan tombol…';
    }

    const container = $('keyboard-stats');
    if (!container) return;

    const remaining = stats.total - pressed;
    const seconds = stats.startedAt ? Math.round((performance.now() - stats.startedAt) / 1000) : 0;

    const chips = [
        `<span class="chip chip-emerald"><i data-lucide="check-check" class="chip-icon"></i> ${pressed} terdeteksi</span>`,
        `<span class="chip"><i data-lucide="circle-dashed" class="chip-icon"></i> ${remaining} belum diuji</span>`
    ];

    if (stats.startedAt) {
        chips.push(`<span class="chip"><i data-lucide="timer" class="chip-icon"></i> ${seconds}s berjalan</span>`);
    }

    if (percent === 100) {
        chips.push('<span class="chip chip-emerald"><i data-lucide="party-popper" class="chip-icon"></i> Semua tombol normal</span>');
    }

    container.innerHTML = `<div class="u-center-row">${chips.join('')}</div>`;
    refreshIcons();
}

export function resetKeyboardTest() {
    keyMap.forEach(el => el.classList.remove('pressed', 'tested'));

    stats.pressed.clear();
    stats.lastCode = null;
    stats.lastChar = null;
    stats.startedAt = null;

    bongoReset();
    render();
    showToast('Tes keyboard direset', 'info', 1600);
}

function describe(event) {
    return event.key === ' ' ? 'Space' : event.key;
}

function markTested(code) {
    const el = keyMap.get(code);
    if (!el) return;

    el.classList.remove('pressed');
    el.classList.add('tested');
    stats.pressed.add(code);
}

export function handleKeyboardKeydown(event) {
    const el = keyMap.get(event.code);
    if (!el) return;

    // Cegah aksi bawaan (Tab, F1, Space…) tapi jangan bajak Ctrl/Cmd & tombol pelarian.
    if (!event.ctrlKey && !event.metaKey && !PASSTHROUGH.has(event.code)) {
        event.preventDefault();
    }

    stats.startedAt ??= performance.now();
    stats.lastCode = event.code;
    stats.lastChar = describe(event);

    bongoPress(event.code, event.repeat);

    if (!el.classList.contains('pressed')) {
        el.classList.add('pressed');
        stats.pressed.add(event.code);
    }

    render();
}

export function handleKeyboardKeyup(event) {
    bongoRelease(event.code);

    const el = keyMap.get(event.code);
    if (!el) return;

    // Sebagian tombol (mis. PrintScreen di Chrome/Windows) hanya memicu keyup.
    const unseen = !el.classList.contains('pressed') && !el.classList.contains('tested');

    if (unseen) {
        stats.lastCode = event.code;
        stats.lastChar = describe(event);
    }

    markTested(event.code);
    if (unseen) render();
}
