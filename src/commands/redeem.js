const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const db = require('../db/queries');
const { redeemCodeForPlayer } = require('../services/kingshotRedeem');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('Try to redeem a code for your Player ID (optional — experimental)')
    .setDescriptionLocalizations(
      spanishLocales('Intenta canjear un código para tu Player ID (opcional — experimental)')
    )
    .addStringOption((option) =>
      option
        .setName('code')
        .setDescription('Gift code (case-sensitive)')
        .setDescriptionLocalizations(spanishLocales('Código de regalo (sensible a mayúsculas)'))
        .setRequired(true)
    ),

  async execute(interaction) {
    const giftCode = interaction.options.getString('code', true).trim();

    if (!config.redeem.enabled) {
      await interaction.reply({
        content: messages.redeem.disabled,
        ephemeral: true,
      });
      return;
    }

    const player = await db.getPlayerByDiscordId(interaction.user.id);
    if (!player) {
      await interaction.reply({
        content: messages.redeem.notRegistered,
        ephemeral: true,
      });
      return;
    }

    const existing = await db.getRedeemResult(player.player_id, giftCode);
    if (existing && ['success', 'already_claimed'].includes(existing.status)) {
      await interaction.reply({
        content: messages.redeem.alreadyProcessed(existing.status),
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await redeemCodeForPlayer(player.player_id, giftCode);

      await db.saveRedeemResult({
        playerId: player.player_id,
        discordId: interaction.user.id,
        giftCode,
        status: result.status,
        message: result.message,
      });

      const emoji =
        result.status === 'success'
          ? '✅'
          : ['already_claimed', 'code_unavailable'].includes(result.status)
            ? 'ℹ️'
            : '❌';

      await interaction.editReply({
        content: `${emoji} **${result.status}**\n${result.message}`,
      });

      logger.info('Individual redeem', {
        discordId: interaction.user.id,
        playerId: player.player_id,
        giftCode,
        status: result.status,
      });
    } catch (error) {
      logger.error('/redeem error', { error: error.message });
      await interaction.editReply({ content: messages.redeem.error(error.message) });
    }
  },
};
