const { SlashCommandBuilder } = require('discord.js');
const db = require('../db/queries');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');
const { buildMyIdEmbed } = require('../utils/registrationEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('myid')
    .setDescription('Show your registered Player ID')
    .setDescriptionLocalizations(spanishLocales('Muestra tu Player ID registrado')),

  async execute(interaction) {
    const player = await db.getPlayerByDiscordId(interaction.user.id);

    if (!player) {
      await interaction.reply({
        content: messages.myid.notRegistered,
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [buildMyIdEmbed(player)],
      ephemeral: true,
    });
  },
};
