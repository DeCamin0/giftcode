const { SlashCommandBuilder } = require('discord.js');
const db = require('../db/queries');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');
const { requireAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listadmins')
    .setDescription('List bot admins stored in the database')
    .setDescriptionLocalizations(
      spanishLocales('Lista los admins del bot guardados en la base de datos')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await requireAdmin(interaction))) return;

    try {
      const rows = await db.listBotAdmins();

      if (!rows.length) {
        await interaction.editReply({
          content: messages.botAdmins.listEmpty,
        });
        return;
      }

      const lines = rows.map((row) => messages.botAdmins.listLine(row));
      await interaction.editReply({
        content: [messages.botAdmins.listHeader, ...lines].join('\n'),
      });
    } catch (error) {
      logger.error('Eroare /listadmins', { error: error.message });
      await interaction.editReply({
        content: messages.botAdmins.dbError,
      });
    }
  },
};
