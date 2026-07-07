const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db/queries');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');
const { spanishLocales } = require('../utils/commandLocales');
const { requireAdmin } = require('../utils/permissions');

function formatPlayerLine(player) {
  const isManual = String(player.discord_id).startsWith('manual:');
  const who = isManual
    ? `manual · ${player.discord_name}`
    : `<@${player.discord_id}> · ${player.discord_name}`;

  const parts = [`\`${player.player_id}\``, who];

  if (player.game_nickname) parts.push(player.game_nickname);
  if (player.kingdom_id) parts.push(`K${player.kingdom_id}`);
  if (player.registration_type === 'admin') parts.push('(admin)');

  return `• ${parts.join(' · ')}`;
}

function chunkLines(lines, maxLen = 950) {
  const chunks = [];
  let current = '';

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > maxLen && current) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listplayers')
    .setDescription('List all players on the redeem list (admin only)')
    .setDescriptionLocalizations(
      spanishLocales('Lista todos los jugadores en la lista de canje (solo admin)')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await requireAdmin(interaction))) return;

    try {
      const players = await db.getAllPlayers();

      if (!players.length) {
        await interaction.editReply({ content: messages.listplayers.empty });
        return;
      }

      const lines = players.map(formatPlayerLine);
      const chunks = chunkLines(lines);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(messages.listplayers.title)
        .setFooter({ text: messages.listplayers.footer(players.length) });

      chunks.forEach((text, index) => {
        embed.addFields({
          name: chunks.length > 1 ? `Page ${index + 1} | Pág. ${index + 1}` : '\u200b',
          value: text,
        });
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('Eroare /listplayers', { error: error.message });
      await interaction.editReply({ content: messages.listplayers.dbError });
    }
  },
};
