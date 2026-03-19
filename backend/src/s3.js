const loadEnv = require('./loadEnv');

loadEnv();

const crypto = require('crypto');

const ALLOWED_MEDIA_TYPES = ['image/', 'video/', 'audio/'];

function isSupportedMediaType(contentType) {
  return ALLOWED_MEDIA_TYPES.some((prefix) => contentType.startsWith(prefix));
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function buildObjectKey(fileName, folder = 'media') {
  const prefix = (process.env.AWS_S3_PREFIX || 'uploads').replace(/^\/+|\/+$/g, '');
  const safeName = sanitizeFileName(fileName);
  return `${prefix}/${folder}/${Date.now()}-${safeName}`;
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest(encoding);
}

function hash(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function getSigningKey(secretAccessKey, dateStamp, region, service) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function buildS3Url(key) {
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
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

  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    const error = new Error('AWS S3 environment variables are incomplete.');
    error.statusCode = 500;
    throw error;
  }

  const key = buildObjectKey(fileName, folder);
  const expiresIn = Number(process.env.AWS_PRESIGNED_URL_EXPIRES || 900);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const canonicalUri = `/${encodeURI(key).replace(/%5B/g, '[').replace(/%5D/g, ']')}`;
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'content-type;host',
  });

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    query.toString(),
    canonicalHeaders,
    'content-type;host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, 's3');
  const signature = hmac(signingKey, stringToSign, 'hex');
  query.set('X-Amz-Signature', signature);

  return {
    key,
    uploadUrl: `https://${host}${canonicalUri}?${query.toString()}`,
    publicUrl: buildS3Url(key),
  };
}

module.exports = {
  buildS3Url,
  createUploadUrl,
  isSupportedMediaType,
};
