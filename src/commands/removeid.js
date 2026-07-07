const { SlashCommandBuilder } = require('discord.js');
const db = require('../db/queries');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeid')
    .setDescription('Remove your Player ID registration')
    .setDescriptionLocalizations(spanishLocales('Elimina tu registro de Player ID')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const removed = await db.removePlayer(interaction.user.id);

    if (!removed) {
      await interaction.editReply({ content: messages.removeid.notFound });
      return;
    }

    logger.info('Player removed', { discordId: interaction.user.id });
    await interaction.editReply({ content: messages.removeid.success });
  },
};
