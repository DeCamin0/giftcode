const { SlashCommandBuilder } = require('discord.js');
const { runSchedulerCycle } = require('../services/giftCodeScheduler');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');
const { requireAdmin } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkcodes')
    .setDescription('Force an immediate gift code check (admin only)')
    .setDescriptionLocalizations(
      spanishLocales('Fuerza una verificación inmediata de códigos (solo admin)')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await requireAdmin(interaction))) return;

    logger.info('Manual /checkcodes triggered', { userId: interaction.user.id });

    try {
      const result = await runSchedulerCycle(interaction.client, { trigger: 'checkcodes' });

      if (result.code === 'BUSY') {
        await interaction.editReply({ content: messages.scheduler.busy });
        return;
      }

      if (!result.ok) {
        await interaction.editReply({
          content: messages.scheduler.checkFailed(result.error || 'unknown'),
        });
        return;
      }

      await interaction.editReply({
        content: messages.scheduler.checkDone(result.newCodes?.map((c) => c.code) || []),
      });
    } catch (error) {
      logger.error('/checkcodes failed', { error: error.message });
      await interaction.editReply({ content: messages.scheduler.checkFailed(error.message) });
    }
  },
};
