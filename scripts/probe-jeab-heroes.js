(async () => {
  const js = await (await fetch('https://kingshot.jeab.dev/assets/index-a546da82.js')).text();
  const re = /\/api\/players[^"'`\s]*/g;
  const paths = [...new Set([...js.matchAll(re)].map((m) => m[0]))].sort();
  paths.forEach((p) => console.log(p));

  for (const needle of ['hero', 'equipment', 'gear', 'redeem', 'crown']) {
    const idx = js.indexOf(needle);
    if (idx >= 0) {
      console.log('\n---', needle, '---');
      console.log(js.slice(idx - 100, idx + 200));
    }
  }
})().catch(console.error);
