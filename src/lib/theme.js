import { $ } from './dom.js';
import { showToast } from './toast.js';

const STORAGE_KEY = 'serba-tester-theme';

function persist(theme) {
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        /* localStorage bisa diblokir (mode privat) — abaikan */
    }
}

function read() {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#eef5f0' : '#040a08');

    persist(theme);
}

export function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    showToast(next === 'light' ? 'Tema terang aktif' : 'Tema gelap aktif', 'info', 1600);
}

export function mountTheme() {
    const stored = read()
        ?? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

    applyTheme(stored);
    $('theme-toggle')?.addEventListener('click', toggleTheme);
}
