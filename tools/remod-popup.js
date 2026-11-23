// 리모드 팝업 공통 D2 창 모양: 판에 class "__d2p" 를 붙이면 원작 퀘스트 창 테두리(9칸 자르기)·D2 글꼴·D2식 단추로 덮어씀
(() => {
  const css = `
.__d2p{background:#101010!important;border-style:solid!important;border-width:30px 9px 10px 9px!important;border-image:url(../d2/town/quest.png) 30 7 8 7 stretch!important;border-radius:0!important;box-shadow:0 0 18px #000!important;font-family:"D2R Kodia",sans-serif!important;color:#c7b377}
.__d2p *{font-family:"D2R Kodia",sans-serif}
.__d2p [style*="Cinzel"],[style*="Cinzel"]{font-family:"D2 Exocet","D2R Kodia",serif!important;color:#c7b377!important;text-shadow:0 1px 2px #000!important;letter-spacing:1px}
.__d2p button:not([style*="url("]){background:#1a1712!important;border:1px solid #6b5a33!important;border-radius:0!important;color:#c7b377!important;box-shadow:none!important}
.__d2p button:not([style*="url("]):hover{background:#2a2418!important;color:#fff!important}
.__d2p input,.__d2p select,.__d2p textarea{background:#000!important;border:1px solid #4a4436!important;color:#fff!important;border-radius:0!important}
`;
  const add = () => { if (document.getElementById('__d2pcss')) return; const s = document.createElement('style'); s.id = '__d2pcss'; s.textContent = css; document.head.append(s); };
  document.head ? add() : addEventListener('DOMContentLoaded', add);
})();
