'use strict';

const { verifyAccessToken } = require('../utils/tokens');
const logger = require('../utils/logger');

/**
 * Middleware: Require a valid JWT access token.
 * Reads Bearer token from Authorization header.
 * Attaches decoded payload to req.user.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
    });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = verifyAccessToken(token);
    req.user = { userId: decoded.sub, email: decoded.email };
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    logger.debug({ event: 'auth.token_invalid', name: err.name }, 'Token verification failed');
    return res.status(401).json({
      success: false,
      error: {
        code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
        message: isExpired ? 'Access token expired' : 'Invalid access token',
      },
    });
  }
}

/**
 * Middleware: Optional auth — attaches user if token present, continues either way.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.slice(7);
  try {
    const decoded = verifyAccessToken(token);
    req.user = { userId: decoded.sub, email: decoded.email };
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
