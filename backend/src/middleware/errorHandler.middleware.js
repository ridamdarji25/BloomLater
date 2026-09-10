'use strict';

const logger = require('../utils/logger');

/**
 * Centralized error handler — must be registered LAST in Express middleware chain.
 * Normalizes errors into structured JSON responses.
 * Never leaks stack traces in production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Already-handled errors with a status
  const status = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const issues = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    logger.warn({ event: 'error.validation', issues }, 'Mongoose validation error');
    return res.status(422).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Data validation failed', issues },
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    logger.warn({ event: 'error.duplicate_key', field }, 'Duplicate key error');
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_KEY', message: `${field} already exists` },
    });
  }

  // JWT errors (should be caught by middleware, but just in case)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'Invalid or expired token' },
    });
  }

  // Multer file size / type errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'Uploaded file exceeds the size limit' },
    });
  }

  // Generic error
  logger.error(
    { event: 'error.unhandled', err: { message: err.message, name: err.name, stack: err.stack }, status },
    'Unhandled error'
  );

  return res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: status === 500 ? 'An unexpected error occurred' : err.message,
      ...(isDev && { stack: err.stack }),
    },
  });
}

module.exports = { errorHandler };
