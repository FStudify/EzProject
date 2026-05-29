'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

// ── GET /admin/users ──────────────────────────────────────────────────────────
// Danh sách tất cả user với filter/search/pagination
exports.listUsers = async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const match = {};
    if (role) match.role = role;
    if (search) {
      match.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(match)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      User.countDocuments(match),
    ]);

    res.json({
      success: true,
      data: {
        data: users,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /admin/users/:userId ──────────────────────────────────────────────────
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('-passwordHash').lean();
    if (!user) throw errors.NotFound('User');
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ── PUT /admin/users/:userId/role ─────────────────────────────────────────────
// Chỉ ADMIN mới có thể thay đổi system role
exports.setUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['ADMIN', 'CUSTOMER'].includes(role)) {
      throw errors.BadRequest('role must be ADMIN or CUSTOMER');
    }
    // Admin không thể tự hạ quyền chính mình
    if (req.params.userId === req.user.id && role === 'CUSTOMER') {
      throw errors.BadRequest('Cannot demote yourself');
    }
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { role } },
      { new: true },
    ).select('-passwordHash');
    if (!user) throw errors.NotFound('User');
    res.json({ success: true, data: user, message: `User role updated to ${role}` });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /admin/users/:userId ───────────────────────────────────────────────
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.userId === req.user.id) {
      throw errors.BadRequest('Cannot delete your own account');
    }
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) throw errors.NotFound('User');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ── GET /admin/projects ───────────────────────────────────────────────────────
// Admin có thể xem TẤT CẢ project (không bị filter by member)
exports.listAllProjects = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const match = {};
    if (status) match.status = status;
    if (search) match.name = { $regex: search, $options: 'i' };

    const [projects, total] = await Promise.all([
      Project.find(match)
        .populate('ownerId', 'id fullName email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Project.countDocuments(match),
    ]);

    res.json({
      success: true,
      data: {
        data: projects,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /admin/projects/:projectId ─────────────────────────────────────────
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.projectId);
    if (!project) throw errors.NotFound('Project');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ── GET /admin/stats ──────────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalProjects, adminCount, activeProjects] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments(),
      User.countDocuments({ role: 'ADMIN' }),
      Project.countDocuments({ status: 'ACTIVE' }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalProjects,
        adminCount,
        customerCount: totalUsers - adminCount,
        activeProjects,
      },
    });
  } catch (err) {
    next(err);
  }
};
