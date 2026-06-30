'use strict';

const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimit');
const { validate, validators } = require('../validators');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const config = require('../config');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const { clearExpiredBlock, describeBlock } = require('../utils/blockStatus');

const router = express.Router();

function requireGoogleOAuth(_req, res, next) {
  if (passport.googleOAuthEnabled) return next();
  return res.status(503).json({
    success: false,
    error: {
      message: 'Google OAuth is not configured',
      code: 'GOOGLE_OAUTH_DISABLED',
    },
  });
}

router.post(
  '/login',
  authLimiter,
  validate(validators.login),
  authController.login,
);

router.post(
  '/register',
  authLimiter,
  validate(validators.register),
  authController.register,
);

router.post(
  '/refresh',
  validate(validators.refresh),
  authController.refresh,
);

router.post('/logout', requireAuth, authController.logout);

// ── Forgot / Reset password (Magic-link qua Gmail) ────────────
//
// Không yêu cầu auth. Rate-limited để chống spam enumeration.
//
//  POST /auth/forgot-password           body: { email }
//  POST /auth/reset-password            body: { token, newPassword, confirmPassword }
//  GET  /auth/reset-password/validate?token=...
//
router.post(
  '/forgot-password',
  authLimiter,
  validate(validators.forgotPassword),
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  authLimiter,
  validate(validators.resetPassword),
  authController.resetPassword,
);

router.get(
  '/reset-password/validate',
  validate(validators.validateResetToken, 'query'),
  authController.validateResetToken,
);

/**
 * Build URL để redirect user về frontend (path mặc định: `/auth/google/callback`).
 * Hỗ trợ cả `cors.origin` là string hoặc array.
 */
function buildFrontendUrl(pathname = '/auth/google/callback', params = {}) {
  const origin = config.cors.origin instanceof Array
    ? config.cors.origin[0]
    : config.cors.origin;
  const url = new URL(pathname, origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  return url.toString();
}

// ── Google OAuth ──────────────────────────────────────────────

/**
 * GET /api/v1/auth/google
 * Redirect user đến trang đăng nhập Google
 */
router.get(
  '/google',
  requireGoogleOAuth,
  passport.authenticate('google', {
    session: false,
    scope: ['profile', 'email'],
  }),
);

/**
 * GET /api/v1/auth/google/callback
 * Google redirect về đây sau khi user xác thực
 */
router.get(
  '/google/callback',
  requireGoogleOAuth,
  passport.authenticate('google', { session: false, failureRedirect: null }),
  async (req, res) => {
    try {
      const baseUser = req.user;
      if (!baseUser) {
        res.redirect(buildFrontendUrl('/auth/google/callback', { error: 'oauth_failed' }));
        return;
      }

      // Re-fetch latest block state (lean) trước khi cấp token
      const user = await User.findById(baseUser._id).lean();
      if (!user) {
        res.redirect(buildFrontendUrl('/auth/google/callback', { error: 'oauth_failed' }));
        return;
      }

      // Lazy-unblock và kiểm tra trạng thái khoá
      await clearExpiredBlock(user);
      const blockInfo = describeBlock(user);
      if (blockInfo.blocked) {
        res.redirect(
          buildFrontendUrl('/login', {
            error: 'account_blocked',
            message: blockInfo.message,
            blockedUntil: blockInfo.blockedUntil,
            blockedReason: blockInfo.blockedReason,
          }),
        );
        return;
      }

      // Sign tokens
      const payload = {
        sub: user._id.toString(),
        email: user.email,
        username: user.username,
      };
      const accessToken = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.accessExpires,
      });
      const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpires,
      });

      // Lưu refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await RefreshToken.create({ token: refreshToken, userId: user._id, expiresAt });

      // Redirect về frontend kèm tokens trong query string
      // Frontend sẽ đọc params rồi lưu vào localStorage
      res.redirect(
        buildFrontendUrl('/auth/google/callback', { accessToken, refreshToken }),
      );
    } catch (err) {
      console.error('[Google callback] error:', err);
      res.redirect(buildFrontendUrl('/auth/google/callback', { error: 'oauth_failed' }));
    }
  },
);

/**
 * Fallback nếu passport.authenticate redirect về đây với lỗi
 */
router.get('/google/error', (_req, res) => {
  res.redirect(buildFrontendUrl('/login', { error: 'google_auth_failed' }));
});

module.exports = router;

