const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db/queries');
const config = require('../config');
const { getSchedulerStatus } = require('../services/giftCodeScheduler');
const { isRedeemJobRunning, getCurrentRedeemCode } = require('../services/bulkRedeem');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');
const { requireAdmin } = require('../utils/permissions');

function formatTs(date) {
  if (!date) return '—';
  const ts = Math.floor(new Date(date).getTime() / 1000);
  return `<t:${ts}:R>`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schedulerstatus')
    .setDescription('Gift code scheduler status (admin only)')
    .setDescriptionLocalizations(
      spanishLocales('Estado del programador de códigos (solo admin)')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await requireAdmin(interaction))) return;

    const status = getSchedulerStatus();
    const players = await db.getAllPlayers();
    const lastCode = await db.getLastDetectedGiftCode();

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(messages.scheduler.statusTitle)
      .addFields(
        {
          name: 'Scheduler | Programador',
          value: status.enabled ? '✅ Running | Activo' : '❌ Disabled | Desactivado',
          inline: true,
        },
        {
          name: 'Auto-redeem | Canje auto',
          value: config.redeem.enabled ? '✅ ON' : '❌ OFF',
          inline: true,
        },
        {
          name: 'Redeem job | Trabajo redeem',
          value: isRedeemJobRunning()
            ? `⏳ \`${getCurrentRedeemCode()}\``
            : '✅ Idle | Libre',
          inline: true,
        },
        {
          name: 'Cron (UTC)',
          value: `\`${status.cronExpression || config.scheduler.cron}\``,
          inline: false,
        },
        {
          name: 'Next run | Próxima ejecución',
          value: formatTs(status.nextRunAt),
          inline: true,
        },
        {
          name: 'Last run | Última ejecución',
          value: `${formatTs(status.lastRunAt)} (${status.lastRunStatus || '—'})`,
          inline: true,
        },
        {
          name: 'Registered players | Jugadores',
          value: String(players.length),
          inline: true,
        },
        {
          name: 'Last detected code | Último código',
          value: lastCode
            ? `\`${lastCode.code}\` — ${formatTs(lastCode.first_seen_at)}`
            : '—',
          inline: false,
        }
      );

    if (status.lastNewCodes?.length) {
      embed.addFields({
        name: 'Last new codes | Últimos nuevos',
        value: status.lastNewCodes.map((c) => `\`${c}\``).join(', '),
        inline: false,
      });
    }

    if (status.lastError) {
      embed.addFields({
        name: 'Last error | Último error',
        value: status.lastError.slice(0, 200),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
