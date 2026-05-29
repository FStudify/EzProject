'use strict';

const express = require('express');
const documentController = require('../controllers/documentController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');
const { handleUpload, uploadDocument } = require('../middlewares/upload');

const router = express.Router({ mergeParams: true });

// ── Files ──────────────────────────────────────────────
router.get('/', requireAuth, documentController.list);
// Gap 3: nhận file thực qua multipart/form-data (field: "file")
router.post('/', requireAuth, handleUpload(uploadDocument), documentController.create);
router.put('/:docId', requireAuth, documentController.rename);
router.delete('/:docId', requireAuth, documentController.delete);

// ── Folders ────────────────────────────────────────────
router.post(
  '/folders',
  requireAuth,
  validate(validators.createFolder),
  documentController.createFolder,
);
router.put('/folders/:folderId', requireAuth, documentController.renameFolder);
router.delete('/folders/:folderId', requireAuth, documentController.deleteFolder);

module.exports = router;
