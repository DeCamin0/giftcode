const mariadb = require('mariadb');
const config = require('../config');
const logger = require('../utils/logger');

const pool = mariadb.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  connectionLimit: 5,
  charset: 'utf8mb4',
});

async function query(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    return await conn.query(sql, params);
  } catch (error) {
    logger.error('Eroare query MariaDB', { sql, error: error.message });
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

async function testConnection() {
  await query('SELECT 1 AS ok');
  logger.info('Conexiune MariaDB OK');
}

module.exports = { pool, query, testConnection };
