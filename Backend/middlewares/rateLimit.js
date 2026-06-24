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
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' },
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
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' },
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
        message: 'Ban da tao qua nhieu du an AI. Vui long thu lai sau 1 phut.',
      },
    });
  },
});

module.exports = { apiLimiter, authLimiter, generateProjectLimiter };
