const { SlashCommandBuilder } = require('discord.js');
const db = require('../db/queries');
const { lookupPlayer } = require('../services/kingshotRedeem');
const { parsePlayerProfile } = require('../services/kingshotPlayer');
const { fetchJeabPlayer } = require('../services/jeabsPlayer');
const { buildGetInfoEmbed } = require('../utils/playerInfoEmbed');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');

const PLAYER_ID_REGEX = /^\d{5,15}$/;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getinfo')
    .setDescription('Look up a Kingshot player (JEABS + game API)')
    .setDescriptionLocalizations(
      spanishLocales('Busca un jugador de Kingshot (JEABS + API del juego)')
    )
    .addStringOption((option) =>
      option
        .setName('player_id')
        .setDescription('Player ID to look up (leave empty for your registered ID)')
        .setDescriptionLocalizations(
          spanishLocales('Player ID a buscar (vacío = tu ID registrado)')
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    let playerId = interaction.options.getString('player_id')?.trim();

    if (!playerId) {
      const registered = await db.getPlayerByDiscordId(interaction.user.id);
      if (!registered) {
        await interaction.reply({
          content: messages.getinfo.noIdProvided,
          ephemeral: true,
        });
        return;
      }
      playerId = registered.player_id;
    }

    if (!PLAYER_ID_REGEX.test(playerId)) {
      await interaction.reply({
        content: messages.getinfo.invalidId,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const jeabResult = await fetchJeabPlayer(playerId);
    const lookup = await lookupPlayer(playerId);
    const gameProfile = lookup.ok ? parsePlayerProfile(lookup.data) : null;

    if (!jeabResult.ok && !gameProfile) {
      await interaction.editReply({
        content:
          jeabResult.code === 'AUTH_EXPIRED'
            ? messages.getinfo.jeabTokenExpired
            : lookup.errCode === 40001
              ? messages.getinfo.playerNotFound
              : messages.getinfo.fetchFailed,
      });
      return;
    }

    const embed = buildGetInfoEmbed({
      playerId,
      gameProfile,
      jeabProfile: jeabResult.ok ? jeabResult.profile : null,
      jeabStatus: jeabResult.ok ? 'OK' : jeabResult.code,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
