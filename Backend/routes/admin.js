'use strict';

const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router();

// Tất cả routes đều cần ADMIN
router.use(requireAuth, requireAdmin);

// ── Stats ─────────────────────────────────────────────
router.get('/stats', adminController.getStats);

// ── Users ─────────────────────────────────────────────
router.get('/users', adminController.listUsers);
router.get('/users/:userId', adminController.getUser);
router.put('/users/:userId/role', validate(validators.setSystemRole), adminController.setUserRole);
router.delete('/users/:userId', adminController.deleteUser);

// ── Projects ──────────────────────────────────────────
router.get('/projects', adminController.listAllProjects);
router.delete('/projects/:projectId', adminController.deleteProject);

module.exports = router;
