(async () => {
  const js = await (await fetch('https://kingshot.jeab.dev/assets/index-a546da82.js')).text();
  const snippets = [];
  let pos = 0;
  while (pos < js.length) {
    const i = js.indexOf('X-Session', pos);
    if (i < 0) break;
    snippets.push(js.slice(i, i + 120));
    pos = i + 10;
    if (snippets.length > 15) break;
  }
  snippets.forEach((s) => console.log(s));

  const authHeaders = [...js.matchAll(/X-[A-Za-z-]+/g)].map((m) => m[0]);
  console.log('\nunique X- headers:', [...new Set(authHeaders)].sort());
})();
