// 화면 배치: 아이템 획득 창(__lgw, 기존 패치)이 다른 해상도에서 저장된 자리 때문에 화면 밖에 있으면 맨 왼쪽 아래로 데려오고, 바탕을 검게
(() => {
  setInterval(() => {
    const w = document.getElementById('__lgw');
    if (!w) return;
    w.style.background = 'rgba(0,0,0,.88)';
    w.style.visibility = document.body.classList.contains('frontend-open') ? 'hidden' : ''; // 제목·캐릭터 선택 화면에서는 숨김(저작권 문구를 가림)
    const r = w.getBoundingClientRect();
    if (r.right <= innerWidth && r.bottom <= innerHeight && r.left >= 0 && r.top >= 0) return; // 사용자가 화면 안에 옮겨 둔 자리는 그대로
    w.style.left = '8px';
    w.style.top = `${Math.max(30, Math.round(innerHeight - r.height - 8))}px`;
  }, 1000);
})();
// 경험치: 원래 하단 경험치 줄(#d2-xp) 위에 "현재 / 필요 (%)" 글씨만 얹음(값은 원작 판 갱신이 __xpNow 에 넣음)
(() => {
  setInterval(() => {
    const bar = document.getElementById('d2-xp'), v = globalThis.__xpNow;
    let g = document.getElementById('__xpg');
    if (!bar || !v || !bar.getBoundingClientRect().width || !bar.checkVisibility({ visibilityProperty: true, opacityProperty: true })) // 제목 화면 등에서 판이 숨겨져도(visibility) 글씨가 남지 않게
    { if (g) g.style.display = 'none'; return; }
    if (!g) { g = document.createElement('div'); g.id = '__xpg'; g.style.cssText = 'position:fixed;z-index:50;pointer-events:none;font:11px/1 sans-serif;color:#fff;text-align:center;text-shadow:0 0 2px #000,0 0 2px #000'; document.body.append(g); }
    const r = bar.getBoundingClientRect(), [now, need] = v, p = need > 0 ? Math.min(1, now / need) : 0;
    Object.assign(g.style, { display: 'block', left: `${r.left}px`, top: `${r.top + r.height / 2 - 6}px`, width: `${r.width}px` });
    g.textContent = `${Math.floor(now).toLocaleString()} / ${Math.round(need).toLocaleString()} (${(p * 100).toFixed(1)}%)`;
  }, 250);
})();
// 하단 판 1920: 미니 메뉴 열기(원작 빨간 버튼)는 그림을 숨기고 D2R 앞판 가운데 장식을 그 버튼 자리로. 스탯 올리기 버튼은 D2R 처럼 생명 구슬 위.
// D2R HD 앞판(hud-front.png, 2822x415)을 왼쪽 획득 목록·오른쪽 채팅창 사이 폭으로 줄여 맨 아래에 깔고, 원작 판(800 무대 × 배율 안)의 구슬·기술 칸·띠·경험치 줄을 D2R 배치표(hudpanelhd.json) 자리로 옮긴다
(() => {
  const P = { // D2R 판 좌표(앞판 그림 왼쪽 = 34): x, y, 너비, 높이
    'd2-life': [304, 75, 328, 328], 'd2-mana': [2278, 75, 328, 328],
   
    'd2-xp': [694, 234, 1528, 20], 'd2-stamina': [765, 292, 434, 17],
    'mini-toggle': [1410, 262, 94, 136],
  };
  let st, key = '', hid = false;
  try { hid = localStorage.getItem('d2vr/hudHidden') === '1'; } catch {}
  setInterval(() => {
    const pn = document.getElementById('ctrlpnl');
    if (!pn) return;
    const R = pn.getBoundingClientRect(), S = new DOMMatrix(getComputedStyle(pn).transform).a || 1, L = 416, k = (innerWidth - L - 456) / 2822; // 왼쪽 획득 목록 400 + 여백, 오른쪽 채팅창 440 + 여백
    const vis = pn.checkVisibility({ visibilityProperty: true, opacityProperty: true }), now = [R.left, R.top, S, innerWidth, innerHeight, hid, vis].join(), B = innerHeight + (hid ? 415 * k + 4 : 0); // 숨김이면 판 전체를 화면 아래로
    if (now === key) return; key = now;
    // 판 좌표 → 원작 무대(800) 좌표
    const box = (x, y, w, h) => `left:${(L + (x - 34) * k - R.left) / S}px!important;top:${(B - (415 - y) * k - R.top) / S}px!important;width:${w * k / S}px!important;height:${h * k / S}px!important`;
    let css = `#ctrlpnl .art{display:none!important}#life-glass,#mana-glass{display:none!important}
#__hudfront{position:absolute;pointer-events:none;z-index:2;background:url(app://game/d2/ui/hud-front.png) 0 0/100% 100% no-repeat;${box(34, 0, 2822, 415)}}
#d2-stamina{background:none!important}#d2-stamina .fill{background:url(app://game/d2/ui/hud-stamina.png) 0 0/${434 * k / S}px 100% no-repeat!important}
#d2-life .fill,#d2-mana .fill{width:100%!important;background-size:100% ${328 * k / S}px!important;background-position:bottom!important;border-radius:50%}
#belt-slots .belt-slot{z-index:3}#mini-toggle{background:none!important;border:0!important;box-shadow:none!important}#mini-toggle>*{opacity:0!important}
#skill-left,#skill-right,#level-button,#mini-toggle,#d2-stamina,#d2-xp{z-index:3}`;
    for (const [id, r] of Object.entries(P)) css += `#${id}{${box(...r)}}`;
    // (숨겨져 있을 때 스탯 단추처럼 크기 0 이면 원작 크기 30)
    // 기술 칸·물약 칸은 너비·높이를 바꾸면 안의 물약·아이콘 그림이 어긋나서, 원작 칸을 통째로 배율(transform)로 줄여 D2R 칸 가운데에 맞춤
    const mid = (e, x, y, w, h) => { const ow = e.offsetWidth || 30, oh = e.offsetHeight || 30; return `left:${(L + (x + w / 2 - 34) * k - R.left) / S - ow / 2}px!important;top:${(B - (415 - y - h / 2) * k - R.top) / S - oh / 2}px!important;transform:scale(${w * k / S / ow});transform-origin:50% 50%`; };
    // 스탯 올리기(빨간 십자) 단추: 크기를 바꾸면 그림이 잘려서 배율로 줄여 마나 구슬 왼쪽, 넷째 물약 칸 위(경험치 줄보다 위)
    { const e = document.getElementById('level-button'); if (e) css += `#level-button{${mid(e, 2190, 150, 76, 76)}}`; }
    // 새로운 능력치 단추: D2R StatUp 자리(생명 구슬 위, hudpanelhd.json x406 y-164)
    { const e = document.getElementById('stats-button'); if (e) css += `#stats-button{${mid(e, 406, -164, 90, 90)};z-index:3}`; }
    for (const [id, x] of [['skill-left', 1257], ['skill-right', 1528]]) { const e = document.getElementById(id); if (e) css += `#${id}{${mid(e, x, 271, 122, 122)}}`; }
    [...document.querySelectorAll('#belt-slots .belt-slot')].forEach((e, i) => { css += `#belt-slots .belt-slot:nth-child(${i + 1}){${mid(e, 1708 + i * 122.5, 280, 116, 116)}}`; });
    // 생명·마나 숫자(글씨 폭이 바뀌어도 가운데 유지되게 translate): 원작 자리(구슬 왼쪽 위, 획득 목록과 겹침) 대신 D2R 처럼 각 구슬 바로 위 가운데
    for (const [id, x] of [['life-label', 468], ['mana-label', 2442]]) { const e = document.getElementById(id); if (e) css += `#${id}{left:${(L + (x - 34) * k - R.left) / S}px!important;top:${(B - (415 - 40) * k - R.top) / S}px!important;right:auto!important;bottom:auto!important;z-index:3;transform:translate(-50%,-100%) scale(.6);transform-origin:50% 100%}`; }
    css += `#ctrlpnl *{transition:top .25s}`;
    // 판 숨기기 단추: 판 위 가운데(숨기면 화면 맨 아래)
    let tg = document.getElementById('__hudtog');
    if (!tg) {
      tg = document.createElement('div'); tg.id = '__hudtog';
      tg.style.cssText = 'position:fixed;z-index:99991;width:36px;height:16px;cursor:pointer;background:#000c;border:1px solid #6a5a3a;border-bottom:0;color:#d8b860;font:11px/16px sans-serif;text-align:center;border-radius:4px 4px 0 0;transition:top .25s';
      tg.title = '하단 판 숨기기/보이기';
      tg.onclick = () => { hid = !hid; try { localStorage.setItem('d2vr/hudHidden', hid ? '1' : '0'); } catch {} key = ''; };
      document.body.append(tg);
    }
    tg.textContent = hid ? '▲' : '▼';
    Object.assign(tg.style, { left: `${L + (1457 - 34) * k - 18}px`, top: `${hid ? innerHeight - 16 : innerHeight - (415 - 200) * k - 16}px`, display: vis ? 'block' : 'none' });
    // 미니 메뉴 7단추(D2R MiniMenu 자리 716,324 간격 70): 누르면 리모드·기존 패치 단축키를 대신 누름
    let mm = document.getElementById('__hudmm');
    if (!mm) {
      mm = document.createElement('div'); mm.id = '__hudmm'; mm.style.cssText = 'position:fixed;z-index:99990;transition:top .25s';
      for (const [n, key, tip] of [['character', 'j', '안내서 (J)'], ['skilltree', 'F4', '룬워드 목록 (F4)'], ['questlog', 'F6', '설명서 (F6)'], ['inventory', 'b', '창고 (B)'], ['automap', 'F2', '보관 설정 (F2)'], ['messages', 'F10', '업데이트 기록 (F10)'], ['pausemenu', 'Escape', '메뉴 (Esc)']]) {
        const b = document.createElement('div'); b.title = tip;
        b.style.cssText = `position:absolute;cursor:pointer;background:url(app://game/d2/ui/hud-mm-${n}-0.png) 0 0/100% 100%`;
        b.onmouseenter = () => { b.style.backgroundImage = `url(app://game/d2/ui/hud-mm-${n}-2.png)`; };
        b.onmouseleave = () => { b.style.backgroundImage = `url(app://game/d2/ui/hud-mm-${n}-0.png)`; };
        b.onclick = () => { if (key === 'Escape') return globalThis.__gm?.pause?.(); /* 게임은 가짜 Esc 를 무시함 */ const code = key.length === 1 ? `Key${key.toUpperCase()}` : key; for (const t of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(t, { key, code, bubbles: true })); };
        mm.append(b);
      }
      document.body.append(mm);
    }
    Object.assign(mm.style, { left: `${L + (716 - 34) * k}px`, top: `${B - (415 - 324) * k}px`, display: vis ? 'block' : 'none' }); // 판이 보일 때만
    [...mm.children].forEach((b, i) => Object.assign(b.style, { left: `${[-2, 69, 142, 212, 282, 352, 422][i] * k}px`, top: '0', width: `${72 * k}px`, height: `${72 * k}px` }));
    if (!st) { st = document.createElement('style'); document.head.append(st); }
    // 레벨업 고르기 칸: 서바이버식 검은 카드 대신 D2R 웨이포인트 줄 단추 그림(9칸 늘이기), 마우스 올리면 밝은 장, 빼기 모드는 붉게
    css += `.d2ui #level-up .d2-choice{background:none!important;border:0!important;border-image:url(app://game/d2/ui/lv-row-0.png) 40 fill / 16px stretch!important}.d2ui #level-up .d2-choice:hover{border-image-source:url(app://game/d2/ui/lv-row-1.png)!important}#level-up.banishing .d2-choice{filter:sepia(.8) hue-rotate(-40deg) saturate(2)}`;
    // 레벨업 창(스킬 고르기·트리)이 하단 판(구슬 꼭대기)을 덮지 않게 위쪽 가운데 기준으로 줄임
    css += `#level-up{transform:scale(${Math.min(.78, (innerHeight - (415 - 75) * k - 8) / innerHeight)});transform-origin:50% 0}`;
    st.textContent = css;
    if (!document.getElementById('__hudfront')) { const d = document.createElement('div'); d.id = '__hudfront'; pn.prepend(d); }
  }, 500);
  // 판을 숨기면 캐릭터 머리 위(화면 가운데, 카메라가 캐릭터를 따라감)에 생명·마나 줄
  setInterval(() => {
    let b = document.getElementById('__hpmp');
    const p = globalThis.__gm?.world?.player, on = hid && p && globalThis.__gm.state === 'playing';
    if (!on) { if (b) b.style.display = 'none'; return; }
    if (!b) {
      b = document.createElement('div'); b.id = '__hpmp';
      b.style.cssText = 'position:fixed;z-index:50;pointer-events:none;width:180px;transform:translateX(-50%)';
      const bar = (c) => `<div style="position:relative;height:16px;margin-top:3px;background:#000b;border:2px solid #d8b860;box-shadow:0 0 2px #000"><div style="height:100%;background:${c}"></div><span style="position:absolute;inset:0;font:bold 13px/16px sans-serif;color:#fff;text-align:center;text-shadow:0 0 2px #000"></span></div>`;
      b.innerHTML = bar('linear-gradient(#e33,#900)') + bar('linear-gradient(#46f,#129)');
      document.body.append(b);
    }
    Object.assign(b.style, { display: 'block', left: `${innerWidth / 2}px`, top: `${innerHeight / 2 - 150}px` });
    for (const [i, v, m] of [[0, p.life, p.maxLife], [1, p.mana ?? p.manaMax, p.manaMax]]) {
      const r = b.children[i], f = m > 0 ? Math.max(0, Math.min(1, v / m)) : 0;
      r.firstChild.style.width = `${f * 100}%`; r.lastChild.textContent = `${Math.max(0, Math.floor(v))} / ${Math.round(m)}`;
    }
  }, 100);
})();
