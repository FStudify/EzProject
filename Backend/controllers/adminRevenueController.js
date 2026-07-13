'use strict';

const mongoose = require('mongoose');
const { Payment, Subscription, Plan, User } = require('../models');
const { errors } = require('../middlewares/errorHandler');

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfWeekUtc() {
  const d = startOfTodayUtc();
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

function startOfMonthUtc() {
  const d = startOfTodayUtc();
  d.setUTCDate(1);
  return d;
}

function startOfYearUtc() {
  const d = startOfTodayUtc();
  d.setUTCMonth(0, 1);
  return d;
}

async function autoExpirePendingPayments() {
  const now = new Date();
  await Payment.updateMany(
    { status: 'PENDING', expiresAt: { $lt: now } },
    { $set: { status: 'EXPIRED' } }
  );
}

function startOfYesterdayUtc() {
  const d = startOfTodayUtc();
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

function startOfLastWeekUtc() {
  const d = startOfWeekUtc();
  d.setUTCDate(d.getUTCDate() - 7);
  return d;
}

function startOfLastMonthUtc() {
  const d = startOfMonthUtc();
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d;
}

/**
 * Tổng hợp số liệu: total/today/thisWeek/thisMonth + successful payments + active subscribers.
 */
exports.getOverview = async (req, res, next) => {
  try {
    await autoExpirePendingPayments();

    const now = new Date();
    const todayStart = startOfTodayUtc();
    const weekStart = startOfWeekUtc();
    const monthStart = startOfMonthUtc();
    
    const yesterdayStart = startOfYesterdayUtc();
    const lastWeekStart = startOfLastWeekUtc();
    const lastMonthStart = startOfLastMonthUtc();

    const aggregateStatus = (match, status) =>
      Payment.aggregate([
        { $match: { ...match, status } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]);

    const aggregatePaid = (match) => aggregateStatus(match, 'PAID');

    const [
      totalAgg, todayAgg, weekAgg, monthAgg,
      yesterdayAgg, lastWeekAgg, lastMonthAgg,
      pendingAgg, failedAgg, refundedAgg,
      activeSubscribersAgg, totalUsers
    ] = await Promise.all([
      aggregatePaid({}),
      aggregatePaid({ paidAt: { $gte: todayStart } }),
      aggregatePaid({ paidAt: { $gte: weekStart } }),
      aggregatePaid({ paidAt: { $gte: monthStart } }),
      
      aggregatePaid({ paidAt: { $gte: yesterdayStart, $lt: todayStart } }),
      aggregatePaid({ paidAt: { $gte: lastWeekStart, $lt: weekStart } }),
      aggregatePaid({ paidAt: { $gte: lastMonthStart, $lt: monthStart } }),

      aggregateStatus({}, 'PENDING'),
      aggregateStatus({}, 'FAILED'),
      aggregateStatus({}, 'REFUNDED'),

      Subscription.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: '$planKey', count: { $sum: 1 } } }
      ]),
      User.countDocuments(),
    ]);

    const todayActionsAgg = await Payment.aggregate([
      { $match: { status: 'PAID', paidAt: { $gte: todayStart } } },
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]);
    const actionsMap = new Map(todayActionsAgg.map(x => [x._id, x.count]));

    let activePro = 0;
    let activeUltra = 0;
    activeSubscribersAgg.forEach(doc => {
      if (doc._id === 'pro') activePro = doc.count;
      if (doc._id === 'ultra') activeUltra = doc.count;
    });
    const activeSubscribers = activePro + activeUltra;
    const activeFree = Math.max(0, totalUsers - activeSubscribers);

    res.json({
      success: true,
      data: {
        totals: {
          totalRevenue: totalAgg[0]?.total ?? 0,
          revenueToday: todayAgg[0]?.total ?? 0,
          revenueThisWeek: weekAgg[0]?.total ?? 0,
          revenueThisMonth: monthAgg[0]?.total ?? 0,
          
          revenueYesterday: yesterdayAgg[0]?.total ?? 0,
          revenueLastWeek: lastWeekAgg[0]?.total ?? 0,
          revenueLastMonth: lastMonthAgg[0]?.total ?? 0,

          pendingRevenue: pendingAgg[0]?.total ?? 0,
          failedRevenue: failedAgg[0]?.total ?? 0,
          refundedRevenue: refundedAgg[0]?.total ?? 0,
          
          pendingPayments: pendingAgg[0]?.count ?? 0,
          failedPayments: failedAgg[0]?.count ?? 0,
          
          successfulPayments: totalAgg[0]?.count ?? 0,
          aov: (totalAgg[0]?.count > 0) ? Math.round((totalAgg[0]?.total ?? 0) / totalAgg[0].count) : 0,

          activeSubscribers,
          usersFree: activeFree,
          usersPro: activePro,
          usersUltra: activeUltra,
          
          newToday: actionsMap.get('NEW') ?? 0,
          renewToday: actionsMap.get('RENEW') ?? 0,
          upgradeToday: actionsMap.get('UPGRADE') ?? 0,

          currency: 'VND',
          lastUpdatedAt: now.toISOString(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Bảng số liệu theo ngày để vẽ biểu đồ đường.
 *
 * Query: ?days=30 (mặc định 30, max 365).
 */
exports.getChart = async (req, res, next) => {
  try {
    const { from, to, days: daysStr } = req.query;
    
    let since, toDate, days;

    if (from && to) {
      since = new Date(from);
      since.setUTCHours(0, 0, 0, 0);
      toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      days = Math.ceil((toDate - since) / (1000 * 60 * 60 * 24));
    } else {
      days = Math.min(Math.max(parseInt(daysStr || '30', 10) || 30, 1), 365);
      toDate = new Date();
      since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      since.setUTCDate(since.getUTCDate() - (days - 1));
    }

    const byDay = await Payment.aggregate([
      { $match: { status: 'PAID', paidAt: { $gte: since, $lte: toDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: 'UTC' },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const map = new Map(byDay.map((row) => [row._id, row]));
    const series = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key);
      series.push({
        date: key,
        revenue: row?.total ?? 0,
        payments: row?.count ?? 0,
      });
    }

    res.json({ success: true, data: { days, series } });
  } catch (err) {
    next(err);
  }
};

/**
 * Doanh thu & subscriber count theo Plan.
 */
exports.getPlanBreakdown = async (req, res, next) => {
  try {
    const plans = await Plan.find().sort({ sortOrder: 1, priceVnd: 1 }).lean();

    const { days: daysStr } = req.query;
    let matchStage = { status: 'PAID' };
    if (daysStr) {
      const days = parseInt(daysStr, 10) || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      matchStage.paidAt = { $gte: since };
    }

    const [paidAgg, activeAgg] = await Promise.all([
      Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$planKey',
            revenue: { $sum: '$amount' },
            payments: { $sum: 1 },
          },
        },
      ]),
      Subscription.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: '$planKey', subscribers: { $sum: 1 } } },
      ]),
    ]);

    const paidMap = new Map(paidAgg.map((row) => [row._id, row]));
    const activeMap = new Map(activeAgg.map((row) => [row._id, row.subscribers]));

    const data = plans.map((plan) => {
      const paid = paidMap.get(plan.key);
      return {
        planKey: plan.key,
        planName: plan.name,
        priceVnd: plan.priceVnd,
        currency: plan.currency,
        revenue: paid?.revenue ?? 0,
        payments: paid?.payments ?? 0,
        activeSubscribers: activeMap.get(plan.key) ?? 0,
      };
    });

    res.json({ success: true, data: { plans: data } });
  } catch (err) {
    next(err);
  }
};

