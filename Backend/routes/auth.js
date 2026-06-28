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

const router = express.Router();

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

// ── Google OAuth ──────────────────────────────────────────────

/**
 * GET /api/v1/auth/google
 * Redirect user đến trang đăng nhập Google
 */
router.get(
  '/google',
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
  passport.authenticate('google', { session: false, failureRedirect: null }),
  async (req, res) => {
    try {
      const user = req.user;

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
      const frontendUrl = config.cors.origin instanceof Array
        ? config.cors.origin[0]
        : config.cors.origin;

      const redirectUrl = new URL('/auth/google/callback', frontendUrl);
      redirectUrl.searchParams.set('accessToken', accessToken);
      redirectUrl.searchParams.set('refreshToken', refreshToken);

      res.redirect(redirectUrl.toString());
    } catch (err) {
      const frontendUrl = config.cors.origin instanceof Array
        ? config.cors.origin[0]
        : config.cors.origin;
      const redirectUrl = new URL('/auth/google/callback', frontendUrl);
      redirectUrl.searchParams.set('error', 'oauth_failed');
      res.redirect(redirectUrl.toString());
    }
  },
);

/**
 * Fallback nếu passport.authenticate redirect về đây với lỗi
 */
router.get('/google/error', (_req, res) => {
  const frontendUrl = config.cors.origin instanceof Array
    ? config.cors.origin[0]
    : config.cors.origin;
  res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
});

module.exports = router;

