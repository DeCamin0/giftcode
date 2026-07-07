const { SlashCommandBuilder } = require('discord.js');
const db = require('../db/queries');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');
const { requireOwner, invalidateAdminCache } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeadmin')
    .setDescription('Remove a bot admin (owner only)')
    .setDescriptionLocalizations(spanishLocales('Elimina un admin del bot (solo dueño)'))
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Discord user to demote')
        .setDescriptionLocalizations(spanishLocales('Usuario de Discord a degradar'))
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!(await requireOwner(interaction))) return;

    const target = interaction.options.getUser('user', true);

    try {
      const removed = await db.removeBotAdmin(target.id);
      if (!removed) {
        await interaction.reply({
          content: messages.botAdmins.notFound(target.username),
          ephemeral: true,
        });
        return;
      }

      invalidateAdminCache();

      logger.info('Bot admin eliminat', {
        targetId: target.id,
        targetName: target.username,
        removedBy: interaction.user.id,
      });

      await interaction.reply({
        content: messages.botAdmins.removed(target.username, target.id),
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Eroare /removeadmin', {
        targetId: target.id,
        error: error.message,
      });
      await interaction.reply({
        content: messages.botAdmins.dbError,
        ephemeral: true,
      });
    }
  },
};
