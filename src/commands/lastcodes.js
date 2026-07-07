const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db/queries');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lastcodes')
    .setDescription('Show recently detected gift codes')
    .setDescriptionLocalizations(
      spanishLocales('Muestra los códigos de regalo detectados recientemente')
    )
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('How many codes to show (default 10)')
        .setDescriptionLocalizations(spanishLocales('Cuántos códigos mostrar (por defecto 10)'))
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const limit = interaction.options.getInteger('limit') || 10;

    try {
      const rows = await db.getRecentGiftCodes(limit);

      if (!rows.length) {
        await interaction.editReply({ content: messages.lastcodes.empty });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle(messages.lastcodes.title);

      const lines = rows.map((row) => messages.lastcodes.line(row));
      embed.setDescription(lines.join('\n'));

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ content: messages.lastcodes.error });
    }
  },
};
