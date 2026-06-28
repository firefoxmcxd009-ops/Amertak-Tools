const localProvider = require('./local');

let activeProvider = null;

function getProvider() {
  if (activeProvider) return activeProvider;

  const providerName = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

  switch (providerName) {
    case 'cloudinary': {
      const cloudinary = require('./cloudinary');
      if (!cloudinary.isConfigured()) {
        console.warn('Cloudinary not configured, falling back to local storage');
        activeProvider = localProvider;
      } else {
        activeProvider = cloudinary;
      }
      break;
    }
    case 's3':
    case 'backblaze':
    case 'b2': {
      const s3 = require('./s3');
      if (!s3.isConfigured()) {
        console.warn('S3/B2 not configured, falling back to local storage');
        activeProvider = localProvider;
      } else {
        activeProvider = s3;
      }
      break;
    }
    default:
      activeProvider = localProvider;
  }

  console.log(`Storage provider: ${activeProvider.name}`);
  return activeProvider;
}

module.exports = { getProvider };
