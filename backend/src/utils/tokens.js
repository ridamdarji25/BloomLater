'use strict';

const jwt = require('jsonwebtoken');

const ACCESS_SECRET = () => {
  if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET not set');
  return process.env.JWT_ACCESS_SECRET;
};

const REFRESH_SECRET = () => {
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not set');
  return process.env.JWT_REFRESH_SECRET;
};

/**
 * @param {{ userId: string, email: string }} payload
 * @returns {string}
 */
function signAccessToken(payload) {
  return jwt.sign(
    { sub: payload.userId, email: payload.email, type: 'access' },
    ACCESS_SECRET(),
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
}

/**
 * @param {{ userId: string }} payload
 * @returns {string}
 */
function signRefreshToken(payload) {
  return jwt.sign(
    { sub: payload.userId, type: 'refresh' },
    REFRESH_SECRET(),
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

/**
 * @param {string} token
 * @returns {{ sub: string, email: string, type: string }}
 */
function verifyAccessToken(token) {
  const decoded = jwt.verify(token, ACCESS_SECRET());
  if (decoded.type !== 'access') throw new Error('Invalid token type');
  return decoded;
}

/**
 * @param {string} token
 * @returns {{ sub: string, type: string }}
 */
function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, REFRESH_SECRET());
  if (decoded.type !== 'refresh') throw new Error('Invalid token type');
  return decoded;
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
