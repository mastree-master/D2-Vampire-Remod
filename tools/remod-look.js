// 지금 캐릭터가 입은 장비 모습(heroLook 의 서 있는 동작 NU 레이어들)을 한 줄 그림으로 합쳐 캐릭터별로 저장. 캐릭터 선택·대기실이 이걸 그린다
(() => {
  const DIR = 4; // 16방향 중 정면(아래)
  // 레이어(다리·몸통·팔·방패·머리·무기…)를 원작 그리기 순서대로 겹쳐 프레임마다 한 장씩, 가로로 이어 붙인다
  const bake = () => {
    const g = globalThis.__gm, nu = g?.heroLook?.anims?.NU, ex = g?.app?.renderer?.extract;
    if (!nu || !ex) return null;
    const n = nu.framesPerDirection, order = nu.order[DIR], parts = [];
    for (let f = 0; f < n; f++) for (let s = 0; s < 9; s++) {
      const layer = nu.layers[order[s]], fr = layer?.frames?.[DIR * n + f];
      if (fr?.texture) parts.push({ f, fr, blend: layer.blend });
    }
    if (!parts.length) return null;
    const cv = new Map();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of parts) {
      const c = cv.get(p.fr.texture) ?? ex.canvas(p.fr.texture);
      cv.set(p.fr.texture, c);
      p.c = c;
      x0 = Math.min(x0, p.fr.x); y0 = Math.min(y0, p.fr.y); x1 = Math.max(x1, p.fr.x + c.width); y1 = Math.max(y1, p.fr.y + c.height);
    }
    const w = x1 - x0, h = y1 - y0, out = document.createElement('canvas');
    out.width = w * n; out.height = h;
    const ctx = out.getContext('2d');
    for (const p of parts) { ctx.globalCompositeOperation = p.blend ? 'lighter' : 'source-over'; ctx.drawImage(p.c, p.f * w + p.fr.x - x0, p.fr.y - y0); }
    // 발밑(원점 0,0)이 그림 안 어디인지 같이 둔다
    return { png: out.toDataURL(), w, h, frames: n, fps: nu.fps ?? 10, ox: -x0, oy: -y0 };
  };
  let last = null;
  setInterval(() => {
    const g = globalThis.__gm, id = globalThis.__remodChar?.key;
    if (!id || !['camp', 'playing'].includes(g?.state) || g.lookVersion === last) return;
    if (globalThis.__remodChar?.id && g.kit?.id && g.kit.id !== globalThis.__remodChar.id) return; // 고른 캐릭터와 지금 직업이 다르면(바뀌는 중 등) 남의 모습을 저장하지 않음
    const look = bake();
    if (!look) return;
    last = g.lookVersion;
    try { localStorage.setItem('d2vr/look/' + id, JSON.stringify({ ...look, cls: g.kit?.id })); } catch {}
    globalThis.__remodLookChanged?.(look);
  }, 3000);
  globalThis.__remodBakeLook = bake;
})();
