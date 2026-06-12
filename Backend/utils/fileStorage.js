'use strict';

const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const {
  UPLOAD_DIR,
  ALLOWED_EXTENSIONS,
  isPathInside,
} = require('../config/upload.config');

const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function sanitizeOriginalFilename(filename) {
  const original = path.basename(String(filename || 'file')).replace(/\.\./g, '');
  const ext = path.extname(original).toLowerCase();
  const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '';
  let base = path.basename(original, ext)
    .replace(/[\\/]/g, '')
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);

  if (!base || WINDOWS_RESERVED_NAMES.test(base)) {
    base = 'file';
  }

  return `${randomUUID()}-${base}${safeExt}`;
}

function normalizeStoredPath(fileUrlOrRelativePath) {
  if (!fileUrlOrRelativePath) return null;
  const raw = String(fileUrlOrRelativePath);

  try {
    const url = new URL(raw);
    return decodeURIComponent(url.pathname);
  } catch {
    return raw;
  }
}

function resolveSafeUploadPath(fileUrlOrRelativePath) {
  const normalized = normalizeStoredPath(fileUrlOrRelativePath);
  if (!normalized) return null;

  let candidate = normalized.replace(/\\/g, '/');
  const marker = '/public/uploads/';
  const markerIndex = candidate.indexOf(marker);
  if (markerIndex !== -1) {
    candidate = candidate.slice(markerIndex + marker.length);
  } else if (candidate.startsWith('/uploads/')) {
    candidate = candidate.slice('/uploads/'.length);
  } else if (candidate.startsWith('uploads/')) {
    candidate = candidate.slice('uploads/'.length);
  } else if (candidate.startsWith('/public/')) {
    candidate = candidate.slice('/public/'.length);
  } else if (candidate.startsWith('public/uploads/')) {
    candidate = candidate.slice('public/uploads/'.length);
  }

  const resolved = path.isAbsolute(candidate)
    ? path.resolve(candidate)
    : path.resolve(UPLOAD_DIR, candidate);

  if (!isPathInside(UPLOAD_DIR, resolved)) {
    console.warn('[Upload] Unsafe upload path blocked', {
      input: fileUrlOrRelativePath,
      resolved,
      uploadDir: UPLOAD_DIR,
    });
    return null;
  }

  return resolved;
}

async function safeUnlink(fileUrlOrRelativePath) {
  const filePath = resolveSafeUploadPath(fileUrlOrRelativePath);
  if (!filePath) return false;

  try {
    await fs.unlink(filePath);
    return true;
  } catch (err) {
    console.error('[Upload] Failed to delete file', {
      path: filePath,
      error: err.message,
    });
    return false;
  }
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function validateDocumentName(name) {
  if (name == null) return false;
  const value = String(name);
  return (
    value.trim().length > 0 &&
    value.length <= 255 &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !value.includes('..')
  );
}

module.exports = {
  sanitizeOriginalFilename,
  resolveSafeUploadPath,
  safeUnlink,
  formatBytes,
  validateDocumentName,
};
