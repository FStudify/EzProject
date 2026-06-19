'use strict';

const express = require('express');
const documentController = require('../controllers/documentController');
const { requireAuth } = require('../middlewares/auth');
const { validate, validators } = require('../validators');

const router = express.Router({ mergeParams: true });

// ── List documents ────────────────────────────────────────────
router.get(
  '/',
  requireAuth,
  validate(validators.listDocuments, 'query'),
  documentController.list,
);

// ── Create document (link-based) ──────────────────────────────
router.post(
  '/',
  requireAuth,
  validate(validators.createDocumentLink),
  documentController.create,
);

// ── Update document ───────────────────────────────────────────
router.put(
  '/:docId',
  requireAuth,
  validate(validators.updateDocumentLink),
  documentController.update,
);

// ── Delete document ───────────────────────────────────────────
router.delete('/:docId', requireAuth, documentController.delete);

module.exports = router;
