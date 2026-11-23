// 원작 asar(tools/original.asar)에 기존 패치(D2S-MyPatch)와 Remod 수정을 입혀 game/resources/app.asar 로 만든다
process.noAsar = true; // 게임 실행 파일(Electron)로 돌릴 때 .asar 를 폴더로 보지 않고 파일로 다루게
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
// 리모드 게임 폴더: 개발 PC 는 저장소의 game/, 사용자 PC 는 설치 bat 가 D2S_REMOD_GAME 으로 알려 준다
const GAME = process.env.D2S_REMOD_GAME || path.join(ROOT, 'game');
// 저장소 game/ 로 만드는 건 로컬 시험용: 앱 이름·작업표시줄 묶음·제목에 테스트가 붙어 설치본(본섭용)과 따로 돎
const TEST = !process.env.D2S_REMOD_GAME;
const OUT = path.join(GAME, 'resources', 'app.asar');
// 리모드 게임이 켜진 채로 app.asar 를 바꾸면 게임이 망가질 수 있다(원작 D2 Survivors 는 다른 폴더라 켜져 있어도 됨)
// 이 GAME 폴더의 게임만 봄: 다른 곳에 설치된 리모드(사용자 게임)가 켜져 있어도 빌드함
const PS_LIST = Buffer.from("Get-CimInstance Win32_Process -Filter \"name='D2 Vampire Remod.exe'\" | ForEach-Object { [string]$_.ProcessId + '|' + $_.ExecutablePath }", 'utf16le').toString('base64');
if (execSync(`powershell -NoProfile -EncodedCommand ${PS_LIST}`).toString().split(/\r?\n/).some((l) => { const [id, p] = l.split('|'); return p && path.resolve(p).toLowerCase().startsWith(path.resolve(GAME).toLowerCase() + path.sep) && +id !== process.pid; })) { /* 빌드를 게임 실행 파일로 돌릴 때 자기 자신은 빼고 */ console.error('게임이 켜져 있어 빌드하지 않습니다. 게임을 끄고 다시 실행하세요.'); process.exit(1); }
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'd2s-remod-'));
const ASAR = require('./asar-lite.cjs'); // npx 없이 풀고 묶기(사용자 PC 에 Node 가 없어도 됨)

const MYPATCH = process.env.D2S_MYPATCH || String.raw`C:\Users\Administrator\Desktop\D2S-MyPatch-Share\D2S-MyPatch.bat`;

