require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variabila de mediu lipsă: ${name}`);
  }
  return value;
}

function optionalInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Variabila ${name} trebuie să fie un număr întreg`);
  }
  return parsed;
}

// Siguranță: botul lucrează DOAR în această bază — nu atinge beautyflow sau altele
const ALLOWED_DATABASE = 'kingshot_alliance';
const dbName = required('DB_NAME');
if (dbName !== ALLOWED_DATABASE) {
  throw new Error(
    `Siguranță DB: DB_NAME trebuie să fie "${ALLOWED_DATABASE}". ` +
      `Ai setat "${dbName}" — botul refuză să pornească ca să nu atingă alte baze.`
  );
}

const config = {
  discord: {
    token: required('DISCORD_TOKEN'),
    clientId: required('DISCORD_CLIENT_ID'),
    guildId: process.env.DISCORD_GUILD_ID || null,
    giftCodesChannelId: required('GIFT_CODES_CHANNEL_ID'),
    adminRoleIds: (process.env.ADMIN_ROLE_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
    ownerUserIds: (process.env.OWNER_USER_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
    autoRegisterEnabled: process.env.AUTO_REGISTER_ENABLED === 'true',
    registerChannelId: process.env.REGISTER_CHANNEL_ID || null,
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: optionalInt('DB_PORT', 3306),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: dbName,
  },
  giftCodeCheckIntervalMinutes: optionalInt('GIFT_CODE_CHECK_INTERVAL_MINUTES', 10),
  scheduler: {
    enabled: process.env.CHECK_CODES_ENABLED !== 'false',
    cron: process.env.CHECK_CODES_CRON || '0 */2 * * *',
  },
  redeem: {
    enabled: process.env.ENABLE_AUTO_REDEEM === 'true',
    minDelaySeconds: optionalInt('REDEEM_MIN_DELAY_SECONDS', 3),
    maxDelaySeconds: optionalInt('REDEEM_MAX_DELAY_SECONDS', 8),
  },
  kingshot: {
    giftCodesApiUrl: 'https://kingshot.net/api/gift-codes',
    jeabGiftCodesApiUrl: 'https://kingshot.jeab.dev/api/codes',
    jeabGiftCodesEnabled: process.env.JEAB_GIFT_CODES_ENABLED !== 'false',
    jeabApiBase: 'https://kingshot.jeab.dev/api',
    jeabProfileBaseUrl: 'https://kingshot.jeab.dev/player',
    jeabApiToken: process.env.JEABS_API_TOKEN || null,
    // API reverse-engineered — poate să se schimbe fără notificare
    redeemApiBase: 'https://kingshot-giftcode.centurygame.com/api',
    redeemSalt: process.env.KINGSHOT_REDEEM_SALT || 'mN4!pQs6JrYwV9',
  },
};

module.exports = config;
