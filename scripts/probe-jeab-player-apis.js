(async () => {
  const js = await (await fetch('https://kingshot.jeab.dev/assets/index-a546da82.js')).text();
  const apis = [...js.matchAll(/["'](\/api\/[^"']+)["']/g)].map((m) => m[1]);
  const unique = [...new Set(apis)].sort();
  const keywords = /player|hero|gear|equip|stand|history|mystic|kvk|coliseum|redeem|code/i;
  unique.filter((p) => keywords.test(p)).forEach((p) => console.log(p));
})().catch(console.error);