// 기존 패치를 임시 폴더의 원작 사본에 화면 없이 적용한다. APPDATA 도 임시 폴더로 돌려 실제 설정은 건드리지 않는다
// 패처는 $env:D2SF 가 있으면 감시 작업(작업 스케줄러 D2S-MyPatch-Watch)을 만들거나 지운다. 스크립트를 읽은 뒤 D2SF 를 지워서 막는다
function myPatch() {
  const dir = path.join(work, 'mypatch'), res = path.join(dir, 'game', 'resources'), app = path.join(dir, 'appdata', 'D2S-MyPatch');
  fs.mkdirSync(res, { recursive: true }); fs.mkdirSync(app, { recursive: true });
  fs.copyFileSync(process.env.D2S_ORIGINAL || path.join(__dirname, 'original.asar'), path.join(res, 'app.asar')); // 새 원작 시험: D2S_ORIGINAL=새 app.asar
  fs.writeFileSync(path.join(res, 'app.asar.sha256'), require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(res, 'app.asar'))).digest('hex'));
  const real = path.join(process.env.APPDATA, 'D2S-MyPatch');
  // 게임 안 "리모드 설정"에서 저장한 값이 있으면 그것, 없으면 기존 패치 설정
  // 설치본은 설정 창이 저장하는 곳(설치 폴더\remod-options.json)을 읽음. 없으면 받은 리모드의 기본값으로 시작
  const own = process.env.D2S_REMOD_GAME ? path.join(process.env.D2S_REMOD_GAME, '..', 'remod-options.json') : path.join(ROOT, 'remod-options.json');
  const def = fs.existsSync(path.join(ROOT, 'remod-options.json')) ? path.join(ROOT, 'remod-options.json') : path.join(real, 'options.json');
  const options = JSON.parse(fs.readFileSync(fs.existsSync(own) ? own : def, 'utf8').replace(/^﻿/, ''));
  fs.writeFileSync(path.join(app, 'options.json'), JSON.stringify({ ...options, watch: false }));
  if (!fs.existsSync(own)) fs.writeFileSync(own, JSON.stringify({ ...options, watch: false }, null, 1)); // 게임 안 설정 창의 시작값 // 감시는 실제 작업 스케줄러를 바꾸므로 끈다
  if (!process.env.D2S_REMOD_GAME && fs.existsSync(path.join(real, 'speeds.txt'))) fs.copyFileSync(path.join(real, 'speeds.txt'), path.join(app, 'speeds.txt'));
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
// 7단계 재료: [영문 이름, 코드, 한글, 드롭 확률(아이템 드롭 1회마다), 최소 아이템 레벨]. 그림은 공포의 정수를 빌려 씀
// ponytail: 확률은 시험해 보고 맞출 것 (context-notes 7단계)
// 재료 드롭: 몬스터 1마리 잡을 때 확률. 5분 판 약 4600킬 기준으로 처음 값의 1/30 (11/23 사용자 요청)
// 게임 기본 서버 주소(랭킹·채팅·PvP). 바깥 서버로 옮기면 REMOD_SERVER=http://IP:8520 node tools/build.cjs
const SERVER_URL = process.env.REMOD_SERVER ?? 'http://150.230.3.40:8520'; // 오라클 오사카 무료 서버(tools/deploy-oracle.sh)
const MATS = [['Hero Token','ztk','영웅의 증표',0,999],['Rune Box','zrb','룬 상자',.03/30,1],['High Rune Box','zhb','고급 룬 상자',.03/30*.2,1],['Abyss Shard','zas','리모드의 파편',.015/30,60],['Dimension Fragment','zdf','차원의 조각',.01/30,36],['Socket Stone','zss','소켓의 돌',.01/30,60],['Fire Whetstone','zw1','화염 깎기석',.005/30,60],['Lightning Whetstone','zw2','번개 깎기석',.005/30,60],['Cold Whetstone','zw3','냉기 깎기석',.005/30,60],['Poison Whetstone','zw4','독 깎기석',.005/30,60],['Fortune Stone','zfs','행운석',.002/30,60],['Item Fragment','zif','장비 조각',0,1]];
const MATS_JS = JSON.stringify(MATS.map(([e, c, , p, l]) => [e, c, p, l])).replace(/"/g, '`');
// 리모드 전용 유니크: tools/remod-uniques.cjs 가 만든 표 {uniques, drops, ko, setItems, sets, setDrops, runewords}
const REIM = JSON.parse(fs.readFileSync(path.join(__dirname, 'remod-items.json'), 'utf8'));
// 리모드 손질: 유니크·세트·룬워드·세트 보너스 수치 상한을 아이템마다 5~15% 올림(이름으로 정해지는 고정 값). 하한은 그대로라 예전 템은 변조 검사에 안 걸림
// 스킬 수·확률 발동 기술(par 있는 줄)·음수는 건드리지 않음
{
  const hash = (t) => { let h = 2166136261; for (const c of t) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 2 ** 32; };
  const tweak = (name, props) => (props ?? []).forEach((p, i) => { if (p.par != null || !(p.max >= 4) || p.stats.some((x) => /skill/.test(x.stat))) return; p.max = Math.round(p.max * (1.05 + hash(name + i) * 0.1)); });
  for (const [n, u] of Object.entries(REIM.uniques)) tweak(n, u.props);
  for (const [n, u] of Object.entries(REIM.setItems)) tweak(n, u.props);
  for (const [n, r] of Object.entries(REIM.runewords)) if (!r.d2r) tweak(n, r.props); // 레저렉션 룬워드(d2r)는 원본 수치 그대로
  for (const [n, v] of Object.entries(REIM.sets)) [...(v.partial ?? []), v.full ?? []].forEach((l, k) => tweak(n + k, l));
}
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
// 악마술사(워락) D2R 데이터(tools/warlock-data.cjs 가 설치본에서 뽑음)
const WKD = JSON.parse(fs.readFileSync(path.join(__dirname, 'warlock-skills.json'), 'utf8'));
const wkId = (n) => n.split(/[^A-Za-z0-9]+/).filter(Boolean).map((w, i) => (i ? w[0].toUpperCase() : w[0].toLowerCase()) + w.slice(1)).join('');
const WK_ICONS = Object.fromEntries(WKD.skills.map((k) => [k.skill, { sheet: 'war', frame: k.icon, page: k.page, row: k.row, column: k.column }]));
const WK_A = Object.fromEntries(WKD.skills.map((k) => [wkId(k.skill), k.skill]));
// 스킬 트리 쪽마다 칸 자리와 선행 스킬 화살표 [[위 줄, 칸], [아래 줄, 칸]] (remod-wk-icons.js 가 그림)
const WK_TREE = Object.fromEntries([1, 2, 3].map((page) => {
  const on = WKD.skills.filter((k) => k.page === page), at = (n) => on.find((k) => k.skill.replace(/\s/g, '') === n.replace(/\s/g, ''));
  return [page, { cells: on.map((k) => [k.row, k.column]), arrows: on.flatMap((k) => [k.reqskill1, k.reqskill2].filter(Boolean).map(at).filter(Boolean).map((p) => [[p.row, p.column], [k.row, k.column]])) }];
}));
const WK_DX = WKD.skills.map((k) => `${wkId(k.skill)}:${k.reqlevel}`).join(',');
const WK_PMAX = WKD.skills.filter((k) => k.passive).map((k) => `${wkId(k.skill)}:5`).join(',');
const WK_ART = ['holybolt', 'firewall', 'poisonexplosioncloud', 'grimwardsmall', 'grimwardmedium', 'meteorexplode', 'meteorcenter', 'curse_hit', 'blessedhammer', 'warcryshockwave', 'explodingarrowexp', 'fireexplode', 'poisonjavcloud', 'lightningjavelin', 'nova', 'fireball', 'firesmall', 'lightninghit', 'chainlightning', 'grimwardlarge', 'meteor', 'plaguejavelin', 'poisonnova', 'bonespiritexplode'];
// 악마술사 기술 변형(호라드림 고서 포인트로 켬): 원작 엔진이 공통 처리하는 효과(속성 전환 convert·탄 분열 split)와 피해 배율(damage, __wkDmg 가 읽음)
const WK_XS = (() => {
  const w = fs.readFileSync(path.join(__dirname, 'remod-warlock.js'), 'utf8'), KO = { fire: '화염', cold: '냉기', lightning: '번개', poison: '독', magic: '마법' };
  const EL = { fire: 'fire', cold: 'cold', ltng: 'lightning', pois: 'poison', mag: 'magic' }, ALT = { fire: ['cold', 'lightning'], magic: ['poison', 'fire'], physical: ['fire', 'cold'], cold: ['fire', 'lightning'], lightning: ['cold', 'fire'], poison: ['magic', 'fire'] };
  const skip = new Set(['summonGoatman', 'summonTainted', 'summonDefiler', 'psychicWard']), out = {};
  for (const s of WKD.skills) {
    const k = wkId(s.skill), i = w.indexOf(k + ':{cd:');
    if (s.passive || skip.has(k) || i < 0) continue;
    const lc = w.slice(i, w.indexOf('}},', i)).includes('lc(e,'), el = EL[s.EType] ?? 'physical', conv = (to) => ({ id: 'to' + to, name: KO[to] + ' 전환', describe: '피해의 절반이 ' + KO[to] + ' 피해가 됩니다.', lean: 'even', effects: { convert: { to, share: 0.5 } } });
    out[k] = [lc ? { id: 'split', name: '분열', describe: '탄이 맞으면 3갈래로 갈라져 각각 30% 피해를 줍니다. 기본 피해는 25% 줄어듭니다.', lean: 'horde', effects: { damage: 0.75, split: { into: 3, share: 0.3 } } } : conv(ALT[el][1]), conv(ALT[el][0]), { id: 'focus', name: '집중', describe: '피해가 20% 늘어납니다.', lean: 'boss', effects: { damage: 1.2 } }];
  }
  return JSON.stringify(out);
})();
// 공포 100단계 전용 템: 단계가 여러 개인 유니크 묶음(이름 끝 숫자)의 맨 위 단계. 평소 드롭은 막고(999) 공포 100 이상 막 보스에서만
const T100 = (() => {
  const g = {};
  for (const [n] of REIM.drops) { const m = n.match(/^(.*) (\d+)$/); if (m) (g[m[1]] ??= []).push([+m[2], n]); }
  return Object.values(g).filter((v) => v.length >= 2).map((v) => v.sort((a, c) => c[0] - a[0])[0][1]);
})();
for (const d of REIM.drops) if (T100.includes(d[0])) d[2] = 999;
const PATCHES = [
  // 게임 추출 단계에 "D2R 화면"을 더한다: D2R 이 깔린 PC 면 메뉴·대기실 원본 그림을 d2/d2r 에 꺼냄(각자 PC 에서, 배포 안 함)
  ['extract-worker', '^', fs.readFileSync(path.join(__dirname, 'remod-d2r-step.js'), 'utf8')],
  ['extract-worker', '  { name: "Weather", run: extractWeather, weight: 0.2, manifests: ["weather"] }\n];', '  { name: "Weather", run: extractWeather, weight: 0.2, manifests: ["weather"] },\n  { name: "D2R 화면", run: (ctx) => remodD2rUi(require("node:worker_threads").workerData?.extractLane?.installDir ?? installDir, ctx.out), weight: 0.5, manifests: ["d2r"] }\n];'],
  // 워락: 원작 추출기가 1.14 모양에 맞추려 뺀 워락 줄(plrtype 9번째)을 살리고 몸 그림(chars/wk)을 꺼낸다
  ['extract-worker', '  druid: [{ weaponClass: "1HS", items: { RH: "clb", SH: "buc" } }],', '  druid: [{ weaponClass: "1HS", items: { RH: "clb", SH: "buc" } }],\n  warlock: [{ weaponClass: "STF", items: { RH: "scy" } }],'],
  ['extract-worker', '  plrtype: { rows: 8 },', '  plrtype: { rows: 9 },'],
  // 워락 몸 그림: D2R 의 옛 chars/wk 는 강령술사 그림 복사본(같은 파일)이라, HD 3D 모델(hd/character/player/warlock)을 직접 그려 덮어씀(tools/remod-wk-hd.js)
  ['extract-worker', '^', 'var remodGr2=(()=>{var module={exports:{}};' + fs.readFileSync(path.join(__dirname, 'gr2-model.cjs'), 'utf8') + '\nreturn module.exports;})();\n' + fs.readFileSync(path.join(__dirname, 'remod-wk-hd.js'), 'utf8')],
  ['extract-worker', '    manifest[name] = withDefaults(anims, loadouts[0].weaponClass);', '    if (name === "warlock") try { Object.assign(anims, remodWkHd(require("node:worker_threads").workerData?.extractLane?.installDir ?? installDir, anims, write2)); } catch (e) { console.warn("warlock HD:", e.message); }\n    manifest[name] = withDefaults(anims, loadouts[0].weaponClass);'],
  // 워락 동작 속도: D2R animdata 에 워락 줄이 없어 같은 동작의 드루이드 속도를 쓴다(없으면 fps 가 빠져 그림자·동작이 깨짐)
  ['extract-worker', 'if (sheet) anims[key] = { ...write2(`sprites/classes/${name}-${key}.png`, sheet), ...rate(`${token}${mode2}${loadout.weaponClass}`) };', 'if (sheet) anims[key] = { ...write2(`sprites/classes/${name}-${key}.png`, sheet), ...(name === "warlock" ? { fps: manifest.druid?.[key]?.fps ?? manifest.druid?.["1HS-NU"]?.fps ?? 12 } : rate(`${token}${mode2}${loadout.weaponClass}`)) };'],
  ['extract-worker', '  pal: "paladin",\n  sor: "sorceress"\n};', '  pal: "paladin",\n  sor: "sorceress",\n  war: "warlock"\n};'],
  // 워락 스킬 아이콘(WaSkillicon)·스킬 트리 그림(skltree_w)
  ['extract-worker', '^', 'var WK_ICONS=' + JSON.stringify(WK_ICONS) + ';var WK_TREE=' + JSON.stringify(WK_TREE) + ';var WK_OVERLAYS=' + JSON.stringify(WKD.overlays.map((o) => ({ ...o, Frames: o.Frames ?? o['*Frames'] }))) + ';' + fs.readFileSync(path.join(__dirname, 'remod-wk-icons.js'), 'utf8')],
  // ['extract-worker', '  ctx.writeManifest("missiles", manifest);', '  remodHdMissiles(ctx, manifest);\n  remodHdWarlockFx(ctx, manifest);\n  remodHdBarbFx(ctx, manifest);\n  remodFxTextures(ctx);\n  ctx.writeManifest("missiles", manifest);'], // HD 굽기: 레거시 모드(2026-11-20)로 뺌 → 악마술사·야만용사도 원래 D2 그림. 함수는 remod-wk-icons.js 에 남김
  ['extract-worker', '  return { size: ICON, sheets, skills };', '  remodWkIcons(ctx, sheets, skills, save, ICON);\n  return { size: ICON, sheets, skills };'],
  ['extract-worker', '    classTrees: classTrees(ctx, dc6, save, palette),', '    classTrees: remodWkTree(ctx, classTrees(ctx, dc6, save, palette), save),'],
  ['extract-worker', '  ass: "AsSkillicon"\n', '  ass: "AsSkillicon",\n  war: "WaSkillicon"\n'],
  // 악마술사 스킬 소리: 옛 표(base)의 워락 줄엔 소리 칸이 비어 있어 D2R 표의 stsound·dosound 를 직접 연결
  ['extract-worker', '    own(cls, `${id2}.cast`, `${id2}.do`, `${id2}.travel`, `${id2}.hit`);\n  }\n', '    own(cls, `${id2}.cast`, `${id2}.do`, `${id2}.travel`, `${id2}.hit`);\n  }\n  for (const [id2, st, dt] of ' + JSON.stringify(WKD.skills.map((k) => [wkId(k.skill), k.stsound ?? '', k.dosound ?? ''])) + ') { add(`${id2}.cast`, st); add(`${id2}.do`, dt); own("warlock", `${id2}.cast`, `${id2}.do`); }\n'],
  // 악마술사 장비 그림(무기·갑옷 겹침). 없으면 몸 그림이 장비 없는 길로 그려져 그림자가 줄무늬로 나옴
  ['extract-worker', '  sorceress: WEAPON_CLASSES\n};', '  sorceress: WEAPON_CLASSES,\n  warlock: WEAPON_CLASSES\n};'],
  // 악마술사 시전 효과(overlay): 옛 overlay 표엔 워락 줄 이름만 있어 D2R 표 줄(WKD.overlays)을 넣고, 워락 몫 그림으로 등록(CLASS_ROOTS)
  ['extract-worker', '  const overlays = new Map(ctx.readTable("data\\\\global\\\\excel\\\\overlay.txt").map((r) => [r.overlay, r]));\n  const reach', '  const overlays = new Map(ctx.readTable("data\\\\global\\\\excel\\\\overlay.txt").map((r) => [r.overlay, r]));\n  for (const r of WK_OVERLAYS) overlays.set(r.overlay, r);\n  const reach'],
  ['extract-worker', '  const overlays = new Map(ctx.readTable("data\\\\global\\\\excel\\\\overlay.txt").map((r) => [r.overlay, r]));\n  const sheet', '  const overlays = new Map(ctx.readTable("data\\\\global\\\\excel\\\\overlay.txt").map((r) => [r.overlay, r]));\n  for (const r of WK_OVERLAYS) overlays.set(r.overlay, r);\n  const sheet'],
  ['extract-worker', '  druid: { missiles: ["vine beast walk 1", "vine beast neutral", "vine beast attack", "vine beast death"], overlays: [] },', '  druid: { missiles: ["vine beast walk 1", "vine beast neutral", "vine beast attack", "vine beast death"], overlays: [] },\n  warlock: { missiles: [], overlays: ' + JSON.stringify(WKD.overlays.map((o) => o.overlay)) + ' },'],
  // 악마술사 소환수 그림: D2R 의 wargoatman·warbighead·warputriddefiler 는 같은 그림 코드(GM·BH·45)의 옛 몬스터 그림을 씀
  ['extract-worker', 'var SUMMONS = {\n', 'var SUMMONS = {\n  warGoatman: "goatman1",\n  warTainted: "bighead1",\n  warDefiler: "putriddefiler1",\n'],
  ['extract-worker', 'dru: "d", ass: "i" };', 'dru: "d", ass: "i", war: "w" };'],
  ['extract-worker', '  ass: [[30], [31, 32], [33, 34]]\n', '  ass: [[30], [31, 32], [33, 34]],\n  war: [[0], [0], [0]]\n'],
  // 워락 선택 화면 그림: D2R 의 data/global/ui/FrontEnd/warlock/WK*.dc6 (설명 문자열 번호는 몰라 비워 둠)
  ['extract-worker', '  druid: { prefix: "DZ", x: 720, y: 370, overlay: "normal", idle: 1.5, selected: 1.5 }\n};', '  druid: { prefix: "DZ", x: 720, y: 370, overlay: "normal", idle: 1.5, selected: 1.5 },\n  warlock: { prefix: "WK", x: 780, y: 360, overlay: "normal", idle: 1.5, selected: 1.5 }\n};'],
  ['extract-worker', 'const description = trusted ? strings(', 'const description = trusted && DESCRIPTIONS[id2] ? strings('],
  // 워락 직업(tools/remod-warlock.js)을 직업 목록 SG·CG 에 더한다. 주석 줄은 빼고 넣음(한 줄짜리 번들 중간이라)
  ['saveTransfer', 'var SG=l({amazon:()=>wTe,', 'var __WKX=' + WK_XS + ';var __WKD=' + JSON.stringify({ skills: WKD.skills.map(({ enDesc, ...k }) => k) }) + ';' + fs.readFileSync(path.join(__dirname, 'remod-warlock.js'), 'utf8').replace(/^\/\/.*\n/gm, '') + 'var SG=globalThis.__SG=l({warlock:()=>__WK,amazon:()=>wTe,'],
  ['saveTransfer', 'blurb:`Elemental storms, summoned beasts and shape shifting`}]', 'blurb:`Elemental storms, summoned beasts and shape shifting`},{id:`warlock`,name:`악마술사`,blurb:`금단의 기술을 사용하고 지옥불과 그림자를 조종하며, 악마를 지배합니다.`}]'],
  // 직업별 스킬 그림 목록(ECe)에 워락: Miasma Bolt 는 원소술사 firebolt 그림을 빌림
  // 시너지 줄 기술 이름 잇기: 한글 화면이라 영어 and 대신 가운뎃점("독기 사슬·심연 레벨당 피해 +10%")
  ['saveTransfer', 'function I0(e){return e.length<2?e.join(``):`${e.slice(0,-1).join(`, `)} and ${e.at(-1)}`}', 'function I0(e){return e.join(`·`)}'],
  // 경험치 숫자 표시(remod-hud.js)용: 하단 판 갱신 때 현재·필요 경험치를 전역에
  ['saveTransfer', 'let t=e.xpToNext>0?Math.min(1,e.xp/e.xpToNext):0;', 'let t=e.xpToNext>0?Math.min(1,e.xp/e.xpToNext):0;globalThis.__xpNow=[e.xp,e.xpToNext];'],
  // 생명·마나 숫자: 구슬 바로 위라 '생명력:'·'마나:' 글자 없이 숫자만
  ['saveTransfer', 'this.printLive(this.lifeLabel,`Life: ${', 'this.printLive(this.lifeLabel,`${'],
  ['saveTransfer', 'this.printLive(this.manaLabel,`Mana: ${', 'this.printLive(this.manaLabel,`${'],
  // 시너지 원소 이름("레벨당 소모: +18% Magic Damage" 처럼 줄 안에 끼어 번역표에 안 걸림): 한글로
  ['saveTransfer', 'P0={physical:`Damage`,fire:`Fire Damage`,cold:`Cold Damage`,lightning:`Lightning Damage`,poison:`Poison Damage`,magic:`Magic Damage`}', 'P0={physical:`피해`,fire:`화염 피해`,cold:`냉기 피해`,lightning:`번개 피해`,poison:`독 피해`,magic:`마법 피해`}'],
  ['saveTransfer', 'ECe={necromancer:{', 'ECe={warlock:{skills:{},shared:' + JSON.stringify(WK_ART) + '},necromancer:{'],
  // 워락 체력 표(활력·레벨당·활력당 생명력). D2R 워락 수치 표가 비어 있어 강령술사 값
  ['saveTransfer', 'sorceress:{vit:10,hpadd:30,lifePerLevel:8,lifePerVitality:12}}', 'sorceress:{vit:10,hpadd:30,lifePerLevel:8,lifePerVitality:12},warlock:{vit:15,hpadd:30,lifePerLevel:8,lifePerVitality:12}}'],
  // 워락 마나·기본 능력치 표(값은 시전 직업 기준으로 임시)
  ['Game', 'sorceress:{manaPerLevel:8,manaPerMagic:8}}', 'sorceress:{manaPerLevel:8,manaPerMagic:8},warlock:{manaPerLevel:8,manaPerMagic:8}}'],
  ['saveTransfer', 'sorceress:{strength:10,dexterity:25,vitality:10,energy:35}}', 'sorceress:{strength:10,dexterity:25,vitality:10,energy:35},warlock:{strength:15,dexterity:20,vitality:15,energy:25}}'],
  ['saveTransfer', 'lightningMastery:5,warmth:5}},jse=', 'lightningMastery:5,warmth:5},warlock:{' + WK_PMAX + '}},jse='],
  // 워락 맨손 이전 기본 무기(한손검)·스킬 트리 묶음(아이템 스킬 탭 이름)
  ['Game', 'speed:-10,frames:18,fps:25,hitClass:`club`}};function mC(', 'speed:-10,frames:18,fps:25,hitClass:`club`},warlock:{code:`scy`,damage:[2,7],strBonus:100,dexBonus:0,speed:0,frames:20,fps:25,hitClass:`club`}};function mC('],
  ['saveTransfer', "skills:Mi([`Magekiller's`,`Witch-hunter's`],`h2h`)}},Pi=", "skills:Mi([`Magekiller's`,`Witch-hunter's`],`h2h`)},warlock:{charclass:`war`,only:`(Warlock Only)`,trees:[ji(`Demon Skills`,[`Infernal`,`Fiendish`,`Hellbound`],`amul,circ`),ji(`Eldritch Skills`,[`Hexing`,`Cursed`,`Eldritch`],`amul,circ`),ji(`Chaos Skills`,[`Miasmic`,`Entropic`,`Abyssal`],`amul,circ`)],skills:Mi([`Warlock's`,`Archwarlock's`],`amul`)}},Pi="],
  // 워락 스킬 요구 레벨(Dx, 1 = 첫 선택지에 나옴)
  ['saveTransfer', 'Dx={vitality:1,', 'Dx={' + WK_DX + ',vitality:1,'],
  // 스킬 id → D2 이름(아이콘 표 열쇠)
  // 직업 순서표에 워락(7번) 추가: 아이템의 워락 스킬(classskills7·skilltab21~23)이 먹게
  ['saveTransfer', 'Pi=[`amazon`,`sorceress`,`necromancer`,`paladin`,`barbarian`,`druid`,`assassin`];', 'Pi=[`amazon`,`sorceress`,`necromancer`,`paladin`,`barbarian`,`druid`,`assassin`,`warlock`];'],
  ['saveTransfer', 'pK=[`amazon`,`sorceress`,`necromancer`,`paladin`,`barbarian`,`druid`,`assassin`],eqe={', 'pK=[`amazon`,`sorceress`,`necromancer`,`paladin`,`barbarian`,`druid`,`assassin`,`warlock`],eqe={warlock:`war`,'],
  // 7-7 자동 분해: 팔리는 장비마다 장비 조각을 재료 창고에 더함 (골드는 그대로)
  ['Game', 'autoSell(e){let t=this.world.player.cls;', 'autoSell(e){globalThis.__dis?.(this.save,e);let t=this.world.player.cls;'],
  ['Game', 'sold(e,t,n){L(this.save)', 'sold(e,t,n){globalThis.__dis?.(this.save,e);L(this.save)'],
  ['saveTransfer', 'A_={magicArrow:','A_={...' + JSON.stringify(WK_A) + ',magicArrow:'],
  // 악마술사 인게임 몸: 장비 레이어(옛 chars/wk = 강령술사 복사본, 방향 찢어짐) 대신 HD 3D 로 뽑은 몸 그림 그대로
  ['Game', 'r?null:rn(n,this.equippedOf(n.id))', 'r||n.id===`warlock`?null:rn(n,this.equippedOf(n.id))'],
  ['Game', 't=await rn(this.kit,this.equippedOf(this.kit.id))', 't=this.kit?.id===`warlock`?null:await rn(this.kit,this.equippedOf(this.kit.id))'],
  // 글꼴 고르기(remod-popup.js): 눈누(jsDelivr)·Fontshare 웹폰트 주소만 바깥 요청 허용
  ['main', 'const own = /^(app|devtools|data|blob):/.test(details.url)', 'const own = /^(app|devtools|data|blob):/.test(details.url) || /^https:\\/\\/(cdn\\.jsdelivr\\.net\\/gh\\/project-?noonnu\\/|api\\.fontshare\\.com\\/v2\\/css\\?|cdn\\.fontshare\\.com\\/)/i.test(details.url)'],
  // 채팅 창(tools/remod-chat.js). 서버 요청 허용 경로에 chat·guild 를 더하고, 이름이 한글이라 쿼리에 % 도 허용
  ['main', '|hc\\/(checkin|act|checkout|deaths|runs|heroes|ladder))(\\?[A-Za-z0-9=&_-]{0,120})?$/;', '|chat|guild|friend|room|mail|gmok|id|pos|party|tower|ver|look|pvp|guard|rank|tags|hc\\/(checkin|act|checkout|deaths|runs|heroes|ladder))(\\?[A-Za-z0-9=&_%.-]{0,240})?$/;'],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-chat.js'), 'utf8')],
  // GM 버튼(tools/remod-gm.js): 서버 PC 의 주인 계정만
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-gm.js'), 'utf8')],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-hud.js'), 'utf8')],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-levelup.js'), 'utf8')],
  // ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-fx.js'), 'utf8')], // HD 입자 엔진: 레거시 모드(2026-11-20 사용자 결정, 원래 D2 그림이 더 나음)로 끔
  // 레저렉션 입자 효과(PopcornFX 재현): 따로 띄운 Pixi(전역 __PIXI2) + 해석기 + 엔진 + 탄 연결. 자료(d2/pkfx)가 없으면 레거시 그대로
  ['Game', '^', '(()=>{' + fs.readFileSync(path.join(__dirname, 'vendor', 'pixi-8.6.6.min.js'), 'utf8') + '\n;globalThis.__PIXI2=PIXI})();(()=>{var module;' + fs.readFileSync(path.join(__dirname, 'pkfx-core.js'), 'utf8') + '\n})();' + fs.readFileSync(path.join(__dirname, 'pkfx-engine.js'), 'utf8') + fs.readFileSync(path.join(__dirname, 'remod-pkfx.js'), 'utf8')],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-chars.js'), 'utf8')],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-look.js'), 'utf8')],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-pvp.js'), 'utf8')],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-guard.js'), 'utf8')],
  // 리모드 캐릭터 선택 화면이 원작 시작 갈래(이어하기·새 실행·난이도·공포)를 직접 부르도록 꺼내 둔다
  ['Game', 'let n={start:(t,n)=>e.play(t,n),', 'globalThis.__cfApi={kit:B,play:(t,n)=>e.play(t,n),resume:t=>e.resume(t),saved:e.saved,diffs:e.difficulties,terror:e.terror,title:e.title,startTerror:(t,n)=>e.startTerror(t,n)};let n={start:(t,n)=>e.play(t,n),'],
  // 멀티플레이는 이어하기 판이 있어도 캐릭터 선택 화면부터
  ['Game', 'heroSelect:()=>{n.camp?.()||this.heroSelect(n)}', 'heroSelect:()=>{n.camp?.()||this.heroSelect(n)},mpSelect:o=>void this.heroSelect(n,o)'],
  // 메인 메뉴 [멀티플레이] 버튼: 원작 캐릭터 선택 → 게임에 들어가면 remod-chat.js 가 배틀넷식 대기실을 띄운다(__mpFlow)
  ['screens', 's=[a(`PLAY`,r.heroSelect),', 's=[a(`PLAY`,()=>{globalThis.__mpSelect=r.mpSelect??r.heroSelect;globalThis.__remodChars?.(!1)}),a(`MULTIPLAYER`,()=>{globalThis.__mpSelect=r.mpSelect??r.heroSelect;globalThis.__remodChars?.(!0)}),'],
  ['ko', 'SAVES:`저장 데이터`', 'SAVES:`저장 데이터`,MULTIPLAYER:`멀티플레이`'],
  // 파티 전투(tools/remod-party.js): 몬스터 만들기(Zm)·피해(M)를 내보낸다
  ['saveTransfer', '^', 'globalThis.__mpT=null;'],
  ['saveTransfer', 'function Zm(e,t,n,r,i={}){', 'function Zm(e,t,n,r,i={}){globalThis.__mpT??={spawn:(...a)=>Zm(...a),hit:(...a)=>M(...a)};'],
  // 몬스터 목표: 원래 용병을 노리던 자리(Kpe)에 파티원도 넣는다. 방장 PC 에서 파티원이 더 가까우면 파티원을 쫓음
  ['saveTransfer', 'function Kpe(e,t,n){', 'function Kpe(e,t,n){let G=globalThis.__mpTarget?.(e,t);if(G)return G;'],
  ['saveTransfer', 'e.enemies.push(Ue),Ue}', 'e.enemies.push(Ue),globalThis.__mpBuff?.(Ue),Ue}'],
  // 강화 개편(서버 forge): 횟수 10번·확률 강화, 횟수 다 쓰면 [횟수 초기화](쓴 횟수 0~10 무작위 되돌림, 정수 1개)
  ['Game', '{act:`temper`,label:`Temper`,note:`Raise one line at random`},', '{act:`temper`,label:`Temper`,note:`Raise one line at random`},{act:`reset`,label:`횟수 초기화`,note:`쓴 강화 횟수를 0~10 무작위로 되돌림`},'],
  ['Game', 'UI={missed:{text:`The temper failed`,color:`grey`},', 'UI={whet:{text:`깎기석을 박았습니다`,color:`gold`},transcend:{text:`초월 성공!`,color:`gold`},shatter:{text:`초월 실패... 아이템이 부서졌습니다`,color:`red`},reset:{text:`강화 횟수를 되돌렸습니다`,color:`gold`},missed:{text:`The temper failed`,color:`grey`},'],
  ['Game', 'full:`Temper stops at 10`', 'full:`강화 횟수 10번을 다 썼습니다(횟수 초기화 가능)`'],
  ['Game', 'not_yet:`The Hellforge needs 10 tempers`', 'not_yet:`강화 횟수 10번을 다 써야 합니다`'],
  // 대장간은 큐브로 옮김(remod-cube.js 가 __gm.forgeActions 를 씀): 마을 상인 창의 대장간 쪽을 숨김
  ['saveTransfer', 'function N4e(e,t,n,r=!1){', 'function N4e(e,t,n,r=!1){r=!1;'],
  // 강화 비용은 큐브가 재료 창고에서 직접 뺌(원작 비용 계산은 재료 창고를 못 봄) → 원작 정수 비용 0
  ['Game', 'GI={temper:1,clean:1,hellforge:1}', 'GI={temper:0,temper1:0,temper2:0,temper3:0,clean:0,hellforge:0,reset:0,whet_fire:0,whet_ltng:0,whet_cold:0,whet_pois:0,tr0:0,tr1:0,tr2:0,tr3:0}'],
  // 변조 검사(tools/remod-guard.js): 유니크·세트·룬워드를 roll 시드로 다시 만드는 원본 hY 를 내보낸다
  ['saveTransfer', 'return null}var gY=new Map;', 'return null}globalThis.__regen=hY;globalThis.__mk=()=>({GJ,tZ,eZ,iZ,Sq,Cq,cK,lQ,oY,uJ,LXe,RXe});var gY=new Map;'],
  // PvP 방(tools/remod-pvp.js): 몹 부르기(웨이브·무리)를 멈춘다. 그림 읽기만 계속
  ['report', 'update(e,t){if(e.training){', 'update(e,t){if(globalThis.__pvpMode){this.demandTimer-=t,this.demandTimer<=0&&this.requestAssets(e);return}if(e.training){'],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-party.js'), 'utf8')],
  // 함께 보기(tools/remod-view.js): 같은 방 사람을 같은 마을·던전 막에 그린다
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-view.js'), 'utf8')],
  // 룬워드 툴팁·등록창의 룬 조합('TalIth')을 한글 룬 이름('탈아이드')으로
  ['saveTransfer', '^', "globalThis.__rk=a=>a.map(x=>String(globalThis.__ko?.(x+` Rune`)??x).replace(/^\\d+ /,``).replace(/ 룬$/,``)).join(``);"],
  ['saveTransfer', "c.push({text:`'${u.join(``)}'`", "c.push({text:`'${__rk(u)}'`"],
  // 공포 100 전용 템: 툴팁 맨 위에 붉은 글씨(unusable 색)(창고·인벤 어디서나)
  ['saveTransfer', 'u=vZ(e);if(u&&c.push(', 'u=vZ(e);globalThis.__T100?.includes(e.name)&&c.push({text:`공포 100 전용`,implicit:!1,unusable:!0});if(u&&c.push('],
  ['saveTransfer', "r3(`unique`,`'${e.runes?.join(``)??``}'`)", "r3(`unique`,`'${__rk(e.runes??[])}'`)"],
  ['saveTransfer', "r3(`unique`,`'${e.runes.join(``)}'`)", "r3(`unique`,`'${__rk(e.runes)}'`)"],
  // 리모드 아이템 그림: 같은 종류(무기 종류·부위) 원작 유니크/세트 그림 중 이름으로 고정해서 하나 고른다. 원래는 베이스 그림
  ['saveTransfer', 'let m=e=>({url:tn(e.file),width:e.width,height:e.height}),h=Object.entries(e.uniques)', 'let PK=(L,src,T)=>{let kd=b=>{let q=Bq.get(b);return q?q.kind??q.type:``};for(let[n,b]of L){if(T[n])continue;let c=Object.keys(src).filter(k=>!__rs.has(k)&&kd((GJ.find(g=>g.name===k)??qK.find(g=>g.name===k))?.base)===kd(b));if(!c.length)continue;let x=0;for(let ch of n)x=x*31+ch.charCodeAt(0)>>>0;T[n]=src[c[x%c.length]]}};PK(__reim.drops,e.uniques,e.uniques),e.sets&&PK(__reim.setDrops.map(([a,,b])=>[a,b]),{...e.sets,...e.uniques},e.sets);let m=e=>({url:tn(e.file),width:e.width,height:e.height}),h=Object.entries(e.uniques)'],
  // 메인 화면 로고: SURVIVORS 아래 오른쪽에 불꽃색 REMOD 글자(살짝 일렁임). 창 제목도 D2 Survivors REMOD
  ['screens', 'e.restore(),e.drawImage(o,s,c)}function Xt(', 'e.restore(),e.drawImage(o,s,c);{e.save();{let f2=.8+.2*Math.sin(t*2.3),g2=e.createLinearGradient(0,It.y-34,0,It.y+30);g2.addColorStop(0,`#ffb0a0`),g2.addColorStop(.35,`#e0201a`),g2.addColorStop(.75,`#7a0008`),g2.addColorStop(1,`#2a0004`),e.font=`bold 66px Cinzel, serif`,e.letterSpacing=`8px`,e.textAlign=`center`,e.textBaseline=`middle`,e.lineJoin=`round`,e.shadowColor=`rgba(200,0,0,${.8*f2})`,e.shadowBlur=26*f2,e.lineWidth=7,e.strokeStyle=`#120002`,e.strokeText(`VAMPIRE`,It.x,It.y),e.shadowBlur=0,e.fillStyle=g2,e.fillText(`VAMPIRE`,It.x,It.y),e.globalAlpha=.35,e.lineWidth=1.5,e.strokeStyle=`#ffd0c0`,e.strokeText(`VAMPIRE`,It.x,It.y-1)}e.restore();let x=It.x+168,y=It.y+44,f=.85+.15*Math.sin(t*3.1)*Math.sin(t*1.3);e.save(),e.translate(x,y),e.rotate(-.12),x=0,y=0,e.font=`bold 24px Cinzel, serif`,e.textAlign=`right`,e.textBaseline=`middle`,e.lineJoin=`round`;let g=e.createLinearGradient(0,y-15,0,y+15);g.addColorStop(0,`#fff2b0`),g.addColorStop(.45,`#ffb030`),g.addColorStop(1,`#b02a00`),e.shadowColor=`rgba(255,110,0,${.9*f})`,e.shadowBlur=18*f,e.lineWidth=5,e.strokeStyle=`#1a0800`,e.strokeText(`REMOD`,x,y),e.fillStyle=g,e.fillText(`REMOD`,x,y),e.restore()}}function Xt('],
  // 메인 로고 글자: SURVIVORS 대신 VAMPIRE (뱀파이어 리모드)
  ['screens', 'var Ft=`SURVIVORS`,', 'var Ft=` `,'],
  // 메인 메뉴 버튼을 18 내려서 REMOD 글자와 안 겹치게
  ['screens', 'd=u.map((e,t)=>290+t*40+', 'd=u.map((e,t)=>318+t*40+'],
  // 리모드는 따로 된 게임: 환경변수 없이 켜도 원본 세이브·공식 서버를 쓰지 않게 기본값을 리모드 것으로
  // 원작은 순위 서버 주소를 내 PC(127.0.0.1)만 허용: 바깥 리모드 서버(오라클)도 되게
  ['main', 'if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)) throw new Error(`D2S_LEADERBOARD_URL', 'if (!["http:", "https:"].includes(url.protocol)) throw new Error(`D2S_LEADERBOARD_URL'],
  ['main', '^', 'process.env.D2S_USER_DATA ||= require("node:path").join(process.env.APPDATA || "", "D2-Vampire-Remod' + (TEST ? '-Test' : '') + '"); process.env.D2S_LEADERBOARD_URL ||= "' + (TEST ? 'http://127.0.0.1:8520' : SERVER_URL) + '";'], // 시험용은 기본 세이브·서버도 따로(로컬)
  ['main', 'title: "D2 Survivors"', 'title: "D2 Vampire Remod' + (TEST ? ' (테스트)' : '') + '"'],
  // 윈도우가 원작과 다른 게임으로 보게(작업표시줄·실행 중 묶음 분리)
  ['main', 'import_electron4.app.setName("D2 Survivors");', 'import_electron4.app.setName("D2 Vampire Remod' + (TEST ? ' 테스트' : '') + '"); import_electron4.app.setAppUserModelId("D2VampireRemod' + (TEST ? 'Test' : '') + '");'],
  ['Game', '^', 'setInterval(()=>{document.title!==`D2 Vampire Remod`&&(document.title=`D2 Vampire Remod`)},1e3);'],
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
  ['ko', '"Larzuk\'s Essence":`라주크의 정수`', '"Larzuk\'s Essence":`라주크의 정수`,' + [...MATS.map(([e, , k]) => [e, k]), ...Object.entries(REIM.ko)].map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',')],
  // 기존 패치의 순위표 차단을 푼다: Remod 는 기록을 내 서버로 보낸다
  ['main', '    if (method === "POST" && path !== "/forge" && path !== "/hc/forge") return { status: 200, body: "{}", retryAfter: null };', ''],
  ['Game', 'try{localStorage.removeItem(`d2s:leaderboard-queue`)}catch{};', ''],
  // 레벨업 리롤 기본 2 → 5 (판 시작 값)
  ['saveTransfer', 'rerolls:2,skips:2,banishes:2', 'rerolls:5,skips:2,banishes:2'],
  // F7 배속: 일반은 1·1.5배만, GM(remod-gm.js 의 __isGM)만 10배까지
  ['Game', ';globalThis.__spd=l[(l.indexOf(globalThis.__spd)+1)%l.length]', ';l=globalThis.__isGM?[1,1.5,2,3,5,7,10]:[1,1.5];globalThis.__spd=l[(l.indexOf(globalThis.__spd)+1)%l.length]'], // 배속 목록(speeds.txt)과 상관없이
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
  ['saveTransfer', 'Nq(Rq,`essence`,B(`bet`,`bete`,1)),', 'Nq(Rq,`essence`,B(`bet`,`bete`,1)),...' + RUNES + '.map(([e,t],n)=>Nq(`${e} Rune`,`essence`,B(`r${String(n+1).padStart(2,`0`)}`,`rune`,t))),...' + MATS_JS + '.map(([e,c])=>Nq(e,`essence`,B(c,`bete`,1))),'],
  // 룬 그림: 인벤은 원작 룬 아이콘, 바닥은 라주크의 정수 그림을 빌려 씀
  ['saveTransfer', 'function LZe(e,t){if(!e)return null;', 'function LZe(e,t){if(!e)return null;{let i=globalThis.__MIimg?.[t.base];if(i?.complete)return{url:i.src,width:i.naturalWidth,height:i.naturalHeight}}if(globalThis.__MB?.has(t.base))t={...t,base:`Burning Essence of Terror`};if(/ Rune$/.test(t.base))return e.runeIcons?.[t.base.slice(0,-5)]??null;'],
  ['saveTransfer', 'function NZe(e,t){if(!e)return null;', 'function NZe(e,t){if(!e)return null;{let i=globalThis.__MIimg?.[t.base];if(i?.complete){let f=`remod/mat/${t.base}.png`,w=i.naturalWidth,h=i.naturalHeight;mQ.has(f)||mQ.set(f,{image:i,bytes:null,loading:Promise.resolve()});return(globalThis.__MIF??={})[t.base]??={sheet:{file:f,directions:1,framesPerDirection:1,frameWidth:w,frameHeight:h,originX:w>>1,originY:h},restTop:-h}}}if(globalThis.__MB?.has(t.base))return e.flippies[`Burning Essence of Terror`]??null;if(/ Rune$/.test(t.base))return e.flippies[`Larzuk\'s Essence`]??null;'],
  // 룬 드롭: 아이템이 떨어질 때 4% 확률로 룬 하나 더. 아이템 레벨 이하 룬 중 높은 룬일수록 드묾(한 단계마다 0.75배)
  ['saveTransfer', 'function wve(e,t,n,r,i,a=Math.random){', 'globalThis.__MB=new Set(' + MATS_JS + '.map(e=>e[0]));globalThis.__MIimg=Object.fromEntries(Object.entries(' + fs.readFileSync(path.join(__dirname, 'remod-mat-icons.json'), 'utf8') + ').map(([k,v])=>{let i=new Image;i.src=v;return[k,i]}));__MIimg[`Hero Token`]=Object.assign(new Image,{src:`../d2/items/invtoa.png`});function __md(e){return ' + MATS_JS + '.filter(([,,p,l])=>e>=l&&Math.random()<p).map(e=>e[0])}function __rn(e){let t=' + RUNES + '.filter(([,t])=>t<=Math.max(11,e)),n=t.map((e,t)=>.75**t),r=Math.random()*n.reduce((e,t)=>e+t,0);for(let e=0;e<t.length;e++)if((r-=n[e])<0)return`${t[e][0]} Rune`;return`El Rune`}function wve(e,t,n,r,i,a=Math.random){'],
  ['saveTransfer', 'e.terror&&Math.random()<.0018181818181818182&&K_(e,cX(l.level,1,Rq),t,n,!1,`essence`),l}', 'e.terror&&Math.random()<.0018181818181818182&&K_(e,cX(l.level,1,Rq),t,n,!1,`essence`),Math.random()<.04&&K_(e,cX(l.level,1,__rn(s)),t,n,!1,`essence`),__md(l.level).forEach(b=>K_(e,cX(l.level,1,b),t,n,!1,`essence`)),l}'],
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
  // 시험용: 소환수 목록을 밖에서 볼 수 있게(__kv(world))
  ['saveTransfer', 'function kv(e){let t=Ov.get(e);', 'globalThis.__kv=e=>kv(e);function kv(e){let t=Ov.get(e);'],
  // 새 유니크(드롭디아·sbd26) 비중 낮춤: 고를 때 가중치 0.27배(지옥 기준 새 템 79% → 약 50%)
  ['saveTransfer', 'XX=(()=>{let e=e=>Math.sqrt(CXe[e.name]??1),', 'XX=(()=>{let e=e=>Math.sqrt(CXe[e.name]??1)*(e.reim?.27:1),'],
  // 상점·도박 물건 그림도 1칸에 맞춰 줄인다(원래는 원래 크기로 그려 옆 칸과 겹침)
  ['saveTransfer', 't.src=e.icon.url,t.width=e.icon.width,t.height=e.icon.height,t.alt=e.name', 't.src=e.icon.url;let k=Math.min(1,a*28/e.icon.width,o*28/e.icon.height);t.width=Math.round(e.icon.width*k),t.height=Math.round(e.icon.height*k),t.alt=e.name'],
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
  // F2 렉: 유니크마다 붙은 "변동 옵션" 칸 속(요소 11만 개)을 <template> 에 두고 펼칠 때만 꺼낸다. 검색은 글자가 맞는 칸만 꺼냄
  ['Game', '</summary>${V.map(([st,lo,hi,L])=>`<div class="kvr"', '</summary><template>${V.map(([st,lo,hi,L])=>`<div class="kvr"'],
  ['Game', '이상 적용</span></div>`).join(``)}</details>`}', '이상 적용</span></div>`).join(``)}</template></details>`}'],
  ['Game', 'R=[...l.querySelectorAll(`.kvr`)]', 'R=(q&&l.querySelectorAll(`details.kv>template`).forEach(t=>t.content.textContent.toLowerCase().replace(/\\s+/g,``).includes(q)&&t.replaceWith(t.content)),[...l.querySelectorAll(`.kvr`)])'],
  ['Game', '^', 'document.addEventListener(`toggle`,e=>{let d=e.target,t=d.open&&d.classList?.contains(`kv`)&&d.querySelector(`:scope>template`);t&&t.replaceWith(t.content)},!0);\n'],
  // F2 보관 설정: 룬(c:rune), 일반 아이템은 부위·소켓 개수별(n:<부위>:<소켓>). 부위 w1 한손 무기, w2 양손 무기, h 투구, b 갑옷, s 방패, o 장갑·벨트·신발
  // 기본: 0소켓 판매(2), 1소켓 이상 인벤(1). 원래는 룬이 라주크의 정수 설정을 따라 팔렸고 일반 아이템은 F2 에 없어 다 팔렸음
  ['Game', 'globalThis.__ksk=e=>{let r=e.rarity;return ', 'globalThis.__ksk=e=>{let r=e.rarity;return e.type===`essence`&&/ Rune$/.test(e.base)?`c:rune`:r===`normal`&&[`weapon`,`shield`,`head`,`body`,`gloves`,`belt`,`boots`].includes(e.type)?`n:`+(e.type===`weapon`?(/2$/.test(globalThis.__kd?.(e)??``)?`w2`:`w1`):{head:`h`,body:`b`,shield:`s`}[e.type]??`o`)+`:`+(e.sockets??0):'],
  // 새 재료(룬 상자 등)도 essence 라 정수 설정을 따라 팔렸음. 재료마다 따로 판정(c:m:<영문>), 기본 인벤
  ['Game', 'e.type===`essence`?`c:essence`:e.base===`hcx`', 'e.type===`essence`?(globalThis.__MB?.has(e.base)?`c:m:`+e.base:`c:essence`):e.base===`hcx`'],
  ['Game', '"c:essence":1,"c:bet":1}', '"c:essence":1,"c:bet":1,"c:rune":1,' + MATS.map(([e]) => '"c:m:' + e + '":1,').join('') + '...Object.fromEntries([`w1`,`w2`,`h`,`b`,`s`,`o`].flatMap(g=>[0,1,2,3,4,5,6].map(n=>[`n:${g}:${n}`,n?1:2])))}'],
  ['Game', '${row(`c:bet`,`불타는 공포의 정수 (찰시 대장간 재료, 99개까지 겹침)`,`#fc6`)}', '${row(`c:bet`,`불타는 공포의 정수 (찰시 대장간 재료, 99개까지 겹침)`,`#fc6`)}${row(`c:rune`,`룬 (엘~조드)`,`#fa5`)}${(()=>{let G=[[`w1`,`한손 무기`],[`w2`,`양손 무기`],[`h`,`투구`],[`b`,`갑옷`],[`s`,`방패`],[`o`,`장갑·벨트·신발`]],S=[0,1,2,3,4,5,6];return`<div style="margin:6px 0 2px;color:#ccc">일반 아이템 (부위 · 소켓 개수별)</div><table style="border-collapse:collapse;font-size:12px"><tr><td></td>${S.map(n=>`<td style="padding:0 4px;color:#999">${n}소켓</td>`).join(``)}</tr>${G.map(([g,t])=>`<tr><td style="padding-right:6px;color:#ccc">${t}</td>${S.map(n=>{let k=`n:${g}:${n}`,v=__ks[k]??__ksd[k];return`<td><select data-k="${k}" style="color:${cl[v]}">${O.map(([a,b])=>`<option value="${a}"${a===v?` selected`:``}>${b}</option>`).join(``)}</select></td>`}).join(``)}</tr>`).join(``)}</table>`})()}'],
  ['Game', '${row(`c:rune`,`룬 (엘~조드)`,`#fa5`)}', '${row(`c:rune`,`룬 (엘~조드)`,`#fa5`)}' + MATS.map(([e, , k]) => '${row(`c:m:' + e + '`,`' + k + ' (강화 재료)`,`#fc6`)}').join('')],
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
  // 룬워드 완성품 드롭: 원작은 유니크와 비슷하게 자주 나옴 → 룬워드 등급이 뽑혀도 1% 만 통과(지금의 1/100, 한 판 10~20개 → 5~10판에 1개꼴). 나머지는 다음 등급(세트·레어…)으로
  ['saveTransfer', 'a(`unique`)?`unique`:a(`runeword`)?`runeword`', 'a(`unique`)?`unique`:a(`runeword`)&&Math.random()<.01?`runeword`'],
  // 일반 아이템 소켓이 룬으로 다 차고 순서·베이스가 룬워드 조합과 맞으면 그 자리에서 룬워드로 바뀐다 (바탕 종류까지 맞는 첫 조합, 생성 기록 roll 을 달아 변조 검사를 통과)
  ['saveTransfer', 'function eZe(e,t){if(!kZ(t)||!RZ(e))return!1;let{at:n,...r}=t;return e.socketed=[...e.socketed??[],r],!0}', 'function eZe(e,t){let R=/ Rune$/.test(t.base);if(!(kZ(t)||R)||!RZ(e)||R&&e.rarity===`runeword`)return!1;let{at:n,count:C,...r}=t;R&&(r.mods=BK(CK(I?.runes?.[t.base.slice(0,-5)]?.[dZ(e)]??[],r.level??1)));e.socketed=[...e.socketed??[],r];if(R&&e.rarity===`normal`&&e.socketed.length===e.sockets&&e.socketed.every(x=>/ Rune$/.test(x.base))){let w=e.socketed.map(x=>x.base.slice(0,-5)).join(),b=Bq.get(e.base),d=b&&YK.find(x=>x.runes.join()===w&&uZ(x,b)&&uK(x.name));if(d){let __own=e.own,__s=Cq(),z=Sq(__s,()=>hZ(d,b,!!e.ethereal,e.level,void 0)),id=e.id;for(let k of Object.keys(e))delete e[k];Object.assign(e,z,{id,roll:[cK()?2:1,__s],...__own&&{own:__own}})}}return R&&C>1?(t.count=C-1,2):!0}'],
  // 시험용: CDP 에서 룬 박기·룬워드 완성을 직접 불러 보기 위해 내보냄
  ['saveTransfer', 'function $Xe(e,t=Math.random){', 'globalThis.__remodT={eZe:(...a)=>eZe(...a),Bq:()=>Bq,OZ:(...a)=>OZ(...a),fK:(...a)=>fK(...a),eZ:(...a)=>eZ(...a),GJ:()=>GJ,CJ:()=>CJ,jw:(...a)=>iYe(...a),roll:(b,...a)=>cY(Bq.get(b),...a),rZ:(...a)=>rZ(...a),qK:()=>qK};function $Xe(e,t=Math.random){'],
  ['saveTransfer', 'function OZ(e){return(e.socketed??[]).filter(kZ).flatMap(', 'function OZ(e){return(e.socketed??[]).filter(e=>kZ(e)||/ Rune$/.test(e.base)).flatMap('],
  ['Game', 'if(!da(o))return!1;if(da(n))return!$a(n,o)', 'if(/ Rune$/.test(o.base)&&Fp(n)){let k;return r(()=>{k=La(n,o),k===!0&&delete a.cursor}),L(a),A(n.base),!!k}if(!da(o))return!1;if(da(n))return!$a(n,o)'],
  // 재료 창고: save.remodMats = {베이스 이름: 개수}. 창(remod-mats.js)과 넣기·꺼내기 동작
  // 재료 창고에 받는 퀘스트 아이템: 원작 코드 → 원작 이름(qg 키)
  ['Game', '^', 'globalThis.__qk={std:`standard`,toa:`token`};'],
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-mats.js'), 'utf8')],
  // 창고 편의(tools/remod-stash.js): 휠 탭 넘기기, 수집 범위(인벤·창고), Shift+우클릭 추출
  ['saveTransfer', '^', 'globalThis.__rwRunes=' + JSON.stringify(Object.fromEntries(Object.values(REIM.runewords).map((r) => [r.name, r.runes]))) + ';'], // 추출: 룬워드 이름 → 룬
  ['saveTransfer', '^', fs.readFileSync(path.join(__dirname, 'remod-stash.js'), 'utf8')],
  ['saveTransfer', '^', fs.readFileSync(path.join(__dirname, 'remod-popup.js'), 'utf8')], // 팝업 공통 D2 창 모양(class __d2p) // 게임의 창 전체 우클릭 처리보다 먼저 등록되게 saveTransfer 맨 앞(추출 Shift+우클릭)
  ['Game', 'openStashTab:e=>{this.stashTab=e,t()},', 'openStashTab:e=>{this.stashTab=e,t()},__ex:(globalThis.__extractDo=f=>{r.change(f),t()}),'], // 추출: 창고 바꾸기 + 다시 그리기
  ['Game', 'collectAll:()=>{let e=Zt(i,[s(),...Tr.map(e=>c(e).items)]);', 'collectAll:()=>{let CF=globalThis.__collectFrom?.()??{inv:1,st:1},e=Zt(i,[...CF.inv?[s()]:[],...CF.st?Tr.map(e=>c(e).items):[]]);'],
  ['Game', 'collect:lp(this.save,n).length', 'collect:lp(this.save,(CF=>[...CF.inv?this.inventoryOf(e):[],...CF.st?Tr.flatMap(t=>Kf(this.save,e,t)):[]])(globalThis.__collectFrom?.()??{inv:1,st:1})).length'],
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
  // 리모드참: 지옥 막 보스 5%, 공포 막 보스 10% (일반 드롭은 tools/remod-import.cjs 에서 999 로 막음)
  ['Game', 'actCleared(e=!1,t){let n=this.world,r=t??n.actBoss??n.player;', 'actCleared(e=!1,t){let n=this.world,r=t??n.actBoss??n.player;!e&&!n.farm&&Math.random()<(n.terror?.1:this.difficulty===`hell`?.05:0)&&Lu(n,Jr(`Narak Charm +0`,99),r.x,r.y,!1,`finale`);!e&&!n.farm&&(n.terror?.tier??0)>=100&&Math.random()<.15&&Lu(n,Jr(__T100[Math.floor(Math.random()*__T100.length)],99),r.x,r.y,!1,`finale`);'],
  ['Game', '^', 'globalThis.__T100=' + JSON.stringify(T100) + ';var __T100=globalThis.__T100;\n'],
  // 파티 공용 드롭(remod-party.js __mpLoot): 가로채면 바닥에 안 떨어뜨림. 액트 보스 드롭은 돌려준 값의 level 을 씀
  ['saveTransfer', 'function K_(e,t,n,r,i=!1,a){', 'function K_(e,t,n,r,i=!1,a){if(!i&&globalThis.__mpLoot?.(e,t,a))return{level:t.level};'],
  // 공용 드롭: 이긴 템을 내 발밑에 떨어뜨리도록 K_ 를 꺼냄
  ['saveTransfer', 'function pye(e,t){', 'globalThis.__K_=K_;function pye(e,t){'],
  // 시험·GM 용: 바닥에 아이템 떨어뜨리기 __lu(world,item,x,y), 유니크 만들기 __jr(name,lvl)
  ['Game', '^', 'globalThis.__lu=(...a)=>Lu(...a);globalThis.__jr=(...a)=>Jr(...a);'],
  // 호라드릭 큐브 창(tools/remod-cube.js)
  ['Game', '^', fs.readFileSync(path.join(__dirname, 'remod-cube.js'), 'utf8')],
  // 큐브 창 그림(원작 supertransmogrifier.dc6 → PNG, tools/remod-cube-art.json)
  ['Game', '^', 'globalThis.__cubeArt=' + fs.readFileSync(path.join(__dirname, 'remod-cube-art.json'), 'utf8') + ';'],
  ['Game', 'keepHeld:l,collectAll:', '__mats:(globalThis.__matsOut=(b,c)=>{let m=i.remodMats;if(!m?.[b])return;if(b.startsWith(`q:`)){let v=this.inventoryOf(e),q=0;r.change(()=>{for(;q<Math.min(c,m[b]);q++){let x=bp(b.slice(2)),p=Cn(v,x,O);if(!p)break;N(v,x,p)}m[b]-=q;m[b]<=0&&delete m[b]});q>0||this.hud.refuse(`Your inventory is full`);return t()}let q=Math.min(c,m[b],9999),x=Mr(1,q,b),v=this.inventoryOf(e);r.change(()=>{let w=Cc(v,x);if(w>0){let p=Cn(v,x,O);p?N(v,x,p):q-=w}m[b]-=q;m[b]<=0&&delete m[b]});q>0||this.hud.refuse(`Your inventory is full`);t()},globalThis.__matsAllIn=()=>{let v=this.inventoryOf(e);r.change(()=>{for(let x of[...v]){let m=i.remodMats??={},k=da(x)?x.base:cc(x)&&globalThis.__qk?.[x.base]?`q:`+__qk[x.base]:null;k&&(m[k]=(m[k]??0)+(x.count??1),T(v,x))}});t()},0),keepHeld:l,collectAll:'],
  // 창고를 연 채 인벤·창고의 재료를 우클릭하면 재료 창고로 들어간다 (라주크의 정수는 원래대로 우클릭 = 쓰기)
  ['Game', 'if(da(s))return Ta(s)?this.liftToUse(e,s,n,t):void 0;', 'if(cc(s)&&globalThis.__qk?.[s.base]&&n){let k=fc(i,e,s),L=k?Kf(i,e,k):this.inventoryOf(e);return r.change(()=>{let m=i.remodMats??={},q=`q:`+__qk[s.base];m[q]=(m[q]??0)+1;T(L,s)}),A(s.base),t()}if(da(s)){if(Ta(s))return this.liftToUse(e,s,n,t);if(!n)return;let k=fc(i,e,s),L=k?Kf(i,e,k):this.inventoryOf(e);return r.change(()=>{let m=i.remodMats??={};m[s.base]=(m[s.base]??0)+(s.count??1);T(L,s)}),A(s.base),t()}'],
  // 세이브 불러올 때 공포 기록 검사(Ru)에 걸려도 버리지 않음(리모드 방 판 등으로 판 단계·옵션이 원작 규칙과 달라도 기록 유지)
  ['saveTransfer', 'let t=Ru(e[i],n);if(t)r[i]=t;else if(n)return{ok:!1}', 'let t=Ru(e[i],n);if(t)r[i]=t;else if(n)return{ok:!1};else if(Pu(e[i]))r[i]=JSON.parse(JSON.stringify(e[i]))'],
  // 저장 후 나가기 뒤: 멀티는 대기실, 채팅창 [마을로]/[대기실로]로 고를 수 있음(remod-chat.js __afterLeave)
  ['Game', 'I()&&j(`hardcore: the check-out`,()=>this.hcEnd()),this.toMenu()}}', 'I()&&j(`hardcore: the check-out`,()=>this.hcEnd()),this.toMenu(),globalThis.__afterLeave?.()}}'],
  // 공포 포기 벌칙 없앰(리모드 규칙): 남은 판·다시하기를 두고 새 공포 판/다시하기를 시작해도 단계·경험치를 깎지 않고 남은 판만 비움. 판이 끝날 때(gat) 규칙은 그대로
  ['saveTransfer', 'if(i.replay&&Mu(e,t,r),i.playing!==void 0){Mu(e,t,r);', 'let M0=()=>{delete i.playing,delete i.replay,delete i.left};if(i.replay&&M0(),i.playing!==void 0){M0();'],
  ['saveTransfer', 'Tu(i)&&Mu(e,t,r);let a={tier:n', 'Tu(i)&&(delete i.playing,delete i.replay,delete i.left);let a={tier:n'],
  // 저장 후 나가기 확인 창(screens ii): 원작 [저장 후 나가기] 자리를 [저장 후 마을로]로, 그 아래 같은 원작 버튼 [저장 후 대기실로]를 더 그림. 판 안(__gm.world 이고 state 가 메인 메뉴 select·캐릭터 화면·로딩이 아님 — 판을 나와도 world 가 남음)일 때만, 메인 메뉴 나가기는 원작 그대로(remod-chat.js __afterLeave 가 갈 곳 처리)
  ['screens', 'p=l?new V(`wide`,c.buttons.wide,0,0,o,d):new V(`medium`,c.buttons.medium,0,0,`OK`,d),m=null', 'p=l&&globalThis.__gm?.world&&!/^(select|character|loading)$/.test(globalThis.__gm.state)?new V(`wide`,c.buttons.wide,0,0,`저장 후 마을로`,()=>{globalThis.__leaveTo=`town`,d()}):l?new V(`wide`,c.buttons.wide,0,0,o,d):new V(`medium`,c.buttons.medium,0,0,`OK`,d),P2=l&&globalThis.__gm?.world&&!/^(select|character|loading)$/.test(globalThis.__gm.state)?new V(`wide`,c.buttons.wide,0,0,`저장 후 대기실로`,()=>{globalThis.__leaveTo=`lobby`,d()}):null,m=null'],
  ['screens', '_=()=>[...f?[f]:[],...m?[]:[p]]', '_=()=>[...f?[f]:[],...m?[]:[p],...P2?[P2]:[]]'],
  ['screens', '_=r?X.height+Xr:p.height+12,', '_=r?X.height+Xr:p.height+12+(P2?P2.height+10:0),'],
  ['screens', 'else m=null,p.x=Math.round(x-p.width/2),p.y=T+2,p.draw(e,s)}', 'else m=null,p.x=Math.round(x-p.width/2),p.y=T+2,p.draw(e,s),P2&&(P2.x=p.x,P2.y=p.y+p.height+10,P2.draw(e,s))}'],
  // 야영지 포탈: 마을에서 시작할 때 고른 난이도(__campDiff: normal·nightmare·hell·terror·pvp)만 보임(remod-chars.js·remod-chat.js 가 정함)
  ['Game', 'open:Rl(r,n),kept:', 'open:globalThis.__campDiff?Rl(r,n).filter(x=>x===globalThis.__campDiff):Rl(r,n),kept:'],
  ['Game', 'terror:a&&o&&s?{tier:a.open', 'terror:a&&o&&s&&(!globalThis.__campDiff||globalThis.__campDiff===`terror`)?{tier:a.open'],
  // 창: 16:9(1920x1080 기준, 작업 영역·제목줄 안에 들어오게 줄임), 메뉴줄 숨김(Alt 로 보임, F11 전체 화면 그대로). 게임은 넓은 화면을 꽉 채워 그림
  ['main', "  const h = Math.max(600, Math.min(960, Math.round(height * 0.9)));\n  win = new import_electron4.BrowserWindow({\n    width: Math.round(h * 4 / 3),\n    height: h,\n    minWidth: 800,\n    minHeight: 600,", "  const { width: aw } = import_electron4.screen.getPrimaryDisplay().workAreaSize, w = Math.max(800, Math.min(1920, aw - 16, Math.round((height - 40) * 16 / 9))), h = Math.round(w * 9 / 16);\n  win = new import_electron4.BrowserWindow({\n    width: w,\n    height: h,\n    minWidth: 800,\n    minHeight: 450,\n    autoHideMenuBar: true,"],
  // 막 골라 시작(startAct): 원작 공포 판 만들기(Kse)처럼 영웅 저장본(Gp)을 복사해 난이도·막(1~5)만 바꿔 시작. 저장본이 없으면(새 캐릭터) 원래 새 판
  ['Game', 'startRun(e,t){P.start===0&&Yi(this.save,e.id)&&L(this.save);', 'startAct(e,t,a){let n=Gp(this.save,e.id);if(!n||!(a>1))return this.startRun(e,t);let r=JSON.parse(JSON.stringify(n));return this.startClass(e,t,{...r,difficulty:t,act:a,run:{...r.run,continuedAt:r.time}},`start`)}startRun(e,t){P.start===0&&Yi(this.save,e.id)&&L(this.save);'],
  // 제목·메뉴 배경을 D2R 인트로 영상으로(tools/remod-titlebg.js)
  ['screens', 'picture(e,t,n=0,r=0){let i=this.image(t);', 'picture(e,t,n=0,r=0){if(globalThis.__tv?.(e,t))return;let i=this.image(t);'],
  ['screens', '^', fs.readFileSync(path.join(__dirname, 'remod-titlebg.js'), 'utf8')],
  // 판매 문구를 화면 가운데에 띄우지 않음(획득 목록 [판매] 탭에 이미 남음)
  ['Game', 'r.sound&&A(`Gold`),this.hud.banner(r.text,`normal`,{key:`auto-sell`}),', 'r.sound&&A(`Gold`),'],
  ['Game', 'A(`Gold`),this.hud.banner(`Sold ${te(e.name,e.rarity,e.base)} for ${t} gold`,`normal`),', 'A(`Gold`),'],
  // 획득 목록(기존 패치)에서도 룬 이름을 한글로. 괄호에는 종류(부츠 등)가 나오는데 주얼·부적은 종류 칸이 없어 "()" 가 되므로, 칸이 셋(등급·분류·베이스)뿐이면 베이스를 종류 자리에 한 번 더 넣음
  ['Game', 'globalThis.__lg=(t,k,s,it)=>{', 'globalThis.__lg=(t,k,s,it)=>{t=t===void 0?t:String(t).replace(/\\b[A-Z][a-z]+ Rune\\b/g,m=>globalThis.__ko?.(m)??m);s=typeof s===`string`?s.split(` → `).map(x=>{let p=x.split(` · `);return p.length===3?[...p,p[2]].join(` · `):x}).join(` → `):s;'],
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
  ['Game', 'D2S v1.69</span>', 'D2 Vampire Remod v${__remodVer}' + (TEST ? ' (테스트)' : '') + '</span>'],
  // 레어 아이템(부적 빼고)은 15% 확률로 지금 직업의 단일 스킬 +1~2 가 하나 더 붙는다
  ['saveTransfer', 'function cY(e,t,n,r,i,a=2){t===`normal`', 'function cY(e,t,n,r,i,a=2){let __x=__cY0(e,t,n,r,i,a);__x?.type===`jewel`&&__x.mods?.forEach(m=>/^skill:/.test(m.stat)&&(m.staff=!0));if(__x?.rarity===`rare`&&__x.type!==`charm`&&Math.random()<.15&&!__x.mods?.some(m=>m.stat.startsWith(`skill:`))){let c=globalThis.__gm?.world?.player?.cls,L=' + JSON.stringify(Object.fromEntries(['amazon','sorceress','necromancer','assassin','barbarian','paladin','druid'].map((c) => [c, SKILLS.filter((k) => k[3] === c).map((k) => k[0])]))) + ',l=L[c]??Object.values(L)[Math.floor(Math.random()*7)];__x.mods=[...__x.mods??[],{stat:`skill:${l[Math.floor(Math.random()*l.length)]}`,value:1+(Math.random()<.3),staff:!0}]}return __x}function __cY0(e,t,n,r,i,a=2){t===`normal`'],
  // 위 레어 단일 스킬 옵션은 검사(인정 안 됨)에서 빼고 본다
  ['saveTransfer', 'function f2(e){if(e.type===`quest`)return null;', 'function f2(e){if(e.type===`quest`)return null;if((e.rarity===`rare`||e.type===`jewel`)&&e.type!==`charm`&&e.mods?.some(m=>m.staff&&/^skill:/.test(m.stat)&&m.value<=2))return f2({...e,mods:e.mods.filter(m=>!(m.staff&&/^skill:/.test(m.stat)&&m.value<=2))});'],
  ['saveTransfer', 'function m2(e){let t=', 'globalThis.__m2=e=>f2(e);function m2(e){let t='],
  // 세이브 불러오기 검사: 기술 칸 수(6~10) 제한을 뺀다. 전 기술 99레벨 시험 캐릭터가 불러올 때 버려지지 않게
  ['saveTransfer', 'function het(e,t,n){if(!Array.isArray(e)||e.length>n)return null;', 'function het(e,t,n){if(!Array.isArray(e))return null;'],
  // 원작 11-20 수정 옮김: 번개·죽음 파수기 재충전 3초 → 1.9초
  ['saveTransfer', 'into:`deathSentry`},cooldown:()=>3,', 'into:`deathSentry`},cooldown:()=>O(3.2,.93)(8),'],
  ['saveTransfer', 'mode:`S2`,cooldown:()=>3,describe:()=>`A sentry shoots lightning 5 times', 'mode:`S2`,cooldown:()=>O(3.2,.93)(8),describe:()=>`A sentry shoots lightning 5 times'],
  // 원작 11-20 신규 옮김: 화염·냉기·번개 숙련이 5레벨에서 피해 +8%·+8%·+14% (적 저항 낮추기는 그대로)
  ['saveTransfer', 'function gD(e,t,n,r){let i=e.pierce??={};i[t]=(i[t]??0)+hD(n)-hD(r)}', 'function gD(e,t,n,r){let i=e.pierce??={};i[t]=(i[t]??0)+hD(n)-hD(r);let c={fire:[30,7],cold:[30,7],lightning:[50,12]}[t],m=l=>l>0?Math.round(.05*Lf(c[0],c[1],w(l,5))):0;e.mastery[t]+=(m(n)-m(r))/100}'],
  // 원작 11-20 수정 옮김: 맹독 폭발 독 지속시간 D2 식(최대 레벨 9.6초, +스킬로 더 길어짐)
  ['saveTransfer', 'pa(e)?HO(ma(e,n)):VO.time(t),i)', 'pa(e)?HO(ma(e,n)):HO(w(Math.min(t,8),8)+4*Math.max(0,n-Math.min(t,8))),i)'],
  // 기록(runs·checks) 올릴 때 숨은 열쇠를 같이 보냄: 서버가 남의 이름·기록 덮어쓰기를 막음
  ['preload', 'leaderboard: (method, path, body) => import_electron.ipcRenderer.invoke("app:leaderboard", method, path, body),', 'leaderboard: (method, path, body) => { if (method === "POST" && /^\\/(hc\\/)?(runs|checks)$/.test(path) && typeof body === "string") try { const j = JSON.parse(body); j.__key = localStorage.getItem("d2s:key"); body = JSON.stringify(j); } catch {} return import_electron.ipcRenderer.invoke("app:leaderboard", method, path, body); },'],
  // 업데이트: 게임 안 [업데이트 하기] → 설치 폴더의 D2-Vampire-Remod.bat update 를 띄우고 게임을 끈다. 최신 버전은 GitHub version.txt
  ['preload', 'quit: () => import_electron.ipcRenderer.invoke("app:quit"),', 'quit: () => import_electron.ipcRenderer.invoke("app:quit"), remodUpdate: () => import_electron.ipcRenderer.invoke("remod:update"), remodLatest: () => import_electron.ipcRenderer.invoke("remod:latest"), remodDigest: () => import_electron.ipcRenderer.invoke("remod:digest"),'],
  ['main', '  import_electron4.ipcMain.handle("app:full-screen", (event) => {', `  // 게임 파일 지문: 켜질 때 app.asar 의 sha256. 캐릭터 시작 때 서버가 정상 지문과 비교(remod-guard.js)
  const remodDigest = (async () => { try { const h = require("node:crypto").createHash("sha256"); for await (const c of require("original-fs").createReadStream(require("node:path").join(process.resourcesPath, "app.asar"))) h.update(c); return h.digest("hex"); } catch { return null; } })();
  import_electron4.ipcMain.handle("remod:digest", () => remodDigest);
  import_electron4.ipcMain.handle("remod:latest", async () => { try { const r = await fetch("https://raw.githubusercontent.com/mastree-master/D2-Vampire-Remod/main/version.txt", { cache: "no-store", signal: AbortSignal.timeout(8e3) }); return r.ok ? (await r.text()).trim() : null; } catch { return null; } });
  import_electron4.ipcMain.handle("remod:update", (event) => {
    if (!event.senderFrame?.url.startsWith("app://game/")) throw new Error("Not the game page");
    const bat = require("node:path").join(process.env.LOCALAPPDATA || "", "D2-Vampire-Remod", "D2-Vampire-Remod.bat");
    if (!require("node:fs").existsSync(bat)) return false;
    // cmd 창 없이: bat 첫 줄과 같은 PowerShell(숨김)을 바로 띄움
    require("node:child_process").spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-Command", "$s=[IO.File]::ReadAllText($env:D2SF,[Text.Encoding]::UTF8); & ([scriptblock]::Create($s.Substring($s.IndexOf(\'#PS\'+\'START\')))) \'update\'"], { detached: true, stdio: "ignore", windowsHide: true, env: { ...process.env, D2SF: bat } }).unref();
    setTimeout(() => import_electron4.app.quit(), 300);
    return true;
  });
  import_electron4.ipcMain.handle("app:full-screen", (event) => {`],
  // 메인 화면 오른쪽 위: 원작 웹사이트·디스코드 버튼은 빼고 [새 소식](리모드 기록)만
  ['screens', 'w=()=>[S,x,...e.news?[b]:[]];', 'w=()=>[...e.news?[b]:[]];'],
  // 빌드 표시: 메인 화면 왼쪽 아래와 위쪽 표시줄을 리모드 버전으로(원작 빌드 번호 대신)
  ['screens', 't.print(r,m,8,572', 't.print(r,`D2 Vampire Remod · 빌드 ${globalThis.__remodVer??""}`,8,572'],
  ['Game', '<span style="color:#999">(게임 빌드 2026.1105.3)</span>', '<span style="color:#999">(빌드 ${__remodVer})</span>'],
  // 새 옵션이 붙었을 때 강화 결과 문구
  ['Game', 'return{text:n?`${zI} ${n.text}`:zI,', 'return{text:n?`${zI} ${n.text}`:u.line===`new`?`${zI} 새 옵션이 붙었습니다`:zI,'],
];

