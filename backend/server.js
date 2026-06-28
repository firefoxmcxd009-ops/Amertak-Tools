const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRouter = require('./server/authRoutes');
const imageToUrlRouter = require('./api/tools/image-to-url');
const downloaderRouter = require('./api/tools/downloader');
const transcribeRouter = require('./api/tools/transcribe');
const qrCodeRouter = require('./api/tools/qr-code');
const textTranslatorRouter = require('./api/tools/text-translator');
const textCounterRouter = require('./api/tools/text-counter');
const colorConverterRouter = require('./api/tools/color-converter');
const shareRouter = require('./api/share');
const { ensureIndexes } = require('./api/_lib/db-indexes');

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// CORS configuration for frontend domains
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = [
  'https://amertak-tools.vercel.app',
  'https://tools-amertak.vercel.app',
  'https://www.amertak-tools.vercel.app',
  'https://www.tools-amertak.vercel.app',
  'https://amertak.tools',
  'https://www.amertak.tools',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  ...configuredOrigins
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please try again later.' }
});

// Stricter limiter for downloader
const downloaderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many download requests. Please slow down.' }
});

// Stricter limiter for upload
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many upload requests. Please slow down.' }
});

app.use(globalLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/tools/image-to-url', imageToUrlRouter);
app.use('/api/tools/downloader', downloaderLimiter, downloaderRouter);
app.use('/api/tools/transcribe', uploadLimiter, transcribeRouter);
app.use('/api/tools/qr-code', qrCodeRouter);
app.use('/api/tools/text-translator', textTranslatorRouter);
app.use('/api/tools/text-counter', textCounterRouter);
app.use('/api/tools/color-converter', colorConverterRouter);
app.use('/api/share', shareRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running', timestamp: new Date().toISOString() });
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, _next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Request payload too large.' });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'File too large.' });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, error: 'CORS policy: Origin not allowed.' });
  }

  console.error('Server error:', err.message || err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error')
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Amertak Tools API Server listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  ensureIndexes().catch(() => {});
});
