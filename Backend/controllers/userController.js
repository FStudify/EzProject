'use strict';

const bcrypt = require('bcrypt');
const User = require('../models/User');
const { Notification } = require('../models/Activity');
const { errors } = require('../middlewares/errorHandler');
const { fileUrl, uploadToCloudinary } = require('../middlewares/upload');

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
    )
      .select('-passwordHash')
      .lean();
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
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file)
      throw errors.BadRequest('No file uploaded. Use multipart/form-data with field "avatar"');

    // req.file.buffer is set by multer.memoryStorage(); upload directly to Cloudinary
    const url = await uploadToCloudinary(req.file.buffer, {
      folder: 'avatars',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    });

    const user = await User.findByIdAndUpdate(req.user.id, { $set: { avatar: url } }, { new: true })
      .select('-passwordHash')
      .lean();

    res.json({ success: true, data: { avatar: user.avatar, user } });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /users/me/avatar ───────────────────────────────────────────────────
exports.deleteAvatar = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { avatar: null } },
      { new: true },
    )
      .select('-passwordHash')
      .lean();
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
    await Notification.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } });
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};

// ── GET /users/me/stats ───────────────────────────────────────────────────────
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const Task = require('../models/Task');
    const Project = require('../models/Project');

    // Calculate onTimeRate
    const completedTasks = await Task.find({ assigneeId: userId, status: 'DONE' }).lean();
    let onTimeCount = 0;
    completedTasks.forEach((task) => {
      if (!task.deadline || new Date(task.updatedAt) <= new Date(task.deadline)) {
        onTimeCount++;
      }
    });
    const onTimeRate =
      completedTasks.length > 0 ? Math.round((onTimeCount / completedTasks.length) * 100) : 100;

    // Badges
    const badges = [];
    if (onTimeCount >= 7) {
      badges.push({
        id: 'b1',
        title: 'Đúng hạn liên tiếp 7 task',
        icon: 'timer',
        colorClass: 'from-amber-200 to-amber-400 text-amber-900',
        borderClass: 'border-amber-100',
      });
    } else if (onTimeCount >= 3) {
      badges.push({
        id: 'b1',
        title: 'Đúng hạn 3 task',
        icon: 'timer',
        colorClass: 'from-amber-200 to-amber-400 text-amber-900',
        borderClass: 'border-amber-100',
      });
    }

    const ledProjects = await Project.countDocuments({ ownerId: userId });
    if (ledProjects > 0) {
      badges.push({
        id: 'b2',
        title: 'Nhóm trưởng đầu tiên',
        icon: 'crowdsource',
        colorClass: 'from-purple-200 to-purple-400 text-purple-900',
        borderClass: 'border-purple-100',
      });
    }

    if (completedTasks.length > 0) {
      badges.push({
        id: 'b3',
        title: '100% review pass',
        icon: 'verified',
        colorClass: 'from-emerald-200 to-emerald-400 text-emerald-900',
        borderClass: 'border-emerald-100',
      });
    }

    if (badges.length === 0) {
      badges.push({
        id: 'new',
        title: 'Thành viên mới',
        icon: 'star',
        colorClass: 'from-blue-200 to-blue-400 text-blue-900',
        borderClass: 'border-blue-100',
      });
    }

    res.json({ success: true, data: { onTimeRate, badges } });
  } catch (err) {
    next(err);
  }
};

// ── GET /users/me/activities ────────────────────────────────────────────────
// Cross-project activity feed for the current user (most recent first).
exports.getUserActivities = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const mongoose = require('mongoose');
    const { Activity } = require('../models/Activity');

    const userObjId = new mongoose.Types.ObjectId(req.user.id);

    const activities = await Activity.find({ userId: userObjId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('projectId', 'name')
      .lean();

    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
};
