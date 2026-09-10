'use strict';

const { Router } = require('express');
const { pingDB, getConnectionState } = require('../config/db');
const logger = require('../utils/logger');

const router = Router();

/**
 * GET /health
 * Liveness + readiness probe for container orchestration.
 * Returns 200 if healthy, 503 if degraded.
 */
router.get('/', async (req, res) => {
  const start = Date.now();
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    checks: {},
  };

  // MongoDB check
  try {
    await pingDB();
    checks.checks.mongodb = { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    checks.checks.mongodb = { status: 'error', message: err.message, state: getConnectionState() };
    checks.status = 'degraded';
    logger.warn({ event: 'health.mongo_fail', err }, 'MongoDB health check failed');
  }

  const httpStatus = checks.status === 'ok' ? 200 : 503;
  return res.status(httpStatus).json(checks);
});

module.exports = router;
