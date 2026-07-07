/**
 * Parsează profilul jucătorului din răspunsul API Century Games.
 * Câmpurile pot varia — salvăm și JSON brut pentru debugging.
 */
function parsePlayerProfile(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const townLevelRaw =
    data.stove_lv ??
    data.stove_lvl ??
    data.stove_level ??
    data.level ??
    data.town_level ??
    null;

  const avatarUrl =
    data.avatar_image ??
    data.avatar_url ??
    data.head_url ??
    data.head ??
    data.head_img ??
    data.avatar ??
    null;

  return {
    nickname:
      data.nickname ?? data.nick ?? data.name ?? data.role_name ?? data.username ?? null,
    avatar: avatarUrl ? String(avatarUrl) : null,
    kingdomId: data.kid ?? data.kingdom_id ?? data.kingdom ?? data.server_id ?? null,
    townLevel:
      townLevelRaw !== null && townLevelRaw !== undefined
        ? Number.parseInt(String(townLevelRaw), 10)
        : null,
    raw: data,
  };
}

module.exports = { parsePlayerProfile };
