// D2R 접두사·접미사 표에서 스탯별 수치 범위를 뽑아 server/new-lines.json 으로 저장한다
const fs = require('fs'), path = require('path');
const { openD2RFolder } = require('./casc.cjs');
const a = openD2RFolder('C:/Program Files (x86)/Diablo II Resurrected');
const table = (n) => { const [h, ...rows] = Buffer.from(a.read(`data/global/excel/${n}.txt`)).toString('latin1').split(/\r?\n/).filter(Boolean).map((l) => l.split('\t')); return rows.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };
const prop = new Map(table('properties').map((p) => [p.code, p.stat1]));
const ok = new Set(fs.readFileSync(path.join(__dirname, '../server/temper-stats.txt'), 'utf8').trim().split('.'));
const out = {};
for (const row of [...table('magicprefix'), ...table('magicsuffix')]) for (const i of [1, 2, 3]) {
  const stat = prop.get(row[`mod${i}code`]), lo = Number(row[`mod${i}min`]), hi = Number(row[`mod${i}max`]);
  if (!stat || !ok.has(stat) || !(hi > 0) || row[`mod${i}param`]) continue;
  const r = out[stat] ?? [lo, hi]; out[stat] = [Math.min(r[0], lo), Math.max(r[1], hi)];
}
fs.writeFileSync(path.join(__dirname, '../server/new-lines.json'), JSON.stringify(out, null, 1));
console.log(Object.keys(out).length, JSON.stringify(out).slice(0, 600));
