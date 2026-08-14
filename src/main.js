/* ==========================================================================
   SERBA TESTER — ENTRY POINT
   Merangkai seluruh modul diagnostik dan menangani navigasi antar tab.
   ========================================================================== */

import './styles.css';

import { $, $$ } from './lib/dom.js';
import { refreshIcons } from './lib/icons.js';
import { mountTheme, toggleTheme } from './lib/theme.js';
import { showToast } from './lib/toast.js';

import {
    handleKeyboardKeydown,
    handleKeyboardKeyup,
    mountKeyboard,
    releaseKeyboardState
} from './modules/keyboard.js';

import {
    abortSpeedTest,
    mountSpeedTest,
    resetSpeedTest
} from './modules/speedtest.js';

import {
    isAudioPlaying,
    mountAudio,
    stopSpeakerTest
} from './modules/audio.js';

import {
    monitorInit,
    monitorNext,
    monitorPrev,
    mountMonitor,
    toggleFullScreen
} from './modules/monitor.js';

import { mountSystemInfo, renderSystemInfo } from './modules/systemInfo.js';

const TABS = ['keyboard', 'speed', 'audio', 'monitor', 'system'];
const VIEWS = ['home', 'tools'];

let activeTab = 'keyboard';
let activeView = 'home';

/* ==========================================================================
   NAVIGASI VIEW (beranda ↔ alat uji)
   ========================================================================== */

function renderViewState() {
    VIEWS.forEach(name => {
        const view = $(`view-${name}`);
        if (view) view.hidden = name !== activeView;
    });

    $$('.nav-link').forEach(link => {
        link.classList.toggle('is-active', link.dataset.view === activeView);
    });
}

/**
 * Menampilkan salah satu view.
 * @param {'home'|'tools'} view
 * @param {{ tab?: string, silent?: boolean }} options
 *   tab    — modul yang langsung dibuka saat masuk view alat uji
 *   silent — jangan tulis ulang location.hash (dipakai saat merespons hashchange)
 */
export function setActiveView(view, { tab, silent = false } = {}) {
    if (!VIEWS.includes(view)) return;

    // Tinggalkan modul yang sedang berjalan saat keluar dari alat uji
    if (activeView === 'tools' && view !== 'tools') {
        stopSpeakerTest({ silent: true });
        abortSpeedTest();
        releaseKeyboardState();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }

    activeView = view;
    renderViewState();

    if (view === 'tools') {
        setActiveTab(tab ?? activeTab, { silent: true });
    }

    if (!silent) {
        const hash = view === 'tools' ? `#/test/${tab ?? activeTab}` : '#/';
        if (location.hash !== hash) {
            history.pushState(null, '', hash);
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshIcons();
}

/** Terjemahkan location.hash menjadi state view + tab. */
function applyHash({ silent = true } = {}) {
    const match = /^#\/test(?:\/([a-z]+))?$/.exec(location.hash);

    if (match) {
        const tab = TABS.includes(match[1]) ? match[1] : 'keyboard';
        setActiveView('tools', { tab, silent });
        return;
    }

    setActiveView('home', { silent });
}

/* ==========================================================================
   NAVIGASI TAB
   ========================================================================== */

export function setActiveTab(tab, { silent = false } = {}) {
    if (!TABS.includes(tab)) return;

    // Lepaskan state tombol yang masih ditahan sebelum meninggalkan modul,
    // karena keyup-nya akan jatuh di luar handler tes keyboard.
    if (activeTab === 'keyboard' && tab !== 'keyboard') releaseKeyboardState();

    // Bersihkan aktivitas modul yang ditinggalkan
    if (activeTab === 'audio' && tab !== 'audio') stopSpeakerTest({ silent: true });
    if (activeTab === 'speed' && tab !== 'speed') abortSpeedTest();

    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }

    $$('.tester-content').forEach(panel => {
        panel.style.display = 'none';
    });

    $$('.tab-button').forEach(button => {
        button.classList.remove('active-tab');
        button.setAttribute('aria-selected', 'false');
    });

    const panel = $(`${tab}-content`);
    if (panel) {
        panel.style.display = 'block';
        // Jalankan ulang animasi masuk panel
        panel.style.animation = 'none';
        void panel.offsetHeight;
        panel.style.animation = '';
    }

    const button = $(`${tab}-tab`);
    if (button) {
        button.classList.add('active-tab');
        button.setAttribute('aria-selected', 'true');
    }

    activeTab = tab;

    if (tab === 'speed') resetSpeedTest();
    if (tab === 'monitor') monitorInit();
    if (tab === 'system') renderSystemInfo();

    // replaceState (bukan push) supaya klik antar tab tidak menumpuk riwayat
    if (!silent && activeView === 'tools') {
        const hash = `#/test/${tab}`;
        if (location.hash !== hash) history.replaceState(null, '', hash);
    }

    refreshIcons();
}

/* ==========================================================================
   ROUTER KEYBOARD
   ========================================================================== */

function handleKeydown(event) {
    // Pintasan global: Alt + 1..5 pindah modul, Alt + T ganti tema
    if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const index = Number.parseInt(event.key, 10);
        if (index >= 1 && index <= TABS.length) {
            event.preventDefault();
            // Dari beranda, pintasan ini sekaligus membuka view alat uji
            setActiveView('tools', { tab: TABS[index - 1] });
            return;
        }

        if (event.key.toLowerCase() === 't') {
            event.preventDefault();
            toggleTheme();
            return;
        }
    }

    // Penanganan per-modul hanya berlaku saat view alat uji terbuka,
    // supaya menekan tombol di beranda tidak tercatat sebagai hasil tes.
    if (activeView !== 'tools') return;

    if (activeTab === 'keyboard') {
        handleKeyboardKeydown(event);
        return;
    }

    if (activeTab === 'monitor') {
        if (event.key === 'ArrowRight' || event.key === ' ') {
            event.preventDefault();
            monitorNext();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            monitorPrev();
        } else if (event.key.toLowerCase() === 'f') {
            event.preventDefault();
            toggleFullScreen();
        }
        return;
    }

    if (activeTab === 'audio' && event.key === 'Escape' && isAudioPlaying()) {
        stopSpeakerTest();
    }

    if (activeTab === 'speed' && event.key === 'Escape') {
        abortSpeedTest();
    }
}

