'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimit');
const passport = require('./config/passport');

const app = express();

// ── Proxy trust ────────────────────────────────────────────
// Render sits behind a single reverse-proxy hop. Without this, `req.ip`
// always resolves to ::1 and express-rate-limit logs
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR (warning) and cannot rate-limit
// real users correctly.
app.set('trust proxy', 1);

// ── Security ───────────────────────────────────────────────
app.use(helmet());

// CORS: support comma-separated list of allowed origins.
// Function form echoes the request origin so each client gets the right header.
const allowedOrigins = Array.isArray(config.cors.origin)
  ? config.cors.origin
  : [config.cors.origin];

function isAllowedDevOrigin(origin) {
  if (!config.isDev || !origin) return false;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'http:' && ['localhost', '127.0.0.1'].includes(hostname);
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / curl (no Origin header) and matching origins
      if (!origin || allowedOrigins.includes(origin) || isAllowedDevOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);

// ── Body Parsers ──────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// ── Passport (OAuth) ──────────────────────────────────────
app.use(passport.initialize());

// ── Logging ───────────────────────────────────────────────
if (config.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Static Files ───────────────────────────────────────
app.use('/public', express.static(path.join(__dirname, 'public')));

// ── Health Check ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────
app.use('/api/v1', apiLimiter, routes);

// ── Error Handling ─────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
