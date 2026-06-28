const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : 'https://amertak-tools-f3zb.onrender.com';

function normalizeHex(value) {
    let hex = String(value || '').trim().replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map((char) => char + char).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return `#${hex.toLowerCase()}`;
}

function isValidUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function clampNumber(value, min, max, fallback) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

function setStatus(nodeOrId, message, type) {
    const node = typeof nodeOrId === 'string' ? document.getElementById(nodeOrId) : nodeOrId;
    if (!node) return;
    node.textContent = message;

    if (type === undefined) {
        node.style.color = '';
        return;
    }

    if (typeof type === 'boolean') {
        node.style.color = type ? '#ff5c7a' : '';
        return;
    }

    node.classList.toggle('is-error', type === 'error');
    node.classList.toggle('is-success', type === 'success');
    node.style.color = '';
}

function formatFileSize(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return 'Size unknown';

    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function generateId() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readImageFile(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error(`${file.name} is not an image`));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve({
            id: generateId(),
            name: file.name,
            size: file.size,
            type: file.type,
            data: reader.result
        });
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function setupDropZone(dropZone, options) {
    const dragClass = options.dragClass || 'is-dragging';

    ['dragenter', 'dragover'].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.add(dragClass);
        });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.remove(dragClass);
        });
    });

    if (typeof options.onDrop === 'function') {
        dropZone.addEventListener('drop', (event) => {
            options.onDrop(event.dataTransfer.files);
        });
    }
}

function trackPageView() {
    const currentPage = window.location.pathname;

    fetch('https://tools-amertak.vercel.app/api/track-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageName: currentPage })
    })
    .then(res => res.json())
    .then(data => console.log('Page view tracked:', data))
    .catch(err => console.error('Analytics Error:', err));
}

window.addEventListener('DOMContentLoaded', trackPageView);
