'use strict';

require('dotenv').config();

const { createApp } = require('./src/app');
const { connectDB } = require('./src/config/db');
const { startUnlockJob } = require('./src/jobs/unlockCapsules.job');
const logger = require('./src/utils/logger');

const PORT = parseInt(process.env.PORT || '4000', 10);

async function main() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express
    const app = createApp();
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info({ event: 'server.started', port: PORT, env: process.env.NODE_ENV }, `Server listening on port ${PORT}`);
    });

    // Start cron job after DB is ready
    startUnlockJob();

    // ─── Graceful Shutdown ────────────────────────────────────────────────────
    const shutdown = (signal) => {
      logger.info({ event: 'server.shutdown', signal }, `Received ${signal}, shutting down gracefully`);
      server.close(() => {
        logger.info({ event: 'server.closed' }, 'HTTP server closed');
        process.exit(0);
      });
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error({ event: 'server.force_shutdown' }, 'Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error({ event: 'server.unhandled_rejection', reason }, 'Unhandled promise rejection');
    });

    process.on('uncaughtException', (err) => {
      logger.error({ event: 'server.uncaught_exception', err }, 'Uncaught exception — shutting down');
      process.exit(1);
    });
  } catch (err) {
    logger.error({ event: 'server.startup_error', err }, 'Failed to start server');
    process.exit(1);
  }
}

main();
