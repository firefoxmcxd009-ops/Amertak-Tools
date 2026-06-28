const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

async function upload(fileBuffer, fileName) {
  ensureDir();
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, fileBuffer);
  return { storagePath: filePath, storageKey: fileName };
}

async function download(storageKey) {
  const filePath = path.join(UPLOAD_DIR, storageKey);
  if (!fs.existsSync(filePath)) return null;
  return fs.createReadStream(filePath);
}

async function remove(storageKey) {
  const filePath = path.join(UPLOAD_DIR, storageKey);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

async function exists(storageKey) {
  return fs.existsSync(path.join(UPLOAD_DIR, storageKey));
}

module.exports = { upload, download, remove, exists, name: 'local' };
