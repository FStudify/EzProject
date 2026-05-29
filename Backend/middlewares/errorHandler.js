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

const errorFactory = {
  AppError,
  BadRequest: (msg, field) => new AppError(400, 'BAD_REQUEST', msg, field),
  Unauthorized: (msg = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', msg),
  Forbidden: (msg = 'Forbidden') => new AppError(403, 'FORBIDDEN', msg),
  NotFound: (resource = 'Resource') => new AppError(404, 'NOT_FOUND', `${resource} not found`),
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
    if (err.errors) body.error.errors = err.errors;
    res.status(err.statusCode).json(body);
    return;
  }

  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : 'Internal server error',
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
  errors: errorFactory,
  errorHandler,
  notFoundHandler,
};
