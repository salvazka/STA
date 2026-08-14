/* ==========================================================================
   BONGO CAT
   Animasi pendamping untuk tes keyboard: telapak kiri/kanan menghentak
   mengikuti tombol yang ditekan.

   Catatan implementasi:
   - Pose diatur lewat class CSS pada satu SVG inline, bukan dengan menukar
     `img.src` antar beberapa PNG. Menukar src menyebabkan kedip pada frame
     yang belum ter-cache dan tidak bisa dianimasikan.
   - Tombol yang sedang ditahan dilacak dengan Set per tangan. Kalau hanya
     memakai boolean, melepas satu tombol kanan akan menurunkan telapak
     padahal tombol kanan lain masih ditahan.
   ========================================================================== */

import { $ } from '../lib/dom.js';

/* Pembagian tangan mengikuti posisi jari mengetik sepuluh jari. */
const LEFT_HAND = new Set([
    'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
    'Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6',
    'Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT',
    'CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG',
    'ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB',
    'ControlLeft', 'MetaLeft', 'AltLeft'
]);

/* Spasi ditekan ibu jari — dua telapak sekaligus, terlihat lebih hidup. */
const BOTH_HANDS = new Set(['Space']);

const VISIBILITY_KEY = 'serba-tester-bongo';

const held = { left: new Set(), right: new Set() };

let root = null;
let visible = true;

function sidesFor(code) {
    if (BOTH_HANDS.has(code)) return ['left', 'right'];
    return [LEFT_HAND.has(code) ? 'left' : 'right'];
}

function render() {
    if (!root) return;
    root.classList.toggle('is-left-down', held.left.size > 0);
    root.classList.toggle('is-right-down', held.right.size > 0);
}

/** Kilatan kecil di titik hentakan. WAAPI dipakai agar selalu memicu ulang
    walau tombol ditekan cepat berkali-kali. */
function bonk(side) {
    if (!visible) return;

    const spark = $(`bongo-hit-${side}`);
    if (!spark?.animate) return;

    spark.animate(
        [
            { opacity: 0.85, transform: 'scale(0.45)' },
            { opacity: 0, transform: 'scale(1.55)' }
        ],
        { duration: 300, easing: 'ease-out' }
    );
}

export function bongoPress(code, isRepeat = false) {
    const sides = sidesFor(code);

    sides.forEach(side => held[side].add(code));
    render();

    // Auto-repeat saat tombol ditahan tidak perlu memicu kilatan berulang
    if (!isRepeat) sides.forEach(bonk);
}

export function bongoRelease(code) {
    sidesFor(code).forEach(side => held[side].delete(code));
    render();
}

/** Turunkan semua state — dipakai saat reset, pindah modul, atau fokus hilang
    (keyup bisa tidak pernah sampai kalau jendela kehilangan fokus saat ditahan). */
export function bongoReset() {
    held.left.clear();
    held.right.clear();
    render();
}

function applyVisibility() {
    const wrap = $('bongo-wrap');
    const button = $('bongo-toggle');

    if (wrap) wrap.hidden = !visible;

    if (button) {
        button.setAttribute('aria-pressed', String(visible));
        button.innerHTML = visible
            ? '<i data-lucide="cat"></i> Sembunyikan Bongo Cat'
            : '<i data-lucide="cat"></i> Tampilkan Bongo Cat';
    }
}

export function isBongoVisible() {
    return visible;
}

export function mountBongo({ onToggle } = {}) {
    root = $('bongo');

    try {
        visible = localStorage.getItem(VISIBILITY_KEY) !== 'off';
    } catch {
        visible = true;
    }

    applyVisibility();
    onToggle?.();

    $('bongo-toggle')?.addEventListener('click', () => {
        visible = !visible;
        try {
            localStorage.setItem(VISIBILITY_KEY, visible ? 'on' : 'off');
        } catch {
            /* localStorage bisa diblokir — abaikan */
        }
        bongoReset();
        applyVisibility();
        onToggle?.();
    });

    // Jaring pengaman: tombol yang ditahan saat jendela kehilangan fokus
    window.addEventListener('blur', bongoReset);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) bongoReset();
    });
}
