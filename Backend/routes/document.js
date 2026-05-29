'use strict';

const express = require('express');
const documentController = require('../controllers/documentController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, documentController.list);
router.post('/', requireAuth, documentController.create);
router.put('/:docId', requireAuth, documentController.rename);
router.delete('/:docId', requireAuth, documentController.delete);

router.post(
  '/folders',
  requireAuth,
  validate(validators.createFolder),
  documentController.createFolder,
);
router.put('/folders/:folderId', requireAuth, documentController.renameFolder);
router.delete('/folders/:folderId', requireAuth, documentController.deleteFolder);

module.exports = router;
