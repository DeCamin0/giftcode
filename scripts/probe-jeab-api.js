(async () => {
  const html = await (await fetch('https://kingshot.jeab.dev/')).text();
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);

  console.log('scripts:', scripts);

  for (const s of scripts.slice(0, 5)) {
    const url = s.startsWith('http') ? s : `https://kingshot.jeab.dev${s}`;
    const js = await (await fetch(url)).text();
    const apis = [...js.matchAll(/["'](\/api\/[^"']+)["']/g)].map((m) => m[1]);
    const unique = [...new Set(apis)];
    console.log(`\n${url} — ${unique.length} api paths`);
    unique.slice(0, 50).forEach((p) => console.log(' ', p));
  }
})().catch(console.error);
