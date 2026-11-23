// 호라드릭 큐브 창: 재료 창고(save.remodMats)의 재료로 조합한다. 룬 3개→다음 룬, 손에 든 쥬얼 다시 굴리기
// 7-7 분해: 팔리는 장비(자동·직접)마다 장비 조각. 매직 1, 레어 2, 유니크·세트·룬워드 3
globalThis.__dis = (s, e) => {
  const n = { magic: 1, rare: 2, unique: 3, set: 3, runeword: 3 }[e?.rarity];
  if (!n || e.type === 'essence' || e.type === 'quest' || e.type === 'charm') return;
  const m = (s.remodMats ??= {});
  m['Item Fragment'] = Math.min(9999, (m['Item Fragment'] ?? 0) + n);
};
globalThis.__remodCube = () => {
  const save = globalThis.__gm?.save;
  if (!save) return;
  const KO = { 'Terror Map': '공포의 지도', 'Mercenary Contract': '용병 계약서', 'Training Manual': '훈련 교본', 'Rune Box': '룬 상자', 'High Rune Box': '고급 룬 상자', 'Abyss Shard': '리모드의 파편', 'Dimension Fragment': '차원의 조각', 'Socket Stone': '소켓의 돌', 'Fire Whetstone': '화염 깎기석', 'Lightning Whetstone': '번개 깎기석', 'Cold Whetstone': '냉기 깎기석', 'Poison Whetstone': '독 깎기석', 'Fortune Stone': '행운석', 'Item Fragment': '장비 조각' };
  const ko = (t) => KO[t] ?? String(globalThis.__ko?.(t) ?? t);
  const RUNES = ['El', 'Eld', 'Tir', 'Nef', 'Eth', 'Ith', 'Tal', 'Ral', 'Ort', 'Thul', 'Amn', 'Sol', 'Shael', 'Dol', 'Hel', 'Io', 'Lum', 'Ko', 'Fal', 'Lem', 'Pul', 'Um', 'Mal', 'Ist', 'Gul', 'Vex', 'Ohm', 'Lo', 'Sur', 'Ber', 'Jah', 'Cham', 'Zod'].map((r) => `${r} Rune`);
  const LARZUK = "Larzuk's Essence";
  const mats = () => (save.remodMats ??= {});
  // 재료 세기·쓰기: 인벤토리 → 창고(공유 탭·지금 직업 탭) → 재료 창고 순. 겹친 묶음은 count
  const myCls = () => globalThis.__gm?.world?.player?.cls;
  const piles = (b) => [save.inventoryByClass?.[myCls()] ?? [], ...Object.entries(save.stashTabs ?? {}).filter(([k]) => k.startsWith('shared') || k === myCls()).map(([, v]) => v)]
    .flatMap((l) => (Array.isArray(l) ? l : []).filter((x) => x?.base === b && x.type === 'essence').map((x) => [l, x]));
  const cnt = (b) => piles(b).reduce((a, [, x]) => a + (x.count ?? 1), 0) + (mats()[b] ?? 0);
  const has = (b, n) => cnt(b) >= n;
  const take = (b, n) => {
    for (const [l, x] of piles(b)) {
      if (n <= 0) break;
      const c = x.count ?? 1, use = Math.min(c, n);
      n -= use;
      if (c - use > 0) x.count = c - use; else l.splice(l.indexOf(x), 1);
    }
    if (n > 0) { mats()[b] -= n; if (mats()[b] <= 0) delete mats()[b]; }
  };
  const give = (b, n) => { mats()[b] = (mats()[b] ?? 0) + n; };
  const done = (msg) => { globalThis.__saveNow?.(); note.textContent = msg; draw(); };

  document.getElementById('__cube')?.remove();
  const box = document.createElement('div');
  box.id = '__cube';
  // 창고가 열려 있으면 창고 칸 자리에 겹쳐 띄움(오른쪽 인벤토리에서 아이템을 집어 큐브 칸에 놓도록). 아니면 화면 가운데
  const host = document.getElementById('stash-panel');
  const R = host?.getBoundingClientRect(); // 창고 패널(왼쪽 절반). 오른쪽 인벤토리는 가리지 않음
  box.style.cssText = R ? `position:fixed;left:${R.x}px;top:${R.y}px;width:${R.width}px;height:${R.height}px;z-index:9000;display:flex;font:14px sans-serif;color:#c8b27a`
    : 'position:fixed;inset:0;z-index:99999;background:rgb(0 0 0/.6);display:flex;align-items:center;justify-content:center;font:14px sans-serif;color:#c8b27a';
  if (R) { const watch = setInterval(() => { if (!document.getElementById('stash-panel') || !box.isConnected) { clearInterval(watch); box.remove(); } }, 300); }
  const panel = document.createElement('div');
  panel.style.cssText = (R ? 'width:100%;height:100%;box-sizing:border-box;' : 'width:min(760px,92vw);max-height:86vh;') + 'overflow:auto;padding:18px 22px;background:radial-gradient(ellipse at top,#2a2418,#0c0a07 70%);border:3px ridge #8a6d3b;box-shadow:0 0 0 2px #000,0 0 40px #000';
  if (!R) panel.className = '__d2p'; // 창고 안에 붙는 큐브(R)는 창고 판 그대로
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
    // ───── 큐브 칸: 아래 목록에서 장비·부적·쥬얼을 눌러 넣고, 그 아이템에 맞는 버튼만 보여 줌 ─────
    const FORT = 'Fortune Stone', FRAG = 'Item Fragment', ABYSS = 'Abyss Shard', DIM = 'Dimension Fragment', BET = 'Burning Essence of Terror';
    const g0 = globalThis.__gm, cls = g0?.world?.player?.cls, lvl = g0?.world?.player?.level ?? 1;
    const fa = cls && g0?.forgeActions?.(cls, lvl, () => {});
    // 큐브에 넣은 아이템은 제자리(장착·인벤·부적칸·창고)에 그대로 두고 id 만 기억함 → 대장간(서버)이 그 자리에서 찾음
    const findItem = (id) => {
      if (!id) return null;
      let hit = null;
      (function walk(o) {
        if (hit || !o || typeof o !== 'object') return;
        if (o.id === id && o.base) { hit = o; return; }
        for (const v of Array.isArray(o) ? o : Object.values(o)) walk(v);
      })([save.equippedByClass?.[cls], save.inventoryByClass?.[cls], save.charmsByClass?.[cls], save.stashTabs]);
      return hit;
    };
    const sel = findItem(globalThis.__cubeSel);
    if (!sel) globalThis.__cubeSel = null;
    // 아이템을 세이브 안 같은 자리에서 바꾸거나(새 아이템) 지움(null)
    const swap = (id, next) => {
      (function walk(o) {
        if (Array.isArray(o)) { for (let i = o.length - 1; i >= 0; i--) if (o[i]?.id === id) { if (next) o[i] = next; else o.splice(i, 1); } else walk(o[i]); }
        else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (v?.id === id) { if (next) o[k] = next; else delete o[k]; } else walk(v);
      })(save);
      globalThis.__cubeSel = next ? next.id : null;
    };
    const fortN = () => (globalThis.__cubeFort ? Math.min(3, cnt(FORT)) : 0);
    const fortBox = () => {
      const l = document.createElement('label');
      l.style.cssText = 'display:inline-flex;gap:4px;align-items:center;color:#9f9;margin-left:8px';
      const c = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !!globalThis.__cubeFort, disabled: !has(FORT, 1) });
      c.onchange = () => { globalThis.__cubeFort = c.checked; draw(); };
      const n = Math.min(3, cnt(FORT));
      l.append(c, `${ko(FORT)} ${n}개 쓰기 (+${n * 10}%p)`);
      return l;
    };
    const cost = (list) => list.map(([b, n]) => `<span style="color:${has(b, n) ? '#9f9' : '#f66'}">${ko(b)} ${n} (가진 ${cnt(b)})</span>`).join(' + ');
    const okCost = (list) => list.every(([b, n]) => has(b, n));
    const pay = (list) => list.forEach(([b, n]) => take(b, n));
    // 한 줄: 이름 · 설명 · 필요 재료(모자라면 빨강) · 성공률 · 행운석 체크 · 버튼(재료 모자라면 꺼짐)
    const action = (box, name, help, need, rate, fort, run, ok = true) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0;padding:6px;border:1px solid #3a3020;background:#0006';
      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:240px;color:#ddd';
      const pct = rate === null ? '' : ` · 성공 <b style="color:#ffd27a">${Math.round(Math.min(1, rate + (fort ? fortN() * 0.1 : 0)) * 100)}%</b>`;
      info.innerHTML = `<b style="color:#e8d8a8">${name}</b>${pct}<br><span style="font-size:12px;color:#998">${help}</span><br><span style="font-size:12px">필요: ${need.length ? cost(need) : '없음'}</span>`;
      row.append(info);
      if (fort) row.append(fortBox());
      row.append(btn(name, run, ok && okCost(need)));
      box.append(row);
    };
    const forgeDo = async (act, need) => {
      if (!fa) return done('마을이나 던전에 들어간 뒤에 됩니다.');
      pay(need);
      g0.onAnvil?.(sel, () => {});
      const r = await fa.act(act);
      if (r?.color === 'red' && !/부서졌습니다/.test(r.text ?? '')) need.forEach(([b, n]) => give(b, n)); // 거절·연결 없음이면 재료 돌려줌
      if (/부서졌습니다/.test(r?.text ?? '')) swap(sel.id, null);
      done(r?.text ?? '응답이 없습니다.');
    };

    // 원작 호라드릭 큐브 창 그림(supertransmogrifier.dc6) 위 3×4 칸. 아이템을 집은 채 칸을 누르면 들어가고(제자리로 돌려놓음), 빈손으로 누르면 뺌
    const cubeBox = document.createElement('div');
    cubeBox.style.cssText = 'position:relative;width:320px;height:432px;margin:0 auto;flex:none';
    cubeBox.innerHTML = `<img src="${globalThis.__cubeArt ?? ''}" style="position:absolute;inset:0;image-rendering:pixelated">`;
    const cell = document.createElement('div');
    cell.title = '아이템을 집어서 여기에 놓으세요';
    cell.style.cssText = 'position:absolute;left:117px;top:139px;width:88px;height:116px;cursor:pointer;display:flex;align-items:center;justify-content:center';
    cell.onclick = (e) => {
      e.stopPropagation();
      const held = save.cursor?.item;
      if (held) {
        if (['essence', 'quest'].includes(held.type)) return done('재료는 넣지 않아도 됩니다(인벤·창고·재료 창고에서 자동으로 씁니다).');
        const old = sel; // 이미 든 칸이면 바꿈(큐브 칸은 고른 템 표시라 예전 템은 인벤에 그대로 남음)
        globalThis.__cubeSel = held.id;
        g0?.putBack?.();
        return done(old && old.id !== held.id ? `바꿨습니다: ${ko(old.name)} → ${ko(held.name)}` : `큐브에 넣었습니다: ${ko(held.name)}`);
      }
      if (sel) { globalThis.__cubeSel = null; return done('큐브에서 뺐습니다.'); }
    };
    if (sel) {
      const img = document.createElement('img');
      img.style.cssText = 'image-rendering:pixelated;max-width:88px;max-height:116px';
      const set = (f) => { if (f) img.src = '../d2/' + f; };
      const it = globalThis.__d2items;
      if (it) set(it.uniques?.[sel.name]?.inv?.[0]?.file ?? it.sets?.[sel.name]?.inv?.[0]?.file ?? it.bases?.[sel.base]?.inv?.[0]?.file);
      else fetch('../d2/items.json').then((r) => r.json()).then((j) => { globalThis.__d2items = j; draw(); });
      cell.append(img);
    }
    cubeBox.append(cell);
    const cs = section('호라드릭 큐브', '오른쪽 인벤토리에서 아이템을 집어(클릭) 큐브 가운데 칸에 놓으세요. 빈손으로 칸을 누르면 뺍니다.');
    const COL = { unique: '#c7b377', set: '#1eff00', runeword: '#c7b377', rare: '#ff0', magic: '#69f', normal: '#ddd' };
    const label = Object.assign(document.createElement('div'), { textContent: sel ? `${ko(sel.name)}  [${ko(sel.base)}]` : '비어 있음' });
    label.style.cssText = `text-align:center;margin:4px 0;color:${sel ? COL[sel.rarity] ?? '#ddd' : '#777'}`;
    cs.append(cubeBox, label);

    if (sel) {
      const ab = section(`할 수 있는 것: ${ko(sel.name)}`, '');
      const gearOk = !['charm', 'jewel'].includes(sel.type);
      const xs = sel.forge?.x ?? [];
      const tr = sel.forge?.hf ? 1 : 0; // 초월(옛 헬포지)은 아이템마다 1번
      if (gearOk && sel.rarity !== 'magic') {
        action(ab, '강화', '옵션 하나가 무작위로 오르고, 낮은 확률(5%)로 없던 옵션이 붙습니다. 아이템마다 10번. 실패하면 횟수만 줄어듭니다.', [[FRAG, 5]], 0.4, true,
          () => { const n = fortN(); forgeDo(`temper${n || ''}`, [[FRAG, 5], ...(n ? [[FORT, n]] : [])]); });
        action(ab, '횟수 초기화', '강화 10번을 다 쓴 아이템의 쓴 횟수를 0~10 중 무작위로 되돌립니다. 오른 옵션은 그대로.', [[BET, 1]], null, false, () => forgeDo('reset', [[BET, 1]]));
        action(ab, '강화 지우기', '강화로 오른 옵션을 모두 지웁니다.', [], null, false, () => forgeDo('clean', []));
        action(ab, '초월', `강화 10번을 다 쓴 아이템만, 아이템마다 1번. 성공하면 강화 횟수가 0 으로 돌아가고 상한이 +10 → +20 이 되어 10번 더 강화할 수 있습니다(오른 옵션은 그대로). ${tr ? '<b style="color:#9f9">이미 초월함</b>' : ''} <b style="color:#f66">실패하면 아이템이 사라집니다.</b>`, [[ABYSS, 10], [DIM, 5]], 0.3, true,
          () => { const n = fortN(); forgeDo(`tr${n}`, [[ABYSS, 10], [DIM, 5], ...(n ? [[FORT, n]] : [])]); }, !tr);
      }
      if (sel.type === 'weapon')
        for (const [b, act, stat, label] of [['Fire Whetstone', 'whet_fire', 'firePierce', '화염'], ['Lightning Whetstone', 'whet_ltng', 'lightningPierce', '번개'], ['Cold Whetstone', 'whet_cold', 'coldPierce', '냉기'], ['Poison Whetstone', 'whet_pois', 'poisonPierce', '독']]) {
          const cur = xs.find((x) => x.rm === 'ws' && x.stat === stat)?.value ?? 0;
          action(ab, `${label} 깎기석`, `적의 ${label} 저항 -1 (최대 10, 지금 ${cur})`, [[b, 1]], null, false, () => forgeDo(act, [[b, 1]]), cur < 10);
        }
      // 참 강화: 이름 끝 +N → +N+1 (리모드참 = 리모드의 파편 5, 나머지 = 차원의 조각 2). 실패하면 재료만
      const m = sel.type === 'charm' && /^(.*) \+(\d+)$/.exec(sel.name ?? '');
      if (m) {
        const next = `${m[1]} +${+m[2] + 1}`, cn = +m[2], nar = /^Narak/.test(m[1]);
        const rate = nar ? (cn < 10 ? 0.7 : cn < 16 ? 0.5 : 0.3) : (cn < 5 ? 0.7 : cn < 8 ? 0.5 : 0.3);
        const need = nar ? [[ABYSS, 5]] : [[DIM, 2]];
        const okNext = !!globalThis.__reim?.uniques?.[next];
        action(ab, '참 강화', okNext ? `${ko(sel.name)} → ${ko(next)}. 실패하면 재료만 사라집니다.` : '최대 단계입니다.', need, rate, true, () => {
          const n = fortN();
          pay([...need, ...(n ? [[FORT, n]] : [])]);
          if (Math.random() >= rate + n * 0.1) return done('참 강화 실패. 재료만 사라졌습니다.');
          const it = globalThis.__makeItem?.(next);
          if (!it) return done('새 참을 만들지 못했습니다.');
          swap(sel.id, it);
          done(`참 강화 성공! ${ko(next)}`);
        }, okNext);
      }
      // 다시 굴리기: 매직·레어 쥬얼, 매직 부적
      const rr = sel.type === 'jewel' && ['magic', 'rare'].includes(sel.rarity) ? () => globalThis.__remodT?.jw?.(sel.level || 80, sel.level || 80, 0)
        : sel.type === 'charm' && sel.rarity === 'magic' ? () => globalThis.__remodT?.roll?.(sel.base, 'magic', sel.level || 80, sel.level || 80, 0) : null;
      if (rr) action(ab, '다시 굴리기', '같은 아이템 레벨로 옵션을 새로 뽑습니다.', [[LARZUK, 1]], null, false, () => {
        const it = rr();
        if (!it) return done('다시 굴리지 못했습니다.');
        take(LARZUK, 1); swap(sel.id, it); done(`새 옵션: ${ko(it.name)}`);
      });
      if (!ab.querySelector('button')) ab.append('이 아이템으로 할 수 있는 것이 없습니다.');
    }
    // ───── 재료만 쓰는 것 ─────
    // 1. 룬 올리기: 같은 룬 3개 → 다음 룬 1개
    const rs = section('룬 올리기', '같은 룬 3개를 다음 단계 룬 1개로 바꿉니다. 재료 창고에 있는 룬을 씁니다.');
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px';
    RUNES.slice(0, -1).forEach((r, i) => {
      const n = cnt(r);
      if (!n) return;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;align-items:center;justify-content:space-between;padding:2px 4px;color:#ddd';
      row.append(Object.assign(document.createElement('span'), { textContent: `${ko(r)} × ${n}` }),
        btn(`→ ${ko(RUNES[i + 1]).replace(/^\d+ /, '')}`, () => { take(r, 3); give(RUNES[i + 1], 1); done(`${ko(r)} 3개 → ${ko(RUNES[i + 1])} 1개`); }, n >= 3));
      grid.append(row);
    });
    if (!grid.children.length) grid.textContent = '재료 창고에 룬이 없습니다.';
    rs.append(grid);
    // 룬 상자: 1개 → 무작위 룬 1개 (높은 룬일수록 드묾). 고급 룬 상자는 16번째 이오부터, 덜 드묾
    const BOX = { 'Rune Box': [0, 0.75], 'High Rune Box': [15, 0.8] };
    const openBox = (box, n) => {
      const got = {}, [from, f] = BOX[box], rs2 = RUNES.slice(from);
      for (let i = 0; i < n; i++) {
        let r = Math.random() * rs2.reduce((a, _, k) => a + f ** k, 0), k = 0;
        while ((r -= f ** k) > 0 && k < rs2.length - 1) k++;
        give(rs2[k], 1); got[rs2[k]] = (got[rs2[k]] ?? 0) + 1;
      }
      take(box, n);
      done(`${ko(box)} ${n}개: ` + Object.entries(got).map(([r, c]) => `${ko(r)} ${c}`).join(', '));
    };
    const rb = section('룬 상자', `룬 상자 ${cnt('Rune Box')}개, 고급 룬 상자 ${cnt('High Rune Box')}개. 열면 무작위 룬 1개가 재료 창고로 들어갑니다. 고급 룬 상자는 이오 룬부터 나옵니다. 룬 상자 5개를 고급 룬 상자 1개로 바꿀 수 있습니다.`);
    for (const box of Object.keys(BOX)) rb.append(btn(`${ko(box)} 1개 열기`, () => openBox(box, 1), has(box, 1)), ' ', btn('모두 열기', () => openBox(box, cnt(box)), has(box, 1)), document.createElement('br'));
    rb.append(btn('룬 상자 5개 → 고급 룬 상자 1개', () => { take('Rune Box', 5); give('High Rune Box', 1); done('고급 룬 상자 1개를 얻었습니다.'); }, has('Rune Box', 5)));
    // 소켓의 돌: 라주크의 정수로 바꿈 (소켓 다시 굴리기는 라주크의 정수가 함)
    const sk = section('소켓의 돌', `소켓의 돌 1개를 라주크의 정수 1개로 바꿉니다. 가진 소켓의 돌: ${cnt('Socket Stone')}개`);
    sk.append(btn('바꾸기', () => { take('Socket Stone', 1); give(LARZUK, 1); done('라주크의 정수 1개를 얻었습니다.'); }, has('Socket Stone', 1)));
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
    const ms = section('공포의 지도', `가진 지도: ${cnt('Terror Map')}장. 펼치면 지금(또는 다음에 들어가는) 판 하나에 접사가 붙고, 판이 끝나면 사라집니다. 몬스터를 잡다 보면 가끔 나옵니다.`);
    if (save.remodMap) ms.append(Object.assign(document.createElement('div'), { style: 'color:#ffd27a', textContent: `펼친 지도: ${globalThis.__mapText(save.remodMap.mods).join(' · ')}` }));
    else ms.append(btn('지도 펼치기', () => { const m = globalThis.__mapOpen?.(); done(m ? `지도: ${globalThis.__mapText(m.mods).join(' · ')}` : '지도를 펼치지 못했습니다.'); }, has('Terror Map', 1)));
    // 2-4. 용병(remod-merc.js): 계약서 → 등급 +1(최대 10), 교본 → 모든 스킬 +1(최대 3). 지금 직업의 지금 용병에게
    const mi = globalThis.__mercInfo?.();
    const vs = section('용병', mi ? `지금 용병 등급 ${mi.rank} / 10 (체력 +${mi.rank * 8}% · 피해 +${mi.rank * 6}% · 받는 피해 -${mi.rank * 2}%), 교본 ${mi.skill} / 3 (모든 스킬 +${mi.skill})` : '고용한 용병이 없습니다.');
    vs.append(btn(`용병 계약서 쓰기 (${cnt('Mercenary Contract')}장)`, () => done(globalThis.__mercUse('rank') ? '용병 등급이 올랐습니다.' : '쓰지 못했습니다.'), !!mi && mi.rank < 10 && has('Mercenary Contract', 1)), ' ',
      btn(`훈련 교본 쓰기 (${cnt('Training Manual')}권)`, () => done(globalThis.__mercUse('skill') ? '용병 스킬이 올랐습니다.' : '쓰지 못했습니다.'), !!mi && mi.skill < 3 && has('Training Manual', 1)));
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
// K: 마을·던전 어디서나 큐브 열기/닫기. 템을 넣으려면 인벤이 보여야 해서 창고(B)를 같이 연다
document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyK' || /^(INPUT|TEXTAREA)$/.test(e.target?.tagName)) return;
  e.preventDefault(); e.stopPropagation();
  const c = document.getElementById('__cube');
  if (c) return c.remove();
  const g = globalThis.__gm;
  if (g && (g.state === 'playing' || g.state === 'camp')) { g.__stash = 1; g.openCharacter(g.state); }
  setTimeout(() => globalThis.__remodCube?.(), 150);
}, true);
