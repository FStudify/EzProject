'use strict';

const { Plan, Promotion, Voucher } = require('../models');
const { errors } = require('../middlewares/errorHandler');

exports.getPricingData = async (req, res, next) => {
  try {
    // Fetch all plans
    const allPlans = await Plan.find().sort({ sortOrder: 1, priceVnd: 1 }).lean();
    const promotions = await Promotion.find().sort({ createdAt: -1 }).lean();
    const vouchers = await Voucher.find().sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      data: { plans: allPlans, promotions, vouchers },
    });
  } catch (err) {
    next(err);
  }
};

exports.createPlan = async (req, res, next) => {
  try {
    const planData = req.body;
    if (!planData.key) planData.key = planData.slug || planData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const exists = await Plan.findOne({ key: planData.key });
    if (exists) throw errors.BadRequest('Plan key (slug) already exists');

    const plan = await Plan.create(planData);
    res.json({ success: true, data: { plan } });
  } catch (err) {
    next(err);
  }
};

exports.updatePlan = async (req, res, next) => {
  try {
    const { planKey } = req.params;
    
    // Support soft-delete explicitly or standard update
    if (req.body._action === 'delete') {
      const plan = await Plan.findOneAndDelete({ key: planKey });
      if (!plan) throw errors.NotFound('Plan');
      return res.json({ success: true, data: { plan } });
    }

    const plan = await Plan.findOneAndUpdate(
      { key: planKey },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!plan) throw errors.NotFound('Plan');

    res.json({ success: true, data: { plan } });
  } catch (err) {
    next(err);
  }
};

exports.deletePlan = async (req, res, next) => {
  try {
    // Hard delete
    const { planKey } = req.params;
    const plan = await Plan.findOneAndDelete({ key: planKey });
    if (!plan) throw errors.NotFound('Plan');
    res.json({ success: true, message: 'Deleted', data: { plan } });
  } catch (err) {
    next(err);
  }
};

exports.createPromotion = async (req, res, next) => {
  try {
    const promo = await Promotion.create(req.body);
    res.json({ success: true, data: { promotion: promo } });
  } catch (err) {
    next(err);
  }
};

exports.updatePromotion = async (req, res, next) => {
  try {
    const promo = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!promo) throw errors.NotFound('Promotion');
    res.json({ success: true, data: { promotion: promo } });
  } catch (err) {
    next(err);
  }
};

exports.deletePromotion = async (req, res, next) => {
  try {
    const promo = await Promotion.findByIdAndDelete(req.params.id);
    if (!promo) throw errors.NotFound('Promotion');
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

exports.createVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.create({ ...req.body, code: req.body.code?.toUpperCase() });
    res.json({ success: true, data: { voucher } });
  } catch (err) {
    if (err.code === 11000) throw errors.BadRequest('Voucher code already exists');
    next(err);
  }
};

exports.updateVoucher = async (req, res, next) => {
  try {
    if (req.body.code) req.body.code = req.body.code.toUpperCase();
    const voucher = await Voucher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!voucher) throw errors.NotFound('Voucher');
    res.json({ success: true, data: { voucher } });
  } catch (err) {
    if (err.code === 11000) throw errors.BadRequest('Voucher code already exists');
    next(err);
  }
};

exports.deleteVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);
    if (!voucher) throw errors.NotFound('Voucher');
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
