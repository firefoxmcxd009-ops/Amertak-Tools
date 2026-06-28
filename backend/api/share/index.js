const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { getDb } = require('../_lib/db');
const { requireUser } = require('../_lib/require-user');
const { getUserFromRequest } = require('../_lib/auth');
const { getProvider } = require('../../storage');

const router = express.Router();

const MAX_FILE_SIZE = Number(process.env.MAX_UPLOAD_SIZE_MB || 100) * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

function generateFileId() {
  return crypto.randomBytes(8).toString('hex');
}

function getBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  const proto = req.headers?.['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  return host ? `${proto}://${host}` : 'https://amertak-tools.vercel.app';
}

function getMimeCategory(mimeType) {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('document') || mimeType.includes('word') ||
      mimeType.includes('spreadsheet') || mimeType.includes('presentation') ||
      mimeType.includes('excel') || mimeType.includes('powerpoint')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') ||
      mimeType.includes('tar') || mimeType.includes('gzip')) return 'archive';
  return 'other';
}

router.post('/upload', upload.single('file'), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded.' });
  }

  try {
    const fileId = generateFileId();
    const ext = path.extname(req.file.originalname).toLowerCase();
    const storageFileName = `${fileId}${ext}`;

    const storage = getProvider();
    const { storagePath, storageKey } = await storage.upload(req.file.buffer, storageFileName);

    const expiresInHours = Number(req.body.expiresInHours) || 0;
    const isPublic = req.body.isPublic !== 'false';

    const fileDoc = {
      _id: fileId,
      originalName: req.file.originalname,
      fileName: storageFileName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      category: getMimeCategory(req.file.mimetype),
      storageProvider: storage.name,
      storageKey,
      storagePath,
      isPublic,
      downloads: 0,
      uploadedAt: new Date(),
      expiresAt: expiresInHours > 0 ? new Date(Date.now() + expiresInHours * 3600000) : null,
      userId: user.id,
      description: req.body.description || ''
    };

    const db = await getDb();
    await db.collection('shared_files').insertOne(fileDoc);

    const baseUrl = getBaseUrl(req);
    res.status(200).json({
      success: true,
      fileId,
      shareUrl: `${baseUrl}/share/${fileId}`,
      downloadUrl: `${baseUrl}/api/share/${fileId}/download`,
      file: {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        category: fileDoc.category
      }
    });
  } catch (error) {
    console.error('Share upload error:', error);
    res.status(500).json({ success: false, error: 'File upload failed.' });
  }
});

router.post('/generate-link', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { fileId, expiresInHours } = req.body;
  if (!fileId) {
    return res.status(400).json({ success: false, error: 'fileId is required.' });
  }

  try {
    const db = await getDb();
    const file = await db.collection('shared_files').findOne({ _id: fileId, userId: user.id });
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found.' });
    }

    const update = {};
    if (expiresInHours) {
      update.expiresAt = new Date(Date.now() + Number(expiresInHours) * 3600000);
    }
    if (Object.keys(update).length) {
      await db.collection('shared_files').updateOne({ _id: fileId }, { $set: update });
    }

    const baseUrl = getBaseUrl(req);
    res.status(200).json({
      success: true,
      shareUrl: `${baseUrl}/share/${fileId}`,
      downloadUrl: `${baseUrl}/api/share/${fileId}/download`
    });
  } catch (error) {
    console.error('Generate link error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate link.' });
  }
});

router.get('/info/:fileId', async (req, res) => {
  const { fileId } = req.params;

  try {
    const db = await getDb();
    const file = await db.collection('shared_files').findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found.' });
    }

    if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: 'This file has expired.' });
    }

    if (!file.isPublic) {
      const user = await getUserFromRequest(req);
      if (!user || user.id !== file.userId) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
      }
    }

    res.status(200).json({
      success: true,
      file: {
        id: file._id,
        name: file.originalName,
        size: file.size,
        type: file.mimeType,
        category: file.category,
        downloads: file.downloads,
        uploadedAt: file.uploadedAt,
        expiresAt: file.expiresAt,
        description: file.description,
        isPublic: file.isPublic
      }
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ success: false, error: 'Failed to get file info.' });
  }
});

router.get('/:fileId', async (req, res) => {
  const { fileId } = req.params;

  try {
    const db = await getDb();
    const file = await db.collection('shared_files').findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found.' });
    }

    if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: 'This file has expired.' });
    }

    if (!file.isPublic) {
      const user = await getUserFromRequest(req);
      if (!user || user.id !== file.userId) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
      }
    }

    await db.collection('shared_files').updateOne({ _id: fileId }, { $inc: { downloads: 1 } });

    const baseUrl = getBaseUrl(req);
    res.status(200).json({
      success: true,
      file: {
        id: file._id,
        name: file.originalName,
        size: file.size,
        type: file.mimeType,
        category: file.category,
        downloads: (file.downloads || 0) + 1,
        uploadedAt: file.uploadedAt,
        expiresAt: file.expiresAt,
        description: file.description,
        downloadUrl: `${baseUrl}/api/share/${fileId}/download`
      }
    });
  } catch (error) {
    console.error('File fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve file.' });
  }
});

router.get('/:fileId/download', async (req, res) => {
  const { fileId } = req.params;

  try {
    const db = await getDb();
    const file = await db.collection('shared_files').findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found.' });
    }

    if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: 'This file has expired.' });
    }

    if (!file.isPublic) {
      const user = await getUserFromRequest(req);
      if (!user || user.id !== file.userId) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
      }
    }

    const storage = getProvider();
    const stream = await storage.download(file.storageKey);

    if (!stream) {
      return res.status(404).json({ success: false, error: 'File data not found in storage.' });
    }

    await db.collection('shared_files').updateOne({ _id: fileId }, { $inc: { downloads: 1 } });

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    if (file.size) {
      res.setHeader('Content-Length', file.size);
    }

    stream.pipe(res);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ success: false, error: 'Failed to download file.' });
  }
});

module.exports = router;
