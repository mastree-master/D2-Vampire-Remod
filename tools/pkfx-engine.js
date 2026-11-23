// PopcornFX 재현 엔진(브라우저 공용): 묶음(pkfx-pack) + 해석기(pkfx-core) + Pixi 그리기. 시험 화면(pkfx-view.html)과 게임(remod-pkfx.js)이 같이 씀
// PKFXE.load(PIXI, pack, { tex(path)→Texture, mesh(path)→{pos,col,uv,idx} }) → 틀. 틀.make(container, scr) → 효과 하나 { effect:{x,t,run}, tick(dt), done(), destroy() }
// 좌표: 효과 앞쪽 = +x, 위 = +z(D2R 은 Z 위). scr(월드[x,y,z]) → 화면 [x, y]
(() => {
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const VS = `in vec2 aPosition; in vec2 aUV; in vec4 aColor; out vec2 vUV; out vec4 vCol; uniform mat3 uProjectionMatrix; uniform mat3 uWorldTransformMatrix; uniform mat3 uTransformMatrix;
void main(){ mat3 m = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix; gl_Position = vec4((m * vec3(aPosition, 1.0)).xy, 0.0, 1.0); vUV = aUV; vCol = aColor; }`;
  // Uber 재질 셰이더(추정): 무늬 = Base × Blend(UV 왜곡) × BlendMask, 색 = GradientRemap(무늬) 또는 흰색, 알파 = AlphaRemap(무늬, 커서) × AlphaMask × 정점색 알파, × Color × 노출
  const FS = (dbg) => `in vec2 vUV; in vec4 vCol; out vec4 finalColor;
uniform sampler2D uB; uniform sampler2D uT; uniform sampler2D uM; uniform sampler2D uA; uniform sampler2D uG; uniform sampler2D uR; uniform sampler2D uD;
uniform vec4 uBaseUV; uniform vec4 uBlendUV; uniform vec4 uMaskUV; uniform vec4 uAMaskUV; uniform vec4 uDistUV; uniform vec4 uColor;
uniform vec4 uP1; uniform vec4 uP2;
void main(){
  vec2 d = (texture(uD, vUV * uDistUV.xy + uDistUV.zw).rg - 0.5) * uP2.y;
  vec4 b = texture(uB, vUV * uBaseUV.xy + uBaseUV.zw);
  vec4 t = texture(uT, (vUV + d) * uBlendUV.xy + uBlendUV.zw);
  float v = b.r * uP1.x * t.r * uP1.y;
  v *= texture(uM, vUV * uMaskUV.xy + uMaskUV.zw).r;
  float am = texture(uA, vUV * uAMaskUV.xy + uAMaskUV.zw).a;
  vec3 rgb = uP2.z > 0.5 ? texture(uG, vec2(clamp(v + uP1.w, 0.01, 0.99), 0.5)).rgb : vec3(v);
  float a = uP2.w > 0.5 ? texture(uR, vec2(clamp(v, 0.01, 0.99), clamp(uP2.x, 0.01, 0.99))).r : v;
  a *= am * uColor.a * vCol.a;
  finalColor = vec4(rgb * uColor.rgb * uP1.z * a, a);${dbg ? `finalColor = vec4(texture(${dbg}, vUV).rgb, 1.0);` : ''}
}`;

  async function load(PIXI, pack, io, opt = {}) {
    const QUAD = new PIXI.Geometry({ attributes: { aPosition: [-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5], aUV: [0, 0, 1, 0, 1, 1, 0, 1], aColor: new Array(16).fill(1) }, indexBuffer: [0, 1, 2, 0, 2, 3] });
    const fs = FS(opt.dbg), isTex = (v) => typeof v === 'string' && /\.texture$/i.test(v), WHITE = PIXI.Texture.WHITE;
    const tex = async (p) => (p ? await io.tex(p).catch(() => WHITE) : WHITE) ?? WHITE;
    // 층 준비: 렌더러 칸 → 흐름 이름, 텍스처, 섞기
    const defs = [];
    for (const L of pack.layers) {
      for (const P of [L.spawn, L.evolve]) if (P && typeof P.pool === 'string') P.pool = b64(P.pool);
      const R = L.renderers.find((r) => r.geometry !== 'GeometryLight') ?? L.renderers[0] ?? { geometry: 'Emitter', material: '', inputs: [], props: {} }, slot = (n) => R.inputs.find((x) => x.slot === n)?.sym, prop = (p) => R.inputs.find((x) => x.prop === p)?.sym;
      const P = R.props, tpath = P['Diffuse.DiffuseMap'] ?? P['Blend.TextureBase'] ?? P['Blend.TextureBlend'];
      const t = R.geometry === 'Emitter' ? null : await tex(isTex(tpath) && !/white|black/i.test(tpath) ? tpath : isTex(P['Blend.TextureBlend']) ? P['Blend.TextureBlend'] : null);
      const uber = /Diablo_Uber/.test(R.material) && R.geometry !== 'Emitter' ? {
        B: await tex(isTex(P['Blend.TextureBase']) ? P['Blend.TextureBase'] : null), T: await tex(P.Blend && isTex(P['Blend.TextureBlend']) ? P['Blend.TextureBlend'] : null),
        M: await tex(P.BlendMask && isTex(P['BlendMask.Mask']) ? P['BlendMask.Mask'] : null), A: await tex(P.AlphaMask && isTex(P['AlphaMask.Mask']) ? P['AlphaMask.Mask'] : null),
        G: await tex(isTex(P['GradientRemap.GradientMap']) ? P['GradientRemap.GradientMap'] : null), R: await tex(isTex(P['AlphaRemap.AlphaMap']) ? P['AlphaRemap.AlphaMap'] : null),
        D: await tex(P.UVDistortion && isTex(P['UVDistortion.BlendDistort']) ? P['UVDistortion.BlendDistort'] : null),
        grad: !!P.GradientRemap && isTex(P['GradientRemap.GradientMap']), remap: !!P.AlphaRemap && isTex(P['AlphaRemap.AlphaMap']),
      } : null;
      for (const k of ['B', 'T', 'M', 'A', 'G', 'R', 'D']) if (uber?.[k] && uber[k] !== WHITE) uber[k].source.style.addressMode = 'repeat';
      const mesh = typeof P['General.Mesh'] === 'string' ? await io.mesh(P['General.Mesh']).catch(() => null) : null;
      defs.push({ mesh, L, R, geo: R.geometry, pos: slot(0), size: slot(1), axis: /Default_Billboard/.test(R.material) ? slot(4) : null, color: prop('Diffuse.Color') ?? prop('Color.Color') ?? prop('Light.Color'), prop, t, uber, add: (P['Transparent.Type'] ?? P['Transparency.Type'] ?? 0) < 2 }); // 0·1 더하기, 2 알파 섞기
    }

    function make(stage, scr) {
      const effect = { x: 0, t: 0, run: 1 }, layers = defs.map((d) => { const C = new PIXI.Container(); stage.addChild(C); return { ...d, C, parts: [] }; });
      const ext = (L, P) => (fn, args, env) => {
        if (fn.startsWith('rand')) return [args[0][0] + Math.random() * (args[1][0] - args[0][0])];
        if (/^effect\.(isRunning|isRenderingEnabled)/.test(fn)) return [fn.startsWith('effect.isRunning') ? effect.run : 1];
        if (fn.startsWith('effect.isTeleporting')) return [0];
        if (fn.startsWith('effect.age')) return [effect.t];
        if (fn.startsWith('effect.dt')) return [env['effect.dt']?.[0] ?? 1 / 60];
        if (fn.startsWith('self.kill')) { if (args[0][0]) env.__dead = 1; return null; }
        if (fn.startsWith('xform_l2w_f')) return [args[0][0] + effect.x, args[0][1], args[0][2]];
        if (fn.startsWith('xform_l2w_d')) return args[0];
        if (fn.startsWith('effect.axisForward')) return [1, 0, 0];
        if (fn.startsWith('effect.orientation')) return [0, 0, 0, 1];
        if (fn.startsWith('orientation_mult')) return args[0];
        if (fn.startsWith('radians.rotate')) { const [v, k, [a]] = args, c = Math.cos(a), s = Math.sin(a), d = v[0] * k[0] + v[1] * k[1] + v[2] * k[2]; return [0, 1, 2].map((i) => v[i] * c + (k[(i + 1) % 3] * v[(i + 2) % 3] - k[(i + 2) % 3] * v[(i + 1) % 3]) * s + k[i] * d * (1 - c)); }
        if (fn.startsWith('samplerCurve')) { const dim = +fn.match(/samplerCurve(\d)/)[1], c = L.curves.find((q) => q.dim === dim); return c ? PKFX.sample(c, args[0]?.[0] ?? 0) : [args[0]?.[0] ?? 0]; }
        if (fn.startsWith('view.position')) return [effect.x, -50, 50]; // 비스듬히 위에서 보는 카메라
        if (fn.startsWith('samplerVectorField')) return [0, 0, 0];
        // 이벤트: 흐름 표본은 처음 한 번 1개, generate 는 양을 누적해 정수만큼, initPayload 는 개수를 담은 손잡이, kick 은 그 개수만큼 자식 층에 입자
        if (fn.startsWith('samplerEventStream:duration')) return [0];
        if (fn.startsWith('samplerEventStream:generate')) { const n = env.__fired ? 0 : 1; env.__fired = 1; return [n, 0, 0]; }
        if (fn.startsWith('generate_')) { env.__acc = (env.__acc ?? 0) + (args[1]?.[0] ?? 0); const n = Math.floor(env.__acc); env.__acc -= n; return [n, 0, 0]; }
        if (fn.startsWith('trigger_')) return [1, 0, 0]; // 플랫폼 스위치(PC·PS4·PS5) 갈래: 하나는 통과
        if (fn.startsWith('particleEvent:initPayload')) { (env.__ev ??= []).push(args[1]?.[0] ?? 0); return [env.__ev.length - 1]; }
        if (fn.startsWith('particleEvent:kick')) { const n = env.__ev?.[args[0]?.[0]] ?? 0; if (n > 0 && effect.run) kick(env, P, n); return null; }
        return [0];
      };
      // 입자 하나: 받은 이벤트 칸(slot)의 보냄 목록을 입자가 기억(그 입자가 kick 하면 그쪽으로)
      const spawn = (y, slot) => {
        const env = { ...structuredClone(y.L.consts ?? {}), 'effect.dt': [1 / 60], 'scene.dt': [1 / 60], __out: slot?.out ?? [] };
        if (y.L.spawn) PKFX.run(y.L.spawn, env, ext(y.L, y.L.spawn));
        let s = null;
        if (y.uber) {
          const U = y.uber, sh = PIXI.Shader.from({ gl: { vertex: VS, fragment: fs }, resources: { uB: U.B.source, uT: U.T.source, uM: U.M.source, uA: U.A.source, uG: U.G.source, uR: U.R.source, uD: U.D.source,
            u: { uBaseUV: { value: [1, 1, 0, 0], type: 'vec4<f32>' }, uBlendUV: { value: [1, 1, 0, 0], type: 'vec4<f32>' }, uMaskUV: { value: [1, 1, 0, 0], type: 'vec4<f32>' }, uAMaskUV: { value: [1, 1, 0, 0], type: 'vec4<f32>' }, uDistUV: { value: [1, 1, 0, 0], type: 'vec4<f32>' }, uColor: { value: [1, 1, 1, 1], type: 'vec4<f32>' }, uP1: { value: [1, 1, 1, 0], type: 'vec4<f32>' }, uP2: { value: [0, 0, 0, 0], type: 'vec4<f32>' } } } });
          const geo = y.mesh ? new PIXI.Geometry({ attributes: { aPosition: new Float32Array(y.mesh.pos.length / 3 * 2), aUV: y.mesh.uv, aColor: y.mesh.col }, indexBuffer: new Uint32Array(y.mesh.idx) }) : QUAD;
          s = new PIXI.Mesh({ geometry: geo, shader: sh }); s.__geo = y.mesh ? geo : null; s.blendMode = y.add ? 'add' : 'normal'; s.visible = false; y.C.addChild(s); s.__u = sh.resources.u.uniforms;
        } else if (y.t) { s = new PIXI.Sprite(y.t); s.anchor.set(0.5); s.blendMode = y.add ? 'add' : 'normal'; s.visible = false; y.C.addChild(s); }
        y.parts.push({ env, s });
      };
      const uval = (y, e, name, def) => { const k = y.prop(name); if (k && e[k]) return e[k]; const v = y.R.props[name]; return Array.isArray(v) ? v : def; };
      const kick = (env, P, n) => {
        const name = P.syms.find((x) => /^(__e_|Signal$)/.test(x)), outs = env.__out ?? [];
        const ev = outs.find((k) => pack.events[k] === name) ?? outs[0]; if (ev === undefined) return;
        for (const y of layers) for (const sl of y.L.slots) if (sl.inp.includes(ev)) for (let i = 0; i < n; i++) spawn(y, sl);
      };
      for (const y of layers) for (const sl of y.L.slots) if (sl.inp.includes(0)) spawn(y, sl); // 시작: 받는 칸이 0 인 층(뿌리)에 입자 하나
      const tick = (dt) => {
        effect.t += dt;
        for (const y of layers) {
          for (let i = y.parts.length - 1; i >= 0; i--) {
            const p = y.parts[i], e = p.env;
            e['effect.dt'] = [dt]; e['scene.dt'] = [dt];
            e['self.lifeRatio'] = [(e['self.lifeRatio']?.[0] ?? 0) + dt * (e['self.invLife']?.[0] ?? 1)];
            if (y.L.evolve) PKFX.run(y.L.evolve, e, ext(y.L, y.L.evolve));
            if (e.__dead || (e['self.invLife'] && e['self.lifeRatio'][0] >= 1) || (!effect.run && !e['self.invLife'])) { p.s?.destroy(); y.parts.splice(i, 1); continue; } // 수명 없는 층(머리·빛)은 효과가 멈추면 같이 꺼짐
            if (!p.s) continue;
            p.s.visible = true;
            const pos = e[y.pos] ?? [effect.x, 0, 0], k = scr.k ?? 1, sz = (e[y.size]?.[0] ?? 0.3) * k, [sx, sy] = scr(pos);
            p.s.x = sx; p.s.y = sy;
            const ax = y.axis && e[y.axis];
            if (ax && Math.hypot(ax[0], ax[1], ax[2]) > 1e-4) { const [ex, ey] = scr([pos[0] + ax[0], pos[1] + ax[1], pos[2] + ax[2]]); p.s.rotation = Math.atan2(ey - sy, ex - sx); p.s.width = Math.max(sz, Math.hypot(ex - sx, ey - sy)); p.s.height = sz; }
            else if (p.s.__geo) { const m = y.mesh, g = e[y.size] ?? [1, 1, 1], a = p.s.__geo.getBuffer('aPosition'), d = a.data; p.s.x = p.s.y = 0; for (let i2 = 0, j = 0; i2 < m.pos.length; i2 += 3, j += 2) { const [qx, qy] = scr([pos[0] + m.pos[i2 + 1] * (g[1] ?? g[0]), pos[1] + m.pos[i2] * g[0], pos[2] + m.pos[i2 + 2] * (g[2] ?? g[0])]); d[j] = qx; d[j + 1] = qy; } a.update(); } // 모델 -Y(꼬리) → 진행 반대
            else if (p.s.__u) p.s.scale.set(Math.max(2, sz)); else { p.s.width = p.s.height = Math.max(2, sz); }
            if (p.s.__u) {
              const u = p.s.__u, v4 = (n, d) => { const a = uval(y, e, n, d); return [0, 1, 2, 3].map((q) => a[q] ?? d[q]); };
              u.uBaseUV = v4('Blend.BaseUVScaleAndOffset', [1, 1, 0, 0]); u.uBlendUV = v4('Blend.BlendUVScaleAndOffset', [1, 1, 0, 0]); u.uMaskUV = v4('BlendMask.BlendMaskUVScaleAndOffset', [1, 1, 0, 0]);
              u.uAMaskUV = v4('AlphaMask.AlphaMaskUVScaleAndOffset', [1, 1, 0, 0]); u.uDistUV = v4('UVDistortion.BlendDistortUVScaleAndOffset', [1, 1, 0, 0]);
              u.uColor = v4('Color.Color', [1, 1, 1, 1]);
              const ex = uval(y, e, 'Exposure.ExposureMultiplier', [1])[0] * Math.min(4, uval(y, e, 'Exposure.PhysicalIntensity', [1])[0]);
              u.uP1 = [uval(y, e, 'Blend.BaseContribution', [1])[0], uval(y, e, 'Blend.BlendContribution', [1])[0], ex || 1, uval(y, e, 'GradientRemap.GradientCursor', [0])[0]];
              u.uP2 = [uval(y, e, 'AlphaRemap.AlphaCursor', [0])[0], uval(y, e, 'UVDistortion.BlendDistortIntensity', [0])[0], y.uber.grad ? 1 : 0, y.uber.remap ? 1 : 0];
              continue;
            }
            const c = e[y.color]; if (c) { p.s.tint = (Math.min(255, c[0] * 255) << 16) | (Math.min(255, c[1] * 255) << 8) | Math.min(255, c[2] * 255); p.s.alpha = Math.max(0, Math.min(1, c[3] ?? 1)); }
          }
        }
      };
      const count = () => layers.reduce((a, y) => a + y.parts.length, 0);
      return { effect, layers, tick, done: () => !count(), destroy: () => { for (const y of layers) y.C.destroy({ children: true }); } };
    }
    return { make, defs };
  }
  globalThis.PKFXE = { load };
})();
