// 캐릭터 선택 화면(레저렉션식): 왼쪽 메뉴, 가운데 캐릭터·막별 배경, 오른쪽 목록·새로 만들기, 삭제·계속. 같은 직업 여러 개는 직업별 세이브 조각을 바꿔 끼운다
(() => {
  const CLS = [['amazon', '아마존'], ['sorceress', '원소술사'], ['necromancer', '강령술사'], ['paladin', '성기사'], ['barbarian', '야만용사'], ['druid', '드루이드'], ['assassin', '암살자'], ['warlock', '악마술사']];
  const KO = Object.fromEntries(CLS);
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { alert('저장 공간이 부족합니다.'); } };
  const el = (tag, style, text) => { const d = document.createElement(tag); d.style.cssText = style ?? ''; d.textContent = text ?? ''; return d; };
  const FONT = '"D2 Exocet","D2R Kodia",serif';
  const D2B = `min-width:150px;padding:10px 18px;font:bold 16px ${FONT};letter-spacing:1px;cursor:pointer;color:#c7b377;background:linear-gradient(#4a4740,#1e1c19);border:2px outset #77736a;text-shadow:0 1px 0 #000`;
  const big = (t, on) => { const b = el('button', D2B, t); b.onclick = (e) => { e.stopPropagation(); on(); }; return b; };

  // 직업별 조각이 들어 있는 세이브 칸: 어느 직업 이름이든 하위 키로 가진 객체. 난이도 해금(unlocked)도 캐릭터마다 따로(바알 잡으면 원작이 다음 난이도를 연다)
  const perClass = (s) => Object.keys(s).filter((k) => s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && CLS.some(([c]) => c in s[k]));
  const take = (s, cls) => Object.fromEntries(perClass(s).filter((k) => cls in s[k]).map((k) => [k, s[k][cls]]));
  const put = (s, cls, data) => { for (const k of perClass(s)) delete s[k][cls]; for (const [k, v] of Object.entries(data)) (s[k] ??= {})[cls] = v; };

  // chars: [{id, name, cls, data}] — data 가 null 이면 지금 세이브에 올라가 있는(활성) 캐릭터
  const list = () => {
    const s = globalThis.__gm?.save, chars = load('d2vr/chars', null);
    if (chars || !s) return chars ?? [];
    const first = Object.keys(s.heroes ?? {}).map((cls) => ({ id: crypto.randomUUID(), name: KO[cls] ?? cls, cls, data: null }));
    store('d2vr/chars', first);
    return first;
  };
  // 레벨: 저장된 판 → (활성 캐릭터면) 원작 저장 정보 → 공포 영역 글('level-99')
  const level = (c) => (c.data ? c.data.heroes : globalThis.__gm?.save?.heroes?.[c.cls])?.run?.run?.level
    ?? ((c.data ? null : globalThis.__cfApi?.saved(c.cls)?.level ?? +(globalThis.__cfApi?.terror(c.cls)?.hero?.match(/level-(\d+)/)?.[1] ?? 0)) || null);
  const activate = (chars, c) => {
    const s = globalThis.__gm.save;
    if (c.data) {
      const cur = chars.find((x) => x.cls === c.cls && !x.data && x !== c);
      if (cur) cur.data = take(s, c.cls);
      // 해금 기록 없이 저장된 원래 캐릭터: 지금 해금 유지
      if (!('unlocked' in c.data) && !c.made && s.unlocked?.[c.cls]) c.data.unlocked = s.unlocked[c.cls];
      put(s, c.cls, c.data);
      c.data = null;
    }
    // 리모드로 만든 캐릭터는 예전엔 같은 직업 해금을 물려받았음: 처음 한 번 들어가 본 가장 높은 난이도로 되돌림
    if (c.made && !c.ul) {
      const u = ['hell', 'nightmare'].find((d) => c.seen?.includes(d));
      // 물려받은 해금은 같은 직업 원래 캐릭터(해금 기록 없이 저장된) 몫으로 넘겨 둔다
      for (const x of chars) if (x.data && !x.made && x.cls === c.cls && !('unlocked' in x.data) && s.unlocked?.[c.cls]) x.data.unlocked = s.unlocked[c.cls];
      if (u) (s.unlocked ??= {})[c.cls] = u; else if (s.unlocked) delete s.unlocked[c.cls];
      c.ul = true;
    }
    store('d2vr/chars', chars);
    globalThis.__saveNow?.();
  };

  // 원작 그림(게임이 디아2에서 뽑아 둔 /d2/frontend)으로 레저렉션식 화면을 그린다
  const F = '/d2/frontend/';
  let front = null;
  // 워락은 원작 선택 화면 그림이 없어(D2R 것도 강령술사 복사본) 게임 몸 그림(NU 서 있기, 첫 방향 줄)으로 대신한다
  const frontend = async () => (front ??= await (async () => {
    const fe = await (await fetch('/d2/frontend.json')).json();
    const nu = (await fetch('/d2/classes.json').then((x) => x.json()).catch(() => null))?.warlock?.NU;
    if (nu) { const a = { file: nu.file, frames: nu.framesPerDirection, columns: nu.framesPerDirection, width: nu.frameWidth, height: nu.frameHeight, originX: nu.originX, originY: nu.originY, fps: nu.fps ?? 12, row: 4 }; fe.heroSelect.heroes.warlock = { ...fe.heroSelect.heroes.warlock, idle: a, hover: a, selected: a }; } // D2R 2D 선택 그림(WK*.dc6)은 강령술사 그림과 똑같은 파일이라 늘 몸 그림으로
    return fe;
  })());
  const img = (file) => { const i = new Image(); i.src = '/d2/' + file; return i; };
  // 줄로 이어 붙은 애니메이션 그림 한 장면을 캔버스에 그린다
  const frame = (ctx, a, i, t, x, y, s = 1) => {
    if (!i.complete || !i.naturalWidth) return;
    const f = Math.floor(t * a.fps / 1000) % a.frames, cx = (f % a.columns) * a.width, cy = (Math.floor(f / a.columns) + (a.row ?? 0)) * a.height; // row: 몸 그림의 방향 줄(워락)
    ctx.drawImage(i, cx, cy, a.width, a.height, x - a.originX * s, y - a.originY * s, a.width * s, a.height * s);
  };
  // 막(액트)마다 다른 배경: 원작 장면 그림 + 막 분위기 색
  const SCENE = { 1: ['heroselect', 'none'], 2: ['menu', 'sepia(.7) saturate(1.6) hue-rotate(-12deg) brightness(1.05)'], 3: ['menu', 'hue-rotate(70deg) saturate(1.4) brightness(.9)'], 4: ['heroselect', 'hue-rotate(-25deg) saturate(2.4) brightness(.85)'], 5: ['title', 'saturate(.6) brightness(1.1)'] };
  // 돌 판: 금테 두 줄 + 어두운 돌빛(원작 팝업 그림은 아래 가운데 장식 막대가 같이 나와서 CSS 로 그림)
  // 무쇠 틀 판(레저렉션 메뉴처럼 회색 쇠테 + 검은 돌)
  const STONE = 'border:5px solid #3f3d39;outline:1px solid #000;box-shadow:0 0 0 3px #1a1917,0 0 0 4px #5e5b55,0 0 14px 4px #000,inset 0 0 0 1px #000,inset 0 0 0 2px #59564f,inset 0 0 0 3px #000,inset 0 0 50px #000;padding:14px;background:repeating-linear-gradient(115deg,#ffffff03 0 2px,#0000 2px 5px),radial-gradient(ellipse at 50% 0,#22211f,#0d0d0c 75%)';
  // 공포 영역 글을 한국어로: 'Terror 29 · Best tier: 76' → 단계 숫자
  const terrorInfo = (cls) => { const t = globalThis.__cfApi?.terror(cls), m = t?.score?.match(/(\d+)\D+(\d+)/); return m ? { now: +m[1], best: +m[2] } : null; };
  const tr = (x) => String(globalThis.__ko?.(x) ?? x);
  const BTN = `white-space:nowrap;flex-shrink:0;cursor:pointer;color:#c7b377;font:bold 15px ${FONT};letter-spacing:1px;text-shadow:0 1px 2px #000;background:url(${F}button-wide.png) center/100% 100%;border:0;height:42px;padding:0 24px`;
  // D2R 원본 UI 그림(tools/remod-d2r.cjs 가 이 PC 의 D2R 에서 꺼내 d2/d2r 에 둠). 없으면 원작 D2 그림으로
  const R = '/d2/d2r/hd/global/ui/';
  let d2r = null;
  // 가로로 이어 붙은 그림의 i 번째 장을 칸 크기에 맞춰 보여 주는 판(안에 글·버튼을 올림)
  const sp = (name, i = 0, style = '') => {
    const m = d2r?.['hd/global/ui/' + name], box = el('div', 'position:relative;overflow:hidden;' + style);
    box.className = 'd2r-sp';
    if (!m) return box;
    const im = el('img', `position:absolute;top:0;height:100%;width:${(m.w / m.frameW) * 100}%;pointer-events:none;user-select:none`);
    im.src = R + name + '.png';
    box.frame = (k) => (im.style.left = `${(-k * (m.w / m.frames) / m.frameW) * 100}%`);
    box.frame(i);
    box.append(im);
    return box;
  };
  const ready = async () => (d2r ??= await fetch('/d2/d2r.json').then((x) => x.json()).catch(() => null));
  const stoneBtn = (t, on, w = '100%', kind = 'frontend/hd/final/frontend_buttonmed', h = '46px') => {
    if (!d2r) {
      const b = el('button', BTN + `;width:${w}`, t);
      b.onmousedown = () => (b.style.backgroundImage = `url(${F}button-wide-down.png)`);
      b.onmouseup = b.onmouseleave = () => (b.style.backgroundImage = `url(${F}button-wide.png)`);
      b.onclick = (e) => { e.stopPropagation(); on?.(); };
      return b;
    }
    // D2R 버튼 4장: 보통·마우스 올림·누름·못 누름
    const b = sp(kind, 0, `width:${w};height:${h};flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;white-space:nowrap`);
    const tx = el('span', `position:relative;color:#d8cdb0;font:20px ${FONT};letter-spacing:1px;text-shadow:0 1px 2px #000`, t);
    b.append(tx);
    b.onmouseenter = () => !b.disabled && b.frame(1);
    b.onmouseleave = () => b.frame(b.disabled ? 3 : 0);
    b.onmousedown = () => !b.disabled && b.frame(2);
    b.onmouseup = () => !b.disabled && b.frame(1);
    b.onclick = (e) => { e.stopPropagation(); if (!b.disabled) on?.(); };
    Object.defineProperty(b, 'disabled', { set(v) { this._off = v; b.frame(v ? 3 : 0); b.style.cursor = v ? 'default' : 'pointer'; }, get() { return this._off; } });
    Object.defineProperty(b, 'textContent', { set(v) { tx.textContent = v; }, get() { return tx.textContent; } });
    return b;
  };
  // 장비 모습 → frame() 이 그리는 형식 [동작, 그림, 발밑 기준]
  const lookAnim = (lk) => { if (!lk?.png) return null; const i = new Image(); i.src = lk.png; return [{ fps: lk.fps, frames: lk.frames, columns: lk.frames, width: lk.w, height: lk.h, originX: lk.ox, originY: lk.oy }, i, true]; };
  const DIFF = { normal: '보통', nightmare: '악몽', hell: '지옥' };

  const open = async (multi) => {
    document.getElementById('__chars')?.remove();
    const fe = await frontend();
    if (!document.getElementById('d2r-sp-css')) { const st = el('style'); st.id = 'd2r-sp-css'; st.textContent = '.d2r-sp>*:not(img){position:relative}#__chars>div>canvas{align-self:stretch}'; document.head.append(st); }
    await ready();
    // 원작 시작 함수(__cfApi)를 받으려고 모닥불 화면을 뒤에 한 번 연다. 우리 화면이 위를 덮는다
    globalThis.__mpSelect?.();
    const wrap = el('div', `position:fixed;inset:0;z-index:99996;background:#000;color:#c7b377;font-family:${FONT};overflow:hidden`);
    wrap.id = '__chars';
    wrap.onkeydown = wrap.onkeyup = (e) => e.stopPropagation();
    document.body.append(wrap);
    let chars = list(), sel = chars[0]?.id, raf = 0;
    const close = () => { cancelAnimationFrame(raf); wrap.remove(); };
    const cur = () => chars.find((x) => x.id === sel);
    const heroOf = (c) => (c.data ? c.data.heroes : globalThis.__gm?.save?.heroes?.[c.cls]);
    const popup = (title, rows, top, bottom) => {
      const bg = el('div', 'position:absolute;inset:0;background:#000a;display:flex;align-items:center;justify-content:center;z-index:4');
      const p = el('div', (d2r ? `background:url(${R}frontend/hd/final/frontend_difficultymodal.png) center/100% 100%;padding:44px 40px` : STONE + ';padding:6px 10px') + ';min-width:360px;text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center');
      p.append(el('div', 'font-size:20px;color:#e0c070;margin:4px 0 6px;white-space:pre-line', title));
      if (top) p.append(top);
      for (const [t, on, off] of rows) {
        const b = stoneBtn(t, () => { bg.remove(); on?.(); }, '280px');
        if (off) { b.disabled = true; b.style.opacity = '.4'; }
        p.append(b);
      }
      if (bottom) p.append(bottom);
      bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
      bg.append(p);
      wrap.append(bg);
    };
    // 계속: 원작 [시작]과 같은 갈래(이어하기 / 새 실행 → 난이도·공포 영역)
    const ok = async () => {
      const c = cur(), api = globalThis.__cfApi;
      if (!c || !api) return;
      if (!(await globalThis.__guardOk?.(c.cls) ?? true)) return; // 변조·복사본·차단 캐릭터는 시작 못 함(remod-guard.js)
      activate(chars, c);
      globalThis.__remodChar = { key: c.id, id: c.cls, name: c.name, cls: KO[c.cls] ?? c.cls, level: level(c), terror: terrorInfo(c.cls) };
      globalThis.__mp = !!multi; // 저장 후 나가기 뒤 대기실로(remod-chat.js __afterLeave)
      const kit = api.kit(c.cls), saved = api.saved(c.cls), go = (f) => { close(); f(); };
      // 난이도 한 줄: 이어하기(저장된 판이 있으면) · 보통 · 악몽 · 지옥 · 공포(바로 공포 영역 시작)
      const ds = api.diffs(c.cls) ?? ['normal'], terror = c.made && !level(c) ? null : api.terror(c.cls), ti = terror && terrorInfo(c.cls);
      const sd = saved && { Normal: 'normal', Nightmare: 'nightmare', Hell: 'hell' }[saved.difficulty];
      // 시작 위치 라디오: 마을(야영지 포탈 앞) / 던전(바로 판 시작). 고른 값은 기억
      let at = load('d2vr/start', 'town');
      const radio = el('div', 'display:flex;gap:6px;justify-content:center;margin:0 0 8px');
      const drawR = () => radio.replaceChildren(...[['town', '마을에서 시작'], ['dungeon', '던전에서 시작']].map(([k, t]) => {
        const b = stoneBtn((k === at ? '✓ ' : '') + t, () => { at = k; store('d2vr/start', k); drawR(); }, '136px');
        if (k !== at) b.style.opacity = '.6';
        const sp = b.querySelector('span'); if (sp) sp.style.fontSize = '15px';
        return b;
      }));
      drawR();
      // 던전 시작 막(1~5). 저장된 영웅이 없는 새 캐릭터는 1막부터
      let actPick = load('d2vr/act', 1);
      const acts = el('div', 'display:flex;gap:4px;justify-content:center;margin:0 0 8px');
      const drawA = () => acts.replaceChildren(...[1, 2, 3, 4, 5].map((n) => { const b = stoneBtn((n === actPick ? '✓ ' : '') + n + '막', () => { actPick = n; store('d2vr/act', n); drawA(); }, '54px'); if (n !== actPick) b.style.opacity = '.6'; const sp = b.querySelector('span'); if (sp) sp.style.fontSize = '14px'; return b; }));
      drawA();
      radio.style.flexWrap = 'wrap'; const holder = el('div', ''); holder.append(radio, acts);
      const where = (_, town, dungeon) => go(at === 'dungeon' ? () => ((globalThis.__campDiff = null), dungeon()) : town);
      // 공포 단계 칸(던전 시작일 때): 내 단계보다 낮으면 다시하기(기록 안 바뀜), 같으면 내 공포 판. 남은 다시하기는 지우고 시작
      const tierBox = el('div', 'display:flex;gap:8px;align-items:center;justify-content:center;margin-top:6px;color:#b080ff;font-size:16px');
      const tierIn = el('input', 'width:64px;background:#0d0b07;color:#e8d8a8;border:1px solid #5a4a2a;padding:3px;font-size:16px;text-align:center');
      tierIn.type = 'number'; tierIn.min = 1; tierIn.max = ti?.now ?? 1; tierIn.value = ti?.now ?? 1;
      tierIn.onclick = (e) => e.stopPropagation();
      tierBox.append(el('span', '', '공포 단계'), tierIn, el('span', 'color:#8a8478', `1~${ti?.now ?? 1}단계 가능 · 던전에서 시작일 때`));
      const startT = (t) => {
        const now = ti?.now ?? 1, T = globalThis.__gm.save.terror?.[c.cls];
        t = Math.max(1, Math.min(now, Math.floor(t) || now));
        if (t < now) return globalThis.__gm.startReplay(kit, t);
        if (T) { delete T.replay; delete T.left; }
        api.startTerror(kit, 0);
      };
      const rows = [
        ...(saved ? [[`이어하기 (${({ I: 1, II: 2, III: 3, IV: 4, V: 5 })[saved.act] ?? saved.act}막 · ${DIFF[sd] ?? '공포'})`, () => go(() => ((globalThis.__campDiff = null), api.resume(kit)))]] : []),
        ...['normal', 'nightmare', 'hell'].map((d) => [DIFF[d], () => where(DIFF[d], () => ((globalThis.__campDiff = d), globalThis.__gm.enterCamp(kit)), () => globalThis.__gm.startAct(kit, d, actPick)), !ds.includes(d)]),
        ...(terror ? [[`공포 ${ti?.now ?? ''}단계`, () => where('', () => ((globalThis.__campDiff = 'terror'), globalThis.__gm.enterCamp(kit)), () => startT(+tierIn.value))]] : []),
      ];
      // 멀티: 게임을 켜지 않고 바로 대기실. 난이도는 방에서 정하고, 방에 들어가면 그때 시작
      if (multi) return Promise.resolve(globalThis.__bnet?.()).finally(close); // 대기실을 다 그린 뒤 닫아야 원작 직업 선택 화면이 안 비침
      if (rows.filter((x) => !x[2]).length < 2) return go(() => api.play(kit, 'normal'));
      popup(`레벨 ${level(c) ?? 1} ${KO[c.cls]}${ti ? `\n공포 영역 최고 ${ti.best}단계` : ''}`, rows, holder, terror ? tierBox : null);
    };
    const back = () => { close(); globalThis.__gm?.toMainMenu?.(); }; // toMenu 는 야영지가 켜져 있으면 게임에 들어감
    const remove = () => {
      const c = cur();
      if (!c) return;
      popup(`${c.name} (${KO[c.cls]})\n캐릭터를 지웁니다. 되돌릴 수 없습니다.`, [['삭제', () => {
        if (!c.data) {
          // 활성 캐릭터를 지우면 같은 직업의 다른 캐릭터를 올리고, 없으면 그 직업을 비운다
          const next = chars.find((x) => x.cls === c.cls && x !== c);
          put(globalThis.__gm.save, c.cls, next?.data ?? {});
          if (next) next.data = null;
          globalThis.__saveNow?.();
        }
        chars = chars.filter((x) => x !== c);
        store('d2vr/chars', chars);
        sel = chars[0]?.id;
        render();
      }], ['취소']]);
    };

    // 화면: 왼쪽 돌 판(로고·메뉴), 가운데 배경 + 고른 캐릭터 크게, 오른쪽 돌 판(새로 만들기·목록), 아래 가운데 삭제·계속
    const bgImg = el('div', 'position:absolute;inset:0;background-size:cover;background-position:center');
    const stage = el('canvas', 'position:absolute;inset:0;width:100%;height:100%');
    const logo = el('canvas', 'width:100%;flex-shrink:0');
    logo.width = 400; logo.height = 210;
    const SIDE = STONE + ';position:absolute;top:3vh;bottom:3vh;width:20vw;min-width:240px;box-sizing:border-box;display:flex;flex-direction:column';
    const PANEL = 'position:absolute;top:2vh;bottom:2vh;width:22vw;min-width:250px;box-sizing:border-box;display:flex;flex-direction:column';
    const left = d2r ? el('div', PANEL + `;left:0.5vw;align-items:center;gap:12px;padding:3.5vw 2.4vw;background:url(${R}frontend/hd/final/frontend_leftpanel.png) center/100% 100%`) : el('div', SIDE + ';left:1vw;align-items:center;gap:14px');
    const right = d2r ? el('div', PANEL + `;right:0.5vw;gap:6px;padding:3.5vw 2.2vw 11vh;background:url(${R}frontend/hd/final/frontend_rightpanel.png) center/100% 100%`) : el('div', SIDE + ';right:1vw;gap:8px');
    const bottom = el('div', 'position:absolute;left:0;right:0;bottom:5vh;display:flex;gap:8px;justify-content:center;align-items:center');
    const cname = el('div', `position:absolute;left:0;right:0;top:8vh;text-align:center;font:bold 30px ${FONT};color:#e8d8a8;text-shadow:0 2px 6px #000`);
    wrap.append(bgImg, stage, cname, left, right, bottom);
    const L = fe.logo.layers.map((a) => [a, img(a.file)]);
    let hero = null;
    const draw = (t) => {
      raf = requestAnimationFrame(draw);
      const lc = logo.getContext('2d');
      lc.clearRect(0, 0, 400, 210);
      for (const [a, i] of L) { lc.globalCompositeOperation = a.blend === 'add' ? 'lighter' : 'source-over'; frame(lc, a, i, t, 200, 110); }
      lc.globalCompositeOperation = 'source-over';
      lc.font = `bold 32px ${FONT}`; lc.textAlign = 'center'; lc.fillStyle = '#b01818'; lc.shadowColor = '#600'; lc.shadowBlur = 14;
      lc.fillText('뱀파이어 리모드', 200, 198); lc.shadowBlur = 0;
      const w = stage.clientWidth, h = stage.clientHeight;
      if (stage.width !== w || stage.height !== h) { stage.width = w; stage.height = h; }
      const ctx = stage.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      if (hero) { ctx.imageSmoothingEnabled = !hero[2]; ctx.imageSmoothingQuality = 'high'; frame(ctx, hero[0], hero[1], t, w / 2, hero[2] ? h * 0.826 : h * 0.52, (h * (hero[2] ? 0.7 : 0.62)) / hero[0].height); }
    };
    const render = () => {
      const c = cur();
      const [scene, filter] = SCENE[heroOf(c ?? {})?.run?.act] ?? SCENE[1];
      bgImg.style.backgroundImage = `url(${F}${scene}.png)`;
      bgImg.style.filter = filter;
      const a = c && fe.heroSelect.heroes[c.cls]?.selected;
      // 게임에서 찍어 둔 장비 입은 모습(remod-look.js)이 있으면 그걸, 없으면 원작 캐릭터 선택 그림
      const sv = c && load('d2vr/look/' + c.id, null), lk = sv?.cls === c?.cls ? lookAnim(sv) : null; // 직업이 같은 모습만(예전에 남의 직업 모습이 잘못 저장된 것 무시)
      hero = lk ?? (a ? [a, img(a.file)] : null);
      cname.textContent = c?.name ?? '';
      left.replaceChildren(logo, el('div', 'font:14px "D2R Kodia",sans-serif;color:#998;margin:-6px 0 18px', multi ? '멀티플레이' : '싱글플레이'),
        ...[[multi ? '싱글플레이로' : '멀티플레이로', () => { close(); open(!multi); }], ['도움말', () => globalThis.__remodGuide?.()], ['나가기', back]].map(([t, on]) => stoneBtn(t, on, '90%')));
      const keep = right.querySelector('.__list')?.scrollTop ?? 0; // 다시 그려도 목록 스크롤 자리 유지(누를 때 맨 위로 튀지 않게)
      const listBox = el('div', 'flex:1;overflow:auto;display:flex;flex-direction:column;gap:6px;padding-right:2px'); listBox.className = '__list';
      for (const x of chars) {
        const lv = level(x), on = x.id === sel;
        const card = d2r ? sp('frontend/hd/final/frontend_charactertile', on ? 2 : 0, 'cursor:pointer;flex-shrink:0;width:100%;box-sizing:border-box;min-height:84px;padding:12px 26px;display:flex;flex-direction:column;justify-content:center') : el('div', `cursor:pointer;padding:9px 14px;border:1px solid ${on ? '#c7a24a' : '#111'};background:${on ? 'linear-gradient(#55524c,#36342f)' : 'linear-gradient(#45433f,#2c2b28)'}`);
        if (on) card.style.boxShadow = '0 0 0 2px #ffd860, 0 0 14px 2px #ffb00088'; // 고른 캐릭터: 금빛 테두리
        if (d2r && !on) { card.onmouseenter = () => card.frame(1); card.onmouseleave = () => card.frame(0); }
        const act = !x.data, title = act && lv ? globalThis.__cfApi?.title(x.cls) : null, ti = act ? terrorInfo(x.cls) : null;
        card.append(...(title ? [el('div', 'font-size:12px;color:#b8a888', title)] : []), el('div', 'font-size:18px;color:#f0e6d0;letter-spacing:1px', x.name), el('div', 'font-size:14px;color:#c7a24a;margin-top:2px', `${lv ? `레벨 ${lv} ` : '새 캐릭터 '}${KO[x.cls] ?? x.cls}`),
          ...(ti ? [el('div', 'font-size:13px;color:#b080ff;margin-top:2px', `공포 영역 ${ti.now} · 최고 ${ti.best}단계${ti.best >= 100 ? ' · 보스 탑 입장 가능' : ''}`)] : []));
        card.onclick = () => { sel = x.id; render(); };
        card.ondblclick = ok;
        listBox.append(card);
      }
      if (!chars.length) listBox.append(el('div', 'color:#887;font:15px "D2R Kodia",sans-serif;padding:8px', '캐릭터가 없습니다. [새로 만들기]를 누르세요.'));
      right.replaceChildren(stoneBtn('새로 만들기', create, '100%', 'frontend/hd/final/frontend_createcharacterbtn', '52px'), listBox);
      listBox.scrollTop = keep;
      // 두 버튼 같은 그림·같은 높이(D2R 중간 버튼 비율 4:1)
      const del = stoneBtn('삭제', remove, '240px', 'frontend/hd/final/frontend_buttonmed', '60px'), go = stoneBtn(multi ? '대기실 입장' : '계속', ok, '240px', 'frontend/hd/final/frontend_buttonmed', '60px');
      bottom.replaceChildren(...(c ? [del, go] : []));
    };
    // 새로 만들기: 직업 7개를 나란히 세우고, 눌러 고른 뒤 이름
    const create = () => {
      let cls = null;
      const box = el('div', 'position:absolute;inset:0;z-index:3;background:#000;display:flex;flex-direction:column');
      const cv = el('canvas', 'flex:1;width:100%;cursor:pointer;position:relative');
      const name = el('input', 'background:#000;color:#fff;border:2px solid #5a4a2a;padding:10px;font:18px "D2R Kodia",sans-serif;width:300px');
      name.maxLength = 15; name.placeholder = '캐릭터 이름';
      const label = el('div', `text-align:center;font:bold 28px ${FONT};color:#d8b860;margin-top:20px;position:relative`, '직업을 고르세요');
      const bar = el('div', 'display:flex;gap:12px;justify-content:center;align-items:center;padding:20px;position:relative');
      bar.append(stoneBtn('취소', () => box.remove(), '160px'), name, stoneBtn('만들기', () => {
        const n = name.value.trim();
        if (!cls) return (label.textContent = '직업을 먼저 고르세요');
        if (!n) return name.focus();
        if (chars.some((x) => x.name === n)) return (label.textContent = '이미 있는 이름입니다');
        const c = { id: crypto.randomUUID(), name: n, cls, data: {}, made: true };
        chars.push(c); sel = c.id; activate(chars, c); box.remove(); render();
      }, '160px'));
      box.append(el('div', `position:absolute;inset:0;background:url(${F}heroselect.png) center/cover;opacity:.5;pointer-events:none`), label, cv, bar);
      wrap.append(box);
      const ids = CLS.map(([c]) => c).filter((c) => fe.heroSelect.heroes[c]), H = ids.map((c) => { const h = fe.heroSelect.heroes[c]; return [h.idle, img(h.idle.file), h.selected, img(h.selected.file)]; });
      const pos = (i) => cv.width * (i + 0.5) / ids.length;
      cv.onclick = (e) => { const r = cv.getBoundingClientRect(); cls = ids[Math.floor((e.clientX - r.left) / r.width * ids.length)]; label.textContent = KO[cls]; name.focus(); };
      const loop = (t) => {
        if (!box.isConnected) return;
        requestAnimationFrame(loop);
        if (cv.width !== cv.clientWidth || cv.height !== cv.clientHeight) { cv.width = cv.clientWidth; cv.height = cv.clientHeight; }
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ids.forEach((c, i) => {
          const [a, ai, s, si] = H[i], on = c === cls, an = on ? s : a;
          frame(ctx, an, on ? si : ai, t, pos(i), cv.height * (c === 'warlock' ? 0.73 : 0.62), (cv.height * (on ? 0.6 : 0.48)) / an.height);
          ctx.font = `bold 18px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = on ? '#fff' : '#c7b377';
          ctx.fillText(KO[c], pos(i), cv.height * 0.95);
        });
      };
      requestAnimationFrame(loop);
    };
    render();
    // 원작 시작 함수(__cfApi)는 모닥불 화면이 그림을 다 읽은 뒤에 생겨서, 생기면 칭호·공포 영역을 다시 그린다
    const wait = setInterval(() => { if (!wrap.isConnected || globalThis.__cfApi) { clearInterval(wait); if (wrap.isConnected) render(); } }, 200);
    raf = requestAnimationFrame(draw);
  };
  globalThis.__remodChars = open;
  globalThis.__d2ui = { lookAnim, STONE, stoneBtn, frame, img, frontend, KO, sp, ready, d2r: () => d2r };
})();
