const { openD2RFolder } = require('./casc.cjs');
const a = openD2RFolder('C:/Program Files (x86)/Diablo II Resurrected');
const txt = (p) => Buffer.from(a.read(p)).toString('latin1');
const rows = txt('data/global/excel/skills.txt').split(/\r?\n/).map(l => l.split('\t'));
const h = rows[0]; const ci = h.indexOf('charclass'), si = h.indexOf('skill');
const c = {}; for (const r of rows.slice(1)) c[r[ci]] = (c[r[ci]] || 0) + 1; console.log(c);
console.log(rows.filter(r => r[ci] === 'war').map(r => r[si]).join(', '));
const cs = txt('data/global/excel/charstats.txt').split(/\r?\n/).find(l => /^Warlock/.test(l)); console.log(cs?.slice(0, 400));
for (const t of ['WL','WA','wa','wl','WR']) console.log(t, ['data/global/chars/'+t+'/cof/'+t+'nuhth.cof','data/hd/global/chars/'+t].map(p=>!!a.read(p)));
