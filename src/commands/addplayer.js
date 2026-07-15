const { SlashCommandBuilder } = require('discord.js');
const { registerPlayerByAdmin } = require('../services/playerRegistration');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');
const { requireAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addplayer')
    .setDescription('Add a Player ID to the alliance list (admin only)')
    .setDescriptionLocalizations(
      spanishLocales('Añade un Player ID a la lista de la alianza (solo admin)')
    )
    .addStringOption((option) =>
      option
        .setName('player_id')
        .setDescription('In-game Player ID')
        .setDescriptionLocalizations(spanishLocales('Player ID del juego'))
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Optional Discord member to link')
        .setDescriptionLocalizations(
          spanishLocales('Miembro de Discord opcional para vincular')
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('note')
        .setDescription('Label if no Discord user (e.g. alliance member name)')
        .setDescriptionLocalizations(
          spanishLocales('Etiqueta sin usuario Discord (ej. nombre en alianza)')
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await requireAdmin(interaction))) return;

    const playerId = interaction.options.getString('player_id', true);
    const discordUser = interaction.options.getUser('user');
    const note = interaction.options.getString('note')?.trim() || null;

    if (discordUser?.bot) {
      await interaction.editReply({
        content: messages.botAdmins.cannotTargetBot,
      });
      return;
    }

    const result = await registerPlayerByAdmin({
      playerId,
      addedByDiscordId: interaction.user.id,
      discordUser,
      note,
    });

    if (!result.ok) {
      await interaction.editReply({ content: result.message });
      return;
    }

    await interaction.editReply(
      result.embed ? { embeds: [result.embed] } : { content: result.message }
    );
  },
};
