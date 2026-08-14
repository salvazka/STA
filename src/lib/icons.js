/* Ikon Lucide via npm (bukan CDN).
   Hanya ikon yang benar-benar dipakai yang diimpor agar bundle tetap kecil. */

import {
    createIcons,
    Activity,
    AlertTriangle,
    ArrowDown,
    ArrowDownToLine,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowUpFromLine,
    AudioWaveform,
    Cat,
    ChartLine,
    CheckCheck,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    CircleDashed,
    ClipboardCopy,
    Cpu,
    Download,
    Gauge,
    Globe,
    Headphones,
    Info,
    Keyboard,
    Lightbulb,
    Maximize,
    Minimize,
    Monitor,
    Moon,
    PartyPopper,
    Play,
    Plug,
    RefreshCw,
    ScanEye,
    ScanLine,
    ShieldCheck,
    Speaker,
    Square,
    Sun,
    Timer,
    Volume1,
    Volume2,
    Waves,
    Wifi,
    X,
    Zap
} from 'lucide';

const iconSet = {
    Activity,
    AlertTriangle,
    ArrowDown,
    ArrowDownToLine,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowUpFromLine,
    AudioWaveform,
    Cat,
    ChartLine,
    CheckCheck,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    CircleDashed,
    ClipboardCopy,
    Cpu,
    Download,
    Gauge,
    Globe,
    Headphones,
    Info,
    Keyboard,
    Lightbulb,
    Maximize,
    Minimize,
    Monitor,
    Moon,
    PartyPopper,
    Play,
    Plug,
    RefreshCw,
    ScanEye,
    ScanLine,
    ShieldCheck,
    Speaker,
    Square,
    Sun,
    Timer,
    Volume1,
    Volume2,
    Waves,
    Wifi,
    X,
    Zap
};

/** Ubah semua <i data-lucide="..."> yang belum dirender menjadi SVG.
    Stroke dibuat tebal dengan ujung membulat sesuai sistem desain
    "Playful Geometric" (chunky, friendly). */
export function refreshIcons() {
    try {
        createIcons({
            icons: iconSet,
            attrs: {
                'stroke-width': 2.5,
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round'
            }
        });
    } catch (error) {
        console.warn('Gagal merender ikon:', error);
    }
}
