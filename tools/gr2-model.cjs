// D2R .model(Granny GR2 v7, 64비트) 읽기: 구역 풀기(BitKnit2) + 재배치 → 정점·삼각형. BitKnit2 는 carbon_granny(MIT) 파이썬 디코더를 JS 로 옮김
// node tools/gr2-model.cjs <파일.model> [출력.json]
const fs = require('fs');
const TOTAL = 0x8000, QUANTUM = 0x10000, SHIFT = 5, ADAPT = 1024;

class Freq {
  constructor(n, minP) {
    const even = n - minP, c = new Array(n + 1).fill(0);
    for (let s = 0; s < even; s++) c[s] = Math.floor((TOTAL - minP) * s / even);
    for (let s = even; s <= n; s++) c[s] = TOTAL - n + s;
    this.n = n; this.c = c; this.acc = new Array(n).fill(1); this.tick = 0;
    this.inc = Math.floor((TOTAL - n) / ADAPT); this.last = 1 + TOTAL - n - this.inc * ADAPT;
    this.lut = new Uint16Array(1024); this.rebuild();
  }
  rebuild() { let s = 0; for (let b = 0; b < 1024; b++) { const t = b << SHIFT; while (t >= this.c[s + 1]) s++; this.lut[b] = s; } }
  observe(s) {
    this.acc[s] += this.inc; this.tick = (this.tick + 1) & (ADAPT - 1); if (this.tick) return;
    this.acc[s] += this.last; let run = 0;
    for (let i = 1; i <= this.n; i++) { run += this.acc[i - 1]; const cur = this.c[i]; this.c[i] = cur + ((run - cur) >> 1); this.acc[i - 1] = 1; }
    this.rebuild();
  }
}

function bitknit2(src, size) {
  const out = Buffer.alloc(size); if (!size) return out;
  const wc = src.length >> 1; let wi = 0;
  const word = () => { if (wi >= wc) throw Error('BitKnit2: 원본 부족'); const v = src.readUInt16LE(wi << 1); wi++; return v; };
  if (word() !== 0x75b1) throw Error('BitKnit2: 머리 다름');
  const cmd = [0, 1, 2, 3].map(() => new Freq(300, 36)), ref = [0, 1, 2, 3].map(() => new Freq(40, 0)), expo = new Freq(21, 0);
  const recent = new Array(8).fill(1); let order = 0x76543210 >>> 0, delta = 1, A = 0, B = 0;
  const init = () => {
    let m = word() * 0x10000 + word(); const split = m & 15; m = Math.floor(m / 16);
    if (m < 0x10000) m = m * 0x10000 + word();
    A = Math.floor(m / 2 ** split); if (A < 0x10000) A = A * 0x10000 + word();
    const mod = 2 ** (16 + split); B = (((m % 0x10000) * 0x10000 + word()) % mod) + mod;
  };
  const bits = (k) => { const d = 2 ** k, v = A % d; A = Math.floor(A / d); if (A < 0x10000) A = A * 0x10000 + word(); [A, B] = [B, A]; return v; };
  const sym = (M) => {
    const c = M.c, code = A & (TOTAL - 1); let s = M.lut[code >> SHIFT]; while (code >= c[s + 1]) s++;
    A = Math.floor(A / TOTAL) * (c[s + 1] - c[s]) + code - c[s]; if (A < 0x10000) A = A * 0x10000 + word();
    M.observe(s); [A, B] = [B, A]; return s;
  };
  let o = 0;
  while (o < size) {
    const qEnd = Math.min(size, o - (o % QUANTUM) + QUANTUM);
    if (src.readUInt16LE(wi << 1) === 0) { wi++; const n = Math.min((wc - wi) * 2, qEnd - o); src.copy(out, o, wi << 1, (wi << 1) + n); o += n; wi += n >> 1; continue; }
    init();
    if (o === 0) out[o++] = bits(8);
    while (o < qEnd) {
      const ph = o & 3, c = sym(cmd[ph]);
      if (c < 256) { out[o] = (c + out[o - delta]) & 0xff; o++; continue; }
      const len = c < 288 ? c - 254 : (2 ** (c - 287)) + bits(c - 287) + 32;
      const r = sym(ref[ph]); let off;
      if (r < 8) {
        const sh = r * 4, slot = (order >>> sh) & 15; off = recent[slot];
        if (r === 7) order = ((order << 4) | slot) >>> 0;
        else if (r > 0) { const mask = sh + 4 >= 32 ? 0xffffffff : (2 ** (sh + 4) - 1); order = (((order & ~mask) >>> 0) | ((((order << 4) | slot) >>> 0) & mask)) >>> 0; }
      } else {
        const k = sym(expo); let ex = bits(k & 15); if (k >= 16) ex = ex * 0x10000 + word();
        off = 32 * 2 ** k + ex * 32 + r - 39;
        const s7 = (order >>> 28) & 15, s6 = (order >>> 24) & 15; recent[s7] = recent[s6]; recent[s6] = off;
      }
      delta = off; const s0 = o - off; if (s0 < 0 || o + len > size) throw Error('BitKnit2: 잘못된 복사');
      for (let i = 0; i < len; i++) out[o + i] = out[s0 + i];
      o += len;
    }
  }
  return out;
}

