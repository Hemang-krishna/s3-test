const loadEnv = require('./loadEnv');

loadEnv();

const fs = require('fs');
const mysql = require('mysql2/promise');

const DEFAULT_RETRY_ATTEMPTS = Number(process.env.DB_RETRY_ATTEMPTS || 3);
const DEFAULT_RETRY_DELAY_MS = Number(process.env.DB_RETRY_DELAY_MS || 1500);

let pool;
let initializationPromise;
let lastConnectionError = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getMissingDatabaseConfig() {
  return ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
    .filter((key) => !process.env[key]);
}

function buildDatabaseConfigError() {
  const missing = getMissingDatabaseConfig();
  if (missing.length === 0) {
    return null;
  }

  const error = new Error(`Missing required database environment variables: ${missing.join(', ')}`);
  error.code = 'DB_CONFIG_MISSING';
  return error;
}

function buildSslConfig() {
  if (String(process.env.DB_SSL).toLowerCase() !== 'true') {
    return undefined;
  }

  if (process.env.DB_SSL_CA_PATH) {
    return { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8') };
  }

  if (process.env.DB_SSL_CA_BASE64) {
    return { ca: Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64').toString('utf8') };
  }

  return {};
}

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: buildSslConfig()
  });
}

async function initializePool() {
  const configError = buildDatabaseConfigError();
  if (configError) {
    lastConnectionError = configError;
    console.error(`[db] ${configError.message}`);
    throw configError;
  }

  let attempt = 0;
  let mostRecentError;

  while (attempt < DEFAULT_RETRY_ATTEMPTS) {
    attempt += 1;

    try {
      const nextPool = createPool();
      const connection = await nextPool.getConnection();
      await connection.ping();
      connection.release();
      pool = nextPool;
      lastConnectionError = null;
      console.log(`[db] Connected to MySQL on attempt ${attempt}.`);
      return pool;
    } catch (error) {
      mostRecentError = error;
      lastConnectionError = error;
      console.error(`[db] Connection attempt ${attempt} failed: ${error.message || error.code || 'Unknown database error'}`);
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        await sleep(DEFAULT_RETRY_DELAY_MS);
      }
    }
  }

  console.error('[db] Unable to establish MySQL pool after retries. Server will continue in degraded mode.');
  throw mostRecentError;
}

async function ensurePool() {
  if (pool) {
    return pool;
  }

  if (!initializationPromise) {
    initializationPromise = initializePool().catch((error) => {
      initializationPromise = null;
      return Promise.reject(error);
    });
  }

  return initializationPromise;
}

async function query(sql, params = []) {
  try {
    const activePool = await ensurePool();
    return await activePool.execute(sql, params);
  } catch (error) {
    lastConnectionError = error;
    console.error('[db] Query failed:', error.message || error.code || 'Unknown database error');
    const friendlyError = new Error('Database is temporarily unavailable. Please try again shortly.');
    friendlyError.statusCode = 503;
    friendlyError.code = 'DB_UNAVAILABLE';
    friendlyError.details = error.message;
    throw friendlyError;
  }
}

async function checkDatabaseConnection() {
  try {
    const activePool = await ensurePool();
    const connection = await activePool.getConnection();
    await connection.ping();
    connection.release();
    return { ok: true };
  } catch (error) {
    lastConnectionError = error;
    return {
      ok: false,
      message: 'Database connection unavailable',
      details: error.message || error.code || 'Unknown database error'
    };
  }
}

function getLastConnectionError() {
  return lastConnectionError;
}

module.exports = {
  checkDatabaseConnection,
  ensurePool,
  getLastConnectionError,
  query
};