/**
 * Status distribution (for pie chart).
 */
exports.getStatusDistribution = async (req, res, next) => {
  try {
    const rows = await Payment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const distribution = {
      PENDING: 0,
      PAID: 0,
      CANCELLED: 0,
      FAILED: 0,
      REFUNDED: 0,
    };
    rows.forEach((row) => {
      distribution[row._id] = row.count;
    });

    res.json({ success: true, data: { distribution } });
  } catch (err) {
    next(err);
  }
};

/**
 * Bảng danh sách payment cho Admin (search, filter, pagination).
 */
exports.listPayments = async (req, res, next) => {
  try {
    const { from, to, planKey, status, search, page, limit } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (planKey) filter.planKey = String(planKey).toLowerCase();
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setUTCHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      const matchingUsers = await mongoose.connection.db
        .collection('users')
        .find({ $or: [{ email: regex }, { username: regex }, { fullName: regex }] })
        .project({ _id: 1 })
        .toArray();
      const userIds = matchingUsers.map((u) => u._id);
      filter.$or = [{ planName: regex }, { orderCode: regex }, { userId: { $in: userIds } }];
    }

    const total = await Payment.countDocuments(filter);
    const items = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'email username fullName')
      .lean();

    const safeItems = items.map((p) => ({
      id: p._id?.toString(),
      orderCode: p.orderCode,
      user: p.userId ? {
        id: p.userId._id?.toString(),
        email: p.userId.email,
        username: p.userId.username,
        fullName: p.userId.fullName,
      } : null,
      planKey: p.planKey,
      planName: p.planName,
      oldPlanKey: p.oldPlanKey,
      action: p.action,
      amount: p.amount,
      currency: p.currency,
      provider: p.provider,
      transactionId: p.transactionId,
      rawPayload: p.rawPayload,
      methodLabel: 'PayOS',
      status: p.status,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
      cancelledAt: p.cancelledAt,
      failedAt: p.failedAt,
      expiresAt: p.expiresAt,
    }));

    res.json({
      success: true,
      data: {
        items: safeItems,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Danh sách Subscription sắp hết hạn (trong vòng 7 ngày tới)
 */
exports.getExpiringSubscriptions = async (req, res, next) => {
  try {
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const items = await Subscription.find({
      status: 'ACTIVE',
      expiresAt: { $gt: now, $lte: next7Days }
    })
      .sort({ expiresAt: 1 })
      .populate('userId', 'email username fullName')
      .lean();
      
    const safeItems = items.map(s => ({
      id: s._id?.toString(),
      user: s.userId ? {
        id: s.userId._id?.toString(),
        email: s.userId.email,
        username: s.userId.username,
        fullName: s.userId.fullName,
      } : null,
      planKey: s.planKey,
      planName: s.planName,
      priceVnd: s.priceVnd,
      startedAt: s.startedAt,
      expiresAt: s.expiresAt,
    }));
    
    res.json({ success: true, data: { items: safeItems } });
  } catch (err) {
    next(err);
  }
};

/**
 * Export CSV
 */
exports.exportPaymentsCsv = async (req, res, next) => {
  try {
    const { from, to, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setUTCHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const items = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'email username fullName')
      .lean();

    const rows = items.map(p => ({
      'Order Code': p.orderCode,
      'User Email': p.userId?.email || 'N/A',
      'User Name': p.userId?.fullName || p.userId?.username || 'N/A',
      'Old Plan': p.oldPlanKey || 'N/A',
      'New Plan': p.planKey,
      'Action': p.action || 'NEW',
      'Amount': p.amount,
      'Currency': p.currency,
      'Status': p.status,
      'Provider': p.provider,
      'Created At': p.createdAt ? p.createdAt.toISOString() : '',
      'Paid At': p.paidAt ? p.paidAt.toISOString() : '',
    }));

    if (rows.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="payments_export.csv"');
      return res.send('');
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [headers.join(',')];
    
    for (const row of rows) {
      const line = headers.map(header => {
        let val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        val = val.replace(/"/g, '""');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val}"`;
        }
        return val;
      });
      csvLines.push(line.join(','));
    }

    const csvStr = csvLines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payments_export.csv"');
    res.send(csvStr);
  } catch (err) {
    next(err);
  }
};

/**
 * Danh sách Subscription.
 */
exports.listSubscriptions = async (req, res, next) => {
  try {
    const { status, planKey, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (planKey) filter.planKey = String(planKey).toLowerCase();
    
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      const matchingUsers = await mongoose.connection.db
        .collection('users')
        .find({ $or: [{ email: regex }, { username: regex }, { fullName: regex }] })
        .project({ _id: 1 })
        .toArray();
      const userIds = matchingUsers.map((u) => u._id);
      filter.$or = [{ planName: regex }, { userId: { $in: userIds } }];
    }

    const total = await Subscription.countDocuments(filter);
    const items = await Subscription.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'email username fullName')
      .lean();

    const safeItems = items.map((s) => ({
      id: s._id?.toString(),
      user: s.userId ? {
        id: s.userId._id?.toString(),
        email: s.userId.email,
        username: s.userId.username,
        fullName: s.userId.fullName,
      } : null,
      planKey: s.planKey,
      planName: s.planName,
      status: s.status,
      startedAt: s.startedAt,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    }));

    res.json({
      success: true,
      data: {
        items: safeItems,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Top paying customers (Top Revenue Users)
 */
exports.getTopCustomers = async (req, res, next) => {
  try {
    const topRevenueUsers = await Payment.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: '$userId', totalSpent: { $sum: '$amount' }, paymentCount: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);
    
    const userIds = topRevenueUsers.map(x => x._id);
    const users = await User.find({ _id: { $in: userIds } }, 'email username fullName avatar').lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const data = topRevenueUsers.map(row => {
      const u = userMap.get(row._id.toString());
      return {
        userId: row._id,
        user: u ? {
          email: u.email,
          username: u.username,
          fullName: u.fullName,
          avatar: u.avatar
        } : null,
        totalSpent: row.totalSpent,
        paymentCount: row.paymentCount
      };
    }).filter(x => x.user);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
