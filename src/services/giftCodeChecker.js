const config = require('../config');
const db = require('../db/queries');
const logger = require('../utils/logger');
const { messages } = require('../utils/messages');

const lastFetchByHost = new Map();
const MIN_INTERVAL_MS = 5000;

/**
 * Rate limit simplu per host — minimum 5 secunde între requesturi.
 */
async function rateLimitedFetch(url, options = {}) {
  const host = new URL(url).host;
  const now = Date.now();
  const last = lastFetchByHost.get(host) || 0;
  const wait = MIN_INTERVAL_MS - (now - last);

  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  lastFetchByHost.set(host, Date.now());

  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': 'KingshotAllianceBot/1.0',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} at ${url}`);
  }

  return response.json();
}

function parseExpiresAt(raw) {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCodeActive(codeEntry) {
  if (!codeEntry.expiresAt) return true;
  return codeEntry.expiresAt.getTime() > Date.now();
}

/**
 * kingshot.net — JSON cu expiry.
 */
async function fetchKingshotNetCodes() {
  const payload = await rateLimitedFetch(config.kingshot.giftCodesApiUrl);
  const codes = payload?.data?.giftCodes;

  if (!Array.isArray(codes)) {
    throw new Error('Invalid kingshot.net response — missing data.giftCodes');
  }

  return codes
    .map((entry) => ({
      code: entry.code?.trim(),
      expiresAt: parseExpiresAt(entry.expiresAt),
      sourceId: entry.id ?? null,
      source: 'kingshot.net',
    }))
    .filter((entry) => entry.code && isCodeActive(entry));
}

/**
 * jeab.dev — JSON public, fără auth. Filtrăm doar IsActive.
 */
async function fetchJeabCodes() {
  if (!config.kingshot.jeabGiftCodesEnabled) {
    return [];
  }

  const list = await rateLimitedFetch(config.kingshot.jeabGiftCodesApiUrl);

  if (!Array.isArray(list)) {
    throw new Error('Invalid jeab.dev response — expected JSON array');
  }

  return list
    .filter((entry) => entry.IsActive === true || entry.isActive === true)
    .map((entry) => ({
      code: (entry.Code || entry.code)?.trim(),
      expiresAt: parseExpiresAt(entry.ExpiresAt || entry.expiresAt),
      sourceId: null,
      source: 'jeab.dev',
    }))
    .filter((entry) => entry.code && isCodeActive(entry));
}

/**
 * Unește codurile din mai multe surse — fără duplicate (cheie = code exact, case-sensitive).
 * Preferă data de expirare de la kingshot.net când există.
 */
function mergeGiftCodeEntries(entries) {
  const map = new Map();

  for (const entry of entries) {
    const existing = map.get(entry.code);

    if (!existing) {
      map.set(entry.code, {
        code: entry.code,
        expiresAt: entry.expiresAt,
        sourceId: entry.sourceId,
        sources: [entry.source],
      });
      continue;
    }

    if (!existing.sources.includes(entry.source)) {
      existing.sources.push(entry.source);
    }

    if (entry.source === 'kingshot.net') {
      existing.expiresAt = entry.expiresAt ?? existing.expiresAt;
      existing.sourceId = entry.sourceId ?? existing.sourceId;
    } else if (!existing.expiresAt && entry.expiresAt) {
      existing.expiresAt = entry.expiresAt;
    }
  }

  return [...map.values()];
}

/**
 * Preia codurile de la toate sursele, deduplică și salvează în DB.
 */
async function fetchAndStoreGiftCodes() {
  logger.debug('Checking gift codes from all sources...');

  const [netResult, jeabResult] = await Promise.allSettled([
    fetchKingshotNetCodes(),
    fetchJeabCodes(),
  ]);

  const fromNet = netResult.status === 'fulfilled' ? netResult.value : [];
  const fromJeab = jeabResult.status === 'fulfilled' ? jeabResult.value : [];

  if (netResult.status === 'rejected') {
    logger.warn('kingshot.net fetch failed', { error: netResult.reason?.message });
  }
  if (jeabResult.status === 'rejected') {
    logger.warn('jeab.dev fetch failed', { error: jeabResult.reason?.message });
  }

  if (!fromNet.length && !fromJeab.length) {
    throw new Error('No gift codes from any source');
  }

  const merged = mergeGiftCodeEntries([...fromNet, ...fromJeab]);
  const newCodes = [];

  for (const entry of merged) {
    const isNew = !(await db.giftCodeExists(entry.code));

    await db.upsertGiftCode({
      code: entry.code,
      expiresAt: entry.expiresAt,
      sourceId: entry.sourceId,
    });

    if (isNew) {
      newCodes.push(entry);
      logger.info(`New gift code detected: ${entry.code}`, { sources: entry.sources });
    }
  }

  const unnotified = await db.getUnnotifiedCodes();
  logger.info('Gift code check complete', {
    kingshotNet: fromNet.length,
    jeabDev: fromJeab.length,
    mergedUnique: merged.length,
    unnotified: unnotified.length,
    new: newCodes.length,
    newCodes: newCodes.map((c) => c.code),
  });

  return { newCodes, unnotified };
}

/**
 * Postează codurile noi în canalul Discord configurat.
 */
async function notifyNewCodes(client) {
  const channel = await client.channels.fetch(config.discord.giftCodesChannelId);
  if (!channel?.isTextBased()) {
    throw new Error('GIFT_CODES_CHANNEL_ID is not a valid text channel');
  }

  const unnotified = await db.getUnnotifiedCodes();

  for (const row of unnotified) {
    const expiry = row.expires_at
      ? messages.giftCode.expires(Math.floor(new Date(row.expires_at).getTime() / 1000))
      : '';

    const content = messages.giftCode.newCode(row.code, expiry ? `\n⏰ ${expiry}` : '');

    await channel.send({ content });
    await db.markCodeAnnounced(row.code);
    logger.info(`Code announced on Discord: ${row.code}`);

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

async function notifyAutoRedeemSummary(client, summary) {
  if (!summary?.ok) return;

  try {
    const channel = await client.channels.fetch(config.discord.giftCodesChannelId);
    if (!channel?.isTextBased()) return;

    const content = messages.giftCode.autoRedeemSummary(
      summary.giftCode,
      summary.success,
      summary.already,
      summary.skipped,
      summary.failed
    );

    await channel.send({ content });
    logger.info('Auto-redeem summary posted', {
      giftCode: summary.giftCode,
      success: summary.success,
      failed: summary.failed,
    });
  } catch (error) {
    logger.error('Failed to post auto-redeem summary', { error: error.message });
  }
}

async function checkAndNotify(client) {
  try {
    await fetchAndStoreGiftCodes();
    await notifyNewCodes(client);
  } catch (error) {
    logger.error('Gift code check error', { error: error.message });
  }
}

function startGiftCodePoller(client) {
  const { startGiftCodeScheduler } = require('./giftCodeScheduler');
  startGiftCodeScheduler(client);
}

module.exports = {
  fetchAndStoreGiftCodes,
  fetchKingshotNetCodes,
  fetchJeabCodes,
  mergeGiftCodeEntries,
  notifyNewCodes,
  notifyAutoRedeemSummary,
  checkAndNotify,
  startGiftCodePoller,
  rateLimitedFetch,
};
