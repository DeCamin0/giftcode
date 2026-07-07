const config = require('../config');
const { isValidPlayerId, registerPlayerForUser } = require('../services/playerRegistration');
const { autoRedeemForNewPlayer } = require('../services/newPlayerRedeem');
const logger = require('../utils/logger');

/**
 * Dacă mesajul e doar un Player ID (ex: 12345678), înregistrează automat autorul.
 */
async function handleAutoRegisterMessage(message) {
  if (!config.discord.autoRegisterEnabled) return false;
  if (message.author.bot) return false;
  if (!message.guild) return false;

  if (
    config.discord.registerChannelId &&
    message.channel.id !== config.discord.registerChannelId
  ) {
    return false;
  }

  const content = message.content.trim();
  if (!isValidPlayerId(content)) return false;

  const result = await registerPlayerForUser({
    discordId: message.author.id,
    discordName: message.author.username,
    playerId: content,
  });

  await message.reply({
    embeds: result.embed ? [result.embed] : [],
    content: result.embed ? undefined : result.message,
    allowedMentions: { repliedUser: false },
  });

  logger.info('Auto-register din mesaj', {
    discordId: message.author.id,
    playerId: content,
    code: result.code,
  });

  if (result.ok) {
    autoRedeemForNewPlayer({
      client: message.client,
      playerId: result.playerId,
      discordId: result.discordId,
      source: 'auto-register',
      sendPrivate: (msg) =>
        message.reply({ content: msg, allowedMentions: { repliedUser: false } }),
    });
  }

  return true;
}

module.exports = { handleAutoRegisterMessage };
