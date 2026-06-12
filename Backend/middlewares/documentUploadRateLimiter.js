'use strict';

const rateLimit = require('express-rate-limit');

const tooManyUploads = (req, res) => {
  res.status(429).json({
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many upload requests' },
  });
};

const uploadUserLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || 'anonymous',
  handler: tooManyUploads,
});

const uploadIpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyUploads,
});

module.exports = { uploadUserLimiter, uploadIpLimiter };
