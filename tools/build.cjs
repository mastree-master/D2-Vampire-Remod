// 원작 asar(tools/original.asar)에 기존 패치(D2S-MyPatch)와 Remod 수정을 입혀 game/resources/app.asar 로 만든다
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'game', 'resources', 'app.asar');
// 게임이 켜진 채로 app.asar 를 바꾸면 게임이 망가질 수 있다
if (/D2 Survivors.exe|D2S Remod.exe/.test(execSync('tasklist').toString())) { console.error('게임이 켜져 있어 빌드하지 않습니다. 게임을 끄고 다시 실행하세요.'); process.exit(1); }
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'd2s-remod-'));
const asar = (args) => execSync(`npx -y @electron/asar ${args}`, { stdio: 'inherit' });

const MYPATCH = String.raw`C:\Users\Administrator\Desktop\D2S-MyPatch-Share\D2S-MyPatch.bat`;

// 기존 패치를 임시 폴더의 원작 사본에 화면 없이 적용한다. APPDATA 도 임시 폴더로 돌려 실제 설정은 건드리지 않는다
// 패처는 $env:D2SF 가 있으면 감시 작업(작업 스케줄러 D2S-MyPatch-Watch)을 만들거나 지운다. 스크립트를 읽은 뒤 D2SF 를 지워서 막는다
function myPatch() {
  const dir = path.join(work, 'mypatch'), res = path.join(dir, 'game', 'resources'), app = path.join(dir, 'appdata', 'D2S-MyPatch');
  fs.mkdirSync(res, { recursive: true }); fs.mkdirSync(app, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'original.asar'), path.join(res, 'app.asar'));
  fs.writeFileSync(path.join(res, 'app.asar.sha256'), require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(res, 'app.asar'))).digest('hex'));
  const real = path.join(process.env.APPDATA, 'D2S-MyPatch');
  // 게임 안 "리모드 설정"에서 저장한 값이 있으면 그것, 없으면 기존 패치 설정
  const own = path.join(ROOT, 'remod-options.json');
  const options = JSON.parse(fs.readFileSync(fs.existsSync(own) ? own : path.join(real, 'options.json'), 'utf8').replace(/^﻿/, ''));
  fs.writeFileSync(path.join(app, 'options.json'), JSON.stringify({ ...options, watch: false }));
  if (!fs.existsSync(own)) fs.writeFileSync(own, JSON.stringify({ ...options, watch: false }, null, 1)); // 게임 안 설정 창의 시작값 // 감시는 실제 작업 스케줄러를 바꾸므로 끈다
  if (fs.existsSync(path.join(real, 'speeds.txt'))) fs.copyFileSync(path.join(real, 'speeds.txt'), path.join(app, 'speeds.txt'));
  const ps = path.join(dir, 'run.ps1');
  fs.writeFileSync(ps, `$env:D2SF='${MYPATCH}'; $env:D2S_NOGUI='1'; $env:D2S_SKIPRUN='1'; $env:APPDATA='${path.join(dir, 'appdata')}'
$__root=Split-Path $env:D2SF; $s=[IO.File]::ReadAllText($env:D2SF,[Text.Encoding]::UTF8); Remove-Item env:D2SF
& ([scriptblock]::Create($s.Substring($s.IndexOf('#PS'+'START')))) -Lang ko -Action patch -GameDir '${path.join(dir, 'game')}'`);
  const out = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps}"`, { input: '', encoding: 'utf8' });
  if (!out.includes('[OK]')) throw new Error('기존 패치 실패:\n' + out.slice(-2000));
  console.log(out.trim().split('\n').slice(-2).join('\n'));
  return path.join(res, 'app.asar');
}

