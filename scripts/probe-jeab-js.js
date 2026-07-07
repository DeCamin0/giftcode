const fs = require('fs');
const path = require('path');

(async () => {
  const js = await (await fetch('https://kingshot.jeab.dev/assets/index-a546da82.js')).text();
  const patterns = ['session', 'Session', 'player', 'fid', 'Authorization', 'token'];
  for (const p of patterns) {
    const idx = js.indexOf(p);
    if (idx >= 0) {
      console.log(`\n=== ${p} @ ${idx} ===`);
      console.log(js.slice(Math.max(0, idx - 80), idx + 200));
    }
  }

  const sessionCalls = [...js.matchAll(/\/api\/session[^"']*/g)].map((m) => m[0]);
  console.log('\nsession paths:', [...new Set(sessionCalls)]);

  const playerCalls = [...js.matchAll(/\/api\/players[^"']*/g)].map((m) => m[0]);
  console.log('\nplayer paths:', [...new Set(playerCalls)]);
})().catch(console.error);
