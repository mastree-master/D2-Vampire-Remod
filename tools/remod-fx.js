// HD 입자 엔진(레저렉션 방식): 기술 탄·효과(world.projectiles·missiles)의 원래 그림을 숨기고, D2R 텍스처(d2/fx/*.png)로 입자를 실시간으로 뿌린다
// 기술마다 이미터 목록: 텍스처·초당 개수 또는 한 번에 터뜨릴 개수·수명·속도·방향·크기 변화·색 띠(fx.json)·투명도 변화. 색은 회색 무늬 × 색 띠 tint
(() => {
  const R = (a) => Array.isArray(a) ? a[0] + Math.random() * (a[1] - a[0]) : a ?? 0;
  // 속성별 색 띠(fx.json, D2R 텍스처): 심 색 c, 꼬리 끝 색 e 는 띠 위 자리(0~1)
  const EL = {
    fire: { grad: 'fire', c: 0.62, e: 0.05, smoke: true, a: 0.8 }, cold: { grad: 'frost', c: 0.75, e: 0.2, tex: 'cloud' }, ice: { grad: 'ice', c: 0.6, e: 0, tex: 'cloud' },
    light: { grad: 'lightning', c: 0.85, e: 0.5, bolt: true }, poison: { grad: 'poison', c: 0.12, e: 0, tex: 'cloud', smoke: true, a: 0.3 }, holy: { grad: 'holy', c: 0.9, e: 0.4 },
    chaos: { grad: 'chaos', c: 0.62, e: 0.1, tex: 'cloud', smoke: true }, magic: { grad: 'orders', c: 0.95, e: 0.5 }, bone: { grad: 'ice', c: 0.3, e: 0, tex: 'flash', a: 0.55 }, blood: { grad: 'blood', c: 0.8, e: 0.6, tex: 'cloud', smoke: true },
  };
  const BOLTS = ['bolt0', 'bolt1', 'bolt2', 'bolt3'];
  const mark = (el, list) => list.map((e) => ({ ...e, el })); // 속성 표시(투명도 배율 a 에 씀)
  // 방향: back(날아온 쪽으로 흩날림), any(사방). 크기·투명도·색은 [처음, 끝]
  // 날아가는 탄: 빛나는 심(무늬가 빙글) + 빛무리 + 뒤로 흩날리는 꼬리 + 연기 + 불티 / 번개는 진행 방향 번개 줄기
  const trail = (el, k = 1) => mark(el, trail0(el, k));
  const trail0 = (el, k = 1) => {
    const E = EL[el], t = E.tex ?? 'puff', z = (a) => a.map((v) => v * k);
    if (E.bolt) return [
      { t: 'glow', rate: 40, life: 0.07, size: z([44, 30]), grad: E.grad, g: [0.6, 0.45], alpha: [0.7, 0] },
      { t: 'flash', rate: 40, life: 0.06, size: z([22, 16]), grad: E.grad, g: [0.9, 0.7], alpha: [1, 0] },
      { t: BOLTS, align: true, rate: 90, life: [0.05, 0.11], len: z([60, 120]), size: z([44, 44]), grad: E.grad, g: [0.9, 0.6], alpha: [1, 0] },
      { t: BOLTS, rate: 45, life: [0.04, 0.08], size: z([30, 30]), grad: E.grad, g: [0.85, 0.6], alpha: [0.9, 0], jitter: 8 * k },
      { t: 'spark', rate: 30, life: [0.15, 0.3], speed: [60, 160], dir: 'any', size: [5, 1], grad: E.grad, g: [0.95, 0.7], alpha: [1, 0] },
    ];
    return [
      ...E.smoke ? [{ t: 'smoke', rate: 18, life: [0.5, 0.9], speed: [10, 30], dir: 'back', spread: 0.8, size: z([10, 30]), grad: 'dust', g: [0.25, 0], alpha: [0.35, 0], add: false, rise: -15 }] : [],
      { t, rate: 80, life: [0.1, 0.18], size: z([30, 18]), grad: E.grad, g: [E.c, E.c * 0.65], alpha: [1, 0], spin: 8, jitter: 2 },
      { t: 'glow', rate: 25, life: 0.08, size: z([64, 56]), grad: E.grad, g: [E.c * 0.65, E.c * 0.5], alpha: [0.4, 0] },
      { t, rate: 110, life: [0.25, 0.45], speed: [20, 70], dir: 'back', spread: 0.5, size: z([22, 4]), grad: E.grad, g: [E.c * 0.8, E.e], alpha: [0.8, 0], spin: 3, jitter: 3 },
      { t: 'spark', rate: 30, life: [0.3, 0.6], speed: [30, 110], dir: 'back', spread: 2, size: [6, 2], grad: E.grad, g: [Math.min(1, E.c + 0.2), E.c * 0.6], alpha: [1, 0], rise: -30 },
    ];
  };
  // 폭발·맞음: 번쩍 + 사방으로 퍼지는 무늬 + 불티 + 연기 / 번개는 줄기 몇 개
  const burst = (el, k = 1) => mark(el, burst0(el, k));
  const burst0 = (el, k = 1) => {
    const E = EL[el], t = E.tex ?? 'puff', z = (a) => a.map((v) => v * k), n = (v) => Math.max(1, Math.round(v * Math.min(1.5, k)));
    return [
      ...E.smoke ? [{ t: 'smoke', burst: n(10), life: [0.8, 1.3], speed: [30, 70], dir: 'any', size: z([16, 60]), grad: 'dust', g: [0.3, 0], alpha: [0.3, 0], add: false, rise: -25, drag: 2 }] : [],
      { t: 'flash', burst: 1, life: 0.14, size: z([40, 120]), grad: E.grad, g: [Math.min(1, E.c + 0.13), E.c * 0.7], alpha: [0.9, 0] },
      ...E.bolt ? [{ t: BOLTS, burst: n(5), life: [0.06, 0.14], size: z([50, 70]), grad: E.grad, g: [0.9, 0.6], alpha: [1, 0] }] : [],
      { t, burst: n(26), life: [0.3, 0.55], speed: [60 * k, 190 * k], dir: 'any', size: z([24, 44]), grad: E.grad, g: [Math.min(1, E.c + 0.08), E.e], alpha: [0.85, 0], drag: 4, spin: 4 },
      { t: 'spark', burst: n(30), life: [0.4, 0.8], speed: [100, 280], dir: 'any', size: [7, 2], grad: E.grad, g: [Math.min(1, E.c + 0.23), E.c * 0.6], alpha: [1, 0], rise: el === 'fire' ? 80 : 0, drag: 1.5 },
    ];
  };
  // 바닥에서 계속 타오름(불벽·불길) / 독·혼돈 등은 낮게 깔리는 구름
  const ground = (el, k = 1) => mark(el, ground0(el, k));
  const ground0 = (el, k = 1) => {
    const E = EL[el], z = (a) => a.map((v) => v * k);
    if (el !== 'fire') return [
      { t: 'cloud', rate: 14, life: [0.8, 1.4], speed: [5, 20], dir: 'any', size: z([30, 70]), grad: E.grad, g: [E.c, E.e], alpha: [0.45, 0], spin: 1, jitter: 14 * k, rise: -6 },
      { t: 'glow', rate: 4, life: 0.6, size: z([80, 70]), grad: E.grad, g: [E.c * 0.7, E.e], alpha: [0.25, 0], jitter: 8 * k },
    ];
    return [
      { t: 'smoke', rate: 5, life: [0.8, 1.2], rise: -60, size: z([20, 50]), grad: 'dust', g: [0.25, 0], alpha: [0.3, 0], add: false, jitter: 10 * k },
      { t: 'puff', rate: 20, life: [0.35, 0.7], rise: -110, size: z([26, 10]), tall: 2.2, grad: 'fire', g: [0.55, 0.05], alpha: [0.6, 0], jitter: 12 * k, spin: 2 },
      { t: 'glow', rate: 4, life: 0.3, size: z([60, 50]), grad: 'fire', g: [0.35, 0.2], alpha: [0.25, 0], jitter: 6 * k },
      { t: 'spark', rate: 12, life: [0.5, 1], speed: [10, 40], dir: 'any', rise: -120, size: [6, 2], grad: 'fire', g: [0.85, 0.4], alpha: [1, 0], jitter: 16 * k },
    ];
  };
  // 그림 이름으로 속성·형태를 고름. 물리 탄(화살·도끼·칼날)·오라·저주·시전 빛·변신·소환·함성·이미 HD 로 구운 것(…hd) 등은 원래 그림 그대로
  const KEEP = /^(multipleshot|guided|strafe)|throwaxe|blade|^teeth$|blood|grimward|vine|wolf|bear|feral|maul|revive|curse|aura_|_cast|cast_|cast$|progressive|front$|back$|_front|_back|innersight|slowmissiles|quickness|cloaked|fade|dragonflight|shadowwarrior|psychic|footimpact|fistimpact|stun|taunt|howl|shout|battle|warcry|whirlwind|frenzy|berserk|bash|doubledamage|healing|handofgod|energyshield|armor|enchant|teleport|sparkle|hex|engorge|death_mark|healthlink|warlock|consume|tornado|twister|hurricane|cyclone|rabies|^charge$|redemption|conversion|meditation|holyfreeze|holyshock|hd$|debris|rock|tree|swoosh|in air|mindblast center|dragontail|maker$|sentry \d|death_sentry|^volcano$|^shockwave$/;
  const ELS = [['poison', /poison|plague/], ['fire', /fire|flame|blaze|meteor|inferno|immolation|explodingarrow|bomb|volcano|armageddon|moltenboulder|erruption|hydra|wake of destruction|corpseexplosion/], ['cold', /ice|frost|frozen|cold|freez|blizzard|glacial|chill|arctic/],
    ['light', /light|charged|nova|thunder|shock|fury/], ['holy', /holy|hammer|fistoftheheavens|sanctuarybolt/], ['chaos', /miasma|abyss|chaos/], ['bone', /bone|teethexp/], ['magic', /magicarrow|mindblast/]];
  const auto = (key, spr) => {
    if (KEEP.test(key)) return null;
    const el = ELS.find(([, r]) => r.test(key))?.[0];
    if (!el) return null;
    const k = Math.max(0.5, Math.min(2, (spr.texture?.width ?? 90) / 90));
    if (/explo|exp\d?$|hit|impact|center|crack|smoke/.test(key)) return burst(el, k);
    if (/wall|fire(small|medium)$|firepath|immolationfire|storm|wake of destruction|overlay fire|small fire|infernoflame|meteorfire|armageddonfire|cloud|puff/.test(key)) return ground(el, Math.min(1, k));
    return trail(el, Math.min(el === 'poison' || el === 'bone' ? 0.8 : 1.4, k)); // 독 노바처럼 여러 발이 겹치는 것은 작게
  };
  // 손으로 맞춘 것(자동보다 먼저)
  const FX = {
    // 화염구(D2R vfx_fireball_trail·vfx_exp_arrow_explode 재현): 구운 혜성 머리가 날아가는 쪽을 보고, 뒤로 불 뭉치·불똥·연기가 흩날림
    fireball: [
      { t: 'glow', follow: true, size: [105, 105], grad: 'fire', g: [0.4, 0.4], alpha: [0.22, 0.22], flicker: 0.25 }, // 바닥을 비추는 빛
      { t: 'firepuff*', rate: 70, life: [0.25, 0.42], from: 0.3, behind: 22, speed: [15, 45], dir: 'back', spread: 0.6, size: [26, 44], alpha: [0.65, 0], spin: 2.5, jitter: 4 },
      { t: 'fbhead', follow: true, rot: 'vel', fps: 30, size: [112, 112], alpha: [1, 1], flicker: 0.08 },
      { t: 'spark', rate: 45, life: [0.35, 0.8], behind: 8, speed: [50, 150], dir: 'back', spread: 1.8, size: [6, 1.5], grad: 'fire', g: [1, 0.55], alpha: [1, 0], rise: -45, drag: 1.2, jitter: 6 },
      { t: 'smoke', rate: 9, life: [0.7, 1.1], behind: 30, speed: [5, 20], dir: 'back', spread: 1, size: [20, 52], grad: 'dust', g: [0.18, 0], alpha: [0.3, 0], add: false, rise: -22, jitter: 6 },
    ],
    explodingarrowexp: [
      { t: 'glow', burst: 1, life: 0.7, size: [190, 150], grad: 'fire', g: [0.5, 0.15], alpha: [0.55, 0] }, // 터진 자리 바닥 빛
      { t: 'flash', burst: 1, life: 0.16, size: [70, 190], grad: 'fire', g: [1, 0.85], alpha: [1, 0] },
      { t: 'smoke', burst: 9, delay: [0.12, 0.3], life: [1, 1.6], speed: [20, 60], dir: 'any', size: [34, 96], grad: 'dust', g: [0.2, 0], alpha: [0.38, 0], add: false, rise: -32, drag: 1.5, jitter: 14 },
      { t: 'firepuff*', burst: 6, life: [0.35, 0.5], speed: [0, 30], dir: 'any', size: [70, 120], alpha: [1, 0.2], spin: 1.5, jitter: 6 }, // 가운데 뜨거운 덩어리
      { t: 'firepuff*', burst: 14, delay: [0, 0.07], life: [0.45, 0.8], speed: [60, 170], dir: 'any', drag: 3.2, size: [44, 96], alpha: [0.95, 0], spin: 1.5, rise: -35 }, // 바깥으로 부푸는 불길
      { t: 'spark', burst: 36, life: [0.5, 1.1], speed: [130, 340], dir: 'any', size: [6.5, 1.5], grad: 'fire', g: [1, 0.5], alpha: [1, 0], rise: 140, drag: 1.3 }, // 튀었다 떨어지는 불똥
    ],
    firebolt: trail('fire', 0.7), fireexplode: burst('fire', 0.7),
    firewall: ground('fire'), firesmall: ground('fire'), firemedium: ground('fire'), firewallmaker: ground('fire'),
    chainlightning: trail('light'),
    lightninghit: [{ t: BOLTS, burst: 4, life: [0.05, 0.11], size: [40, 60], grad: 'lightning', g: [0.9, 0.6], alpha: [1, 0] }, { t: 'flash', burst: 1, life: 0.1, size: [30, 50], grad: 'lightning', g: [0.7, 0.5], alpha: [0.5, 0] }],
    frozenorb: [
      { t: 'glow', rate: 25, life: 0.1, size: [70, 60], grad: 'frost', g: [0.3, 0.1], alpha: [0.45, 0] },
      { t: 'cloud', rate: 40, life: [0.15, 0.3], size: [40, 26], grad: 'frost', g: [0.75, 0.3], alpha: [0.8, 0], spin: 7 },
      { t: 'flash', rate: 30, life: 0.08, size: [26, 18], grad: 'frost', g: [1, 0.8], alpha: [1, 0] },
      { t: 'spark', rate: 60, life: [0.25, 0.5], speed: [60, 150], dir: 'any', size: [7, 2], grad: 'frost', g: [1, 0.5], alpha: [1, 0] },
    ],
    frozenorbbolt: trail('ice', 0.45), frozenorbnova: trail('ice', 0.45),
    // 암살자 인페르노 센트리 불줄기: 원래 그림이 수천 개 겹쳐 노란 덩어리가 되므로 작은 불 꼬리로(입자 수도 줄임)
    'inferno sentry 1': trail('fire', 0.4).map((e) => ({ ...e, rate: e.rate && e.rate / 4 })), 'inferno sentry 2': trail('fire', 0.4).map((e) => ({ ...e, rate: e.rate && e.rate / 4 })),
    // 악마술사(미리 구운 HD 그림 대신 입자): 독기 볼트·구름, 화염 고리·폭발, 화염 파도, 심연 폭발, 피 끓음
    miasmahd: trail('chaos'), miasmacloudhd: ground('chaos'), ringoffirehd: trail('fire', 0.8), ringoffireexphd: burst('fire'), flamewavehd: trail('fire', 1.3), abyssexphd: burst('chaos', 1.8), bloodboilhd: burst('blood', 1.1),
  };
  const fxOf = (key, spr) => (key in FX ? FX[key] : (FX[key] = auto(key, spr)));
  globalThis.__fxOf = fxOf; // 시험용: 어떤 키에 무엇이 붙는지

  let ready = null, layer = null, keyOf = new Map(), artN = -1, last = 0;
  const parts = [], free = [], seen = new WeakMap(), TEX = {}, ANI = {}, MAX = 3000;
  globalThis.__fxParts = parts; // 시험용
  let grads = {}, tick = 0; // tick: 따라붙는 입자(follow)가 이번 프레임에 주인을 봤는지 가리는 프레임 번호
  const color = (name, k) => { const g = grads[name]; if (!g) return 0xffffff; const f = Math.max(0, Math.min(1, k)) * 15, i = Math.floor(f), j = Math.min(15, i + 1), u = f - i, a = g[i], b = g[j]; return ((((a >> 16) & 255) * (1 - u) + ((b >> 16) & 255) * u) << 16) | ((((a >> 8) & 255) * (1 - u) + ((b >> 8) & 255) * u) << 8) | ((a & 255) * (1 - u) + (b & 255) * u); };
  const init = (spr) => {
    ready = 'loading';
    const T = spr.texture.constructor, Sp = spr.constructor, Ct = spr.parent.constructor, base = globalThis.__fxBase ?? 'app://game/d2/';
    fetch(base + 'fx.json').then((r) => r.json()).then((j) => { grads = j; }).catch(() => {});
    const names = ['flame', 'puff', 'smoke', 'cloud', 'flash', 'glow', 'spark', ...BOLTS];
    // 구운 플립북(remod-fx-bake.js → fx/anims.json): 가로 띠를 장마다 잘라 텍스처 목록으로
    const anims = fetch(base + 'fx/anims.json').then((r) => r.json()).then((A) => Promise.all(Object.entries(A).map(([n, a]) => new Promise((ok) => {
      const im = new Image();
      im.onload = () => { ANI[n] = { ...a, f: Array.from({ length: a.n }, (_, i) => { const cv = document.createElement('canvas'); cv.width = a.w; cv.height = a.h; cv.getContext('2d').drawImage(im, i * a.w, 0, a.w, a.h, 0, 0, a.w, a.h); return T.from(cv); }) }; ok(); };
      im.onerror = ok; im.src = `${base}fx/${n}.png`;
    })))).catch(() => {});
    Promise.all([anims, ...names.map((n) => new Promise((ok) => { const im = new Image(); im.onload = () => { TEX[n] = T.from(im); ok(); }; im.onerror = ok; im.src = `${base}fx/${n}.png`; }))]).then(() => { ready = { Sp, Ct }; });
  };
  // 텍스처 이름: 'firepuff*' 는 firepuff0~ 중 아무거나. 구운 플립북이면 장 목록
  const pick = (t) => {
    let tn = Array.isArray(t) ? t[Math.floor(Math.random() * t.length)] : t;
    if (tn.endsWith('*')) { const vs = Object.keys(ANI).filter((k) => k.startsWith(tn.slice(0, -1))); tn = vs[Math.floor(Math.random() * vs.length)] ?? tn; }
    return ANI[tn] ? { a: ANI[tn], tx: ANI[tn].f[0] } : { tx: TEX[tn] };
  };
  const emit = (d, x, y, vx, vy) => {
    if (parts.length >= MAX) return null;
    const { a: an, tx } = pick(d.t);
    if (!tx) return null;
    let s = free.pop(); if (!s || s.destroyed) s = new ready.Sp(tx);
    s.texture = tx; s.anchor.set(an?.ax ?? 0.5, an?.ay ?? 0.5); s.blendMode = d.add === false ? 'normal' : 'add'; s.visible = false;
    const L = layer.children[d.add === false ? 0 : 1]; if (s.parent !== L) L.addChild(s); // 연기(보통 섞기)는 아래층, 빛(더하기)은 위층
    const v = Math.hypot(vx, vy) || 1, back = Math.atan2(-vy, -vx), sp = R(d.speed), a = d.dir === 'back' ? back + (Math.random() - 0.5) * (d.spread ?? 1) : Math.random() * Math.PI * 2, j = d.jitter ?? 0, bk = d.behind ?? 0;
    const p = { s, d, an, key: emit.key, age: -R(d.delay), life: R(d.life), x: x - vx / v * bk + (Math.random() - 0.5) * 2 * j, y: y - vy / v * bk + (Math.random() - 0.5) * j, vx: d.dir ? Math.cos(a) * sp : 0, vy: d.dir ? Math.sin(a) * sp : 0, spin: (Math.random() - 0.5) * (d.spin ?? 0), rot: Math.random() * Math.PI * 2, w: tx.width, fl: 1 };
    if (d.align) { p.rot = Math.atan2(vy, vx) + Math.PI / 2; p.len = R(d.len); p.spin = 0; }
    if (d.rot === 'vel') { p.rot = Math.atan2(vy, vx); p.spin = 0; }
    parts.push(p);
    return p;
  };
  // 다시 불러오기(시험 중 CDP 로 이 파일을 또 실행): 세대 번호가 바뀌면 옛 고리는 멈추고 옛 입자층을 지움
  const gen = globalThis.__fxGen = (globalThis.__fxGen ?? 0) + 1;
  globalThis.__fxLayer?.destroy?.({ children: true });
  const step = (now) => {
    if (gen !== globalThis.__fxGen) return;
    requestAnimationFrame(step);
    const gm = globalThis.__gm, w = gm?.world;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!w) return;
    const list = [...(w.projectiles ?? []), ...(w.missiles ?? [])];
    if (!ready) { const o = list.find((p) => p.sprite?.parent); if (o) init(o.sprite); return; }
    if (ready === 'loading') return;
    const arts = gm.art?.missiles ?? {};
    if (Object.keys(arts).length !== artN) { artN = Object.keys(arts).length; keyOf = new Map(Object.entries(arts).map(([k, v]) => [v, k])); }
    const playing = gm.state === 'playing';
    tick++;
    for (const o of list) {
      const spr = o.sprite, key = spr && keyOf.get(o.anim), def = key && fxOf(key, spr);
      if (!def || o.dead || spr.destroyed || o.time < 0) continue; // time<0: 늦게 나오는 효과(연쇄 번개 마디 등)는 보일 때부터
      layer = spr.parent.__fx; // 그림이 놓인 무대(컨테이너)마다 입자층 하나(악마술사 탄은 다른 무대에 있음)
      if (!layer || layer.destroyed) { layer = spr.parent.__fx = globalThis.__fxLayer = new ready.Ct(); layer.zIndex = 1e7; layer.addChild(new ready.Ct(), new ready.Ct()); spr.parent.addChild(layer); }
      if (!def.keep) spr.alpha = 0; // keep: 원래 그림을 살리고 그 위에 더함
      const x = spr.x, y = spr.y - (spr.anchor.y - 0.5) * (spr.texture?.height ?? 0), vx = o.vx ?? 0, vy = o.vy ?? 0;
      let st = seen.get(o);
      if (!st) {
        st = { acc: def.map(() => 0), fol: [] }; seen.set(o, st); emit.key = key;
        def.forEach((d, i) => { if (d.follow) st.fol[i] = emit(d, x, y, vx, vy); else for (let n = 0; n < (d.burst ?? 0); n++) emit(d, x, y, vx, vy); });
      }
      // 따라붙는 입자(탄 머리·빛무리): 주인 자리·방향으로
      for (const p of st.fol) if (p) { p.x = x; p.y = y; p.seen = tick; if (p.d.rot === 'vel' && (vx || vy)) p.rot = Math.atan2(vy, vx); }
      if (!playing) continue;
      const px = st.x ?? x, py = st.y ?? y; st.x = x; st.y = y; // 지난 프레임 자리부터 지금 자리까지 나눠 뿌림(프레임이 떨어져도 꼬리가 끊기지 않게)
      emit.key = key;
      def.forEach((d, i) => { if (!d.rate) return; st.acc[i] += d.rate * dt; const n = Math.floor(st.acc[i]); for (let m = 0; m < n; m++) { const u = (m + 1) / n; emit(d, px + (x - px) * u, py + (y - py) * u, vx, vy); } st.acc[i] -= n; });
    }
    if (!playing) return;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i], d = p.d, s = p.s; p.age += dt;
      if (d.follow && p.seen !== tick && !p.gone) { p.gone = true; p.life = p.age + (d.fade ?? 0.06); p.k0 = p.age; } // 주인이 사라지면 짧게 꺼짐
      if (p.age >= p.life && !(d.follow && !p.gone)) { s.visible = false; free.push(s); parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      if (p.age < 0) continue; // delay: 아직 안 나옴
      // follow 는 생애 없이 처음 값 유지, 꺼질 때만 투명도가 0 으로
      const k = d.follow ? 0 : p.age / p.life, fade = d.follow && p.gone ? 1 - (p.age - p.k0) / (p.life - p.k0) : 1, dr = Math.max(0, 1 - (d.drag ?? 0) * dt);
      if (!d.follow) { p.vx *= dr; p.vy = p.vy * dr + (d.rise ?? 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt; if (d.tall) p.rot = 0; }
      if (p.an) s.texture = p.an.f[d.fps ? Math.floor(p.age * d.fps) % p.an.n : Math.min(p.an.n - 1, Math.floor(((d.from ?? 0) + k * (1 - (d.from ?? 0))) * p.an.n))]; // 반복(fps) 또는 생애에 맞춰 한 번(from: 플립북 중간부터, 식은 불)
      const sz = d.size[0] + (d.size[1] - d.size[0]) * k;
      s.visible = true; s.x = p.x; s.y = p.y; s.rotation = p.rot;
      if (d.align) s.scale.set(sz / p.w, p.len / p.w); else s.scale.set(sz / p.w, sz * (d.tall ?? 1) / p.w); // tall: 불꽃처럼 위로 길쭉
      if (d.flicker) p.fl += ((1 - d.flicker + Math.random() * d.flicker * 2) - p.fl) * Math.min(1, dt * 20); // 일렁이는 밝기
      s.alpha = (d.alpha[0] + (d.alpha[1] - d.alpha[0]) * k) * (EL[d.el]?.a ?? 1) * fade * p.fl;
      s.tint = d.grad ? color(d.grad, d.g[0] + (d.g[1] - d.g[0]) * k) : 0xffffff; // 구운 플립북은 이미 색이 있음
    }
  };
  requestAnimationFrame(step);
})();
