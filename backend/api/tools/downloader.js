const express = require('express');
const { execFile } = require('child_process');
const { promisify } = require('util');
const youtubedl = require('youtube-dl-exec');
const { requireUser } = require('../_lib/require-user');

const router = express.Router();

const cache = new Map();
const activeRequests = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes

// Prevent memory leak by cleaning up expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [url, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(url);
    }
  }
}, 5 * 60 * 1000).unref();

const execFileAsync = promisify(execFile);
const YTDLP_BINARY = process.env.YTDLP_PATH || 'yt-dlp';
const MAX_RETRIES = 2;
const EXEC_TIMEOUT_MS = 60000;

const SUPPORTED_PLATFORMS = [
  'TikTok',
  'Instagram',
  'YouTube',
  'Facebook',
  'X / Twitter',
  'Threads',
  'Snapchat',
  'Pinterest',
  'Reddit',
  'Vimeo',
  'Dailymotion',
  'SoundCloud',
  'Bilibili'
];

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatBytes(value) {
  const size = Number(value);
  return Number.isFinite(size) && size > 0 ? size : null;
}

function formatDuration(seconds) {
  const sec = Number(seconds);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function normalizeFormat(format = {}) {
  const url = format.url || format.fragment_base_url;
  if (!url) return null;

  const hasVideo = format.vcodec && format.vcodec !== 'none';
  const hasAudio = format.acodec && format.acodec !== 'none';
  const extension = format.ext || 'media';
  const height = format.height ? Number(format.height) : 0;
  const heightLabel = height ? `${height}p` : '';
  const fps = format.fps ? `${format.fps}fps` : '';
  const quality = [heightLabel, fps, format.format_note || format.resolution].filter(Boolean).join(' ') || format.format_id || extension;

  return {
    url,
    quality,
    type: hasVideo && hasAudio ? 'video' : hasVideo ? 'video only' : hasAudio ? 'audio' : 'media',
    extension,
    size: formatBytes(format.filesize || format.filesize_approx),
    codec: hasVideo ? format.vcodec : hasAudio ? format.acodec : null,
    bitrate: format.tbr ? Math.round(format.tbr) : null,
    height,
    tbr: format.tbr || 0,
    abr: format.abr || 0
  };
}

function normalizePayload(payload) {
  const formats = Array.isArray(payload.formats) ? payload.formats : [];
  const medias = formats
    .map(normalizeFormat)
    .filter(Boolean)
    .filter((media, index, list) => list.findIndex((item) => item.url === media.url) === index);

  if (!medias.length && payload.url) {
    medias.push({
      url: payload.url,
      quality: payload.format || payload.ext || 'media',
      type: payload.vcodec && payload.vcodec !== 'none' ? 'video' : 'media',
      extension: payload.ext || 'media',
      size: formatBytes(payload.filesize || payload.filesize_approx),
      codec: null,
      bitrate: null,
      height: payload.height || 0,
      tbr: payload.tbr || 0,
      abr: payload.abr || 0
    });
  }

  const thumbnails = [];
  if (payload.thumbnail) {
    thumbnails.push(payload.thumbnail);
  }
  if (Array.isArray(payload.thumbnails)) {
    payload.thumbnails.forEach((t) => {
      if (t.url && !thumbnails.includes(t.url)) thumbnails.push(t.url);
    });
  }

  // Unified format extraction
  const downloads = {
    video: '',
    audio: '',
    images: []
  };

  // Best video: highest height, then highest tbr
  const bestVideo = medias
    .filter(m => m.type === 'video' || m.type === 'video only')
    .sort((a, b) => (b.height - a.height) || (b.tbr - a.tbr))[0];
  if (bestVideo) downloads.video = bestVideo.url;

  // Best audio: highest abr
  const bestAudio = medias
    .filter(m => m.type === 'audio')
    .sort((a, b) => b.abr - a.abr)[0];
  if (bestAudio) {
    downloads.audio = bestAudio.url;
  } else if (bestVideo) {
    downloads.audio = bestVideo.url; // Fallback to video if no audio-only
  }

  // Images / Slideshow
  if (payload.entries && Array.isArray(payload.entries)) {
    downloads.images = payload.entries.map(e => e.url || e.thumbnail).filter(Boolean);
  } else {
    downloads.images = thumbnails.filter(Boolean);
  }

  return {
    success: true,
    platform: payload.extractor_key || payload.extractor || 'Unknown',
    title: payload.title || payload.fulltitle || 'Untitled',
    author: payload.uploader || payload.channel || payload.creator || 'Unknown',
    thumbnail: payload.thumbnail || '',
    downloads,
    // Original fields for backward compatibility
    thumbnails: thumbnails.slice(0, 5),
    source: payload.extractor_key || payload.extractor || '',
    duration: payload.duration || null,
    durationFormatted: formatDuration(payload.duration),
    uploadDate: payload.upload_date || null,
    viewCount: payload.view_count || null,
    likeCount: payload.like_count || null,
    description: payload.description ? payload.description.slice(0, 500) : null,
    medias: medias.slice(0, 30),
    supportedPlatforms: SUPPORTED_PLATFORMS
  };
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  let referer = 'https://www.google.com/';

  if (url.includes('tiktok.com')) referer = 'https://www.tiktok.com/';
  else if (url.includes('instagram.com')) referer = 'https://www.instagram.com/';
  else if (url.includes('facebook.com')) referer = 'https://www.facebook.com/';
  else if (url.includes('youtube.com') || url.includes('youtu.be')) referer = 'https://www.youtube.com/';
  else if (url.includes('twitter.com') || url.includes('x.com')) referer = 'https://x.com/';

  const ytdlpArgs = [
    '--dump-single-json',
    '--no-warnings',
    '--no-call-home',
    '--no-check-certificate',
    '--skip-download',
    '--format', 'bestvideo+bestaudio/best',
    '--add-header', `referer:${referer}`,
    '--add-header', `user-agent:${userAgent}`,
    url
  ];

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let childProcess;
    try {
      // Use Promise.race to enforce timeout strictly
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          if (childProcess) {
            try {
              childProcess.kill('SIGTERM');
            } catch (e) {
              // ignore
            }
          }
          reject(new Error('Extraction timed out'));
        }, EXEC_TIMEOUT_MS)
      );

      const execute = new Promise((resolve, reject) => {
        childProcess = execFile(YTDLP_BINARY, ytdlpArgs, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve({ stdout });
          }
        });
      });

      const { stdout } = await Promise.race([execute, timeoutPromise]);
      return JSON.parse(stdout);
    } catch (err) {
      lastError = err;
      if (err.message === 'Extraction timed out') break;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  try {
    const payload = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificates: true,
      skipDownload: true,
      format: 'bestvideo+bestaudio/best',
      addHeader: [
        `referer:${referer}`,
        `user-agent:${userAgent}`
      ]
    });
    return payload;
  } catch (fallbackError) {
    console.error('yt-dlp primary error:', lastError?.message || lastError);
    console.error('youtube-dl-exec fallback error:', fallbackError?.message || fallbackError);
    throw fallbackError;
  }
}

