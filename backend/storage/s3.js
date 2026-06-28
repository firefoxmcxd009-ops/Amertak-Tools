const { Readable } = require('stream');

let s3Client = null;
let S3Module = null;

function getS3() {
  if (s3Client) return s3Client;
  try {
    S3Module = require('@aws-sdk/client-s3');
    s3Client = new S3Module.S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
      }
    });
    return s3Client;
  } catch {
    throw new Error('@aws-sdk/client-s3 package is not installed. Run: npm install @aws-sdk/client-s3');
  }
}

function getBucket() {
  return process.env.S3_BUCKET || 'amertak-share';
}

function isConfigured() {
  return !!(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET);
}

async function upload(fileBuffer, fileName) {
  const client = getS3();
  const bucket = getBucket();
  const command = new S3Module.PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    Body: fileBuffer
  });
  await client.send(command);
  return { storagePath: `s3://${bucket}/${fileName}`, storageKey: fileName };
}

async function download(storageKey) {
  const client = getS3();
  const command = new S3Module.GetObjectCommand({
    Bucket: getBucket(),
    Key: storageKey
  });
  try {
    const response = await client.send(command);
    return response.Body;
  } catch {
    return null;
  }
}

async function remove(storageKey) {
  const client = getS3();
  const command = new S3Module.DeleteObjectCommand({
    Bucket: getBucket(),
    Key: storageKey
  });
  await client.send(command);
}

async function exists(storageKey) {
  const client = getS3();
  try {
    const command = new S3Module.HeadObjectCommand({
      Bucket: getBucket(),
      Key: storageKey
    });
    await client.send(command);
    return true;
  } catch {
    return false;
  }
}

module.exports = { upload, download, remove, exists, isConfigured, name: 's3' };
