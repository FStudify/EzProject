'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');

function isPathInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function validateUploadDir(uploadDir) {
  if (!uploadDir || !String(uploadDir).trim()) {
    throw new Error('UPLOAD_DIR must not be empty');
  }

  if (String(uploadDir).includes('\0')) {
    throw new Error('UPLOAD_DIR contains invalid null byte');
  }

  const rawSegments = String(uploadDir).split(/[\\/]+/);
  if (rawSegments.includes('..')) {
    throw new Error('UPLOAD_DIR must not contain path traversal segments');
  }

  const resolved = path.resolve(BACKEND_ROOT, uploadDir);
  if (!path.isAbsolute(resolved)) {
    throw new Error('UPLOAD_DIR must resolve to an absolute path');
  }

  if (!isPathInside(BACKEND_ROOT, resolved)) {
    throw new Error('UPLOAD_DIR must be inside the backend project root');
  }

  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

const UPLOAD_DIR = validateUploadDir(process.env.UPLOAD_DIR || path.join(BACKEND_ROOT, 'uploads'));
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10);
const PROJECT_STORAGE_QUOTA_BYTES = parseInt(
  process.env.PROJECT_STORAGE_QUOTA_BYTES || '1073741824',
  10,
);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

const ALLOWED_MAGIC_TYPES = {
  '.pdf': new Set(['application/pdf']),
  '.doc': new Set(['application/msword', 'application/x-cfb']),
  '.docx': new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  '.ppt': new Set(['application/vnd.ms-powerpoint', 'application/x-cfb']),
  '.pptx': new Set([
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]),
  '.xls': new Set(['application/vnd.ms-excel', 'application/x-cfb']),
  '.xlsx': new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]),
  '.jpg': new Set(['image/jpeg']),
  '.jpeg': new Set(['image/jpeg']),
  '.png': new Set(['image/png']),
  '.webp': new Set(['image/webp']),
};

module.exports = {
  BACKEND_ROOT,
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  PROJECT_STORAGE_QUOTA_BYTES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MAGIC_TYPES,
  validateUploadDir,
  isPathInside,
};