// [파일 이름 앞부분, 찾을 문자열, 바꿀 문자열]. 찾을 문자열은 정확히 한 번 있어야 한다. 'main' = desktop/dist/main.cjs
// 원작 룬 표(JK)와 같은 값. 원작 JK 는 이 자리에서 다른 지역 변수에 가려져 직접 적는다
const RUNES = '[[`El`,11],[`Eld`,11],[`Tir`,13],[`Nef`,13],[`Eth`,15],[`Ith`,15],[`Tal`,17],[`Ral`,19],[`Ort`,21],[`Thul`,23],[`Amn`,25],[`Sol`,27],[`Shael`,29],[`Dol`,31],[`Hel`,33],[`Io`,35],[`Lum`,37],[`Ko`,39],[`Fal`,41],[`Lem`,43],[`Pul`,45],[`Um`,47],[`Mal`,49],[`Ist`,51],[`Gul`,53],[`Vex`,55],[`Ohm`,57],[`Lo`,59],[`Sur`,61],[`Ber`,63],[`Jah`,65],[`Cham`,67],[`Zod`,69]]';
// 리모드 전용 유니크: tools/remod-uniques.cjs 가 만든 표 {uniques, drops, ko, setItems, sets, setDrops, runewords}
const REIM = JSON.parse(fs.readFileSync(path.join(__dirname, 'remod-items.json'), 'utf8'));
// 리모드 전용 쥬얼 옵션: [종류, 스탯, 그룹, 영어 이름, 한글 이름, 옵션 레벨, 필요 레벨, 빈도, 최소, 최대]. 그룹 201~ 은 원작과 안 겹침
const JEWELS = [
  ['prefix', 'attackSpeed', 202, 'Swift', '신속한', 70, 55, 2, 5, 10],
  ['prefix', 'fcr', 203, 'Arcane', '비전의', 70, 55, 2, 5, 8],
  ['prefix', 'lifeLeech', 204, 'Vampiric', '흡혈귀의', 72, 58, 2, 1, 3],
  ['prefix', 'strength', 205, "Titan's", '거인의', 70, 55, 2, 4, 7],
  ['prefix', 'fireResist', 206, 'Iridescent', '오색의', 72, 58, 2, 6, 10],
  ['suffix', 'frw', 208, 'of the Wind', '질풍의', 70, 55, 2, 5, 8],
  ['suffix', 'magicFind', 209, 'of Plenty', '풍요의', 70, 55, 2, 5, 10],
  ['suffix', 'fhr', 210, 'of Recovery', '회복의', 70, 55, 2, 5, 8],
  ['suffix', 'dexterity', 211, 'of the Hawk', '매눈의', 70, 55, 2, 4, 7],
  ['suffix', 'energy', 212, 'of the Sage', '현자의', 70, 55, 2, 4, 7],
];
// 단일 스킬 +1~2 쥬얼: tools/skills.json [스킬 id, 영어 이름, 한글 이름] (원작 스킬 표에서 뽑음). 쥬얼 한 개에 하나만(그룹 300)
const SKILLS = JSON.parse(fs.readFileSync(path.join(__dirname, 'skills.json'), 'utf8'));
const REMOD_LOG = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8').replace(/\r/g, '');
const PATCHES = [
  // 채팅 창(tools/remod-chat.js). 서버 요청 허용 경로에 chat·guild 를 더하고, 이름이 한글이라 쿼리에 % 도 허용
  ['main', '|hc\\/(checkin|act|checkout|deaths|runs|heroes|ladder))(\\?[A-Za-z0-9=&_-]{0,120})?$/;', '|chat|guild|room|mail|id|pos|party|tower|ver|hc\\/(checkin|act|checkout|deaths|runs|heroes|ladder))(\\?[A-Za-z0-9=&_%.-]{0,240})?$/;'],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-chat.js'), 'utf8')],
  // 메인 메뉴 [멀티플레이] 버튼: 대기실 창(remod-chat.js 의 __openLobby)을 연다
  ['screens', 's=[a(`PLAY`,r.heroSelect),', 's=[a(`PLAY`,r.heroSelect),a(`MULTIPLAYER`,()=>globalThis.__openLobby?.()),'],
  ['ko', 'SAVES:`저장 데이터`', 'SAVES:`저장 데이터`,MULTIPLAYER:`멀티플레이`'],
  // 파티 전투(tools/remod-party.js): 몬스터 만들기(Zm)·피해(M)를 내보낸다
  ['saveTransfer', '^', 'globalThis.__mpT=null;'],
  ['saveTransfer', 'function Zm(e,t,n,r,i={}){', 'function Zm(e,t,n,r,i={}){globalThis.__mpT??={spawn:(...a)=>Zm(...a),hit:(...a)=>M(...a)};'],
  // 몬스터 목표: 원래 용병을 노리던 자리(Kpe)에 파티원도 넣는다. 방장 PC 에서 파티원이 더 가까우면 파티원을 쫓음
  ['saveTransfer', 'function Kpe(e,t,n){', 'function Kpe(e,t,n){let G=globalThis.__mpTarget?.(e,t);if(G)return G;'],
  ['saveTransfer', 'e.enemies.push(Ue),Ue}', 'e.enemies.push(Ue),globalThis.__mpBuff?.(Ue),Ue}'],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-party.js'), 'utf8')],
  // 함께 보기(tools/remod-view.js): 같은 방 사람을 같은 마을·던전 막에 그린다
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-view.js'), 'utf8')],
  // 룬워드 툴팁·등록창의 룬 조합('TalIth')을 한글 룬 이름('탈아이드')으로
  ['saveTransfer', '^', "globalThis.__rk=a=>a.map(x=>String(globalThis.__ko?.(x+` Rune`)??x).replace(/^\\d+ /,``).replace(/ 룬$/,``)).join(``);"],
  ['saveTransfer', "c.push({text:`'${u.join(``)}'`", "c.push({text:`'${__rk(u)}'`"],
  ['saveTransfer', "r3(`unique`,`'${e.runes?.join(``)??``}'`)", "r3(`unique`,`'${__rk(e.runes??[])}'`)"],
  ['saveTransfer', "r3(`unique`,`'${e.runes.join(``)}'`)", "r3(`unique`,`'${__rk(e.runes)}'`)"],
  // 리모드 아이템 그림: 같은 종류(무기 종류·부위) 원작 유니크/세트 그림 중 이름으로 고정해서 하나 고른다. 원래는 베이스 그림
  ['saveTransfer', 'let m=e=>({url:tn(e.file),width:e.width,height:e.height}),h=Object.entries(e.uniques)', 'let PK=(L,src,T)=>{let kd=b=>{let q=Bq.get(b);return q?q.kind??q.type:``};for(let[n,b]of L){if(T[n])continue;let c=Object.keys(src).filter(k=>!__rs.has(k)&&kd((GJ.find(g=>g.name===k)??qK.find(g=>g.name===k))?.base)===kd(b));if(!c.length)continue;let x=0;for(let ch of n)x=x*31+ch.charCodeAt(0)>>>0;T[n]=src[c[x%c.length]]}};PK(__reim.drops,e.uniques,e.uniques),e.sets&&PK(__reim.setDrops.map(([a,,b])=>[a,b]),{...e.sets,...e.uniques},e.sets);let m=e=>({url:tn(e.file),width:e.width,height:e.height}),h=Object.entries(e.uniques)'],
  // 메인 화면 로고: SURVIVORS 아래 오른쪽에 불꽃색 REMOD 글자(살짝 일렁임). 창 제목도 D2 Survivors REMOD
  ['screens', 'e.restore(),e.drawImage(o,s,c)}function Xt(', 'e.restore(),e.drawImage(o,s,c);{let x=It.x+168,y=It.y+30,f=.85+.15*Math.sin(t*3.1)*Math.sin(t*1.3);e.save(),e.translate(x,y),e.rotate(-.12),x=0,y=0,e.font=`bold 24px Cinzel, serif`,e.textAlign=`right`,e.textBaseline=`middle`,e.lineJoin=`round`;let g=e.createLinearGradient(0,y-15,0,y+15);g.addColorStop(0,`#fff2b0`),g.addColorStop(.45,`#ffb030`),g.addColorStop(1,`#b02a00`),e.shadowColor=`rgba(255,110,0,${.9*f})`,e.shadowBlur=18*f,e.lineWidth=5,e.strokeStyle=`#1a0800`,e.strokeText(`REMOD`,x,y),e.fillStyle=g,e.fillText(`REMOD`,x,y),e.restore()}}function Xt('],
  // 메인 메뉴 버튼을 18 내려서 REMOD 글자와 안 겹치게
  ['screens', 'd=u.map((e,t)=>290+t*40+', 'd=u.map((e,t)=>308+t*40+'],
  // 리모드는 따로 된 게임: 환경변수 없이 켜도 원본 세이브·공식 서버를 쓰지 않게 기본값을 리모드 것으로
  ['main', '^', 'process.env.D2S_USER_DATA ||= require("node:path").join(process.env.APPDATA || "", "D2S-Remod"); process.env.D2S_LEADERBOARD_URL ||= "http://127.0.0.1:8520";'],
  ['main', 'title: "D2 Survivors"', 'title: "D2 Survivors REMOD"'],
  ['Game', '^', 'setInterval(()=>{document.title!==`D2 Survivors REMOD`&&(document.title=`D2 Survivors REMOD`)},1e3);'],
  // 리모드 전용 쥬얼 옵션을 원작 쥬얼 옵션 표(CJe) 끝에 더한다. 끝에는 직업별 스킬 탭 +1 (거대 부적 스킬러와 같은 이름·방식, 매직 전용, 레벨 60). 오색의(Iridescent)는 모든 저항(원작 Shimmering 과 같은 방식)
  ['saveTransfer', '...wJe()]}', '...wJe(),' + JEWELS.map(([k, s, g, n, , l, r, f, a, b]) => `...q(\`${k}\`,\`${s}\`,${g},[[${JSON.stringify(n)},${l},${r},${f},${a},${b},e]])${n === 'Iridescent' ? '.map(e=>TJ(e,{alike:[`lightningResist`,`coldResist`,`poisonResist`]}))' : ''}`).join(',') + ',...Object.keys(Ni).flatMap(e=>zi.map(t=>({name:Ni[e].trees[t-1].affixes[0],kind:`prefix`,stat:Fi(e,t),min:1,max:1,level:0,rows:dJ(`jewl`),d2:{level:60,req:50,frequency:1,group:213,skiller:!0,...K}}))),...' + JSON.stringify(SKILLS.map(([id, n]) => [id, n])) + '.map(([i,n])=>({name:`of ${n}`,kind:`suffix`,stat:`skill:${i}`,min:1,max:2,level:0,rows:dJ(`jewl`),d2:{level:65,req:50,frequency:.05,group:300,...K}}))]}'],
  // 쥬얼 수치 검사(bqe 최대값 표)에 리모드 쥬얼 최대값을 더한다. 없으면 "인정 안 됨: 범위를 넘는 수치"
  ['saveTransfer', 'let n=bqe[t][e];', `let n=Math.max(bqe[t][e]??-1/0,${JSON.stringify(Object.fromEntries([...JEWELS.map(([, s, , , , , , , , b]) => [s, b]), ...Array.from({ length: 21 }, (_, i) => [`skilltab${i}`, 1]), ...SKILLS.map(([id]) => [`skill:${id}`, 2])]))}[e]??-1/0);n===-1/0&&(n=void 0);`],
  // 쥬얼 옵션 조합 검사표($K)에 리모드 쥬얼 옵션과 스킬 탭 +1 을 더한다(매직·레어 둘 다, 스킬 탭은 매직만). 없으면 "인정 안 됨: 붙을 수 없는 속성"
  ['saveTransfer', 'function tq(e){', 'var __kx=0;function tq(e){if(e.r===`u`)return null;if(!__kx){__kx=1;for(let[k,s]of ' + JSON.stringify(JEWELS.map(([k, s, , n]) => [k, n === 'Iridescent' ? 'coldResist+fireResist+lightningResist+poisonResist' : s])) + ')for(let r of[`magic`,`rare`])$K[r][k].includes(s)||$K[r][k].push(s);for(let i=0;i<21;i++)$K.magic.prefix.push(`skilltab${i}`);for(let i of ' + JSON.stringify(SKILLS.map(([id]) => id)) + ')for(let r of[`magic`,`rare`])$K[r].suffix.push(`skill:${i}`)}'],
  ['ko', '"of Envy":`시샘의`', '"of Envy":`시샘의`,' + [...JEWELS.map(([, , , n, ko]) => `${JSON.stringify(n)}:\`${ko}\``), ...SKILLS.map(([, n, ko]) => `${JSON.stringify('of ' + n)}:\`${ko}의\``)].join(',')],
  // Reimagined 새 유니크: 옵션 표(I.uniques)에 더하고 드롭 목록(GJ)에 reim 표시를 달아 넣는다. 원작 유니크는 그대로
  ['saveTransfer', '^', `globalThis.__reim=${JSON.stringify({ uniques: REIM.uniques, drops: REIM.drops, setItems: REIM.setItems, sets: REIM.sets, setDrops: REIM.setDrops, runewords: Object.fromEntries(Object.entries(REIM.runewords).map(([k, v]) => [k, { name: v.name, props: v.props }])), rw: Object.values(REIM.runewords).map((v) => [v.name, v.runes, v.types.map((t) => (t === 'shie' ? 'shld' : t))]) })};`],
  ['saveTransfer', 'J(`Annihilus`,`Small Charm`,110)]', 'J(`Annihilus`,`Small Charm`,110),...__reim.drops.map(([e,t,n])=>({...J(e,t,n),reim:!0}))]'],
  // 리모드 세트 아이템은 세트 목록(qK)에, 리모드 룬워드는 조합표(YK)에 더한다
  ['saveTransfer', "qK=[R(`Civerb's Ward`", "qK=[...__reim.setDrops.map(([e,t,n,r])=>R(e,t,n,r)),R(`Civerb's Ward`"],
  ['saveTransfer', "YK=[z(`Ancients' Pledge`", "YK=[...__reim.rw.map(([e,t,n])=>z(e,t,n)),z(`Ancients' Pledge`"],
  ['saveTransfer', 'function HKe(e){I=', 'function HKe(e){e?.uniques&&(e={...e,uniques:{...__reim.uniques,...e.uniques},setItems:{...__reim.setItems,...e.setItems},sets:{...__reim.sets,...e.sets},...e.runewords&&{runewords:{...__reim.runewords,...e.runewords}}});I='],
  // 고유 등록창: 원작과 Reimagined 를 따로 보여준다(창고 왼쪽 버튼, globalThis.__reimTab). 아이템 찾기 표(M1e)는 둘 다 담는다
  ['saveTransfer', 'M1e=new Map(D2.map(e=>[S2(e),e]));', 'M1e=new Map(D2.map(e=>[S2(e),e]));var __rs=new Set([...__reim.drops.map(e=>e[0]),...__reim.setDrops.map(e=>e[0]),...__reim.rw.map(e=>e[0])]),__cut=r=>E2.map(e=>({...e,uniques:e.uniques.filter(u=>__rs.has(u.name)===r)})).filter(e=>e.uniques.length),__E2v=__cut(!1),__E2r=__cut(!0);E2=__E2v;D2=E2.flatMap(e=>e.uniques);'],
  // 창고 위 등록 개수도 지금 보는 쪽(원작/Reimagined) 기준
  ['saveTransfer', '[r3(`stash-page`,f4(t.uniques.size))]', '[r3(`stash-page`,__kc(t.uniques))]'],
  ['saveTransfer', 'this.canvas(f4(t.uniques.size),', 'this.canvas(__kc(t.uniques),'],
  ['saveTransfer', 'function f4(e,t=D2.length){', 'function __kc(k){let a=(globalThis.__reimTab?__E2r:__E2v).flatMap(e=>e.uniques);return f4(a.filter(e=>k.has(S2(e))).length,a.length)}function f4(e,t=D2.length){'],
  ['saveTransfer', 'let d=C4.query.trim()!==``,f=E2.find(', 'E2=globalThis.__reimTab?__E2r:__E2v,D2=E2.flatMap(e=>e.uniques);let d=C4.query.trim()!==``,f=E2.find('],
  ['ko', '"Larzuk\'s Essence":`라주크의 정수`', '"Larzuk\'s Essence":`라주크의 정수`,' + Object.entries(REIM.ko).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',')],
  // 기존 패치의 순위표 차단을 푼다: Remod 는 기록을 내 서버로 보낸다
  ['main', '    if (method === "POST" && path !== "/forge" && path !== "/hc/forge") return { status: 200, body: "{}", retryAfter: null };', ''],
  ['Game', 'try{localStorage.removeItem(`d2s:leaderboard-queue`)}catch{};', ''],
  // 대장간 강화 확률 표시: 내 서버 확률(server.cjs TEMPER_CHANCE)과 맞춘다
  // ponytail: 서버 확률을 바꾸면 여기도 손으로 바꿀 것
  ['saveTransfer', 'function Eqe(e){return e<=0?1:1/(1+e/4)}', 'function Eqe(e){return 1}'],
  // 강화로 새로 붙은 옵션(forge.x)을 아이템 스탯 뒤에 붙인다. 툴팁과 실제 능력치 둘 다 이 함수(yq)를 거친다
  ['saveTransfer', 'let n=dq(e.stats,!0,t)', 'let n=[...dq(e.stats,!0,t),...(t.x??[])]'],
  // 강화 상태 검사(hq)가 새 옵션 x 와 횟수 키 x<n> 을 받아들이게 한다
  ['saveTransfer', 'let{t,up:n,hf:r,h:i,...a}=e;', 'let{t,up:n,hf:r,h:i,x:X,...a}=e;'],
  ['saveTransfer', 'if(!/^[sm]\\d{1,3}$/.test(t)||', 'if(!/^[smx]\\d{1,3}$/.test(t)||'],
  ['saveTransfer', 'o.h=i}return o}function gq', 'o.h=i}if(Array.isArray(X)&&X.length<=64&&X.every(e=>typeof e?.stat==`string`&&Number.isInteger(e.value)))o.x=X;return o}function gq'],
  // 룬 33개를 겹치는 재료(essence)로 등록. 이름 "El Rune" 등, 레벨은 원작 룬 표(JK)
  ['saveTransfer', 'Nq(Rq,`essence`,B(`bet`,`bete`,1)),', 'Nq(Rq,`essence`,B(`bet`,`bete`,1)),...' + RUNES + '.map(([e,t],n)=>Nq(`${e} Rune`,`essence`,B(`r${String(n+1).padStart(2,`0`)}`,`rune`,t))),'],
  // 룬 그림: 인벤은 원작 룬 아이콘, 바닥은 라주크의 정수 그림을 빌려 씀
  ['saveTransfer', 'function LZe(e,t){if(!e)return null;', 'function LZe(e,t){if(!e)return null;if(/ Rune$/.test(t.base))return e.runeIcons?.[t.base.slice(0,-5)]??null;'],
  ['saveTransfer', 'function NZe(e,t){if(!e)return null;', 'function NZe(e,t){if(!e)return null;if(/ Rune$/.test(t.base))return e.flippies[`Larzuk\'s Essence`]??null;'],
  // 룬 드롭: 아이템이 떨어질 때 4% 확률로 룬 하나 더. 아이템 레벨 이하 룬 중 높은 룬일수록 드묾(한 단계마다 0.75배)
  ['saveTransfer', 'function wve(e,t,n,r,i,a=Math.random){', 'function __rn(e){let t=' + RUNES + '.filter(([,t])=>t<=Math.max(11,e)),n=t.map((e,t)=>.75**t),r=Math.random()*n.reduce((e,t)=>e+t,0);for(let e=0;e<t.length;e++)if((r-=n[e])<0)return`${t[e][0]} Rune`;return`El Rune`}function wve(e,t,n,r,i,a=Math.random){'],
  ['saveTransfer', 'e.terror&&Math.random()<.0018181818181818182&&K_(e,cX(l.level,1,Rq),t,n,!1,`essence`),l}', 'e.terror&&Math.random()<.0018181818181818182&&K_(e,cX(l.level,1,Rq),t,n,!1,`essence`),Math.random()<.04&&K_(e,cX(l.level,1,__rn(s)),t,n,!1,`essence`),l}'],
  // 겹치기 최대 99 → 9999 (불러오기, 겹치기 합치기, 손에 든 것 내려놓기)
  ['saveTransfer', '(se.count=Math.min(v,99))', '(se.count=Math.min(v,9999))'],
  ['saveTransfer', '||NZ(r)>=99)continue;let e=Math.min(n,99-NZ(r))', '||NZ(r)>=9999)continue;let e=Math.min(n,9999-NZ(r))'],
  ['Game', '||nr(n)>=99?!1:', '||nr(n)>=9999?!1:'],
  // 모든 아이템 1칸. 부적(참·횃불·어나이얼러스)만 원래 크기
  ['saveTransfer', 'function VY(e){return WY(e)?UY.size:Yg(e)?Ihe(e):Bq.get(e.base)?.size??[1,1]}', 'function VY(e){return e.type===`charm`&&(globalThis.__cg||Object.values(globalThis.__gm?.save?.charmsByClass??{}).some(a=>a.includes(e)))?Bq.get(e.base)?.size??[1,1]:[1,1]}'],
  // 참은 참 인벤(MQ)에 넣을 자리를 찾을 때·놓을 때만 원래 크기. 인벤·창고에서는 1칸
  ['saveTransfer', 'function BQ(e,t,n){return XQ(GQ(e,n,t),t)}', 'function BQ(e,t,n){let s=globalThis.__cg;globalThis.__cg=n===MQ;try{return XQ(GQ(e,n,t),t)}finally{globalThis.__cg=s}}'],
  ['saveTransfer', 'function VQ(e,t,n,r){let[i,a]=VY(t);', 'function VQ(e,t,n,r){let s=globalThis.__cg;globalThis.__cg=r===MQ;try{return __VQ(e,t,n,r)}finally{globalThis.__cg=s}}function __VQ(e,t,n,r){let[i,a]=VY(t);'],
  // 아이템 그림을 차지하는 칸 크기(한 칸 28px)에 맞게 줄인다. 큰 갑옷도 1칸 안에 들어간다
  ['saveTransfer', 't&&b2e(a,t,e.base),', 't&&b2e(a,t,e.base,VY(e)),'],
  ['saveTransfer', 'function b2e(e,t,n){let r=document.createElement(`img`);r.src=t.url,r.width=t.width,r.height=t.height,', 'function b2e(e,t,n,S){let r=document.createElement(`img`),k=S?Math.min(1,S[0]*28/t.width,S[1]*28/t.height):1;r.src=t.url,r.width=Math.round(t.width*k),r.height=Math.round(t.height*k),'],
  // ESC 옵션 > 리모드 설정: 메뉴 항목, 창(remod-options.js), 저장 통로(preload → main → D2S-Remod/remod-options.json)
  ['screens', '{label:`CONTROLLER`,controller:!0},', '{label:`CONTROLLER`,controller:!0},{label:`리모드 설정`,remod:!0},'],
  ['screens', 'i.keyboard&&l.show(', 'i.remod&&globalThis.__remodOptions?.(),i.keyboard&&l.show('],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-options.js'), 'utf8')],
  ['preload', '  import_electron.contextBridge.exposeInMainWorld("d2update", api);', '  import_electron.contextBridge.exposeInMainWorld("d2update", api);\n  import_electron.contextBridge.exposeInMainWorld("d2remod", { get: () => import_electron.ipcRenderer.invoke("remod:get"), set: (o) => import_electron.ipcRenderer.invoke("remod:set", o) });'],
  ['main', 'import_electron2.ipcMain.handle("app:leaderboard"', 'const remodFile = require("node:path").join(process.resourcesPath, "..", "..", "remod-options.json");\n  import_electron2.ipcMain.handle("remod:get", () => { try { return JSON.parse(require("node:fs").readFileSync(remodFile, "utf8")); } catch { return null; } });\n  import_electron2.ipcMain.handle("remod:set", (_e, o) => { if (typeof o !== "object" || !o) return false; require("node:fs").writeFileSync(remodFile, JSON.stringify(o, null, 1)); return true; });\n  import_electron2.ipcMain.handle("app:leaderboard"'],
  // 손에 든 아이템도 칸 크기에 맞춰 줄인다
  ['saveTransfer', 'b2e(a,o,e.held.base);let n=a.querySelector(`img`);n&&(n.width=o.width*i/t,n.height=o.height*i/t)', 'b2e(a,o,e.held.base,VY(e.held));let n=a.querySelector(`img`);n&&(n.width=n.width*i/t,n.height=n.height*i/t)'],
  // (참 크기는 위 VY 패치 참고) 1칸 아이템에는 소켓(박힌 룬·주얼) 그림을 겹쳐 그리지 않는다. 원래 크기 기준이라 칸 밖으로 튀어나옴. 툴팁에는 그대로 나옴
  ['saveTransfer', 'function y2e(e,t){let n=BZ(t);', 'function y2e(e,t){if(t.type!==`charm`)return;let n=BZ(t);'],
  // 줍는 룬·정수·열쇠·장기는 재료 창고 고정 칸에 먼저(칸마다 9,999개까지, 넘으면 원래대로). F2 판매로 정한 건 판매
  // 창고로 바로 들어가는 정수·룬(F2 창고 설정, 인벤이 차서 창고로, Ctrl+클릭)도 같은 묶음에 먼저 합친다. 원래는 1개가 1칸씩 차지
  ['Game', 'if(v===3)for(let k of Tr){let a=Kf(this.save,this.world.player.cls,k),p=Cn(a,e,Ln);', 'if(v!==2){let K=da(e)?e.base:cc(e)&&globalThis.__qk?.[e.base]?`q:`+__qk[e.base]:null,M=this.save.remodMats??={};if(K&&(M[K]??0)<9999){M[K]=Math.min(9999,(M[K]??0)+(e.count??1));return L(this.save),globalThis.__st=1,!0}}if(v===3)for(let k of Tr){let a=Kf(this.save,this.world.player.cls,k);if(da(e)&&Cc(a,e)===0)return L(this.save),globalThis.__st=1,!0;let p=Cn(a,e,Ln);'],
  ['Game', 'if(globalThis.__on(`overflow`))for(let k of Tr){let a=Kf(this.save,this.world.player.cls,k),p=Cn(a,e,Ln);', 'if(globalThis.__on(`overflow`))for(let k of Tr){let a=Kf(this.save,this.world.player.cls,k);if(da(e)&&Cc(a,e)===0)return L(this.save),globalThis.__st=1,!0;let p=Cn(a,e,Ln);'],
  ['Game', 'for(let k of Tr){let b=Kf(i,e,k),p=Cn(b,n,Ln);', 'for(let k of Tr){let b=Kf(i,e,k);if(da(n)){let q=-1;r.change(()=>{q=Cc(b,n);q===0&&T(a,n)});if(q===0)return this.moved(n),t()}let p=Cn(b,n,Ln);'],
  // 창고 정리 버튼 (수집 왼쪽): 지금 탭의 겹치는 재료를 합치고 종류·등급·이름 순으로 빈칸 없이 다시 놓는다
  ['Game', 'openStashTab:e=>{this.stashTab=e,t()},', 'openStashTab:e=>{this.stashTab=e,t()},sortTab:()=>{let k=this.openStashTab(e);if(k===`uniques`)return;let b=Kf(i,e,k),R=[`weapon`,`shield`,`head`,`body`,`gloves`,`belt`,`boots`,`amulet`,`ring`,`quiver`,`charm`,`jewel`,`quest`,`essence`],Q=[`unique`,`set`,`runeword`,`rare`,`magic`,`normal`],o=x=>(R.indexOf(x)+R.length+1)%(R.length+1);r.change(()=>{let L=b.splice(0).sort((x,y)=>o(x.type)-o(y.type)||Q.indexOf(x.rarity)-Q.indexOf(y.rarity)||String(x.name).localeCompare(String(y.name)));for(let x of L){delete x.at;if(da(x)&&Cc(b,x)===0)continue;let p=Cn(b,x,Ln);p?N(b,x,p):b.push(x)}}),t()},'],
  ['saveTransfer', 'e.stashTabs$?e.stashTabs$(l,o,n.collectAll):', 'e.stashTabs$?e.stashTabs$(l,o,n.collectAll,n.sortTab):'],
  ['saveTransfer', 'stashTabs$:(t,n,r)=>e.stashTabs(this.stashTabs,t,n,r)', 'stashTabs$:(t,n,r,S)=>e.stashTabs(this.stashTabs,t,n,r,S)'],
  ['saveTransfer', 'stashTabs(e,t,n,r){', 'stashTabs(e,t,n,r,SR){'],
  ['saveTransfer', 'y6(u,e6e),e.replaceChildren(...a,s,...l?[u,l]:[])}', 'y6(u,e6e);let SB=SR&&t.open!==`uniques`?this.textButton([16,K3,46,32],`정리`,()=>[{text:`정리`,color:`white`},{text:`겹치는 재료를 합치고 빈칸 없이 다시 놓습니다`,color:`grey`}],SR):null,MB=t.open===`uniques`?null:this.textButton([64,K3,46,32],`재료`,()=>[{text:`재료 창고`,color:`white`},{text:`룬·정수를 종류별로 보관합니다`,color:`grey`}],()=>globalThis.__remodMats?.());SB?.classList.add(`stash-collect`);MB?.classList.add(`stash-collect`);e.replaceChildren(...a,s,...l?[u,l]:[],...SB?[SB]:[],...MB?[MB]:[])}'],
  // F2 보관 설정: 룬(c:rune), 일반 아이템은 부위·소켓 개수별(n:<부위>:<소켓>). 부위 w1 한손 무기, w2 양손 무기, h 투구, b 갑옷, s 방패, o 장갑·벨트·신발
  // 기본: 0소켓 판매(2), 1소켓 이상 인벤(1). 원래는 룬이 라주크의 정수 설정을 따라 팔렸고 일반 아이템은 F2 에 없어 다 팔렸음
  ['Game', 'globalThis.__ksk=e=>{let r=e.rarity;return ', 'globalThis.__ksk=e=>{let r=e.rarity;return e.type===`essence`&&/ Rune$/.test(e.base)?`c:rune`:r===`normal`&&[`weapon`,`shield`,`head`,`body`,`gloves`,`belt`,`boots`].includes(e.type)?`n:`+(e.type===`weapon`?(/2$/.test(globalThis.__kd?.(e)??``)?`w2`:`w1`):{head:`h`,body:`b`,shield:`s`}[e.type]??`o`)+`:`+(e.sockets??0):'],
  ['Game', '"c:essence":1,"c:bet":1}', '"c:essence":1,"c:bet":1,"c:rune":1,...Object.fromEntries([`w1`,`w2`,`h`,`b`,`s`,`o`].flatMap(g=>[0,1,2,3,4,5,6].map(n=>[`n:${g}:${n}`,n?1:2])))}'],
  ['Game', '${row(`c:bet`,`불타는 공포의 정수 (찰시 대장간 재료, 99개까지 겹침)`,`#fc6`)}', '${row(`c:bet`,`불타는 공포의 정수 (찰시 대장간 재료, 99개까지 겹침)`,`#fc6`)}${row(`c:rune`,`룬 (엘~조드)`,`#fa5`)}${(()=>{let G=[[`w1`,`한손 무기`],[`w2`,`양손 무기`],[`h`,`투구`],[`b`,`갑옷`],[`s`,`방패`],[`o`,`장갑·벨트·신발`]],S=[0,1,2,3,4,5,6];return`<div style="margin:6px 0 2px;color:#ccc">일반 아이템 (부위 · 소켓 개수별)</div><table style="border-collapse:collapse;font-size:12px"><tr><td></td>${S.map(n=>`<td style="padding:0 4px;color:#999">${n}소켓</td>`).join(``)}</tr>${G.map(([g,t])=>`<tr><td style="padding-right:6px;color:#ccc">${t}</td>${S.map(n=>{let k=`n:${g}:${n}`,v=__ks[k]??__ksd[k];return`<td><select data-k="${k}" style="color:${cl[v]}">${O.map(([a,b])=>`<option value="${a}"${a===v?` selected`:``}>${b}</option>`).join(``)}</select></td>`}).join(``)}</tr>`).join(``)}</table>`})()}'],
  ['Game', 'add(`기타`,`불타는 공포의 정수`,``,`c:bet`,1,!1)', 'add(`기타`,`불타는 공포의 정수`,``,`c:bet`,1,!1),add(`기타`,`룬`,``,`c:rune`,1,!1)'],
  // 룬 한글 이름: "01 엘 룬" ~ "33 조드 룬"
  ['ko', '"Larzuk\'s Essence":`라주크의 정수`', '"Larzuk\'s Essence":`라주크의 정수`,"El Rune":`01 엘 룬`,"Eld Rune":`02 엘드 룬`,"Tir Rune":`03 티르 룬`,"Nef Rune":`04 네프 룬`,"Eth Rune":`05 에드 룬`,"Ith Rune":`06 아이드 룬`,"Tal Rune":`07 탈 룬`,"Ral Rune":`08 랄 룬`,"Ort Rune":`09 오르트 룬`,"Thul Rune":`10 주울 룬`,"Amn Rune":`11 앰 룬`,"Sol Rune":`12 솔 룬`,"Shael Rune":`13 샤엘 룬`,"Dol Rune":`14 돌 룬`,"Hel Rune":`15 헬 룬`,"Io Rune":`16 이오 룬`,"Lum Rune":`17 룸 룬`,"Ko Rune":`18 코 룬`,"Fal Rune":`19 팔 룬`,"Lem Rune":`20 렘 룬`,"Pul Rune":`21 풀 룬`,"Um Rune":`22 우움 룬`,"Mal Rune":`23 말 룬`,"Ist Rune":`24 이스트 룬`,"Gul Rune":`25 굴 룬`,"Vex Rune":`26 벡스 룬`,"Ohm Rune":`27 오움 룬`,"Lo Rune":`28 로 룬`,"Sur Rune":`29 수르 룬`,"Ber Rune":`30 베르 룬`,"Jah Rune":`31 자 룬`,"Cham Rune":`32 참 룬`,"Zod Rune":`33 조드 룬`'],
  // 일반(흰색) 베이스: 방어력 최소~최대 굴림, 30% 확률로 소켓 1~최대, 5% 에테리얼(방어력 1.5배, 무기는 피해 +50%)
  // roll(재현용 씨앗)은 지운다. 남기면 불러올 때 원작이 소켓을 씨앗 값으로 되돌릴 수 있음
  ['saveTransfer', 'function cY(e,t,n,r,i,a=2){', 'function __nb(x,l){if(x.rarity!==`normal`||![`weapon`,`shield`,`head`,`body`,`gloves`,`belt`,`boots`].includes(x.type))return x;delete x.roll;let b=sK(x.base),R=(a,c)=>a+Math.floor(Math.random()*(c-a+1)),d=b.defense;d&&(x.defense=R(d[0],d[1]));let m=fK(x.base,l);m>0&&Math.random()<.3&&(x.sockets=R(1,m));if(!b.noDurability&&Math.random()<.05){x.ethereal=!0;x.defense&&(x.defense=Math.floor(x.defense*1.5));x.type===`weapon`&&x.mods.push({stat:`enhancedDamage`,value:50})}return x}function cY(e,t,n,r,i,a=2){'],
  // 몬스터가 아이템을 떨어뜨릴 때 3% 확률로 일반 베이스 하나 더 (원작은 몬스터 드롭 최소 등급이 매직이라 흰색이 안 나옴)
  ['saveTransfer', 'return K_(e,l,t,n,!1,r.source),e.terror&&', 'return K_(e,l,t,n,!1,r.source),Math.random()<.03&&K_(e,__nb(sY(ZZ(s,c.cls,Xq),`normal`,l.level,s,c.cls),s),t,n,!1,`base`),e.terror&&'],
  // 불러오기 검사: 에테리얼을 룬워드뿐 아니라 일반 아이템에도 허용
  ['saveTransfer', 'd!==void 0&&(d!==!0||i!==`runeword`)', 'd!==void 0&&(d!==!0||i!==`runeword`&&i!==`normal`)'],
  // 라주크의 정수: 일반 아이템은 소켓 1~최대 무작위 (원작은 항상 최대). 매직·유니크는 원작 그대로
  ['saveTransfer', 'function $Xe(e,t=Math.random){let n=IZ(e);return e.rarity===`normal`?n:', 'function $Xe(e,t=Math.random){let n=IZ(e);return e.rarity===`normal`?1+Math.floor(t()*n):'],
  // 기존 패치 F5 정리도 아이템 칸 크기를 원작 함수(VY)로 계산하게 한다 (원래는 베이스 원래 크기를 직접 읽음)
  ['saveTransfer', '__bsz=e=>Bq.get(e.base)?.size', '__bsz=e=>VY(e)'],
  // 장갑·벨트·신발도 소켓 최대 2개 (원작 D2 는 0). 룬워드 조합표에 이 부위가 없어 룬·주얼만 박힘
  ['saveTransfer', 'function fK(e,t){let n=I?.bases[e]?.sockets;return n?n[t<=25?0:t<=40?1:2]:0}', 'function fK(e,t){let n=I?.bases[e]?.sockets;return n?n[t<=25?0:t<=40?1:2]:[`gloves`,`belt`,`boots`].includes(Bq.get(e)?.type)?2:0}'],
  // 룬 박기: 주얼처럼 빈 소켓에 박는다. 묶음이면 하나만 쓰고 나머지는 손에 남김(반환값 2). 룬 효과는 원작 룬 표(부위별)에서 계산
  // 일반 아이템 소켓이 룬으로 다 차고 순서·베이스가 룬워드 조합과 맞으면 그 자리에서 룬워드로 바뀐다
  ['saveTransfer', 'function eZe(e,t){if(!kZ(t)||!RZ(e))return!1;let{at:n,...r}=t;return e.socketed=[...e.socketed??[],r],!0}', 'function eZe(e,t){let R=/ Rune$/.test(t.base);if(!(kZ(t)||R)||!RZ(e)||R&&e.rarity===`runeword`)return!1;let{at:n,count:C,...r}=t;R&&(r.mods=BK(CK(I?.runes?.[t.base.slice(0,-5)]?.[dZ(e)]??[],r.level??1)));e.socketed=[...e.socketed??[],r];if(R&&e.rarity===`normal`&&e.socketed.length===e.sockets&&e.socketed.every(x=>/ Rune$/.test(x.base))){let w=e.socketed.map(x=>x.base.slice(0,-5)).join(),d=YK.find(x=>x.runes.join()===w),b=Bq.get(e.base);if(d&&b&&uZ(d,b)&&uK(d.name)){let z=hZ(d,b,!!e.ethereal,e.level,void 0),id=e.id;for(let k of Object.keys(e))delete e[k];Object.assign(e,z,{id})}}return R&&C>1?(t.count=C-1,2):!0}'],
  // 시험용: CDP 에서 룬 박기·룬워드 완성을 직접 불러 보기 위해 내보냄
  ['saveTransfer', 'function $Xe(e,t=Math.random){', 'globalThis.__remodT={eZe:(...a)=>eZe(...a),Bq:()=>Bq,OZ:(...a)=>OZ(...a),fK:(...a)=>fK(...a),eZ:(...a)=>eZ(...a),GJ:()=>GJ,CJ:()=>CJ,jw:(...a)=>iYe(...a),roll:(b,...a)=>cY(Bq.get(b),...a),rZ:(...a)=>rZ(...a),qK:()=>qK};function $Xe(e,t=Math.random){'],
  ['saveTransfer', 'function OZ(e){return(e.socketed??[]).filter(kZ).flatMap(', 'function OZ(e){return(e.socketed??[]).filter(e=>kZ(e)||/ Rune$/.test(e.base)).flatMap('],
  ['Game', 'if(!da(o))return!1;if(da(n))return!$a(n,o)', 'if(/ Rune$/.test(o.base)&&Fp(n)){let k;return r(()=>{k=La(n,o),k===!0&&delete a.cursor}),L(a),A(n.base),!!k}if(!da(o))return!1;if(da(n))return!$a(n,o)'],
  // 재료 창고: save.remodMats = {베이스 이름: 개수}. 창(remod-mats.js)과 넣기·꺼내기 동작
  // 재료 창고에 받는 퀘스트 아이템: 원작 코드 → 원작 이름(qg 키)
  ['Game', '^', 'globalThis.__qk={std:`standard`,toa:`token`};'],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-mats.js'), 'utf8')],
  // H 키 룬워드 도움말(tools/remod-rwhelp.js)
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-rwhelp.js'), 'utf8')],
  // 공통 창 스킨(tools/remod-skin.js)
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-skin.js'), 'utf8')],
  // 공포의 지도(tools/remod-map.js)
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-map.js'), 'utf8')],
  // 용병 아이템(tools/remod-merc.js)
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-merc.js'), 'utf8')],
  // 보스 탑(tools/remod-tower.js)
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-tower.js'), 'utf8')],
  // 리모드 안내서(tools/remod-guide.js)
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-guide.js'), 'utf8')],
  // 강제 업데이트(tools/remod-update.js)
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-update.js'), 'utf8')],
  // 숙제·업적·칭호(tools/remod-quest.js)
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-quest.js'), 'utf8')],
  // 호라드릭 큐브 창(tools/remod-cube.js)
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-cube.js'), 'utf8')],
  ['Game', 'keepHeld:l,collectAll:', '__mats:(globalThis.__matsOut=(b,c)=>{let m=i.remodMats;if(!m?.[b])return;if(b.startsWith(`q:`)){let v=this.inventoryOf(e),q=0;r.change(()=>{for(;q<Math.min(c,m[b]);q++){let x=bp(b.slice(2)),p=Cn(v,x,O);if(!p)break;N(v,x,p)}m[b]-=q;m[b]<=0&&delete m[b]});q>0||this.hud.refuse(`Your inventory is full`);return t()}let q=Math.min(c,m[b],9999),x=Mr(1,q,b),v=this.inventoryOf(e);r.change(()=>{let w=Cc(v,x);if(w>0){let p=Cn(v,x,O);p?N(v,x,p):q-=w}m[b]-=q;m[b]<=0&&delete m[b]});q>0||this.hud.refuse(`Your inventory is full`);t()},globalThis.__matsAllIn=()=>{let v=this.inventoryOf(e);r.change(()=>{for(let x of[...v]){let m=i.remodMats??={},k=da(x)?x.base:cc(x)&&globalThis.__qk?.[x.base]?`q:`+__qk[x.base]:null;k&&(m[k]=(m[k]??0)+(x.count??1),T(v,x))}});t()},0),keepHeld:l,collectAll:'],
  // 창고를 연 채 인벤·창고의 재료를 우클릭하면 재료 창고로 들어간다 (라주크의 정수는 원래대로 우클릭 = 쓰기)
  ['Game', 'if(da(s))return Ta(s)?this.liftToUse(e,s,n,t):void 0;', 'if(cc(s)&&globalThis.__qk?.[s.base]&&n){let k=fc(i,e,s),L=k?Kf(i,e,k):this.inventoryOf(e);return r.change(()=>{let m=i.remodMats??={},q=`q:`+__qk[s.base];m[q]=(m[q]??0)+1;T(L,s)}),A(s.base),t()}if(da(s)){if(Ta(s))return this.liftToUse(e,s,n,t);if(!n)return;let k=fc(i,e,s),L=k?Kf(i,e,k):this.inventoryOf(e);return r.change(()=>{let m=i.remodMats??={};m[s.base]=(m[s.base]??0)+(s.count??1);T(L,s)}),A(s.base),t()}'],
  // 획득 목록(기존 패치)에서도 룬 이름을 한글로
  ['Game', 'globalThis.__lg=(t,k,s,it)=>{', 'globalThis.__lg=(t,k,s,it)=>{t=t===void 0?t:String(t).replace(/\\b[A-Z][a-z]+ Rune\\b/g,m=>globalThis.__ko?.(m)??m);'],
  // 공유 창고 9페이지. 위쪽 탭은 개인·공유(지금 페이지)·고유 셋만, 창고 오른쪽에 페이지 목록(이름 표시, 클릭 이동, 우클릭 이름 바꾸기)
  // 이름은 save.remodTabNames, 저장·불러오기는 원작이 공유 탭 목록(PQ)을 따라 처리
  ['saveTransfer', 'PQ=[`shared1`,`shared2`,`shared3`],', 'PQ=[`shared1`,`shared2`,`shared3`,`shared4`,`shared5`,`shared6`,`shared7`,`shared8`,`shared9`],'],
  ['saveTransfer', 'd4={personal:`Personal`,shared1:`Shared`,shared2:`Shared`,shared3:`Shared`,', 'd4={personal:`Personal`,shared1:`Shared`,shared2:`Shared`,shared3:`Shared`,shared4:`Shared`,shared5:`Shared`,shared6:`Shared`,shared7:`Shared`,shared8:`Shared`,shared9:`Shared`,'],
  ['saveTransfer', 'stashTabs(e,t,n,r,SR){let i=K3e,a=LQ.map((e,r)=>{', 'stashTabs(e,t,n,r,SR){let i=K3e,PG=globalThis.__gm?.save,PN=k=>PG?.remodTabNames?.[k]||`공유 ${k.slice(6)}`;/^shared/.test(t.open)&&(globalThis.__lastShared=t.open);let a=[`personal`,globalThis.__lastShared??`shared1`,`uniques`].map((e,r)=>{'],
  ['saveTransfer', 'a.dataset.stashTab=e,y6(a,[i[r].x,q3e,i[r].width,J3e]);let s=d4[e],', 'a.dataset.stashTab=e,y6(a,[i[r].x,q3e,i[r].width,J3e]);let s=/^shared/.test(e)?PN(e):d4[e],'],
  ['saveTransfer', 'y6(u,e6e);let SB=', 'y6(u,e6e);let PL=document.createElement(`div`);PL.style.cssText=`position:absolute;left:-84px;top:40px;pointer-events:auto;display:flex;flex-direction:column;gap:2px;z-index:5`;for(let k of PQ){let b=document.createElement(`button`);b.textContent=PN(k);b.style.cssText=`width:78px;text-align:left;padding:3px 6px;font:13px sans-serif;cursor:pointer;background:${k===t.open?`#3a3020`:`#151209`};color:${k===t.open?`#fff`:`#c8b27a`};border:1px solid #5a4a2a;overflow:hidden;white-space:nowrap`;b.onclick=x=>{x.stopPropagation(),n(k)};b.oncontextmenu=x=>{x.preventDefault(),x.stopPropagation();let q=document.createElement(`input`);q.value=PG?.remodTabNames?.[k]??``;q.maxLength=12;q.placeholder=`공유 ${k.slice(6)}`;q.style.cssText=`width:80px;font:13px sans-serif`;q.onkeydown=z=>{z.stopPropagation();if(z.key===`Enter`){PG&&((PG.remodTabNames??={})[k]=q.value.trim(),globalThis.__saveNow?.());n(k)}z.key===`Escape`&&n(t.open)};b.replaceWith(q);q.focus()};PL.append(b)}{let b=document.createElement(`button`);b.textContent=`큐브`;b.style.cssText=`width:78px;margin-top:14px;padding:6px 4px;font:bold 14px sans-serif;cursor:pointer;background:linear-gradient(#5a3a18,#2a1a08);color:#ffd27a;border:1px solid #c8902a`;b.onclick=x=>{x.stopPropagation(),globalThis.__remodCube?.()};PL.append(b)}if(t.open===`uniques`)for(let[r,l]of[[!1,`원작 고유`],[!0,`리모드 고유`]]){let b=document.createElement(`button`),on=!!globalThis.__reimTab===r;b.textContent=l;b.style.cssText=`width:78px;margin-top:${r?2:14}px;text-align:left;padding:3px 6px;font:12px sans-serif;cursor:pointer;background:${on?`#3a3020`:`#151209`};color:${on?`#fff`:`#c8b27a`};border:1px solid #5a4a2a;white-space:nowrap`;b.dataset.reim=r;b.onclick=x=>{x.stopPropagation(),globalThis.__reimTab=r;for(let o of PL.querySelectorAll(`[data-reim]`)){let on=o.dataset.reim===String(r);o.style.background=on?`#3a3020`:`#151209`,o.style.color=on?`#fff`:`#c8b27a`}document.querySelector(`.uq-category.lit`)?.click();let N=document.querySelector(`.stash-note`);N&&N.replaceChildren(this.canvas(__kc(t.uniques),`font16`,`gold`,{shadow:!0}))};PL.append(b)}let SB='],
  ['saveTransfer', '...SB?[SB]:[],...MB?[MB]:[])}', '...SB?[SB]:[],...MB?[MB]:[],PL)}'],
  // 완성 룬워드 드롭은 아주 드물게(원작 유니크 확률의 25% → 2%)
  ['saveTransfer', 'var yXe=.2,bXe=.25;', 'var yXe=.2,bXe=.02;'],
  // 게임 안 패치 기록(F10)·위쪽 버전 줄을 리모드 기록(CHANGELOG.md)으로
  ['Game', '^', `globalThis.__remodLog=${JSON.stringify(REMOD_LOG.replace(/^# .*\n/, ''))};globalThis.__remodVer=${JSON.stringify(REMOD_LOG.match(/^## ([0-9.]+)/m)[1])};`],
  // 메인 메뉴 오른쪽 위 [새 소식]: 원작 변경 목록 대신 리모드 기록. [새 기능] 줄은 금색
  ['Game', '^', `globalThis.__remodNews=${JSON.stringify(REMOD_LOG.split(/^## /m).slice(1).filter((b) => /^[0-9]/.test(b)).map((b) => { const [head, ...rest] = b.trim().split('\n'); let kind = 'fix'; const lines = []; for (const l of rest) { if (/^\[/.test(l)) kind = l.includes('새 기능') ? 'new' : 'fix'; else if (l.startsWith('- ')) lines.push({ kind, text: l.slice(2) }); } return { build: `REMOD ${head}`, lines }; }))};`],
  ['Game', 'async function mb(e=`../changelog.json`){try{', 'async function mb(e=`../changelog.json`){if(globalThis.__remodNews)return{fresh:__remodNews,older:[],returning:!1,latest:__remodNews[0].build,unread:!1};try{'],
  ['Game', 'function ob(e){let[,t,n]=ib(e);', 'function ob(e){if(/^REMOD/.test(e))return e;let[,t,n]=ib(e);'],
  ['Game', '__plog="1.69', '__plog=__remodLog||"1.69'],
  ['Game', '__plogF="1.65', '__plogF=__remodLog||"1.65'],
  ['Game', 'w.textContent=globalThis.__papp+`\\n\\n`+(d?', 'w.textContent=(d?'],
  ['Game', '패치 기록 v1.69 (F10 닫기)', 'REMOD 패치 기록 v${__remodVer} (F10 닫기)'],
  ['Game', 'D2S v1.69</span>', 'D2S REMOD v${__remodVer}</span>'],
  // 레어 아이템(부적 빼고)은 15% 확률로 지금 직업의 단일 스킬 +1~2 가 하나 더 붙는다
  ['saveTransfer', 'function cY(e,t,n,r,i,a=2){t===`normal`', 'function cY(e,t,n,r,i,a=2){let __x=__cY0(e,t,n,r,i,a);__x?.type===`jewel`&&__x.mods?.forEach(m=>/^skill:/.test(m.stat)&&(m.staff=!0));if(__x?.rarity===`rare`&&__x.type!==`charm`&&Math.random()<.15&&!__x.mods?.some(m=>m.stat.startsWith(`skill:`))){let c=globalThis.__gm?.world?.player?.cls,L=' + JSON.stringify(Object.fromEntries(['amazon','sorceress','necromancer','assassin','barbarian','paladin','druid'].map((c) => [c, SKILLS.filter((k) => k[3] === c).map((k) => k[0])]))) + ',l=L[c]??Object.values(L)[Math.floor(Math.random()*7)];__x.mods=[...__x.mods??[],{stat:`skill:${l[Math.floor(Math.random()*l.length)]}`,value:1+(Math.random()<.3),staff:!0}]}return __x}function __cY0(e,t,n,r,i,a=2){t===`normal`'],
  // 위 레어 단일 스킬 옵션은 검사(인정 안 됨)에서 빼고 본다
  ['saveTransfer', 'function f2(e){if(e.type===`quest`)return null;', 'function f2(e){if(e.type===`quest`)return null;if((e.rarity===`rare`||e.type===`jewel`)&&e.type!==`charm`&&e.mods?.some(m=>m.staff&&/^skill:/.test(m.stat)&&m.value<=2))return f2({...e,mods:e.mods.filter(m=>!(m.staff&&/^skill:/.test(m.stat)&&m.value<=2))});'],
  ['saveTransfer', 'function m2(e){let t=', 'globalThis.__m2=e=>f2(e);function m2(e){let t='],
  // 새 옵션이 붙었을 때 강화 결과 문구
  ['Game', 'return{text:n?`${zI} ${n.text}`:zI,', 'return{text:n?`${zI} ${n.text}`:u.line===`new`?`${zI} 새 옵션이 붙었습니다`:zI,'],
];

