// 드롭디아 클라(.bin)·사이트·sbd26 자료를 합쳐 리모드 유니크·세트·룬워드(remod-items.json)로 바꾸는 가져오기 스크립트
const fs = require('fs'), path = require('path');
const IS = require('../save/d2/itemstats.json');
const DESK = path.join(__dirname, '..', '..');
const EXCEL = path.join(DESK, 'dropdia-extract', 'data', 'global', 'excel');
const D2R = path.join(DESK, 'D2R-Remod', 'save', 'd2r', 'data', 'global', 'excel');

function txt(file) {
  const [head, ...rows] = fs.readFileSync(path.join(D2R, file), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
function bin(name, size) {
  const b = fs.readFileSync(path.join(EXCEL, name + '.bin'));
  const n = b.readUInt32LE(0);
  return Array.from({ length: n }, (_, i) => b.subarray(4 + i * size, 4 + (i + 1) * size));
}
const str = (r, o, n) => r.toString('latin1', o, o + n).replace(/\0.*$/s, '');

// 스탯 id → 이름 (원작 id 는 D2R 와 같음)
const iscName = Object.fromEntries(txt('base/itemstatcost.txt').map((r) => [r['*ID'], r.Stat]));
// 드롭디아 properties.bin: 속성 번호 → [{stat, func, val}]
// 스탯 없는 피해 func 5·6·7 은 원작 D2S 가 쓰는 스탯으로 풀어 줌
const NOSTAT = { 5: [['mindamage', 1]], 6: [['maxdamage', 1]], 7: [['item_maxdamage_percent', 1], ['item_mindamage_percent', 3]] };
const PROPS = bin('properties', 46).map((r) => {
  const out = [];
  for (let k = 0; k < 7; k++) {
    const func = r[0x18 + k], s = r.readUInt16LE(0x20 + k * 2), val = r.readUInt16LE(0x0a + k * 2);
    if (!func) continue;
    if (s === 0xffff) { for (const [stat, f] of NOSTAT[func] ?? []) out.push({ stat, func: f }); continue; }
    const e = { stat: iscName[s] ?? `stat${s}`, func };
    if (func === 21 || val) e.val = val;
    out.push(e);
  }
  return out;
});

function propList(r, at, count) {
  const out = [];
  for (let k = 0; k < count; k++) {
    const p = at + k * 16, id = r.readInt32LE(p);
    if (id < 0) continue;
    const stats = PROPS[id].map((s) => ({ ...s }));
    if (!stats.length) continue;
    const e = { stats, min: r.readInt32LE(p + 8), max: r.readInt32LE(p + 12) };
    const par = r.readInt32LE(p + 4);
    if (par) e.par = stats[0].stat === 'item_addskill_tab' ? Math.floor(par / 8) * 3 + par % 8 : par; // D2 탭 번호(×8) → D2S(×3)
    out.push(e);
  }
  return out;
}

// 베이스 코드 → D2S 베이스 이름
const BASE = {};
for (const f of ['armor.txt', 'weapons.txt', 'misc.txt']) for (const r of txt(f)) if (r.code) BASE[r.code] ??= r.name;

const uniques = bin('uniqueitems', 332).map((r) => ({
  key: str(r, 0x02, 32),
  code: str(r, 0x28, 4).trim(),
  enabled: !!(r.readUInt32LE(0x2c) & 1),
  level: r.readUInt16LE(0x34),
  lvlreq: r.readUInt16LE(0x36),
  props: propList(r, 0x8c, 12),
})).filter((u) => u.key);

module.exports = { uniques, PROPS, BASE, propList, bin, str, txt, IS };

if (require.main === module && process.argv[2] === 'check') {
  // 검사: 원작 유니크를 바꾼 결과가 D2S itemstats 와 같은 모양인지
  let same = 0, diff = 0;
  const key = (p) => p.stats.map((s) => `${s.stat}:${s.func}${s.val !== undefined ? ':' + s.val : ''}`).join(',') + `|${p.min}|${p.max}|${p.par ?? ''}`;
  for (const u of uniques) {
    const v = IS.uniques[u.key];
    if (!v) continue;
    const a = new Set(u.props.map(key)), b = new Set(v.props.map(key));
    const miss = [...b].filter((x) => !a.has(x)), extra = [...a].filter((x) => !b.has(x));
    if (!miss.length && !extra.length) same++;
    else if (diff++ < 6) console.log(u.key, '\n  D2S만:', miss, '\n  변환만:', extra);
  }
  console.log({ same, diff });
}

// ───────── 합치기: node tools/remod-import.cjs build ─────────
if (require.main === module && process.argv[2] === 'build') {
  const SB = require('./remod-sbd26.cjs');
  const ITEMS = path.join(DESK, 'D2R-아이템자료', '1-수집(사이트원본)');
  const KO = JSON.parse(fs.readFileSync(path.join(ITEMS, 'dropdia-bin', 'strings-ko.json'), 'utf8'));
  const OLD = JSON.parse(fs.readFileSync(path.join(__dirname, 'remod-items.json'), 'utf8'));
  const table = SB.learn(IS);
  const report = { skipped: {}, lostLines: 0, keptLines: 0 };
  const skip = (why) => (report.skipped[why] = (report.skipped[why] || 0) + 1);

  // 이름 겹침 검사: 원작 영문·한글 + 이미 넣은 것
  const takenEn = new Set([...Object.keys(IS.uniques), ...Object.keys(IS.setItems), ...Object.keys(IS.sets), ...Object.keys(IS.runewords), ...OLD.special].map((s) => s.toLowerCase()));
  const takenKo = new Set();
  // 원작 내부 이름(McAuley's Folly = Sander's Folly, Whichwild String 등)도 원작으로 침
  for (const e of JSON.parse(fs.readFileSync(path.join(D2R, '..', '..', 'local', 'lng', 'strings', 'item-names.json'), 'utf8').replace(/^﻿/, '')))
    if (e.enUS && takenEn.has(e.enUS.toLowerCase())) { takenEn.add(e.Key.toLowerCase()); if (e.koKR) takenKo.add(e.koKR); }
  const take = (en, ko) => {
    if (takenEn.has(en.toLowerCase()) || (ko && takenKo.has(ko))) return false;
    takenEn.add(en.toLowerCase());
    if (ko) takenKo.add(ko);
    return true;
  };
  const title = (s) => s.replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  const BAN = /홍보|적립/; // 돈·홍보 계열 제외
  const parseLines = (lines) => {
    const out = [];
    for (const l of lines) {
      const p = SB.parseLine(table, l.text);
      if (p && p.stats.every((s) => IS.stats[s.stat])) { out.push(p); report.keptLines++; } else report.lostLines++;
    }
    return out;
  };
  // 같은 스탯 묶음이 두 번 나오면 하나로 (서로 다른 문장이 같은 스탯으로 읽힌 경우)
  const dedupe = (props) => { const seen = new Set(); return props.filter((p) => { const k = JSON.stringify([p.stats, p.par]); if (seen.has(k)) return false; seen.add(k); return true; }); };

  const uniques = {}, drops = [], ko = {};
  // sbd26 에서 원작과 짝지어진 템의 옛 한글 이름 (드롭디아 강화판이 원작과 같은 한글을 쓰면 뒤에 번호를 붙임)
  const vanillaKo = new Set();
  for (const f of ['uniq.html', 'set.html']) for (const it of SB.items(f)) if ([...Object.keys(IS.uniques), ...Object.keys(IS.setItems)].some((k) => it.search.toLowerCase().includes(' ' + k.toLowerCase() + ' '))) vanillaKo.add(it.ko);
  // 1) 드롭디아 클라 유니크 (수치 정확)
  for (const u of uniques_dd()) {
    if (!u.enabled) { skip('dd 꺼짐'); continue; }
    let k = KO[u.key];
    if (!k) { skip('dd 원작(한글 없음)'); continue; }
    if (BAN.test(k)) { skip('dd 홍보·적립'); continue; }
    // 드롭디아 참: 리모드참(n)·티리얼/심장(wa~we)·초반/중반/후반참(zc1~3) → 거대 부적. +1 이상은 큐브 강화로만 (드롭 레벨 999) 리모드참 +0 도 999: 지옥·공포 막 보스만 떨어뜨림(build.cjs actCleared)
    const charm = /^(n\d\d|w[a-e]\d|zc[1-3])$/.test(u.code);
    const base = charm ? 'Grand Charm' : BASE[u.code];
    if (!base || !IS.bases[base]) { skip('dd 베이스 없음(참 등)'); continue; }
    if (charm) {
      const en = u.key;
      if (!take(en, k)) { skip('dd 참 겹침'); continue; }
      uniques[en] = { level: u.lvlreq, props: dedupe(u.props.filter((p) => p.stats.every((s) => IS.stats[s.stat]))) };
      drops.push([en, base, / \+[1-9]\d*$/.test(en) || /^Narak/.test(en) ? 999 : Math.max(u.level, u.lvlreq)]);
      ko[en] = k;
      report.charms = (report.charms ?? 0) + 1;
      continue;
    }
    const props = u.props.filter((p) => p.stats.every((s) => IS.stats[s.stat]));
    if (props.length < 2) { skip('dd 옵션 부족'); continue; }
    const en = u.key.replace(/(\D)(\d+)$/, '$1 $2');
    if (vanillaKo.has(k) || takenKo.has(k)) k += ' ' + ((en.match(/ (\d+)$/) || [])[1] ?? '+');
    if (!take(en, k)) { skip('dd 이름 겹침'); continue; }
    uniques[en] = { level: u.lvlreq, props: dedupe(props) };
    drops.push([en, base, u.level]);
    ko[en] = k;
  }
  // 2) sbd26 유니크 (단계 77/85/95/100 모두)
  for (const it of SB.items('uniq.html')) {
    const m = it.search.match(new RegExp(`^${esc(it.ko)} ${esc(it.base)} (.+?) ${it.code}( |$)`));
    if (!m) { skip('sbd 영문 못 찾음'); continue; }
    const base = BASE[it.code];
    if (!base || !IS.bases[base]) { skip('sbd 베이스 없음'); continue; }
    const en = title(m[1]);
    if (BAN.test(it.ko)) { skip('sbd 홍보·적립'); continue; }
    const props = dedupe(parseLines(SB.propLines(it)));
    if (props.length < 2) { skip('sbd 옵션 부족'); continue; }
    if (!take(en, it.ko)) { skip('sbd 이름 겹침'); continue; }
    uniques[en] = { level: it.lvl, props };
    drops.push([en, base, Math.min(it.ilvl || it.lvl, 99)]);
    ko[en] = it.ko;
  }

  // 3) sbd26 세트: 같은 세트 이름(base 칸)끼리 묶고, 영문 공통 꼬리 = 세트 영문 이름
  const setItems = {}, sets = {}, setDrops = [];
  const bySet = {};
  for (const it of SB.items('set.html')) (bySet[it.base] ??= []).push(it);
  for (const [setKo, list] of Object.entries(bySet)) {
    const ens = list.map((it) => (it.search.match(new RegExp(`^${esc(it.ko)} \\S+(?: \\S+)*? ([a-z'].*?) ${it.code}( |$)`)) || [])[1]);
    if (ens.some((e) => !e)) { skip('set 영문 못 찾음'); continue; }
    const words = ens.map((e) => e.split(' '));
    let n = 0;
    while (n < Math.min(...words.map((w) => w.length)) - 1 && words.every((w) => w[w.length - 1 - n] === words[0][words[0].length - 1 - n])) n++;
    if (list.length < 2 || !n) { skip('set 세트 이름 못 찾음'); continue; }
    const setEn = title(words[0].slice(-n).join(' '));
    if (takenEn.has(setEn.toLowerCase()) || BAN.test(setKo)) { skip('set 원작·겹침'); continue; }
    const tag = (l) => /\(풀세트\)$/.test(l.text) ? 'full' : (l.text.match(/\((\d)개 착용\)$/) || [])[1] ?? (/\(특정 조각 착용 시\)$/.test(l.text) ? 'item' : 'own');
    // 색: 3 = 아이템 자체 옵션, 2 = 이 아이템 조각 보너스, 4 = 세트 전체 보너스(금색)
    const partial = [[], [], [], [], []], full = [];
    const memberNames = new Set(list.map((x) => x.ko).concat(setKo));
    const noTag = (t) => ({ text: t.replace(/ \((풀세트|특정 조각 착용 시|\d개 착용)\)$/, '') });
    for (const l of list[0].lines.filter((x) => x.color === 4 && !memberNames.has(x.text))) {
      const t = tag(l);
      if (t === 'full') full.push(...parseLines([noTag(l.text)]));
      else if (/^\d$/.test(t)) partial[+t - 2]?.push(...parseLines([noTag(l.text)]));
    }
    if (!take(setEn, setKo)) { skip('set 이름 겹침'); continue; }
    sets[setEn] = { partial: partial.slice(0, Math.max(1, list.length - 1)), full: dedupe(full) };
    ko[setEn] = setKo;
    list.forEach((it, i) => {
      const en = title(words[i].slice(0, words[i].length - n).join(' ')) || `${setEn} ${i + 1}`;
      const base = BASE[it.code];
      if (!base || !IS.bases[base]) { skip('set 베이스 없음'); return; }
      const own = parseLines(SB.propLines({ lines: it.lines.filter((l) => l.color === 3) }));
      const bonus = parseLines(it.lines.filter((l) => l.color === 2).map((l) => noTag(l.text)));
      if (!take(en, it.ko)) { skip('set템 이름 겹침'); return; }
      setItems[en] = { level: it.lvl, props: dedupe(own), bonus: bonus.map((b) => [b]), bonusBy: 'item', set: setEn };
      setDrops.push([en, setEn, base, Math.min(it.ilvl || it.lvl, 99)]);
      ko[en] = it.ko;
    });
  }

  // 4) 룬워드: sbd26 + 드롭디아 사이트
  const RUNE = ['El', 'Eld', 'Tir', 'Nef', 'Eth', 'Ith', 'Tal', 'Ral', 'Ort', 'Thul', 'Amn', 'Sol', 'Shael', 'Dol', 'Hel', 'Io', 'Lum', 'Ko', 'Fal', 'Lem', 'Pul', 'Um', 'Mal', 'Ist', 'Gul', 'Vex', 'Ohm', 'Lo', 'Sur', 'Ber', 'Jah', 'Cham', 'Zod'];
  const RKO = { 엘: 0, 엘드: 1, 티르: 2, 네프: 3, 에드: 4, 아이드: 5, 탈: 6, 랄: 7, 오르트: 8, 주울: 9, 앰: 10, 솔: 11, 샤에: 12, 돌: 13, 헬: 14, 포: 15, 룸: 16, 코: 17, 팔: 18, 렘: 19, 풀: 20, 우움: 21, 말: 22, 아이스트: 23, 굴: 24, 벡스: 25, 오움: 26, 로: 27, 수르: 28, 베르: 29, 조: 30, 차암: 31, 조드: 32 };
  const TYPE = {
    '몸통 방어구': ['tors'], 갑옷: ['tors'], 방어구: ['tors'], 해머: ['hamm'], 망치: ['hamm'], 투구: ['helm'], '드루이드 펠트': ['pelt'], 방패: ['shld'],
    폴암: ['pole'], 셉터: ['scep'], 원거리무기: ['miss'], '원거리 무기': ['miss'], 도끼: ['axe'], 스태프: ['staf'], 지팡이: ['staf'], 무기: ['weap'],
    검: ['swor'], 근접무기: ['mele'], '근접 무기': ['mele'], '소서리스 오브': ['orb'], '바바리안 투구': ['phlm'], '팔라딘 방패': ['ashd'], '성기사 방패': ['ashd'],
    '아마존 보우': ['abow'], 창: ['spea'], '어쌔씬 클로': ['h2h'], 클로: ['h2h'], '네크로 헤드': ['head'], 클럽: ['club'], 곤봉: ['club'], 서클릿: ['circ'],
    메이스: ['mace'], 완드: ['wand'], '아마존 창': ['aspe'], 벨트: ['belt'], 장갑: ['glov'], 신발: ['boot'],
  };
  const types = (s) => { const out = s.split(',').map((x) => TYPE[x.trim()]); return out.every(Boolean) ? [...new Set(out.flat())] : null; };
  const runewords = {};
  const addRw = (en, k, runes, ty, props, src) => {
    if (!runes || runes.some((r) => r === undefined)) return skip(src + ' 룬 모름');
    if (!ty) return skip(src + ' 부위 모름');
    if (props.length < 2) return skip(src + ' 옵션 부족');
    if (!take(en, k)) return skip(src + ' 이름 겹침');
    runewords[en] = { name: en, runes, types: ty, props: dedupe(props) };
    ko[en] = k;
  };
  const sbRw = Object.fromEntries(fs.readFileSync(path.join(ITEMS, 'sbd26', 'runewords.md'), 'utf8').split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| 이름')).map((l) => { const c = l.split(' | '); return [c[0].slice(2), c[3].split(' + ').map((x) => RUNE[RKO[x.trim()]])]; }));
  for (const it of SB.items('rune.html')) {
    const m = it.search.match(new RegExp(`^${esc(it.ko)} ([a-z' -]+?) [가-힣]`));
    addRw(m ? title(m[1].trim()) : it.ko, it.ko, sbRw[it.ko], types(it.base), parseLines(SB.propLines(it)), 'rw-sbd');
  }
  const ddMd = fs.readFileSync(path.join(ITEMS, 'dropdia', 'runewords.md'), 'utf8').replace(/\r/g, '');
  for (const m of ddMd.matchAll(/^- \*\*(.+?)\*\* (.+)\n((?:  - .+\n?)*)/gm)) {
    if (/^고급/.test(m[1])) { skip('rw-dd 고급 룬'); continue; }
    const runes = [...m[2].matchAll(/(\d+)번/g)].map((x) => RUNE[+x[1] - 1]);
    const ty = types((m[2].match(/아이템: (.+)$/) || [])[1] ?? '');
    const lines = m[3].split('\n').filter(Boolean).map((l) => ({ text: l.replace(/^  - /, '') }));
    addRw(`Dropdia ${m[1]}`, m[1], runes, ty, parseLines(lines), 'rw-dd');
  }

  // 5) 워락판: 소서리스 전용(직업 스킬 1·탭 3~5·소서 단일 스킬) 템을 복제해 워락(7·탭 21~23)으로 바꿈
  //    불 → 혼돈(23), 번개 → 기괴(22), 냉기 → 악마(21). 소서 단일 스킬은 같은 계열 탭 보너스로. 오브는 비슷한 레벨 한손검으로
  const W = { cls: 1, to: 7, tab: { 3: 23, 4: 22, 5: 21 } };
  const sorSkill = Object.fromEntries(Object.entries(IS.skills).filter(([, s]) => s.cls === 'sor').map(([id], i) => [id, 3 + Math.floor(i / 10)]));
  const WEAP = txt('weapons.txt');
  const orbNames = new Set(WEAP.filter((r) => r.type === 'orb').map((r) => r.name));
  const swords = WEAP.filter((r) => r.type === 'swor' && !r['1or2handed'] && IS.bases[r.name]).map((r) => [r.name, +r.level]);
  const orbLevel = Object.fromEntries(WEAP.filter((r) => r.type === 'orb').map((r) => [r.name, +r.level]));
  const toSword = (base) => orbNames.has(base) ? swords.reduce((a, b) => Math.abs(b[1] - orbLevel[base]) < Math.abs(a[1] - orbLevel[base]) ? b : a)[0] : base;
  const isSor = (props) => props.some((p) => p.stats.some((s) => (s.stat === 'item_addclassskills' && s.val === W.cls) || (s.stat === 'item_addskill_tab' && W.tab[p.par]) || (s.stat === 'item_singleskill' && sorSkill[p.par])));
  const toWar = (props) => dedupe(props.map((p) => {
    const s0 = p.stats[0];
    if (s0.stat === 'item_addclassskills' && s0.val === W.cls) return { ...p, stats: [{ ...s0, val: W.to }] };
    if (s0.stat === 'item_addskill_tab' && W.tab[p.par]) return { ...p, par: W.tab[p.par] };
    if (s0.stat === 'item_singleskill' && sorSkill[p.par]) return { stats: [{ stat: 'item_addskill_tab', func: 10 }], min: p.min, max: p.max, par: W.tab[sorSkill[p.par]] };
    return p;
  }));
  const wEn = (en) => `${en} (Warlock)`, wKo = (k) => `${k} (워락)`;
  const war = { uniques: 0, sets: 0, runewords: 0 };
  for (const [en, u] of Object.entries(uniques)) {
    if (!isSor(u.props)) continue;
    const d = drops.find((x) => x[0] === en);
    if (!take(wEn(en), wKo(ko[en]))) continue;
    uniques[wEn(en)] = { level: u.level, props: toWar(u.props) };
    drops.push([wEn(en), toSword(d[1]), d[2]]);
    ko[wEn(en)] = wKo(ko[en]);
    war.uniques++;
  }
  for (const [setEn, s] of Object.entries(sets)) {
    const members = Object.entries(setItems).filter(([, v]) => v.set === setEn);
    if (!members.some(([, v]) => isSor(v.props)) && !isSor([...s.full, ...s.partial.flat()])) continue;
    if (!take(wEn(setEn), wKo(ko[setEn]))) continue;
    sets[wEn(setEn)] = { partial: s.partial.map(toWar), full: toWar(s.full) };
    ko[wEn(setEn)] = wKo(ko[setEn]);
    for (const [en, v] of members) {
      if (!take(wEn(en), wKo(ko[en]))) continue;
      const d = setDrops.find((x) => x[0] === en);
      setItems[wEn(en)] = { ...v, props: toWar(v.props), bonus: v.bonus.map(toWar), set: wEn(setEn) };
      setDrops.push([wEn(en), wEn(setEn), toSword(d[2]), d[3]]);
      ko[wEn(en)] = wKo(ko[en]);
    }
    war.sets++;
  }
  for (const [en, r] of Object.entries(runewords)) {
    if (!isSor(r.props)) continue;
    if (!take(wEn(en), wKo(ko[en]))) continue;
    runewords[wEn(en)] = { name: wEn(en), runes: r.runes, types: r.types.map((t) => (t === 'orb' ? 'swor' : t)), props: toWar(r.props) };
    ko[wEn(en)] = wKo(ko[en]);
    war.runewords++;
  }
  report.warlock = war;

  // ko: 특수(유니크 부적·쥬얼)는 그대로 유지
  for (const s of OLD.special) if (OLD.ko[s]) ko[s] = OLD.ko[s];
  // 특수 유니크 정의·드롭도 그대로(11/22 교체 때 이름만 남고 빠졌던 것)
  for (const s of OLD.special) { if (OLD.uniques[s] && !uniques[s]) uniques[s] = OLD.uniques[s]; const d = OLD.drops.find((x) => x[0] === s); if (d && !drops.some((x) => x[0] === s)) drops.push(d); }
  const out = { ...OLD, uniques, drops, ko, setItems, sets, setDrops, runewords };
  fs.writeFileSync(path.join(__dirname, 'remod-items.json'), JSON.stringify(out));
  console.log({
    uniques: Object.keys(uniques).length, setItems: Object.keys(setItems).length, sets: Object.keys(sets).length,
    runewords: Object.keys(runewords).length, special: OLD.special.length,
    lines: `${report.keptLines} 읽음 / ${report.lostLines} 버림`, warlock: report.warlock, charms: report.charms, skipped: report.skipped,
  });
}
function uniques_dd() { return uniques; }
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
