'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const Invitation = require('../models/Invitation');
const PasswordResetToken = require('../models/PasswordResetToken');
const config = require('../config');
const { errors, makeExtendedError } = require('../middlewares/errorHandler');
const { describeBlock, clearExpiredBlock } = require('../utils/blockStatus');
const { sendPasswordResetEmail } = require('../services/emailService');

// Quãng thời gian token reset hợp lệ (phút). 30 phút đủ để user mở mail,
// không quá dài nếu link lọt vào tay người khác.
const RESET_TOKEN_EXPIRES_MINUTES = 30;

// Số byte ngẫu nhiên cho raw token (24 byte → 32 ký tự base64url).
const RAW_TOKEN_BYTES = 24;

const ObjectId = mongoose.Types.ObjectId;
const INVALID_LOGIN_MESSAGE = 'Tài khoản hoặc mật khẩu sai';

function buildBlockError(user, fallbackMessage) {
  const info = describeBlock(user);
  return makeExtendedError(403, 'ACCOUNT_BLOCKED', info.message, {
    blockedUntil: info.blockedUntil,
    blockedReason: info.blockedReason,
    remainingText: info.remainingText,
    fallbackMessage,
  });
}

function signTokens(payload) {
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpires,
  });
  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires,
  });
  return { accessToken, refreshToken };
}

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const identifier = String(username || '').trim();
    const user = await User.findOne({
      $or: [
        { username: identifier },
        { email: identifier.toLowerCase() },
      ],
    }).select('+passwordHash');
    if (!user || !user.passwordHash) throw errors.Unauthorized(INVALID_LOGIN_MESSAGE);

    await clearExpiredBlock(user);

    if (user.isBlocked) {
      throw buildBlockError(user, INVALID_LOGIN_MESSAGE);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw errors.Unauthorized(INVALID_LOGIN_MESSAGE);

    const payload = { sub: user._id.toString(), email: user.email, username: user.username };
    const { accessToken, refreshToken } = signTokens(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await RefreshToken.create({ token: refreshToken, userId: user._id, expiresAt });

    const obj = user.toObject();
    delete obj.passwordHash;
    res.json({ success: true, data: { user: obj, accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { fullName, email, username, password, inviteToken } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedUsername = String(username || '').trim();
    const normalizedFullName = String(fullName || '').trim();

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) throw errors.Conflict('Email already in use');

    const existingUsername = await User.findOne({ username: normalizedUsername });
    if (existingUsername) throw errors.Conflict('Username already taken');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash,
      fullName: normalizedFullName,
    });

    let joinedProject = null;

    // ── If signup was triggered by an email invite, accept it automatically ──
    if (inviteToken) {
      try {
        const invitation = await Invitation.findOne({ token: inviteToken });
        if (
          invitation &&
          invitation.status === 'PENDING' &&
          invitation.expiresAt >= new Date() &&
          invitation.invitedEmail &&
          invitation.invitedEmail.toLowerCase() === normalizedEmail
        ) {
          // Defer to invitationController to keep the accept logic in one place
          const acceptController = require('./invitationController');
          const result = await acceptController.acceptInvitationDocument(invitation, {
            id: user._id.toString(),
            email: user.email,
          });
          joinedProject = result;
        }
      } catch (err) {
        // Account was created but invite-accept failed; don't fail the signup
        console.error('[Register] Auto-accept invite failed:', err.message);
      }
    }

    const payload = { sub: user._id.toString(), email: user.email, username: user.username };
    const { accessToken, refreshToken } = signTokens(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await RefreshToken.create({ token: refreshToken, userId: user._id, expiresAt });

    const obj = user.toObject();
    delete obj.passwordHash;
    res.status(201).json({
      success: true,
      data: {
        user: obj,
        accessToken,
        refreshToken,
        joinedProject,
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      if (err.keyPattern?.email || err.keyValue?.email) {
        return next(errors.Conflict('Email đã được sử dụng'));
      }
      if (err.keyPattern?.username || err.keyValue?.username) {
        return next(errors.Conflict('Tên đăng nhập đã tồn tại'));
      }
    }
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      throw errors.Unauthorized('Invalid or expired refresh token');
    }

    const stored = await RefreshToken.findOne({ token: refreshToken }).populate('userId');
    if (!stored || stored.expiresAt < new Date()) {
      throw errors.Unauthorized('Invalid or expired refresh token');
    }

    await RefreshToken.deleteOne({ _id: stored._id });

    const userDoc = stored.userId;
    const newPayload = {
      sub: stored.userId._id.toString(),
      email: userDoc.email,
      username: userDoc.username,
    };

    const { accessToken, refreshToken: newRefreshToken } = signTokens(newPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await RefreshToken.create({
      token: newRefreshToken,
      userId: stored.userId._id,
      expiresAt,
    });

    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await RefreshToken.deleteMany({ userId: req.user.id });
    res.json({ success: true, data: null, message: 'Đã đăng xuất thành công' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// Forgot password / Reset password (Magic-link flow)
// ─────────────────────────────────────────────────────────────

/**
 * POST /auth/forgot-password
 *
 * Luôn trả 200 với message generic — KHÔNG phân biệt email tồn tại / không.
 * Đây là chốt chặn email enumeration: attacker không thể biết email nào đã
 * đăng ký bằng cách spam endpoint này.
 *
 * Chỉ gửi email khi:
 *   - user tồn tại,
 *   - user đăng ký bằng email/password (Google-only user không có passwordHash),
 *   - user không bị block.
 *
 * Token thô được tạo bằng `crypto.randomBytes` (URL-safe) → hash SHA-256 lưu DB.
 * Token cũ của cùng user bị xoá để giữ tối đa 1 token hoạt động / user.
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const genericMessage =
      'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. ' +
      'Vui lòng kiểm tra hộp thư đến (kể cả thư mục Spam).';

    const user = await User.findOne({ email: String(email).toLowerCase() }).select(
      '+passwordHash',
    );

    // Điều kiện KHÔNG gửi mail (vẫn trả về generic message để chống enumeration):
    //   - không tìm thấy user
    //   - user đăng nhập bằng Google (passwordHash null) — không có gì để reset
    //   - user đang bị admin block
    const canSend = Boolean(
      user &&
        user.passwordHash &&
        !user.isBlocked &&
        user.status !== 'DISABLED',
    );

    if (!canSend) {
      // Không log lý do cụ thể — tránh rò rỉ qua log.
      return res.json({
        success: true,
        data: { message: genericMessage },
      });
    }

    // Lazy-unblock nếu đã hết hạn (admin block có thời hạn).
    await clearExpiredBlock(user);

    // 1) Sinh raw token ngẫu nhiên, hash rồi lưu DB.
    const rawToken = crypto.randomBytes(RAW_TOKEN_BYTES).toString('base64url');
    const tokenHash = PasswordResetToken.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000,
    );

    // 2) Vô hiệu hoá mọi token cũ chưa dùng của user này.
    //    Cách đơn giản: xoá hết các token cũ. (TTL index sẽ dọn khi expiresAt đến,
    //    nhưng xoá chủ động giúp giảm noise trong DB.)
    await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });

    // 3) Gửi email (không chặn response — đã trả generic message trước đó).
    //    Lỗi SMTP không được phép leak tới FE, chỉ log server-side.
    sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      rawToken,
      expiresInMinutes: RESET_TOKEN_EXPIRES_MINUTES,
    }).then((result) => {
      if (!result.sent) {
        console.warn(
          `[ForgotPassword] Email not delivered to ${user.email}: ` +
            `reason=${result.reason}` +
            (result.missing ? ` missing=${result.missing.join(',')}` : '') +
            (result.error ? ` error=${result.error}` : ''),
        );
      }
    }).catch((err) => {
      console.error(`[ForgotPassword] Unexpected error sending reset email to ${user.email}:`, err);
    });

    return res.json({
      success: true,
      data: { message: genericMessage },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/reset-password
 *
 * Body: { token, newPassword, confirmPassword }
 *
 * - Hash token → tìm trong DB.
 * - Check expiresAt > now.
 * - Check usedAt == null (single-use).
 * - Đổi mật khẩu, mark usedAt.
 * - Vô hiệu hoá TẤT CẢ refresh-token hiện có của user → buộc đăng nhập lại
 *   ở mọi thiết bị (kể cả thiết bị attacker nếu họ đã "kịp" login trước khi
 *   user nhận ra và reset).
 *
 * Trả message Vietnamese cho từng lỗi để FE có thể hiển thị trực tiếp.
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const tokenHash = PasswordResetToken.hashToken(token);

    const record = await PasswordResetToken.findOne({ tokenHash });

    if (!record) {
      throw errors.BadRequest('Liên kết đặt lại không hợp lệ hoặc đã được sử dụng');
    }

    if (record.usedAt) {
      throw errors.BadRequest('Liên kết đặt lại đã được sử dụng. Vui lòng yêu cầu liên kết mới');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw errors.BadRequest('Liên kết đặt lại đã hết hạn. Vui lòng yêu cầu liên kết mới');
    }

    const user = await User.findById(record.userId).select('+passwordHash');
    if (!user || !user.passwordHash) {
      // User bị xoá / chuyển sang Google-only sau khi yêu cầu reset.
      throw errors.BadRequest('Tài khoản không khả dụng để đặt lại mật khẩu');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Cập nhật password + mark token đã dùng trong cùng 1 "transaction-like" sequence.
    // (Không dùng Mongo session/transactions để giữ code đơn giản — worst case
    //  password đổi nhưng usedAt chưa mark → token vẫn còn hiệu lực nhưng user
    //  đã đổi pass rồi, attacker vẫn KHÔNG thể dùng token cũ vì expired ngay khi
    //  usedAt được set trong request tiếp theo. Đánh đổi chấp nhận được.)
    user.passwordHash = passwordHash;
    await user.save();

    record.usedAt = new Date();
    await record.save();

    // Vô hiệu hoá refresh-token của user → buộc đăng nhập lại mọi thiết bị.
    await RefreshToken.deleteMany({ userId: user._id });

    return res.json({
      success: true,
      data: null,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /auth/reset-password/validate?token=...
 *
 * Light check để FE có thể hiển thị đúng trạng thái trước khi user gõ mật khẩu mới.
 * KHÔNG trả thông tin nhạy cảm — chỉ { valid, reason }.
 */
exports.validateResetToken = async (req, res, next) => {
  try {
    const token = String(req.query.token || '');
    if (token.length < 32) {
      return res.json({
        success: true,
        data: { valid: false, reason: 'MALFORMED' },
      });
    }

    const tokenHash = PasswordResetToken.hashToken(token);
    const record = await PasswordResetToken.findOne({ tokenHash });

    if (!record) {
      return res.json({
        success: true,
        data: { valid: false, reason: 'NOT_FOUND' },
      });
    }
    if (record.usedAt) {
      return res.json({
        success: true,
        data: { valid: false, reason: 'USED' },
      });
    }
    if (record.expiresAt.getTime() < Date.now()) {
      return res.json({
        success: true,
        data: { valid: false, reason: 'EXPIRED' },
      });
    }

    return res.json({
      success: true,
      data: {
        valid: true,
        // Hint cho FE biết user có phải Google-only hay không (để hiển thị cảnh báo).
        // Lấy thêm một field nhẹ để không leak info nhạy cảm khác.
        expiresAt: record.expiresAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};
