/**
 * Afișează răspunsul complet API pentru un Player ID.
 * Rulează: node scripts/probe-player.js 12345678
 */
require('dotenv').config();
const { lookupPlayer } = require('../src/services/kingshotRedeem');
const { parsePlayerProfile } = require('../src/services/kingshotPlayer');

const playerId = process.argv[2];

if (!playerId) {
  console.error('Usage: node scripts/probe-player.js <player_id>');
  process.exit(1);
}

(async () => {
  const result = await lookupPlayer(playerId);
  console.log('=== RAW API RESPONSE ===');
  console.log(JSON.stringify(result, null, 2));

  if (result.ok && result.data) {
    const profile = parsePlayerProfile(result.data);
    console.log('\n=== PARSED PROFILE ===');
    console.log(JSON.stringify(profile, null, 2));
  }
})().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
