const express = require('express');

const { checkDatabaseConnection, getLastConnectionError, query } = require('../db');
const { buildS3Url, createUploadUrl } = require('../s3');

const router = express.Router();

router.get('/', async (_req, res) => {
  const dbStatus = await checkDatabaseConnection();

  res.json({
    status: dbStatus.ok ? 'ok' : 'degraded',
    service: 's3-media-upload-test-backend',
    database: dbStatus.ok ? 'connected' : 'unavailable',
    timestamp: new Date().toISOString(),
    error: dbStatus.ok ? null : getLastConnectionError()?.message || dbStatus.message
  });
});

router.get('/upload-url', async (req, res, next) => {
  try {
    const { fileName, contentType, folder } = req.query;
    const payload = await createUploadUrl({
      fileName,
      contentType,
      folder: folder || 'media'
    });

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/save', async (req, res, next) => {
  try {
    const {
      mediaKey,
      mediaType,
      title,
      description,
      thumbnailKey
    } = req.body;

    if (!mediaKey || !mediaType || !title) {
      const error = new Error('mediaKey, mediaType, and title are required.');
      error.statusCode = 400;
      throw error;
    }

    const [result] = await query(
      `INSERT INTO s3_media_test (
        media_key,
        media_type,
        title,
        description,
        thumbnail_key
      ) VALUES (?, ?, ?, ?, ?)`,
      [mediaKey, mediaType, title, description || null, thumbnailKey || null]
    );

    res.status(201).json({
      id: result.insertId,
      mediaKey,
      mediaUrl: buildS3Url(mediaKey),
      thumbnailUrl: thumbnailKey ? buildS3Url(thumbnailKey) : null,
      success: true
    });
  } catch (error) {
    next(error);
  }
});

router.get('/media', async (_req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT
        id,
        media_key AS mediaKey,
        media_type AS mediaType,
        title,
        description,
        thumbnail_key AS thumbnailKey,
        created_at AS createdAt
      FROM s3_media_test
      ORDER BY created_at DESC, id DESC`
    );

    res.json(
      rows.map((row) => ({
        ...row,
        mediaUrl: buildS3Url(row.mediaKey),
        thumbnailUrl: row.thumbnailKey ? buildS3Url(row.thumbnailKey) : null
      }))
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
