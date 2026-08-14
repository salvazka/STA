import { $ } from './dom.js';
import { refreshIcons } from './icons.js';

const ICONS = {
    success: 'circle-check',
    error: 'alert-triangle',
    info: 'info'
};

export function showToast(message, type = 'info', duration = 3200) {
    const stack = $('toast-stack');
    if (!stack) return;

    const toast = document.createElement('div');
    toast.className = `toast is-${type}`;

    const icon = document.createElement('i');
    icon.dataset.lucide = ICONS[type] || ICONS.info;

    const label = document.createElement('span');
    label.textContent = message;

    toast.append(icon, label);
    stack.appendChild(toast);
    refreshIcons();

    setTimeout(() => {
        toast.classList.add('is-leaving');
        setTimeout(() => toast.remove(), 260);
    }, duration);
}
