'use strict';

const { z } = require('zod');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/tokens');
const logger = require('../utils/logger');

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(32, 'Username must not exceed 32 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, underscores, and hyphens'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string().max(64).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
};

function setRefreshCookie(res, token) {
  res.cookie('bloomlater_refresh', token, COOKIE_OPTS);
}

function clearRefreshCookie(res) {
  res.clearCookie('bloomlater_refresh', { ...COOKIE_OPTS, maxAge: 0 });
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { email, username, password, displayName } = registerSchema.parse(req.body);

    const existing = await User.findOne({ $or: [{ email }, { username }] }).lean();
    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: `${field} already taken` },
      });
    }

    const user = await User.create({ email, username, password, displayName });

    const accessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    // Store hashed refresh token
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await user.save();

    setRefreshCookie(res, refreshToken);

    logger.info({ event: 'auth.register', userId: user._id }, 'New user registered');

    return res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email }).select('+password +refreshTokenHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      logger.warn({ event: 'auth.login_fail', email }, 'Login attempt with wrong password');
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const accessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.lastActiveAt = new Date();
    await user.save();

    setRefreshCookie(res, refreshToken);

    logger.info({ event: 'auth.login', userId: user._id }, 'User logged in');

    return res.status(200).json({
      success: true,
      data: {
        user: user.toJSON(),
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 */
async function refresh(req, res, next) {
  try {
    const token = req.cookies?.bloomlater_refresh;
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token provided' },
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'Invalid refresh token' },
      });
    }

    const user = await User.findById(decoded.sub).select('+refreshTokenHash');
    if (!user || !user.refreshTokenHash) {
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_REUSE', message: 'Refresh token revoked' },
      });
    }

    const tokenMatch = await bcrypt.compare(token, user.refreshTokenHash);
    if (!tokenMatch) {
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_REUSE', message: 'Refresh token revoked' },
      });
    }

    const newAccessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
    const newRefreshToken = signRefreshToken({ userId: user._id.toString() });

    user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    user.lastActiveAt = new Date();
    await user.save();

    setRefreshCookie(res, newRefreshToken);

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user.userId, { refreshTokenHash: null });
    }
    clearRefreshCookie(res);
    logger.info({ event: 'auth.logout', userId: req.user?.userId }, 'User logged out');
    return res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }
    return res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, me };
