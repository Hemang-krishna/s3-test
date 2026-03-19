const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const loadEnv = require('./loadEnv');

loadEnv();

const ALLOWED_MEDIA_TYPES = ['image/', 'video/', 'audio/'];
const DEFAULT_REGION = process.env.AWS_REGION || 'ap-south-2';
const DEFAULT_BUCKET = process.env.AWS_S3_BUCKET || 'localaitv-app-data-689186650531-ap-south-2-an';

function isSupportedMediaType(contentType) {
  return ALLOWED_MEDIA_TYPES.some((prefix) => contentType.startsWith(prefix));
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function buildObjectKey(fileName, folder = 'media') {
  const prefix = (process.env.AWS_S3_PREFIX || 'uploads').replace(/^\/+|\/+$/g, '');
  return `${prefix}/${folder}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

function getS3Config() {
  const region = process.env.AWS_REGION || DEFAULT_REGION;
  const bucket = process.env.AWS_S3_BUCKET || DEFAULT_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    const error = new Error('Missing AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
    error.statusCode = 500;
    error.code = 'AWS_CONFIG_MISSING';
    throw error;
  }

  return {
    region,
    bucket,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  };
}

function createS3Client() {
  const { region, credentials } = getS3Config();

  return new S3Client({
    region,
    credentials
  });
}

async function createUploadUrl({ fileName, contentType, folder }) {
  if (!fileName || !contentType) {
    const error = new Error('fileName and contentType are required.');
    error.statusCode = 400;
    throw error;
  }

  if (!isSupportedMediaType(contentType)) {
    const error = new Error('Unsupported media type. Only image, video, and audio uploads are allowed.');
    error.statusCode = 400;
    throw error;
  }

  const { bucket } = getS3Config();
  const key = buildObjectKey(fileName, folder);
  const client = createS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: Number(process.env.AWS_PRESIGNED_URL_EXPIRES || 900)
  });

  return {
    key,
    uploadUrl
  };
}

async function createDownloadUrl(key) {
  if (!key) {
    const error = new Error('S3 object key is required to create a playback URL.');
    error.statusCode = 400;
    throw error;
  }

  const { bucket } = getS3Config();
  const client = createS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  return getSignedUrl(client, command, {
    expiresIn: Number(process.env.AWS_PRESIGNED_URL_EXPIRES || 900)
  });
}

module.exports = {
  createDownloadUrl,
  createUploadUrl,
  isSupportedMediaType
};
