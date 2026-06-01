'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { errors } = require('./errorHandler');

// Export cloudinary v2 so controllers can use it directly
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitizeFilename(original) {
  return original.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// ── Storage factories ─────────────────────────────────────────────────────────

function diskStorage(subdir) {
  return multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(process.env.UPLOAD_DIR || './uploads', subdir);
      ensureDir(dir);
      cb(null, dir);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      const base = sanitizeFilename(path.basename(file.originalname, ext));
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      cb(null, `${base}-${unique}${ext}`);
    },
  });
}

// ── File filter factories ─────────────────────────────────────────────────────

const IMAGE_TYPES = /jpeg|jpg|png|gif|webp/;
const DOC_TYPES = /pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|txt|png|jpg|jpeg|gif|webp/;

function imageFilter(req, file, cb) {
  const ext = IMAGE_TYPES.test(path.extname(file.originalname).toLowerCase());
  const mime = IMAGE_TYPES.test(file.mimetype.split('/')[1]);
  if (ext && mime) return cb(null, true);
  cb(errors.BadRequest('Only image files are allowed (jpeg/jpg/png/gif/webp)'));
}

function documentFilter(req, file, cb) {
  const ext = DOC_TYPES.test(path.extname(file.originalname).toLowerCase());
  if (ext) return cb(null, true);
  cb(errors.BadRequest('Unsupported file type'));
}

// ── Max file size ─────────────────────────────────────────────────────────────

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10 MB default

// ── Avatar upload — memory storage, Cloudinary upload done in controller ──────
// Using memoryStorage avoids the multer-storage-cloudinary adapter entirely.
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
}).single('avatar');

/**
 * Single document/file upload — field name: "file"
 */
const uploadDocument = multer({
  storage: diskStorage('documents'),
  fileFilter: documentFilter,
  limits: { fileSize: MAX_SIZE },
}).single('file');

/**
 * Wrap multer in a promise so controllers can use try/catch
 */
function handleUpload(uploader) {
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            errors.BadRequest(`File too large. Max allowed size is ${MAX_SIZE / 1024 / 1024} MB`),
          );
        }
        return next(errors.BadRequest(err.message));
      }
      next(err);
    });
  };
}

/**
 * Build public URL from stored file path
 */
function fileUrl(req, filePath) {
  const relative = filePath.replace(/\\/g, '/').replace(/^.*\/uploads\//, 'uploads/');
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/public/${relative}`;
}

/**
 * Upload a buffer to Cloudinary and return the secure_url.
 * @param {Buffer} buffer
 * @param {object} options  — Cloudinary upload options (folder, public_id, …)
 * @returns {Promise<string>} secure_url
 */
function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      if (!result?.secure_url) return reject(new Error('Cloudinary upload returned no URL'));
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

module.exports = { handleUpload, uploadAvatar, uploadDocument, fileUrl, uploadToCloudinary };
