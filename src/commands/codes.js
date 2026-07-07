const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fetchAndStoreGiftCodes } = require('../services/giftCodeChecker');
const db = require('../db/queries');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('codes')
    .setDescription('Show active gift codes detected by the bot')
    .setDescriptionLocalizations(
      spanishLocales('Muestra los códigos activos detectados por el bot')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      await fetchAndStoreGiftCodes();
      const codes = await db.getActiveGiftCodesFromDb();

      if (!codes.length) {
        await interaction.editReply(messages.codes.none);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(messages.codes.embedTitle)
        .setColor(0x5865f2)
        .setDescription(
          codes
            .slice(0, 15)
            .map((row) => {
              const expiry = row.expires_at
                ? messages.codes.expires(
                    Math.floor(new Date(row.expires_at).getTime() / 1000)
                  )
                : '';
              return `\`${row.code}\`${expiry}`;
            })
            .join('\n')
        )
        .setFooter({ text: messages.codes.embedFooter })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('/codes error', { error: error.message });
      await interaction.editReply(messages.codes.fetchError);
    }
  },
};
