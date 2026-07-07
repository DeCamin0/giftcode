const { SlashCommandBuilder } = require('discord.js');
const db = require('../db/queries');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');
const { requireAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeplayer')
    .setDescription('Remove a player from the redeem list (admin only)')
    .setDescriptionLocalizations(
      spanishLocales('Elimina un jugador de la lista de canje (solo admin)')
    )
    .addStringOption((option) =>
      option
        .setName('player_id')
        .setDescription('In-game Player ID to remove')
        .setDescriptionLocalizations(spanishLocales('Player ID del juego a eliminar'))
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Discord member to remove from the list')
        .setDescriptionLocalizations(
          spanishLocales('Miembro de Discord a eliminar de la lista')
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    const playerId = interaction.options.getString('player_id')?.trim();
    const discordUser = interaction.options.getUser('user');

    if (!playerId && !discordUser) {
      await interaction.reply({
        content: messages.playerAdmin.missingTarget,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    if (!(await requireAdmin(interaction))) return;

    try {
      let removed = false;
      let label = '';
      let removedPlayerId = playerId;

      if (playerId) {
        const row = await db.getPlayerByPlayerId(playerId);
        if (row) {
          removed = await db.removePlayerByPlayerId(playerId);
          label = row.discord_name;
          removedPlayerId = row.player_id;
        }
      } else if (discordUser) {
        const row = await db.getPlayerByDiscordId(discordUser.id);
        if (row) {
          removed = await db.removePlayer(discordUser.id);
          label = row.discord_name;
          removedPlayerId = row.player_id;
        }
      }

      if (!removed) {
        await interaction.editReply({ content: messages.playerAdmin.notFound });
        return;
      }

      logger.info('Player removed by admin', {
        playerId: removedPlayerId,
        removedBy: interaction.user.id,
      });

      await interaction.editReply({
        content: messages.playerAdmin.removed(removedPlayerId, label),
      });
    } catch (error) {
      logger.error('Eroare /removeplayer', { error: error.message });
      await interaction.editReply({ content: messages.playerAdmin.dbError });
    }
  },
};
