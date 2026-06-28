const { Readable } = require('stream');

let cloudinaryModule = null;

function getCloudinary() {
  if (cloudinaryModule) return cloudinaryModule;
  try {
    cloudinaryModule = require('cloudinary').v2;
    cloudinaryModule.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    return cloudinaryModule;
  } catch {
    throw new Error('cloudinary package is not installed. Run: npm install cloudinary');
  }
}

function isConfigured() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

async function upload(fileBuffer, fileName) {
  const cloudinary = getCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', public_id: fileName.replace(/\.[^.]+$/, ''), folder: 'amertak-share' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ storagePath: result.secure_url, storageKey: result.public_id });
      }
    );
    Readable.from(fileBuffer).pipe(stream);
  });
}

async function download(storageKey) {
  const cloudinary = getCloudinary();
  const result = cloudinary.url(storageKey, { resource_type: 'auto', secure: true });
  const response = await fetch(result);
  if (!response.ok) return null;
  return Readable.fromWeb(response.body);
}

async function remove(storageKey) {
  const cloudinary = getCloudinary();
  await cloudinary.uploader.destroy(storageKey, { resource_type: 'auto' });
}

async function exists(storageKey) {
  try {
    const cloudinary = getCloudinary();
    await cloudinary.api.resource(storageKey, { resource_type: 'auto' });
    return true;
  } catch {
    return false;
  }
}

module.exports = { upload, download, remove, exists, isConfigured, name: 'cloudinary' };