const unpacked = path.join(work, 'app');
ASAR.extract(myPatch(), unpacked);
const assets = path.join(unpacked, 'desktop', 'dist', 'web', 'assets');
// 같은 버전이면 어느 PC 에서 빌드해도 같은 app.asar 가 나오게: MyPatch 가 박는 빌드 시각(F5 설정 유효 시점)을 고정. 서버가 정상 지문과 비교함
{ const g = path.join(assets, fs.readdirSync(assets).find((x) => x.startsWith('Game-') && x.endsWith('.js'))); const t = fs.readFileSync(g, 'utf8'), u = t.replace(/(localStorage\.getItem\(`d2s:on`\)\|\|`null`\);if\(j&&j\.t>)\d{13}/g, (m, a) => a + '1795000000000'); if (u === t) throw new Error('MyPatch 빌드 시각을 못 찾음'); fs.writeFileSync(g, u); }
PATCHES.push(...require("./upstream-1122.cjs").filter((_, i) => !(process.env.SKIPUP ?? "").split(",").includes(String(i))));
for (const [prefix, find, replace] of PATCHES) {
  const desktop = prefix === 'main' || prefix === 'preload' || prefix === 'extract-worker';
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
// 워락: 직업별 표(7직업 키 객체)에 워락이 없으면 강령술사 값으로 채운다(위 PATCHES 로 직접 넣은 표는 그대로)
for (const prefix of ['Game', 'saveTransfer']) {
  const full = path.join(assets, fs.readdirSync(assets).find((f) => f.startsWith(prefix + '-') && f.endsWith('.js')));
  const r = require('./remod-warlock-tables.cjs')(fs.readFileSync(full, 'utf8'));
  fs.writeFileSync(full, r.text); execSync(`node --check "${full}"`);
  console.log(`워락 표 ${r.count}개: ${path.basename(full)}`);
}
// 추출 단계 목록에 "D2R 화면" 등록: 이미 추출한 PC 도 이 단계만 새로 돌린다(지문이 바뀌면 다시 꺼냄)
{
  const f = path.join(unpacked, 'desktop', 'dist', 'extract-parts.json'), j = JSON.parse(fs.readFileSync(f, 'utf8'));
  j.parts['D2R 화면'] = { fingerprint: 'remod-d2r-2', manifests: ['d2r.json'] };
  j.parts.Heroes.fingerprint += '-wk1'; // 워락 몸 그림을 꺼내도록 영웅 단계만 다시
  j.parts['Title and menus'].fingerprint += '-wk1'; // 워락 선택 화면 그림
  j.parts.Heroes.fingerprint += '3-scy-hd1'; /* -hd1: 워락 몸을 HD 3D 모델로 다시 뽑음 */ j.parts.Missiles.fingerprint += '-fx5'; // -fx5: 레거시 모드, HD 구운 그림(야만용사 함성 등) 지우고 원래 그림으로 다시 꺼냄
  // 소서리스 미리 구운 HD 그림(remodHdSorcFx)은 뺌: 탄은 입자 엔진이 그리고, 몹 맞음 그림으로 쓰일 때 둥근 덩어리가 돼서 원래 그림으로 // 워락 시전 효과(overlay)
  // 워락 동작 속도·소환수
  j.parts.Gear.fingerprint += '-wk1'; // 워락 장비 그림
  j.parts['Sounds and music'].fingerprint += '-wk1'; // 워락 스킬 소리
  j.parts.Automap.fingerprint += '-r2'; // 추출 화면 확인용 한 번
  j.parts.Interface.fingerprint += '-wk13'; // 워락 아이콘·스킬 트리, 하단 미니 메뉴 단추
  fs.writeFileSync(f, JSON.stringify(j));
}
// 한국어 번역 값(키 말고 :`값`)에 남은 원작 게임 이름을 리모드 이름으로
{
  const ko = path.join(assets, fs.readdirSync(assets).find((f) => f.startsWith('ko-') && f.endsWith('.js')));
  fs.writeFileSync(ko, fs.readFileSync(ko, 'utf8').replace(/:`[^`]*`/g, (v) => v.replaceAll('D2 Survivors', 'D2 Vampire Remod')));
  execSync(`node --check "${ko}"`);
}
// 추출·업데이트 화면(desktop/dist/setup): 로고 아래 SURVIVORS 글자를 VAMPIRE 로, 이름을 리모드 이름으로
{
  const dir = path.join(unpacked, 'desktop', 'dist', 'setup'), js = path.join(dir, 'setup.js'), html = path.join(dir, 'index.html');
  let t = fs.readFileSync(js, 'utf8');
  if (!t.includes('var TEXT = "SURVIVORS";')) throw new Error('setup.js: SURVIVORS 글자 자리 없음');
  t = t.replace('var TEXT = "SURVIVORS";', 'var TEXT = "VAMPIRE";');
  // 번역 표(ko.json)에 없는 화면 문구를 한글로. 번들 안에서는 ’ … 가 ’ … 로 적혀 있다
  const KO = [
    ['text', 'Point D2 Survivors at the folder that holds Diablo II\\u2019s .mpq files, or Diablo II: Resurrected\\u2019s.', '디아블로 2(.mpq 파일) 또는 디아블로 2 레저렉션이 설치된 폴더를 골라 주세요.'],
    ['label', 'Locate Diablo II\\u2026', '디아블로 2 폴더 찾기…'], ['heading', 'Reading Diablo II\\u2026', '디아블로 2 읽는 중…'], ['label', 'Extract', '추출'],
    ['heading', 'Updating game files\\u2026', '게임 파일 갱신 중…'],
    ['text', 'Copying your game files again, from your Diablo II folder. The game starts once they\\u2019re in place.', '디아블로 2 폴더에서 게임 파일을 다시 복사합니다. 끝나면 게임이 시작됩니다.'],
    ['text', 'This version reads some of your game files differently, so those are copied again. The game starts once they\\u2019re in place.', '이번 버전에서 바뀐 게임 파일만 다시 복사합니다. 끝나면 게임이 시작됩니다.'],
    ['heading', 'Extracting', '추출 중'], ['text', 'Copying your game files. This takes a minute or so, once.', '게임 파일을 복사합니다. 처음 한 번만, 1분쯤 걸립니다.'],
    ['label', 'Cancel', '취소'], ['heading', 'Ready', '준비 완료'], ['text', 'Your game files are in place, and stay on this computer.', '게임 파일이 준비됐습니다. 이 컴퓨터에만 저장됩니다.'], ['label', 'Play', '플레이'],
  ];
  for (const [k, en, ko] of KO) { const a = `${k}: "${en}"`; if (!t.includes(a)) throw new Error(`setup.js: 문구 없음 ${en}`); t = t.replaceAll(a, `${k}: ${JSON.stringify(ko)}`); }
  if (!t.includes('running : "Getting ready"}')) throw new Error('setup.js: Getting ready 없음');
  t = t.replace('running : "Getting ready"}', 'running : "준비 중"}');
  fs.writeFileSync(js, t.replaceAll('D2 Survivors', 'D2 Vampire Remod'));
  execSync(`node --check "${js}"`);
  // D2 그림을 읽기 전 첫 화면: 원작 불씨(#embers)·D2S 아이콘은 빼고 검정·핏빛 바탕, 제목 글자를 게임 로고의 VAMPIRE 처럼 핏빛으로
  const css = '<style>#embers,.icon{display:none!important}html,body{background:radial-gradient(ellipse at 50% 38%,#3a0606 0%,#120202 45%,#000 80%)!important}.wordmark{background:linear-gradient(#ffb0a0,#e0201a 45%,#6a0808)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;text-shadow:none!important;filter:drop-shadow(0 0 10px #a00)}</style>';
  fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replaceAll('D2 Survivors', 'D2 Vampire Remod').replace('</head>', css + '</head>'));
}
// 창·작업표시줄 아이콘: 원작 D2S 아이콘 대신 리모드 아이콘(레저렉션 런처 + DSV REMOD)
fs.copyFileSync(path.join(__dirname, 'remod.ico'), path.join(unpacked, 'desktop', 'dist', 'icon.ico'));
ASAR.pack(unpacked, OUT, OUT);
// 실행 파일도 리모드 이름으로(원작 실행 파일과 따로 보이게)
fs.copyFileSync(path.join(GAME, 'D2 Survivors.exe'), path.join(GAME, 'D2 Vampire Remod.exe'));
const hash = require('node:crypto').createHash('sha256').update(fs.readFileSync(OUT)).digest('hex');
fs.writeFileSync(path.join(path.dirname(OUT), 'app.asar.sha256'), hash);
fs.rmSync(work, { recursive: true, force: true });
console.log(`완성: ${OUT}`);
