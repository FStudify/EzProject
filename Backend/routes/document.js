'use strict';

const express = require('express');
const documentController = require('../controllers/documentController');
const { requireAuth } = require('../middlewares/auth');
const { handleUpload, uploadDocument } = require('../middlewares/upload');
const {
  uploadUserLimiter,
  uploadIpLimiter,
} = require('../middlewares/documentUploadRateLimiter');

const router = express.Router({ mergeParams: true });

// ── Files ──────────────────────────────────────────────
router.get('/', requireAuth, documentController.list);
// Gap 3: nhận file thực qua multipart/form-data (field: "file")
router.post(
  '/',
  requireAuth,
  uploadUserLimiter,
  uploadIpLimiter,
  handleUpload(uploadDocument),
  documentController.create,
);
router.get('/:docId/download', requireAuth, documentController.download);

// ── Folders ────────────────────────────────────────────
router.post(
  '/folders',
  requireAuth,
  documentController.createFolder,
);
router.put('/folders/:folderId', requireAuth, documentController.renameFolder);
router.delete('/folders/:folderId', requireAuth, documentController.deleteFolder);

router.put('/:docId', requireAuth, documentController.rename);
router.delete('/:docId', requireAuth, documentController.delete);

module.exports = router;
