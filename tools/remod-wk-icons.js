// 추출기(extract-worker 맨 앞에 붙음): 악마술사 스킬 아이콘·스킬 트리 그림을 D2R HD 그림(.sprite)에서 줄여 넣는다. 아이콘 번호·트리 자리는 WK_ICONS(build.cjs 가 채움)
// D2R .sprite(SpA1): 머리 40바이트 뒤 RGBA, [8] 전체 너비 [12] 높이 [20] 장 수. 머리의 한 장 너비는 실제와 다를 수 있어 전체 너비 / 장 수로 나눔
function remodSprite(ctx, path) {
  const b = ctx.archives.read(path);
  if (!b) return null;
  const buf = Buffer.from(b), w = buf.readUInt32LE(8), h = buf.readUInt32LE(12), n = buf.readUInt32LE(20);
  return { buf, w, h, n, fw: w / n };
}
// 장 f 를 tw x th 로 칸 평균(박스 필터) 줄여 img 의 (ox, oy) 에 그림
function remodShrink(sp, f, img, ox, oy, tw, th) {
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const x0 = Math.floor(x * sp.fw / tw), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sp.fw / tw)), Hh = (sp.y1 ?? sp.h) - (sp.y0 ?? 0), y0 = (sp.y0 ?? 0) + Math.floor(y * Hh / th), y1 = Math.max(y0 + 1, (sp.y0 ?? 0) + Math.floor((y + 1) * Hh / th));
    const s = [0, 0, 0, 0]; let c = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const o = 40 + (yy * sp.w + Math.floor(f * sp.fw) + xx) * 4; for (let k = 0; k < 4; k++) s[k] += sp.buf[o + k]; c++; }
    const d = ((oy + y) * img.width + ox + x) * 4;
    for (let k = 0; k < 4; k++) img.rgba[d + k] = Math.round(s[k] / c);
  }
}
function remodWkIcons(ctx, sheets, skills, save, ICON) {
  const sp = remodSprite(ctx, 'data\\hd\\global\\ui\\spells\\warlock\\waskillicon.sprite');
  if (!sp) return;
  const COLS = 10, img = { width: ICON * COLS, height: ICON * Math.ceil(sp.n / COLS), rgba: new Uint8Array(ICON * COLS * ICON * Math.ceil(sp.n / COLS) * 4) };
  for (let f = 0; f < sp.n; f++) remodShrink(sp, f, img, (f % COLS) * ICON, Math.floor(f / COLS) * ICON, ICON, ICON);
  sheets.war = { file: save('skillicons-war.png', img), columns: COLS, count: sp.n };
  Object.assign(skills, WK_ICONS);
}
// 스킬 트리 세 쪽: 옛 그림(skltree_w)은 드루이드 복사본이고, HD waskilltree 는 칸 자리가 게임 격자(왼쪽 15·간격 69·줄 14/82/150/218/287/355)와 달라
// HD 돌 바탕(panel_skilltreebg) 위에 HD 칸 그림을 격자 자리에 놓고, D2R 선행 스킬 관계(WK_TREE, build.cjs 가 채움)대로 화살표를 그린다
// 하단 판: D2R HD 앞판(front_panel, 2822x415) 그대로 hud-front.png (remod-hud.js 가 화면 폭에 맞춰 깔고 구슬·칸을 그 자리로 옮김)
function remodHudArt(ctx, save) {
  const sp = remodSprite(ctx, 'data\\hd\\global\\ui\\panel\\hud_02\\front_panel.sprite');
  if (sp) save('hud-front.png', { width: sp.w, height: sp.h, rgba: new Uint8Array(sp.buf.buffer, sp.buf.byteOffset + 40, sp.w * sp.h * 4) });
  // 레벨업 고르기 칸: D2R 웨이포인트 줄 단추(858x129, 보통·밝은 장)
  const wb = remodSprite(ctx, ['data', 'hd', 'global', 'ui', 'panel', 'waypoints', 'waypoints_button.sprite'].join(String.fromCharCode(92)));
  if (wb) for (const f of [0, 1]) { const w = Math.round(wb.fw), img = { width: w, height: wb.h, rgba: new Uint8Array(w * wb.h * 4) }; remodShrink(wb, f, img, 0, 0, w, wb.h); save(`lv-row-${f}.png`, img); }
  // 스태미나 줄(보스까지 남은 시간에 씀): D2R stamina_bar 첫 장
  const sb = remodSprite(ctx, 'data\\hd\\global\\ui\\panel\\hud_02\\stamina_bar.sprite');
  if (sb) { const w = Math.round(sb.fw), img = { width: w, height: sb.h, rgba: new Uint8Array(w * sb.h * 4) }; remodShrink(sb, 0, img, 0, 0, w, sb.h); save('hud-stamina.png', img); }
  // 미니 메뉴 7단추(hudpanelhd.json MiniMenu): 보통(0)·마우스 올림(2) 장
  for (const n of ['character', 'skilltree', 'questlog', 'inventory', 'automap', 'messages', 'pausemenu']) {
    const m = remodSprite(ctx, ['data', 'hd', 'global', 'ui', 'panel', 'hud_02', `${n}.sprite`].join(String.fromCharCode(92)));
    if (m) for (const f of [0, 2]) { const w = Math.round(m.fw), img = { width: w, height: m.h, rgba: new Uint8Array(w * m.h * 4) }; remodShrink(m, f, img, 0, 0, w, m.h); save(`hud-mm-${n}-${f}.png`, img); }
  }
}
function remodWkTree(ctx, trees, save) {
  remodHudArt(ctx, save);
  const bg = remodSprite(ctx, 'data\\hd\\global\\ui\\spells\\skill_trees\\panel_skilltreebg.sprite'), tree = remodSprite(ctx, 'data\\hd\\global\\ui\\spells\\skill_trees\\waskilltree.sprite'), t = trees.warlock;
  if (!bg || !tree || !t) return trees;
  const W = 320, H = 432, TOPS = [14, 82, 150, 218, 287, 355], X = (c) => 15 + (c - 1) * 69, BOX = 48;
  // HD 셋째 쪽 왼쪽 위 칸(320 기준 40,47 크기 52)을 칸 그림 하나로 잘라 둔다
  const sx = tree.fw / W, sy = tree.h / H, box = { width: BOX, height: BOX, rgba: new Uint8Array(BOX * BOX * 4) };
  const cut = { ...tree, buf: tree.buf, w: tree.w, h: tree.h };
  for (let y = 0; y < BOX; y++) for (let x = 0; x < BOX; x++) {
    const hx = Math.floor((40 + x * 52 / BOX) * sx + 2 * tree.fw), hy = Math.floor((47 + y * 53 / BOX) * sy), o = 40 + (hy * tree.w + hx) * 4, d = (y * BOX + x) * 4;
    for (let k = 0; k < 4; k++) box.rgba[d + k] = cut.buf[o + k];
  }
  const blend = (img, x, y, r, g, b, a) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const d = (y * W + x) * 4, A = a / 255; img.rgba[d] = img.rgba[d] * (1 - A) + r * A; img.rgba[d + 1] = img.rgba[d + 1] * (1 - A) + g * A; img.rgba[d + 2] = img.rgba[d + 2] * (1 - A) + b * A; img.rgba[d + 3] = 255; };
  const line = (img, x0, y0, x1, y1, w, c) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) if (dx * dx + dy * dy <= w * w) blend(img, Math.round(x + dx), Math.round(y + dy), ...c); } };
  t.pages = [1, 2, 3].map((page) => {
    const img = { width: W, height: H, rgba: new Uint8Array(W * H * 4) };
    remodShrink({ ...bg, y0: Math.round(bg.h * 0.085), y1: Math.round(bg.h * 0.94) }, 0, img, 0, 0, W, H); // 맨 위 탭 줄(약 8.5%)·맨 아래 받침(약 6%)은 잘라 칸이 창 높이를 채우게
    const { cells, arrows } = WK_TREE[page] ?? { cells: [], arrows: [] };
    // 화살표: 위 칸 아래 가운데 → 아래 칸 위 가운데, 끝에 세모
    for (const [[r1, c1], [r2, c2]] of arrows) {
      const x0 = X(c1) + BOX / 2, y0 = TOPS[r1 - 1] + BOX, x1 = X(c2) + BOX / 2, y1 = TOPS[r2 - 1] - 2;
      line(img, x0, y0, x1, y1, 4, [20, 18, 16, 230]); line(img, x0, y0, x1, y1, 2, [150, 146, 138, 255]);
      const a = Math.atan2(y1 - y0, x1 - x0);
      for (const s of [-0.6, 0.6]) { line(img, x1, y1, x1 - Math.cos(a + s) * 11, y1 - Math.sin(a + s) * 11, 3, [20, 18, 16, 230]); line(img, x1, y1, x1 - Math.cos(a + s) * 10, y1 - Math.sin(a + s) * 10, 1, [170, 166, 158, 255]); }
    }
    for (const [r, c] of cells) for (let y = 0; y < BOX; y++) for (let x = 0; x < BOX; x++) { const s = (y * BOX + x) * 4; blend(img, X(c) + x, TOPS[r - 1] + y, box.rgba[s], box.rgba[s + 1], box.rgba[s + 2], box.rgba[s + 3]); }
    // 칸 테두리(옛 트리처럼 위·왼쪽 밝게, 아래·오른쪽 어둡게)
    for (const [r, c] of cells) { const x0 = X(c) - 2, y0 = TOPS[r - 1] - 2, x1 = X(c) + BOX + 1, y1 = TOPS[r - 1] + BOX + 1; for (let i = 0; i < 2; i++) { line(img, x0 + i, y0 + i, x1 - i, y0 + i, 0, [205, 192, 160, 255]); line(img, x0 + i, y0 + i, x0 + i, y1 - i, 0, [205, 192, 160, 255]); line(img, x0 + i, y1 - i, x1 - i, y1 - i, 0, [24, 22, 20, 255]); line(img, x1 - i, y0 + i, x1 - i, y1 - i, 0, [24, 22, 20, 255]); } }
    // 오른쪽 탭 자리: 옛 트리처럼 x 230 밖은 비우고 이 쪽 탭 줄(108px, 1쪽 맨 아래 → 3쪽 위)만 남김. 잘린 가장자리는 밝은 테두리
    const t0 = 324 - 108 * (page - 1), t1 = t0 + 108;
    for (let y = 0; y < H; y++) {
      const tab = y >= t0 && y < t1;
      if (!tab) for (let x = 230; x < W; x++) img.rgba[(y * W + x) * 4 + 3] = 0;
      if (!tab) for (let x = 226; x < 230; x++) blend(img, x, y, ...(x < 228 ? [205, 192, 160, 255] : [24, 22, 20, 255]));
    }
    for (const y of [t0, t1 - 1]) if (y > 0 && y < H - 1) for (let x = 226; x < W; x++) blend(img, x, y, 205, 192, 160, 255);
    return save(`skilltree-war-${page}.png`, img);
  });
  t.labels = ['악마', '기괴', '혼돈'];
  return trees;
}
// HD 시험(독기 볼트): D2R HD 는 PopcornFX 입자(vfx_chaos_miasma_bolt_missile.particles)라 그대로는 못 돌려서, 그 입자가 쓰는 진짜 텍스처로 프레임을 만든다
// 불꽃 판 무늬(T_FX_fire_plate_med_04, BC4)를 흘려 둥근 덩어리에 입히고, 밝기를 ChaosMissile 색 띠(T_FX_gradientMap_ChaosMissile_01, RGBA)로 칠함. 16장, 1방향
function remodTexture(ctx, name) {
  const b = ctx.archives.read(['data', 'hd', 'vfx', 'textures', ...name.split('/')].join(String.fromCharCode(92)) + '.texture');
  if (!b) return null;
  const buf = Buffer.from(b), w = buf.readUInt32LE(8), h = buf.readUInt32LE(12), size = buf.readUInt32LE(36), off = 40 + buf.readUInt32LE(40), d = buf.subarray(off, off + size);
  if (size === w * h * 4) return { w, h, ch: 4, px: d };
  const ch = buf[4] === 0x41 ? 2 : 1, px = new Uint8Array(w * h * ch); let i = 0; // BC4: 4x4 칸마다 끝값 2개 + 3비트 번호 16개. BC5(0x41, 왜곡 텍스처) 는 BC4 두 개(R, G)
  for (let by = 0; by < h; by += 4) for (let bx = 0; bx < w; bx += 4) for (let c = 0; c < ch; c++, i += 8) {
    const r0 = d[i], r1 = d[i + 1], pal = r0 > r1 ? [r0, r1, ...[1, 2, 3, 4, 5, 6].map((k) => ((7 - k) * r0 + k * r1) / 7 | 0)] : [r0, r1, ...[1, 2, 3, 4].map((k) => ((5 - k) * r0 + k * r1) / 5 | 0), 0, 255];
    let bits = 0n; for (let k = 7; k >= 2; k--) bits = (bits << 8n) | BigInt(d[i + k]);
    for (let p = 0; p < 16; p++) px[((by + (p >> 2)) * w + bx + (p & 3)) * ch + c] = pal[Number((bits >> BigInt(3 * p)) & 7n)];
  }
  return { w, h, ch, px };
}
function remodHdMissiles(ctx, manifest) {
  const noise = remodTexture(ctx, 'pyro/T_FX_fire_plate_med_04'), grad = remodTexture(ctx, 'gradient/T_FX_gradientMap_ChaosMissile_01');
  if (!noise || !grad) return;
  const S = 64, N = 16, rgba = new Uint8Array(S * N * S * 4), gy = grad.h >> 1;
  for (let f = 0; f < N; f++) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x - S / 2) / (S / 2), dy = (y - S / 2) / (S / 2), r = Math.hypot(dx, dy);
    const core = Math.max(0, 1 - r) ** 1.4;
    const nx = (x * 4 + f * 32) % noise.w, ny = (y * 4 + f * 8) % noise.h, nz = noise.px[ny * noise.w + nx] / 255;
    const lum = Math.min(1, core * (0.45 + 1.1 * nz) + Math.max(0, 0.35 - r) * 1.2);
    const gi = (gy * grad.w + Math.min(grad.w - 1, Math.round(lum * 0.62 * (grad.w - 1)))) * 4, /* 띠 끝 밝은 빨강은 빼고 남보라~자홍 구간만 */ o = (y * S * N + f * S + x) * 4;
    rgba[o] = grad.px[gi]; rgba[o + 1] = grad.px[gi + 1]; rgba[o + 2] = grad.px[gi + 2]; rgba[o + 3] = Math.min(255, lum * 360);
  }
  writePng(`${ctx.out}/sprites/missiles/miasmahd.png`, S * N, S, rgba);
  manifest.miasmahd = { file: 'sprites/missiles/miasmahd.png', directions: 1, framesPerDirection: N, frameWidth: S, frameHeight: S, originX: S / 2, originY: S / 2, fps: 25, blend: 'add', loopStart: 0, loopEnd: N - 1, classes: ['warlock'], light: { radius: 7, color: 0xb050ff } };
  // 독기 구름(vfx_chaos_miasma_bolt_cloud.particles 가 쓰는 연기 판 + 연기 무늬 + 같은 색 띠 어두운 쪽)
  const mask = remodTexture(ctx, 'mask/T_FX_Generic_Smoke_Mask_01'), smoke = remodTexture(ctx, 'noise/T_FX_smokey_01_noglitter');
  if (mask && smoke) {
    const C = 96, cg = new Uint8Array(C * N * C * 4);
    for (let f = 0; f < N; f++) for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
      const ux = (x / C - 0.5) / 0.6 + 0.5, uy = (y / C - 0.5) / 0.6 + 0.5, m = ux < 0 || uy < 0 || ux >= 1 || uy >= 1 ? 0 : mask.px[Math.floor(uy * mask.h) * mask.w + Math.floor(ux * mask.w)] / 255; // 판 가운데 60% 에만(화면 가리지 않게)
      const a = f / N * Math.PI * 2, sx = Math.floor((x * 3 + Math.cos(a) * 40 + 512) % smoke.w), sy = Math.floor((y * 3 + Math.sin(a) * 40 + 512) % smoke.h), nz = smoke.px[sy * smoke.w + sx] / 255;
      const lum = Math.min(1, m * (0.25 + 0.95 * nz)), gi = (gy * grad.w + Math.round(lum * 0.48 * (grad.w - 1))) * 4, o = (y * C * N + f * C + x) * 4;
      cg[o] = grad.px[gi]; cg[o + 1] = grad.px[gi + 1]; cg[o + 2] = grad.px[gi + 2]; cg[o + 3] = Math.min(150, lum * 150);
    }
    writePng(`${ctx.out}/sprites/missiles/miasmacloudhd.png`, C * N, C, cg);
    manifest.miasmacloudhd = { file: 'sprites/missiles/miasmacloudhd.png', directions: 1, framesPerDirection: N, frameWidth: C, frameHeight: C, originX: C / 2, originY: C / 2, fps: 12, blend: 'normal', loopStart: 0, loopEnd: N - 1, classes: ['warlock'] };
  }
}
// HD 효과 그림 공통: D2R HD 입자가 쓰는 무늬(noise, BC4)·모양(mask, 없으면 둥근 덩어리)·색 띠(grad, RGBA)로 N장. grow 면 터지듯 커지며 사라짐
function remodHdFx(ctx, manifest, key, o) {
  const noise = remodTexture(ctx, o.noise), grad = remodTexture(ctx, o.grad), mask = o.mask && remodTexture(ctx, o.mask);
  if (!noise || !grad || (o.mask && !mask)) return;
  const S = o.size, N = o.frames ?? 16, rgba = new Uint8Array(S * N * S * 4), gy = grad.h >> 1, lo = o.lo ?? 0, hi = o.hi ?? 1;
  for (let f = 0; f < N; f++) {
    const t = f / (N - 1), sc = o.grow ? 0.35 + 0.65 * Math.sqrt(t) : 1, fade = o.grow ? (1 - t) ** 0.8 : 1;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const ux = (x / S - 0.5) / sc + 0.5, uy = (y / S - 0.5) / sc + 0.5, r = Math.hypot(ux - 0.5, uy - 0.5) * 2;
      const rr = Math.hypot(x / S - 0.5, (y / S - 0.5) * 2) * 2; // ring: 바닥에 퍼지는 고리(2:1 납작), 반지름이 커지며 옅어짐
      const shape = o.ring ? Math.exp(-(((rr - 0.15 - 0.8 * Math.sqrt(t)) / 0.1) ** 2)) * (1 - t) : mask ? (ux < 0 || uy < 0 || ux >= 1 || uy >= 1 ? 0 : mask.px[Math.floor(uy * mask.h) * mask.w + Math.floor(ux * mask.w)] / 255) : Math.max(0, 1 - r) ** 1.3;
      const nz = noise.px[((y * 4 + f * 24) % noise.h) * noise.w + (x * 4 + f * 12) % noise.w] / 255;
      const lum = Math.min(1, shape * (0.4 + 0.9 * nz) * fade + (mask || o.ring ? 0 : Math.max(0, 0.3 - r) * fade));
      const gi = (gy * grad.w + Math.min(grad.w - 1, Math.round((lo + lum * (hi - lo)) * (grad.w - 1)))) * 4, p = (y * S * N + f * S + x) * 4;
      rgba[p] = grad.px[gi]; rgba[p + 1] = grad.px[gi + 1]; rgba[p + 2] = grad.px[gi + 2]; rgba[p + 3] = Math.min(255, lum * (o.alpha ?? 320));
    }
  }
  writePng(`${ctx.out}/sprites/missiles/${key}.png`, S * N, S, rgba);
  manifest[key] = { file: `sprites/missiles/${key}.png`, directions: 1, framesPerDirection: N, frameWidth: S, frameHeight: S, originX: S / 2, originY: S / 2, fps: o.fps ?? 25, blend: o.blend ?? 'add', loopStart: 0, loopEnd: N - 1, classes: ['warlock'], ...o.light && { light: o.light } };
}
// 악마술사 다른 기술(D2R HD 입자 파일이 쓰는 텍스처 그대로): 화염 고리(vfx_ring_of_fire_trail·_explode), 화염 파도(vfx_flamewave), 심연 폭발(vfx_chaos_abyss_explosion), 피 끓음(vfx_blood_boil)
function remodHdWarlockFx(ctx, manifest) {
  // 독기 볼트: D2R 처럼 밝은 자홍 머리 + 길게 끌리는 보라 꼬리(16방향), 둥근 덩어리 대신
  remodHdDirFx(ctx, manifest, 'miasmahd', { trail: 'pyro/T_FX_fire_trail', noise: 'noise/T_FX_smokey_01_noglitter', grad: 'gradient/T_FX_gradientMap_ChaosMissile_01', size: 112, lo: 0.05, hi: 0.66, width: 0.42, head: 0.27, alpha: 560 });
  remodHdFx(ctx, manifest, 'ringoffirehd', { noise: 'pyro/T_FX_fire_plate_med_03', grad: 'gradient/T_FX_flame_gradient_02', size: 56, lo: 0.05, hi: 0.7, light: { radius: 6, color: 0xff8030 } });
  remodHdFx(ctx, manifest, 'ringoffireexphd', { noise: 'pyro/T_FX_firePlume_Plate_01', mask: 'mask/T_FX_Generic_Smoke_Mask_01', grad: 'gradient/T_FX_flame_gradient_03', size: 96, grow: true, frames: 12 });
  remodHdFx(ctx, manifest, 'flamewavehd', { noise: 'pyro/T_FX_fire_plate_med_04', grad: 'gradient/T_FX_flame_gradient_07', size: 80, lo: 0.05, hi: 0.7, light: { radius: 8, color: 0xff7020 } });
  remodHdFx(ctx, manifest, 'abyssexphd', { noise: 'noise/T_FX_cloudnoise_generic_flatLevels', mask: 'mask/T_FX_Blurry_Smoke_Mask_01', grad: 'gradient/T_FX_gradientMap_ChaosMissile_01', size: 160, grow: true, frames: 16, hi: 0.75, alpha: 520 });
  remodHdFx(ctx, manifest, 'bloodboilhd', { noise: 'fluid/T_FX_fluid_blood_tile_Mono', mask: 'mask/T_FX_Generic_Smoke_Mask_01', grad: 'gradient/T_FX_scortch_gradient02', size: 96, grow: true, frames: 12, blend: 'normal', alpha: 260 });
}
// 소서리스 기술 HD(D2R HD 입자 파일이 쓰는 텍스처 그대로, 원작 미사일 키를 덮어씀): 파이어볼·파이어 볼트(vfx_fireball_trail), 아이스 볼트(fx_ice_projectile_bolt),
// 프로즌 오브(fx_ice_frozen_orb·frozenorbexplode), 프로스트 노바(fx_ice_frost_nova), 메테오(vfx_meteor), 불 폭발. 날아가는 것은 16방향(원작 방향 순서 ns(16)), 원래 칸(직업·폭발·빛·높이)은 유지
function remodHdDirFx(ctx, manifest, key, o) {
  const old = manifest[key]; if (!old) return;
  const trail = remodTexture(ctx, o.trail), noise = remodTexture(ctx, o.noise), grad = remodTexture(ctx, o.grad);
  if (!trail || !noise || !grad) return;
  const S = o.size, N = o.frames ?? 8, D = o.dirs ?? 16, rgba = new Uint8Array(S * N * S * D * 4), gy = grad.h >> 1, lo = o.lo ?? 0, hi = o.hi ?? 1;
  const ord = (n) => n <= 8 ? [4, 0, 5, 1, 6, 2, 7, 3] : ord(n / 2).flatMap((t, i) => [t, n / 2 + i]), O = ord(D);
  for (let r = 0; r < D; r++) {
    const A = O.indexOf(r) * Math.PI * 2 / D + Math.PI / 4, h = Math.atan2((Math.sin(A) + Math.cos(A)) / 2, Math.cos(A) - Math.sin(A)), ch = Math.cos(h), sh = Math.sin(h);
    for (let f = 0; f < N; f++) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x / S * 2 - 1, dy = y / S * 2 - 1, lx = dx * ch + dy * sh, ly = -dx * sh + dy * ch;
      const u = (lx + 1) / 2, v = ly / (o.width ?? 0.5) * 0.5 + 0.5; // 꼬리 무늬: 오른쪽이 머리
      // cells: 번개처럼 세로 줄기 아틀라스(cells x cells)면 장마다 다른 칸을 골라 깜빡이게, 줄기를 날아가는 방향으로 눕힘
      const C = o.cells, k = C && f % (C * C), tx = C ? ((k % C) + v) / C : ((u + f / N) % 1), ty = C ? (Math.floor(k / C) + u) / C : v;
      const tr = v < 0 || v >= 1 ? 0 : trail.px[(Math.floor(ty * trail.h) * trail.w + Math.floor(tx * trail.w)) * trail.ch] / 255 * Math.min(1, u * 1.6) * Math.min(1, (1 - u) * (C ? 1.6 : 5));
      const head = Math.max(0, 1 - Math.hypot(lx - 0.45, ly) / (o.head ?? 0.4)) ** 1.3;
      const nz = noise.px[((y * 4 + f * 24) % noise.h) * noise.w + (x * 4 + f * 40) % noise.w] / 255;
      const lum = Math.min(1, Math.max(tr * (0.5 + 0.8 * nz), head * (0.7 + 0.5 * nz)));
      const gi = (gy * grad.w + Math.min(grad.w - 1, Math.round((lo + lum * (hi - lo)) * (grad.w - 1)))) * 4, p = ((r * S + y) * S * N + f * S + x) * 4;
      rgba[p] = grad.px[gi]; rgba[p + 1] = grad.px[gi + 1]; rgba[p + 2] = grad.px[gi + 2]; rgba[p + 3] = Math.min(255, lum * (o.alpha ?? 360));
    }
  }
  writePng(`${ctx.out}/sprites/missiles/${key}.png`, S * N, S * D, rgba);
  manifest[key] = { ...old, file: `sprites/missiles/${key}.png`, directions: D, framesPerDirection: N, frameWidth: S, frameHeight: S, originX: S / 2, originY: Math.round(S / 2 + old.originY - old.frameHeight / 2), blend: 'add', loopStart: 0, loopEnd: N - 1 };
}
// 한 방향(폭발·오브): remodHdFx 로 그리고 원래 칸 유지
function remodHdKeep(ctx, manifest, key, o) {
  const old = manifest[key]; if (!old) return;
  remodHdFx(ctx, manifest, key, o);
  if (manifest[key] !== old) manifest[key] = { ...old, ...manifest[key], classes: old.classes, originY: Math.round(o.size / 2 + old.originY - old.frameHeight / 2) };
  if (!old.classes) delete manifest[key].classes;
  if (old.loopEnd === undefined) { delete manifest[key].loopStart; delete manifest[key].loopEnd; } // 폭발은 한 번만
}
function remodHdSorcFx(ctx, manifest) {
  const bolt = { trail: 'energy/T_FX_Lightning_SingleArc_Atlas_2x2_Mono', cells: 2, noise: 'noise/T_FX_cloudnoise_generic', grad: 'gradient/T_FX_lightning_Grad_04', lo: 0.4, hi: 1, alpha: 900 };
  remodHdDirFx(ctx, manifest, 'chargedbolt', { ...bolt, size: 64, width: 0.6, head: 0.25, frames: 10 });
  remodHdDirFx(ctx, manifest, 'chainlightning', { ...bolt, size: 160, dirs: 32, width: 0.5, head: 0.12 });
  remodHdDirFx(ctx, manifest, 'lightninghit', { ...bolt, size: 160, dirs: 32, width: 0.5, head: 0.12 });
  remodHdDirFx(ctx, manifest, 'nova', { ...bolt, size: 72, width: 0.9, head: 0.2, frames: 13 });
  const ice = { trail: 'pyro/T_FX_fire_trail', noise: 'noise/T_FX_smokey_02', grad: 'gradient/T_FX_IceBolt_gradient' };
  remodHdDirFx(ctx, manifest, 'iceblast', { ...ice, size: 96, width: 0.4, head: 0.35 });
  remodHdDirFx(ctx, manifest, 'glacialspike', { ...ice, size: 112, width: 0.45, head: 0.38 });
  for (const k of ['frozenorbbolt', 'frozenorbnova', 'chillingarmorbolt']) remodHdDirFx(ctx, manifest, k, { ...ice, size: 56, width: 0.3, head: 0.25, frames: 6 });
  for (const k of ['iceexplode', 'ice_explode', 'blizzardexplode1', 'blizzardexplode3']) remodHdKeep(ctx, manifest, k, { noise: 'noise/T_FX_cloud_noise_03', mask: 'mask/T_FX_Generic_Smoke_Mask_01', grad: 'gradient/T_FX_Bluelightning_Gradient', size: 112, grow: true, frames: 12 });
  // 불벽·인페르노·메테오 불: 바닥 불꽃(vfx_ground_fire_*_firewall: fire_plate + flame_gradient_02), 계속 타오름
  for (const k of ['firewall', 'firewallmaker', 'firesmall', 'firemedium', 'meteorfire', 'infernoflame1', 'infernoflame2']) remodHdKeep(ctx, manifest, k, { noise: 'pyro/T_FX_fire_plate_med_04', mask: 'mask/T_FX_softFlame_mask_', grad: 'gradient/T_FX_flame_gradient_02', size: 112, frames: 16, lo: 0, hi: 0.7, alpha: 230 });
  const fire = { trail: 'pyro/T_FX_fire_trail', noise: 'pyro/T_FX_fire_plate_med_04', grad: 'gradient/T_FX_flame_gradient_02', lo: 0.05, hi: 0.8 };
  remodHdDirFx(ctx, manifest, 'fireball', { ...fire, size: 96 });
  remodHdDirFx(ctx, manifest, 'firebolt', { ...fire, size: 64, head: 0.35 });
  remodHdDirFx(ctx, manifest, 'icebolt', { trail: 'pyro/T_FX_fire_trail', noise: 'noise/T_FX_smokey_02', grad: 'gradient/T_FX_IceBolt_gradient', size: 64, width: 0.35, head: 0.3 });
  remodHdDirFx(ctx, manifest, 'frostnova', { trail: 'pyro/T_FX_fire_trail', noise: 'noise/T_FX_Noise_FluidBands_Spikey_02', grad: 'gradient/T_FX_Bluelightning_Gradient', size: 72, width: 0.8, head: 0.25, alpha: 260 });
  remodHdKeep(ctx, manifest, 'frozenorb', { noise: 'noise/T_FX_Noise_Plasma_Caustic_mono', grad: 'gradient/T_FX_Bluelightning_Gradient', size: 64, lo: 0.1, hi: 0.9, light: { radius: 7, color: 0x60a0ff } });
  remodHdKeep(ctx, manifest, 'frozenorbexplode', { noise: 'noise/T_FX_cloud_noise_03', mask: 'mask/T_FX_Generic_Smoke_Mask_01', grad: 'gradient/T_FX_Bluelightning_Gradient', size: 160, grow: true, frames: 16 });
  remodHdKeep(ctx, manifest, 'meteorexplode', { noise: 'pyro/T_FX_fire_plate_med_03', mask: 'mask/T_FX_Generic_Smoke_Mask_01', grad: 'gradient/T_FX_flame_gradient_09', size: 192, grow: true, frames: 16, alpha: 420 });
  remodHdKeep(ctx, manifest, 'fireexplode', { noise: 'pyro/T_FX_firePlume_Plate_01', mask: 'mask/T_FX_Generic_Smoke_Mask_01', grad: 'gradient/T_FX_flame_gradient_03', size: 96, grow: true, frames: 12 });
}
// 바바리안 기술 HD(D2R HD 입자 파일이 쓰는 텍스처): 함성 고리(vfx_ba_yell_shockwave), 강타(vfx_barbarian_bash), 광란(vfx_barbarian_frenzy),
// 전투 명령·지휘(vfx_battle_orders·command), 전투 함성(vfx_battlecry), 광전사(vfx_barbarian_berserk). 원래 칸(직업·빛·높이)은 유지
function remodHdBarbFx(ctx, manifest) {
  const yell = { noise: 'pyro/T_FX_fire_plate_med_03', grad: 'gradient/T_FX_Shockwave_Gradient_03', ring: true, frames: 16, alpha: 420 };
  for (const k of ['warcry', 'shout', 'shoutstart']) remodHdKeep(ctx, manifest, k, { ...yell, size: 160 });
  for (const k of ['battleorders', 'battleorderscast', 'battlecommand', 'battlecommandcast']) remodHdKeep(ctx, manifest, k, { noise: 'noise/T_FX_noise_goopy_mono', grad: 'gradient/T_FX_purpleblue_gradient_02_desaturated', ring: true, size: 160, frames: 20, alpha: 420 });
  remodHdKeep(ctx, manifest, 'battlecry', { noise: 'noise/T_FX_gaussian_noise_gray', grad: 'gradient/T_FX_BurntOrange_Gradient', ring: true, size: 128, frames: 15, alpha: 420 });
  remodHdKeep(ctx, manifest, 'bash', { noise: 'noise/T_FX_billowy_cloud_noise', mask: 'mask/T_FX_Generic_Smoke_Mask_01', grad: 'gradient/T_FX_Brown_Dust_Gradient', size: 96, grow: true, frames: 9, alpha: 520 });
  remodHdKeep(ctx, manifest, 'stun', { noise: 'noise/T_FX_billowy_cloud_noise', mask: 'mask/T_FX_Generic_Smoke_Mask_01', grad: 'gradient/T_FX_Brown_Dust_Gradient', size: 96, grow: true, frames: 12, alpha: 520 });
  remodHdKeep(ctx, manifest, 'frenzy', { noise: 'noise/T_FX_billowy_cloud_noise', grad: 'gradient/T_FX_Ribbon_Gradient_02', ring: true, size: 112, frames: 25, alpha: 360 });
  remodHdKeep(ctx, manifest, 'berserkfront', { noise: 'noise/T_FX_gaussian_noise_gray', mask: 'mask/T_FX_radialGradient_Mask_soft_01', grad: 'gradient/T_FX_bluegreen_white_gradient_02', size: 80, grow: true, frames: 24, alpha: 360 });
}
// 입자 엔진(remod-fx.js)용 재료: D2R HD 입자가 쓰는 회색 텍스처를 흰색+알파 PNG(d2/fx/*.png)로, 색 띠는 16단계 색(fx.json)으로
function remodFxTextures(ctx) {
  const shrink = (t, S, x0 = 0, y0 = 0, w = t.w, h = t.h, fn) => {
    const rgba = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let s = 0, c = 0;
      for (let yy = Math.floor(y * h / S); yy < Math.floor((y + 1) * h / S); yy++) for (let xx = Math.floor(x * w / S); xx < Math.floor((x + 1) * w / S); xx++) { s += t.px[((y0 + yy) * t.w + x0 + xx) * t.ch]; c++; }
      const v = (c ? s / c : 0) * (fn ? fn(x / S * 2 - 1, y / S * 2 - 1) : 1), o = (y * S + x) * 4;
      rgba[o] = rgba[o + 1] = rgba[o + 2] = 255; rgba[o + 3] = Math.min(255, v);
    }
    return rgba;
  };
  const round = (x, y) => Math.max(0, 1 - Math.hypot(x, y)) ** 0.8;
  const tex = {
    flame: ['mask/T_FX_softFlame_mask_', 128], puff: ['pyro/T_FX_fire_plate_med_04', 128, round], smoke: ['mask/T_FX_Generic_Smoke_Mask_01', 128],
    cloud: ['noise/T_FX_cloud_noise_03', 128, round], flash: ['mask/T_FX_Flash_Center', 128], glow: ['mask/T_FX_soft_glowcard', 64], spark: ['light/T_FX_light_dot_glow_gritty', 64],
  };
  for (const [k, [n, S, fn]] of Object.entries(tex)) { const t = remodTexture(ctx, n); if (t) writePng(`${ctx.out}/fx/${k}.png`, S, S, shrink(t, S, 0, 0, t.w, t.h, fn)); }
  const arc = remodTexture(ctx, 'energy/T_FX_Lightning_SingleArc_Atlas_2x2_Mono'); // 번개 줄기 4칸(세로)
  if (arc) for (let i = 0; i < 4; i++) writePng(`${ctx.out}/fx/bolt${i}.png`, 256, 256, shrink(arc, 256, (i % 2) * 512, (i >> 1) * 512, 512, 512));
  const grads = {
    fire: 'gradient/T_FX_flame_gradient_02', fire2: 'gradient/T_FX_flame_gradient_09', chaos: 'gradient/T_FX_gradientMap_ChaosMissile_01', ice: 'gradient/T_FX_IceBolt_gradient',
    frost: 'gradient/T_FX_Bluelightning_Gradient', lightning: 'gradient/T_FX_lightning_Grad_04', shock: 'gradient/T_FX_Shockwave_Gradient_03', orders: 'gradient/T_FX_purpleblue_gradient_02_desaturated',
    poison: 'gradient/fx_t_andarielmissile_greengrad_02', holy: 'gradient/t_fx_goldcommand', unholy: 'gradient/t_fx_unholyboltgrad', magic: 'gradient/fx_t_purplered_grad_01',
    orange: 'gradient/T_FX_BurntOrange_Gradient', dust: 'gradient/T_FX_Brown_Dust_Gradient', blood: 'gradient/T_FX_scortch_gradient02', teal: 'gradient/T_FX_bluegreen_white_gradient_02',
  };
  const out = {};
  for (const [k, n] of Object.entries(grads)) { const g = remodTexture(ctx, n); if (!g) continue; const y = g.h >> 1; out[k] = Array.from({ length: 16 }, (_, i) => { const o = (y * g.w + Math.round(i / 15 * (g.w - 1))) * 4; return (g.px[o] << 16) | (g.px[o + 1] << 8) | g.px[o + 2]; }); }
  require('fs').writeFileSync(`${ctx.out}/fx.json`, JSON.stringify(out));
}
