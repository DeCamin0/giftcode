const config = require('../config');
const db = require('../db/queries');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');
const { redeemActiveCodesForPlayer } = require('./bulkRedeem');

/**
 * La adăugarea unui jucător nou (self / auto / admin), încearcă toate codurile
 * active pentru el, apoi anunță rezultatul privat (celui care a adăugat) și
 * în canalul de coduri.
 *
 * Rulează în fundal — nu blochează răspunsul de confirmare.
 */
function autoRedeemForNewPlayer({ client, playerId, discordId, source, sendPrivate }) {
  if (!config.redeem.enabled) return;
  if (!playerId) return;

  (async () => {
    try {
      const activeCodes = await db.getActiveGiftCodesFromDb();
      if (!activeCodes.length) {
        logger.info('New player auto-redeem skipped — no active codes', { playerId, source });
        return;
      }

      const summary = await redeemActiveCodesForPlayer(playerId, discordId, { source });

      if (!summary || summary.attempted === 0) {
        logger.info('New player auto-redeem: nothing to redeem', { playerId, source });
        return;
      }

      const content = messages.giftCode.newPlayerRedeemSummary(summary);

      if (typeof sendPrivate === 'function') {
        try {
          await sendPrivate(content);
        } catch (error) {
          logger.warn('New player redeem private notify failed', {
            playerId,
            error: error.message,
          });
        }
      }

      try {
        const channel = await client.channels.fetch(config.discord.giftCodesChannelId);
        if (channel?.isTextBased()) {
          await channel.send({ content });
        }
      } catch (error) {
        logger.error('New player redeem channel notify failed', {
          playerId,
          error: error.message,
        });
      }
    } catch (error) {
      logger.error('autoRedeemForNewPlayer failed', {
        playerId,
        source,
        error: error.message,
      });
    }
  })();
}

module.exports = { autoRedeemForNewPlayer };