// 구역 머리(u32 × 11): 압축, 파일 위치, 압축 크기, 풀린 크기, 정렬, first16, first8, 재배치 위치·수, 혼합 마샬링 위치·수
function load(file) {
  const b = Buffer.isBuffer(file) ? file : fs.readFileSync(file), n = b.readUInt32LE(0x30), so = 0x20 + b.readUInt32LE(0x2c);
  const S = [...Array(n)].map((_, i) => { const h = [...Array(11)].map((_, k) => b.readUInt32LE(so + i * 44 + k * 4)); return { comp: h[0], off: h[1], csize: h[2], size: h[3], first16: h[5], first8: h[6], relOff: h[7], relN: h[8], mmOff: h[9], mmN: h[10] }; });
  const unpack = (comp, buf, size) => comp === 0 ? Buffer.from(buf.subarray(0, size)) : comp === 4 ? bitknit2(buf, size) : (() => { throw Error('압축 종류 ' + comp); })();
  for (const s of S) s.data = unpack(s.comp, b.subarray(s.off, s.off + s.csize), s.size);
  const table = (s, off, cnt, w) => { if (!cnt) return []; const raw = s.comp === 4 ? bitknit2(b.subarray(off + 4, off + 4 + b.readUInt32LE(off)), cnt * w) : b.subarray(off, off + cnt * w); return [...Array(cnt)].map((_, i) => [...Array(w / 4)].map((_, k) => raw.readUInt32LE(i * w + k * 4))); };
  for (const s of S) { s.rel = table(s, s.relOff, s.relN, 12); s.mm = table(s, s.mmOff, s.mmN, 16); }
  return { b, S, root: { sec: b.readUInt32LE(0x3c), off: b.readUInt32LE(0x40) }, rootType: { sec: b.readUInt32LE(0x34), off: b.readUInt32LE(0x38) } };
}
module.exports = { bitknit2, load };

