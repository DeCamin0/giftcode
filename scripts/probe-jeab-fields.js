(async () => {
  const js = await (await fetch('https://kingshot.jeab.dev/assets/index-a546da82.js')).text();
  const keys = [
    'mystic',
    'avatar_url',
    'kingdom_id',
    'alliance',
    'power',
    'battle_mmr',
    'prep_mmr',
    'stove',
    'nickname',
    'kid',
  ];
  for (const k of keys) {
    const count = (js.match(new RegExp(k, 'g')) || []).length;
    if (count > 0) console.log(k, count);
  }
})();
