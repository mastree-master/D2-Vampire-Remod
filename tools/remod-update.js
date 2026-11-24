// 강제 업데이트: 서버·GitHub 의 최신 리모드 버전과 내 버전(__remodVer)이 다르면 업데이트 전까지 게임을 막는다
// 판 도중이면 경고만 띄우고 판이 끝나(마을·메뉴로 나오)면 막는다. 서버에 못 붙으면(오프라인) 막지 않음
(() => {
  let need = null, warned = false;
  const block = () => {
    if (document.getElementById('__updgate')) return;
    const d = document.createElement('div');
    d.id = '__updgate';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgb(0 0 0/.85);display:flex;align-items:center;justify-content:center;font:15px sans-serif;color:#c8b27a';
    d.innerHTML = `<div class="__d2p" style="width:min(560px,90vw);padding:22px 26px;text-align:center;line-height:1.7;background:radial-gradient(ellipse at top,#231d12,#0a0806 70%);border:3px ridge #8a6d3b;box-shadow:0 0 0 2px #000,0 0 40px #000">
      <div style="font:bold 26px Cinzel,serif;color:#d8b860;text-shadow:0 0 10px #a60,0 2px 0 #000">업데이트가 필요합니다</div>
      <div style="margin:10px 0;color:#ddd">${String(need.note ?? '').replace(/</g, '&lt;')}</div>
      <div>지금 버전 <b style="color:#f77">v${globalThis.__remodVer}</b> → 최신 버전 <b style="color:#9f9">v${need.ver}</b></div>
      ${need.url ? `<div style="margin-top:10px;user-select:text">받는 곳: <span style="color:#8cf">${String(need.url).replace(/</g, '&lt;')}</span></div>` : ''}
      <div style="margin-top:12px;color:#887;font-size:13px">업데이트를 받기 전에는 게임을 할 수 없습니다.</div>
      <div style="display:flex;gap:14px;justify-content:center;margin-top:16px"><button data-u="go">업데이트 하기</button><button data-u="quit">종료</button></div><div class="msg" style="margin-top:8px;color:#ffd27a;min-height:18px"></div></div>`;
    for (const b of d.querySelectorAll("button")) b.style.cssText = "padding:7px 22px;font:bold 15px sans-serif;cursor:pointer;color:#e8d8a8;background:linear-gradient(#5a5650,#2c2a26);border:1px solid #8a6d3b";
    // 업데이트 하기: 받는 곳(url)을 연다. 없으면 안내만. 종료: 게임을 끈다
    d.querySelector("[data-u=go]").onclick = () => { const m = d.querySelector(".msg"); if (globalThis.d2app?.remodUpdate) { m.textContent = "새 버전을 받는 중입니다. 잠시 뒤 게임이 꺼졌다가 다시 켜집니다..."; globalThis.d2app.remodUpdate().then((ok) => { if (!ok) m.textContent = "설치 프로그램(D2S-Remod.bat)으로 설치한 리모드에서만 자동 업데이트가 됩니다."; }); return; } if (need.url) { try { window.open(need.url, "_blank"); } catch {} m.textContent = "받는 곳을 열었습니다. 새 버전을 설치한 뒤 다시 켜 주세요."; } else m.textContent = "아직 받는 곳이 정해지지 않았습니다. 서버 관리자에게 문의하세요."; };
    d.querySelector("[data-u=quit]").onclick = () => { try { globalThis.d2app?.quit?.(); } catch {} setTimeout(() => window.close(), 300); };
    document.body.append(d);
    // 게임 조작 막기
    for (const t of ['keydown', 'keyup', 'mousedown', 'mouseup', 'click', 'wheel', 'contextmenu']) window.addEventListener(t, (e) => { if (document.getElementById('__updgate') && !e.target?.closest?.('#__updgate button')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  };
  const check = async () => {
    try {
      // 최신 버전: 리모드 서버(/ver, 캐시 없음). 못 받으면 GitHub version.txt(CDN 캐시로 몇 분 옛 값일 수 있음)
      const sv = JSON.parse((await globalThis.d2app?.leaderboard?.('GET', '/ver').catch?.(() => null))?.body ?? 'null');
      const gh = sv?.ver ? null : await globalThis.d2app?.remodLatest?.();
      const v = sv?.ver ? sv : gh ? { ver: gh, note: '새 버전이 나왔습니다. [업데이트 하기]를 누르면 새 버전을 받아 설치하고 다시 켭니다.' } : null;
      need = v?.ver && globalThis.__remodVer && globalThis.__remodVer !== v.ver ? v : null;
    } catch { /* 오프라인이면 그대로 */ }
  };
  check();
  setInterval(check, 10 * 60 * 1000);
  setInterval(() => {
    if (!need || !document.body) return;
    const st = globalThis.__gm?.state;
    if (globalThis.__gm?.inRun || st === 'playing' || st === 'paused') { // 판 중(레벨업·인벤 창 포함)엔 막지 않고 알림만 if (!warned) { warned = true; globalThis.__gm?.hud?.banner?.(`새 버전 v${need.ver} 이 나왔습니다. 이 판이 끝나면 업데이트해야 합니다`, 'unique'); } return; }
    block();
  }, 1000);
})();