if (require.main === module) {
  const G = load(process.argv[2]);
  G.S.forEach((s, i) => s.size && console.log(`구역 ${i} 압축${s.comp} ${s.csize}→${s.size} first16 ${s.first16} first8 ${s.first8} 재배치 ${s.rel.length} 마샬 ${s.mm.length}`, s.mm.slice(0, 6).map((m) => m.join('/')).join(' ')));
  console.log('뿌리', G.root, '형식', G.rootType);
}
// 포인터 = 재배치 표(구역 안 위치 → 대상 구역·위치). 형식 정의 멤버(44바이트): u32 종류, 이름 ptr, 참조형식 ptr, i32 배열폭, 12바이트, 8바이트
const ptrMap = (G) => { const m = new Map(); G.S.forEach((s, i) => s.rel.forEach(([at, ts, to]) => m.set(i + ':' + at, { sec: ts, off: to }))); return m; };
const cstr = (G, p) => { if (!p) return null; const d = G.S[p.sec].data; let e = p.off; while (d[e]) e++; return d.toString('latin1', p.off, e); };
function typeDef(G, p, P = ptrMap(G)) {
  const d = G.S[p.sec].data, out = [];
  for (let o = p.off; ; o += 44) {
    const kind = d.readUInt32LE(o); if (!kind) break;
    out.push({ kind, name: cstr(G, P.get(p.sec + ':' + (o + 4))), ref: P.get(p.sec + ':' + (o + 12)) ?? null, width: d.readInt32LE(o + 20) });
  }
  return out;
}
module.exports.typeDef = typeDef; module.exports.ptrMap = ptrMap; module.exports.cstr = cstr;
// 형식 그래프 따라 값 읽기(64비트). 종류: 1 안에 품음, 2 참조, 3 배열 참조, 4 참조 배열, 5 변형 참조, 7 변형 배열 참조, 8 문자열, 9 변환, 10 f32, 11~22 정수·정규화·f16
const SZ = { 2: 8, 3: 12, 4: 12, 5: 16, 7: 20, 8: 8, 9: 68, 10: 4, 11: 1, 12: 1, 13: 1, 14: 1, 15: 2, 16: 2, 17: 2, 18: 2, 19: 4, 20: 4, 21: 2, 22: 8 };
function sizeOf(G, T, P) { return typeDef(G, T, P).reduce((a, m) => a + (m.kind === 1 ? sizeOf(G, m.ref, P) : SZ[m.kind]) * Math.max(1, m.width), 0); }
const PRIM = { 10: (d, o) => d.readFloatLE(o), 11: (d, o) => d.readInt8(o), 12: (d, o) => d[o], 13: (d, o) => d.readInt8(o), 14: (d, o) => d[o], 15: (d, o) => d.readInt16LE(o), 16: (d, o) => d.readInt16LE(o), 17: (d, o) => d.readUInt16LE(o), 18: (d, o) => d.readUInt16LE(o), 19: (d, o) => d.readInt32LE(o), 20: (d, o) => d.readUInt32LE(o) };
function read(G, T, at, P = ptrMap(G), depth = 0) {
  const o = {}; let off = at.off; const d = G.S[at.sec].data, ptr = (x) => P.get(at.sec + ':' + x);
  for (const m of typeDef(G, T, P)) {
    const w = Math.max(1, m.width), sz = m.kind === 1 ? sizeOf(G, m.ref, P) : SZ[m.kind];
    if (m.kind === 1) o[m.name] = read(G, m.ref, { sec: at.sec, off }, P, depth);
    else if (m.kind === 2) { const p = ptr(off); o[m.name] = p && depth < 6 ? read(G, m.ref, p, P, depth + 1) : null; }
    else if (m.kind === 3 || m.kind === 4) {
      const n = d.readUInt32LE(off), p = ptr(off + 4);
      if (!p) o[m.name] = [];
      else if (m.kind === 4) o[m.name] = [...Array(n)].map((_, i) => { const q = P.get(p.sec + ':' + (p.off + i * 8)); return q && depth < 6 ? read(G, m.ref, q, P, depth + 1) : null; });
      else if (m.ref && (() => { const t = typeDef(G, m.ref, P); return t.length === 1 && PRIM[t[0].kind] && t[0].width <= 1; })()) { const k = typeDef(G, m.ref, P)[0].kind, dd = G.S[p.sec].data; o[m.name] = [...Array(n)].map((_, i) => PRIM[k](dd, p.off + i * SZ[k])); }
      else if (m.ref && typeDef(G, m.ref, P).length) { const es = sizeOf(G, m.ref, P); o[m.name] = n > 64 ? { count: n, at: p, type: m.ref } : [...Array(n)].map((_, i) => read(G, m.ref, { sec: p.sec, off: p.off + i * es }, P, depth + 1)); }
      else o[m.name] = { count: n, at: p };
    }
    else if (m.kind === 5) { const t = ptr(off), p = ptr(off + 8); o[m.name] = t && p && depth < 6 ? read(G, t, p, P, depth + 1) : null; }
    else if (m.kind === 7) { const t = ptr(off), n = d.readUInt32LE(off + 8), p = ptr(off + 12); o[m.name] = { count: n, at: p, type: t }; }
    else if (m.kind === 8) o[m.name] = cstr(G, ptr(off));
    else if (m.kind === 10) o[m.name] = w > 1 ? [...Array(w)].map((_, i) => d.readFloatLE(off + i * 4)) : d.readFloatLE(off);
    else if (m.kind === 9) { const f = (i) => d.readFloatLE(off + 4 + i * 4); o[m.name] = { Flags: d.readUInt32LE(off), Position: [0, 1, 2].map(f), Orientation: [3, 4, 5, 6].map(f), ScaleShear: [...Array(9)].map((_, i) => f(7 + i)) }; }
    else if (PRIM[m.kind]) o[m.name] = w > 1 ? [...Array(w)].map((_, i) => PRIM[m.kind](d, off + i * SZ[m.kind])) : PRIM[m.kind](d, off);
    off += sz * w;
  }
  return o;
}
module.exports.read = read; module.exports.sizeOf = sizeOf;
// 첫 메쉬 → { pos[x,y,z…], col[r,g,b,a…] 0~1, uv[u,v…], idx[] } (정점 = i16×4 위치 · i8×4 법선 · i8×4 접선 · u8×4 색 · f16×2 UV, 24바이트)
function mesh(file) {
  const G = load(file), r = read(G, G.rootType, G.root), M = r.Meshes[0], V = M.PrimaryVertexData.Vertices, I = M.PrimaryTopology.Indices16;
  const T = typeDef(G, V.type), d = G.S[V.at.sec].data, sc = M.ExtendedData?.VertexScale ?? 1;
  const off = {}; let s = 0; for (const m of T) { off[m.name] = s; s += SZ[m.kind] * Math.max(1, m.width); }
  const pos = [], col = [], uv = [], h = (x) => { const e = (x >> 10) & 31, f = x & 1023, v = e ? (1 + f / 1024) * 2 ** (e - 15) : f / 1024 * 2 ** -14; return x & 0x8000 ? -v : v; };
  for (let i = 0; i < V.count; i++) {
    const o = V.at.off + i * s;
    for (let k = 0; k < 3; k++) pos.push(d.readInt16LE(o + off.Position + k * 2) / 32767 * sc);
    for (let k = 0; k < 4; k++) col.push(off.DiffuseColor0 !== undefined ? d[o + off.DiffuseColor0 + k] / 255 : 1);
    uv.push(h(d.readUInt16LE(o + off.TextureCoordinates0)), 1 - h(d.readUInt16LE(o + off.TextureCoordinates0 + 2))); // Maya V 위 → 그림 위가 0
  }
  const idx = I; // 짧은 정수 배열은 read 가 이미 숫자 배열로 풂
  return { name: M.Name, bbMin: M.ExtendedData?.bbMin, bbMax: M.ExtendedData?.bbMax, pos, col, uv, idx };
}
module.exports.mesh = mesh;
if (require.main === module && process.argv[3]) { const m = mesh(process.argv[2]); fs.writeFileSync(process.argv[3], JSON.stringify(m)); console.log(m.name, m.pos.length / 3, '정점', m.idx.length / 3, '삼각형'); }
