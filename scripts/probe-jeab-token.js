(async () => {
  const js = await (await fetch('https://kingshot.jeab.dev/assets/index-a546da82.js')).text();
  const idx = js.indexOf('X-API-Token');
  console.log(js.slice(idx - 200, idx + 400));
  const idx2 = js.indexOf('api/session');
  console.log('\n--- session ---\n', js.slice(idx2 - 100, idx2 + 500));
})();