function handleKeyup(event) {
    if (activeView === 'tools' && activeTab === 'keyboard') handleKeyboardKeyup(event);
}

/* ==========================================================================
   STATUS JARINGAN
   ========================================================================== */

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
   BOOTSTRAP
   ========================================================================== */

function boot() {
    mountTheme();
    refreshIcons();

    mountKeyboard();
    mountSpeedTest();
    mountAudio();
    mountMonitor({ onExit: () => setActiveTab('keyboard') });
    mountSystemInfo();

    $$('[data-tab]').forEach(button => {
        button.addEventListener('click', () => setActiveTab(button.dataset.tab));
    });

    // Tombol/nav pindah view (topbar, hero, CTA, tombol kembali)
    $$('[data-view]').forEach(element => {
        element.addEventListener('click', event => {
            event.preventDefault();
            setActiveView(element.dataset.view);
        });
    });

    // Kartu modul di beranda: seluruh kartu bisa diklik,
    // tautan di dalamnya tetap jadi kontrol utama untuk pembaca layar.
    $$('.project-card[data-goto]').forEach(card => {
        card.addEventListener('click', () => {
            setActiveView('tools', { tab: card.dataset.goto });
        });
    });

    $$('[data-goto-link]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            setActiveView('tools', { tab: link.dataset.gotoLink });
        });
    });

    // Sinkronkan dengan tombol maju/mundur browser
    window.addEventListener('hashchange', () => applyHash({ silent: true }));
    window.addEventListener('popstate', () => applyHash({ silent: true }));

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keyup', handleKeyup);

    updateNetStatus();
    window.addEventListener('online', () => {
        updateNetStatus();
        showToast('Koneksi jaringan kembali', 'success', 2200);
    });
    window.addEventListener('offline', () => {
        updateNetStatus();
        showToast('Koneksi jaringan terputus', 'error', 2600);
    });

    // Hentikan audio & tes saat tab browser disembunyikan
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) return;
        if (isAudioPlaying()) stopSpeakerTest({ silent: true });
    });

    // Tentukan view awal dari URL (mis. tautan langsung ke #/test/speed)
    applyHash({ silent: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}
