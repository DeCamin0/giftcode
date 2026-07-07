const { EmbedBuilder } = require('discord.js');

function formatStat(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value.toLocaleString('en-US');
  return String(value);
}

function formatPower(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return formatStat(value);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString('en-US');
}

function formatPowerDelta(delta) {
  const num = Number(delta);
  if (!Number.isFinite(num)) return null;
  const sign = num >= 0 ? '+' : '';
  return `${sign}${formatPower(Math.abs(num))}`;
}

function formatRankings(rankings, kingdomId) {
  if (!Array.isArray(rankings) || !rankings.length) return null;
  const kid = kingdomId != null ? `K${kingdomId}` : 'K?';
  return rankings
    .map((row) => {
      const short =
        row.label === 'Personal Power'
          ? 'Power'
          : row.label === 'Kill Count'
            ? 'Kills'
            : row.label === 'Mystic Trial'
              ? 'Mystic'
              : row.label;
      return `${short} #${row.rank} (${kid})`;
    })
    .join(' · ');
}

function formatHeroesSummary(summary) {
  if (!summary) return null;
  const parts = [`${summary.count} heroes | héroes`];
  if (summary.maxLevel) parts.push(`Lv${summary.maxLevel} max`);
  if (summary.maxStars) parts.push(`⭐${summary.maxStars} max`);
  if (summary.stale) parts.push('(cached)');
  return parts.join(' · ');
}

function formatRecentCodes(codes) {
  if (!Array.isArray(codes) || !codes.length) return null;
  return codes.map((row) => `\`${row.code}\``).join(', ');
}

function pickAvatarUrl(jeabProfile, gameProfile) {
  const jeab = jeabProfile?.avatarUrl;
  if (jeab && String(jeab).startsWith('http')) return String(jeab);
  const game = gameProfile?.avatar;
  if (game && String(game).startsWith('http')) return String(game);
  return null;
}

function buildGetInfoEmbed({ playerId, gameProfile, jeabProfile, jeabStatus }) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🔍 Player info | Info jugador')
    .setURL(jeabProfile?.profileUrl || `https://kingshot.jeab.dev/player/${playerId}`);

  const nickname = jeabProfile?.nickname || gameProfile?.nickname;
  const kingdomId = jeabProfile?.kingdomId ?? gameProfile?.kingdomId;
  const townLevel = jeabProfile?.townLevel ?? gameProfile?.townLevel;
  const avatarUrl = pickAvatarUrl(jeabProfile, gameProfile);

  const fields = [{ name: 'Player ID', value: `\`${playerId}\``, inline: true }];

  if (!jeabProfile && jeabStatus === 'NO_TOKEN') {
    embed.setDescription(
      '🇬🇧 Basic info from game API only. Alliance, power, mystic, MMR need JEABS token — admin: `/setjeabtoken`.\n' +
        '🇪🇸 Solo info básica del juego. Alianza, power, mystic, MMR requieren token JEABS — admin: `/setjeabtoken`.'
    );
  } else if (!jeabProfile && jeabStatus === 'AUTH_EXPIRED') {
    embed.setDescription(
      '🇬🇧 JEABS token expired — admin: `/setjeabtoken` with a fresh token.\n' +
        '🇪🇸 Token JEABS expirado — admin: `/setjeabtoken` con un token nuevo.'
    );
  }

  if (nickname) fields.push({ name: 'Name | Nombre', value: nickname, inline: true });
  if (kingdomId != null) fields.push({ name: 'Kingdom | Reino', value: String(kingdomId), inline: true });
  if (townLevel != null) fields.push({ name: 'Town | Ciudad', value: String(townLevel), inline: true });
  if (jeabProfile?.alliance) {
    fields.push({ name: 'Alliance | Alianza', value: jeabProfile.alliance, inline: true });
  }
  if (jeabProfile?.power != null) {
    fields.push({ name: 'Power', value: formatPower(jeabProfile.power), inline: true });
  }
  if (jeabProfile?.vip != null) {
    fields.push({ name: 'VIP', value: String(jeabProfile.vip), inline: true });
  }
  if (jeabProfile?.lifeTreeLevel != null) {
    fields.push({ name: 'Life Tree | Árbol', value: String(jeabProfile.lifeTreeLevel), inline: true });
  }
  if (jeabProfile?.mystic != null) {
    let mysticText = formatStat(jeabProfile.mystic);
    if (jeabProfile.mysticRank != null) {
      mysticText += ` (#${jeabProfile.mysticRank})`;
    }
    fields.push({ name: 'Mystic Trial | Prueba mística', value: mysticText, inline: true });
  }
  if (jeabProfile?.kills != null) {
    fields.push({ name: 'Kills', value: formatPower(jeabProfile.kills), inline: true });
  }
  if (jeabProfile?.battleMmr != null) {
    fields.push({ name: 'Battle MMR', value: formatStat(jeabProfile.battleMmr), inline: true });
  }
  if (jeabProfile?.prepMmr != null) {
    fields.push({ name: 'Prep MMR', value: formatStat(jeabProfile.prepMmr), inline: true });
  }

  const rankingsText = formatRankings(jeabProfile?.rankings, kingdomId);
  if (rankingsText) {
    fields.push({ name: 'Kingdom ranks | Rangos reino', value: rankingsText, inline: false });
  }

  if (jeabProfile?.powerTrend?.delta != null) {
    const deltaText = formatPowerDelta(jeabProfile.powerTrend.delta);
    let trendValue = deltaText;
    if (jeabProfile.powerTrend.latestAt) {
      const ts = Math.floor(new Date(jeabProfile.powerTrend.latestAt).getTime() / 1000);
      trendValue += ` — <t:${ts}:R>`;
    }
    fields.push({ name: 'Power trend | Tendencia power', value: trendValue, inline: false });
  }

  const heroesText = formatHeroesSummary(jeabProfile?.heroesSummary);
  if (heroesText) {
    fields.push({ name: 'Heroes | Héroes', value: heroesText, inline: false });
  }

  const codesText = formatRecentCodes(jeabProfile?.recentCodes);
  if (codesText) {
    fields.push({ name: 'Recent codes | Códigos recientes', value: codesText, inline: false });
  }

  embed.addFields(fields);

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  const sources = [];
  if (jeabProfile) sources.push('jeab.dev');
  if (gameProfile) sources.push('game API');

  let footer = `Sources: ${sources.join(' + ') || 'game API'}`;
  if (!jeabProfile && jeabStatus === 'NO_TOKEN') {
    footer += ' | JEABS stats need token — admin: /setjeabtoken';
  } else if (!jeabProfile && jeabStatus === 'AUTH_EXPIRED') {
    footer += ' | JEABS token expired — admin: /setjeabtoken';
  }

  footer += ` | Profile: kingshot.jeab.dev/player/${playerId}`;
  embed.setFooter({ text: footer });

  return embed;
}

module.exports = { buildGetInfoEmbed };