router.get('/', async (req, res) => {
  res.status(200).json({
    success: true,
    supportedPlatforms: SUPPORTED_PLATFORMS
  });
});

router.post('/', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const url = String(req.body?.url || '').trim();
  if (!url || !isValidUrl(url)) {
    res.status(400).json({ success: false, error: 'Please enter a valid http or https URL.' });
    return;
  }

  // 1. Check Cache
  const cached = cache.get(url);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return res.status(200).json(cached.data);
  }

  // 2. Check for active requests to prevent duplicate work
  if (activeRequests.has(url)) {
    try {
      const data = await activeRequests.get(url);
      return res.status(200).json(data);
    } catch (error) {
      // If the active request failed, we'll try again below
    }
  }

  // 3. Perform extraction
  const extractionPromise = (async () => {
    const payload = await fetchWithRetry(url);
    const normalized = normalizePayload(payload);

    if (!normalized.medias || !normalized.medias.length) {
      throw new Error('No downloadable media was found for this URL.');
    }

    // Store in cache
    cache.set(url, {
      timestamp: Date.now(),
      data: normalized
    });

    return normalized;
  })();

  activeRequests.set(url, extractionPromise);

  try {
    const normalized = await extractionPromise;
    res.status(200).json(normalized);
  } catch (error) {
    console.error('downloader error:', error?.message || error);
    res.status(502).json({
      success: false,
      error: error.message || 'Unable to fetch media from the provided URL. The site may block downloads or require login.'
    });
  } finally {
    activeRequests.delete(url);
  }
});

module.exports = {
  router,
  normalizePayload,
  isValidUrl,
  fetchWithRetry
};
