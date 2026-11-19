// 재료 창고(본섭 룬 탭처럼, 창고 칸 자리에 바로 겹쳐 보임. 다시 누르거나 다른 탭·창고를 닫으면 사라짐): 룬 33칸·정수 칸이 늘 같은 자리에 있고 그림과 개수를 보여 준다(save.remodMats). 클릭 1개, 우클릭 개수 물어보고 꺼내기
globalThis.__remodMats = () => {
  const save = globalThis.__gm?.save;
  if (!save) return;
  const QN = { 'q:terrorKey': '공포의 열쇠', 'q:hateKey': '증오의 열쇠', 'q:destructionKey': '파괴의 열쇠', 'q:brain': '메피스토의 뇌', 'q:horn': '디아블로의 뿔', 'q:eye': '바알의 눈', 'q:standard': '영웅의 깃발', 'q:token': '사면의 증표', 'Terror Map': '공포의 지도', 'Mercenary Contract': '용병 계약서', 'Training Manual': '훈련 교본' };
  const ko = (t) => QN[t] ?? String(globalThis.__ko?.(t) ?? t);
  const RUNES = ['El', 'Eld', 'Tir', 'Nef', 'Eth', 'Ith', 'Tal', 'Ral', 'Ort', 'Thul', 'Amn', 'Sol', 'Shael', 'Dol', 'Hel', 'Io', 'Lum', 'Ko', 'Fal', 'Lem', 'Pul', 'Um', 'Mal', 'Ist', 'Gul', 'Vex', 'Ohm', 'Lo', 'Sur', 'Ber', 'Jah', 'Cham', 'Zod'];
  // [보관 이름, 그림]
  const SLOTS = [
    ['룬', RUNES.map((r) => [`${r} Rune`, `../d2/items/invr${{ Shael: "Shae", Jah: "Jo" }[r] ?? r}.png`])],
    ['정수', [["Larzuk's Essence", '../d2/items/invtes.png'], ['Burning Essence of Terror', '../d2/items/invbet.png'], ['Terror Map', '../d2/items/invhscr.png'], ['Mercenary Contract', '../d2/items/invsbk.png'], ['Training Manual', '../d2/items/invbbk.png']]],
    // 퀘스트 아이템은 q:<원작 이름> 으로 보관(인벤에 꺼낼 때 원작 아이템으로 다시 만듦)
    ['열쇠 · 장기 · 특수', [['q:terrorKey', 'invmph'], ['q:hateKey', 'invmph'], ['q:destructionKey', 'invmph'], ['q:brain', 'invbrnz'], ['q:horn', 'invfang'], ['q:eye', 'inveye'], ['q:standard', 'invflag'], ['q:token', 'invtoa']].map(([k, f]) => [k, `../d2/items/${f}.png`])],
  ];
  // 열쇠·장기는 원작이 아이템이 아니라 판데모니움 목록(인벤 오른쪽 아래 숫자)에 보관한다. 재료 탭은 그 숫자를 그대로 보여 주기만 한다
  const PK = { 'q:terrorKey': 'pk1', 'q:hateKey': 'pk2', 'q:destructionKey': 'pk3', 'q:brain': 'mbr', 'q:horn': 'dhn', 'q:eye': 'bey' };
  // 예전 버전이 재료 탭·인벤에 따로 담아 둔 열쇠·장기를 원작 목록으로 옮긴다
  const pid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const pushPand = (code, ids) => { const l = save.pandemonium?.[code] ?? []; save.pandemonium = { ...save.pandemonium, [code]: [...l, ...ids].slice(0, 999) }; };
  for (const [q, code] of Object.entries(PK)) {
    const n = save.remodMats?.[q];
    if (n) { pushPand(code, Array.from({ length: n }, pid)); delete save.remodMats[q]; }
  }
  for (const [cls, inv] of Object.entries(save.inventoryByClass ?? {})) {
    const keys = inv.filter((x) => x.type === 'quest' && Object.values(PK).includes(x.base));
    for (const x of keys) pushPand(x.base, [x.id ?? pid()]);
    if (keys.length) save.inventoryByClass[cls] = inv.filter((x) => !keys.includes(x));
  }
  if (document.getElementById('__mats')) return document.getElementById('__mats').remove();
  // 창고 칸 영역(가장 큰 자식) 위에 그대로 겹친다
  const host = document.getElementById('stash-panel');
  if (!host) return;
  const grid0 = [...host.querySelectorAll('*')].find((e) => { const b = e.getBoundingClientRect(); return b.width > 400 && b.width < 500 && b.height > 450; });
  const R = (grid0 ?? host).getBoundingClientRect();
  const box = document.createElement('div');
  box.id = '__mats';
  box.style.cssText = `position:fixed;left:${R.x}px;top:${R.y}px;width:${R.width}px;height:${R.height}px;z-index:9000;font:12px sans-serif;color:#c8b27a;pointer-events:auto`;
  const watch = setInterval(() => { if (!document.getElementById('stash-panel') || !box.isConnected) { clearInterval(watch); box.remove(); } }, 300);
  for (const t of host.querySelectorAll('[data-stash-tab]')) t.addEventListener('click', () => box.remove(), { once: true });
  const panel = document.createElement('div');
  panel.style.cssText = 'width:100%;height:100%;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;padding:6px 8px;background:#0b0a08f2;border:1px solid #5a4a2a';
  const body = document.createElement('div');
  const tip = document.createElement('div');
  tip.style.cssText = 'min-height:18px;color:#fff;margin-top:6px';
  // 우클릭: 몇 개 꺼낼지 묻는 작은 창(Electron 은 prompt() 가 없음)
  const ask = (base, n) => {
    box.querySelector('.__ask')?.remove();
    const d = document.createElement('div');
    d.className = '__ask';
    d.style.cssText = 'position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);padding:12px 16px;background:#1a160e;border:2px ridge #8a6d3b;color:#e8d8a8;box-shadow:0 0 20px #000;z-index:2';
    d.innerHTML = `<div style="margin-bottom:8px">${ko(base)} — 몇 개를 빼시겠습니까? (최대 ${n.toLocaleString()})</div>`;
    const inp = Object.assign(document.createElement('input'), { type: 'number', min: 1, max: n, value: n });
    inp.style.cssText = 'width:90px;font:14px sans-serif';
    const go = () => { const k = Math.max(0, Math.min(n, Math.floor(+inp.value || 0))); d.remove(); if (k) { globalThis.__matsOut?.(base, k); draw(); } };
    inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); if (e.key === 'Escape') d.remove(); };
    const b = (t, f) => { const x = document.createElement('button'); x.textContent = t; x.style.cssText = 'margin-left:6px;padding:3px 10px;background:linear-gradient(#5a5650,#2c2a26);color:#e8d8a8;border:1px solid #8a6d3b;cursor:pointer'; x.onclick = f; return x; };
    d.append(inp, b('빼기', go), b('취소', () => d.remove()));
    box.append(d);
    inp.focus(); inp.select();
  };
  const draw = () => {
    const m = save.remodMats ?? {};
    body.replaceChildren(...SLOTS.map(([title, list]) => {
      const sec = document.createElement('div');
      sec.style.cssText = 'margin-top:10px';
      sec.innerHTML = `<div style="font:bold 15px Cinzel,serif;color:#d8b860;margin-bottom:4px">${title}</div>`;
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(10,40px);gap:4px';
      for (const [base, img] of list) {
        const pk = PK[base], n = pk ? (save.pandemonium?.[pk]?.length ?? 0) : (m[base] ?? 0);
        const c = document.createElement('div');
        c.style.cssText = `position:relative;width:40px;height:40px;border:1px solid ${n ? '#8a6d3b' : '#3a3020'};background:${n ? '#1d1a12' : '#0b0a08'};display:flex;align-items:center;justify-content:center;cursor:${n && !pk ? 'pointer' : 'default'};user-select:none`;
        c.innerHTML = `<img src="${img}" width="30" height="30" style="image-rendering:pixelated;opacity:${n ? 1 : 0.22}"><span style="position:absolute;right:3px;bottom:1px;font:bold 12px sans-serif;color:${n ? '#fff' : '#555'};text-shadow:0 1px 0 #000">${n ? n.toLocaleString() : ''}</span>`;
        c.onmouseenter = () => { tip.textContent = `${ko(base)} × ${n.toLocaleString()}   ${pk ? "(판데모니움에 쓰는 원작 보관함 · 인벤 오른쪽 아래 숫자와 같음)" : "(클릭: 1개 · 우클릭: 개수 정해서 꺼내기)"}`; };
        c.onclick = () => { if (n && !pk) { globalThis.__matsOut?.(base, 1); draw(); } };
        c.oncontextmenu = (e) => { e.preventDefault(); if (n && !pk) ask(base, n); };
        grid.append(c);
      }
      sec.append(grid);
      return sec;
    }));
  };
  panel.innerHTML = '<div style="color:#887;font-size:11px">창고를 연 채 인벤의 룬·정수·열쇠·장기를 우클릭하면 제자리로 들어갑니다</div>';
  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:10px';
  const button = (text, on) => { const b = document.createElement('button'); b.textContent = text; b.style.cssText = 'padding:5px 16px;background:linear-gradient(#5a5650,#2c2a26);color:#e8d8a8;border:1px solid #8a6d3b;cursor:pointer'; b.onclick = on; buttons.append(b); };
  button('인벤 재료 모두 넣기', () => { globalThis.__matsAllIn?.(); draw(); });
  button('창고로 돌아가기', () => box.remove());
  panel.append(body, tip, buttons);
  box.append(panel);
  document.body.append(box);
  draw();
};
// 창고 위쪽 탭 줄에 [재료] 탭을 붙인다(고유 탭을 본떠 오른쪽에). 창고가 다시 그려질 때마다 다시 붙임
setInterval(() => {
  const u = document.querySelector('#stash-panel [data-stash-tab=uniques]') ?? document.querySelector('[data-stash-tab=uniques]');
  if (!u || u.parentElement.querySelector('.__matsTab')) return;
  const t = u.cloneNode(true);
  t.removeAttribute('data-stash-tab');
  t.classList.add('__matsTab');
  t.classList.remove('open');
  t.setAttribute('aria-label', '재료');
  t.style.left = `${parseFloat(u.style.left) + parseFloat(u.style.width) + 4}px`;
  t.querySelector('.box').innerHTML = '<span style="font:bold 13px sans-serif;color:#d8b860;text-shadow:0 1px 0 #000;line-height:30px">재료</span>';
  t.onclick = (e) => { e.stopPropagation(); globalThis.__remodMats?.(); };
  u.parentElement.append(t);
}, 300);
setInterval(() => { const t = document.querySelector('.__matsTab'); t?.classList.toggle('open', !!document.getElementById('__mats')); }, 200);
