const express = require('express');
const { execFile } = require('child_process');
const { promisify } = require('util');
const youtubedl = require('youtube-dl-exec');
const { requireUser } = require('../_lib/require-user');

const router = express.Router();

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
  const height = format.height ? `${format.height}p` : '';
  const fps = format.fps ? `${format.fps}fps` : '';
  const quality = [height, fps, format.format_note || format.resolution].filter(Boolean).join(' ') || format.format_id || extension;

  return {
    url,
    quality,
    type: hasVideo && hasAudio ? 'video' : hasVideo ? 'video only' : hasAudio ? 'audio' : 'media',
    extension,
    size: formatBytes(format.filesize || format.filesize_approx),
    codec: hasVideo ? format.vcodec : hasAudio ? format.acodec : null,
    bitrate: format.tbr ? Math.round(format.tbr) : null
  };
}

function normalizePayload(payload) {
  const formats = Array.isArray(payload.formats) ? payload.formats : [];
  const medias = formats
    .map(normalizeFormat)
    .filter(Boolean)
    .filter((media, index, list) => list.findIndex((item) => item.url === media.url) === index)
    .slice(0, 30);

  if (!medias.length && payload.url) {
    medias.push({
      url: payload.url,
      quality: payload.format || payload.ext || 'media',
      type: payload.vcodec && payload.vcodec !== 'none' ? 'video' : 'media',
      extension: payload.ext || 'media',
      size: formatBytes(payload.filesize || payload.filesize_approx),
      codec: null,
      bitrate: null
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

  return {
    success: true,
    title: payload.title || payload.fulltitle || 'Untitled',
    author: payload.uploader || payload.channel || payload.creator || 'Unknown',
    thumbnail: payload.thumbnail || '',
    thumbnails: thumbnails.slice(0, 5),
    source: payload.extractor_key || payload.extractor || '',
    duration: payload.duration || null,
    durationFormatted: formatDuration(payload.duration),
    uploadDate: payload.upload_date || null,
    viewCount: payload.view_count || null,
    likeCount: payload.like_count || null,
    description: payload.description ? payload.description.slice(0, 500) : null,
    medias,
    supportedPlatforms: SUPPORTED_PLATFORMS
  };
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  const ytdlpArgs = [
    '--dump-single-json',
    '--no-warnings',
    '--no-call-home',
    '--no-check-certificate',
    '--skip-download',
    '--prefer-free-formats',
    '--add-header', 'referer:youtube.com',
    '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    url
  ];

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { stdout } = await execFileAsync(YTDLP_BINARY, ytdlpArgs, {
        maxBuffer: 20 * 1024 * 1024,
        timeout: EXEC_TIMEOUT_MS
      });
      return JSON.parse(stdout);
    } catch (err) {
      lastError = err;
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
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

  try {
    const payload = await fetchWithRetry(url);
    const normalized = normalizePayload(payload);

    if (!normalized.medias.length) {
      res.status(404).json({
        success: false,
        error: 'No downloadable media was found for this URL.',
        ...normalized
      });
      return;
    }

    res.status(200).json(normalized);
  } catch (error) {
    console.error('downloader error:', error?.message || error);
    res.status(502).json({
      success: false,
      error: 'Unable to fetch media from the provided URL. The site may block downloads or require login.'
    });
  }
});

module.exports = router;
