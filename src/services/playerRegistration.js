const db = require('../db/queries');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');
const { lookupPlayer } = require('./kingshotRedeem');
const { buildPlayerEmbed } = require('../utils/registrationEmbed');

const PLAYER_ID_REGEX = /^\d{5,15}$/;

function isValidPlayerId(playerId) {
  return PLAYER_ID_REGEX.test(playerId);
}

async function registerPlayerForUser({ discordId, discordName, playerId }) {
  const normalizedId = playerId.trim();

  if (!isValidPlayerId(normalizedId)) {
    return {
      ok: false,
      code: 'INVALID_ID',
      message: messages.register.invalidId,
    };
  }

  let profile = null;

  try {
    const lookup = await lookupPlayer(normalizedId);

    if (!lookup.ok) {
      if (lookup.errCode === 40001) {
        return {
          ok: false,
          code: 'PLAYER_NOT_FOUND',
          message: messages.register.playerNotFound,
        };
      }

      logger.warn('Player lookup failed — registering without profile', {
        playerId: normalizedId,
        errCode: lookup.errCode,
      });
    } else {
      profile = lookup.profile;
    }
  } catch (error) {
    logger.warn('Player lookup error — registering without profile', {
      playerId: normalizedId,
      error: error.message,
    });
  }

  try {
    await db.registerPlayer(discordId, discordName, normalizedId, profile);

    logger.info('Player registered', {
      discordId,
      playerId: normalizedId,
      nickname: profile?.nickname,
    });

    return {
      ok: true,
      code: 'SUCCESS',
      playerId: normalizedId,
      discordId,
      embed: buildPlayerEmbed({
        playerId: normalizedId,
        discordName,
        nickname: profile?.nickname,
        kingdomId: profile?.kingdomId,
        townLevel: profile?.townLevel,
        avatarUrl: profile?.avatar,
      }),
    };
  } catch (error) {
    if (error.message === 'ALREADY_REGISTERED') {
      const existing = await db.getPlayerByDiscordId(discordId);
      return {
        ok: false,
        code: 'ALREADY_REGISTERED',
        message: messages.register.alreadyRegistered(existing.player_id),
      };
    }

    if (error.message === 'PLAYER_ID_TAKEN') {
      return {
        ok: false,
        code: 'PLAYER_ID_TAKEN',
        message: messages.register.playerIdTaken,
      };
    }

    logger.error('Register error', { error: error.message });
    return {
      ok: false,
      code: 'ERROR',
      message: messages.register.registerError,
    };
  }
}

async function registerPlayerByAdmin({
  playerId,
  addedByDiscordId,
  discordUser = null,
  note = null,
}) {
  const normalizedId = playerId.trim();

  if (!isValidPlayerId(normalizedId)) {
    return {
      ok: false,
      code: 'INVALID_ID',
      message: messages.register.invalidId,
    };
  }

  let profile = null;

  try {
    const lookup = await lookupPlayer(normalizedId);
    if (!lookup.ok) {
      if (lookup.errCode === 40001) {
        return {
          ok: false,
          code: 'PLAYER_NOT_FOUND',
          message: messages.register.playerNotFound,
        };
      }
    } else {
      profile = lookup.profile;
    }
  } catch (error) {
    logger.warn('Admin player lookup error', {
      playerId: normalizedId,
      error: error.message,
    });
  }

  const discordId = discordUser ? discordUser.id : db.manualDiscordId(normalizedId);
  const discordName = discordUser
    ? discordUser.username
    : profile?.nickname || note || `Manual ${normalizedId}`;

  if (discordUser) {
    const existingUser = await db.getPlayerByDiscordId(discordUser.id);
    if (existingUser) {
      return {
        ok: false,
        code: 'DISCORD_ALREADY_REGISTERED',
        message: messages.playerAdmin.discordAlreadyRegistered(
          discordUser.username,
          existingUser.player_id
        ),
      };
    }
  }

  try {
    await db.registerPlayer(discordId, discordName, normalizedId, profile, {
      registrationType: 'admin',
      addedByDiscordId,
    });

    logger.info('Player added by admin', {
      playerId: normalizedId,
      discordId,
      addedBy: addedByDiscordId,
      linkedDiscord: Boolean(discordUser),
    });

    const typeLabel = discordUser
      ? messages.playerAdmin.typeLinked
      : messages.playerAdmin.typeManual;

    return {
      ok: true,
      code: 'SUCCESS',
      playerId: normalizedId,
      discordId,
      embed: buildPlayerEmbed({
        playerId: normalizedId,
        discordName: `${discordName} (${typeLabel})`,
        nickname: profile?.nickname,
        kingdomId: profile?.kingdomId,
        townLevel: profile?.townLevel,
        avatarUrl: profile?.avatar,
      }).setTitle('✅ Player added | Jugador añadido'),
    };
  } catch (error) {
    if (error.message === 'PLAYER_ID_TAKEN') {
      const taken = await db.getPlayerByPlayerId(normalizedId);
      return {
        ok: false,
        code: 'PLAYER_ID_TAKEN',
        message: messages.playerAdmin.playerIdTaken(normalizedId, taken?.discord_name),
      };
    }

    if (error.message === 'ALREADY_REGISTERED') {
      return {
        ok: false,
        code: 'ALREADY_REGISTERED',
        message: messages.playerAdmin.discordAlreadyRegistered(discordUser?.username, normalizedId),
      };
    }

    logger.error('Admin add player error', { error: error.message });
    return {
      ok: false,
      code: 'ERROR',
      message: messages.playerAdmin.dbError,
    };
  }
}

module.exports = {
  isValidPlayerId,
  registerPlayerForUser,
  registerPlayerByAdmin,
};
