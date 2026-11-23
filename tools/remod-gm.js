// GM 버튼: 서버를 켠 이 PC 에서 접속한 내 계정만 보임(서버 /gmok 이 판정). 강화 재료·정수 받기, 이름으로 아이템 만들기(공유 창고 9)
(() => {
  const key = () => { try { return localStorage.getItem('d2s:key'); } catch { return null; } };
  let ok = null, last = 0;
  const check = async () => {
    const k = key();
    if (!k) return;
    try { const r = await globalThis.d2app?.leaderboard?.('GET', `/gmok?key=${k}`); ok = !!JSON.parse(r?.body ?? 'null')?.ok; } catch { ok = false; }
    globalThis.__isGM = ok; if (!ok && (globalThis.__spd ?? 1) > 1.5) globalThis.__spd = 1.5; // 일반은 1.5배까지(F7)
  };
  const MATS = ['Hero Token', 'Item Fragment', 'Fortune Stone', 'Abyss Shard', 'Dimension Fragment', 'Socket Stone', 'Rune Box', 'High Rune Box', 'Fire Whetstone', 'Lightning Whetstone', 'Cold Whetstone', 'Poison Whetstone', "Larzuk's Essence", 'Burning Essence of Terror'];
  const open = () => {
    const save = globalThis.__gm?.save;
    if (!save) return;
    document.getElementById('__gmp')?.remove();
    const w = document.createElement('div');
    w.id = '__gmp';
    w.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99996;width:min(560px,92vw);padding:16px 20px;background:radial-gradient(ellipse at top,#2a2418,#0c0a07 70%);border:3px ridge #8a6d3b;box-shadow:0 0 0 2px #000,0 0 40px #000;font:13px sans-serif;color:#c8b27a';
    w.onkeydown = w.onkeyup = (e) => e.stopPropagation();
    const note = document.createElement('div');
    note.style.cssText = 'min-height:18px;color:#fff;margin-top:8px';
    const b = (t, f) => { const x = document.createElement('button'); x.textContent = t; x.style.cssText = 'margin:2px;padding:3px 10px;background:linear-gradient(#5a5650,#2c2a26);color:#e8d8a8;border:1px solid #8a6d3b;cursor:pointer'; x.onclick = f; return x; };
    const ko = (t) => String(globalThis.__ko?.(t) ?? t);
    w.innerHTML = '<div style="font:bold 17px Cinzel,serif;color:#d8b860">GM</div><div style="color:#887;font-size:11px">이 PC 서버의 내 계정만 보입니다</div><div style="margin-top:10px;color:#d8b860">재료 받기 (재료 창고로)</div>';
    const mats = document.createElement('div');
    for (const n of [1, 10, 100]) mats.append(b(`전부 +${n}`, () => { const m = (save.remodMats ??= {}); for (const k of MATS) m[k] = Math.min(9999, (m[k] ?? 0) + n); globalThis.__saveNow?.(); note.textContent = `재료 ${MATS.length}종을 ${n}개씩 넣었습니다.`; }));
    const make = document.createElement('div');
    make.style.cssText = 'margin-top:10px';
    make.innerHTML = '<div style="color:#d8b860">아이템 만들기 (유니크·세트 이름, 영어나 한글. 공유 창고 9 탭으로)</div>';
    const inp = Object.assign(document.createElement('input'), { placeholder: '예: 리모드참 +0, Harlequin Crest, 샤코' });
    inp.style.cssText = 'width:60%;background:#000;color:#fff;border:1px solid #5a4a2a;padding:3px 6px';
    const list = document.createElement('div');
    list.style.cssText = 'max-height:180px;overflow:auto;margin-top:4px';
    const names = () => { const m = globalThis.__mk?.(); return m ? [...m.GJ.map((x) => x.name), ...m.tZ.keys()] : []; };
    inp.oninput = () => {
      const NICK = { 샤코: 'harlequin crest', 마라: "mara's kaleidoscope", 애니: 'annihilus', 토치: 'hellfire torch', 그리폰: "griffon's eye", 윈포: 'windforce' }; // 흔히 부르는 별명
      const q0 = inp.value.trim().toLowerCase(), q = NICK[q0] ?? q0;
      list.replaceChildren();
      if (q.length < 2) return;
      for (const n of names().filter((n) => n.toLowerCase().includes(q) || ko(n).toLowerCase().includes(q)).slice(0, 30)) {
        list.append(b(`${ko(n)} (${n})`, () => {
          const it = globalThis.__makeItem?.(n);
          if (!it) return (note.textContent = `${n} 을(를) 만들 수 없습니다.`);
          (save.stashTabs.shared9 ??= []).push(it);
          globalThis.__saveNow?.();
          note.textContent = `${ko(n)} → 공유 창고 9 탭에 넣었습니다(창고를 다시 열면 보임).`;
        }));
      }
    };
    make.append(inp, list);
    // 배속: GM 만 10배까지(F7 은 GM 일 때 1~10배를 돌고, 일반은 1·1.5배만)
    const spd = document.createElement('div');
    spd.style.cssText = 'margin-top:10px';
    spd.innerHTML = '<div style="color:#d8b860">배속</div>';
    for (const x of [1, 1.5, 2, 3, 5, 7, 10]) spd.append(b(`x${x}`, () => { globalThis.__spd = x; globalThis.__spdA = 0; note.textContent = `배속 x${x}`; }));
    w.append(mats, spd, make, note, b('닫기', () => w.remove()));
    document.body.append(w);
    inp.focus();
  };
  // 마을·게임 화면 왼쪽 위에 작은 버튼. 판정이 나기 전·남의 계정이면 안 보임
  setInterval(() => {
    if (!ok && key() && Date.now() - last > 10000) { last = Date.now(); check(); } // 서버가 게임보다 늦게 떠도 다시 물어봄
    const show = ok && globalThis.__gm?.save;
    let el = document.getElementById('__gmb');
    if (!show) return el?.remove();
    if (el) return;
    el = document.createElement('button');
    el.id = '__gmb';
    el.textContent = 'GM';
    el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99990;padding:2px 8px;font:bold 12px sans-serif;background:linear-gradient(#5a5650,#2c2a26);color:#ffd36a;border:1px solid #8a6d3b;cursor:pointer;opacity:.75';
    el.onclick = (e) => { e.stopPropagation(); open(); };
    document.body.append(el);
  }, 1000);
})();
