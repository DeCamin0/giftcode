const { query } = require('./pool');

// --- Players ---

async function registerPlayer(discordId, discordName, playerId, profile = null, meta = {}) {
  const existing = await getPlayerByDiscordId(discordId);
  if (existing) {
    throw new Error('ALREADY_REGISTERED');
  }

  const taken = await getPlayerByPlayerId(playerId);
  if (taken) {
    throw new Error('PLAYER_ID_TAKEN');
  }

  const registrationType = meta.registrationType || 'self';
  const addedByDiscordId = meta.addedByDiscordId || null;

  await query(
    `INSERT INTO players (
       discord_id, discord_name, player_id,
       game_nickname, game_avatar, kingdom_id, town_level, game_profile_json,
       registration_type, added_by_discord_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      discordId,
      discordName,
      playerId,
      profile?.nickname ?? null,
      profile?.avatar ? String(profile.avatar) : null,
      profile?.kingdomId ? String(profile.kingdomId) : null,
      profile?.townLevel ?? null,
      profile?.raw ? JSON.stringify(profile.raw) : null,
      registrationType,
      addedByDiscordId,
    ]
  );
}

async function getPlayerByDiscordId(discordId) {
  const rows = await query(
    'SELECT * FROM players WHERE discord_id = ? LIMIT 1',
    [discordId]
  );
  return rows[0] || null;
}

async function getPlayerByPlayerId(playerId) {
  const rows = await query(
    'SELECT * FROM players WHERE player_id = ? LIMIT 1',
    [playerId]
  );
  return rows[0] || null;
}

async function removePlayer(discordId) {
  const result = await query('DELETE FROM players WHERE discord_id = ?', [discordId]);
  return result.affectedRows > 0;
}

async function removePlayerByPlayerId(playerId) {
  const result = await query('DELETE FROM players WHERE player_id = ?', [playerId]);
  return result.affectedRows > 0;
}

function manualDiscordId(playerId) {
  return `manual:${playerId}`;
}

async function getAllPlayers() {
  return query('SELECT * FROM players ORDER BY registered_at ASC');
}

// --- Gift codes ---

async function giftCodeExists(code) {
  const rows = await query(
    'SELECT code FROM gift_codes WHERE code = ? LIMIT 1',
    [code]
  );
  return rows.length > 0;
}

async function upsertGiftCode({ code, expiresAt, sourceId }) {
  await query(
    `INSERT INTO gift_codes (code, expires_at, source_id)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       expires_at = VALUES(expires_at),
       source_id = VALUES(source_id)`,
    [code, expiresAt, sourceId]
  );
}

async function getUnnotifiedCodes() {
  return query(
    `SELECT * FROM gift_codes
     WHERE notified = 0
     ORDER BY first_seen ASC`
  );
}

async function markCodeAnnounced(code) {
  await query(
    `UPDATE gift_codes
     SET notified = 1,
         announced_at = COALESCE(announced_at, NOW())
     WHERE code = ?`,
    [code]
  );
}

async function markCodeNotified(code) {
  return markCodeAnnounced(code);
}

async function getRecentGiftCodes(limit = 10) {
  return query(
    `SELECT code, first_seen AS first_seen_at, announced_at, expires_at, notified
     FROM gift_codes
     ORDER BY first_seen DESC
     LIMIT ?`,
    [limit]
  );
}

async function getLastDetectedGiftCode() {
  const rows = await query(
    `SELECT code, first_seen AS first_seen_at, announced_at
     FROM gift_codes
     ORDER BY first_seen DESC
     LIMIT 1`
  );
  return rows[0] || null;
}

async function getActiveGiftCodesFromDb() {
  return query(
    `SELECT * FROM gift_codes
     WHERE expires_at IS NULL OR expires_at > NOW()
     ORDER BY first_seen DESC`
  );
}

// --- Redeem results ---

async function getRedeemResult(playerId, giftCode) {
  const rows = await query(
    `SELECT * FROM redeem_results
     WHERE player_id = ? AND gift_code = ?
     LIMIT 1`,
    [playerId, giftCode]
  );
  return rows[0] || null;
}

async function saveRedeemResult({ playerId, discordId, giftCode, status, message }) {
  await query(
    `INSERT INTO redeem_results (player_id, discord_id, gift_code, status, message, response)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       message = VALUES(message),
       response = VALUES(response),
       redeemed_at = CURRENT_TIMESTAMP`,
    [playerId, discordId, giftCode, status, message, message]
  );
}

async function getRedeemStatsForCode(giftCode) {
  return query(
    `SELECT status, COUNT(*) AS count
     FROM redeem_results
     WHERE gift_code = ?
     GROUP BY status`,
    [giftCode]
  );
}

// --- Bot admins ---

async function addBotAdmin({ discordUserId, discordUsername, addedByDiscordId }) {
  await query(
    `INSERT INTO bot_admins (discord_user_id, discord_username, added_by_discord_id)
     VALUES (?, ?, ?)`,
    [discordUserId, discordUsername, addedByDiscordId]
  );
}

async function removeBotAdmin(discordUserId) {
  const result = await query('DELETE FROM bot_admins WHERE discord_user_id = ?', [
    discordUserId,
  ]);
  return result.affectedRows > 0;
}

async function getBotAdminByDiscordId(discordUserId) {
  const rows = await query(
    'SELECT * FROM bot_admins WHERE discord_user_id = ? LIMIT 1',
    [discordUserId]
  );
  return rows[0] || null;
}

async function listBotAdmins() {
  return query('SELECT * FROM bot_admins ORDER BY added_at ASC');
}

async function isBotAdminInDb(discordUserId) {
  const row = await getBotAdminByDiscordId(discordUserId);
  return Boolean(row);
}

module.exports = {
  registerPlayer,
  getPlayerByDiscordId,
  getPlayerByPlayerId,
  removePlayer,
  removePlayerByPlayerId,
  manualDiscordId,
  getAllPlayers,
  giftCodeExists,
  upsertGiftCode,
  getUnnotifiedCodes,
  markCodeNotified,
  markCodeAnnounced,
  getRecentGiftCodes,
  getLastDetectedGiftCode,
  getActiveGiftCodesFromDb,
  getRedeemResult,
  saveRedeemResult,
  getRedeemStatsForCode,
  addBotAdmin,
  removeBotAdmin,
  getBotAdminByDiscordId,
  listBotAdmins,
  isBotAdminInDb,
};
