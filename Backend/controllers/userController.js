'use strict';

const fs = require('fs');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { Notification } = require('../models/Activity');
const { errors } = require('../middlewares/errorHandler');
const { fileUrl } = require('../middlewares/upload');

// ── GET /users/me ─────────────────────────────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) throw errors.NotFound('User');
    delete user.passwordHash;
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ── PUT /users/me ─────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!user) throw errors.NotFound('User');
    delete user.passwordHash;
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ── PUT /users/me/preferences ─────────────────────────────────────────────────
exports.updatePreferences = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).select('-passwordHash').lean();
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ── PUT /users/me/password ────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) throw errors.NotFound('User');

    const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!valid) {
      throw errors.BadRequest('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await User.findByIdAndUpdate(req.user.id, { passwordHash });
    res.json({ success: true, data: null, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

// ── POST /users/me/avatar ─────────────────────────────────────────────────────
// Gap 5: Upload avatar ảnh thực (multipart/form-data, field: "avatar")
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw errors.BadRequest('No file uploaded. Use multipart/form-data with field "avatar"');

    // Xóa avatar cũ nếu là file local
    const currentUser = await User.findById(req.user.id).lean();
    if (currentUser?.avatar) {
      const oldPath = currentUser.avatar.replace(/^https?:\/\/[^/]+\/public\//, './public/');
      fs.unlink(oldPath, () => {}); // fail silently
    }

    const url = fileUrl(req, req.file.path);
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { avatar: url } },
      { new: true },
    ).select('-passwordHash').lean();

    res.json({ success: true, data: { avatar: user.avatar, user } });
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

// ── DELETE /users/me/avatar ───────────────────────────────────────────────────
exports.deleteAvatar = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id).lean();
    if (currentUser?.avatar) {
      const oldPath = currentUser.avatar.replace(/^https?:\/\/[^/]+\/public\//, './public/');
      fs.unlink(oldPath, () => {});
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { avatar: null } },
      { new: true },
    ).select('-passwordHash').lean();
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ── GET /users/me/notifications ───────────────────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const query = { userId: req.user.id };
    if (unreadOnly) query.read = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ userId: req.user.id, read: false }),
    ]);

    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) {
    next(err);
  }
};

// ── PUT /users/me/notifications/:id/read ─────────────────────────────────────
exports.markNotificationRead = async (req, res, next) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, userId: req.user.id },
      { $set: { read: true } },
    );
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};

// ── PUT /users/me/notifications/read-all ─────────────────────────────────────
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } },
    );
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};
