// 레저렉션 입자 효과(PopcornFX 재현 엔진)를 게임 탄에 붙임: 효과가 있는 탄은 원래 그림을 숨기고, 게임 화면 위 투명 캔버스(따로 띄운 Pixi)에 그린다
// 자료: app://game/d2/pkfx/(<효과>.json 묶음, <모델>.json, D2R 텍스처 png). 없으면 아무것도 안 함(레거시 그대로)
(() => {
  const FX = { fireball: 'fireball' }; // 탄 그림 열쇠 → 효과 묶음 이름
  const base = globalThis.__pkfxBase ?? 'app://game/d2/pkfx/';
  let P2 = null, app = null, cv = null, T = {}, keyOf = new Map(), artN = -1, last = performance.now(), state = 'idle';
  const live = new Map(); // 탄 → 효과
  const hd = (p, ext) => base + 'hd/' + p.toLowerCase().replace(/^data\/hd\//, '').replace(/\.(texture|model)$/, ext);
  const start = async (gameCanvas) => {
    state = 'loading';
    try {
      P2 = globalThis.__PIXI2;
      cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;pointer-events:none;z-index:5';
      document.body.appendChild(cv);
      app = new P2.Application(); await app.init({ canvas: cv, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: devicePixelRatio, width: 8, height: 8 });
      const io = { tex: (p) => P2.Assets.load(hd(p, '.png')), mesh: (p) => fetch(base + p.split('/').pop().replace(/\.model$/i, '').toLowerCase() + '.json').then((r) => r.json()) };
      for (const name of new Set(Object.values(FX))) {
        const pack = await fetch(base + name + '.json').then((r) => r.ok ? r.json() : null).catch(() => null);
        if (pack) T[name] = await PKFXE.load(P2, pack, io);
      }
      state = Object.keys(T).length ? 'ready' : 'off';
    } catch (e) { console.warn('[pkfx]', e); state = 'off'; }
  };
  // 게임 캔버스는 한 번 찾아 기억(매 프레임 전체 검색은 F2 창처럼 요소가 많을 때 렉)
  let gcKeep = null;
  const gameCanvas = () => (gcKeep?.isConnected && gcKeep.width > 300 ? gcKeep : (gcKeep = [...document.querySelectorAll('canvas')].find((c) => c !== cv && c.width > 300)));
  const gen = globalThis.__pkfxGen = (globalThis.__pkfxGen ?? 0) + 1;
  const step = (now) => {
    if (gen !== globalThis.__pkfxGen) return;
    requestAnimationFrame(step);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const gm = globalThis.__gm, w = gm?.world;
    if (state === 'idle') { if (w && globalThis.__PIXI2 && globalThis.PKFXE) { const gc = gameCanvas(); if (gc) start(gc); } return; }
    if (state !== 'ready') return;
    // 게임 캔버스에 겹치기
    const gc = gameCanvas();
    if (!gc || !w) { cv.style.display = 'none'; return; }
    const r = gc.getBoundingClientRect();
    cv.style.display = ''; cv.style.left = r.left + 'px'; cv.style.top = r.top + 'px';
    if (app.renderer.width !== Math.round(r.width) || app.renderer.height !== Math.round(r.height)) app.renderer.resize(Math.round(r.width), Math.round(r.height));
    const arts = gm.art?.missiles ?? {};
    if (Object.keys(arts).length !== artN) { artN = Object.keys(arts).length; keyOf = new Map(Object.entries(arts).map(([k, v]) => [v, k])); }
    const playing = gm.state === 'playing', seen = new Set();
    for (const o of [...(w.projectiles ?? []), ...(w.missiles ?? [])]) {
      const spr = o.sprite, key = spr && keyOf.get(o.anim), name = key && FX[key];
      if (!name || !T[name] || o.dead || spr.destroyed || !spr.parent) continue;
      seen.add(o); spr.alpha = 0;
      // 탄 화면 자리(게임 캔버스 CSS 화소). 확대 = 그림의 세계 배율
      const g = spr.getGlobalPosition(), sx = gc.width / r.width, x = g.x / sx, y = g.y / sx, zoom = Math.abs(spr.worldTransform.a) / sx;
      let L = live.get(o);
      if (!L) {
        const vx = o.vx ?? 1, vy = o.vy ?? 0, v = Math.hypot(vx, vy) || 1, d = [vx / v, vy / v];
        L = { o, ox: x, oy: y, d }; const k = (globalThis.__pkfxK ?? 16) * zoom;
        const scr = (p) => [L.ox + (d[0] * p[0] - d[1] * p[1] * 0.5) * k, L.oy + (d[1] * p[0] + d[0] * p[1] * 0.5) * k - p[2] * k];
        scr.k = k; L.k = k; L.fx = T[name].make(app.stage, scr); live.set(o, L);
      }
      L.fx.effect.x = Math.hypot(x - L.ox, y - L.oy) / L.k; L.age = 0;
    }
    for (const [o, L] of live) {
      if (!seen.has(o) && L.fx.effect.run) L.fx.effect.run = 0; // 탄이 사라지면 효과를 멈추고 남은 입자만 마저
      if (playing) L.fx.tick(dt);
      if (!L.fx.effect.run && ((L.age = (L.age ?? 0) + dt) > 1.5 || L.fx.done())) { L.fx.destroy(); live.delete(o); }
    }
  };
  requestAnimationFrame(step);
})();
