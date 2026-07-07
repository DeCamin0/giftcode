const { EmbedBuilder } = require('discord.js');

function buildPlayerEmbed({ playerId, discordName, nickname, kingdomId, townLevel, avatarUrl }) {
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle('✅ Registered | Registrado');

  const fields = [
    { name: 'Player ID', value: `\`${playerId}\``, inline: true },
    { name: 'Discord', value: discordName, inline: true },
  ];

  if (nickname) {
    fields.push({ name: 'In-game | Juego', value: nickname, inline: true });
  }
  if (kingdomId) {
    fields.push({ name: 'Kingdom | Reino', value: String(kingdomId), inline: true });
  }
  if (townLevel) {
    fields.push({ name: 'Town level | Ciudad', value: String(townLevel), inline: true });
  }

  embed.addFields(fields);

  if (avatarUrl && avatarUrl.startsWith('http')) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

function buildMyIdEmbed(player) {
  return buildPlayerEmbed({
    playerId: player.player_id,
    discordName: player.discord_name,
    nickname: player.game_nickname,
    kingdomId: player.kingdom_id,
    townLevel: player.town_level,
    avatarUrl: player.game_avatar,
  }).setTitle('📋 Your info | Tu información');
}

module.exports = { buildPlayerEmbed, buildMyIdEmbed };
