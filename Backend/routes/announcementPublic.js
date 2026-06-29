'use strict';

const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { listActiveAnnouncements } = require('../controllers/adminController');

const router = express.Router();

// Public-ish banner feed for any authenticated user (no admin required).
router.get('/active', requireAuth, listActiveAnnouncements);

module.exports = router;