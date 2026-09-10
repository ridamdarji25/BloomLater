'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth.routes');
const capsuleRoutes = require('./routes/capsule.routes');
const healthRoutes = require('./routes/health.routes');

// Error handler
const { errorHandler } = require('./middleware/errorHandler.middleware');

function createApp() {
  const app = express();

  // ─── Security ────────────────────────────────────────────────────────────────
  app.set('trust proxy', 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // Frontend handles its own CSP
    })
  );

  // ─── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:80,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:80')
    .split(',')
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., curl, mobile apps, same-origin)
        if (!origin) return callback(null, true);
        
        // Match configured allowed origins
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }

        // Allow any localhost / 127.0.0.1 port in dev/local setups
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }

        // Safe rejection without throwing express 500 error
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ─── Body Parsing ─────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // ─── Request Logging ──────────────────────────────────────────────────────────
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        if (req.url === '/health') return 'trace'; // suppress health probe logs at info
        return 'info';
      },
      customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    })
  );

  // ─── Routes ───────────────────────────────────────────────────────────────────
  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/capsules', capsuleRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
    });
  });

  // Centralized error handler (must be last)
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
