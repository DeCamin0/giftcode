const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const { rateLimitedFetch } = require('./giftCodeChecker');

const TOKEN_FILE = path.join(__dirname, '../../data/jeabs-token');
let runtimeToken = null;

function loadPersistedToken() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return;
    const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    if (token) runtimeToken = token;
  } catch (error) {
    logger.warn('Could not load JEABS token file', { error: error.message });
  }
}

function persistToken(token) {
  fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
  fs.writeFileSync(TOKEN_FILE, token.trim(), 'utf8');
}

function getConfiguredToken() {
  if (runtimeToken) return runtimeToken.trim();
  const token = config.kingshot.jeabApiToken;
  if (!token) return null;
  return token.trim();
}

function setJeabsApiToken(token) {
  const trimmed = token?.trim();
  if (!trimmed) {
    throw new Error('EMPTY_TOKEN');
  }
  runtimeToken = trimmed;
  persistToken(trimmed);
  return trimmed;
}

function clearJeabsApiToken() {
  runtimeToken = null;
  try {
    if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
  } catch (error) {
    logger.warn('Could not delete JEABS token file', { error: error.message });
  }
}

loadPersistedToken();

function statValue(stats, key) {
  if (!Array.isArray(stats)) return null;
  const row = stats.find((s) => s.key === key || s.type === key);
  if (!row) return null;
  return row.value ?? row.display ?? row.raw ?? null;
}

function resolveJeabAssetUrl(url) {
  if (!url) return null;
  const s = String(url);
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const base = config.kingshot.jeabApiBase.replace(/\/api$/, '');
  return s.startsWith('/') ? `${base}${s}` : `${base}/${s}`;
}

function formatAlliance(player) {
  const abbr = player.alliance_abbr;
  const name = player.alliance_name ?? player.alliance ?? player.alliance_tag;
  const rank = player.alliance_rank;
  if (!name && !abbr) return null;
  let label = abbr && name ? `[${abbr}] ${name}` : name || abbr;
  if (rank != null && rank !== '') label += ` (R${rank})`;
  return label;
}

function parseStandings(payload) {
  const list = payload?.standings ?? [];
  const priority = ['Personal Power', 'Kill Count', 'Mystic Trial', 'Coliseum'];
  return list
    .filter((row) => priority.includes(row.label))
    .map((row) => ({
      label: row.label,
      rank: row.rank,
      kingdomId: row.kid,
      score: row.score,
      globalRank: row.global_rank ?? null,
    }));
}

function parsePowerTrend(history) {
  if (!Array.isArray(history) || history.length < 2) return null;
  const latest = history[0];
  const previous = history[1];
  if (latest?.power == null || previous?.power == null) return null;
  return {
    delta: latest.power - previous.power,
    latestAt: latest.recorded_at ?? null,
    previousAt: previous.recorded_at ?? null,
  };
}

function parseLoadoutSummary(loadout) {
  const heroes = loadout?.heroes ?? [];
  if (!heroes.length) return null;

  let maxLevel = 0;
  let maxStars = 0;
  for (const hero of heroes) {
    if ((hero.lv ?? 0) > maxLevel) maxLevel = hero.lv;
    if ((hero.star ?? 0) > maxStars) maxStars = hero.star;
  }

  const stats = loadout?.stats ?? {};
  const totalKills = stats['8'] ?? stats[8] ?? null;

  return {
    count: heroes.length,
    maxLevel,
    maxStars,
    totalKills,
    fetchedAt: loadout?.fetched_at ?? null,
    stale: Boolean(loadout?.stale),
  };
}

function parseRedemptions(payload) {
  const list = payload?.redemptions ?? [];
  return list.slice(0, 5).map((row) => ({
    code: row.Code ?? row.code,
    status: String(row.Status ?? row.status ?? '')
      .replace(/\.$/, '')
      .trim(),
    redeemedAt: row.RedeemedAt ?? row.redeemed_at ?? null,
  }));
}

function applyStandingsToProfile(profile, standingsPayload) {
  const rankings = parseStandings(standingsPayload);
  profile.rankings = rankings;

  const killRow = rankings.find((row) => row.label === 'Kill Count');
  if (killRow?.score != null && profile.kills == null) {
    profile.kills = killRow.score;
  }
}

