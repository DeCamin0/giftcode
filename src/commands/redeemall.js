const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const db = require('../db/queries');
const { redeemCodeForAllPlayers, isRedeemJobRunning } = require('../services/bulkRedeem');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');
const { requireAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('redeemall')
    .setDescription('Redeem a code for all registered members (admin only)')
    .setDescriptionLocalizations(
      spanishLocales('Canjea un código para todos los miembros registrados (solo admin)')
    )
    .addStringOption((option) =>
      option
        .setName('code')
        .setDescription('Gift code (case-sensitive)')
        .setDescriptionLocalizations(spanishLocales('Código de regalo (sensible a mayúsculas)'))
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await requireAdmin(interaction))) return;

    if (!config.redeem.enabled) {
      await interaction.editReply({ content: messages.redeemall.disabled });
      return;
    }

    if (isRedeemJobRunning()) {
      await interaction.editReply({ content: messages.redeemall.busy });
      return;
    }

    const giftCode = interaction.options.getString('code', true).trim();
    const players = await db.getAllPlayers();

    if (!players.length) {
      await interaction.editReply({ content: messages.redeemall.noPlayers });
      return;
    }

    await interaction.editReply({
      content: messages.redeemall.started(
        players.length,
        giftCode,
        config.redeem.minDelaySeconds,
        config.redeem.maxDelaySeconds
      ),
    });

    logger.info('/redeemall started', { giftCode, userId: interaction.user.id });

    const summary = await redeemCodeForAllPlayers(giftCode, { source: 'redeemall' });

    if (!summary.ok) {
      await interaction.followUp({ content: summary.message || messages.redeemall.failed });
      return;
    }

    let reply = messages.redeemall.summary(
      giftCode,
      summary.success,
      summary.already,
      summary.skipped,
      summary.failed
    );

    if (summary.stopped && summary.stopReason) {
      reply += `\n\n${messages.redeemall.stopped(summary.stopReason)}`;
    }

    await interaction.followUp({ content: reply });
  },
};
