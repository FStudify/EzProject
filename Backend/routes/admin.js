'use strict';

const express = require('express');
const adminController = require('../controllers/adminController');
const adminRevenueController = require('../controllers/adminRevenueController');
const adminPricingController = require('../controllers/adminPricingController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router();

// Tất cả routes đều cần ADMIN
router.use(requireAuth, requireAdmin);

// ── 1. Overview Dashboard ─────────────────────────────────────
router.get('/stats', adminController.getStats);
router.get('/dashboard/recent', adminController.getDashboardRecent);

// ── 2. User Management ───────────────────────────────────────
router.get('/users', adminController.listUsers);
router.get('/users/export', adminController.exportUsers);
router.get('/users/:userId', adminController.getUser);
router.put(
  '/users/:userId/block',
  validate(validators.blockUser),
  adminController.blockUser,
);
router.put(
  '/users/:userId/unblock',
  validate(validators.unblockUser),
  adminController.unblockUser,
);

// (legacy: role change still available for ops)
router.put(
  '/users/:userId/role',
  validate(validators.setSystemRole),
  adminController.setUserRole,
);

// ── 3. Project Management ─────────────────────────────────────
router.get('/projects', adminController.listAllProjects);

// ── 4. Activity Logs ──────────────────────────────────────────
router.get('/logs', adminController.listLogs);

// ── 5. System Health ──────────────────────────────────────────
router.get('/health', adminController.getHealth);

// ── 6. Announcements ──────────────────────────────────────────
router.get('/announcements', adminController.listAnnouncements);
router.get('/announcements/active', adminController.listActiveAnnouncements);
router.get('/announcements/:id', adminController.getAnnouncement);
router.post(
  '/announcements',
  validate(validators.createAnnouncement),
  adminController.createAnnouncement,
);
router.put(
  '/announcements/:id',
  validate(validators.updateAnnouncement),
  adminController.updateAnnouncement,
);
router.delete('/announcements/:id', adminController.deleteAnnouncement);

// ── 7. Admin Profile ──────────────────────────────────────────
router.get('/profile', adminController.getProfile);
router.put(
  '/profile/password',
  validate(validators.changePassword),
  adminController.changePassword,
);

// ── 8. Email Diagnostics ──────────────────────────────────────
router.get('/email/status', adminController.getEmailStatus);
router.post(
  '/email/test',
  validate(validators.sendTestEmail),
  adminController.sendTestEmail,
);

// ── 9. Revenue Dashboard ──────────────────────────────────────
router.get(
  '/revenue/overview',
  adminRevenueController.getOverview,
);
router.get(
  '/revenue/chart',
  adminRevenueController.getChart,
);
router.get(
  '/revenue/plans',
  adminRevenueController.getPlanBreakdown,
);
router.get(
  '/revenue/status',
  adminRevenueController.getStatusDistribution,
);
router.get(
  '/revenue/actions',
  adminRevenueController.getActionDistribution,
);
router.get(
  '/revenue/payments',
  validate(validators.revenueQuery, 'query'),
  adminRevenueController.listPayments,
);
router.get(
  '/revenue/expiring',
  adminRevenueController.getExpiringSubscriptions,
);
router.get(
  '/revenue/export',
  adminRevenueController.exportPaymentsCsv,
);
router.get(
  '/revenue/subscriptions',
  validate(validators.revenueQuery, 'query'),
  adminRevenueController.listSubscriptions,
);
router.get(
  '/revenue/top-customers',
  adminRevenueController.getTopCustomers,
);

// ── 10. Pricing Management ────────────────────────────────────
router.get('/pricing', adminPricingController.getPricingData);
router.post('/pricing/plans', adminPricingController.createPlan);
router.put('/pricing/plans/:planKey', adminPricingController.updatePlan);
router.delete('/pricing/plans/:planKey', adminPricingController.deletePlan);

router.post('/pricing/promotions', adminPricingController.createPromotion);
router.put('/pricing/promotions/:id', adminPricingController.updatePromotion);
router.delete('/pricing/promotions/:id', adminPricingController.deletePromotion);

router.post('/pricing/vouchers', adminPricingController.createVoucher);
router.put('/pricing/vouchers/:id', adminPricingController.updateVoucher);
router.delete('/pricing/vouchers/:id', adminPricingController.deleteVoucher);

module.exports = router;