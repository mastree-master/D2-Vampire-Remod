// D2S Remod 서버: 게임 순위표·대장간 요청을 공식 서버 대신 처리한다 (기록은 data/db.json)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 8520);
const DATA = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA, 'db.json');

// 대장간 규칙: 내 서버라 마음대로 정한다
const TEMPER_CHANCE = 1; // 강화 성공 확률
const HELLFORGE_CHANCE = 1; // 헬포지 두 배 확률 (실패하면 전부 잃음)
const TEMPER_MAX = 10;
const NEW_LINE_CHANCE = 0.1; // 강화 성공 때 새 옵션이 붙을 확률 (유니크·세트·룬워드처럼 stats 가 있는 아이템만)
const NEW_LINES = Object.entries(JSON.parse(fs.readFileSync(path.join(__dirname, 'new-lines.json'), 'utf8'))); // 원작 접두사·접미사 수치 범위
// 강화 가능한 줄: 원작 클라이언트 규칙(saveTransfer Lqe/uq/Fqe)을 그대로 옮김. 다르면 게임이 강화된 줄을 못 보여 줌
const STAT_OK = new Set(fs.readFileSync(path.join(__dirname, 'temper-stats.txt'), 'utf8').trim().split('.'));
const SKILL_STAT = new Set(['item_allskills', 'item_elemskill', 'item_addclassskills', 'item_addskill_tab', 'item_singleskill', 'item_nonclassskill', 'item_aura', 'item_magicarrow', 'item_explosivearrow']);
const PROC_STAT = new Set(['item_skillonhit', 'item_skillonattack', 'item_skillongethit', 'item_skillonkill', 'item_skillondeath', 'item_skillonlevelup', 'item_charged_skill']);
const MOD_LEVEL = /^(allSkills|fireSkills|coldSkills|lightningSkills|skilltabd+|classskillsd+|skill:.+|oskill:.+|aura:.+|magicArrows|explosiveArrows)$/;
const MOD_NO = /^(cannotBeFrozen|halfFreeze|knockback|ignoreDefense|preventHeal|restInPeace|lightRadius|proc:.+|charge:.+)$/;
const NEGATIVE_GOOD = new Set(['item_fractionaltargetac', 'item_damagetargetac']);
const PAIRS = new Map([['item_mindamage_percent', 'item_maxdamage_percent'], ['mindamage', 'maxdamage'], ['firemindam', 'firemaxdam'], ['lightmindam', 'lightmaxdam'], ['coldmindam', 'coldmaxdam'], ['magicmindam', 'magicmaxdam'], ['poisonmindam', 'poisonmaxdam'], ['minDamage', 'maxDamage'], ['fireMinDamage', 'fireMaxDamage'], ['lightningMinDamage', 'lightningMaxDamage'], ['coldMinDamage', 'coldMaxDamage'], ['magicMinDamage', 'magicMaxDamage'], ['poisonMinDamage', 'poisonMaxDamage']].flatMap(([a, b]) => [[a, b], [b, a]]));
function okLine([stat, value, ...rest], isStat) {
  if (isStat) {
    if (PROC_STAT.has(stat)) return (rest.at(-1) ?? 0) > 0 && value > 0;
    if (SKILL_STAT.has(stat)) return value > 0;
    if (!STAT_OK.has(stat)) return false;
  } else {
    if (MOD_NO.test(stat)) return false;
    if (MOD_LEVEL.test(stat)) return value > 0;
  }
  return NEGATIVE_GOOD.has(stat) ? value < 0 : value > 0;
}
// ponytail: 압축 아이템에 implicit 표시가 없어 mods 의 implicit 줄은 못 거름. 게임이 못 보여 주는 줄이 가끔 나올 수 있음
function linesOf(list, isStat) {
  const used = new Set(), keys = [];
  (list ?? []).forEach((line, i) => {
    if (used.has(i) || !okLine(line, isStat)) return;
    const pair = PAIRS.get(line[0]);
    const j = pair === undefined ? -1 : list.findIndex((l, k) => k > i && !used.has(k) && l[0] === pair);
    used.add(i); if (j >= 0) used.add(j);
    keys.push(`${isStat ? 's' : 'm'}${i}`);
  });
  return keys;
}

