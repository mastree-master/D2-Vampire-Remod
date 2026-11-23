// 리모드 안내서: 처음 켜면 한 번 자동으로 뜨고, 이후에는 채팅 창 [?] 옆 또는 J 키로 연다. 왼쪽 목차를 누르면 오른쪽에 설명
(() => {
  const PAGES = [
    ['처음 시작', `D2 Vampire Remod 에 오신 걸 환영합니다! 디아블로 2 에 새 아이템·창고·멀티플레이·도전 콘텐츠를 더한 리모드입니다.

■ 꼭 알아 둘 단축키
· J — 이 안내서
· B — 창고 (어디서나)
· K — 호라드릭 큐브 (어디서나)
· H — 룬워드 도움말
· F2 보관 설정 · F4 룬워드 목록 · F6 설명서 · F10 업데이트 기록
· Enter — 채팅 입력

■ 화면 오른쪽 아래 채팅 창
일반·전체·거래·길드 채팅과 [숙제] [대기실] [길드 관리] 버튼이 있습니다.

■ 창 닫기
모든 창은 오른쪽 위 [✕] 로 닫습니다.`],
    ['창고와 재료 탭', `■ 창고 (B)
위쪽 탭: 개인 · 공유 · 고유 · 재료. 왼쪽에 공유 창고 1~9 페이지 목록(우클릭으로 이름 바꾸기)과 [큐브] 버튼이 있습니다.

■ 재료 탭
룬 33칸, 정수, 지도·계약서·교본, 열쇠·장기 칸이 늘 같은 자리에 있습니다.
· 줍는 룬·정수 등은 재료 탭에 먼저 자동으로 들어갑니다 (칸마다 9,999개).
· 클릭 = 1개 꺼내기, 우클릭 = 개수를 정해서 꺼내기.
· 인벤의 재료는 창고를 연 채 우클릭하면 제자리로 들어갑니다.
· 열쇠·장기는 원작 보관함(인벤 오른쪽 아래 숫자)과 같은 숫자입니다.

■ 고유 탭
왼쪽 [원작 고유] / [리모드 고유] 버튼으로 등록창을 바꿔 봅니다.`],
    ['리모드 아이템', `■ 리모드 전용 아이템
유니크·세트·룬워드가 대거 추가돼 있습니다. 이름과 수치는 리모드에 맞게 다듬었습니다.

■ 공포 100 전용 템
공포 영역 100단계 이상 막 보스에서만 떨어지는 50종. 툴팁 맨 위에 붉은 "공포 100 전용"이 붙습니다.

■ 룬워드 만들기
소켓 있는 일반(흰색) 아이템에 룬을 순서대로 끼우면 됩니다. 조합은 H 키 룬워드 도움말에서 확인하세요 (이름에 마우스를 대면 옵션).

■ 쥬얼
리모드 전용 쥬얼 옵션 10종, 직업 스킬 탭 +1 쥬얼, 스킬 하나 +1~2 쥬얼이 있습니다.

■ 레어 아이템
레어 장비·쥬얼은 15% 확률로 지금 직업 스킬 하나에 +1~2 가 붙습니다.`],
    ['호라드릭 큐브', `창고 왼쪽 [큐브] 버튼으로 엽니다.

가운데 칸에 템을 넣고(인벤에서 집어 클릭) 아래 버튼을 누릅니다.

· 강화 — 장비 조각 5개, 기본 40% (행운석 1~3개 체크하면 개당 +10%p). 템마다 10번
· 초월 — 10번 다 쓴 템에 리모드의 파편 10 + 차원의 조각 5. 상한 20
· 깎기석 — 무기에 원소 관통 · 참 강화 — 리모드참을 리모드의 파편으로
· 룬 올리기 — 같은 룬 3개 → 다음 룬
· 룬 상자 — 열기 / 룬 상자 5개 → 고급 룬 상자 1개 (이오 룬 이상)
· 소켓의 돌 → 라주크의 정수
· 쥬얼 / 부적 다시 굴리기 — 손에 든 채로, 라주크의 정수 1개
· 골드 교환 — 남는 골드로 정수·룬·용병 아이템 사기
· 공포의 지도 — 펼치면 그 판에 위험 2 + 보상 2 접사
· 용병 — 계약서(등급 +1, 최대 10), 훈련 교본(스킬 +1, 최대 3)
· 보스 탑 — 버티기 도전 (공포 100 이상)
· 보스 소환 — 던전에서 룬 + 정수로 보스 부르기`],
    ['악마술사', `캐릭터 목록 [새로 만들기] → 악마술사.

■ 트리
· 혼돈 — 독기 볼트, 독기 사슬, 심연 등 독·암흑 공격
· 악마 — 염소인간·오염된 자·파멸자 소환, 악마 속박(쓰러뜨린 몬스터를 잠시 내 편으로)
· 주술 — 가르기 등

■ 기술 변형
다른 직업처럼 호라드림 고서를 모아 기술 변형을 고릅니다.`],
    ['강화 재료', `재료 탭(창고 → 재료)에 모이고, F2 에서 재료마다 보관·판매를 정합니다.

· 장비 조각 — 팔리는 장비 자동 분해 (매직 1 · 레어 2 · 유니크/세트/룬워드 3)
· 행운석 — 강화 확률 +10%p
· 리모드의 파편 · 차원의 조각 — 초월, 참 강화
· 소켓의 돌 — 라주크의 정수로
· 깎기석 4종 — 무기 원소 관통
· 룬 상자 — 룬 1개 / 고급 룬 상자 — 이오 룬 이상 1개
· 영웅의 증표 — 숙제 보상, 칭호 상점`],
    ['보스 탑', `공포 영역 100 이상을 깬 사람만 열립니다. 던전 안에서 큐브 → [보스 탑] → 입장.

· 안다리엘 · 두리엘 · 메피스토 · 디아블로 · 바알 탑 5개
· 처음부터 몬스터가 3배, 1분마다 더 세집니다. 2분마다 탑 보스가 나옵니다.
· 90초 또는 1,000킬마다 봉인된 두루마리 3개 → 1개 열기
  - 이번 판 강화: 공격력·받는 피해·생명력·이동 속도·MF·골드·회복
  - 아이템: 오래 버틸수록 좋은 룬·정수·쥬얼 등
  - [5초 뒤 자동으로 고르기] 를 켜 두면 알아서 고릅니다.
· 화면 위에 버틴 시간, 고른 강화 합계, 연 두루마리가 보입니다.
· 죽으면 끝. 버틴 시간이 탑별 순위에 올라갑니다.`],
    ['멀티플레이', `■ 들어가기
메인 메뉴 [멀티플레이] 또는 채팅 창 [대기실]. 공개 방 목록에서 입장하거나, 방 이름 + 비밀번호로 만들고 들어갑니다.

■ 파티
· 같은 방 사람끼리 자동으로 파티가 됩니다 (최대 4명).
· 방장의 몬스터를 다 같이 잡습니다. 경험치·드롭은 각자.
· 한 명 늘 때마다 몬스터 체력 +50%, 경험치 +30%.
· 방을 만들 때 [어려움] 을 고르면 더 세고 보상도 큽니다.

■ 이름
처음 접속하면 "닉네임#번호" 를 받습니다. /이름 새닉네임 으로 닉네임만 바꿉니다.

■ 길드 · 아이템 보내기
[길드 관리] 에서 길드 만들기·가입. 같은 방 사람에게 손에 든 아이템을 보낼 수 있습니다 (받는 사람 공유 창고 9).

■ 공용 드롭
템이 떨어지면 모두 1~999 주사위, 가장 높은 사람이 받습니다.`],
    ['PvP', `방을 만들 때 모드를 고릅니다. 모두 [준비] 를 누르면 3초 뒤 경기장으로 갑니다.

· 결투 1:1 — 단판 / 3판 2선승 / 5판 3선승
· 다대다 4:4 — 승자독식 / 각자 대결
· 길드전 — 2:2 ~ 8:8, 3·4·5분. 끝나면 킬 많은 편 승리
  길드가 있어야 하고, 방장 길드 vs 처음 들어온 다른 길드만 들어옵니다.
  연합 칸: "우리편길드,… vs 상대길드,…"
· 결과는 래더 탭 순위에 오릅니다.`],
    ['숙제 · 업적 · 칭호', `채팅 창 [숙제] 버튼.

· 오늘의 숙제 3개, 이번 주 숙제 3개 — 보상은 룬·정수·영웅의 증표 (재료 탭으로)
· 칭호 상점 — 영웅의 증표로 증표 수집가(10)·성역의 영웅(30)·살아있는 전설(100)
· 업적 11개 — 이루면 칭호가 생깁니다
· 고른 칭호는 채팅 이름 앞에 붙고, 칭호마다 옵션이 있습니다 (고른 칭호 하나만 적용)`],
  ];
  const open = () => {
    if (document.getElementById('__guide')) return document.getElementById('__guide').remove();
    const wrap = document.createElement('div');
    wrap.id = '__guide';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:100003;background:rgb(0 0 0/.6);display:flex;align-items:center;justify-content:center;font:15px "D2R Kodia",sans-serif;color:#c7b377';
    // 원작 D2 패널(친구·길드 창과 같은 퀘스트 창 테두리 9칸 자르기, X 단추, D2 글꼴)
    const panel = document.createElement('div');
    panel.style.cssText = 'position:relative;width:min(900px,94vw);height:min(620px,88vh);background:#101010;box-shadow:0 0 18px #000';
    const frame = document.createElement('div');
    frame.style.cssText = 'position:absolute;inset:0;z-index:1;pointer-events:none;box-sizing:border-box;border-style:solid;border-width:30px 7px 8px 7px;border-image:url(../d2/town/quest.png) 30 7 8 7 stretch';
    const head = document.createElement('div');
    head.style.cssText = 'position:absolute;z-index:2;left:0;right:0;top:0;height:30px;display:flex;align-items:center;justify-content:center;user-select:none';
    head.innerHTML = '<span style="font:bold 17px \'D2R Kodia\',sans-serif;color:#c7b377;letter-spacing:1px;text-shadow:0 1px 2px #000">Vampire Remod 안내서</span>';
    const x = document.createElement('div');
    x.title = '닫기 (J)'; x.style.cssText = 'position:absolute;right:14px;top:3px;width:24px;height:24px;cursor:pointer;background:url(../d2/ui/storebtn-10.png) center/100% 100%';
    x.onclick = () => wrap.remove();
    head.append(x);
    const body = document.createElement('div');
    body.style.cssText = 'position:absolute;left:7px;right:7px;top:30px;bottom:8px;display:flex;gap:10px;padding:10px;box-sizing:border-box';
    const menu = document.createElement('div');
    menu.style.cssText = 'width:170px;display:flex;flex-direction:column;gap:3px;overflow-y:auto';
    const text = document.createElement('div');
    text.style.cssText = 'flex:1;overflow-y:auto;white-space:pre-line;line-height:1.7;padding:8px 14px;border:1px solid #4a4436;background:#000;color:#c8c8c8';
    const show = (i) => {
      text.innerHTML = `<div style="font:bold 19px 'D2R Kodia',sans-serif;color:#c7b377;margin-bottom:6px">${PAGES[i][0]}</div>` + PAGES[i][1].replace(/■ ([^\n]+)/g, '<b style="color:#c7b377">■ $1</b>');
      [...menu.children].forEach((b, j) => { b.style.background = j === i ? '#2a2418' : '#000'; b.style.color = j === i ? '#fff' : '#c7b377'; b.style.borderColor = j === i ? '#8a7a50' : '#4a4436'; });
    };
    PAGES.forEach(([t], i) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'text-align:left;padding:7px 10px;font:14px "D2R Kodia",sans-serif;border:1px solid #4a4436;cursor:pointer'; b.onclick = () => show(i); menu.append(b); });
    body.append(menu, text);
    panel.append(body, frame, head);
    wrap.append(panel);
    wrap.onclick = (e) => { if (e.target === wrap) wrap.remove(); };
    document.body.append(wrap);
    show(0);
  };
  globalThis.__remodGuide = open;
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyJ' || /^(INPUT|TEXTAREA)$/.test(e.target?.tagName)) return;
    e.preventDefault(); e.stopPropagation(); open();
  }, true);
  // 처음 한 번 자동으로
  const first = setInterval(() => {
    if (!document.body || !globalThis.__gm?.save) return;
    clearInterval(first);
    try { if (localStorage.getItem('__guideSeen')) return; localStorage.setItem('__guideSeen', '1'); } catch { return; }
    setTimeout(open, 1500);
  }, 1000);
})();
