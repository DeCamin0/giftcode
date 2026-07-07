const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const db = require('../db/queries');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');
const { requireOwner, invalidateAdminCache, hasAdminRole } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addadmin')
    .setDescription('Add a bot admin (owner only)')
    .setDescriptionLocalizations(spanishLocales('Añade un admin del bot (solo dueño)'))
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Discord user to promote')
        .setDescriptionLocalizations(spanishLocales('Usuario de Discord a promover'))
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!(await requireOwner(interaction))) return;

    const target = interaction.options.getUser('user', true);

    if (target.bot) {
      await interaction.reply({
        content: messages.botAdmins.cannotTargetBot,
        ephemeral: true,
      });
      return;
    }

    try {
      if (config.discord.ownerUserIds.includes(target.id)) {
        await interaction.reply({
          content: messages.botAdmins.alreadyAdmin(target.username),
          ephemeral: true,
        });
        return;
      }

      const existing = await db.getBotAdminByDiscordId(target.id);
      if (existing) {
        await interaction.reply({
          content: messages.botAdmins.alreadyAdmin(target.username),
          ephemeral: true,
        });
        return;
      }

      if (interaction.guild) {
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (member && hasAdminRole(member)) {
          await interaction.reply({
            content: messages.botAdmins.alreadyAdmin(target.username),
            ephemeral: true,
          });
          return;
        }
      }

      await db.addBotAdmin({
        discordUserId: target.id,
        discordUsername: target.username,
        addedByDiscordId: interaction.user.id,
      });
      invalidateAdminCache();

      logger.info('Bot admin adăugat', {
        targetId: target.id,
        targetName: target.username,
        addedBy: interaction.user.id,
      });

      await interaction.reply({
        content: messages.botAdmins.added(target.username, target.id),
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Eroare /addadmin', {
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
