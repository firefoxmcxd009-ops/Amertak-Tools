(function(){
  const textInput = document.getElementById('text-input');
  const counter = document.getElementById('counter');
  const chips = document.getElementById('chips');
  const voiceBtns = document.querySelectorAll('.voice-btn');
  const baseUrlInput = document.getElementById('base-url');
  const generateBtn = document.getElementById('generate-btn');
  const statusEl = document.getElementById('status');
  const player = document.getElementById('player');
  const voiceMeta = document.getElementById('voice-meta');
  const canvas = document.getElementById('wave');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('play-btn');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const timeCurrent = document.getElementById('time-current');
  const timeTotal = document.getElementById('time-total');
  const downloadBtn = document.getElementById('download-btn');
  const shareBtn = document.getElementById('share-btn');
  const toast = document.getElementById('toast');
  const audioEl = document.getElementById('audio-el');

  const MAX_CHARS = 2000;
  let selectedVoice = 'km-KH-PisethNeural';
  let peaks = null;             // downsampled amplitude data for drawing
  let currentBlob = null;
  let currentObjectUrl = null;
  let currentFilename = 'khmer-tts.mp3';
  let toastTimer = null;

  // ---------- Character counter ----------
  function updateCounter(){
    const len = textInput.value.length;
    counter.textContent = len + ' / ' + MAX_CHARS;
    counter.classList.remove('warn','over');
    if (len > MAX_CHARS) counter.classList.add('over');
    else if (len > MAX_CHARS * 0.85) counter.classList.add('warn');
  }
  textInput.addEventListener('input', updateCounter);
  updateCounter();

  // ---------- Quick phrase chips ----------
  chips.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    textInput.value = btn.textContent.trim();
    updateCounter();
    textInput.focus();
  });

  // ---------- Voice toggle ----------
  voiceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      voiceBtns.forEach(b => b.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
      selectedVoice = btn.dataset.voice;
    });
  });

  // ---------- Status helper ----------
  function showStatus(message, type){
    statusEl.textContent = message;
    statusEl.className = 'status show ' + (type || 'info');
  }
  function hideStatus(){
    statusEl.className = 'status';
  }

  // ---------- Toast helper ----------
  function showToast(message){
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  // ---------- Waveform drawing ----------
  function drawWave(progress){
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) {
      canvas.width = Math.round(w*dpr);
      canvas.height = Math.round(h*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);

    if (!peaks || !peaks.length) {
      // idle placeholder — flat gentle line
      ctx.strokeStyle = 'rgba(168,156,184,.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, h/2);
      ctx.lineTo(w, h/2);
      ctx.stroke();
      return;
    }

    const barCount = peaks.length;
    const gap = 2;
    const barW = Math.max(1.5, (w - gap*(barCount-1)) / barCount);
    const midY = h/2;
    const playedBars = Math.floor((progress || 0) * barCount);

    for (let i=0; i<barCount; i++){
      const amp = peaks[i];
      const barH = Math.max(2, amp * (h*0.86));
      const x = i * (barW + gap);
      const played = i < playedBars;

      ctx.fillStyle = '#c8003f';
      ctx.globalAlpha = played ? 1 : 0.55;
      const y = midY - barH/2;
      const r = Math.min(2, barW/2);
      roundRect(ctx, x, y, barW, barH, r);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  window.addEventListener('resize', () => drawWave(currentProgress()));

  function currentProgress(){
    if (!audioEl.duration || isNaN(audioEl.duration)) return 0;
    return audioEl.currentTime / audioEl.duration;
  }

  // ---------- Decode audio into peaks via Web Audio API ----------
  async function computePeaks(arrayBuffer){
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    try {
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      const raw = audioBuffer.getChannelData(0);
      const barCount = 120;
      const blockSize = Math.floor(raw.length / barCount);
      const result = [];
      let maxVal = 0;
      for (let i=0; i<barCount; i++){
        let sum = 0;
        const start = i * blockSize;
        for (let j=0; j<blockSize; j++){
          sum += Math.abs(raw[start+j] || 0);
        }
        const avg = sum / blockSize;
        result.push(avg);
        if (avg > maxVal) maxVal = avg;
      }
      const normalized = maxVal > 0 ? result.map(v => v / maxVal) : result;
      audioCtx.close();
      return normalized;
    } catch (err) {
      audioCtx.close();
      throw err;
    }
  }

  // ---------- Format time ----------
  function fmtTime(sec){
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec/60);
    const s = Math.floor(sec%60);
    return m + ':' + String(s).padStart(2,'0');
  }

  // ---------- Generate speech ----------
  generateBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    hideStatus();

    if (!text){
      showStatus('សូមវាយអត្ថបទសិន — Please enter some text first.', 'error');
      textInput.focus();
      return;
    }
    if (text.length > MAX_CHARS){
      showStatus('អត្ថបទវែងពេក — Text exceeds the 2,000 character limit.', 'error');
      return;
    }

    const base = baseUrlInput.value.trim().replace(/\/$/, '') || 'https://amertak.onrender.com';
    const url = base + '/api/tts';

    generateBtn.classList.add('loading');
    generateBtn.disabled = true;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: selectedVoice })
      });

      const contentType = res.headers.get('content-type') || '';

      if (!res.ok || contentType.includes('application/json')) {
        let message = 'TTS request failed (HTTP ' + res.status + ').';
        try {
          const errJson = await res.json();
          if (errJson && errJson.error) message = errJson.error;
        } catch (_) {}
        showStatus('⚠ ' + message, 'error');
        return;
      }

      const blob = await res.blob();
      if (!blob.size) {
        showStatus('⚠ Server returned an empty audio response.', 'error');
        return;
      }

      currentBlob = blob;
      currentFilename = 'Amertak-Tts' + Date.now() + '.mp3';

      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = URL.createObjectURL(blob);
      audioEl.src = currentObjectUrl;

      const voiceLabel = selectedVoice.includes('Piseth') ? 'ពិសិដ្ឋ · Male' : 'ស្រីមុំ · Female';
      voiceMeta.textContent = voiceLabel;

      player.classList.add('show');
      resetPlayUI();

      showStatus('✓ បង្កើតរួចរាល់ — Speech generated successfully.', 'info');

      // Decode for real waveform data (best-effort; playback still works if this fails)
      try {
        const buf = await blob.arrayBuffer();
        peaks = await computePeaks(buf);
      } catch (waveErr) {
        peaks = null;
        console.warn('Waveform decode failed:', waveErr);
      }
      drawWave(0);

    } catch (err) {
      console.error(err);
      showStatus('⚠ Network error — could not reach ' + url + '. Check the API Base URL and CORS settings.', 'error');
    } finally {
      generateBtn.classList.remove('loading');
      generateBtn.disabled = false;
    }
  });

  // ---------- Playback controls ----------
  function resetPlayUI(){
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    timeCurrent.textContent = '0:00';
    timeTotal.textContent = '0:00';
  }

  playBtn.addEventListener('click', () => {
    if (!currentObjectUrl) return;
    if (audioEl.paused) audioEl.play();
    else audioEl.pause();
  });

  audioEl.addEventListener('play', () => {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  });
  audioEl.addEventListener('pause', () => {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  });
  audioEl.addEventListener('ended', () => {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  });
  audioEl.addEventListener('loadedmetadata', () => {
    timeTotal.textContent = fmtTime(audioEl.duration);
  });
  audioEl.addEventListener('timeupdate', () => {
    timeCurrent.textContent = fmtTime(audioEl.currentTime);
    drawWave(currentProgress());
  });

  // Seek by clicking the waveform
  canvas.addEventListener('click', (e) => {
    if (!audioEl.duration || isNaN(audioEl.duration)) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioEl.currentTime = ratio * audioEl.duration;
    drawWave(ratio);
  });

  // ---------- Download ----------
  downloadBtn.addEventListener('click', () => {
    if (!currentBlob) return;
    const a = document.createElement('a');
    a.href = currentObjectUrl;
    a.download = currentFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Downloaded ' + currentFilename);
  });

  // ---------- Share ----------
  shareBtn.addEventListener('click', async () => {
    if (!currentBlob) return;

    const file = new File([currentBlob], currentFilename, { type: 'audio/mpeg' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Khmer TTS clip',
          text: textInput.value.trim().slice(0, 120)
        });
        showToast('Shared successfully.');
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return; // user cancelled — no toast needed
        console.warn('Share failed, falling back to download:', err);
      }
    }

    // Fallback: this browser can't share files directly, so download instead
    downloadBtn.click();
    showToast("Sharing isn't supported in this browser — downloaded the file instead.");
  });

  // Initial idle waveform
  drawWave(0);
})();