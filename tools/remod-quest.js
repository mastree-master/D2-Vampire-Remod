// 숙제·업적·칭호: 처치 수·골드·플레이 시간·도달한 막을 세서 일일·주간 숙제와 업적을 채우고, 보상(룬·정수)과 칭호를 준다. save.remodQuest 에 저장
(() => {
  const RUNES = ['El', 'Eld', 'Tir', 'Nef', 'Eth', 'Ith', 'Tal', 'Ral', 'Ort', 'Thul', 'Amn', 'Sol', 'Shael', 'Dol', 'Hel', 'Io', 'Lum', 'Ko', 'Fal', 'Lem', 'Pul', 'Um', 'Mal', 'Ist', 'Gul', 'Vex', 'Ohm', 'Lo', 'Sur', 'Ber', 'Jah', 'Cham', 'Zod'];
  const LARZUK = "Larzuk's Essence", BET = 'Burning Essence of Terror';
  const day = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const week = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `w${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  // 날짜로 고정된 무작위(같은 날은 같은 숙제)
  const pick = (seed, list, n) => { let h = 0; for (const c of seed) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; const a = [...list], out = []; while (out.length < n && a.length) { h = (Math.imul(h, 1103515245) + 12345) | 0; out.push(a.splice(Math.abs(h) % a.length, 1)[0]); } return out; };
  // 숙제 종류: [id, 이름, 세는 값, 목표]
  const DAILY = [['k1', '몬스터 1,500마리 처치', 'kills', 1500], ['k2', '몬스터 4,000마리 처치', 'kills', 4000], ['g1', '골드 50,000 모으기', 'gold', 50000], ['m1', '30분 플레이', 'minutes', 30], ['a3', '3막 이상 들어가기', 'acts', 1], ['p1', '파티로 몬스터 300마리 처치', 'partyKills', 300]];
  const WEEKLY = [['wk', '몬스터 30,000마리 처치', 'kills', 30000], ['wg', '골드 1,000,000 모으기', 'gold', 1e6], ['wm', '5시간 플레이', 'minutes', 300], ['wa', '5막 7번 들어가기', 'act5', 7], ['wp', '파티로 몬스터 5,000마리 처치', 'partyKills', 5000]];
  const TOKEN = 'Hero Token'; // 영웅의 증표: 재료 아이템이라 꺼내서 우편으로 거래할 수 있음. 칭호(세이브에만 기록, 계정 귀속)는 거래 불가
  const dailyReward = () => [[`${RUNES[10 + Math.floor(Math.random() * 10)]} Rune`, 1], [LARZUK, 1], [BET, 3], [TOKEN, 1]];
  const weeklyReward = () => [[`${RUNES[22 + Math.floor(Math.random() * 9)]} Rune`, 1], [LARZUK, 3], [BET, 10], [TOKEN, 5]];
  // 증표로 사는 칭호: [이름, 증표 수]
  const SHOP = [['증표 수집가', 10], ['성역의 영웅', 30], ['살아있는 전설', 100]];
  // 업적: [id, 이름, 세는 값(누적), 목표, 칭호]
  const ACH = [
    ['a_k1', '첫 학살 — 몬스터 10,000마리', 'kills', 1e4, '학살자'], ['a_k2', '피의 강 — 몬스터 100,000마리', 'kills', 1e5, '피의 군주'], ['a_k3', '종말 — 몬스터 1,000,000마리', 'kills', 1e6, '종말을 부르는 자'],
    ['a_g1', '부자 — 골드 10,000,000', 'gold', 1e7, '대부호'], ['a_m1', '단골 — 10시간 플레이', 'minutes', 600, '성역의 단골'], ['a_m2', '은둔자 — 100시간 플레이', 'minutes', 6000, '성역의 주민'],
    ['a_a5', '세계석 앞에서 — 5막 50번', 'act5', 50, '세계석 수호자'], ['a_p1', '동료 — 파티로 10,000마리', 'partyKills', 1e4, '믿음직한 동료'], ['a_p2', '전우 — 파티로 100,000마리', 'partyKills', 1e5, '전설의 전우'],
    ['a_d', '숙제 성실 — 일일 숙제 30개 완료', 'dailyDone', 30, '성실한 모험가'], ['a_w', '주간 개근 — 주간 숙제 10개 완료', 'weeklyDone', 10, '개근상'],
  ];
  const Q = () => { const s = globalThis.__gm?.save; if (!s) return null; const q = (s.remodQuest ??= { total: {}, day: {}, week: {}, done: {}, titles: [], title: '' }); if (q.dayId !== day()) { q.dayId = day(); q.day = {}; q.dayClaim = {}; } if (q.weekId !== week()) { q.weekId = week(); q.week = {}; q.weekClaim = {}; } return q; };
  const add = (k, n) => { const q = Q(); if (!q || !n) return; for (const b of [q.total, q.day, q.week]) b[k] = (b[k] ?? 0) + n; };
  globalThis.__remodTitle = () => Q()?.title ?? '';
  // 칭호 옵션: 고른 칭호 하나만 적용. [곱하는 값(플레이어 필드, 배수) | 더하는 값(필드, 수치), 설명]
  const PERK = {
    '학살자': [['might', 1.03], '공격력 +3%'], '피의 군주': [['might', 1.05], '공격력 +5%'], '종말을 부르는 자': [['might', 1.08], '공격력 +8%'],
    '대부호': [['+goldGain', 25], '골드 +25%'], '성역의 단골': [['+magicFind', 20], '매직 아이템 발견 +20'], '성역의 주민': [['+magicFind', 40], '매직 아이템 발견 +40'],
    '세계석 수호자': [['damageTaken', 0.95], '받는 피해 -5%'], '믿음직한 동료': [['maxLife', 1.05], '최대 생명력 +5%'], '전설의 전우': [['maxLife', 1.08], '최대 생명력 +8%'],
    '성실한 모험가': [['speed', 1.03], '이동 속도 +3%'], '개근상': [['+goldGain', 15], '골드 +15%'],
    '증표 수집가': [['+magicFind', 15], '매직 아이템 발견 +15'], '성역의 영웅': [['might', 1.04], '공격력 +4%'], '살아있는 전설': [['maxLife', 1.1], '최대 생명력 +10%'],
  };
  globalThis.__titlePerk = (t) => PERK[t]?.[1] ?? '';
  // 매초: 곱하는 값은 바탕값을 기억해 겹쳐 곱하지 않고(게임이 다시 계산한 값만 새 바탕), 더하는 값은 바뀔 때만 빼고 더한다
  let tp = null;
  setInterval(() => {
    const p = globalThis.__gm?.world?.player, t = Q()?.title, perk = PERK[t]?.[0];
    if (tp && (tp.p !== p || tp.t !== t)) { if (tp.add && tp.p) tp.p[tp.f] -= tp.v; else if (tp.p && tp.p[tp.f] === tp.put) tp.p[tp.f] = tp.base; tp = null; }
    if (!p || !perk) return;
    const [f0, v] = perk, add = f0[0] === '+', f = add ? f0.slice(1) : f0;
    if (add) { if (!tp) { p[f] += v; tp = { p, t, f, v, add }; } return; }
    if (!tp || p[f] !== tp.put) tp = { p, t, f, base: p[f] };
    const r = f === 'maxLife' && p.maxLife ? p.life / p.maxLife : null;
    p[f] = tp.base * v; tp.put = p[f];
    if (r !== null) p.life = Math.min(p.maxLife, p.maxLife * r);
  }, 1000);

  // 1초마다 세기
  let last = null, lastAct = null, tick = 0;
  setInterval(() => {
    const g = globalThis.__gm, w = g?.world;
    if (!w || g.state !== 'playing') { last = null; return; }
    if (last?.w !== w) { last = { w, kills: w.kills, gold: w.gold }; lastAct = w.act; return; }
    const dk = w.kills - last.kills, dg = w.gold - last.gold;
    if (dk > 0) { add('kills', dk); if (globalThis.__party?.().role !== 'solo') add('partyKills', dk); }
    // 골드는 정수만 세고 남은 소수는 다음으로 넘김
    if (dg >= 1) add('gold', Math.floor(dg));
    last.kills = w.kills; last.gold = dg >= 1 ? last.gold + Math.floor(dg) : dg < 0 ? w.gold : last.gold;
    if (w.act !== lastAct) { lastAct = w.act; if (w.act >= 2) add('acts', 1); if (w.act === 4) add('act5', 1); }
    if (++tick % 60 === 0) add('minutes', 1);
    // 업적 달성 → 칭호
    const q = Q();
    for (const [id, , k, goal, title] of ACH) if (!q.done[id] && (q.total[k] ?? 0) >= goal) { q.done[id] = Date.now(); q.titles.includes(title) || q.titles.push(title); globalThis.__gm?.hud?.banner?.(`업적 달성: ${title}`, 'unique'); }
  }, 1000);

  globalThis.__remodQuests = () => {
    const q = Q();
    if (!q) return;
    const save = globalThis.__gm.save, ko = (t) => String(globalThis.__ko?.(t) ?? t);
    document.getElementById('__quest')?.remove();
    const box = document.createElement('div');
    box.id = '__quest';
    box.style.cssText = 'position:fixed;inset:0;z-index:99996;background:rgb(0 0 0/.6);display:flex;align-items:center;justify-content:center;font:14px sans-serif;color:#c8b27a';
    const panel = document.createElement('div');
    panel.style.cssText = 'width:min(860px,94vw);max-height:88vh;overflow:auto;padding:18px 22px;background:radial-gradient(ellipse at top,#2a2418,#0c0a07 70%);border:3px ridge #8a6d3b;box-shadow:0 0 0 2px #000,0 0 40px #000';
    box.append(panel);
    box.onclick = (e) => { if (e.target === box) box.remove(); };
    box.onkeydown = (e) => e.stopPropagation();
    document.body.append(box);
    const el = (tag, css, text) => { const d = document.createElement(tag); d.style.cssText = css ?? ''; if (text !== undefined) d.textContent = text; return d; };
    const btn = (text, on, ok = true) => { const b = el('button', `padding:3px 12px;cursor:${ok ? 'pointer' : 'default'};color:${ok ? '#ffd27a' : '#666'};background:linear-gradient(#5a5650,#2c2a26);border:1px solid #8a6d3b`, text); b.disabled = !ok; b.onclick = (e) => { e.stopPropagation(); if (ok) on(); }; return b; };
    const bar = (v, goal) => { const d = el('div', 'height:8px;background:#221;margin-top:3px;border:1px solid #443'); d.append(el('div', `height:100%;width:${Math.min(100, (100 * v) / goal)}%;background:${v >= goal ? '#6c3' : '#c8902a'}`)); return d; };
    const draw = () => {
      panel.replaceChildren(el('div', 'font:bold 28px Cinzel,serif;color:#d8b860;text-align:center;letter-spacing:3px;text-shadow:0 0 10px #a60,0 2px 0 #000', '숙제 · 업적 · 칭호'));
      const quests = (title, list, bucket, claim, reward, doneKey) => {
        const s = el('div', 'margin-top:12px;border:2px solid #5a4a2a;background:#0008;padding:8px 10px');
        s.append(el('div', 'font:bold 16px Cinzel,serif;color:#d8b860', title));
        for (const [id, name, k, goal] of list) {
          const v = bucket[k] ?? 0, got = claim[id];
          const r = el('div', 'display:flex;gap:10px;align-items:center;margin:6px 0');
          const left = el('div', 'flex:1');
          left.append(el('div', `color:${got ? '#777' : '#ddd'}`, `${name}   ${Math.min(v, goal).toLocaleString()} / ${goal.toLocaleString()}`), bar(v, goal));
          r.append(left, btn(got ? '받음' : '보상 받기', () => {
            const items = reward();
            for (const [b, n] of items) save.remodMats = { ...save.remodMats, [b]: (save.remodMats?.[b] ?? 0) + n };
            claim[id] = Date.now(); add(doneKey, 1); globalThis.__saveNow?.();
            note.textContent = `보상: ${items.map(([b, n]) => `${ko(b)} ${n}개`).join(', ')} (재료 창고)`;
            draw();
          }, !got && v >= goal));
          s.append(r);
        }
        panel.append(s);
      };
      quests(`오늘의 숙제 (${q.dayId})`, pick(q.dayId, DAILY, 3), q.day, (q.dayClaim ??= {}), dailyReward, 'dailyDone');
      quests('이번 주 숙제', pick(q.weekId, WEEKLY, 3), q.week, (q.weekClaim ??= {}), weeklyReward, 'weeklyDone');
      // 업적
      const a = el('div', 'margin-top:12px;border:2px solid #5a4a2a;background:#0008;padding:8px 10px');
      a.append(el('div', 'font:bold 16px Cinzel,serif;color:#d8b860', `업적 (${Object.keys(q.done).length} / ${ACH.length})`));
      for (const [id, name, k, goal, title] of ACH) {
        const v = q.total[k] ?? 0, r = el('div', 'margin:5px 0');
        r.append(el('div', `color:${q.done[id] ? '#6f6' : '#ccc'}`, `${q.done[id] ? '✔ ' : ''}${name}  →  칭호 「${title}」(${PERK[title]?.[1] ?? ""})   ${Math.min(v, goal).toLocaleString()} / ${goal.toLocaleString()}`), bar(v, goal));
        a.append(r);
      }
      panel.append(a);
      // 칭호 고르기: 채팅 이름 앞에 붙음
      const t = el('div', 'margin-top:12px;border:2px solid #5a4a2a;background:#0008;padding:8px 10px');
      t.append(el('div', 'font:bold 16px Cinzel,serif;color:#d8b860', '칭호 (채팅 이름 앞에 표시 · 고른 칭호 하나의 옵션만 적용)'), el('div', 'margin-top:4px;color:#9f9', q.title ? `적용 중: 「${q.title}」 — ${PERK[q.title]?.[1] ?? ''}` : '적용 중인 칭호 없음'));
      const row = el('div', 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px');
      for (const name of ['', ...q.titles]) {
        const b = btn(name ? `${q.title === name ? '✔ ' : ''}${name} · ${PERK[name]?.[1] ?? ''}` : `${q.title ? '' : '✔ '}없음`, () => { q.title = name; globalThis.__saveNow?.(); draw(); });
        if (q.title === name) b.style.cssText += ';outline:2px solid #ffd27a;outline-offset:1px;box-shadow:0 0 8px #c8902a';
        row.append(b);
      }
      if (!q.titles.length) row.append(el('span', 'color:#777', '업적을 달성하면 칭호가 생깁니다.'));
      t.append(row);
      const have = save.remodMats?.[TOKEN] ?? 0, shop = el('div', 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center');
      shop.append(el('span', 'color:#d8b860', `증표로 칭호 얻기 (재료 창고의 영웅의 증표 ${have}개 · 증표는 거래 가능, 칭호는 계정 귀속)`));
      for (const [name, cost] of SHOP) {
        if (q.titles.includes(name)) continue;
        const b = btn(`${name} · ${PERK[name][1]} — 증표 ${cost}`, () => { if ((save.remodMats?.[TOKEN] ?? 0) < cost) return; save.remodMats[TOKEN] -= cost; if (!save.remodMats[TOKEN]) delete save.remodMats[TOKEN]; q.titles.push(name); globalThis.__saveNow?.(); note.textContent = `칭호 「${name}」를 얻었습니다.`; draw(); });
        if (have < cost) { b.disabled = true; b.style.opacity = '.45'; }
        shop.append(b);
      }
      t.append(shop);
      panel.append(t, note, btn('닫기', () => box.remove()));
    };
    const note = el('div', 'min-height:20px;color:#fff;margin:10px 0');
    draw();
  };
})();
