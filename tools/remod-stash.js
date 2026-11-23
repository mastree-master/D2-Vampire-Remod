// 창고 편의: 휠로 탭·고유 분류 넘기기, 수집 범위(인벤·창고) 고르기, Shift+우클릭 추출
(() => {
  const save = () => globalThis.__gm?.save;
  const panel = () => document.getElementById('stash-panel');
  // 수집 범위: save.remodCollect = {inv, st}. 처음엔 인벤만
  globalThis.__collectFrom = () => save()?.remodCollect ?? { inv: 1, st: 0 };
  const refresh = () => document.querySelector('#stash-panel .stash-tab.open')?.click();

  // 휠: 위쪽 탭 줄·왼쪽 공유 탭 목록에서는 창고 탭, 고유 분류 줄에서는 분류를 넘김
  addEventListener('wheel', (e) => {
    const p = panel(); if (!p || !p.contains(e.target)) return;
    const d = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0; if (!d) return;
    const cats = e.target.closest('.uq-categories');
    if (cats) {
      const bs = [...cats.querySelectorAll('.uq-category')], i = bs.findIndex((b) => b.classList.contains('lit'));
      bs[(i + d + bs.length) % bs.length]?.click(); e.preventDefault(); return;
    }
    const b = e.target.closest('button'); if (!b || !(b.matches('.stash-tab') || (!b.className && b.parentElement?.childElementCount >= 9))) return;
    const side = [...(p.querySelector('button:not([class])')?.parentElement?.children ?? [])].filter((x) => x.tagName === 'BUTTON' && !x.className);
    const ids = ['personal', ...side.slice(0, 9).map((_, i) => `shared${i + 1}`), 'uniques'];
    const cur = ids.indexOf(globalThis.__gm?.stashTab), next = ids[(cur + d + ids.length) % ids.length];
    const tabs = [...p.querySelectorAll('.stash-tab:not(.__matsTab)')];
    (next === 'personal' ? tabs[0] : next === 'uniques' ? tabs[2] : side[+next.slice(6) - 1])?.click();
    e.preventDefault();
  }, { capture: true, passive: false });

  // 추출: 인벤·창고의 고유·세트·룬워드를 Shift+우클릭 두 번(4초 안)으로 재료로 바꿈
  // 고유·세트는 리모드의 파편(템 레벨 100 미만 1, 200 미만 2, 그 이상 3), 룬워드는 박힌 룬 하나(룬을 모르는 원작 룬워드는 파편), 횃불·애니·기드는 차원의 조각 1 + 10% 고급 룬 상자
  const CHARM = new Set(['Hellfire Torch', 'Annihilus', "Gheed's Fortune"]);
  const MAT_KO = { 'Abyss Shard': '리모드의 파편', 'Dimension Fragment': '차원의 조각', 'High Rune Box': '고급 룬 상자' };
  const reward = (it) => {
    if (CHARM.has(it.name)) return { 'Dimension Fragment': 1, ...Math.random() < 0.1 && { 'High Rune Box': 1 } };
    if (it.rarity === 'runeword') { const rs = globalThis.__rwRunes?.[it.name]; if (rs?.length) return { [`${rs[Math.floor(Math.random() * rs.length)]} Rune`]: 1 }; }
    return { 'Abyss Shard': it.level >= 200 ? 3 : it.level >= 100 ? 2 : 1 };
  };
  const locate = (id) => {
    const s = save();
    for (const l of [...Object.values(s?.inventoryByClass ?? {}), ...Object.values(s?.stashTabs ?? {})]) { const i = Array.isArray(l) ? l.findIndex((x) => x?.id === id) : -1; if (i >= 0) return [l, i]; }
    return null;
  };
  let pend = null, swallow = 0;
  const extract = (e) => {
    // 처리한 직후 이어지는 우클릭 이벤트(떼기·메뉴)는 다 막음: 템을 뺀 뒤엔 대상 판정이 안 맞아 게임이 그 템을 장착해 버림
    if (e.button === 2 && e.type !== 'pointerdown' && Date.now() < swallow) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (!e.shiftKey || e.button !== 2) return;
    const el = e.target.closest?.('[data-item]'); if (!el || el.closest('.uq-slot') || !el.closest('#stash, #inventory, #stash-panel')) return;
    const at = locate(el.dataset.item), it = at?.[0][at[1]]; if (!it || it.type === 'quest' || !/^(unique|set|runeword)$/.test(it.rarity)) return; // 증표·정수 같은 퀘스트 템은 빼고
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.type !== 'pointerdown') return; // pointerdown 을 막으면 mousedown 은 안 옴
    swallow = Date.now() + 800;
    const hud = globalThis.__gm?.hud, ko = String(globalThis.__ko?.(it.name) ?? it.name), got = reward(it);
    if (!got) return hud?.banner?.(`${ko}: 추출할 수 없는 템입니다`, 'normal');
    if (pend?.id !== it.id || Date.now() - pend.t > 4000) { pend = { id: it.id, t: Date.now() }; return hud?.banner?.(`${ko} 추출: 4초 안에 다시 Shift+우클릭`, 'normal'); }
    pend = null;
    // 창고 판의 바꾸기(r.change)로 해야 화면도 다시 그림. 창고가 안 열려 있으면 그냥 빼고 저장
    const go = () => { const w = locate(it.id); if (w) w[0].splice(w[1], 1); const m = save().remodMats ??= {}; for (const [k, n] of Object.entries(got)) m[k] = (m[k] ?? 0) + n; };
    if (panel() && globalThis.__extractDo) globalThis.__extractDo(go); else { go(); globalThis.__saveNow?.(); }
    hud?.banner?.(`${ko} 추출: ${Object.entries(got).map(([k, n]) => `${MAT_KO[k] ?? String(globalThis.__ko?.(k) ?? k)} ${n}개`).join(', ')}`, 'unique');
  };
  for (const ev of ['mousedown', 'pointerdown', 'mouseup', 'pointerup', 'contextmenu']) addEventListener(ev, extract, true);

  setInterval(() => {
    const p = panel(), s = save(); if (!p || !s) return;
    // 수집 단추 옆 ☑인벤 ☑창고
    const col = [...p.querySelectorAll('.stash-collect')].find((b) => b.textContent === '수집');
    let box = p.querySelector('.__colFrom');
    if (col && !box) {
      box = document.createElement('div');
      box.className = '__colFrom';
      box.style.cssText = 'position:absolute;display:flex;gap:10px;font:12px sans-serif;color:#c8b88a;pointer-events:auto;z-index:6';
      for (const [k, t] of [['inv', '인벤'], ['st', '창고']]) {
        const l = document.createElement('label'), c = document.createElement('input');
        c.type = 'checkbox'; c.checked = !!globalThis.__collectFrom()[k]; c.style.cssText = 'margin:0 3px 0 0;accent-color:#a08040;cursor:pointer';
        c.onchange = () => { s.remodCollect = { ...globalThis.__collectFrom(), [k]: c.checked ? 1 : 0 }; globalThis.__saveNow?.(); refresh(); };
        l.style.cssText = 'display:flex;align-items:center;cursor:pointer'; l.append(c, t); box.append(l);
      }
    }
    // 자리는 지금 탭의 검색칸 오른쪽 빈칸(같은 높이). 탭마다 검색칸 폭이 달라(고유 탭은 넓음) 매번 다시 잡음
    // 창고 판은 배율로 줄어 있어 화면 좌표 차이를 판 배율(k)로 나눠 단추와 같은 부모 안 좌표로
    if (col && box) {
      const host = col.offsetParent ?? col.parentElement;
      if (box.parentElement !== host) host.append(box);
      const cr = col.getBoundingClientRect(), k = cr.width / col.offsetWidth || 1, sr = [...p.querySelectorAll('.stash-search, .uq-search')].find((x) => x.offsetWidth)?.getBoundingClientRect();
      const bh = box.getBoundingClientRect().height;
      Object.assign(box.style, sr ? { left: `${col.offsetLeft + (sr.right + 14 - cr.left) / k}px`, top: `${col.offsetTop + (sr.top + (sr.height - bh) / 2 - cr.top) / k}px` } : { left: `${col.offsetLeft}px`, top: `${col.offsetTop - 20}px` });
    }
  }, 300);
})();
