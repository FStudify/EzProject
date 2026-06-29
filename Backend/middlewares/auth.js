'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const { describeBlock, clearExpiredBlock } = require('../utils/blockStatus');

// ── requireAuth ───────────────────────────────────────────────────────────────
// Xác thực JWT, gắn req.user = { id, email, username, role }
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Thiếu thông tin xác thực' },
    });
  }

  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    // Lấy role mới nhất từ DB (tránh dùng role cũ trong token)
    const user = await User.findById(payload.sub).lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Người dùng không còn tồn tại' },
      });
    }
    await clearExpiredBlock(user);
    if (user.isBlocked) {
      const block = describeBlock(user);
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_BLOCKED',
          message: block.message,
          ...block,
        },
      });
    }
    req.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: user.role, // 'ADMIN' | 'CUSTOMER'
    };
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' },
    });
  }
}

// ── requireAdmin ─────────────────────────────────────────────────────────────
// Phải dùng SAU requireAuth
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Cần quyền quản trị viên' },
    });
  }
  next();
}

// ── optionalAuth ──────────────────────────────────────────────────────────────
async function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return next();

  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(payload.sub).lean();
    if (user) {
      req.user = {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        role: user.role,
      };
    }
  } catch {
    // Token invalid — tiếp tục mà không có user
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
