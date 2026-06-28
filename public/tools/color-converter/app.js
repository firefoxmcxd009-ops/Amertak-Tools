const hexInput = document.getElementById('hexInput');
const colorInput = document.getElementById('colorInput');
const copyBtn = document.getElementById('copyBtn');
const randomBtn = document.getElementById('randomBtn');
const statusText = document.getElementById('statusText');
const preview = document.getElementById('colorPreview');
const hexOut = document.getElementById('hexOut');
const rgbOut = document.getElementById('rgbOut');
const hslOut = document.getElementById('hslOut');
const hsvOut = document.getElementById('hsvOut');

async function updateColor(value) {
    if (!normalizeHex(value)) {
        statusText.textContent = 'Invalid HEX color.';
        statusText.style.color = '#ff5c7a';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/tools/color-converter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ hex: value })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || 'Color conversion failed.');

        const { hex, rgb, hsl, hsv } = payload;
        statusText.textContent = 'Ready.';
        statusText.style.color = '';
        hexInput.value = hex;
        colorInput.value = hex;
        preview.style.background = hex;
        hexOut.textContent = hex;
        rgbOut.textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        hslOut.textContent = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
        hsvOut.textContent = `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;
    } catch (error) {
        statusText.textContent = error.message || 'Color conversion failed.';
        statusText.style.color = '#ff5c7a';
    }
}

hexInput.addEventListener('input', () => updateColor(hexInput.value));
colorInput.addEventListener('input', () => updateColor(colorInput.value));
copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(hexOut.textContent);
    statusText.textContent = 'HEX copied.';
});
randomBtn.addEventListener('click', () => {
    const hex = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
    updateColor(hex);
});

updateColor(hexInput.value);
