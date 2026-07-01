'use strict';

class AppError extends Error {
  constructor(statusCode, code, message, field) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
    this.name = 'AppError';
  }
}

/**
 * Tạo AppError kèm thêm payload mở rộng (vd: blockedUntil).
 * Các key trong `extras` sẽ được merge vào response `error`.
 */
function makeExtendedError(statusCode, code, message, extras = {}) {
  const err = new AppError(statusCode, code, message);
  Object.assign(err, extras);
  return err;
}

const errorFactory = {
  AppError,
  BadRequest: (msg, field) => new AppError(400, 'BAD_REQUEST', msg, field),
  Unauthorized: (msg = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', msg),
  Forbidden: (msg = 'Forbidden') => new AppError(403, 'FORBIDDEN', msg),
  NotFound: (resource = 'Resource') => {
    const text = String(resource || 'Resource');
    const message = /\bnot found\b/i.test(text) ? text : `${text} not found`;
    return new AppError(404, 'NOT_FOUND', message);
  },
  Conflict: (msg) => new AppError(409, 'CONFLICT', msg),
  ValidationError: (validationErrors) => {
    const e = new AppError(400, 'VALIDATION_ERROR', 'Validation failed');
    e.errors = validationErrors;
    return e;
  },
};

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.field) body.error.field = err.field;
    Object.keys(err).forEach((k) => {
      if (['message', 'name', 'statusCode', 'code', 'field', 'errors'].includes(k)) return;
      body.error[k] = err[k];
    });
    if (err.errors) {
      body.error.errors = err.errors.map((item) => ({
        ...item,
        message: item.message,
      }));
    }
    res.status(err.statusCode).json(body);
    return;
  }

  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : 'An internal server error occurred',
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
}

module.exports = {
  AppError,
  makeExtendedError,
  errors: errorFactory,
  errorHandler,
  notFoundHandler,
};