async function fetchJeabJson(relativePath, apiToken) {
  const url = `${config.kingshot.jeabApiBase}${relativePath}`;
  return rateLimitedFetch(url, {
    headers: {
      'X-API-Token': apiToken,
      Accept: 'application/json',
    },
  });
}

async function fetchJeabExtras(playerId, apiToken) {
  const base = `/players/${playerId}`;
  const [standings, history, loadout, redemptions] = await Promise.all([
    fetchJeabJson(`${base}/standings`, apiToken).catch(() => null),
    fetchJeabJson(`${base}/history?limit=5`, apiToken).catch(() => null),
    fetchJeabJson(`${base}/loadout?cached=1`, apiToken).catch(() => null),
    fetchJeabJson(`${base}/redemptions?limit=5`, apiToken).catch(() => null),
  ]);

  return { standings, history, loadout, redemptions };
}

function attachJeabExtras(profile, extras) {
  if (!profile || !extras) return profile;

  if (extras.standings) {
    applyStandingsToProfile(profile, extras.standings);
  }

  profile.powerTrend = parsePowerTrend(extras.history);
  profile.heroesSummary = parseLoadoutSummary(extras.loadout);
  profile.recentCodes = parseRedemptions(extras.redemptions);

  return profile;
}

/**
 * Normalize JEABS /api/players/{id} JSON.
 */
function parseJeabPlayer(payload) {
  const player = payload?.player ?? payload;
  if (!player || typeof player !== 'object') return null;

  const stats = player.stats ?? player.statistics ?? [];
  const avatarRaw = player.avatar_url ?? player.avatar ?? null;

  return {
    playerId: String(player.id ?? player.fid ?? player.player_id ?? ''),
    nickname: player.username ?? player.nickname ?? player.name ?? null,
    kingdomId: player.state ?? player.kingdom_id ?? player.kid ?? player.kingdom ?? null,
    alliance: formatAlliance(player),
    allianceAbbr: player.alliance_abbr ?? null,
    allianceName: player.alliance_name ?? null,
    allianceRank: player.alliance_rank ?? null,
    avatarUrl: resolveJeabAssetUrl(avatarRaw),
    power: player.power ?? statValue(stats, 'power'),
    kills: player.kills ?? statValue(stats, 'kills'),
    mystic: player.mystic_trial_score ?? player.mystic ?? statValue(stats, 'mystic'),
    mysticRank: player.mystic_trial_rank ?? null,
    townLevel:
      player.town_hall_level ??
      statValue(stats, 'towncenter') ??
      player.stove_lv ??
      player.town_level ??
      null,
    vip: player.vip ?? null,
    lifeTreeLevel: player.life_tree_level ?? null,
    battleMmr: player.battle_mmr ?? statValue(stats, 'battle_mmr'),
    prepMmr: player.prep_mmr ?? statValue(stats, 'prep_mmr'),
    lastRefreshed: player.last_refreshed_at ?? null,
    profileUrl: `${config.kingshot.jeabProfileBaseUrl}/${player.id ?? player.fid}`,
    raw: player,
  };
}

async function fetchJeabPlayer(playerId, token) {
  const apiToken = token || getConfiguredToken();
  if (!apiToken) {
    return { ok: false, code: 'NO_TOKEN', message: 'JEABS API token not configured' };
  }

  try {
    const [payload, extras] = await Promise.all([
      fetchJeabJson(`/players/${playerId}`, apiToken),
      fetchJeabExtras(playerId, apiToken),
    ]);

    const profile = attachJeabExtras(parseJeabPlayer(payload), extras);
    if (!profile?.playerId) {
      return { ok: false, code: 'PARSE_ERROR', message: 'Could not parse JEABS player response' };
    }

    return { ok: true, profile, source: 'jeab.dev' };
  } catch (error) {
    logger.warn('JEABS player fetch failed', { playerId, error: error.message });

    if (String(error.message).includes('401')) {
      return {
        ok: false,
        code: 'AUTH_EXPIRED',
        message: 'JEABS token expired — use /setjeabtoken or update JEABS_API_TOKEN',
      };
    }

    return { ok: false, code: 'FETCH_ERROR', message: error.message };
  }
}

module.exports = {
  parseJeabPlayer,
  fetchJeabPlayer,
  getConfiguredToken,
  setJeabsApiToken,
  clearJeabsApiToken,
};
