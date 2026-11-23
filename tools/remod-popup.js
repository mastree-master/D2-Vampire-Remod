// 리모드 팝업 공통 D2 창 모양: 판에 class "__d2p" 를 붙이면 원작 퀘스트 창 테두리(9칸 자르기)·D2 글꼴·D2식 단추로 덮어씀
(() => {
  const css = `
.__d2p{background:#101010!important;border-style:solid!important;border-width:30px 9px 10px 9px!important;border-image:url(../d2/town/quest.png) 30 7 8 7 stretch!important;border-radius:0!important;box-shadow:0 0 18px #000!important;font-family:"D2R Kodia",sans-serif!important;color:#c7b377}
.__d2p *{font-family:"D2R Kodia",sans-serif}
.__d2p [style*="Cinzel"],[style*="Cinzel"]{font-family:"D2R Kodia",sans-serif!important;font-weight:bold;color:#c7b377!important;text-shadow:0 1px 2px #000!important;letter-spacing:1px}
.__d2p button:not([style*="url("]){background:#1a1712!important;border:1px solid #6b5a33!important;border-radius:0!important;color:#c7b377!important;box-shadow:none!important}
.__d2p button:not([style*="url("]):hover{background:#2a2418!important;color:#fff!important}
.__d2p input,.__d2p select,.__d2p textarea{background:#000!important;border:1px solid #4a4436!important;color:#fff!important;border-radius:0!important}
`;
  const add = () => { if (document.getElementById('__d2pcss')) return; const s = document.createElement('style'); s.id = '__d2pcss'; s.textContent = css; document.head.append(s); globalThis.__remodFontApply(); };

  // 리모드 글자(팝업·안내서·채팅·창 제목 = id 가 __ 로 시작하는 리모드 창) 글꼴 고르기. 폰트 파일은 저장소에 안 넣고 각 폰트 공식 웹폰트 주소에서 받음(재배포 금지 폰트가 많음)
  // 한글: 눈누(projectnoonnu jsDelivr), 영어: Fontshare CSS API(주소가 //cdn 이라 받아서 https: 를 붙임). 고른 값은 이 PC 의 localStorage(remod:fontKo/En)
  const NN = 'https://cdn.jsdelivr.net/gh/';
  globalThis.__remodFonts = {
    ko: [
      ['', '기본(레저렉션 글꼴)'],
      ['ChaiHwaljjak-Bold', '차이 활짝체', `${NN}Project-Noonnu/2610082345@chaihwaljjak-regular/chaihwaljjak-regular/ChaiHwaljjak-Bold.woff2`],
      ['MaplestoryOTFBold', '넥슨 메이플스토리', `${NN}projectnoonnu/noonfonts_20-04@2.1/MaplestoryOTFBold.woff`],
      ['DancingPeoples-Dance-VF', '춤추는사람들', `${NN}Project-Noonnu/2610082345@dancingpeoples-dance-vf/dancingpeoples-dance-vf/DancingPeoples-Dance-VF.woff2`],
      ['yg-jalnan', '여기어때 잘난체', `${NN}projectnoonnu/noonfonts_four@1.2/JalnanOTF00.woff`],
      ['GmarketSansMedium', 'G마켓 산스', `${NN}projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff`],
    ],
    en: [['', '기본'], ['Satoshi', 'Satoshi', 'satoshi'], ['General Sans', 'General Sans', 'general-sans'], ['Clash Grotesk', 'Clash Grotesk', 'clash-grotesk'], ['Switzer', 'Switzer', 'switzer'], ['Alpino', 'Alpino', 'alpino']],
  };
  const get = (k) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } };
  const loaded = new Set();
  const load = async (kind, fam) => {
    const f = globalThis.__remodFonts[kind].find((x) => x[0] === fam); if (!f?.[2] || loaded.has(fam)) return;
    loaded.add(fam);
    let rule = '';
    if (kind === 'ko') rule = `@font-face{font-family:'${fam}';src:url('${f[2]}');font-display:swap}`;
    else { try { rule = (await (await fetch(`https://api.fontshare.com/v2/css?f[]=${f[2]}@400,500,700&display=swap`)).text()).replace(/url\('\/\//g, "url('https://"); } catch { loaded.delete(fam); return; } }
    const s = document.createElement('style'); s.textContent = rule; document.head.append(s);
  };
  globalThis.__remodFontApply = () => {
    const ko = get('remod:fontKo'), en = get('remod:fontEn');
    if (ko) load('ko', ko); if (en) load('en', en);
    let s = document.getElementById('__fontcss'); if (!s) { s = document.createElement('style'); s.id = '__fontcss'; document.head.append(s); }
    const stack = [en, ko].filter(Boolean).map((x) => `'${x}'`).join(',');
    s.textContent = stack ? `.__d2p,.__d2p *,[id^="__"],[id^="__"] *{font-family:${stack},"D2R Kodia",sans-serif!important}` : '';
  };
  document.head ? add() : addEventListener('DOMContentLoaded', add);

  // ESC: 리모드 창이 열려 있으면 맨 위 하나만 닫고 게임 ESC 메뉴는 안 엶
  // 닫는 것: 아래 id 창(F5·통계·패치 기록·업데이트 묻기 등) + D2 창 모양(.__d2p)을 쓴 팝업(이름 없는 안내 상자 포함)
  // 안 닫는 것: 채팅·캐릭터 선택(늘 떠 있음), 옛 버전 막음(__updgate)
  const CLOSE = ['__onw', '__st', '__plog', '__updq', '__remod', '__quest', '__rwh', '__cube', '__guide', '__mats', '__gmp', '__skin', '__fmenu'];
  const KEEP = '#__chat,#__chars,#__updgate';
  const top = (x) => { while (x.parentElement && x.parentElement !== document.body) x = x.parentElement; return x; };
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const pops = [...document.querySelectorAll('.__d2p')].filter((x) => !x.closest(KEEP)).map(top).filter((x) => getComputedStyle(x).position === 'fixed'); // body 바로 밑 떠 있는 창만(게임 화면 통째로 지우는 일 없게)
    const open = [...new Set([...CLOSE.map((id) => document.getElementById(id)), ...pops])].filter((x) => x?.isConnected && x.offsetWidth && x !== document.body && !x.matches(KEEP));
    if (!open.length) return;
    const z = (x) => +getComputedStyle(x).zIndex || 0;
    open.sort((a, b) => z(a) - z(b) || (a.compareDocumentPosition(b) & 4 ? -1 : 1)).pop().remove();
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
})();
