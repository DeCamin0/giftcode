/**
 * Creează tabelele DOAR în baza kingshot_alliance.
 * Rulează: node scripts/setup-tables.js
 */
require('dotenv').config();
const mariadb = require('mariadb');

const ALLOWED_DB = 'kingshot_alliance';

if (process.env.DB_NAME !== ALLOWED_DB) {
  console.error(`STOP: DB_NAME trebuie să fie "${ALLOWED_DB}"`);
  process.exit(1);
}

const tables = {
  players: `
    CREATE TABLE IF NOT EXISTS players (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      discord_id VARCHAR(32) NOT NULL,
      discord_name VARCHAR(128) NOT NULL,
      player_id VARCHAR(32) NOT NULL,
      registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_discord_id (discord_id),
      UNIQUE KEY uq_player_id (player_id)
    ) ENGINE=InnoDB
  `,
  gift_codes: `
    CREATE TABLE IF NOT EXISTS gift_codes (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(64) NOT NULL,
      expires_at DATETIME NULL,
      source_id INT UNSIGNED NULL,
      first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notified TINYINT(1) NOT NULL DEFAULT 0,
      announced_at DATETIME NULL,
      UNIQUE KEY uq_code (code)
    ) ENGINE=InnoDB
  `,
  redeem_results: `
    CREATE TABLE IF NOT EXISTS redeem_results (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      player_id VARCHAR(32) NOT NULL,
      discord_id VARCHAR(32) NULL,
      gift_code VARCHAR(64) NOT NULL,
      status ENUM('success', 'already_claimed', 'failed', 'skipped') NOT NULL,
      message VARCHAR(512) NULL,
      response VARCHAR(512) NULL,
      redeemed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_player_code (player_id, gift_code),
      KEY idx_gift_code (gift_code)
    ) ENGINE=InnoDB
  `,
  bot_admins: `
    CREATE TABLE IF NOT EXISTS bot_admins (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      discord_user_id VARCHAR(32) NOT NULL,
      discord_username VARCHAR(128) NOT NULL,
      added_by_discord_id VARCHAR(32) NOT NULL,
      added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_bot_admin_discord_user_id (discord_user_id)
    ) ENGINE=InnoDB
  `,
};

async function main() {
  const conn = await mariadb.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: ALLOWED_DB,
    connectTimeout: 30000,
  });

  console.log(`Conectat la baza: ${ALLOWED_DB}`);

  for (const [name, sql] of Object.entries(tables)) {
    await conn.query(sql);
    console.log(`✓ Tabel creat/verificat: ${name}`);
  }

  const result = await conn.query('SHOW TABLES');
  console.log('Tabele în kingshot_alliance:', result);
  await conn.end();
}

main().catch((err) => {
  console.error('Eroare:', err.message);
  process.exit(1);
});
