const express = require('express');
const multer = require('multer');
const { requireUser } = require('../_lib/require-user');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const ALLOWED_MIMETYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm',
  'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/x-m4a',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio and video files are accepted.'));
    }
  }
});
const router = express.Router();

router.post('/', upload.single('file'), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded. Please upload an audio or video file.' });
    return;
  }

  if (!OPENAI_API_KEY) {
    res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server. Transcription is unavailable.' });
    return;
  }

  const language = typeof req.body.language === 'string' ? req.body.language : 'en';

  try {
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);
    formData.append('model', 'whisper-1');
    formData.append('language', language);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('OpenAI transcription error:', data);
      res.status(response.status).json({ message: data.error?.message || 'Transcription service error.' });
      return;
    }

    res.status(200).json({ success: true, text: String(data.text || '') });
  } catch (error) {
    console.error('Transcription API failed:', error);
    res.status(502).json({ message: 'Transcription failed due to a server error.' });
  }
});

module.exports = router;
