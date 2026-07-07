/**
 * ============================================================================
 * MODUL REDEEM — OPȚIONAL / EXPERIMENTAL
 * ============================================================================
 *
 * Acest modul folosește un API reverse-engineered de comunitate:
 *   https://kingshot-giftcode.centurygame.com/api
 *
 * NU este documentat oficial de Century Games.
 * Salt-ul MD5 și endpoint-urile pot să se schimbe oricând.
 * Publisher-ul a cerut oprirea bulk redeem pe kingshot.net — folosește cu grijă.
 *
 * Recomandare: testează întâi cu /redeem pe contul tău înainte de /redeemall.
 * ============================================================================
 */

const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { redeemErrorMessage, messages } = require('../utils/messages');

function buildSign(parts, salt) {
  const base = parts.map(([key, value]) => `${key}=${value}`).join('&');
  return crypto.createHash('md5').update(`${base}${salt}`).digest('hex');
}

async function postForm(url, data) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    body.append(key, String(value));
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'KingshotAllianceBot/1.0',
    },
    body,
    signal: AbortSignal.timeout(30000),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Răspuns non-JSON de la redeem API: ${text.slice(0, 200)}`);
  }

  return json;
}

/**
 * Verifică dacă un Player ID există în joc.
 */
async function lookupPlayer(playerId) {
  const time = Date.now();
  const sign = buildSign(
    [
      ['fid', playerId],
      ['time', time],
    ],
    config.kingshot.redeemSalt
  );

  const url = `${config.kingshot.redeemApiBase}/player`;
  const result = await postForm(url, { fid: playerId, time, sign });

  logger.debug('Lookup player', { playerId, result });

  if (result.msg === 'success' || result.code === 0) {
    const { parsePlayerProfile } = require('./kingshotPlayer');
    const profile = parsePlayerProfile(result.data);
    return { ok: true, data: result.data || result, profile };
  }

  return {
    ok: false,
    errCode: result.err_code,
    message: redeemErrorMessage(result.err_code, result.msg),
  };
}

/**
 * Încearcă redeem pentru un singur jucător.
 * Returnează status normalizat pentru salvare în DB.
 */
async function redeemCodeForPlayer(playerId, giftCode) {
  if (!config.redeem.enabled) {
    return {
      status: 'skipped',
      message: messages.kingshotRedeem.disabled,
    };
  }

  const time = Date.now();
  const salt = config.kingshot.redeemSalt;

  // Pas 1: login player (necesar înainte de redeem)
  const loginSign = buildSign(
    [
      ['fid', playerId],
      ['time', time],
    ],
    salt
  );

  const loginUrl = `${config.kingshot.redeemApiBase}/player`;
  const loginResult = await postForm(loginUrl, {
    fid: playerId,
    time,
    sign: loginSign,
  });

  if (loginResult.msg !== 'success' && loginResult.code !== 0) {
    return {
      status: 'failed',
      message: redeemErrorMessage(loginResult.err_code, messages.kingshotRedeem.loginFailed),
      errCode: loginResult.err_code,
    };
  }

  // Pauză scurtă între login și redeem
  await new Promise((resolve) => setTimeout(resolve, 800));

  const redeemTime = Date.now();
  const redeemSign = buildSign(
    [
      ['cdk', giftCode],
      ['fid', playerId],
      ['time', redeemTime],
    ],
    salt
  );

  const redeemUrl = `${config.kingshot.redeemApiBase}/gift_code`;
  const redeemResult = await postForm(redeemUrl, {
    fid: playerId,
    cdk: giftCode,
    time: redeemTime,
    sign: redeemSign,
  });

  logger.debug('Redeem result', { playerId, giftCode, redeemResult });

  const errCode = redeemResult.err_code;

  if (errCode === 20000 || redeemResult.code === 0) {
    return { status: 'success', message: messages.kingshotRedeem.success };
  }

  if (errCode === 40008 || errCode === 40011) {
    return { status: 'already_claimed', message: redeemErrorMessage(errCode) };
  }

  if (errCode === 40005) {
    return { status: 'code_unavailable', message: redeemErrorMessage(40005), errCode };
  }

  if (errCode === 40014) {
    return { status: 'failed', message: messages.kingshotRedeem.invalidCode, errCode };
  }

  if (errCode === 40007) {
    return { status: 'failed', message: messages.kingshotRedeem.expiredCode, errCode };
  }

  return {
    status: 'failed',
    message: redeemErrorMessage(errCode, redeemResult.msg),
    errCode,
  };
}

module.exports = {
  lookupPlayer,
  redeemCodeForPlayer,
};
