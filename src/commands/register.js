const { SlashCommandBuilder } = require('discord.js');
const { registerPlayerForUser } = require('../services/playerRegistration');
const { spanishLocales } = require('../utils/commandLocales');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your Kingshot Player ID (once)')
    .setDescriptionLocalizations(spanishLocales('Registra tu Player ID de Kingshot (una vez)'))
    .addStringOption((option) =>
      option
        .setName('player_id')
        .setDescription('In-game Player ID (number under your avatar)')
        .setDescriptionLocalizations(
          spanishLocales('Player ID del juego (número bajo tu avatar)')
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    const playerId = interaction.options.getString('player_id', true);

    await interaction.deferReply({ ephemeral: true });

    const result = await registerPlayerForUser({
      discordId: interaction.user.id,
      discordName: interaction.user.username,
      playerId,
    });

    await interaction.editReply(
      result.embed ? { embeds: [result.embed] } : { content: result.message }
    );
  },
};
