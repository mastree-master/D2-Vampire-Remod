// 레벨업 운명 굴리기: 서바이버식 카드 3장 대신 룰렛 3개(고르기가 적으면 그 수만큼)가 돌다 서로 다른 기술에 멈춘다. 누르면 배움, [제외] 뒤 누르면 그 기술 제외
// 트리에 없는 고르기(지속 효과·다른 쪽 기술)는 트리 아래 줄에. 마우스를 올리면 그 카드 설명, 누르면 배움(원작 카드 버튼을 대신 누름). 1·2·3 키·리롤은 원작 그대로
// 낮은 확률 황금 칸: 금빛과 퀘스트 완료 소리, 고르면 한 번 더 고르기(레벨업 하나 더). 고르면 아이콘이 캐릭터에게 빨려 들어감(기술서 소리)
(() => {
  const snd = (n, v = 0.6) => { try { const a = new Audio(`app://game/d2/sounds/${n}.wav`); a.volume = v; a.play().catch(() => {}); } catch {} };
  const st = document.createElement('style');
  st.textContent = `#level-up.__fate{overflow:visible}#level-up.__fate .tree{transform:translateX(18px)}#level-up.__fate .d2-choice{display:none!important}#level-up.__fate .d2-choice.__show{display:flex!important}
#level-up.__fate .choose>*:not(:has(.d2-choice)):not(.actions){visibility:hidden}#level-up.__fate .choose,#level-up.__fate .choose>*{overflow:visible!important}#level-up.__fate ::-webkit-scrollbar{display:none}
#level-up.__fate .d2-choice.__show{border-image:none!important;background:rgba(0,0,0,.82)!important;box-shadow:none!important;pointer-events:auto;cursor:pointer;position:absolute!important;left:0;top:0;width:372px;z-index:5}
#level-up.__fate .d2-choice.__show .key,#level-up.__fate .d2-choice.__show .skill-icon{display:none!important}
.__fg{position:fixed;z-index:99995;pointer-events:none;border:3px solid #ffd860;box-shadow:0 0 12px 4px #ffd86099,inset 0 0 10px #ffd86066;transition:left .05s,top .05s}
.__fo{position:fixed;z-index:99995;cursor:pointer;border:3px solid #7ab4ff;box-shadow:0 0 14px 4px #7ab4ffaa;animation:__fp 1s infinite alternate}
.__fo.__gold{border-color:#ffd860;box-shadow:0 0 22px 8px #ffd860cc;animation:__fp .5s infinite alternate}
.__fi{position:fixed;z-index:99995;cursor:pointer;background-repeat:no-repeat;border:3px solid #7ab4ff;box-shadow:0 0 14px 4px #7ab4ffaa;animation:__fp 1s infinite alternate}
.__fi.__gold{border-color:#ffd860;box-shadow:0 0 22px 8px #ffd860cc}
@keyframes __fp{to{filter:brightness(1.5)}}
.__gc{position:fixed;z-index:99994;pointer-events:none;width:60px;background:linear-gradient(#fff0,#ffd860cc,#fff0);animation:__gb 1.2s forwards}
@keyframes __gb{from{opacity:1}to{opacity:0}}`;
  document.head.append(st);
  let key = '', marks = [], busy = false;
  let pass = false; // 제외로 원작 카드를 누를 때는 guard 통과
  let wheels = []; // 멈춘 룰렛 3개(고르기마다 하나, 서로 다른 기술). 다음 굴리기·배울 때까지 남김
  const clear = () => { wheels.forEach((w) => w.W.remove()); wheels = []; marks.forEach((m) => m.el.remove()); marks = []; document.querySelectorAll('.__fg').forEach((e) => e.remove()); };
  const iconKey = (e) => { const c = getComputedStyle(e); return c.backgroundImage + c.backgroundPosition; };
  const place = (el, r, pad = 3) => Object.assign(el.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width}px`, height: `${r.height}px` });
  // 설명: 원작 카드(글씨가 캔버스라 복제 불가)를 그 칸 옆으로 옮겨 D2 마우스 설명 상자처럼(검은 반투명, 테두리·아이콘 없음)
  const show = (b, at) => {
    document.querySelectorAll('#level-up .d2-choice').forEach((x) => { x.classList.toggle('__show', x === b); if (x !== b) x.style.transform = ''; });
    if (!b || !at) return;
    b.style.transform = '';
    const r0 = b.getBoundingClientRect(), k = r0.width / b.offsetWidth || 1, t = at.getBoundingClientRect();
    let x = t.left - r0.width - 12, y = t.top + t.height / 2 - r0.height / 2; // 칸 왼쪽, 모자라면 오른쪽
    if (x < 8) x = t.right + 12;
    y = Math.max(8, Math.min(innerHeight - r0.height - 8, y));
    b.style.transform = `translate(${(x - r0.left) / k}px,${(y - r0.top) / k}px)`;
  };
  const pick = (b, from, gold) => {
    // 빨려 들어가는 연출: 아이콘 복제가 화면 가운데(캐릭터)로
    const r = from.getBoundingClientRect(), f = from.cloneNode(true);
    f.className = ''; Object.assign(f.style, { position: 'fixed', zIndex: 99996, left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, transition: 'all .5s ease-in', pointerEvents: 'none' });
    document.body.append(f);
    requestAnimationFrame(() => Object.assign(f.style, { left: `${innerWidth / 2 - 8}px`, top: `${innerHeight / 2 - 40}px`, width: '16px', height: '16px', opacity: '0.2' }));
    setTimeout(() => f.remove(), 600);
    snd('item/book', 0.8);
    clear(); key = '';
    b.click();
    if (gold && globalThis.__gm) globalThis.__gm.pendingLevelUps = (globalThis.__gm.pendingLevelUps ?? 0) + 1; // 황금: 한 번 더 고르기
  };
  const roll = async (choices) => {
    busy = true; clear();
    const lu = document.getElementById('level-up');
    const base = choices.map((b, i) => [b.querySelector('.skill-icon'), i]).filter(([ic]) => ic);
    const tr = lu.querySelector('.tree')?.getBoundingClientRect();
    if (!base.length || !tr) { busy = false; return; }
    // 룰렛 n 개: 원 칸은 이번 고르기들(8칸이 차게 되풀이), 룰렛마다 다른 고르기에 멈춤(섞은 순서)
    const n = Math.min(3, base.length), wins = base.map(([, i]) => i).sort(() => Math.random() - 0.5).slice(0, n);
    const rep = Math.max(1, Math.ceil(8 / base.length)), items = [...Array(rep)].flatMap(() => base);
    const fl = (lu.querySelector('.border-right') ?? lu.querySelector('.tree')).getBoundingClientRect().left;
    const colW = (fl - 20) / n, R = Math.max(50, Math.min(colW / 2 - 60, 142)); // 트리 왼쪽에 가로로 n 개, 각 룰렛 아래에 설명(세로 공간을 설명에 씀)
    const gold = Math.random() < 0.08 ? Math.floor(Math.random() * n) : -1;
    await Promise.all(wins.map(async (want, j) => {
      const cx = 10 + colW * j + colW / 2, cy = 60 + R + 40;
      const W = document.createElement('div');
      Object.assign(W.style, { position: 'fixed', zIndex: 99995, left: `${cx}px`, top: `${cy}px`, width: '0', height: '0', pointerEvents: 'none' });
      const disc = document.createElement('div');
      Object.assign(disc.style, { position: 'absolute', left: `${-R - 40}px`, top: `${-R - 40}px`, width: `${2 * R + 80}px`, height: `${2 * R + 80}px`, borderRadius: '50%', background: 'radial-gradient(#000c 55%, #1a1408ee 70%, #000c 72%)', border: '3px solid #8a7550', boxShadow: '0 0 20px #000' });
      const ring = document.createElement('div'); Object.assign(ring.style, { position: 'absolute', left: '0', top: '0' });
      const m = items.length;
      items.forEach(([ic], k) => {
        const c = getComputedStyle(ic), a = (k / m) * Math.PI * 2, d = document.createElement('div'), w = parseFloat(c.width) || 48;
        Object.assign(d.style, { position: 'absolute', width: c.width, height: c.height, backgroundImage: c.backgroundImage, backgroundPosition: c.backgroundPosition, backgroundSize: c.backgroundSize, backgroundRepeat: 'no-repeat', border: '2px solid #8a7550', left: `${Math.sin(a) * R - w / 2}px`, top: `${-Math.cos(a) * R - w / 2}px`, transform: `scale(${44 / w})` });
        ring.append(d);
      });
      const pin = document.createElement('div'); Object.assign(pin.style, { position: 'absolute', left: '-12px', top: `${-R - 52}px`, width: '0', height: '0', borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '22px solid #ffd860', filter: 'drop-shadow(0 0 6px #ffd860)' });
      W.append(disc, ring, pin); document.body.append(W);
      const win = items.findIndex(([, i]) => i === want); // 이 룰렛이 멈출 칸
      const T = 1200 + j * 350, total = (2 + Math.floor(Math.random() * 2)) * 360 + (360 - win * 360 / m) % 360, t0 = performance.now(); let last = -1;
      await new Promise((done) => {
        const step = (now) => {
          const t = Math.min(1, (now - t0) / T), e = 1 - (1 - t) ** 3, rot = e * total;
          ring.style.transform = `rotate(${rot}deg)`;
          for (const d of ring.children) d.style.rotate = `${-rot}deg`;
          const at = Math.floor(rot / (360 / m)); if (at !== last) { last = at; if (j === 0) snd('cursor/button', 0.2); }
          if (t < 1 && lu.isConnected && globalThis.__gm?.state === 'levelUp') requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      });
      const hit = ring.children[win];
      Object.assign(hit.style, { borderColor: j === gold ? '#ffe680' : '#ffd36a', boxShadow: j === gold ? '0 0 26px #ffd000, 0 0 8px #fff' : '0 0 18px #ffb000', pointerEvents: 'auto', cursor: 'pointer' });
      const now = () => document.querySelectorAll('#level-up .d2-choice')[want] ?? choices[want];
      const w = { W, hit, want, now, cx, cy, R, colW, gold: j === gold };
      // 누르면 배움. [제외]를 누른 뒤(banishing)면 이 룰렛 기술을 제외
      hit.onclick = () => { if (lu.classList.contains('banishing')) { pass = true; now().click(); pass = false; return; } pick(now(), hit, w.gold); };
      wheels.push(w);
    }));
    await new Promise((r) => setTimeout(r, 300));
    if (!lu.isConnected || globalThis.__gm?.state !== 'levelUp') { clear(); busy = false; return; }
    if (gold >= 0) snd('cursor/questdone', 0.8); else snd('item/rune', 0.6);
    show(null);
    busy = false;
  };
  // 룰렛 결정 중엔 트리·카드·숫자 키로 다른 기술을 못 배우게(룰렛 칸만 배움). 트리의 빛나는 칸을 누르면 그 룰렛을 누른 것과 같음
  const guard = (e) => {
    if (pass || !wheels.length || globalThis.__gm?.state !== 'levelUp') return;
    if (e.type === 'keydown') { if (/^[1-9]$/.test(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); } return; }
    const t = e.target.closest?.('#level-up .tree-slot, #level-up .d2-choice'); if (!t) return;
    if (t.matches('.d2-choice') && wheels.some((w) => w.now() === t)) return; // 룰렛 옆 설명 카드는 원작 카드 그대로 눌러 배움·제외
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.type !== 'click' || !t.matches('.tree-slot.offer')) return;
    const si = t.querySelector('.skill-icon'), k = si && iconKey(si);
    wheels.find((w) => { const wi = w.now().querySelector('.skill-icon'); return wi && iconKey(wi) === k; })?.hit.click();
  };
  for (const ev of ['click', 'mousedown', 'pointerdown', 'mouseup', 'pointerup', 'keydown']) addEventListener(ev, guard, true);
  setInterval(() => {
    const lu = document.getElementById('level-up'), on = lu && globalThis.__gm?.state === 'levelUp' && lu.offsetWidth;
    if (!on) {
      if (key) { clear(); key = ''; }
      // 같은 창을 마을의 제외 카드 고르기 등에서도 씀: 룰렛용으로 옮긴 카드·단추 자리를 지워 원작 배치로(남아 있으면 단추가 화면 밖으로 밀려 스크롤바가 생김)
      if (lu?.classList.contains('__fate')) { lu.classList.remove('__fate'); lu.querySelectorAll('.d2-choice, .choose .actions').forEach((x) => { x.style.transform = ''; x.classList.remove('__show'); }); { const fr = lu.querySelector('.frame'); fr?.style.removeProperty('translate'); fr?.style.removeProperty('scale'); fr?.style.removeProperty('transition'); fr?.style.removeProperty('transform-origin'); } }
      return;
    }
    lu.classList.add('__fate');
    // 트리 판을 화면 오른쪽 끝으로 붙여 왼쪽을 룰렛·설명이 넓게 씀
    const fr = lu.querySelector('.frame'), br = lu.querySelector('.border-right');
    if (fr && br) { fr.style.transition = 'none'; fr.style.translate = ''; fr.style.scale = ''; fr.style.transformOrigin = '0 0'; const f0 = fr.getBoundingClientRect(), b0 = br.getBoundingClientRect(), kf = lu.getBoundingClientRect().width / lu.offsetWidth || 1, s = (((document.getElementById('__chat')?.getBoundingClientRect().top ?? innerHeight * 0.85) - 70) - 40) / b0.height; fr.style.scale = String(s); fr.style.translate = `${(innerWidth - 12 - f0.left - s * (b0.right - f0.left)) / kf}px ${(40 - f0.top - s * (b0.top - f0.top)) / kf}px`; } // 게임 transform 은 두고 translate·scale 속성으로만(translate 는 부모 배율 기준, 게임 transition 은 끔)
    const choices = [...lu.querySelectorAll('.d2-choice')];
    const k = choices.map((b) => { const i = b.querySelector('.skill-icon'); return (i ? iconKey(i) : '') + b.textContent; }).join('|') + '#' + [...lu.querySelectorAll('.choose .actions button')].map((b) => b.textContent).join(); // 리롤 횟수도 넣음: 고르기가 똑같이 다시 나와도 다시 돌림
    if (k !== key && !busy) { key = k; roll(choices); return; }
    if (wheels.length) {
      // 트리에서 원작이 빛내는 칸(offer)을 룰렛 기술 칸들로
      const ks = new Set(wheels.map((w) => { const wi = w.now().querySelector('.skill-icon'); return wi && iconKey(wi); }));
      lu.querySelectorAll('.tree .tree-slot').forEach((t) => { const si = t.querySelector('.skill-icon'); t.classList.toggle('offer', !!si && t.offsetWidth > 0 && ks.has(iconKey(si))); });
      // 룰렛마다 오른쪽에 당첨 기술 설명(원작 카드를 옮겨 보여 줌)
      const cards = new Set(wheels.map((w) => w.now()));
      lu.querySelectorAll('.d2-choice').forEach((x) => { x.classList.toggle('__show', cards.has(x)); if (!cards.has(x)) x.style.transform = ''; });
      for (const w of wheels) { const b = w.now(); b.style.transform = ''; b.style.transformOrigin = '0 0'; const r0 = b.getBoundingClientRect(), k = r0.width / b.offsetWidth || 1, sc = Math.min(1.6, (w.colW - 16) / r0.width, (innerHeight * 0.82 - w.cy - w.R - 56) / r0.height); b.style.transform = `translate(${(w.cx - r0.width * sc / 2 - r0.left) / k}px,${(w.cy + w.R + 56 - r0.top) / k}px) scale(${sc})`; } // 설명: 각 룰렛 바로 아래, 칸 폭에 맞춰 최대 1.6배(글씨가 캔버스라 배율로 키움)
      // 리롤·스킵·제외 단추: 트리 테두리 아래
      const ac = lu.querySelector('.choose .actions'), fb = (lu.querySelector('.border-right') ?? lu.querySelector('.tree')).getBoundingClientRect();
      if (ac) { ac.style.transform = ''; const a0 = ac.getBoundingClientRect(), ka = a0.width / ac.offsetWidth || 1; ac.style.transform = `translate(${(fb.left + fb.width / 2 - a0.width / 2 - a0.left) / ka}px,${(fb.bottom + 12 - a0.top) / ka}px)`; }
      return;
    }
    // 칸 자리 따라가기(트리 쪽 넘기기·창 크기)
    const tr = lu.querySelector('.tree')?.getBoundingClientRect(), fb = lu.querySelector('.border-right')?.getBoundingClientRect(); // 트리 밖 고르기는 트리 테두리 아래
    // 리롤·스킵·제외 단추: 왼쪽 판 대신 트리 테두리 아래 오른쪽(트리 밖 고르기 줄 옆)
    const ac = lu.querySelector('.choose .actions');
    if (ac && fb) { ac.style.transform = ''; const r0 = ac.getBoundingClientRect(), k = r0.width / ac.offsetWidth || 1; ac.style.transform = `translate(${(fb.right - r0.width - r0.left) / k}px,${(fb.bottom + 12 - r0.top) / k}px) scale(.68)`; ac.style.transformOrigin = '100% 0'; } // 레벨업 판이 줄어 있어 그 아래는 잘림, 트리 밖 고르기 줄(왼쪽)과 같은 줄 오른쪽
    for (const m of marks) {
      if (m.slot) { const vis = m.slot.isConnected && m.slot.offsetWidth; m.el.style.display = vis ? '' : 'none'; if (vis) place(m.el, m.slot.getBoundingClientRect()); }
      else if (tr) { const s = 60, w = parseFloat(m.el.style.width) || 48; Object.assign(m.el.style, { left: `${tr.left + 20 + m.loose * (s + 18)}px`, top: `${(fb?.bottom ?? tr.bottom) + 10}px`, transform: `scale(${s / w})` }); } // 원작 아이콘(묶음 그림)은 크기를 그대로 두고 배율로
    }
  }, 100);
})();
