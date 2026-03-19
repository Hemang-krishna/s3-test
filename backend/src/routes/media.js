const express = require('express');

const { checkDatabaseConnection, getLastConnectionError, query } = require('../db');
const { createDownloadUrl, createUploadUrl } = require('../s3');

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
    const { mediaKey, mediaType, title, description, thumbnailKey } = req.body;

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
      success: true
    });
  } catch (error) {
    next(error);
  }
});

router.get('/media', async (_req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT id, title, media_key AS mediaKey
       FROM s3_media_test
       ORDER BY created_at DESC, id DESC`
    );

    const items = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        title: row.title,
        videoUrl: await createDownloadUrl(row.mediaKey)
      }))
    );

    res.json(items);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
