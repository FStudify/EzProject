'use strict';

require('dotenv/config');

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  const missing = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGO_URI'].filter(
    (key) => !process.env[key],
  );

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
}

const config = {
  env: process.env.NODE_ENV || 'development',
  isProd,
  isDev: !isProd,

  port: parseInt(process.env.PORT || '3000', 10),

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpires: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  db: {
    uri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ezproject',
    cluster: (() => {
      try {
        return new URL(process.env.MONGO_URI || '').hostname;
      } catch {
        return '127.0.0.1';
      }
    })(),
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },

  cors: (() => {
    const raw = process.env.CORS_ORIGIN || 'http://localhost:5173';
    // Support comma-separated list of origins: https://app.vercel.app,https://staging.vercel.app
    const allowed = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      origin: allowed.length > 1 ? allowed : allowed[0],
      credentials: true,
    };
  })(),

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};

module.exports = config;
