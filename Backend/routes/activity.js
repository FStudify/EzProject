'use strict';

const express = require('express');
const activityController = require('../controllers/activityController');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, activityController.list);

module.exports = router;
