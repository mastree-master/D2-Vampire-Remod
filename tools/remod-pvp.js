// PvP(결투 1:1, 팀전 4:4, 길드전 8:8): 같은 PvP 방 적 편(서버가 A/B 로 나눔) 자리에 안 보이는 "맞는 대상"을 세워 내 스킬이 맞게 하고, 깎인 만큼 서버로 보내 상대 PC 가 자기 생명력에서 뺀다
// 죽으면 잠깐 뒤 그 자리에서 다시 살아나고(그동안 안 맞고 못 때림) 킬은 때린 편에. 판 규칙·승점은 서버 /pvp
// PvP 방에서는 일반 몹을 치워 PvP 에만 집중
// ponytail: 맞는 대상은 타락자(fallen1)를 빌려 씀. 1막 그림이 없는 곳이면 못 세울 수 있음
(() => {
  const DAMAGE = 0.25; // PvP 피해 배율. 해 보면서 조정
  // 한 번(0.1초)에 받는 PvP 피해는 내 최대 생명력의 1%까지: 공포 영역 캐릭터는 공격력이 수십만이라 배율만으로는 한 방에 끝남. 계속 맞아도 약 10초는 버팀
  const CAP = 0.01;
  const RESPAWN = { duel: 3e3, team: 3e3, guild: 5e3 }; // 죽은 뒤 다시 살아날 때까지
  const BIG = 1e9;
  // 길드전 경기장: 판 시작 자리(0,0) 기준 가로 1800·세로 900 안에서만. 양 끝에 편마다 성지(부활 자리), 그 앞에 타워 2개
  // 타워는 1초마다 사거리 안 적 편 한 명에게 최대 생명력 7%(회피·방어 없음). 성지·타워는 지나갈 수 없음
  const ARENA = { w: 900, h: 450 }, TOWER = { range: 260, every: 1e3, dmg: 0.07 }, BLOCK = 46;
  const SITES = { A: { base: [-800, 0], towers: [[-450, -160], [-450, 160]] }, B: { base: [800, 0], towers: [[450, -160], [450, 160]] } };
  const key = () => { try { return localStorage.getItem('d2s:key'); } catch { return null; } };
  const api = async (method, path, body) => {
    const k = key();
    if (!k) return null;
    const r = await globalThis.d2app?.leaderboard?.(method, method === 'GET' ? `${path}${path.includes('?') ? '&' : '?'}key=${k}` : path, body && JSON.stringify({ ...body, key: k }));
    try { return JSON.parse(r?.body ?? 'null'); } catch { return null; }
  };
  const T = () => globalThis.__mpT;
  let state = { mode: null }, busy = false, world = null, lastBy = null, seenLast = 0, kind0 = 'fallen1', deadUntil = 0, prevKills = 0;
  const dummies = new Map(); // 상대 이름 → 맞는 대상

  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;left:50%;top:44px;transform:translateX(-50%);z-index:99980;display:none;padding:6px 18px;background:#000c;border:1px solid #8a6d3b;color:#e8d8a8;font:18px "D2 Exocet","D2R Kodia",serif;text-align:center;pointer-events:none;white-space:pre-line';
  // 큰 문구는 한 번에 하나: 새 문구가 오면 앞 문구를 바꿔 씀(겹치지 않게)
  const big = document.createElement('div');
  big.style.cssText = 'position:fixed;left:50%;top:30%;transform:translateX(-50%);z-index:99981;font:bold 44px "D2 Exocet","D2R Kodia",serif;text-shadow:0 0 16px #000,0 2px 0 #000;pointer-events:none;white-space:nowrap';
  let bigT = 0;
  const banner = (t, color = '#ffd870') => { if (!big.isConnected) document.body.append(big); big.textContent = t; big.style.color = color; big.style.display = ''; clearTimeout(bigT); bigT = setTimeout(() => (big.style.display = 'none'), 2500); };
  // 다대다 대장: 판 시작 전(아무도 안 졌을 때) 우리 편 순번 정하기. 이름 누르면 한 칸 위로
  const ord = document.createElement('div');
  ord.style.cssText = 'position:fixed;right:12px;top:120px;z-index:99980;display:none;padding:8px 12px;background:#000c;border:1px solid #8a6d3b;color:#e8d8a8;font:16px "D2R Kodia",sans-serif';
  let ordKey = '';
  const drawOrd = (list) => {
    if (list.join() === ordKey) return;
    ordKey = list.join();
    ord.replaceChildren(Object.assign(document.createElement('div'), { textContent: '순번 (누르면 위로)', style: 'color:#c7a24a;margin-bottom:4px' }));
    list.forEach((n, i) => { const b = document.createElement('div'); b.textContent = `${i + 1}. ${n.split('#')[0]}`; b.style.cssText = 'cursor:pointer;padding:2px 0'; b.onclick = () => { if (!i) return; const l = [...list]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; api('POST', '/pvp', { act: 'order', to: l }); }; ord.append(b); });
  };
  addEventListener('DOMContentLoaded', () => document.body.append(hud, ord));
  if (document.body) document.body.append(hud, ord);

  // 상대마다 맞는 대상 하나: 이 판 몬스터 종류를 빌려 만들고, 안 보이게·안 때리게·안 움직이게, 생명력은 아주 크게
  const dummyFor = (w, name) => {
    let e = dummies.get(name);
    if (e && !e.dead && w.enemies.includes(e)) return e;
    if (!kind0 || !T()) return null;
    try { e = T().spawn(w, kind0, w.player.x, w.player.y, {}); } catch { return null; }
    if (!e) return null;
    Object.assign(e, { __pvp: name, maxLife: BIG, life: BIG, damage: 0, speed: 0, xp: 0 });
    if (e.sprite) e.sprite.visible = false;
    dummies.set(name, e);
    return e;
  };
  // 치운 몹·맞는 대상은 그림을 없애지 않고 화면에서만 뺀다: 얼음 등 효과가 아직 붙잡고 있으면 게임이 그 그림 위치를 계속 고침(없애면 멈춤)
  const unshow = (e) => e.sprite?.parent?.removeChild(e.sprite);
  const clearDummies = () => { for (const e of dummies.values()) unshow(e); if (world) world.enemies = world.enemies.filter((e) => !e.__pvp); dummies.clear(); };

  // 쓰러짐: 잠깐 무적·공격 못 함, 길드전은 우리 성지에서 다시 시작. from '@tower' 는 적 타워
  const die = async (p, from) => {
    p.life = p.maxLife; deadUntil = Date.now() + RESPAWN[state.mode];
    if (state.mode === 'guild') [p.x, p.y] = home();
    banner(from === '@tower' ? '적 타워에 쓰러졌습니다' : `${from.split('#')[0]} 에게 쓰러졌습니다`, '#ff6050');
    const r = await api('POST', '/pvp', { act: 'die', by: from });
    if (r?.last) state.last = r.last;
  };
  // 준비: PvP 방은 마을에서 모두 [준비]를 누르면(누가 눌렀는지 ✓) 3초 뒤 같이 경기장(던전)으로. 판이 끝나면 3초 뒤 마을로 돌아와 다시 준비
  const rp = document.createElement('div');
  rp.style.cssText = 'position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:99982;display:none;min-width:320px;padding:12px 18px;background:radial-gradient(ellipse at top,#231d12,#0a0806 70%);border:3px ridge #8a6d3b;box-shadow:0 0 0 2px #000,0 0 30px #000;color:#e8d8a8;font:16px "D2R Kodia",sans-serif;text-align:center';
  const MODE_KO = { duel: '결투', team: '다대다', guild: '길드전' };
  let going = false, wasLive = false, leaving = false, readyKey = '';
  const drawReady = (s) => {
    const me = s.players.find((n) => s.team[n] === s.my && !s.allies.includes(n)), mine = !!s.ready?.[me];
    const k = JSON.stringify([s.players, s.team, s.ready, s.go != null && Math.ceil(s.go / 1e3)]);
    if (k === readyKey) return;
    readyKey = k;
    const row = (n) => `<div style="color:${s.ready?.[n] ? '#7e7' : '#8a8478'}">${s.ready?.[n] ? '✓' : '…'} ${n.split('#')[0]}${n === me ? ' (나)' : ''}</div>`;
    const team = (t, label, col) => `<div style="flex:1"><div style="color:${col};margin-bottom:4px">${label}</div>${s.players.filter((n) => s.team[n] === t).map(row).join('') || '<div style="color:#555">-</div>'}</div>`;
    rp.innerHTML = `<div style="font:bold 20px 'D2 Exocet','D2R Kodia',serif;color:#d8b860;margin-bottom:8px">${MODE_KO[s.mode]} 준비</div>`
      + `<div style="display:flex;gap:24px;text-align:left">${team(s.my, '우리 편', '#7e7')}${team(s.my === 'A' ? 'B' : 'A', '상대 편', '#f77')}</div>`
      + `<div style="margin-top:8px;color:#ffd870;min-height:20px">${s.go != null ? `${Math.ceil(s.go / 1e3)}초 뒤 경기장으로!` : s.players.length < 2 ? '상대를 기다리는 중' : '모두 준비하면 3초 뒤 시작'}</div>`;
    const b = document.createElement('button');
    b.textContent = mine ? '준비 취소' : '준비';
    b.style.cssText = 'margin-top:8px;width:220px;height:40px;border:0;cursor:pointer;font:bold 20px "D2R Kodia",sans-serif;letter-spacing:3px;color:#141414;background:url(/d2/frontend/button-wide.png) center/100% 100% no-repeat';
    b.onclick = (e) => { e.stopPropagation(); readyKey = ''; api('POST', '/pvp', { act: 'ready', to: !mine }); };
    rp.append(b);
  };
  setInterval(async () => {
    const g = globalThis.__gm;
    if (g?.state !== 'camp') { rp.style.display = 'none'; return; }
    const s = await api('GET', '/pvp');
    if (!s?.mode) { rp.style.display = 'none'; going = false; return; }
    if (!rp.isConnected) document.body.append(rp);
    rp.style.display = '';
    drawReady(s);
    if (s.live && !going && g.kit) { going = true; rp.style.display = 'none'; g.startRun(g.kit, 'normal'); } // 판이 열림: 경기장으로
  }, 300);
  // 판 안: 판이 끝나(live 꺼짐) 결과 문구를 보여 준 뒤 3초 뒤 마을로
  const backToTown = (g) => {
    if (leaving) return;
    leaving = true;
    setTimeout(() => {
      leaving = false; wasLive = false; going = false;
      if (g.state !== 'paused') g.pause();
      g.exitAsked = true; globalThis.__leaveTo = 'town'; g.leaveRun();
    }, 3e3);
  };
  const tick = async () => {
    const g = globalThis.__gm;
    if (busy || !g?.world || g.state !== 'playing') return;
    busy = true;
    try {
      state = (await api('GET', '/pvp')) ?? { mode: null };
      globalThis.__pvpMode = state.mode;
      const w = g.world, p = w.player;
      if (w !== world) { clearDummies(); clearMarks(); world = w; }
      const canOrd = state.mode === 'team' && state.cap && !Object.keys(state.out ?? {}).length;
      ord.style.display = canOrd ? '' : 'none';
      if (!state.mode) { if (dummies.size) clearDummies(); hud.style.display = 'none'; return; }
      if (state.live) wasLive = true; else if (wasLive) backToTown(g);
      if (canOrd) drawOrd(state.order[state.my]);
      for (const [name, e] of dummies) if (!state.foes.includes(name)) { unshow(e); w.enemies = w.enemies.filter((x) => x !== e); dummies.delete(name); }
      const now = Date.now(), dead = now < deadUntil;
      if (dead) p.life = p.maxLife;
      // 내가 상대에게 준 피해 보내기(죽어 있는 동안은 안 보냄)
      for (const [name, e] of dummies) {
        const dealt = BIG - e.life;
        e.life = BIG;
        if (dealt > 0 && !dead && state.foes.includes(name)) api('POST', '/pvp', { act: 'hit', to: name, dmg: dealt * DAMAGE });
      }
      // 내가 맞은 피해: 죽을 만큼이면 다시 살아나고 킬은 마지막에 때린 사람에게
      const per = {};
      if (!dead) for (const [from, d] of state.hits ?? []) per[from] = (per[from] ?? 0) + d;
      for (const [from, total] of Object.entries(per)) {
        const dmg = Math.min(total, p.maxLife * CAP);
        lastBy = from;
        if (p.life - dmg > 0) { p.life -= dmg; continue; }
        await die(p, from);
        break;
      }
      const my = state.my, op = my === 'A' ? 'B' : 'A', me = state.players.find((n) => state.team[n] === my && !state.allies.includes(n));
      // 결투는 한 판 끝날 때마다 둘 다 생명력 가득
      const kills = (state.kills?.A ?? 0) + (state.kills?.B ?? 0);
      if (kills > prevKills && state.mode === 'duel') p.life = p.maxLife;
      prevKills = kills;
      if (state.last && state.last.t > seenLast) {
        if (seenLast) {
          if (state.last.win.includes(me)) banner('승리! 아레나 승점 +10');
          else if (state.last.lose.includes(me)) banner('패배 · 아레나 승점 -5', '#ff6050');
          else banner('무승부', '#c0c0c0');
        }
        seenLast = state.last.t; p.life = p.maxLife; deadUntil = 0;
      }
      const nm = (ns) => ns.map((n) => n.split('#')[0]).join(', '), kd = state.kd?.[me] ?? { k: 0, d: 0 };
      const score = `우리 편 ${state.kills?.[my] ?? 0} : ${state.kills?.[op] ?? 0} 적 편`;
      const left = state.left != null ? `${Math.floor(state.left / 60e3)}:${String(Math.floor(state.left / 1e3) % 60).padStart(2, '0')}` : '';
      hud.style.display = '';
      hud.textContent = state.mode === 'duel' ? `결투 ${{ 1: '단판', 3: '3판 2선승', 5: '5판 3선승' }[state.rounds]} · 나 ${state.kills?.[my] ?? 0} : ${state.kills?.[op] ?? 0} ${nm(state.foes) || '상대 기다리는 중'}`
        : state.mode === 'team' ? `팀전 ${state.split === 'solo' ? '각자 대결' : '승자독식'} · ${state.foes.length ? `상대 ${nm(state.foes)}` : state.out?.[me] ? '끝남 · 관전 중' : '차례 기다리는 중'} · 남은 우리 ${state.order[my].filter((n) => !state.out[n]).length} : ${state.order[op].filter((n) => !state.out[n]).length} 적`
        : `길드전 · ${score} · 남은 시간 ${left || '상대 기다리는 중'} · 내 ${kd.k}킬 ${kd.d}데스`;
      if (state.mode !== 'duel') hud.textContent += `\n우리: ${nm(state.allies) || '-'} / 적: ${nm(state.foes) || '-'}`;
      if (dead) hud.textContent += `\n부활까지 ${Math.ceil((deadUntil - now) / 1e3)}초`;
    } finally { busy = false; }
  };
  const marks = [];
  let placed = null, marked = false;
  const home = () => SITES[state.my].base.map((v, i) => v + (i ? 0 : state.my === 'A' ? 60 : -60)); // 우리 성지 바로 앞
  let towerAt = 0;
  // 성지 = 1막 성소, 타워 = 사막 오벨리스크(D2 그림 /d2/scenery). 발밑에 편 색 원(초록 우리, 빨강 적)
  let art = null;
  const loadArt = () => (art ??= (async () => {
    const j = await (await fetch('/d2/scenery.json')).json(), pic = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = '/d2/' + src; });
    const ob = j.sets.desert.kinds.find((k) => k.name === 'obelisk').props[0];
    return { base: [await pic(j.acts[1].pages[0]), j.acts[1].shrines[0].NU], tower: [await pic(j.sets.desert.pages[ob.page]), ob] };
  })());
  const mark = async (g, x, y, kind, color) => {
    const [im, a] = (await loadArt())[kind], c = document.createElement('canvas');
    c.width = Math.max(a.frameWidth, 80); c.height = a.frameHeight + 12;
    const t = c.getContext('2d'), ox = (c.width - a.frameWidth) / 2;
    t.fillStyle = color; t.globalAlpha = 0.4; t.beginPath(); t.ellipse(ox + a.originX, a.originY, 38, 13, 0, 0, 7); t.fill(); t.globalAlpha = 1;
    t.drawImage(im, a.x, a.y, a.frameWidth, a.frameHeight, ox, 0, a.frameWidth, a.frameHeight);
    const P = g.world.player.sprite, S = P.children[0].constructor, sp = new S({ texture: P.children[0].texture.constructor.from(c) });
    sp.x = x - ox - a.originX; sp.y = y - a.originY; sp.zIndex = y; P.parent.addChild(sp); marks.push(sp);
  };
  // 경기장 테두리: 바닥에 금색 선, 맨 아래 깔림
  const border = (g) => {
    const c = document.createElement('canvas'); c.width = ARENA.w * 2 + 8; c.height = ARENA.h * 2 + 8;
    const t = c.getContext('2d'); t.strokeStyle = '#d8b860'; t.globalAlpha = 0.8; t.lineWidth = 4; t.setLineDash([24, 12]); t.strokeRect(4, 4, ARENA.w * 2, ARENA.h * 2);
    const P = g.world.player.sprite, S = P.children[0].constructor, sp = new S({ texture: P.children[0].texture.constructor.from(c) });
    sp.x = -ARENA.w - 4; sp.y = -ARENA.h - 4; sp.zIndex = -1e9; P.parent.addChild(sp); marks.push(sp);
  };
  const clearMarks = () => { marked = false; for (const m of marks.splice(0)) m.destroy(); };
  // 길드전: 경기장 밖으로 못 나가고, 성지·타워에 막히고, 적 타워에 맞음
  const arena = (g, w, p, now, dead) => {
    if (!marked) border(g);
    if (!marked) for (const t of ['A', 'B']) { marked = true; const col = t === state.my ? '#3c6' : '#d33'; mark(g, ...SITES[t].base, 'base', col); for (const xy of SITES[t].towers) mark(g, ...xy, 'tower', col); }
    p.x = Math.max(-ARENA.w, Math.min(ARENA.w, p.x)); p.y = Math.max(-ARENA.h, Math.min(ARENA.h, p.y));
    for (const t of ['A', 'B']) for (const [x, y] of [SITES[t].base, ...SITES[t].towers]) {
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy);
      if (d < BLOCK) { const k = BLOCK / (d || 1); p.x = x + (d ? dx * k : BLOCK); p.y = y + dy * k; }
    }
    const op = state.my === 'A' ? 'B' : 'A';
    if (!dead && now - towerAt >= TOWER.every && SITES[op].towers.some(([x, y]) => Math.hypot(p.x - x, p.y - y) < TOWER.range)) {
      towerAt = now;
      document.body.animate([{ boxShadow: 'inset 0 0 80px #f00' }, { boxShadow: 'inset 0 0 0 #f00' }], 300);
      if (p.life - p.maxLife * TOWER.dmg <= 0) return 'tower'; // 게임이 먼저 죽음 처리하지 않게 깎기 전에 판정
      p.life -= p.maxLife * TOWER.dmg;
    }
  };
  // 맞는 대상을 매 프레임 상대 모습(함께 보기 __mpGhosts) 자리로. 상대가 같은 곳에 없으면 멀리 치움
  const follow = () => {
    requestAnimationFrame(follow);
    const w = globalThis.__gm?.world;
    if (!state.mode || !w || w !== world) return;
    // 일반 몹 치우기: 처치가 아니라 빼기만 해서 경험치·떨굼 없음. 맞는 대상은 타락자(fallen1) 모양을 빌림
    if (state.mode === 'guild' && state.my && placed !== w) { placed = w; [w.player.x, w.player.y] = home(); }
    if (state.mode === 'guild') { if (arena(globalThis.__gm, w, w.player, Date.now(), Date.now() < deadUntil) === 'tower') die(w.player, '@tower'); } else if (marks.length) clearMarks();
    if (w.enemies.some((e) => !e.__pvp)) { for (const e of w.enemies) if (!e.__pvp) { unshow(e); } w.enemies = w.enemies.filter((e) => e.__pvp); }
    for (const name of state.foes ?? []) {
      const o = globalThis.__mpGhosts?.get(name);
      let e = dummyFor(w, name);
      // 얼리기(얼음 화살 등)에 걸리면 게임이 그 자리에 붙잡아 둠: 옮긴 자리에서 8 넘게 벗어나 있으면 새로 세움(부딪혀 조금 밀린 건 괜찮음)
      if (e?.__want && Math.hypot(e.x - e.__want[0], e.y - e.__want[1]) > 8) { unshow(e); w.enemies = w.enemies.filter((x) => x !== e); dummies.delete(name); e = dummyFor(w, name); }
      if (!e) continue;
      if (o?.node?.visible && o.x !== undefined) { e.x = o.x; e.y = o.y; } else { e.x = 1e7; e.y = 1e7; }
      e.__want = [e.x, e.y];
      e.speed = 0; e.damage = 0;
    }
  };
  requestAnimationFrame(follow);
  setInterval(tick, 100);
  globalThis.__pvp = () => ({ ...state, dummies: dummies.size, lastBy });
})();
