const config = require('../config');
const db = require('../db/queries');
const { redeemCodeForPlayer } = require('./kingshotRedeem');
const { randomDelayMs } = require('../utils/randomDelay');
const logger = require('../utils/logger');

const MAX_RETRIES = 2;

let redeemJobRunning = false;
let currentRedeemCode = null;

function isRedeemJobRunning() {
  return redeemJobRunning;
}

function getCurrentRedeemCode() {
  return currentRedeemCode;
}

async function redeemWithRetries(playerId, giftCode) {
  let lastResult = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      logger.info('Redeem retry', { playerId, giftCode, attempt, maxRetries: MAX_RETRIES });
      await randomDelayMs(2, 4);
    }

    lastResult = await redeemCodeForPlayer(playerId, giftCode);

    if (['success', 'already_claimed', 'skipped', 'code_unavailable'].includes(lastResult.status)) {
      return lastResult;
    }

    if (lastResult.errCode === 40005 || lastResult.errCode === 40014 || lastResult.errCode === 40007) {
      logger.warn('Redeem stopped for code — unavailable, invalid or expired', {
        giftCode,
        errCode: lastResult.errCode,
      });
      return lastResult;
    }

    if (attempt < MAX_RETRIES) {
      logger.warn('Redeem attempt failed', {
        playerId,
        giftCode,
        attempt: attempt + 1,
        status: lastResult.status,
        message: lastResult.message,
      });
    }
  }

  return lastResult;
}

/**
 * Redeem sequential pentru toți jucătorii — un singur job la un moment dat.
 */
async function redeemCodeForAllPlayers(giftCode, { source = 'manual' } = {}) {
  if (redeemJobRunning) {
    logger.warn('Redeem job already running — skipped', {
      requestedCode: giftCode,
      currentCode: currentRedeemCode,
      source,
    });
    return {
      ok: false,
      code: 'BUSY',
      giftCode,
      message: `Redeem already in progress for \`${currentRedeemCode}\``,
    };
  }

  if (!config.redeem.enabled) {
    return { ok: false, code: 'DISABLED', giftCode, message: 'Auto-redeem disabled' };
  }

  const players = await db.getAllPlayers();
  if (!players.length) {
    return { ok: false, code: 'NO_PLAYERS', giftCode, message: 'No registered players' };
  }

  redeemJobRunning = true;
  currentRedeemCode = giftCode;

  const summary = {
    ok: true,
    giftCode,
    source,
    total: players.length,
    success: 0,
    already: 0,
    skipped: 0,
    failed: 0,
    stopped: false,
    stopReason: null,
  };

  logger.info('Bulk redeem started', {
    giftCode,
    source,
    players: players.length,
    delaySec: `${config.redeem.minDelaySeconds}-${config.redeem.maxDelaySeconds}`,
  });

  try {
    for (let i = 0; i < players.length; i += 1) {
      const player = players[i];

      const existing = await db.getRedeemResult(player.player_id, giftCode);
      if (existing && ['success', 'already_claimed'].includes(existing.status)) {
        summary.skipped += 1;
        logger.debug('Redeem skip — already processed', {
          playerId: player.player_id,
          giftCode,
          status: existing.status,
        });
        continue;
      }

      try {
        const result = await redeemWithRetries(player.player_id, giftCode);

        await db.saveRedeemResult({
          playerId: player.player_id,
          discordId: player.discord_id,
          giftCode,
          status: result.status,
          message: result.message,
        });

        if (result.status === 'success') summary.success += 1;
        else if (result.status === 'already_claimed') summary.already += 1;
        else if (result.status === 'skipped') summary.skipped += 1;
        else summary.failed += 1;

        logger.info('Redeem player result', {
          playerId: player.player_id,
          giftCode,
          status: result.status,
          source,
        });

        if (result.errCode === 40005 || result.errCode === 40014 || result.errCode === 40007) {
          summary.stopped = true;
          summary.stopReason = result.message;
          break;
        }
      } catch (error) {
        summary.failed += 1;
        logger.error('Redeem player exception', {
          playerId: player.player_id,
          giftCode,
          error: error.message,
          source,
        });
      }

      if (i < players.length - 1) {
        await randomDelayMs(config.redeem.minDelaySeconds, config.redeem.maxDelaySeconds);
      }
    }
  } finally {
    redeemJobRunning = false;
    currentRedeemCode = null;
  }

  logger.info('Bulk redeem finished', { ...summary });
  return summary;
}

/**
 * Canjează toate codurile active pentru UN singur jucător (ex: la înregistrare).
 * Sare peste codurile deja canjate cu succes / deja folosite.
 */
async function redeemActiveCodesForPlayer(playerId, discordId, { source = 'new_player' } = {}) {
  const summary = {
    playerId,
    source,
    total: 0,
    attempted: 0,
    success: 0,
    already: 0,
    skipped: 0,
    unavailable: 0,
    expired: 0,
    failed: 0,
  };

  if (!config.redeem.enabled) {
    return summary;
  }

  const activeCodes = await db.getActiveGiftCodesFromDb();
  summary.total = activeCodes.length;

  if (!activeCodes.length) {
    return summary;
  }

  logger.info('New player auto-redeem started', {
    playerId,
    source,
    activeCodes: activeCodes.length,
  });

  for (let i = 0; i < activeCodes.length; i += 1) {
    const giftCode = activeCodes[i].code;

    const existing = await db.getRedeemResult(playerId, giftCode);
    if (existing && ['success', 'already_claimed'].includes(existing.status)) {
      summary.skipped += 1;
      continue;
    }

    summary.attempted += 1;

    try {
      const result = await redeemWithRetries(playerId, giftCode);

      await db.saveRedeemResult({
        playerId,
        discordId,
        giftCode,
        status: result.status,
        message: result.message,
      });

      if (result.status === 'success') summary.success += 1;
      else if (result.status === 'already_claimed') summary.already += 1;
      else if (result.status === 'code_unavailable') summary.unavailable += 1;
      else if (result.status === 'skipped') summary.skipped += 1;
      else if (result.errCode === 40007) summary.expired += 1;
      else summary.failed += 1;

      logger.info('New player redeem result', {
        playerId,
        giftCode,
        status: result.status,
        source,
      });
    } catch (error) {
      summary.failed += 1;
      logger.error('New player redeem exception', {
        playerId,
        giftCode,
        error: error.message,
        source,
      });
    }

    if (i < activeCodes.length - 1) {
      await randomDelayMs(config.redeem.minDelaySeconds, config.redeem.maxDelaySeconds);
    }
  }

  logger.info('New player auto-redeem finished', { ...summary });
  return summary;
}

module.exports = {
  redeemCodeForAllPlayers,
  redeemActiveCodesForPlayer,
  redeemWithRetries,
  isRedeemJobRunning,
  getCurrentRedeemCode,
};
