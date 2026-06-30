'use strict';

/**
 * Passport Google OAuth 2.0 Strategy
 * ------------------------------------
 * Flow:
 *   1. User click "Đăng nhập Google" → GET /api/v1/auth/google
 *   2. Google xác thực → callback → /api/v1/auth/google/callback
 *   3. Tìm user theo googleId hoặc email:
 *      - Có rồi → update googleId nếu thiếu, trả về user
 *      - Chưa có → tạo mới (không có password)
 *   4. Sign JWT, redirect về frontend
 */

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');
const config = require('./index');

const googleOAuthEnabled = Boolean(config.google.clientId && config.google.clientSecret);

if (googleOAuthEnabled) {
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
      scope: ['profile', 'email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const fullName = profile.displayName || 'Google User';
        const avatar = profile.photos?.[0]?.value || null;

        if (!email) {
          return done(new Error('Tài khoản Google không có email'), null);
        }

        // 1. Tìm theo googleId trước
        let user = await User.findOne({ googleId });

        // 2. Nếu chưa có, tìm theo email (user đăng ký email trước đó)
        if (!user) {
          user = await User.findOne({ email });
        }

        if (user) {
          // Gắn googleId nếu user đăng nhập Google lần đầu
          if (!user.googleId) {
            user.googleId = googleId;
            if (!user.avatar && avatar) user.avatar = avatar;
            await user.save();
          }
          return done(null, user);
        }

        // 3. Tạo user mới từ Google
        const username = await generateUniqueUsername(email, fullName);
        user = await User.create({
          googleId,
          email,
          username,
          fullName,
          avatar,
          // passwordHash để null — user này chỉ đăng nhập qua Google
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);
}

passport.googleOAuthEnabled = googleOAuthEnabled;

/**
 * Tạo username duy nhất từ email hoặc tên:
 *   "nguyen.van.a@gmail.com" → "nguyenvana" → nếu trùng → "nguyenvana_2"
 */
async function generateUniqueUsername(email, fullName) {
  // Lấy phần trước @ của email, loại bỏ ký tự đặc biệt
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user';

  let candidate = base;
  let counter = 2;

  while (await User.exists({ username: candidate })) {
    candidate = `${base}_${counter}`;
    counter++;
  }

  return candidate;
}

module.exports = passport;
