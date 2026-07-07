const { query } = require('./pool');
const logger = require('../utils/logger');

const BOT_ADMINS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS bot_admins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    discord_user_id VARCHAR(32) NOT NULL,
    discord_username VARCHAR(128) NOT NULL,
    added_by_discord_id VARCHAR(32) NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bot_admin_discord_user_id (discord_user_id)
  ) ENGINE=InnoDB
`;

const PLAYER_ADMIN_COLUMNS = [
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS registration_type ENUM('self','admin') NOT NULL DEFAULT 'self'`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS added_by_discord_id VARCHAR(32) NULL`,
];

const GIFT_CODE_SCHEDULER_COLUMNS = [
  `ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS announced_at DATETIME NULL`,
  `ALTER TABLE redeem_results ADD COLUMN IF NOT EXISTS response VARCHAR(512) NULL`,
];

async function ensureBotAdminsTable() {
  await query(BOT_ADMINS_TABLE_SQL);
  logger.info('Tabel bot_admins verificat');
}

async function ensurePlayerAdminColumns() {
  for (const sql of PLAYER_ADMIN_COLUMNS) {
    await query(sql);
  }
  logger.info('Coloane players (registration_type) verificate');
}

async function ensureGiftCodeSchedulerColumns() {
  for (const sql of GIFT_CODE_SCHEDULER_COLUMNS) {
    await query(sql);
  }
  logger.info('Coloane scheduler gift_codes/redeem_results verificate');
}

async function ensureSchema() {
  await ensureBotAdminsTable();
  await ensurePlayerAdminColumns();
  await ensureGiftCodeSchedulerColumns();
}

module.exports = {
  ensureBotAdminsTable,
  ensurePlayerAdminColumns,
  ensureSchema,
  BOT_ADMINS_TABLE_SQL,
};
