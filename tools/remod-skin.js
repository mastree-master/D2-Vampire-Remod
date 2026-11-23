// 공통 창 스킨: 기존 패치 창(F2·F6·F4·F10 등)과 리모드 창을 원작 D2 패널처럼(검은 바탕, 원작 퀘스트 창 그림 테두리 9칸 자르기, 원작 X 단추)
(() => {
  const BG = '#101010'; // 원작 창 안쪽처럼 검은 돌색
  const PANELS = '#__plog,#__pguide,#__prw,#__pdrop,#__pks,#__remod>div,#__room>div,#__cube>div,#__quest>div,#__rwh';
  const css = `
${PANELS},#__mats>div{background:${BG}!important;border:7px solid transparent!important;border-image:url(../d2/town/quest.png) 7 stretch!important;box-shadow:0 0 24px #000!important;color:#c8b27a!important}
#__plog,#__pguide,#__prw,#__pdrop,#__pks{z-index:100000!important}
#__plog>div:first-child,#__pguide>div:first-child,#__prw>div:first-child,#__pdrop>div:first-child,#__pks>div:first-child{background:#1a150c!important;border-bottom:2px solid #5a4a2a!important}
#__plog>div:first-child,#__pguide>div:first-child>div:first-child,#__prw>div:first-child>div:first-child,#__pdrop>div:first-child>div:first-child,#__pks>div:first-child>div:first-child{font:bold 20px Cinzel,serif!important;color:#d8b860!important;text-shadow:0 0 10px #a60,0 2px 0 #000;letter-spacing:1px}
:is(${PANELS},#__mats,#__chat,#__party) button{background:linear-gradient(#5a5650,#2c2a26)!important;color:#e8d8a8!important;border:1px solid #8a6d3b!important;cursor:pointer}
:is(${PANELS},#__mats,#__chat) :is(input,select,textarea){background:#0d0b07!important;color:#e8d8a8!important;border:1px solid #5a4a2a!important}
:is(${PANELS},#__mats)::-webkit-scrollbar,:is(${PANELS},#__mats) ::-webkit-scrollbar{width:10px}
:is(${PANELS},#__mats)::-webkit-scrollbar-thumb,:is(${PANELS},#__mats) ::-webkit-scrollbar-thumb{background:#5a4a2a;border:1px solid #8a6d3b}
:is(${PANELS},#__mats)::-webkit-scrollbar-track,:is(${PANELS},#__mats) ::-webkit-scrollbar-track{background:#0a0806}
#__chat button[data-on]{background:linear-gradient(#a8843f,#5a4218)!important;color:#fff!important;border-color:#e0b860!important}
#__chat{background:${BG}!important;border:5px solid transparent!important;border-image:url(../d2/town/quest.png) 7 stretch!important}
#__party>*{background:${BG}!important;border:1px solid #8a6d3b!important}
`;
  // 창마다 오른쪽 위 X 닫기 버튼. [창 id, 버튼을 붙일 안쪽 판(겉 덮개 창은 첫 자식)]
  const CLOSE = { __plog: 0, __pguide: 0, __prw: 0, __pdrop: 0, __pks: 0, __rwh: 0, __mats: 0, __cube: 1, __quest: 1, __room: 1, __remod: 1, __guide: 1 };
  const addX = () => {
    for (const [id, inner] of Object.entries(CLOSE)) {
      const o = document.getElementById(id), p = inner ? o?.firstElementChild : o;
      if (!p || p.querySelector(':scope > .__x')) continue;
      const x = document.createElement('div');
      x.className = '__x';
      x.textContent = '';
      x.title = '닫기';
      x.style.cssText = 'position:sticky;top:0;float:right;align-self:flex-end;margin:-4px -4px 0 8px;z-index:5;width:24px;height:24px;cursor:pointer;background:url(../d2/ui/storebtn-10.png) center/100% 100%';
      x.onclick = (e) => { e.stopPropagation(); o.remove(); };
      p.prepend(x);
    }
  };
  new MutationObserver(addX).observe(document.documentElement, { childList: true, subtree: true });
  const put = () => { if (document.getElementById('__skin')) return; const s = document.createElement('style'); s.id = '__skin'; s.textContent = css; (document.head ?? document.documentElement).append(s); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', put) : put();
})();
