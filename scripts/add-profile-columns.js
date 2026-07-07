/**
 * Adaugă coloane profil joc în players (doar kingshot_alliance).
 * Rulează: node scripts/add-profile-columns.js
 */
require('dotenv').config();
const mariadb = require('mariadb');

const ALLOWED_DB = 'kingshot_alliance';

const alters = [
  'ALTER TABLE players ADD COLUMN IF NOT EXISTS game_nickname VARCHAR(128) NULL',
  'ALTER TABLE players ADD COLUMN IF NOT EXISTS game_avatar VARCHAR(512) NULL',
  'ALTER TABLE players ADD COLUMN IF NOT EXISTS kingdom_id VARCHAR(32) NULL',
  'ALTER TABLE players ADD COLUMN IF NOT EXISTS town_level INT UNSIGNED NULL',
  'ALTER TABLE players ADD COLUMN IF NOT EXISTS game_profile_json JSON NULL',
];

async function main() {
  if (process.env.DB_NAME !== ALLOWED_DB) {
    console.error(`STOP: DB_NAME trebuie să fie "${ALLOWED_DB}"`);
    process.exit(1);
  }

  const conn = await mariadb.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: ALLOWED_DB,
    connectTimeout: 30000,
  });

  for (const sql of alters) {
    await conn.query(sql);
    console.log('OK:', sql.slice(0, 70));
  }

  console.log('Coloane profil:', await conn.query('SHOW COLUMNS FROM players'));
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