fs.mkdirSync(DATA, { recursive: true });
// ponytail: JSON 파일 하나에 전부. 몇백 명 넘어가면 SQLite 로 옮길 것
const db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : { runs: {}, forge: {} };
let saveTimer = null;
const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => fs.writeFileSync(DB_FILE, JSON.stringify(db)), 500); };
const log = (entry) => fs.appendFileSync(path.join(DATA, 'log.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');

const boardOf = (r) => (r.board?.kind === 'tier' ? `tier-${r.board.tier}` : r.board?.kind ?? 'normal');
const rowOf = (r) => ({
  id: r.runId, player: r.player, name: r.name, class: r.hero?.class, level: r.hero?.level, time: r.time,
  endedAt: r.endedAt, flags: [], continued: !!r.continued, glow: !!r.hero?.glow, replay: !!r.replay, act: r.act,
  build: (r.hero?.skills ?? []).map(({ id, name, level }) => ({ id, name, level })),
});
const runsOf = (hc) => Object.values(db.runs).filter((r) => !!r.hc === hc);
// 플레이어마다 그 판에서 가장 빠른 기록 하나만 순위에 올린다
function board(id, cls, hc) {
  const best = new Map();
  for (const r of runsOf(hc)) {
    if (boardOf(r) !== id || (cls && r.hero?.class !== cls)) continue;
    const old = best.get(r.player);
    if (!old || r.time < old.time) best.set(r.player, r);
  }
  const rows = [...best.values()].sort((a, b) => a.time - b.time).slice(0, 100).map((r, i) => ({ rank: i + 1, ...rowOf(r) }));
  return { board: id, total: best.size, rows, unverified: [] };
}
function tiers(hc) {
  const by = new Map();
  for (const r of runsOf(hc)) {
    if (r.board?.kind !== 'tier') continue;
    const t = by.get(r.board.tier) ?? { tier: r.board.tier, runs: 0, players: new Set(), best: null };
    t.runs++; t.players.add(r.player);
    if (!t.best || r.time < t.best.time) t.best = { time: r.time, name: r.name, class: r.hero?.class };
    by.set(r.board.tier, t);
  }
  const list = [...by.values()].sort((a, b) => a.tier - b.tier).map((t) => ({ ...t, players: t.players.size }));
  return { highest: list.at(-1)?.tier ?? 0, tiers: list };
}
function player(id, hc) {
  const runs = runsOf(hc).filter((r) => r.player === id).sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  return { player: id, runs: runs.map((r) => ({ rank: 0, ...rowOf(r), kept: true, board: boardOf(r) })) };
}
function search(name, hc) {
  const by = new Map();
  for (const r of runsOf(hc)) {
    if (!r.name?.toLowerCase().includes(name.toLowerCase())) continue;
    const p = by.get(r.player) ?? { player: r.player, name: r.name, classes: [], level: 0, runs: 0, last: r.endedAt };
    if (!p.classes.includes(r.hero?.class)) p.classes.push(r.hero?.class);
    p.level = Math.max(p.level, r.hero?.level ?? 0); p.runs++;
    if (r.endedAt > p.last) p.last = r.endedAt;
    by.set(r.player, p);
  }
  return { name, players: [...by.values()] };
}

const hashOf = (f) => crypto.createHash('sha256').update(JSON.stringify([f.t, f.hf ?? 0, f.x ?? []])).digest('hex').slice(0, 16);
const sumOf = (t) => Object.values(t).reduce((a, b) => a + b, 0);
function forge({ player: who, act, item }) {
  if (!item?.i) return [400, { ok: false, error: 'item' }];
  const key = `${who}:${item.i}`;
  const f = db.forge[key] ?? item.f ?? { t: {} };
  const done = (outcome, extra = {}) => {
    f.h = hashOf(f); db.forge[key] = f; save();
    return [200, { ok: true, outcome, forge: f, ...extra }];
  };
  if (act === 'look') return done('look');
  if (act === 'claim') return [200, { ok: true, outcome: 'claimed' }];
  if (act === 'clean') { f.t = {}; return done('cleaned'); }
  if (act === 'hellforge') {
    if (f.hf) return [200, { ok: false, why: 'used' }];
    if (sumOf(f.t) < TEMPER_MAX) return [200, { ok: false, why: 'not_yet' }];
    f.hf = 1;
    if (Math.random() < HELLFORGE_CHANCE) { for (const k in f.t) f.t[k] *= 2; return done('god'); }
    f.t = {}; return done('brick');
  }
  if (act === 'temper') {
    if (item.r === 'm') return [200, { ok: false, why: 'magic' }];
    if (sumOf(f.t) >= TEMPER_MAX * (f.hf ? 2 : 1) || f.hf) return [200, { ok: false, why: 'full' }];
    const lines = item.s ? linesOf(item.s, true) : linesOf(item.m, false); // ponytail: 유니크의 auto·staff mods 줄은 뺐음
    if (!lines.length) return [200, { ok: false, why: 'no_lines' }];
    if (Math.random() >= TEMPER_CHANCE) return done('missed');
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    if (item.s && Math.random() < NEW_LINE_CHANCE) {
      const [stat, [lo, hi]] = pick(NEW_LINES);
      const roll = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
      f.x = [...(f.x ?? []), { stat, value: roll(lo, hi) }];
      const pair = PAIRS.get(stat), range = NEW_LINES.find(([k]) => k === pair)?.[1];
      if (range) f.x.push({ stat: pair, value: roll(...range) }); // 최소·최대 피해는 같이 붙인다
      f.t[`x${f.x.length}`] = 1; // 강화 횟수 1 로 친다 (s·m 이 아닌 키라 기존 줄에는 영향 없음)
      return done('took', { line: 'new' });
    }
    const line = pick(lines);
    f.t[line] = (f.t[line] ?? 0) + 1;
    return done('took', { line });
  }
  return [200, { ok: false, why: 'no_upgrade' }]; // upgrade: 아직 없음
}

const send = (res, status, obj) => res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }).end(JSON.stringify(obj));

