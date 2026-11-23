// 공포의 지도: 몬스터를 잡다 보면 가끔 얻는 소모품(재료 탭 보관). 큐브에서 펼치면 그 판 하나에 위험 접사 2개 + 보상 접사 2개가 붙는다(save.remodMap)
(() => {
  const MAP = 'Terror Map';
  // [id, 글, 최소, 최대]
  const DANGER = [['life', '몬스터 체력 +#%', 40, 100], ['damage', '몬스터 공격 +#%', 30, 80], ['resist', '몬스터가 받는 피해 -#%', 10, 30], ['speed', '몬스터 이동 속도 +#%', 10, 30]];
  const REWARD = [['xp', '경험치 +#%', 30, 80], ['mf', '매직 아이템 발견 +#', 50, 150], ['gold', '골드 +#%', 50, 150]];
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (l, n) => [...l].sort(() => Math.random() - 0.5).slice(0, n);
  const save = () => globalThis.__gm?.save;
  globalThis.__mapText = (m) => m.map(([id, v]) => [...DANGER, ...REWARD].find((x) => x[0] === id)[1].replace('#', v));
  // 지도 펼치기: 1개 써서 지금(또는 다음) 판에 접사를 건다
  globalThis.__mapOpen = () => {
    const s = save();
    if (!s || !(s.remodMats?.[MAP] > 0) || s.remodMap) return null;
    s.remodMats[MAP]--; if (!s.remodMats[MAP]) delete s.remodMats[MAP];
    s.remodMap = { mods: [...pick(DANGER, 2), ...pick(REWARD, 2)].map(([id, , a, b]) => [id, R(a, b)]) };
    globalThis.__saveNow?.();
    return s.remodMap;
  };
  const val = (id) => save()?.remodMap?.mods.find((m) => m[0] === id)?.[1] ?? 0;
  // 몬스터가 생길 때(remod-party.js 의 __mpBuff 앞에서 불림)
  globalThis.__mapBuff = (e) => {
    if (!save()?.remodMap || !bound || e.rank === 'breakable' || e.__map) return;
    e.__map = true;
    const p = (id) => 1 + val(id) / 100;
    e.maxLife *= p('life'); e.life *= p('life'); e.damage *= p('damage'); e.resist *= 1 - val('resist') / 100; e.xp *= p('xp');
    if (e.speed) e.speed *= p('speed');
  };
  // 판 묶기: 지도를 펼친 뒤 처음 들어간 판에만 걸리고, 그 판이 끝나면 사라진다. 플레이어 MF·골드도 그동안만 더함
  let bound = null, boosted = null, last = null;
  setInterval(() => {
    const g = globalThis.__gm, w = g?.world, s = save();
    if (!s) return;
    const inRun = w && g.state === 'playing' && !w.farm;
    if (s.remodMap && inRun && !bound) { bound = w; g.hud?.banner?.(`공포의 지도: ${globalThis.__mapText(s.remodMap.mods).join(' · ')}`, 'unique'); }
    if (bound && w !== bound) { bound = null; delete s.remodMap; globalThis.__saveNow?.(); }
    const p = bound ? w.player : null;
    if (boosted && boosted.p !== p) { boosted.p.magicFind -= boosted.mf; boosted.p.goldGain -= boosted.gold; boosted = null; }
    if (p && !boosted) { boosted = { p, mf: val('mf'), gold: val('gold') }; p.magicFind += boosted.mf; p.goldGain += boosted.gold; }
    // 지도 얻기: 판 안에서 몬스터 1,500마리에 1장꼴
    if (!inRun) { last = null; return; }
    if (last?.w !== w) { last = { w, k: w.kills }; return; }
    const dk = w.kills - last.k; last.k = w.kills;
    if (dk > 0 && Math.random() < 1 - (1 - 1 / 1500) ** dk) {
      s.remodMats = { ...s.remodMats, [MAP]: (s.remodMats?.[MAP] ?? 0) + 1 };
      g.hud?.banner?.('공포의 지도를 얻었습니다 (재료 탭)', 'unique');
    }
  }, 1000);
})();
