// 악마술사 몸 그림을 D2R HD 3D 모델(data/hd/character/player/warlock)에서 직접 그려 만든다. 옛 chars/wk 는 강령술사 그림 복사본이라 씀(extract-worker 에 붙음, remodGr2 필요)
function remodWkHd(installDir, anims, write2) {
  const g = remodGr2, B = String.fromCharCode(92), DIR = 'data/hd/character/player/warlock/';
  const casc = openCascFolder(installDir);
  try {
    const rd = (p) => Buffer.from(casc.read('data:' + p.split('/').join(B)));
    const open = (p) => { const G = g.load(rd(p)), P = g.ptrMap(G); return { G, P, r: g.read(G, G.rootType, G.root, P) }; };
    const all = ({ G, P }, a) => Array.isArray(a) ? a : [...Array(a.count)].map((_, i) => g.read(G, a.type, { sec: a.at.sec, off: a.at.off + i * g.sizeOf(G, a.type, P) }, P, 1));
    // ── 행렬(행 벡터, 16칸, 이동은 12~14) ──
    const mul = (a, b) => { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) o[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j] + a[i * 4 + 3] * b[12 + j]; return o; };
    const trs = (p, q, s) => {
      const [x, y, z, w] = q;
      const r = [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)];
      return [r[0] * s[0], r[1] * s[0], r[2] * s[0], 0, r[3] * s[1], r[4] * s[1], r[5] * s[1], 0, r[6] * s[2], r[7] * s[2], r[8] * s[2], 0, p[0], p[1], p[2], 1];
    };
    // ── 뼈대 ──
    const sk = open(DIR + 'skeleton/warlock.skeleton');
    const bones = all(sk, sk.r.Skeletons[0].Bones).map((b) => ({ name: b.Name, parent: b.ParentIndex, pos: b.Transform.Position, rot: b.Transform.Orientation, scale: [b.Transform.ScaleShear[0], b.Transform.ScaleShear[4], b.Transform.ScaleShear[8]], inv: b.InverseWorldTransform }));
    const boneIndex = new Map(bones.map((b, i) => [b.name, i]));
    // ── 텍스처(.texture): BC1·BC3·RGBA, 256 이하 장을 RGBA 로 ──
    const texCache = new Map();
    const texture = (rel) => {
      if (!rel) return null; rel = rel.toLowerCase();
      if (texCache.has(rel)) return texCache.get(rel);
      let t = null;
      try {
        const b = rd(rel), fmt = b[4], block = fmt === 0x3a ? 8 : 16;
        let w = b.readUInt32LE(8), h = b.readUInt32LE(12), at = 40 + b.readUInt32LE(40);
        const size = (mw, mh) => fmt === 0x1f ? mw * mh * 4 : Math.ceil(mw / 4) * Math.ceil(mh / 4) * block;
        while (w > 256 && h > 4) { at += size(w, h); w >>= 1; h >>= 1; }
        const px = new Uint8Array(w * h * 4);
        if (fmt === 0x1f) px.set(b.subarray(at, at + w * h * 4));
        else {
          const c565 = (v) => [((v >> 11) & 31) * 255 / 31, ((v >> 5) & 63) * 255 / 63, (v & 31) * 255 / 31];
          for (let by = 0; by < h; by += 4) for (let bx = 0; bx < w; bx += 4, at += block) {
            const co = block === 16 ? at + 8 : at, c0 = b.readUInt16LE(co), c1 = b.readUInt16LE(co + 2), a = c565(c0), c = c565(c1);
            const pal = c0 > c1 || block === 16 ? [a, c, a.map((v, i) => (2 * v + c[i]) / 3), a.map((v, i) => (v + 2 * c[i]) / 3)] : [a, c, a.map((v, i) => (v + c[i]) / 2), [0, 0, 0]];
            let al = null;
            if (block === 16) { const a0 = b[at], a1 = b[at + 1]; al = [a0, a1]; for (let i = 2; i < 8; i++) al.push(a0 > a1 ? ((8 - i) * a0 + (i - 1) * a1) / 7 : i < 6 ? ((6 - i) * a0 + (i - 1) * a1) / 5 : i === 6 ? 0 : 255); }
            const bits = b.readUInt32LE(co + 4);
            for (let i = 0; i < 16; i++) {
              const x = bx + (i & 3), y = by + (i >> 2); if (x >= w || y >= h) continue;
              const ci = (bits >>> (i * 2)) & 3, o = (y * w + x) * 4; px.set(pal[ci], o);
              if (al) { const bit = i * 3, lo = b.readUInt32LE(at + 2) + b.readUInt16LE(at + 6) * 2 ** 32; px[o + 3] = al[Math.floor(lo / 2 ** bit) & 7]; } else px[o + 3] = c0 <= c1 && ci === 3 ? 0 : 255;
            }
          }
        }
        t = { w, h, px };
      } catch { t = null; }
      texCache.set(rel, t); return t;
    };
    // ── 부위 모델 → 정점(위치·법선·UV·뼈) ──
    const meshes = (rel, rigidBone) => {
      const f = open(rel), out = [];
      for (const M of f.r.Meshes) {
        if (/half_helm|full_helm|^death_/i.test(M.Name)) continue;
        const V = M.PrimaryVertexData.Vertices, T = g.typeDef(f.G, V.type, f.P), d = f.G.S[V.at.sec].data;
        const off = {}; let s = 0;
        for (const m of T) { off[m.name] = s; s += ({ 10: 4, 11: 1, 12: 1, 13: 1, 14: 1, 15: 2, 16: 2, 17: 2, 18: 2, 19: 4, 20: 4, 21: 2 })[m.kind] * Math.max(1, m.width); }
        const bind = all(f, M.BoneBindings).map((b) => boneIndex.get(b.BoneName) ?? 0), sc = M.ExtendedData?.VertexScale ?? 1, n = V.count;
        const hf = (x) => { const e = (x >> 10) & 31, m = x & 1023, v = e ? (1 + m / 1024) * 2 ** (e - 15) : m / 1024 * 2 ** -14; return x & 0x8000 ? -v : v; };
        const vs = [];
        for (let i = 0; i < n; i++) {
          const o = V.at.off + i * s, v = { p: [0, 1, 2].map((k) => d.readInt16LE(o + off.Position + k * 2) / 32767 * sc), n: [0, 1, 2].map((k) => off.Normal === undefined ? 0 : d.readInt8(o + off.Normal + k) / 127), uv: [hf(d.readUInt16LE(o + off.TextureCoordinates0)), hf(d.readUInt16LE(o + off.TextureCoordinates0 + 2))], b: [], w: [] };
          if (rigidBone !== undefined || off.BoneWeights === undefined) { v.b = [rigidBone ?? bind[0] ?? 0]; v.w = [1]; }
          else { let sum = 0; for (let k = 0; k < 4; k++) sum += d[o + off.BoneWeights + k]; for (let k = 0; k < 4; k++) if (d[o + off.BoneWeights + k]) { v.b.push(bind[d[o + off.BoneIndices + k]] ?? 0); v.w.push(d[o + off.BoneWeights + k] / sum); } }
          vs.push(v);
        }
        const idx = M.PrimaryTopology.Indices16, tex = (bd) => texture(bd.Material?.Maps?.find((m) => m.Usage === 'AlbedoTexture')?.Map?.Texture?.FromFileName);
        const mats = M.MaterialBindings.map(tex);
        for (const q of M.PrimaryTopology.Groups) out.push({ vs, idx: idx.slice(q.TriFirst * 3, (q.TriFirst + q.TriCount) * 3), tex: mats[q.MaterialIndex] ?? mats[0], rigid: rigidBone !== undefined });
      }
      return out;
    };
    const parts = ['head', 'torso_lit', 'legs_lit', 'rarm_lit', 'larm_lit', 'special1_lit', 'special2_lit'].flatMap((p) => { try { return meshes(DIR + p + '_lod1.model'); } catch { return []; } });
    const weapon = (() => { try { return meshes('data/hd/items/weapon/polearm/scythe/scythe_lod1.model', boneIndex.get('R_weapon_attach')); } catch { return []; } })();
    // ── 동작 ──
    const remodCurve = remodWkCurve;
    const af = open(DIR + 'animation/combined.animations'), clips = new Map(af.r.Animations.map((a) => [a.Name, a]));
    const tracks = new Map(); // 동작마다 곡선은 한 번만 풂
    const pose = (name, t) => {
      const a = clips.get(name), local = bones.map((b) => [b.pos, b.rot, b.scale]);
      if (a && !tracks.has(name)) tracks.set(name, all(af, a.TrackGroups.find((x) => x.Name === 'root').TransformTracks).filter((tr) => boneIndex.has(tr.Name)).map((tr) => [boneIndex.get(tr.Name), remodCurve.curve(tr.PositionCurve, [0, 0, 0]), remodCurve.curve(tr.OrientationCurve, [0, 0, 0, 1])]));
      for (const [i, pc, oc] of tracks.get(name) ?? []) {
        const q = remodCurve.sample(oc, t), l = Math.hypot(...q) || 1;
        local[i] = [remodCurve.sample(pc, t).slice(0, 3), q.map((x) => x / l), bones[i].scale];
      }
      const world = [];
      bones.forEach((b, i) => { const m = trs(...local[i]); world[i] = b.parent >= 0 ? mul(m, world[b.parent]) : m; });
      return { skin: world.map((w, i) => mul(bones[i].inv, w)), world };
    };
    // ── 그리기: 정사영 아이소(고도 30°), 3배로 그려 줄임 ──
    const PPU = 11, SS = 3, EL = Math.PI / 6, ce = Math.cos(EL), se = Math.sin(EL), L = [-0.5, 0.75, 0.45], LN = Math.hypot(...L);
    const render = (name, t, yaw) => {
      const { skin, world } = pose(name, t), cy = Math.cos(yaw), sy = Math.sin(yaw), tris = [];
      for (const m of [...parts, ...weapon]) {
        const P = m.vs.map((v) => {
          let p = [0, 0, 0], n = [0, 0, 0];
          v.b.forEach((bi, k) => {
            const M = m.rigid ? world[bi] : skin[bi], w = v.w[k];
            for (let j = 0; j < 3; j++) { p[j] += w * (v.p[0] * M[j] + v.p[1] * M[4 + j] + v.p[2] * M[8 + j] + M[12 + j]); n[j] += w * (v.n[0] * M[j] + v.n[1] * M[4 + j] + v.n[2] * M[8 + j]); }
          });
          const x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy, nx = n[0] * cy + n[2] * sy, nz = -n[0] * sy + n[2] * cy, nl = Math.hypot(nx, n[1], nz) || 1;
          return { sx: x * PPU * SS, sy: (-p[1] * ce + z * se) * PPU * SS, d: z * ce + p[1] * se, lit: Math.max(0, (nx * L[0] + n[1] * L[1] + nz * L[2]) / nl / LN), uv: v.uv };
        });
        for (let i = 0; i < m.idx.length; i += 3) tris.push([P[m.idx[i]], P[m.idx[i + 1]], P[m.idx[i + 2]], m.tex]);
      }
      return tris;
    };
    const raster = (tris, box) => {
      const W = box.width * SS, H = box.height * SS, ox = -box.left * SS, oy = -box.top * SS, zb = new Float32Array(W * H).fill(-1e9), col = new Float32Array(W * H * 4);
      for (const [a, b, c, tex] of tris) {
        const ax = a.sx + ox, ay = a.sy + oy, bx = b.sx + ox, by = b.sy + oy, cx = c.sx + ox, cy2 = c.sy + oy;
        const area = (bx - ax) * (cy2 - ay) - (by - ay) * (cx - ax); if (!area) continue;
        const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx))), y0 = Math.max(0, Math.floor(Math.min(ay, by, cy2))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy2)));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const w0 = ((bx - px) * (cy2 - py) - (by - py) * (cx - px)) / area, w1 = ((cx - px) * (ay - py) - (cy2 - py) * (ax - px)) / area, w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const z = w0 * a.d + w1 * b.d + w2 * c.d, at = y * W + x; if (z <= zb[at]) continue;
          let r = 150, gg = 150, bb = 150, al = 255;
          if (tex) {
            let u = w0 * a.uv[0] + w1 * b.uv[0] + w2 * c.uv[0], v = w0 * a.uv[1] + w1 * b.uv[1] + w2 * c.uv[1];
            u -= Math.floor(u); v -= Math.floor(v);
            const o = (Math.min(tex.h - 1, (v * tex.h) | 0) * tex.w + Math.min(tex.w - 1, (u * tex.w) | 0)) * 4;
            r = tex.px[o]; gg = tex.px[o + 1]; bb = tex.px[o + 2]; al = tex.px[o + 3];
          }
          if (al < 128) continue;
          const lit = Math.min(1.6, 0.6 + 1.1 * (w0 * a.lit + w1 * b.lit + w2 * c.lit));
          zb[at] = z; col.set([r * lit, gg * lit, bb * lit, 255], at * 4);
        }
      }
      // 3×3 → 1 칸(평균), 반 넘게 찬 칸만
      const rgba = new Uint8Array(box.width * box.height * 4), mask = new Uint8Array(box.width * box.height);
      for (let y = 0; y < box.height; y++) for (let x = 0; x < box.width; x++) {
        let s = [0, 0, 0], n = 0;
        for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) { const o = ((y * SS + j) * W + x * SS + i) * 4; if (col[o + 3]) { n++; s[0] += col[o]; s[1] += col[o + 1]; s[2] += col[o + 2]; } }
        if (n * 2 < SS * SS) continue;
        const o = (y * box.width + x) * 4; rgba[o] = Math.min(255, s[0] / n); rgba[o + 1] = Math.min(255, s[1] / n); rgba[o + 2] = Math.min(255, s[2] / n); rgba[o + 3] = 255; mask[y * box.width + x] = 1;
      }
      return { rgba, mask };
    };
    // D2 동작 → HD 동작(지팡이 STF, 죽음은 맨손)
    const CLIP = { NU: 'stf_neutral', TN: 'stf_neutral', WL: 'stf_walk', TW: 'stf_walk', RN: 'stf_run', GH: 'stf_gethit', A1: 'stf_attack1', A2: 'stf_attack2', BL: 'stf_block', SC: 'stf_cast', S1: 'stf_cast', KK: 'stf_kick', TH: 'stf_attack1', DT: 'hth_death', DD: 'hth_dead' };
    const LOOP = new Set(['NU', 'TN', 'WL', 'TW', 'RN']);
    // 16방향 D2 순서(남서·북서·북동·남동·남·서·북·동, 그 뒤 사이 칸) → 화면 남쪽에서 시계 방향 몇 칸(1/16)
    const POS = [2, 6, 10, 14, 0, 4, 8, 12, 1, 3, 5, 7, 9, 11, 13, 15], yawOf = (d) => -POS[d] * Math.PI / 8; // 모델은 yaw 0 에서 화면 아래(남)를 봄
    const done = {};
    for (const [key, info] of Object.entries(anims)) {
      if (!/^(STF|HTH)-/.test(key)) continue;
      const mode = key.split('-')[1], clip = CLIP[mode];
      if (!clip || !clips.has(clip)) continue;
      const dirs = info.directions, n = info.framesPerDirection, dur = clips.get(clip).Duration;
      // 넉넉한 판에 한 장씩 그리고(메모리 아낌) 다 그린 뒤 모든 장이 들어가는 크기로 자름
      const big = { left: -120, top: -190, width: 240, height: 220 };
      const out = [...Array(dirs)].map((_, d) => [...Array(n)].map((_, f) => raster(render(clip, mode === 'DD' ? dur : dur * (LOOP.has(mode) ? f / n : n > 1 ? f / (n - 1) : 0), yawOf(d)), big)));
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const row of out) for (const { mask } of row) for (let i = 0; i < mask.length; i++) if (mask[i]) { const x = i % big.width, y = (i / big.width) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) continue;
      const box = { left: big.left + x0, top: big.top + y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
      const cut = (src, k) => { const o = new Uint8Array(box.width * box.height * k); for (let y = 0; y < box.height; y++) o.set(src.subarray(((y + y0) * big.width + x0) * k, ((y + y0) * big.width + x0 + box.width) * k), y * box.width * k); return o; };
      for (const row of out) for (const fr of row) { fr.mask = cut(fr.mask, 1); fr.rgba = cut(fr.rgba, 4); }
      const file = info.file.replace(/warlock-[^/]*\.png$/, `warlock-${key}.png`);
      done[key] = { ...info, ...write2(file, { box, directions: dirs, framesPerDirection: n, frames: out.map((r) => r.map((x) => x.mask)), rgba: out.map((r) => r.map((x) => x.rgba)) }) };
      if (info.fps) done[key].fps = info.fps;
    }
    return done;
  } finally { casc.close?.(); }
}
// 곡선(Granny) 풀기·B-스플라인 표본(D2R-Remod src/character.cjs 에서 옮김)
var remodWkCurve = (() => {
const QS = [1.4142135, 0.70710677, 0.35355338, 0.35355338, 0.35355338, 0.17677669, 0.17677669, 0.17677669, -1.4142135, -0.70710677, -0.35355338, -0.35355338, -0.35355338, -0.17677669, -0.17677669, -0.17677669];
const QO = [-0.70710677, -0.35355338, -0.53033006, -0.17677669, 0.17677669, -0.17677669, -0.088388346, 0, 0.70710677, 0.35355338, 0.53033006, 0.17677669, -0.17677669, 0.17677669, 0.088388346, -0];
const trunc = (t) => { const b = Buffer.alloc(4); b.writeUInt32LE((t << 16) >>> 0); return b.readFloatLE(0); };
const split = (kc, dim) => { const n = kc.length / (dim + 1); return [kc.slice(0, n), [...Array(n)].map((_, i) => kc.slice(n + i * dim, n + (i + 1) * dim))]; };

function curve(c, identity) {
  c = c.CurveData; const [hk] = Object.keys(c), H = c[hk], kind = hk.replace('CurveDataHeader_', ''), deg = H.Degree;
  if (c.KnotsControls && /K16u/.test(hk)) c = { ...c, KnotsControls: c.KnotsControls.map((x) => x & 0xffff) }; // u16 이 부호 있게 읽혀 옴
  if (kind === 'DaIdentity') return { knots: [0], controls: [identity], degree: 0 };
  if (/Constant32f$/.test(kind)) return { knots: [0], controls: [c.Controls], degree: 0 };
  if (kind === 'DaKeyframes32f') { const d = c.Dimension, n = c.Controls.length / d; return { knots: [...Array(n)].map((_, i) => i), controls: [...Array(n)].map((_, i) => c.Controls.slice(i * d, i * d + d)), degree: deg }; }
  if (kind === 'DaK32fC32f') { const n = c.Knots.length, d = c.Controls.length / n; return { knots: c.Knots, controls: [...Array(n)].map((_, i) => c.Controls.slice(i * d, i * d + d)), degree: deg }; }
  if (/^D4nK(16u|8u)C(15u|7u)$/.test(kind)) {
    const big = kind.includes('16u'), [k, cs] = split(c.KnotsControls, 3), sel = c.ScaleOffsetTableEntries, inv = c.OneOverKnotScale;
    const unit = big ? 1 / 32767 : 1 / 127, hi = big ? 0x8000 : 0x80, lo = hi - 1;
    const sc = [0, 4, 8, 12].map((s) => QS[(sel >> s) & 15] * unit), of = [0, 4, 8, 12].map((s) => QO[(sel >> s) & 15]);
    const controls = cs.map(([a, b, cc]) => {
      const s1 = ((b & hi) ? 2 : 0) | ((cc & hi) ? 1 : 0), s2 = (s1 + 1) & 3, s3 = (s2 + 1) & 3, s4 = (s3 + 1) & 3;
      const q = [0, 0, 0, 0];
      q[s2] = (a & lo) * sc[s2] + of[s2]; q[s3] = (b & lo) * sc[s3] + of[s3]; q[s4] = (cc & lo) * sc[s4] + of[s4];
      const w = Math.sqrt(Math.max(0, 1 - q[s2] ** 2 - q[s3] ** 2 - q[s4] ** 2)); q[s1] = (a & hi) ? -w : w;
      return q;
    });
    return { knots: k.map((x) => x / inv), controls, degree: deg };
  }
  if (/^DaK(16u|8u)C(16u|8u)$/.test(kind)) {
    const so = c.ControlScaleOffsets, d = so.length / 2, [k, cs] = split(c.KnotsControls, d), inv = trunc(c.OneOverKnotScaleTrunc);
    return { knots: k.map((x) => x / inv), controls: cs.map((v) => v.map((x, i) => x * so[i] + so[d + i])), degree: deg };
  }
  const m = kind.match(/^D(\d)(I(\d))?K(16u|8u)C(16u|8u)$/);
  if (m) {
    const out = +m[1], ind = m[3] ? +m[3] : out, [k, cs] = split(c.KnotsControls, ind), inv = trunc(c.OneOverKnotScaleTrunc), S = c.ControlScales, O = c.ControlOffsets;
    let map = (v) => v.map((x, i) => x * S[i] + O[i]);
    if (out === 3 && ind === 1) map = (v) => [0, 1, 2].map((i) => v[0] * S[i] + O[i]);
    if (out === 9 && ind === 1) map = (v) => { const x = v[0] * S[0] + O[0]; return [x, 0, 0, 0, x, 0, 0, 0, x]; };
    if (out === 9 && ind === 3) map = (v) => { const r = [0, 0, 0, 0, 0, 0, 0, 0, 0]; r[0] = v[0] * S[0] + O[0]; r[4] = v[1] * S[1] + O[1]; r[8] = v[2] * S[2] + O[2]; return r; };
    return { knots: k.map((x) => x / inv), controls: cs.map(map), degree: deg };
  }
  throw Error('모르는 곡선 ' + kind);
}

// 끝을 고정한 B-스플라인(de Boor). 매듭 벡터 = [k0, ...knots, kN×degree]
function sample(cv, t) {
  const { knots, controls } = cv, n = controls.length, degree = Math.min(cv.degree, n - 1);
  if (n === 1 || degree === 0) { let i = 0; while (i + 1 < n && knots[i + 1] <= t) i++; return controls[i]; }
  const U = [knots[0], ...knots, ...Array(degree).fill(knots[n - 1])];
  t = Math.min(Math.max(t, U[degree]), U[n]);
  let k = degree; while (k < n - 1 && U[k + 1] <= t) k++;
  const d = [...Array(degree + 1)].map((_, j) => controls[j + k - degree].slice());
  for (let r = 1; r <= degree; r++) for (let j = degree; j >= r; j--) {
    const i = j + k - degree, den = U[i + degree - r + 1] - U[i], a = den ? (t - U[i]) / den : 0;
    d[j] = d[j].map((x, q) => (1 - a) * d[j - 1][q] + a * x);
  }
  return d[degree];
}

return { curve, sample };
})();