// 채팅: 일반(room, 같은 대기방)·전체(all)·거래(trade)·길드(guild). 최근 500줄만 메모리에 둔다
// 길드: db.guilds {이름: {leader, members: [이름], notice, created}}. 길드장만 공지·추방, 길드장이 나가면 다음 사람이 길드장
// ponytail: 이름만으로 사람을 구분해 남의 이름을 쓸 수 있음. 여러 사람이 쓰게 되면 플레이어 id 로 묶는다
const chat = [];
let chatId = Date.now(); // 서버를 다시 켜도 번호가 앞으로만 가게(클라이언트는 since 이후만 받음)
db.guilds ??= {};
// 접속 확인: db.seen {이름: 마지막으로 채팅 창이 확인한 시각}. 40초 안이면 접속 중. 파일 저장은 1분에 한 번만
db.seen ??= {};
let seenSaved = 0;
const ONLINE_MS = 40e3;
function touch(name) { db.seen[name] = Date.now(); if (Date.now() - seenSaved > 60e3) { seenSaved = Date.now(); save(); } }
for (const g of Object.values(db.guilds)) g.leader ??= g.members[0];
const clean = (s, n) => String(s ?? '').replace(/\p{Cc}/gu, '').trim().slice(0, n);
const guildOf = (name) => Object.keys(db.guilds).find((g) => db.guilds[g].members.includes(name)) ?? null;
function chatPost({ ch, name, text, room }) {
  name = clean(name, 16); text = clean(text, 200); room = clean(room, 24) || '로비';
  if (!name || !text || !['room', 'all', 'trade', 'guild'].includes(ch)) return [400, { error: 'bad' }];
  const guild = guildOf(name);
  if (ch === 'guild' && !guild) return [400, { error: 'no_guild' }];
  room = roomOf(name) ?? LOBBY;
  chat.push({ id: ++chatId, t: Date.now(), ch, name, guild, text, ...ch === 'room' && { room } });
  if (chat.length > 500) chat.shift();
  return [201, { id: chatId }];
}
function chatGet(since, name, room) {
  name = clean(name, 16);
  const guild = guildOf(name);
  if (name) touch(name);
  room = name ? roomSeen(name, roomOf(name) ?? LOBBY) : LOBBY; // 방은 서버가 기억(입장·퇴장은 /room)
  return { guild, room, mail: db.mail[name]?.length ?? 0, members: Object.keys(rooms[room]?.seen ?? {}), rows: chat.filter((m) => m.id > since && (m.ch !== 'guild' || m.guild === guild) && (m.ch !== 'room' || m.room === room)) };
}
// 대기방: rooms {방이름: {pw, owner, seen: {이름: 마지막 확인 시각}}}. 로비는 늘 있음. 30초 동안 확인이 없으면 나간 것으로 보고, 빈 방은 지운다
// 비밀번호가 있는 방은 목록에 안 나온다(원작 디아처럼 이름·비번을 알아야 들어감)
const rooms = { 로비: { pw: '', owner: '', seen: {} } };
const LOBBY = '로비';
function roomTick() {
  const now = Date.now();
  for (const [r, v] of Object.entries(rooms)) {
    for (const [n, t] of Object.entries(v.seen)) if (now - t > 30e3) delete v.seen[n];
    if (r !== LOBBY && !Object.keys(v.seen).length) delete rooms[r];
  }
}
function roomOf(name) { roomTick(); return Object.keys(rooms).find((r) => rooms[r].seen[name]) ?? null; }
function roomSeen(name, room) {
  if (!name) return LOBBY;
  if (!rooms[room]) room = LOBBY;
  for (const v of Object.values(rooms)) if (v !== rooms[room]) delete v.seen[name];
  rooms[room].seen[name] = Date.now();
  return room;
}
function roomList() { roomTick(); return Object.entries(rooms).filter(([, v]) => !v.pw).map(([r, v]) => ({ room: r, count: Object.keys(v.seen).length, owner: v.owner, hard: !!v.hard })); }
function roomAct({ act, name, room, pw }) {
  name = clean(name, 16); room = clean(room, 24); pw = clean(pw, 24);
  if (!name) return [400, { error: 'bad' }];
  roomTick();
  if (act === 'leave') return [200, { room: roomSeen(name, LOBBY) }];
  if (!room) return [400, { error: 'bad' }];
  if (act === 'create') { if (rooms[room]) return [400, { error: 'exists' }]; rooms[room] = { pw, owner: name, seen: {}, hard: !!arguments[0].hard }; return [200, { room: roomSeen(name, room) }]; }
  if (act === 'join') { const v = rooms[room]; if (!v) return [404, { error: 'not_found' }]; if (v.pw && v.pw !== pw) return [403, { error: 'bad_pw' }]; if (room !== LOBBY && !v.seen[name] && Object.keys(v.seen).length >= 4) return [403, { error: 'full' }]; /* 파티 방은 4명까지 */ return [200, { room: roomSeen(name, room) }]; }
  return [400, { error: 'bad' }];
}
// 아이템 우편: db.mail {받는 이름: [{from, item, t}]}. 받는 사람 채팅 창이 확인할 때 꺼내 간다(공유 창고 9로)
// ponytail: 아이템 내용을 검사하지 않음(내 서버·아는 사람끼리 전제). 모르는 사람과 쓰게 되면 서버에서 아이템을 검사한다
db.mail ??= {};
function mailSend({ from, to, item }) {
  from = clean(from, 16); to = clean(to, 16);
  if (!from || !to || from === to || !item || typeof item !== 'object' || JSON.stringify(item).length > 20000) return [400, { error: 'bad' }];
  if (!db.seen[to]) return [404, { error: 'no_player' }];
  (db.mail[to] ??= []).push({ from, item, t: Date.now() });
  save();
  return [201, {}];
}
// 보스 탑 순위: db.tower {보스: {이름: {time, tier, t}}}. 보낸 기록이 더 길 때만 바꾼다. 공포 100 이상을 깬 기록만
const TOWERS = ['andariel', 'duriel', 'mephisto', 'diablo', 'baalcrab'];
db.tower ??= {};
function towerPost({ name, boss, time, tier }) {
  if (!TOWERS.includes(boss) || !(time > 0 && time < 864e5) || !(tier >= 100)) return [400, { error: 'bad' }];
  const b = (db.tower[boss] ??= {}), old = b[name];
  if (!old || time > old.time) { b[name] = { time: Math.floor(time), tier: Math.floor(tier), t: Date.now() }; save(); }
  return [200, { ok: true }];
}
function towerGet() { return Object.fromEntries(TOWERS.map((k) => [k, Object.entries(db.tower[k] ?? {}).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.time - a.time).slice(0, 20)])); }
function mailTake(name) { name = clean(name, 16); const m = db.mail[name] ?? []; delete db.mail[name]; if (m.length) save(); return m; }
// 사람 구분: 설치마다 만든 숨은 열쇠(key) → {tag: 00001~99999 랜덤 번호, nick}. 보이는 이름은 "닉네임#번호"
// 채팅·방·길드·우편은 열쇠로 이름을 찾아 쓰므로 남의 이름을 쓸 수 없다. 닉네임은 바꿔도 번호는 그대로
db.ids ??= {};
const who = (key) => { const v = typeof key === 'string' && db.ids[key]; return v ? `${v.nick}#${v.tag}` : null; };
function idSet({ key, nick }) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9-]{20,64}$/.test(key)) return [400, { error: 'bad' }];
  nick = clean(nick, 12).replace(/#/g, '');
  const v = db.ids[key];
  if (!v) {
    const used = new Set(Object.values(db.ids).map((x) => x.tag));
    if (used.size >= 99999) return [503, { error: 'full' }];
    let tag;
    do tag = String(1 + Math.floor(Math.random() * 99999)).padStart(5, '0'); while (used.has(tag));
    db.ids[key] = { tag, nick: nick || '리모드', at: Date.now() };
  } else if (nick && nick !== v.nick) {
    // 닉네임을 바꾸면 길드·접속 기록의 이름도 같이 바꾼다
    const old = who(key);
    v.nick = nick;
    const now = who(key);
    for (const g of Object.values(db.guilds)) { g.members = g.members.map((m) => (m === old ? now : m)); if (g.leader === old) g.leader = now; }
    if (db.seen[old]) { db.seen[now] = db.seen[old]; delete db.seen[old]; }
    if (db.mail[old]) { db.mail[now] = db.mail[old]; delete db.mail[old]; }
  }
  save();
  return [200, { name: who(key), tag: db.ids[key].tag }];
}
// 함께 보기: 같은 방 사람의 위치·모습. pos {이름: {x, y, place, fx, img, v, t}}. 5초 동안 소식이 없으면 안 보냄
// place 가 같은 사람끼리만 서로 그린다(마을 camp, 던전 run:<막>:<지역>). 모습(img, webp 데이터 URL)은 바뀔 때만 받아 v 를 올린다
const pos = {};
function posSet(name, { x, y, place, fx, img, cls, lvl, hp }) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [400, { error: 'bad' }];
  const o = (pos[name] ??= { v: 0 });
  Object.assign(o, { x, y, place: clean(place, 40), fx: fx < 0 ? -1 : 1, t: Date.now(), cls: clean(cls, 16), lvl: Number(lvl) || 0, hp: Math.max(0, Math.min(1, Number(hp) || 0)) });
  if (typeof img === 'string' && img.startsWith('data:image/') && img.length < 60000 && img !== o.img) { o.img = img; o.v++; }
  return [200, {}];
}
function posGet(name, img) {
  if (img) return pos[img]?.img ?? null;
  const room = roomOf(name) ?? LOBBY, now = Date.now();
  return Object.keys(rooms[room]?.seen ?? {}).filter((n) => n !== name && pos[n] && now - pos[n].t < 5e3).map((n) => ({ name: n, x: pos[n].x, y: pos[n].y, place: pos[n].place, fx: pos[n].fx, v: pos[n].v, cls: pos[n].cls, lvl: pos[n].lvl, hp: pos[n].hp }));
}
// 파티 전투: 방장(방을 만든 사람)이 몬스터를 계산해 0.1초마다 snap 을 올리고, 파티원은 그걸 받아 같은 몬스터를 본다
// 파티원이 때린 피해(hits [[몬스터 id, 피해]])는 방장에게 모아 두었다가 방장이 가져가서 적용한다. 로비는 방장이 없어 파티 없음
const party = {};
function partyPost(name, { snap, hits }) {
  const room = roomOf(name);
  if (!room || room === LOBBY) return [400, { error: 'no_party' }];
  const pt = (party[room] ??= { snap: null, hits: [] });
  if (rooms[room].owner === name && snap && typeof snap === 'object') pt.snap = { ...snap, t: Date.now() };
  if (Array.isArray(hits)) for (const h of hits.slice(0, 200)) if (Array.isArray(h) && Number.isFinite(h[0]) && Number.isFinite(h[1]) && h[1] > 0) pt.hits.push([h[0], h[1], name]);
  if (pt.hits.length > 2000) pt.hits.splice(0, pt.hits.length - 2000);
  return [200, {}];
}
function partyGet(name) {
  const room = roomOf(name);
  if (!room || room === LOBBY) return { role: 'solo' };
  const pt = party[room], host = rooms[room].owner;
  const hard = !!rooms[room].hard, size = Object.keys(rooms[room].seen).length;
  if (host === name) { const hits = pt?.hits ?? []; if (pt) pt.hits = []; return { role: 'host', hits, hard, size, members: Object.keys(rooms[room].seen) }; }
  const live = pt?.snap && Date.now() - pt.snap.t < 3e3 && rooms[room].seen[host];
  return { role: live ? 'guest' : 'solo', host, hard, size, snap: live ? pt.snap : null };
}
function guildInfo(g) {
  const v = db.guilds[g];
  return v ? { guild: g, leader: v.leader, members: v.members, notice: v.notice ?? '', seen: Object.fromEntries(v.members.map((m) => [m, db.seen[m] ?? 0])), now: Date.now(), onlineMs: ONLINE_MS } : null;
}
function guildAct({ act, name, guild, target, text }) {
  name = clean(name, 16); guild = clean(guild, 16);
  if (!name) return [400, { error: 'bad' }];
  const now = guildOf(name), g = now && db.guilds[now];
  if (act === 'leave') {
    if (g) { g.members = g.members.filter((m) => m !== name); if (!g.members.length) delete db.guilds[now]; else if (g.leader === name) g.leader = g.members[0]; save(); }
    return [200, { guild: null }];
  }
  if (act === 'kick' || act === 'notice') {
    if (!g || g.leader !== name) return [403, { error: 'not_leader' }];
    if (act === 'kick') { if (target === name) return [400, { error: 'bad' }]; g.members = g.members.filter((m) => m !== target); }
    else g.notice = clean(text, 120);
    save();
    return [200, guildInfo(now)];
  }
  if (!guild || now) return [400, { error: now ? 'in_guild' : 'bad' }];
  if (act === 'create') { if (db.guilds[guild]) return [400, { error: 'exists' }]; db.guilds[guild] = { leader: name, members: [name], notice: '', created: Date.now() }; }
  else if (act === 'join') { if (!db.guilds[guild]) return [404, { error: 'not_found' }]; db.guilds[guild].members.push(name); }
  else return [400, { error: 'bad' }];
  save();
  return [200, guildInfo(guild)];
}

