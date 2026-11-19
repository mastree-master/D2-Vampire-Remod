// 호라드릭 큐브 창: 재료 창고(save.remodMats)의 재료로 조합한다. 룬 3개→다음 룬, 손에 든 쥬얼 다시 굴리기
globalThis.__remodCube = () => {
  const save = globalThis.__gm?.save;
  if (!save) return;
  const KO = { 'Terror Map': '공포의 지도', 'Mercenary Contract': '용병 계약서', 'Training Manual': '훈련 교본' };
  const ko = (t) => KO[t] ?? String(globalThis.__ko?.(t) ?? t);
  const RUNES = ['El', 'Eld', 'Tir', 'Nef', 'Eth', 'Ith', 'Tal', 'Ral', 'Ort', 'Thul', 'Amn', 'Sol', 'Shael', 'Dol', 'Hel', 'Io', 'Lum', 'Ko', 'Fal', 'Lem', 'Pul', 'Um', 'Mal', 'Ist', 'Gul', 'Vex', 'Ohm', 'Lo', 'Sur', 'Ber', 'Jah', 'Cham', 'Zod'].map((r) => `${r} Rune`);
  const LARZUK = "Larzuk's Essence";
  const mats = () => (save.remodMats ??= {});
  const has = (b, n) => (mats()[b] ?? 0) >= n;
  const take = (b, n) => { mats()[b] -= n; if (mats()[b] <= 0) delete mats()[b]; };
  const give = (b, n) => { mats()[b] = (mats()[b] ?? 0) + n; };
  const done = (msg) => { globalThis.__saveNow?.(); note.textContent = msg; draw(); };

  document.getElementById('__cube')?.remove();
  const box = document.createElement('div');
  box.id = '__cube';
  box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgb(0 0 0/.6);display:flex;align-items:center;justify-content:center;font:14px sans-serif;color:#c8b27a';
  const panel = document.createElement('div');
  panel.style.cssText = 'width:min(760px,92vw);max-height:86vh;overflow:auto;padding:18px 22px;background:radial-gradient(ellipse at top,#2a2418,#0c0a07 70%);border:3px ridge #8a6d3b;box-shadow:0 0 0 2px #000,0 0 40px #000';
  const note = document.createElement('div');
  note.style.cssText = 'min-height:20px;color:#fff;margin:6px 0';
  const body = document.createElement('div');
  const btn = (text, on, ok = true) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.disabled = !ok;
    b.style.cssText = `padding:3px 10px;font:13px sans-serif;cursor:${ok ? 'pointer' : 'default'};color:${ok ? '#e8d8a8' : '#666'};background:linear-gradient(#5a5650,#2c2a26);border:1px solid #8a6d3b`;
    b.onclick = (e) => { e.stopPropagation(); if (ok) on(); };
    return b;
  };
  const section = (title, help) => {
    const s = document.createElement('div');
    s.style.cssText = 'margin-top:12px;border:2px solid #5a4a2a;background:#0008;padding:8px 10px';
    s.innerHTML = `<div style="font:bold 16px Cinzel,serif;color:#d8b860">${title}</div><div style="color:#887;font-size:12px;margin-bottom:6px">${help}</div>`;
    body.append(s);
    return s;
  };
  const draw = () => {
    body.replaceChildren();
    // 1. 룬 올리기: 같은 룬 3개 → 다음 룬 1개
    const rs = section('룬 올리기', '같은 룬 3개를 다음 단계 룬 1개로 바꿉니다. 재료 창고에 있는 룬을 씁니다.');
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px';
    RUNES.slice(0, -1).forEach((r, i) => {
      const n = mats()[r] ?? 0;
      if (!n) return;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;align-items:center;justify-content:space-between;padding:2px 4px;color:#ddd';
      row.append(Object.assign(document.createElement('span'), { textContent: `${ko(r)} × ${n}` }),
        btn(`→ ${ko(RUNES[i + 1]).replace(/^\d+ /, '')}`, () => { take(r, 3); give(RUNES[i + 1], 1); done(`${ko(r)} 3개 → ${ko(RUNES[i + 1])} 1개`); }, n >= 3));
      grid.append(row);
    });
    if (!grid.children.length) grid.textContent = '재료 창고에 룬이 없습니다.';
    rs.append(grid);
    // 2. 쥬얼 다시 굴리기: 손에 든 매직·레어 쥬얼 + 라주크의 정수 1 → 같은 레벨 새 쥬얼
    const js = section('쥬얼 다시 굴리기', '창고에서 쥬얼을 손에 든 채로 누르세요. 라주크의 정수 1개를 써서 같은 아이템 레벨로 옵션을 새로 뽑습니다.');
    const held = save.cursor?.item;
    const okJewel = held?.type === 'jewel' && (held.rarity === 'magic' || held.rarity === 'rare');
    js.append(Object.assign(document.createElement('div'), { style: 'color:#ddd;margin-bottom:4px', textContent: okJewel ? `손에 든 쥬얼: ${ko(held.name)}` : '손에 든 매직·레어 쥬얼이 없습니다.' }),
      btn(`다시 굴리기 (라주크의 정수 ${mats()[LARZUK] ?? 0}개 있음)`, () => {
        const lvl = held.level || 80;
        const fresh = globalThis.__remodT?.jw?.(lvl, lvl, 0);
        if (!fresh) return done('다시 굴리지 못했습니다.');
        take(LARZUK, 1);
        save.cursor.item = fresh;
        done(`새 쥬얼: ${ko(fresh.name)}`);
      }, okJewel && has(LARZUK, 1)));
    // 2-1. 부적 다시 굴리기: 손에 든 매직 부적 + 라주크의 정수 1 → 같은 크기·레벨로 새 옵션
    const cs = section('부적 다시 굴리기', '손에 든 매직 부적(작은·큰·거대)을 라주크의 정수 1개로 다시 뽑습니다.');
    const okCharm = held?.type === 'charm' && held.rarity === 'magic';
    cs.append(Object.assign(document.createElement('div'), { style: 'color:#ddd;margin-bottom:4px', textContent: okCharm ? `손에 든 부적: ${ko(held.name)}` : '손에 든 매직 부적이 없습니다.' }),
      btn('다시 굴리기', () => {
        const lvl = held.level || 80;
        const fresh = globalThis.__remodT?.roll?.(held.base, 'magic', lvl, lvl, 0);
        if (!fresh) return done('다시 굴리지 못했습니다.');
        take(LARZUK, 1);
        save.cursor.item = fresh;
        done(`새 부적: ${ko(fresh.name)}`);
      }, okCharm && has(LARZUK, 1)));
    // 2-2. 골드로 재료 사기(남는 골드 쓰는 곳)
    const gs = section('골드 교환', `가진 골드: ${Math.floor(save.gold ?? 0).toLocaleString()}`);
    for (const [b, n, price] of [['Burning Essence of Terror', 1, 1e6], [LARZUK, 1, 5e6], ['Ist Rune', 1, 2e7], ['Ber Rune', 1, 2e8], ['Mercenary Contract', 1, 5e7], ['Training Manual', 1, 3e8]]) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin:3px 0;color:#ddd';
      row.append(Object.assign(document.createElement('span'), { style: 'flex:1', textContent: `${ko(b)} ${n}개  —  ${price.toLocaleString()} 골드` }),
        btn('사기', () => { save.gold -= price; give(b, n); done(`${ko(b)} ${n}개를 샀습니다 (재료 창고).`); }, (save.gold ?? 0) >= price));
      gs.append(row);
    }
    // 2-3. 공포의 지도(remod-map.js): 1장 펼치면 그 판에 위험 2 + 보상 2 접사
    const ms = section('공포의 지도', `가진 지도: ${mats()['Terror Map'] ?? 0}장. 펼치면 지금(또는 다음에 들어가는) 판 하나에 접사가 붙고, 판이 끝나면 사라집니다. 몬스터를 잡다 보면 가끔 나옵니다.`);
    if (save.remodMap) ms.append(Object.assign(document.createElement('div'), { style: 'color:#ffd27a', textContent: `펼친 지도: ${globalThis.__mapText(save.remodMap.mods).join(' · ')}` }));
    else ms.append(btn('지도 펼치기', () => { const m = globalThis.__mapOpen?.(); done(m ? `지도: ${globalThis.__mapText(m.mods).join(' · ')}` : '지도를 펼치지 못했습니다.'); }, has('Terror Map', 1)));
    // 2-4. 용병(remod-merc.js): 계약서 → 등급 +1(최대 10), 교본 → 모든 스킬 +1(최대 3). 지금 직업의 지금 용병에게
    const mi = globalThis.__mercInfo?.();
    const vs = section('용병', mi ? `지금 용병 등급 ${mi.rank} / 10 (체력 +${mi.rank * 8}% · 피해 +${mi.rank * 6}% · 받는 피해 -${mi.rank * 2}%), 교본 ${mi.skill} / 3 (모든 스킬 +${mi.skill})` : '고용한 용병이 없습니다.');
    vs.append(btn(`용병 계약서 쓰기 (${mats()['Mercenary Contract'] ?? 0}장)`, () => done(globalThis.__mercUse('rank') ? '용병 등급이 올랐습니다.' : '쓰지 못했습니다.'), !!mi && mi.rank < 10 && has('Mercenary Contract', 1)), ' ',
      btn(`훈련 교본 쓰기 (${mats()['Training Manual'] ?? 0}권)`, () => done(globalThis.__mercUse('skill') ? '용병 스킬이 올랐습니다.' : '쓰지 못했습니다.'), !!mi && mi.skill < 3 && has('Training Manual', 1)));
    // 2-5. 보스 탑(remod-tower.js): 공포 100 이상을 깬 사람만, 던전 안에서 시작
    const open = globalThis.__towerOpen?.(), best = save.remodTower ?? {};
    const ts = section('보스 탑 (버티기)', open ? '던전 안에서 고르면 바로 시작합니다. 몬스터가 시간이 갈수록 세지고, 90초 또는 1,000킬마다 봉인된 두루마리 3개 중 1개를 열어 이번 판 강화나 아이템을 받습니다. 죽으면 끝, 버틴 시간이 순위에 오릅니다.' : `공포 영역 100 이상을 깬 사람만 열립니다 (지금 최고 ${globalThis.__towerTier?.() ?? 0}).`);
    const tinRun = globalThis.__gm?.state === 'playing';
    for (const [kind, label] of globalThis.__towerList ?? []) {
      const b = best[kind], row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin:3px 0;color:#ddd';
      row.append(Object.assign(document.createElement('span'), { style: 'flex:1', textContent: `${label} 탑 — 내 최고 ${b ? `${Math.floor(b / 60000)}분 ${Math.floor((b % 60000) / 1000)}초` : '없음'}` }),
        btn('입장', () => { if (globalThis.__towerStart(kind)) box.remove(); else done('던전 안에서만 시작합니다.'); }, open && tinRun));
      ts.append(row);
    }
    const rk = document.createElement('div');
    rk.style.cssText = 'color:#aaa;font-size:12px;margin-top:6px';
    rk.textContent = '순위 불러오는 중...';
    ts.append(rk);
    globalThis.__towerRank?.().then((r) => { rk.textContent = r ? (globalThis.__towerList ?? []).map(([k, l]) => `${l}: ${(r[k] ?? []).slice(0, 3).map((x, i) => `${i + 1}. ${x.name} ${Math.floor(x.time / 60000)}분`).join(' ') || '기록 없음'}`).join('  |  ') : '순위를 못 불러왔습니다.'; });
    // 3. 보스 소환: 던전 안에서 룬 1개 + 불타는 공포의 정수로 보스를 내 옆에 부른다
    const BET = 'Burning Essence of Terror';
    const ss = section('보스 소환', '던전 안에서만 됩니다. 재료를 넣으면 보스가 내 옆에 나타납니다. 파티 방장이 부르면 파티원도 같이 싸웁니다.');
    const g = globalThis.__gm, inRun = g?.state === 'playing' && g.world?.player;
    for (const [kind, label, rune, bet] of [['bloodraven', '블러드 레이븐', 'Tal Rune', 1], ['andariel', '안다리엘', 'Amn Rune', 3], ['duriel', '두리엘', 'Hel Rune', 5], ['mephisto', '메피스토', 'Mal Rune', 8], ['diablo', '디아블로', 'Vex Rune', 12], ['baalcrab', '바알', 'Jah Rune', 20]]) {
      const ok = inRun && has(rune, 1) && has(BET, bet);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin:3px 0;color:#ddd';
      row.append(Object.assign(document.createElement('span'), { style: 'flex:1', textContent: `${label}  —  ${ko(rune)} 1 + ${ko(BET)} ${bet}` }),
        btn('소환', () => {
          const p = g.world.player, a = Math.random() * Math.PI * 2;
          const boss = globalThis.__mpT?.spawn?.(g.world, kind, p.x + Math.cos(a) * 180, p.y + Math.sin(a) * 120, { rank: 'boss' });
          if (!boss) return done('소환하지 못했습니다(던전에서 몬스터가 한 번 나온 뒤에 됩니다).');
          take(rune, 1); take(BET, bet);
          done(`${label} 소환!`);
          box.remove();
        }, ok));
      ss.append(row);
    }
    if (!inRun) ss.append(Object.assign(document.createElement('div'), { style: 'color:#a66', textContent: '지금은 던전 밖입니다.' }));
  };
  panel.innerHTML = '<div style="font:bold 28px Cinzel,serif;color:#d8b860;text-align:center;letter-spacing:3px;text-shadow:0 0 10px #a60,0 2px 0 #000">호라드릭 큐브</div>';
  const close = btn('닫기', () => box.remove());
  close.style.cssText += ';margin-top:12px;float:right';
  panel.append(note, body, close);
  box.append(panel);
  box.onclick = (e) => { if (e.target === box) box.remove(); };
  box.onkeydown = (e) => e.stopPropagation();
  document.body.append(box);
  draw();
};
