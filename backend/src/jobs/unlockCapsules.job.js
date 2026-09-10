'use strict';

const cron = require('node-cron');
const { Capsule } = require('../models/Capsule.model');
const logger = require('../utils/logger');

/**
 * Cron job: runs every minute.
 * Transitions capsules from 'sealed' → 'unlockable' when unlockAt has passed.
 * Does NOT automatically mark as 'opened' — that requires a user action.
 */
function startUnlockJob() {
  // Runs at second 0 of every minute
  const job = cron.schedule('0 * * * * *', async () => {
    try {
      const now = new Date();
      const result = await Capsule.updateMany(
        { status: 'sealed', unlockAt: { $lte: now }, deletedAt: null },
        { $set: { status: 'unlockable' } }
      );

      if (result.modifiedCount > 0) {
        logger.info(
          { event: 'cron.unlock', count: result.modifiedCount, timestamp: now.toISOString() },
          `Unlocked ${result.modifiedCount} capsule(s)`
        );
      }
    } catch (err) {
      logger.error({ event: 'cron.unlock_error', err }, 'Error in unlock cron job');
    }
  });

  logger.info({ event: 'cron.started', schedule: '0 * * * * *' }, 'Capsule unlock cron job started');
  return job;
}

module.exports = { startUnlockJob };