http.createServer(async (req, res) => {
  const u = new URL(req.url.replace(/^\/api\/leaderboard/, ''), 'http://x');
  const p = u.pathname, q = u.searchParams, hc = q.get('mode') === 'hc' || p.startsWith('/hc/');
  let body = '';
  for await (const chunk of req) body += chunk;
  if (!((p === '/chat' || p === '/pos') && req.method === 'GET') && p !== '/pos' && p !== '/party') log({ method: req.method, url: u.pathname + u.search, size: body.length, body: body.slice(0, 2000) }); // 채팅 받기(2초마다)는 기록 안 함
  let json = null;
  try { json = body ? JSON.parse(body) : null; } catch {}

  if (req.method === 'OPTIONS') return res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' }).end();
  // 최신 리모드 버전: server/remod-version.json {ver, url, note}. 게임이 켜질 때 물어보고, 자기 버전이 낮으면 업데이트 전까지 못 함
  if (p === '/ver') { let v = {}; try { v = JSON.parse(fs.readFileSync(path.join(__dirname, 'remod-version.json'), 'utf8')); } catch {} return send(res, 200, v); }
  if (p === '/id') { const [s, o] = idSet(json ?? {}); return send(res, s, o); }
  // 채팅·방·길드·우편: 열쇠로 찾은 이름만 쓴다(보낸 이름은 무시)
  if (['/chat', '/room', '/guild', '/mail', '/pos', '/party', '/tower'].includes(p)) {
    const me = who(json?.key ?? q.get('key'));
    if (req.method === 'POST') { if (!me) return send(res, 401, { error: 'no_id' }); json.name = me; json.from = me; }
    else q.set('name', me ?? '');
  }
  if (p === '/chat') { if (req.method === 'GET') return send(res, 200, chatGet(Number(q.get('since')) || 0, q.get('name'), q.get('room'))); const [s, o] = chatPost(json ?? {}); return send(res, s, o); }
  if (p === '/party') { if (req.method === 'GET') return send(res, 200, partyGet(q.get('name'))); const [s, o] = partyPost(json.name, json); return send(res, s, o); }
  if (p === '/pos') { if (req.method === 'GET') return send(res, 200, posGet(q.get('name'), q.get('img'))); const [s, o] = posSet(json.name, json); return send(res, s, o); }
  if (p === '/tower') { if (req.method === 'GET') return send(res, 200, towerGet()); const [s, o] = towerPost(json ?? {}); return send(res, s, o); }
  if (p === '/mail') { if (req.method === 'GET') return send(res, 200, mailTake(q.get('name'))); const [s, o] = mailSend(json ?? {}); return send(res, s, o); }
  if (p === '/room') { if (req.method === 'GET') return send(res, 200, roomList()); const [s, o] = roomAct(json ?? {}); return send(res, s, o); }
  if (p === '/guild') { if (req.method === 'GET') return send(res, 200, q.get('g') ? guildInfo(q.get('g')) : Object.entries(db.guilds).map(([g, v]) => ({ guild: g, leader: v.leader, members: v.members.length }))); const [s, o] = guildAct(json ?? {}); return send(res, s, o); }
  if (req.method === 'GET') {
    if (p === '/tiers') return send(res, 200, tiers(hc));
    if (p.startsWith('/boards/')) return send(res, 200, board(p.slice(8), q.get('class'), hc));
    if (p.startsWith('/runs/')) return db.runs[p.slice(6)] ? send(res, 200, db.runs[p.slice(6)]) : send(res, 404, { error: 'not_found' });
    if (p.startsWith('/players/')) return send(res, 200, player(decodeURIComponent(p.slice(9)), hc));
    if (p === '/players') return send(res, 200, search(q.get('name') ?? '', hc));
    // ponytail: 하드코어 순위(hc/ladder) 형식은 아직 모름. 공식 서버는 안 쓰고 빈 목록을 준다
    return send(res, 200, { rows: [], total: 0 });
  }

  if (p === '/forge' || p === '/hc/forge') { const [s, o] = forge(json ?? {}); return send(res, s, o); }
  // 공포 영역은 /checks 로 단계마다 {record, k} 가 온다. 같은 runId 는 최신으로 덮어쓴다
  const run = p === '/checks' ? json?.record : (p === '/runs' || p === '/hc/runs') ? json : null;
  if (run?.runId) { db.runs[run.runId] = { ...run, hc: p === '/hc/runs' }; save(); }
  send(res, 201, {});
}).listen(PORT, '127.0.0.1', () => console.log(`D2S Remod 서버 http://127.0.0.1:${PORT}`));
