// 보스 탑(버티기): 공포 100 이상을 깬 사람만. 판 안에서 탑을 고르면 몬스터가 시간이 갈수록 세지고, 탑 보스가 주기적으로 나온다
// 90초 또는 1,000킬마다 뒷면 카드 3장 중 1장을 고른다(이번 판만 오르는 강화 카드 / 아이템 카드). 죽거나 판을 나가면 끝, 버틴 시간이 순위에 오른다
(() => {
  const TOWERS = [['andariel', '안다리엘'], ['duriel', '두리엘'], ['mephisto', '메피스토'], ['diablo', '디아블로'], ['baalcrab', '바알']];
  const RUNES = ['El', 'Eld', 'Tir', 'Nef', 'Eth', 'Ith', 'Tal', 'Ral', 'Ort', 'Thul', 'Amn', 'Sol', 'Shael', 'Dol', 'Hel', 'Io', 'Lum', 'Ko', 'Fal', 'Lem', 'Pul', 'Um', 'Mal', 'Ist', 'Gul', 'Vex', 'Ohm', 'Lo', 'Sur', 'Ber', 'Jah', 'Cham', 'Zod'];
  const KO = (t) => String(globalThis.__ko?.(t) ?? t);
  const g = () => globalThis.__gm;
  const key = () => { try { return localStorage.getItem('d2s:key'); } catch { return null; } };
  const api = async (method, path, body) => { const k = key(); if (!k) return null; const r = await globalThis.d2app?.leaderboard?.(method, method === 'GET' ? `${path}?key=${k}` : path, body && JSON.stringify({ ...body, key: k })); try { return JSON.parse(r?.body ?? 'null'); } catch { return null; } };
  // 입장 조건: 어느 직업이든 공포 영역 100 이상을 깼는지(__towerAny 는 시험용)
  globalThis.__towerTier = () => Math.max(0, ...Object.values(g()?.save?.terror ?? {}).map((v) => v?.cleared ?? 0));
  globalThis.__towerOpen = () => globalThis.__towerAny || globalThis.__towerTier() >= 100;
  globalThis.__towerList = TOWERS;
  globalThis.__towerRank = () => api('GET', '/tower');

  let T = null; // { boss, name, t0, kills0, next, nextKills, w, mul:{dmg,taken,life,speed}, mf, gold, set }
  const min = () => (Date.now() - T.t0) / 60000;
  // 몬스터 강화: 시작부터 체력·공격 3배, 1분마다 +20%씩 더(remod-party.js __mpBuff 앞에서 불림)
  globalThis.__towerBuff = (e) => {
    if (!T || e.rank === 'breakable' || e.__tower) return;
    e.__tower = true;
    const f = 3 * (1 + 0.2 * min());
    e.maxLife *= f; e.life *= f; e.damage *= f; e.xp *= 1 + min() * 0.1;
  };
  // 이번 판 강화 카드: 플레이어 값에 곱해 둔다. 게임이 능력치를 다시 계산하면 다시 얹음
  const BUFFS = [['dmg', '공격력 +12%'], ['taken', '받는 피해 -8%'], ['life', '최대 생명력 +12%'], ['heal', '생명력 모두 회복'], ['speed', '이동 속도 +8%'], ['mf', '매직 아이템 발견 +40'], ['gold', '골드 +40%']];
  // 값마다 따로: 게임이 그 값을 다시 계산했으면(내가 넣은 값과 다르면) 새 값을 바탕으로, 아니면 예전 바탕값으로 다시 곱한다(겹쳐 곱하지 않게)
  const FIELDS = [['might', 'dmg'], ['maxLife', 'life'], ['damageTaken', 'taken'], ['speed', 'speed']];
  const applyBuffs = () => {
    const p = g()?.world?.player;
    if (!T || !p) return;
    const s = T.set?.p === p ? T.set : { p, base: {}, put: {} };
    const r = p.maxLife ? p.life / p.maxLife : 1;
    for (const [f, k] of FIELDS) {
      if (s.put[f] === undefined || p[f] !== s.put[f]) s.base[f] = p[f];
      p[f] = s.base[f] * T.mul[k];
      s.put[f] = p[f];
    }
    p.life = Math.min(p.maxLife, p.maxLife * r);
    T.set = s;
  };
  // 아이템 카드: 버틴 시간이 길수록 좋은 것. 룬·정수·지도·계약서는 재료 탭, 장비·쥬얼은 공유 창고 9
  const itemCard = () => {
    const m = min(), s = g().save, lvl = Math.min(99, 80 + Math.floor(m));
    const hi = Math.min(32, 8 + Math.floor(m * 1.2) + Math.floor(Math.random() * 4));
    const pool = [
      [3, () => [`${RUNES[Math.max(0, hi - 8 + Math.floor(Math.random() * 8))]} Rune`, 1]],
      [m >= 5 ? 2 : 0, () => [`${RUNES[hi]} Rune`, 1]],
      [2, () => ['Burning Essence of Terror', 2 + Math.floor(m / 3)]],
      [1, () => ["Larzuk's Essence", 1 + Math.floor(m / 10)]],
      [1, () => ['Terror Map', 1]],
      [m >= 8 ? 1 : 0, () => ['Mercenary Contract', 1]],
      [m >= 15 ? 0.5 : 0, () => ['Training Manual', 1]],
      [2, () => globalThis.__remodT?.jw?.(lvl, lvl, Math.floor(m * 10))],
    ];
    let r = Math.random() * pool.reduce((a, [w]) => a + w, 0);
    const got = pool.find(([w]) => (r -= w) < 0)[1]();
    if (Array.isArray(got)) { const [b, n] = got; s.remodMats = { ...s.remodMats, [b]: (s.remodMats?.[b] ?? 0) + n }; return `${KO(b)} ${n}개 (재료 탭)`; }
    if (got) { (s.stashTabs.shared9 ??= []).push(got); let nm = KO(got.name); try { nm = globalThis.__nm?.(got) || nm; } catch {} return `${nm} (공유 창고 9)`; }
    return '빈 카드';
  };
  const buffCard = (id) => {
    if (id === 'dmg') T.mul.dmg *= 1.12; if (id === 'taken') T.mul.taken *= 0.92; if (id === 'life') T.mul.life *= 1.12; if (id === 'speed') T.mul.speed *= 1.08;
    const p = g().world.player;
    if (id === 'heal') p.life = p.maxLife;
    if (id === 'mf') { p.magicFind += 40; T.mf += 40; }
    if (id === 'gold') { p.goldGain += 40; T.gold += 40; }
    T.v++;
    return BUFFS.find((b) => b[0] === id)[1];
  };
  // 카드 고르기 창: 게임을 멈추고 뒷면 3장. 1장을 고르면 3장 모두 뒤집혀 보이고, 고른 것만 받는다
  const cards = () => {
    const game = g();
    game.state = 'paused';
    const deal = Array.from({ length: 3 }, () => (Math.random() < 0.6 ? { buff: BUFFS[Math.floor(Math.random() * BUFFS.length)] } : { item: true }));
    const box = document.createElement('div');
    box.id = '__tcard';
    box.style.cssText = 'position:fixed;inset:0;z-index:100002;background:rgb(0 0 0/.65);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;font:14px sans-serif;color:#c8b27a';
    box.innerHTML = `<div style="font:bold 26px Cinzel,serif;color:#d8b860;text-shadow:0 0 10px #a60,0 2px 0 #000">봉인된 두루마리를 하나 여세요</div><div style="color:#887">${T.name} 탑 · ${fmt(Date.now() - T.t0)} 버팀</div>`;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-direction:column;gap:10px;width:min(520px,90vw)';
    let picked = false;
    const els = deal.map((c, i) => {
      const d = document.createElement('div');
      d.style.cssText = 'height:64px;display:flex;align-items:center;gap:14px;padding:0 18px;box-sizing:border-box;cursor:pointer;border:2px solid #5a4a2a;background:linear-gradient(90deg,#3a2a14,#1a1208 55%,#3a2a14);box-shadow:inset 0 0 18px #000,0 0 10px #000;font:bold 15px sans-serif;color:#e8d8a8;transition:transform .15s,border-color .15s';
      d.innerHTML = `<img src="../d2/items/invhscr.png" width="34" height="34" style="image-rendering:pixelated"><span style="flex:1;color:#887;font:italic 14px serif">봉인된 두루마리 ${'Ⅰ Ⅱ Ⅲ'.split(' ')[i]}</span><span style="width:26px;height:26px;border-radius:50%;background:radial-gradient(#c0302a,#5a0a08);box-shadow:0 0 6px #f40"></span>`;
      d.onmouseenter = () => { if (!picked) { d.style.transform = 'translateX(8px)'; d.style.borderColor = '#c8902a'; } };
      d.onmouseleave = () => { d.style.transform = ''; if (!picked) d.style.borderColor = '#5a4a2a'; };
      d.onclick = () => {
        if (picked) return;
        picked = true;
        els.forEach((e, j) => {
          const c2 = deal[j], mine = j === i;
          const text = mine ? (c2.buff ? buffCard(c2.buff[0]) : itemCard()) : c2.buff ? c2.buff[1] : '아이템';
          if (mine) T.log.push(text);
          e.style.background = c2.buff ? 'linear-gradient(90deg,#1e2c12,#0c1006)' : 'linear-gradient(90deg,#3a2a10,#100a04)';
          e.style.opacity = mine ? 1 : 0.45;
          e.style.borderColor = mine ? '#ffd27a' : '#5a4a2a';
          e.innerHTML = `<img src="../d2/items/invhscr.png" width="34" height="34" style="image-rendering:pixelated;opacity:.5"><span style="width:90px;font:12px sans-serif;color:#887">${c2.buff ? '이번 판 강화' : '아이템'}</span><span style="flex:1">${text}</span>`;
        });
        applyBuffs();
        setTimeout(() => { box.remove(); if (game.state === 'paused' && !document.getElementById('__tcard')) game.state = 'playing'; }, 1600);
      };
      row.append(d);
      return d;
    });
    const auto = document.createElement('label');
    auto.style.cssText = 'display:flex;gap:6px;align-items:center;cursor:pointer;color:#c8b27a';
    let on = false; try { on = localStorage.getItem('__tauto') === '1'; } catch {}
    auto.innerHTML = `<input type="checkbox" ${on ? 'checked' : ''}> 5초 뒤 자동으로 고르기 <span></span>`;
    const cb = auto.querySelector('input'), cnt = auto.querySelector('span');
    let left = 5;
    const timer = setInterval(() => { if (picked || !box.isConnected) return clearInterval(timer); if (!cb.checked) { left = 5; cnt.textContent = ''; return; } cnt.textContent = `(${left})`; if (left-- <= 0) { clearInterval(timer); els[Math.floor(Math.random() * 3)].click(); } }, 1000);
    cb.onchange = () => { try { localStorage.setItem('__tauto', cb.checked ? '1' : '0'); } catch {} };
    box.append(row, auto);
    document.body.append(box);
  };
  const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, '0')}초`; };
  const boss = () => {
    const w = g().world, p = w.player, a = Math.random() * Math.PI * 2;
    try { globalThis.__mpT?.spawn?.(w, T.boss, p.x + Math.cos(a) * 220, p.y + Math.sin(a) * 140, { rank: 'boss' }); } catch {}
  };
  // 시작: 던전 안에서 큐브의 보스 탑 버튼으로
  globalThis.__towerStart = (bossKind) => {
    const game = g(), w = game?.world;
    if (T || !w || game.state !== 'playing' || !globalThis.__towerOpen()) return false;
    T = { boss: bossKind, name: TOWERS.find((t) => t[0] === bossKind)[1], t0: Date.now(), kills0: w.kills, next: Date.now() + 90000, nextKills: w.kills + 1000, nextBoss: Date.now() + 20000, w, mul: { dmg: 1, taken: 1, life: 1, speed: 1 }, mf: 0, gold: 0, v: 0, log: [] };
    for (const e of w.enemies) globalThis.__towerBuff(e);
    game.hud?.banner?.(`${T.name} 탑 시작! 오래 버틸수록 몬스터가 세지고 카드가 좋아집니다`, 'unique');
    hud.style.display = 'block';
    return true;
  };
  const end = async () => {
    const t = T, ms = Date.now() - t.t0, p = t.set?.p;
    T = null;
    hud.style.display = 'none';
    if (p) { p.magicFind -= t.mf; p.goldGain -= t.gold; for (const [f] of FIELDS) if (p[f] === t.set.put[f]) p[f] = t.set.base[f]; p.life = Math.min(p.life, p.maxLife); }
    const s = g()?.save;
    if (s) { const b = (s.remodTower ??= {}); if (!(b[t.boss] > ms)) b[t.boss] = ms; globalThis.__saveNow?.(); }
    g()?.hud?.banner?.(`${t.name} 탑 끝: ${fmt(ms)} 버팀`, 'unique');
    if (globalThis.__towerTier() >= 100) await api('POST', '/tower', { boss: t.boss, time: ms, tier: globalThis.__towerTier() });
  };
  const hud = document.createElement('div');
  hud.style.cssText = 'display:none;position:fixed;left:50%;top:30px;transform:translateX(-50%);z-index:9500;padding:4px 16px;text-align:center;background:#000b;border:1px solid #8a6d3b;font:bold 15px sans-serif;color:#ffd27a;pointer-events:none;text-shadow:0 1px 0 #000';
  const put = () => document.body ? document.body.append(hud) : setTimeout(put, 200);
  put();
  setInterval(() => {
    if (!T) return;
    const game = g(), w = game?.world, p = w?.player;
    if (!w || w !== T.w || !p || p.life <= 0 || game.state === 'over' || game.state === 'camp' || game.state === 'menu') return void end();
    if (game.state !== 'playing') { T.t0 += 500; T.next += 500; T.nextBoss += 500; return; }
    applyBuffs();
    const left = Math.max(0, Math.ceil((T.next - Date.now()) / 1000)), kl = Math.max(0, T.nextKills - w.kills);
    // 위 줄: 진행. 아래 줄: 지금까지 고른 강화 합계(이번 판만). 그 아래: 고른 카드 기록
    const pc = (v) => `${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`, b = T.mul;
    const sum = [b.dmg !== 1 && `공격력 ${pc(b.dmg)}`, b.taken !== 1 && `받는 피해 ${pc(b.taken)}`, b.life !== 1 && `최대 생명력 ${pc(b.life)}`, b.speed !== 1 && `이동 속도 ${pc(b.speed)}`, T.mf && `매직 아이템 발견 +${T.mf}`, T.gold && `골드 +${T.gold}%`].filter(Boolean);
    hud.innerHTML = `<div>${T.name} 탑 · ${fmt(Date.now() - T.t0)} · 몬스터 ×${(3 * (1 + 0.2 * min())).toFixed(1)} · 다음 두루마리 ${left}초 / ${kl}킬</div><div style="font:13px sans-serif;color:#9f9">${sum.length ? `강화: ${sum.join(' · ')}` : '강화 없음'}</div><div style="font:12px sans-serif;color:#aaa">${T.log.length ? `연 두루마리(${T.log.length}): ${T.log.slice(-4).join(' / ')}` : ''}</div>`;
    if (Date.now() >= T.nextBoss) { T.nextBoss = Date.now() + 120000; boss(); }
    if (Date.now() >= T.next || w.kills >= T.nextKills) { T.next = Date.now() + 90000; T.nextKills = w.kills + 1000; cards(); }
  }, 500);
})();
