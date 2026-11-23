// PopcornFX CPU_VM 실행 핵심(노드·브라우저 공용): 프로그램 한 번 실행(run), 곡선 Hermite 표본(sample). 상수 풀은 Uint8Array(Buffer 도 됨)
(function (root) {
const DV = (P) => P._dv ?? (P._dv = new DataView(P.pool.buffer, P.pool.byteOffset, P.pool.byteLength));
const W = (ty) => ({ 0x20: 1, 0x21: 2, 0x22: 3, 0x23: 4, 0x1a: 1, 0x1b: 2, 0x1c: 3, 0x1d: 4, 0x02: 1, 0x04: 3 })[ty] ?? 1;
const isInt = (ty) => ty >= 0x1a && ty <= 0x1d;
// 프로그램 한 번 실행. env: 흐름 이름 → 값 배열, ext: 외부 함수
function run(P, env, ext) {
  const R = {}, Q = {}, Sc = {};
  const constv = (op) => { const w = W(op.ty), v = []; for (let j = 0; j < w; j++) { const off = op.i * 32 + j * 4; /* 한 칸 32바이트 안에 성분이 (x,y,z)… 반복 */ v.push(off + 4 > P.pool.length ? 0 : isInt(op.ty) ? DV(P).getInt32(off, true) : DV(P).getFloat32(off, true)); } return v; };
  const rd = (op) => { if (!op) return [0]; if (op.sp === 0x00 || op.sp === 0x80) return constv(op); /* 0x80 도 상수 */ const bank = op.sp === 0x40 ? Q : op.sp === 0x20 ? Sc : R; return bank[op.i] ?? [0, 0, 0, 0].slice(0, W(op.ty)); };
  const wr = (op, v) => { if (!op) return; const bank = op.sp === 0x40 ? Q : op.sp === 0x20 ? Sc : R; bank[op.i] = v.slice(0, W(op.ty)); };
  const map2 = (a, b, f) => { const n = Math.max(a.length, b.length); return [...Array(n)].map((_, i) => f(a[i % a.length], b[i % b.length])); };
  const U = { 0x1: (x) => 1 / Math.sqrt(x), 0xd: Math.exp, 0x11: (x) => 1 / x, 0x20: (x) => 1 / Math.sqrt(x) }; // 확정: 1 sqrt, d exp, 11 역수, 20 역제곱근(나머지는 아직 모름 → 그대로)
  for (const x of P.ins) {
    const a = x.a ?? [];
    switch (x.op) {
      case 0x69: wr(a[0], env[P.syms[x.k]] ?? [0, 0, 0, 0]); break;
      case 0x6a: env[P.syms[x.k]] = rd(a[0]); break;
      case 0x71: wr(a[0], map2(rd(a[1]), rd(a[2]), (p, q) => p + q)); break;
      case 0x72: wr(a[0], map2(rd(a[1]), rd(a[2]), (p, q) => p - q)); break;
      case 0x73: wr(a[0], map2(rd(a[1]), rd(a[2]), (p, q) => p * q)); break;
      case 0x74: wr(a[0], map2(rd(a[1]), rd(a[2]), (p, q) => p / q)); break;
      case 0x75: { const p = rd(a[1]), q = rd(a[2]), s = rd(a[3]); wr(a[0], p.map((v, i) => v * q[i % q.length] + s[i % s.length])); break; }
      case 0x7a: { const c = rd(a[3]); const p = rd(a[1]), q = rd(a[2]); wr(a[0], p.map((v, i) => (c[i % c.length] ? q[i % q.length] : v))); /* 조건 참 → 둘째 */ break; }
      case 0x6f: wr(a[0], Array(W(a[0].ty)).fill(rd(a[1])[0])); break;
      case 0x6c: wr(a[0], rd(a[1]).map((v) => (isInt(a[0].ty) ? Math.trunc(v) : v))); break;
      case 0x6d: wr(a[0], a.slice(1).flatMap((o) => rd(o))); break;
      case 0x6e: { const s = rd(a[1]), n = W(a[0].ty); wr(a[0], [...Array(n)].map((_, i) => { const k = (x.mask >> (i * 3)) & 7; return k < 4 ? s[k] ?? s[0] : k === 4 ? 0 : k === 5 ? 1 : -1; })); break; } // 뒤 u16 = 성분마다 3비트(0~3 원본 성분, 4 = 0, 5 = 1)
      case 0x70: {
        const p = rd(a[1]), q = rd(a[2]), f = { 0x8: (u, v) => +(u && v), 0x9: (u, v) => +(u || v), 0xa: (u, v) => +(!!u !== !!v), 0xb: (u) => +!u, 0xc: (u, v) => +(u < v), 0xd: (u, v) => +(u >= v), 0xe: (u, v) => +(u <= v), 0xf: (u, v) => +(u > v), 0x10: (u, v) => +(u === v), 0x11: (u, v) => +(u !== v), 0x4: (u, v) => u * v, 0x5: (u) => -u }[x.sub] ?? (() => 0);
        wr(a[0], map2(p, a[2] ? q : p, f)); break;
      }
      case 0x77: wr(a[0], rd(a[1]).map(U[x.sub] ?? ((v) => v))); break;
      case 0x78: {
        const p = rd(a[1]), q = rd(a[2]);
        if (x.sub === 0x1d) wr(a[0], [p.reduce((s, v, i) => s + v * q[i], 0)]);
        else if (x.sub === 0x1e) wr(a[0], [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]]);
        else wr(a[0], map2(p, q, x.sub === 0x1b ? Math.min : x.sub === 0x1c ? Math.max : Math.pow)); break;
      }
      case 0x79: { const v = rd(a[1]), lo = rd(a[2]), hi = rd(a[3]); wr(a[0], v.map((t, i) => Math.min(Math.max(t, lo[i % lo.length]), hi[i % hi.length]))); break; } // 가설 clamp
      case 0x7b: { const f = ext(x.fn, x.args.slice(1).map(rd), env); if (x.args[0] && f) wr(x.args[0], f); break; }
    }
  }
}
function sample(c, x) {
  const { t, v, tg, dim } = c, n = t.length;
  if (!n) return Array(dim).fill(0);
  if (x <= t[0]) return v.slice(0, dim);
  if (x >= t[n - 1]) return v.slice((n - 1) * dim, n * dim);
  let k = 0; while (k < n - 2 && x > t[k + 1]) k++;
  const h = t[k + 1] - t[k], u = (x - t[k]) / h, u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return [...Array(dim)].map((_, j) => h00 * v[k * dim + j] + h10 * h * (tg[(k * 2 + 1) * dim + j] ?? 0) + h01 * v[(k + 1) * dim + j] + h11 * h * (tg[(k + 1) * 2 * dim + j] ?? 0));
}
const api = { run, sample };
if (typeof module !== 'undefined') module.exports = api; else root.PKFX = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
