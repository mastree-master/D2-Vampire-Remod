// 파티 전투: 방장 PC 가 몬스터를 계산하고, 파티원 PC 는 방장 몬스터를 똑같이 만들어 같이 싸운다(0.1초마다 서버로 주고받음)
// 방장: 몬스터 목록(snap)을 올리고, 파티원이 보낸 피해를 자기 몬스터에 넣는다
// 파티원: 자기 던전 몬스터는 지우고 방장 몬스터를 만든다. 내가 준 피해는 방장에게 보내고, 방장 쪽에서 죽은 몬스터는 내 쪽에서도 죽인다(경험치·드롭은 각자)
// ponytail: 방장 몬스터는 방장만 쫓아감(파티원은 자기 화면 몬스터에게만 맞음). 몬스터가 파티원도 노리게 하는 건 다음 단계
(() => {
  const key = () => { try { return localStorage.getItem('d2s:key'); } catch { return null; } };
  const api = async (method, path, body) => {
    const k = key();
    if (!k) return null;
    const r = await globalThis.d2app?.leaderboard?.(method, method === 'GET' ? `${path}?key=${k}` : path, body && JSON.stringify({ ...body, key: k }));
    try { return JSON.parse(r?.body ?? 'null'); } catch { return null; }
  };
  const ids = new WeakMap();
  let hard = false, size = 1, nextId = 1, busy = false, role = 'solo', world = null, sent = 0, applied = 0;
  const idOf = (e) => { let i = ids.get(e); if (!i) ids.set(e, (i = nextId++)); return i; };
  const fight = (e) => !e.dead && e.rank !== 'breakable' && !e.retiring && !e.__pvp;
  const T = () => globalThis.__mpT; // { spawn: Zm, hit: M }
  // 공용 드롭: 파티(2명 이상)에서 몬스터 드롭은 방장 것만 서버로 보내 떨어지는 순간 주사위(1~999, 같은 숫자 없음).
  // 이긴 사람 발밑에만 떨어져 자동줍기로 인벤에 들어감. 다른 사람에게는 안 생기고, 결과는 방 채팅
  // 파티원 자기 화면 몬스터 드롭은 버림(같은 템이 사람 수만큼 생기지 않게). 상자·퀘스트·열쇠·장기·성소 등은 각자
  const PERSONAL = new Set(['chest', 'actBossQuest', 'key', 'organ', 'codex', 'shrine', 'finale', 'clone', 'frozenArmor', 'hell', 'breakable', 'party']);
  const lootQ = [];
  globalThis.__mpLoot = (w, item, src) => {
    if (role === 'solo' || size < 2 || PERSONAL.has(src) || globalThis.__pvpMode) return false;
    if (role === 'host') lootQ.push({ item, ko: String((() => { try { return globalThis.__nm?.(item); } catch { return null; } })() ?? globalThis.__ko?.(item.name ?? item.base) ?? item.name) });
    return true;
  };

  // 파티원 쪽 몬스터: 방장 id → 내 몬스터, 그리고 내가 이미 보낸 체력(그 아래로 떨어진 만큼이 내 피해)
  const mine = new Map(), sentLife = new Map();
  const guestApply = (g, snap) => {
    const w = g.world;
    if (w !== world) { world = w; mine.clear(); sentLife.clear(); }
    // 내 던전이 스스로 만든 싸움 몬스터는 치운다(방장 몬스터만 남김)
    for (const e of w.enemies) if (fight(e) && !e.__mp) { e.sprite?.destroy?.(); e.__gone = true; }
    w.enemies = w.enemies.filter((e) => !e.__gone);
    const live = new Set();
    const hits = [];
    for (const [id, kind, x, y, life, max, rank] of snap.e) {
      live.add(id);
      let e = mine.get(id);
      if (!e || e.dead) {
        // 내가 죽인 몬스터: 남은 체력만큼 한 번 보내서 방장 쪽도 죽게 한다
        if (e?.dead) { if (!e.__told) { e.__told = true; hits.push([id, Math.max(1, sentLife.get(id) ?? life)]); } continue; }
        try { e = T().spawn(w, kind, x, y, { rank }); } catch { continue; }
        if (!e) continue;
        e.__mp = id; e.maxLife = max; e.life = life;
        mine.set(id, e); sentLife.set(id, life);
      }
      // 내가 깎은 만큼 방장에게 보내고, 체력은 방장 값과 내 값 중 낮은 쪽
      const dealt = (sentLife.get(id) ?? life) - e.life;
      if (dealt > 0) hits.push([id, dealt]);
      const now = Math.min(life, e.life);
      sentLife.set(id, now);
      e.life = now;
      // 위치는 매 프레임 방장 위치로 부드럽게(아래 smooth)
      e.__tx = x; e.__ty = y;
    }
    // 방장 쪽에서 사라진(죽은) 몬스터는 내 쪽에서도 죽인다 → 내 경험치·드롭
    for (const [id, e] of mine) if (!live.has(id)) { if (!e.dead) try { T().hit(w, e, 1e9); } catch {} mine.delete(id); sentLife.delete(id); }
    return hits;
  };
  const hostApply = (g, hits) => {
    const w = g.world, byId = new Map();
    for (const e of w.enemies) if (fight(e)) byId.set(idOf(e), e);
    for (const [id, dmg] of hits) {
      const e = byId.get(id);
      if (!e || e.dead) continue;
      applied++;
      if (dmg >= e.life) { try { T().hit(w, e, 1e9); } catch {} } else e.life -= dmg;
    }
  };
  const tick = async () => {
    const g = globalThis.__gm;
    if (busy || !g?.world || g.state !== 'playing' || !T() || globalThis.__pvpMode) { role = 'solo'; return; }
    busy = true;
    try {
      const r = await api('GET', '/party');
      role = r?.role ?? 'solo';
      for (const it of r?.drops ?? []) { const p = g.world.player; globalThis.__K_?.(g.world, it, p.x, p.y, false, 'party'); }
      hard = role !== 'solo' && !!r?.hard;
      size = role === 'solo' ? 1 : Math.max(1, Math.min(4, r?.size ?? 1));
      if (role === 'host') {
        if (r.hits?.length) hostApply(g, r.hits);
        const e = g.world.enemies.filter(fight).slice(0, 300).map((e) => [idOf(e), e.kind, Math.round(e.x), Math.round(e.y), Math.round(e.life * 10) / 10, e.maxLife, e.rank]);
        await api('POST', '/party', { snap: { act: g.world.act, e }, ...lootQ.length && { loot: lootQ.splice(0, 50) } });
      } else if (role === 'guest' && r.snap && r.snap.act === g.world.act) {
        const hits = guestApply(g, r.snap);
        if (hits.length) { sent += hits.length; await api('POST', '/party', { hits }); }
      }
    } finally { busy = false; }
  };
  // 파티원: 몬스터를 매 프레임 방장 위치 쪽으로 당김(0.1초 소식 사이 끊김 줄이기)
  const smooth = () => {
    const g = globalThis.__gm;
    if (role === 'guest' && g?.world) for (const e of mine.values()) if (!e.dead && e.__tx !== undefined) { e.x += (e.__tx - e.x) * 0.35; e.y += (e.__ty - e.y) * 0.35; }
    requestAnimationFrame(smooth);
  };
  requestAnimationFrame(smooth);
  // 방장: 몬스터마다 방장과 파티원 중 가까운 쪽을 노리게 한다(파티원 위치는 함께 보기 __mpGhosts). 파티원 몫의 피해는 가짜 목표가 받아 방장은 안 다침
  const decoys = new Map();
  globalThis.__mpTarget = (w, m) => {
    if (role !== 'host') return null;
    const p = w.player;
    let best = null, bd = (p.x - m.x) ** 2 + (p.y - m.y) ** 2;
    for (const [n, o] of globalThis.__mpGhosts ?? []) {
      if (!o.node?.visible || o.tx === undefined) continue;
      const d = (o.x - m.x) ** 2 + (o.y - m.y) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    if (!best) return null;
    const o = globalThis.__mpGhosts.get(best);
    let d = decoys.get(best);
    if (!d) { d = Object.create(p); decoys.set(best, d); }
    d.x = o.x; d.y = o.y; d.life = p.maxLife; d.dead = false;
    return d;
  };
  // 파티 어려움 모드(방 만들 때 고름): 몬스터 체력 2.5배·공격 1.8배·받는 피해 0.8배, 경험치 2배, 골드·매찬 +150
  const HARD = { life: 2.5, damage: 1.8, resist: 0.8, xp: 2, gold: 150, mf: 150 };
  // 인원 보정(원작 /players 처럼): 한 명 늘 때마다 몬스터 체력 +50%, 경험치 +30%. 어려움 모드는 그 위에 곱함
  globalThis.__mpBuff = (e) => {
    globalThis.__mapBuff?.(e); // 공포의 지도(remod-map.js)
    globalThis.__towerBuff?.(e); // 보스 탑(remod-tower.js)
    if (size < 2 || e.rank === 'breakable' || e.__hard) return;
    e.__hard = true;
    const n = size - 1;
    e.maxLife *= 1 + 0.5 * n; e.life *= 1 + 0.5 * n; e.xp *= 1 + 0.3 * n;
    if (hard) { e.maxLife *= HARD.life; e.life *= HARD.life; e.damage *= HARD.damage; e.resist *= HARD.resist; e.xp *= HARD.xp; }
  };
  let boosted = null;
  setInterval(() => {
    const p = globalThis.__gm?.world?.player;
    if (!p) return;
    const want = hard ? p : null;
    if (boosted && boosted !== want) { boosted.magicFind -= HARD.mf; boosted.goldGain -= HARD.gold; boosted = null; }
    if (want && !boosted) { p.magicFind += HARD.mf; p.goldGain += HARD.gold; boosted = p; }
  }, 500);
  setInterval(tick, 100);
  globalThis.__party = () => ({ role, hard, mine: mine.size, sent, applied });
})();
