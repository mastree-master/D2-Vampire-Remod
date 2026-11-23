// H 키 룬워드 도움말(D2R H 도움말처럼): 원작 + 리모드 룬워드를 표로 보여 주고, 이름에 마우스를 대면 옵션(변하는 수치는 최소~최대)이 뜬다
(() => {
  const ROW = 'display:grid;grid-template-columns:200px 1fr 54px 54px 1fr;gap:8px;align-items:center;padding:3px 8px;border-bottom:1px solid #2a2418';
  // F4 목록(__rwHtml)이 만든 룬워드 칸을 읽어 표 줄로 바꾼다: 이름, 룬, 레벨, 베이스, 옵션 줄(HTML)
  const read = () => {
    const d = document.createElement('div');
    d.innerHTML = globalThis.__rwHtml?.() ?? '';
    const remod = new Set((globalThis.__reim?.rw ?? []).map(([n]) => n));
    return [...d.querySelectorAll('.rw')].map((x) => {
      const [head, info, ...lines] = x.children;
      const [runes, lvl, ...base] = info.textContent.split(' · ');
      const en = x.dataset.k;
      return { name: head.textContent, runes: runes.split(' + '), lvl: +lvl.replace(/\D/g, ''), base: base.join(' · '), lines: lines.map((l) => l.outerHTML).join(''), remod: [...remod].some((n) => en.includes(n.toLowerCase())), key: en };
    });
  };
  const ko = (r) => String(globalThis.__ko?.(`${r} Rune`) ?? r).replace(/^\d+\s*/, '').replace(/\s*룬$/, '');
  const open = () => {
    const old = document.getElementById('__rwh');
    if (old) return old.remove();
    const all = read();
    const box = document.createElement('div');
    box.id = '__rwh';
    box.style.cssText = 'position:fixed;inset:40px 60px;z-index:100000;display:flex;flex-direction:column;background:radial-gradient(ellipse at top,#231d12,#0a0806 70%);border:3px ridge #8a6d3b;box-shadow:0 0 0 2px #000,0 0 40px #000;font:13px sans-serif;color:#c8b27a';
    box.innerHTML = `<div style="padding:10px 14px 6px;border-bottom:2px solid #5a4a2a">
      <div style="font:bold 24px Cinzel,serif;color:#d8b860;text-align:center;letter-spacing:3px;text-shadow:0 0 10px #a60,0 2px 0 #000">룬워드 도움말 <span style="font:12px sans-serif;color:#887">(H 닫기)</span></div>
      <div style="display:flex;gap:6px;margin-top:6px;align-items:center">
        <span data-f="all">전체</span><span data-f="orig">원작</span><span data-f="remod">리모드</span>
        <span style="margin-left:10px;color:#887">소켓</span><span data-s="0">전체</span>${[2, 3, 4, 5, 6].map((n) => `<span data-s="${n}">${n}</span>`).join('')}
        <input placeholder="검색 (이름, 룬, 베이스)" style="margin-left:auto;width:220px;padding:3px 6px;background:#111;color:#ddd;border:1px solid #5a4a2a;font:13px sans-serif">
      </div>
      <div style="${ROW};border:0;color:#887;margin-top:6px"><span>이름</span><span>룬 조합</span><span>소켓</span><span>레벨</span><span>베이스</span></div></div>
      <div class="list" style="flex:1;overflow-y:auto"></div>`;
    const tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;z-index:100001;display:none;max-width:360px;padding:8px 12px;background:#000e;border:1px solid #8a6d3b;font:13px sans-serif;line-height:1.5;text-align:center;pointer-events:none';
    const list = box.querySelector('.list'), q = box.querySelector('input');
    let f = 'all', s = 0;
    const draw = () => {
      const t = q.value.toLowerCase();
      list.replaceChildren(...all.filter((r) => (f === 'all' || (f === 'remod') === r.remod) && (!s || r.runes.length === s) && (!t || (r.key + r.name + r.base + r.runes.map(ko).join('')).toLowerCase().includes(t))).map((r) => {
        const row = document.createElement('div');
        row.style.cssText = ROW;
        row.innerHTML = `<b style="color:${r.remod ? '#e8a040' : '#c9a'};cursor:help">${r.name}</b><span style="color:#ffd27a">${r.runes.map(ko).join(' · ')}</span><span>${r.runes.length}</span><span>${r.lvl}</span><span style="color:#999">${r.base}</span>`;
        const n = row.firstChild;
        n.onmouseenter = () => { tip.innerHTML = `<div style="color:#c9a;font-weight:bold">${r.name}</div><div style="color:#ffd27a">'${r.runes.map(ko).join('')}'</div>${r.lines}`; tip.style.display = 'block'; };
        n.onmousemove = (e) => { const b = tip.getBoundingClientRect(); tip.style.left = `${Math.min(e.clientX + 16, innerWidth - b.width - 8)}px`; tip.style.top = `${Math.min(e.clientY + 12, innerHeight - b.height - 8)}px`; };
        n.onmouseleave = () => { tip.style.display = 'none'; };
        return row;
      }));
      box.querySelectorAll('[data-f],[data-s]').forEach((b) => { const on = b.dataset.f ? b.dataset.f === f : +b.dataset.s === s; b.style.cssText = `padding:2px 10px;cursor:pointer;border:1px solid #8a6d3b;background:${on ? '#3a3020' : '#151209'};color:${on ? '#fff' : '#c8b27a'}`; });
    };
    box.onclick = (e) => { const b = e.target.dataset; if (b.f) f = b.f; if (b.s !== undefined) s = +b.s; if (b.f || b.s !== undefined) draw(); };
    q.oninput = draw;
    q.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Escape') { box.remove(); tip.remove(); } };
    new MutationObserver(() => box.isConnected || tip.remove()).observe(document.body, { childList: true });
    document.body.append(box, tip);
    draw();
    q.focus();
  };
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyH' || e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
    e.preventDefault(); e.stopPropagation();
    open();
  }, true);
})();
