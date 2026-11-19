# 작업 노트

## 2026-11-18
- 서버 위치: 집 PC로 시작. 공개는 나중. 저장은 요약 + 최고 기록만 (용량 최소).
- 새 버전은 따로 설치·따로 세이브. 1단계(내 서버)부터.
- 원작 1105.3 main.cjs: 순위표 요청은 전부 `app:leaderboard` IPC 하나로 가고 BASE=https://d2survivors.lol/api/leaderboard.
  허용 경로: runs, deaths, checks, forge, tiers, stats, boards/<id>, runs/<id>, players/<hex16>, hc/(checkin|act|checkout|deaths|runs|heroes|ladder).
  D2S_LEADERBOARD_URL 환경 변수에 http://127.0.0.1:포트 를 주면 그쪽으로 보냄(로컬 http만 허용). 로컬 시험은 코드 수정 없이 가능.
- 버그 신고 /api/report 와 업데이트 /download/ 는 별도. 손대지 않음.
- forge: 서버가 아이템마다 강화 상태 저장, act=temper/look/claim, 409 stale 이면 서버 상태로 덮어씀, owed(돌려받을 정수) 있음.
- 게임 코드 수정 없이 시험: D2S_USER_DATA(세이브 폴더), D2S_LEADERBOARD_URL(로컬 http). Remod.bat 이 둘을 설정. 복사본 app.asar 는 원본(해시 일치).
- v0 서버: GET 은 공식 서버 프록시로 응답 형식 수집, POST 는 201 {} 로 받고 기록. forge 는 503(게임이 오프라인 처리).
- 주의: 설치된 진짜 게임도 지금 app.asar 가 원본(패치 꺼짐) 상태였음.
- 악령술사: D2R 3.3 데이터 playerclass.txt 에 Warlock(war) 줄만 있음. charstats·skills.txt(war 0개)·캐릭터 그래픽 없음. 새 직업은 스킬·그래픽을 직접 만들거나 기존 직업 그래픽 재사용해야 함.
- tools/casc.cjs = 원작 extract-worker 앞부분(+exports). openD2RFolder("C:/Program Files (x86)/Diablo II Resurrected").read("data/global/excel/x.txt") 로 D2R 표 읽기. 경로는 / 슬래시.
- D2R 데이터에 룬 33개 그래픽(items.runes), 보석, gemSocket 있음. 원작 게임은 룬워드를 완성품으로만 떨굼.
- forge 아이템 상태 = {"t":{"s<줄>":횟수,...},"hf":1(헬포지 사용),"h":"16hex 서버 해시"}. act: temper(무작위 한 줄 +1, 최대 10), clean(전부 제거), hellforge(10회 뒤 한 번: 두 배 또는 전부 잃음), upgrade(상위 베이스), look, claim(owed 정수 돌려받기). 결과 outcome: missed/cleaned/brick/god/upgraded/took/look/claimed. 409 stale, locked=예전 세이브.
- 판 기록(/runs)은 판이 끝나야 감. 보통 1막 클리어 뒤 나가면 안 감(세이브 heroes.<cls>.run 에 이어하기로 남음).
- server v1: data/db.json 에 기록 전체 저장, 순위는 플레이어당 최고 기록. 대장간 규칙은 server.cjs 맨 위 상수(TEMPER_CHANCE, HELLFORGE_CHANCE).
- Remod.bat 이 서버를 상대 경로로 띄움 → 끌 때는 8520 포트 주인 프로세스를 종료.
- 세이브 원본은 localStorage. save.json/previous.json 은 localStorage 가 비었을 때만 읽음(main.cjs SaveCopy). 세이브 넣기 = 게임 끄고 save\Local Storage 치우고 save\save\save.json 교체.
- 2026-11-18 Remod 세이브에 메인 세이브 복사. 드루이드 시험 세이브는 save\Local Storage.druid-backup, save.remod-druid-backup.json.
- 대장간 줄 고르기: 원작 saveTransfer Lqe/uq/Fqe 규칙을 server.cjs okLine/linesOf 로 옮김. 강화 가능 스탯 목록 = server/temper-stats.txt (원작 Aqe). 원작 확률 참고: 강화 확률 1/(1+합/4), 헬포지 brick .6 / god .4, 한 번에 값 20%(Tqe).
- 기록 안 감 원인: Remod localStorage d2s:leaderboard-held=1 (기록 보내기 보류). 게임 옵션에서 기록 보내기를 켜야 함.
- 2단계 재료(saveTransfer 1105.3): 룬 표 JK=[[이름,레벨]..] 33개, 룬워드 표 YK=z(이름,[룬..],[베이스 종류..]), cZ=이름→룬워드, hZ(룬워드,베이스,에테르,레벨)=룬워드 아이템 생성, aZ/LZ=베이스에 sockets 굴림, fK(베이스이름,레벨)=최대 소켓 수, uZ(룬워드,베이스)=베이스 종류 맞는지. 아이템에 sockets 필드 이미 있음.
- 3단계: 원작에 이미 디아블로 클론 있음 (공포 단계 열린 채 요르단의 반지 팔면 다음 단계에 클론, 어나이얼러스 드롭. save.sojSold/clones/sojLedger). 우버 트리스트럼(장기 3개)도 있음. 우리 버전 = 필요 개수(2~10)와 대상(유니크 반지) 바꾸고 바로 포털 여는 것.
- 공포 영역 기록은 POST /checks {v:1, record, k} 로 단계마다 옴 (record = /runs 와 같은 형식). 서버가 runId 기준으로 저장.
- 게임 수정은 tools/build.cjs (원작 tools/original.asar + PATCHES → game/resources/app.asar + sha256 갱신). 게임 켜져 있을 때 빌드 금지.
- 새 옵션: 서버가 강화 성공 때 10% 확률로 forge.x=[{stat,value}] 추가(+t["x<n>"]=1). 수치 범위 server/new-lines.json (tools/ranges.cjs 로 D2R magicprefix·suffix·properties 에서 뽑음, 48개 스탯). 클라이언트: yq 에서 stats 뒤에 x 붙임, hq 검사가 x 허용. stats 있는 아이템(유니크·세트·룬워드)만.
- 개수 제한 없음 (사용자: 확률이라 제한 불필요).
- 드롭 본체: saveTransfer oY(e,t,n) (itemLevel·treasureLevel → xXe 등급 굴림 → 유니크 ZX/$X, 룬워드 RXe→zXe, 세트 DXe→rZ, 그 외 sY→cY). cY 가 일반/매직/레어 생성.
- 소켓: 아이템 sockets(개수)·socketed(박힌 아이템 배열, 지금은 주얼). fK(베이스,레벨)=베이스 최대 소켓, IZ(e)=아이템 최대, LZ=굴림. 소켓 추가 기능 원작에 있음: 라주크의 정수(type essence)로 "홈을 추가할 아이템 선택" (ZXe 메시지, QXe 가능 여부, $Xe 개수 굴림: 일반=최대).
- 내구도: 원작에 닳는 시스템 없음. 베이스 noDurability·Indestructible·Ethereal 문구만. 새로 만들어야 함.
- 겹치기 9999: 원작 99 상수 3곳(saveTransfer 불러오기 count, FZ 합치기, Game 커서 내려놓기). 아이템 칸 크기 = saveTransfer VY(e). 부적만 원래 크기.
- 2026-11-18 사용자: 지금 Remod 세이브는 버리고 새로 시작 예정. 세이브 호환 신경 안 써도 됨.
- 기존 패치 통합: build.cjs 가 원작 → D2S-MyPatch.bat(화면 없이, 임시 APPDATA, 사용자 options.json 복사) → Remod PATCHES 순서. 기존 패치의 POST 차단(main.cjs)과 켤 때 대기열 비우기(Game)는 지움.
- 사고(2026-11-18): 패처가 $env:D2SF 있으면 작업 스케줄러 D2S-MyPatch-Watch 를 만들거나 지움 → 임시 폴더로 두 번 바뀜. 지금은 스크립트 읽은 뒤 D2SF 를 지워 막음(재빌드로 확인). 실제 작업 복구는 사용자가 원래 D2S-MyPatch.bat 실행.
- 리모드 설정: screens 옵션 메뉴에 {label:리모드 설정,remod} 추가 → globalThis.__remodOptions (tools/options-panel.js, Game 맨 앞에 붙임). 저장 = preload d2remod.get/set → main remod:get/set → D2S-Remod/remod-options.json. Remod.bat 이 이 파일이 app.asar 보다 새로우면 빌드 후 실행. 빌드 옵션은 remod-options.json 우선.
- 아이템 그림 줄이기: saveTransfer b2e(엘리먼트,아이콘,이름,크기) 에 VY(e) 칸 크기 넘겨 28px*칸 에 맞춤.
- 2026-11-18 검은 화면 사고: zq(베이스 목록) 자리에서 JK 가 다른 지역 변수에 가려져 "object is not iterable". 룬 표를 build.cjs RUNES 로 직접 넣어 해결. 시험: node tools/cdp-errors.cjs (디버그 포트로 켜서 콘솔 오류 + 스크린샷 %TEMP%emod-shot.png).
- Remod.bat 은 Write 도구로 쓸 것. printf 로 쓰면    가 제어 문자로 바뀌어 경로가 깨짐(2026-11-18 빨간 글씨 원인). 게임은 --remote-debugging-port=9333 으로 켬(사용자가 켠 게임도 CDP 로 확인 가능).
- 시험 도구: %TEMP%\drive.cjs [{key,code,vk},{click:[x,y],right},{text},{eval},{wait},{shot}] 로 게임 조작(화면 1280x960, 타이틀 Enter → 플레이(640,492) → B 창고). 창고 쪽 DOM 은 부모가 pointer-events:none 이라 새 요소엔 pointer-events:auto 필요.
- 재료 창고 save.remodMats, 페이지 이름 save.remodTabNames (원작 불러오기가 모르는 최상위 키를 ...Qe 로 보존).
