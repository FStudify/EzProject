'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'TOO_MANY_REQUESTS', message: 'Bạn thao tác quá nhiều lần, vui lòng thử lại sau' },
    });
  },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'TOO_MANY_REQUESTS', message: 'Bạn thao tác quá nhiều lần, vui lòng thử lại sau' },
    });
  },
});

const generateProjectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Bạn đã tạo quá nhiều dự án AI. Vui lòng thử lại sau 1 phút.',
      },
    });
  },
});

module.exports = { apiLimiter, authLimiter, generateProjectLimiter };
