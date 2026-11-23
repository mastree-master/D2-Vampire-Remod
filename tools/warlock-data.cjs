// D2R 설치본에서 워락 스킬 30개의 수치·아이콘·트리 위치·한글 이름/설명을 뽑아 tools/warlock-skills.json 으로 저장
const fs = require('node:fs'), path = require('node:path');
const { openCascFolder } = require('./casc.cjs');
const c = openCascFolder(process.argv[2] || 'C:/Program Files (x86)/Diablo II Resurrected');
const B = String.fromCharCode(92);
const read = (...p) => Buffer.from(c.read('data:' + ['data', ...p].join(B)));
const table = (n) => { const t = read('global', 'excel', n).toString('latin1').split(/\r?\n/).filter(Boolean).map((l) => l.split('\t')); const h = t[0]; return t.slice(1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? '']).filter(([, v]) => v !== ''))); };
const strings = new Map(JSON.parse(read('local', 'lng', 'strings', 'skills.json').toString('utf8').replace(/^\uFEFF/, '')).map((e) => [e.Key, e]));
const descs = new Map(table('skilldesc.txt').map((r) => [r.skilldesc, r]));
const KEEP = ['Id', 'skill', 'stsound', 'dosound', 'castoverlay', 'reqlevel', 'maxlvl', 'reqskill1', 'reqskill2', 'reqskill3', 'EDmgSymPerCalc', 'DmgSymPerCalc', 'Param9', 'Param10', 'srvmissile', 'srvmissilea', 'srvmissileb', 'cltmissile', 'cltmissilea', 'summon', 'pettype', 'aurastate', 'passivestate', 'EType', 'EMin', 'EMax', 'EMinLev1', 'EMinLev2', 'EMinLev3', 'EMinLev4', 'EMinLev5', 'EMaxLev1', 'EMaxLev2', 'EMaxLev3', 'EMaxLev4', 'EMaxLev5', 'MinDam', 'MaxDam', 'EDmgSymPerCalc', 'DmgSymPerCalc', 'ELen', 'ELevLen1', 'mana', 'lvlmana', 'minmana', 'delay', 'Param1', 'Param2', 'Param3', 'Param4', 'Param5', 'Param6', 'Param7', 'Param8', 'calc1', 'calc2', 'calc3', 'calc4', 'passive', 'aura', 'range'];
const clean = (s) => s?.replace(/\s+/g, ' ').trim();
const out = table('skills.txt').filter((r) => r.charclass === 'war').map((r) => {
  const d = descs.get(r.skilldesc) ?? {};
  const name = strings.get(d['str name']), long = strings.get(d['str long']), short = strings.get(d['str short']);
  return {
    ...Object.fromEntries(KEEP.filter((k) => r[k] !== undefined).map((k) => [k, r[k]])),
    page: +d.SkillPage || 0, row: +d.SkillRow || 0, column: +d.SkillColumn || 0, icon: d.IconCel === undefined ? null : +d.IconCel,
    en: name?.enUS, ko: clean(name?.koKR), koDesc: clean(long?.koKR ?? short?.koKR), enDesc: clean(long?.enUS ?? short?.enUS),
  };
});
const missiles = table('missiles.txt'), want = new Set(out.flatMap((s) => [s.srvmissile, s.srvmissilea, s.srvmissileb, s.cltmissile, s.cltmissilea]).filter(Boolean));
const M = Object.fromEntries(missiles.filter((m) => want.has(m.Missile)).map((m) => [m.Missile, Object.fromEntries(['Vel', 'MaxVel', 'Range', 'LevRange', 'CelFile', 'animrate', 'AnimLen', 'Light', 'SubMissile1', 'HitSubMissile1', 'ExplosionMissile', 'EType', 'EMin', 'EMax', 'MinDamage', 'MaxDamage'].filter((k) => m[k] !== undefined).map((k) => [k, m[k]]))]));
// 트리 이름(StrSklTree*) 한글
const ui = JSON.parse(read('local', 'lng', 'strings', 'ui.json').toString('utf8').replace(/^\uFEFF/, ''));
const trees = ui.filter((e) => /^StrSklTree/.test(e.Key) && /warlock|demon|eldritch|chaos|hex|summon/i.test(e.enUS ?? '')).map((e) => [e.Key, e.enUS, e.koKR]);
// 워락 시전 효과(overlay) 줄: 옛 표(base)엔 이름만 있어 진짜 표에서 가져감
const overlays = table('overlay.txt').filter((r) => r.Character === 'warlock' || /^warlock/.test(r.overlay));
fs.writeFileSync(path.join(__dirname, 'warlock-skills.json'), JSON.stringify({ skills: out, missiles: M, trees, overlays }, null, 1));
console.log(overlays.length, 'overlays', out.length, 'skills', Object.keys(M).length, 'missiles', trees.length, 'trees');
