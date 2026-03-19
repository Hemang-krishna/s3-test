require('dotenv').config();

const cors = require('cors');
const express = require('express');

const mediaRoutes = require('./routes/media');
const { checkDatabaseConnection } = require('./db');

const app = express();
const port = Number(process.env.PORT || 7100);
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((value) => value.trim()) : true;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(`[request] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});

app.use('/', mediaRoutes);

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  console.error('[server] Request failed:', {
    message: error.message,
    code: error.code,
    details: error.details,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  res.status(statusCode).json({
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR'
  });
});

app.listen(port, async () => {
  console.log(`[server] Backend listening on port ${port}`);
  const dbStatus = await checkDatabaseConnection();
  if (!dbStatus.ok) {
    console.warn(`[server] Startup DB check failed: ${dbStatus.details}`);
  }
});
