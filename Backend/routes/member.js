'use strict';

const express = require('express');
const memberController = require('../controllers/memberController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, memberController.list);
router.put(
  '/:userId/role',
  requireAuth,
  validate(validators.updateRole),
  memberController.updateRole,
);
router.delete('/:userId', requireAuth, memberController.remove);
router.post('/invite', requireAuth, memberController.createInvite);

module.exports = router;
