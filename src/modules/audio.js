/* ==========================================================================
   TES SPEAKER / AUDIO
   Osilator Web Audio + visualizer gelombang realtime.
   ========================================================================== */

import { $, $$, cssVar } from '../lib/dom.js';
import { refreshIcons } from '../lib/icons.js';
import { showToast } from '../lib/toast.js';

const BUTTONS = ['test-left', 'test-right', 'test-stereo'];

let audioContext = null;
let oscillator = null;
let gainNode = null;
let analyser = null;
let panner = null;
let waveformData = null;
let frameId = null;

let volume = 0.5;
let frequency = 440;
let waveform = 'sine';
let playing = false;

export const isAudioPlaying = () => playing;

function getContext() {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
}

/* --- Visualizer ---------------------------------------------------------- */

function draw() {
    const canvas = $('audio-visualizer');
    if (!canvas || !analyser || !waveformData) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const mid = height / 2;

    analyser.getByteTimeDomainData(waveformData);
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = cssVar('--border-strong', 'rgba(255,255,255,.16)');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(width, mid);
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, cssVar('--brand', '#34d399'));
    gradient.addColorStop(0.5, cssVar('--brand-2', '#a3e635'));
    gradient.addColorStop(1, cssVar('--rose', '#fb7185'));

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.shadowColor = cssVar('--brand', '#34d399');
    ctx.shadowBlur = 14;
    ctx.beginPath();

    const step = width / waveformData.length;
    for (let i = 0; i < waveformData.length; i += 1) {
        const y = mid + (waveformData[i] / 128 - 1) * (mid - 8);
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * step, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    frameId = requestAnimationFrame(draw);
}

function stopVisualizer() {
    if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = null;
    }

    $('visualizer-shell')?.classList.remove('is-live');

    const canvas = $('audio-visualizer');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

/* --- Kontrol ------------------------------------------------------------- */

function setChannelIndicator(channel) {
    $('channel-left')?.classList.toggle('is-active', channel === 'left' || channel === 'stereo');
    $('channel-right')?.classList.toggle('is-active', channel === 'right' || channel === 'stereo');
}

function applyVolume() {
    if (gainNode && audioContext) {
        gainNode.gain.setTargetAtTime(volume, audioContext.currentTime, 0.015);
    }

    const display = $('volume-display');
    if (display) display.textContent = `${Math.round(volume * 100)}%`;
}

function applyFrequency() {
    if (oscillator && audioContext) {
        oscillator.frequency.setTargetAtTime(frequency, audioContext.currentTime, 0.015);
    }

    const display = $('frequency-display');
    if (display) display.textContent = `${frequency} Hz`;

    $$('#frequency-presets .preset-chip').forEach(chip => {
        chip.classList.toggle('is-active', Number(chip.dataset.freq) === frequency);
    });
}

function applyWaveform() {
    if (oscillator) oscillator.type = waveform;

    const display = $('waveform-display');
    if (display) display.textContent = waveform.charAt(0).toUpperCase() + waveform.slice(1);

    $$('#waveform-presets .preset-chip').forEach(chip => {
        chip.classList.toggle('is-active', chip.dataset.wave === waveform);
    });
}

/* --- Start / stop -------------------------------------------------------- */

export function stopSpeakerTest({ silent = false } = {}) {
    const wasPlaying = playing;

    if (oscillator) {
        try {
            oscillator.stop();
        } catch {
            /* sudah berhenti */
        }
        oscillator.disconnect();
        oscillator = null;
    }

    analyser?.disconnect();
    panner?.disconnect();
    gainNode?.disconnect();
    panner = null;
    gainNode = null;

    playing = false;
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

    BUTTONS.forEach(id => {
        const button = $(id);
        if (button) button.disabled = false;
    });

    if (wasPlaying && !silent) showToast('Nada uji dihentikan', 'info', 1500);
}

export function startSpeakerTest(channel) {
    stopSpeakerTest({ silent: true });

    const status = $('speaker-status');

    try {
        const ctx = getContext();

        gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        // Fade-in singkat supaya tidak ada bunyi "klik"
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.06);

        oscillator = ctx.createOscillator();
        oscillator.type = waveform;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

        if (!analyser) {
            analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            waveformData = new Uint8Array(analyser.fftSize);
        }

        panner = ctx.createStereoPanner();

        const config = {
            left: { pan: -1, tone: 'text-brand', message: 'Memutar nada di speaker KIRI saja.' },
            right: { pan: 1, tone: 'text-lime', message: 'Memutar nada di speaker KANAN saja.' },
            stereo: { pan: 0, tone: 'text-emerald', message: 'Memutar nada di kedua speaker (stereo).' }
        }[channel] ?? { pan: 0, tone: 'text-emerald', message: 'Memutar nada uji.' };

        panner.pan.setValueAtTime(config.pan, ctx.currentTime);

        // Rantai: oscillator -> gain -> analyser -> panner -> output
        oscillator.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(panner);
        panner.connect(ctx.destination);

        oscillator.start();
        playing = true;

        if (status) {
            status.className = `${config.tone} fw-600`;
            status.textContent = `${config.message} ${frequency} Hz · ${waveform} · ${Math.round(volume * 100)}%`;
        }

        const stopButton = $('stop-audio');
        if (stopButton) stopButton.style.display = 'inline-flex';

        BUTTONS.forEach(id => {
            const button = $(id);
            if (button) button.disabled = true;
        });

        setChannelIndicator(channel);
        $('visualizer-shell')?.classList.add('is-live');
        draw();
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

/* --- Mount --------------------------------------------------------------- */

export function mountAudio() {
    const volumeSlider = $('volume-slider');
    if (volumeSlider) {
        volumeSlider.value = String(volume);
        volumeSlider.addEventListener('input', event => {
            volume = Number.parseFloat(event.target.value);
            applyVolume();
        });
    }

    const freqSlider = $('frequency-slider');
    if (freqSlider) {
        freqSlider.value = String(frequency);
        freqSlider.addEventListener('input', event => {
            frequency = Number.parseInt(event.target.value, 10);
            applyFrequency();
        });
    }

    $$('#frequency-presets .preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            frequency = Number.parseInt(chip.dataset.freq, 10);
            if (freqSlider) freqSlider.value = String(frequency);
            applyFrequency();
        });
    });

    $$('#waveform-presets .preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            waveform = chip.dataset.wave;
            applyWaveform();
        });
    });

    $$('[data-speaker]').forEach(button => {
        button.addEventListener('click', () => startSpeakerTest(button.dataset.speaker));
    });

    $('stop-audio')?.addEventListener('click', () => stopSpeakerTest());

    applyVolume();
    applyFrequency();
    applyWaveform();
}
