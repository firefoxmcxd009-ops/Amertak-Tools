const express = require('express');
const multer = require('multer');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4', '.webm', '.mkv', '.mov', '.ogg', '.flac', '.aac'];
const MAX_FILE_SIZE = 200 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Supported: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
  }
});

const router = express.Router();

router.get('/formats', (req, res) => {
  res.status(200).json({
    success: true,
    supportedFormats: ALLOWED_EXTENSIONS,
    maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024)
  });
});

router.post('/', upload.single('file'), async (req, res) => {
  const startTime = Date.now();

  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded. Please upload an audio or video file.' });
    return;
  }

  if (!OPENAI_API_KEY) {
    res.status(500).json({ success: false, error: 'OPENAI_API_KEY is not configured on the server. Transcription is unavailable.' });
    return;
  }

  const language = typeof req.body.language === 'string' ? req.body.language.split('-')[0] : undefined;

  try {
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    if (language && language !== 'auto') {
      formData.append('language', language);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await response.json();
    if (!response.ok) {
      console.error('OpenAI transcription error:', data);
      res.status(response.status).json({
        success: false,
        error: data.error?.message || 'Transcription service error.'
      });
      return;
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);

    res.status(200).json({
      success: true,
      text: String(data.text || ''),
      language: data.language || language || 'unknown',
      duration: data.duration || null,
      processingTimeSeconds: Number(processingTime),
      segments: Array.isArray(data.segments) ? data.segments.map((seg) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text
      })) : []
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      res.status(504).json({ success: false, error: 'Transcription timed out. Try a shorter file.' });
      return;
    }
    console.error('Transcription API failed:', error);
    res.status(502).json({ success: false, error: 'Transcription failed due to a server error.' });
  }
});

module.exports = router;
