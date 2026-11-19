// 용병 아이템: 용병 계약서(등급 +1, 최대 10: 등급마다 체력 +8%·피해 +6%·받는 피해 -2%)와 훈련 교본(용병 모든 스킬 +1, 최대 3). 재료 탭 보관, 큐브에서 지금 용병에게 쓴다(save.remodMerc[직업][용병])
(() => {
  const CON = 'Mercenary Contract', MAN = 'Training Manual';
  const save = () => globalThis.__gm?.save;
  const who = () => { const s = save(), c = globalThis.__gm?.world?.player?.cls ?? s?.lastCls; const cls = c && s?.mercs?.[c] ? c : Object.keys(s?.mercs ?? {}).find((k) => s.mercs[k].active); return cls ? [cls, s.mercs[cls].active] : null; };
  globalThis.__mercInfo = () => { const w = who(); if (!w?.[1]) return null; const r = save().remodMerc?.[w[0]]?.[w[1]] ?? {}; return { cls: w[0], type: w[1], rank: r.rank ?? 0, skill: r.skill ?? 0 }; };
  // 아이템 1개를 지금 용병에게 쓴다. kind: 'rank' | 'skill'
  globalThis.__mercUse = (kind) => {
    const s = save(), i = globalThis.__mercInfo(), item = kind === 'rank' ? CON : MAN, max = kind === 'rank' ? 10 : 3;
    if (!i || !(s.remodMats?.[item] > 0) || i[kind] >= max) return null;
    s.remodMats[item]--; if (!s.remodMats[item]) delete s.remodMats[item];
    const r = (((s.remodMerc ??= {})[i.cls] ??= {})[i.type] ??= {});
    r[kind] = (r[kind] ?? 0) + 1;
    globalThis.__saveNow?.();
    return globalThis.__mercInfo();
  };
  // 던전의 용병 몸에 등급·교본을 얹는다. 게임이 능력치를 다시 계산하면(값이 바뀌면) 그 값을 바탕으로 다시 얹음
  setInterval(() => {
    const g = globalThis.__gm, p = g?.world?.merc?.player, i = globalThis.__mercInfo();
    if (!p || !i || (!i.rank && !i.skill)) return;
    // 값마다 따로 바탕값을 기억해 겹쳐 곱하지 않는다(게임이 다시 계산한 값만 새 바탕으로)
    const s = (p.__rm ??= { base: {}, put: {} }), r = p.maxLife ? p.life / p.maxLife : 1;
    const want = { maxLife: (v) => v * (1 + 0.08 * i.rank), weaponDamage: (v) => v * (1 + 0.06 * i.rank), damageTaken: (v) => v * (1 - 0.02 * i.rank), allSkills: (v) => v + i.skill };
    for (const [f, fn] of Object.entries(want)) {
      if (s.put[f] === undefined || p[f] !== s.put[f]) s.base[f] = p[f];
      p[f] = fn(s.base[f]);
      s.put[f] = p[f];
    }
    p.life = Math.min(p.maxLife, p.maxLife * r);
  }, 1000);
  // 얻기: 판 안에서 몬스터 4,000마리에 계약서 1장, 10,000마리에 교본 1권꼴
  let last = null;
  setInterval(() => {
    const g = globalThis.__gm, w = g?.world, s = save();
    if (!s || !w || g.state !== 'playing') { last = null; return; }
    if (last?.w !== w) { last = { w, k: w.kills }; return; }
    const dk = w.kills - last.k; last.k = w.kills;
    for (const [item, n, ko] of [[CON, 4000, '용병 계약서를'], [MAN, 10000, '훈련 교본을']]) if (dk > 0 && Math.random() < 1 - (1 - 1 / n) ** dk) {
      s.remodMats = { ...s.remodMats, [item]: (s.remodMats?.[item] ?? 0) + 1 };
      g.hud?.banner?.(`${ko} 얻었습니다 (재료 탭)`, 'unique');
    }
  }, 1000);
})();
