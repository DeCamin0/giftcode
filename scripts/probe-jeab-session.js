(async () => {
  const fid = process.argv[2] || '265681775';
  const sessionId = `bot-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Try session bootstrap
  for (const method of ['GET', 'POST']) {
    try {
      const r = await fetch('https://kingshot.jeab.dev/api/session', {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId,
          'User-Agent': 'KingshotAllianceBot/1.0',
        },
        body: method === 'POST' ? JSON.stringify({ session_id: sessionId }) : undefined,
      });
      const t = await r.text();
      console.log(`session ${method}`, r.status, t.slice(0, 300));
    } catch (e) {
      console.log('session err', e.message);
    }
  }

  const headers = {
    Accept: 'application/json',
    'X-Session-Id': sessionId,
    Cookie: `ks_session_id=${sessionId}`,
    'User-Agent': 'KingshotAllianceBot/1.0',
  };

  const urls = [
    `https://kingshot.jeab.dev/api/players/${fid}`,
    `https://kingshot.jeab.dev/api/players/search?q=${fid}&limit=5`,
  ];

  for (const url of urls) {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    console.log('\n', url, r.status);
    console.log(t.slice(0, 800));
  }
})().catch(console.error);
