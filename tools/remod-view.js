// 함께 보기: 같은 대기방 사람을 내 화면(같은 마을·같은 막 던전)에 이름과 함께 그린다. 내 위치는 0.25초, 내 모습은 0.6초마다 서버로
(() => {
  const key = () => { try { return localStorage.getItem('d2s:key'); } catch { return null; } };
  const api = async (method, path, body) => {
    const k = key();
    if (!k) return null;
    const r = await globalThis.d2app?.leaderboard?.(method, method === 'GET' ? `${path}${path.includes('?') ? '&' : '?'}key=${k}` : path, body && JSON.stringify({ ...body, key: k }));
    try { return JSON.parse(r?.body ?? 'null'); } catch { return null; }
  };
  const live = () => { const g = globalThis.__gm; return g?.world?.player?.sprite && ['camp', 'playing'].includes(g.state) ? g : null; };
  // 같은 곳: 마을끼리, 던전은 같은 막끼리. ponytail: 던전 지형은 사람마다 따로 만들어져서 위치만 맞고 벽·몬스터는 다름. 같은 지형은 시드를 맞추는 다음 단계
  const place = (g) => (g.state === 'camp' ? 'camp' : `run:${g.world.act ?? 0}`);

  let lastImg = 0, sending = false, receiving = false;
  const snap = (g) => {
    try {
      const s = g.world.player.sprite, b = s.getLocalBounds();
      const c = g.app.renderer.extract.canvas({ target: s });
      return { img: c.toDataURL('image/webp', 0.8), ox: Math.round(b.x), oy: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    } catch { return null; }
  };
  const send = async () => {
    const g = live();
    if (!g || sending) return;
    sending = true;
    const p = g.world.player, body = { x: p.x, y: p.y, place: place(g), fx: p.facingX, cls: g.kit?.id, lvl: p.level, hp: p.life / p.maxLife };
    if (Date.now() - lastImg > 600) { lastImg = Date.now(); const s = snap(g); if (s) body.img = `${s.img}#${s.ox},${s.oy},${s.w},${s.h}`; }
    try { await api('POST', '/pos', body); } finally { sending = false; }
  };

  // 다른 사람: name → {node(컨테이너), body(모습 스프라이트), v, x, y, tx, ty}
  const ghosts = new Map();
  const canvasTexture = (g, canvas) => g.world.player.sprite.children[0].texture.constructor.from(canvas);
  const nameTag = (g, text) => {
    const c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = 'bold 13px sans-serif';
    c.width = Math.ceil(x.measureText(text).width) + 10; c.height = 18;
    x.font = 'bold 13px sans-serif'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#6f6'; x.fillText(text, 5, 9);
    const S = g.world.player.sprite.children[0].constructor, s = new S({ texture: canvasTexture(g, c) });
    s.x = -c.width / 2; s.y = -110;
    return s;
  };
  const loadLook = async (g, o, name, v) => {
    const raw = await api('GET', `/pos?img=${encodeURIComponent(name)}`);
    if (typeof raw !== 'string' || o.v === v) return;
    const [url, box] = raw.split('#'), [ox, oy, w, h] = (box ?? '0,0,0,0').split(',').map(Number);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w || img.width; c.height = h || img.height;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const S = g.world.player.sprite.children[0].constructor, s = new S({ texture: canvasTexture(g, c) });
      s.x = ox; s.y = oy; s.alpha = 0.9;
      o.body?.destroy();
      o.body = s;
      o.node.addChildAt(s, 0);
      o.v = v;
    };
    img.src = url;
  };
  const recv = async () => {
    const g = live();
    if (!g || receiving) { if (!g) for (const o of ghosts.values()) o.node.visible = false; return; }
    receiving = true;
    try {
      const list = (await api('GET', '/pos')) ?? [];
      drawParty(g, list);
      const here = place(g), parent = g.world.player.sprite.parent, C = g.world.player.sprite.constructor;
      const seen = new Set();
      for (const p of list) {
        if (p.place !== here) continue;
        seen.add(p.name);
        let o = ghosts.get(p.name);
        if (!o) {
          const node = new (Object.getPrototypeOf(parent).constructor)();
          o = { node, v: -1, x: p.x, y: p.y };
          ghosts.set(p.name, o);
        }
        // 이름표: [순위] 이름(5초마다 공포·던전 번갈아). 글이 바뀔 때만 다시 그림
        const tt = [globalThis.__rankLabel?.(p.name), globalThis.__tag?.(p.name) ?? p.name].filter(Boolean).join(' ');
        if (o.tt !== tt) { o.tag?.destroy({ texture: true, textureSource: true }); o.tag = nameTag(g, tt); o.node.addChild(o.tag); o.tt = tt; }
        if (o.node.parent !== parent) { parent.addChild(o.node); o.x = p.x; o.y = p.y; }
        o.tx = p.x; o.ty = p.y; o.node.visible = true;
        if (o.body) o.body.scale.x = 1;
        if (p.v !== o.v && !o.loading) { o.loading = true; loadLook(g, o, p.name, p.v).finally(() => { o.loading = false; }); }
        void C;
      }
      for (const [n, o] of ghosts) if (!seen.has(n)) { o.node.destroy({ children: true }); ghosts.delete(n); }
    } finally { receiving = false; }
  };
  // 파티 창: 왼쪽 위 초상화 아래에 같은 방 사람(직업·레벨·체력·어디 있는지). 같은 곳에 있으면 밝게
  const CLS = { amazon: '아마존', sorceress: '소서리스', necromancer: '네크로맨서', paladin: '팔라딘', barbarian: '바바리안', druid: '드루이드', assassin: '어쌔신' };
  const frame = document.createElement('div');
  frame.id = '__party';
  frame.style.cssText = 'position:fixed;left:8px;top:300px;z-index:99980;display:flex;flex-direction:column;gap:4px;pointer-events:none;font:12px sans-serif';
  const drawParty = (g, list) => {
    if (!frame.isConnected) document.body.append(frame);
    const here = place(g);
    // PvP 방: 파티는 우리 편만(결투는 없음)
    const pv = globalThis.__pvp?.();
    if (pv?.mode) list = list.filter((p) => pv.allies?.includes(p.name));
    frame.replaceChildren(...(list.length ? [Object.assign(document.createElement('div'), { textContent: `파티 (${list.length + 1}명)`, style: 'color:#d8b860;font-weight:bold;text-shadow:0 1px 0 #000' })] : []), ...list.map((p) => {
      const d = document.createElement('div'), same = p.place === here;
      d.style.cssText = `width:170px;padding:4px 6px;background:#000b;border:1px solid ${same ? '#8a6d3b' : '#3a3020'};opacity:${same ? 1 : 0.55}`;
      const hp = Math.round((p.hp ?? 0) * 100);
      d.innerHTML = `<div style="color:#6f6;white-space:nowrap;overflow:hidden">${p.name.replace(/[<>&]/g, '')}</div><div style="color:#ccc">${CLS[p.cls] ?? p.cls ?? ''} ${p.lvl ? 'Lv ' + p.lvl : ''} · ${p.place === 'camp' ? '마을' : (Number(p.place.slice(4)) + 1) + '막'}</div><div style="height:6px;background:#300;margin-top:3px"><div style="height:100%;width:${hp}%;background:${hp > 30 ? '#c22' : '#f60'}"></div></div>`;
      return d;
    }));
    frame.style.display = list.length ? 'flex' : 'none';
  };
  // 부드럽게 따라가기(0.25초 간격 위치 사이를 메움)
  const step = () => {
    for (const o of ghosts.values()) {
      if (o.tx === undefined) continue;
      o.x += (o.tx - o.x) * 0.25; o.y += (o.ty - o.y) * 0.25;
      o.node.x = o.x; o.node.y = o.y; o.node.zIndex = o.y;
    }
    requestAnimationFrame(step);
  };
  setInterval(send, 250);
  setInterval(recv, 250);
  requestAnimationFrame(step);
  globalThis.__mpGhosts = ghosts;
})();
