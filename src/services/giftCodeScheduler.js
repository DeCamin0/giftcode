const cron = require('node-cron');
const { parseExpression } = require('cron-parser');
const config = require('../config');
const db = require('../db/queries');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');
const {
  fetchAndStoreGiftCodes,
  notifyNewCodes,
  notifyAutoRedeemSummary,
} = require('./giftCodeChecker');
const { redeemCodeForAllPlayers, isRedeemJobRunning } = require('./bulkRedeem');

const state = {
  enabled: false,
  cronExpression: null,
  cronTask: null,
  lastRunAt: null,
  lastRunStatus: null,
  lastNewCodes: [],
  lastError: null,
  checkInProgress: false,
  nextRunAt: null,
};

function computeNextRun(cronExpression) {
  try {
    const interval = parseExpression(cronExpression, { utc: true });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

function refreshNextRun() {
  state.nextRunAt = state.enabled && state.cronExpression
    ? computeNextRun(state.cronExpression)
    : null;
}

function getSchedulerStatus() {
  return {
    enabled: state.enabled,
    cronExpression: state.cronExpression,
    lastRunAt: state.lastRunAt,
    lastRunStatus: state.lastRunStatus,
    lastNewCodes: [...state.lastNewCodes],
    lastError: state.lastError,
    nextRunAt: state.nextRunAt,
    checkInProgress: state.checkInProgress,
    redeemInProgress: isRedeemJobRunning(),
  };
}

async function autoRedeemNewCodes(client, newCodes) {
  if (!config.redeem.enabled) {
    logger.info('Auto-redeem skipped — disabled (Kingshot ToS / ENABLE_AUTO_REDEEM=false)');
    return [];
  }

  if (!newCodes.length) return [];

  const summaries = [];

  for (const entry of newCodes) {
    if (isRedeemJobRunning()) {
      logger.warn('Scheduler: redeem busy, deferring code', { code: entry.code });
      continue;
    }

    logger.info('Scheduler: auto-redeem starting', { code: entry.code });
    const summary = await redeemCodeForAllPlayers(entry.code, { source: 'scheduler' });
    summaries.push(summary);

    if (summary.ok && client) {
      await notifyAutoRedeemSummary(client, summary);
    }
  }

  return summaries;
}

async function runSchedulerCycle(client, { trigger = 'cron' } = {}) {
  if (state.checkInProgress) {
    logger.warn('Scheduler cycle skipped — previous check still running', { trigger });
    return { ok: false, code: 'BUSY' };
  }

  state.checkInProgress = true;
  state.lastError = null;

  logger.info('Scheduler cycle started', { trigger, cron: state.cronExpression });

  try {
    const { newCodes } = await fetchAndStoreGiftCodes();
    state.lastNewCodes = newCodes.map((c) => c.code);

    if (newCodes.length) {
      logger.info('Scheduler: new codes detected', {
        codes: state.lastNewCodes,
        count: newCodes.length,
      });
    }

    await notifyNewCodes(client);

    if (newCodes.length) {
      await autoRedeemNewCodes(client, newCodes);
    }

    state.lastRunAt = new Date();
    state.lastRunStatus = 'ok';
    refreshNextRun();

    logger.info('Scheduler cycle complete', {
      trigger,
      newCodes: state.lastNewCodes.length,
      nextRunAt: state.nextRunAt?.toISOString(),
    });

    return { ok: true, newCodes };
  } catch (error) {
    state.lastRunAt = new Date();
    state.lastRunStatus = 'error';
    state.lastError = error.message;
    logger.error('Scheduler cycle failed', { trigger, error: error.message });
    return { ok: false, error: error.message };
  } finally {
    state.checkInProgress = false;
    refreshNextRun();
  }
}

function startGiftCodeScheduler(client) {
  state.enabled = config.scheduler.enabled;
  state.cronExpression = config.scheduler.cron;

  if (!state.enabled) {
    logger.info('Gift code scheduler disabled (CHECK_CODES_ENABLED=false)');
    return;
  }

  if (!cron.validate(state.cronExpression)) {
    logger.error('Invalid CHECK_CODES_CRON expression', { cron: state.cronExpression });
    throw new Error(`Invalid CHECK_CODES_CRON: ${state.cronExpression}`);
  }

  refreshNextRun();

  logger.info('Gift code scheduler started', {
    cron: state.cronExpression,
    nextRunAt: state.nextRunAt?.toISOString(),
    autoRedeem: config.redeem.enabled,
    sources: [
      'kingshot.net',
      ...(config.kingshot.jeabGiftCodesEnabled ? ['jeab.dev'] : []),
    ],
  });

  state.cronTask = cron.schedule(
    state.cronExpression,
    () => {
      runSchedulerCycle(client, { trigger: 'cron' }).catch((error) => {
        logger.error('Unhandled scheduler error', { error: error.message });
      });
    },
    { timezone: 'UTC' }
  );

  setTimeout(() => {
    runSchedulerCycle(client, { trigger: 'startup' }).catch((error) => {
      logger.error('Startup scheduler error', { error: error.message });
    });
  }, 10000);
}

function stopGiftCodeScheduler() {
  if (state.cronTask) {
    state.cronTask.stop();
    state.cronTask = null;
  }
  state.enabled = false;
  refreshNextRun();
}

module.exports = {
  startGiftCodeScheduler,
  stopGiftCodeScheduler,
  runSchedulerCycle,
  getSchedulerStatus,
};