const unpacked = path.join(work, 'app');
asar(`extract "${myPatch()}" "${unpacked}"`);
const assets = path.join(unpacked, 'desktop', 'dist', 'web', 'assets');
for (const [prefix, find, replace] of PATCHES) {
  const desktop = prefix === 'main' || prefix === 'preload';
  const file = desktop ? `${prefix}.cjs` : fs.readdirSync(assets).find((f) => f.startsWith(prefix + '-') && f.endsWith('.js'));
  const full = desktop ? path.join(unpacked, 'desktop', 'dist', file) : path.join(assets, file);
  const text = fs.readFileSync(full, 'utf8');
  if (find === '^') { fs.writeFileSync(full, replace + '\n' + text); console.log(`앞에 붙임: ${file}`); continue; } // '^' = 파일 맨 앞에 붙이기
  const count = text.split(find).length - 1;
  if (count !== 1) throw new Error(`${file}: "${find.slice(0, 40)}" ${count}번 나옴 (1번이어야 함)`);
  fs.writeFileSync(full, text.replace(find, () => replace));
  execSync(`node --check "${full}"`);
  console.log(`고침: ${file}`);
}
asar(`pack "${unpacked}" "${OUT}"`);
// 실행 파일도 리모드 이름으로(원작 실행 파일과 따로 보이게)
fs.copyFileSync(path.join(ROOT, 'game', 'D2 Survivors.exe'), path.join(ROOT, 'game', 'D2S Remod.exe'));
const hash = require('node:crypto').createHash('sha256').update(fs.readFileSync(OUT)).digest('hex');
fs.writeFileSync(path.join(path.dirname(OUT), 'app.asar.sha256'), hash);
fs.rmSync(work, { recursive: true, force: true });
console.log(`완성: ${OUT}`);
