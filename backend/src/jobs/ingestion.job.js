const cron = require('node-cron');
const config = require('../config/env');
const IngestionService = require('../services/IngestionService');

let scheduledTask = null;

/**
 * Initializes and starts the background ingestion scheduler
 */
const startIngestionJob = () => {
  if (!config.INGESTION_ENABLED) {
    console.log('⏸️ Ingestion scheduler is disabled via INGESTION_ENABLED=false');
    return null;
  }

  if (scheduledTask) {
    console.warn('⚠️ Ingestion scheduler is already running, avoiding duplicate instances.');
    return scheduledTask;
  }

  const cronExpression = config.INGESTION_CRON || '*/1 * * * *';

  if (!cron.validate(cronExpression)) {
    console.error(`❌ Invalid cron expression: '${cronExpression}'. Scheduler not started.`);
    return null;
  }

  console.log(`⏱️ Starting Ingestion Cron Scheduler with expression: [${cronExpression}]`);

  scheduledTask = cron.schedule(cronExpression, async () => {
    try {
      await IngestionService.executeIngestion({ triggeredBy: 'SCHEDULER' });
    } catch (err) {
      console.error('❌ Unhandled error in scheduled ingestion job:', err.message);
    }
  });

  return scheduledTask;
};

/**
 * Gracefully stops the ingestion scheduler
 */
const stopIngestionJob = () => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('🛑 Ingestion scheduler stopped gracefully.');
  }
};

const isSchedulerRunning = () => Boolean(scheduledTask);

module.exports = {
  startIngestionJob,
  stopIngestionJob,
  isSchedulerRunning
};
