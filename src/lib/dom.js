/* Helper DOM & angka yang dipakai lintas modul. */

export const $ = id => document.getElementById(id);

export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const setText = (id, text) => {
    const el = $(id);
    if (el) el.textContent = text;
};

export const toggleClass = (el, className, on) => {
    if (el) el.classList.toggle(className, on);
};

/** Format Mbps: presisi lebih tinggi untuk angka kecil. */
export function formatSpeed(mbps) {
    if (!Number.isFinite(mbps) || mbps <= 0) return '0.00';
    if (mbps >= 1000) return mbps.toFixed(0);
    if (mbps >= 100) return mbps.toFixed(1);
    return mbps.toFixed(2);
}

export function formatMs(ms) {
    if (!Number.isFinite(ms)) return '--';
    return ms >= 100 ? ms.toFixed(0) : ms.toFixed(1);
}

export function cssVar(name, fallback = '') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
