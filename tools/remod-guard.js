// 세이브 보호·변조 검사: 캐릭터 시작 전에 레벨·아이템을 검사하고 서버(/guard)에 물어 막힌 캐릭터(변조·복사본·차단)는 시작 못 하게 한다
// 아이템은 roll 시드로 원본(hY → __regen)을 다시 만들어 비교: 원본보다 수치가 높거나 원본에 없는 줄이 있으면 변조
// ponytail: 일반·매직·레어는 다시 만드는 함수에 roll 에 없는 값이 들어가 비교 못 함. 에딧이 그쪽으로 몰리면 수치 범위 검사를 붙일 것
(() => {
  const QUEST = new Set(['Token of Absolution', 'Horadric Malus', 'Key to the Cairn Stones', "Wirt's Leg"]); // roll 없이 생기는 퀘스트 아이템
  const MAX_LEVEL = 99;
  const key = () => { try { return localStorage.getItem('d2s:key'); } catch { return null; } };
  const api = async (method, path, body) => {
    const k = key();
    if (!k) return null;
    try { const r = await globalThis.d2app?.leaderboard?.(method, path, body && JSON.stringify({ ...body, key: k })); return JSON.parse(r?.body ?? 'null'); } catch { return null; }
  };
  const itemsIn = (root) => {
    const out = [], seen = new Set();
    const walk = (o, d) => { if (!o || typeof o !== 'object' || seen.has(o) || d > 8) return; seen.add(o); if (o.base && o.rarity && o.id) out.push(o); for (const k in o) walk(o[k], d + 1); };
    walk(root, 0);
    return out;
  };
  const line = (x) => `${x.stat}${x.param ?? ''}`;
  // 이 직업 캐릭터가 쓰는 곳 + 공유 창고의 아이템을 검사해 문제 목록을 돌려준다
  const check = (s, cls) => {
    const problems = [], h = s.heroes?.[cls];
    const lv = Math.max(h?.kept?.run?.level ?? 0, h?.kept?.build?.level ?? 0, h?.run?.level ?? 0);
    if (lv > MAX_LEVEL) problems.push(`레벨 ${lv} (최대 ${MAX_LEVEL})`);
    const roots = [s.inventoryByClass?.[cls], s.equippedByClass?.[cls], s.charmsByClass?.[cls], s.stashTabs?.[cls], s.mercs?.[cls], ...Object.entries(s.stashTabs ?? {}).filter(([k]) => k.startsWith('shared')).map(([, v]) => v)];
    const tampered = [], owners = [];
    for (const it of roots.flatMap(itemsIn)) { const p = itemProblems(it); problems.push(...p); if (p.length && isTampered(it)) { tampered.push(it.id); owners.push(it.own ?? ''); } }
    // 막는 건 수치가 원본보다 높거나 없는 줄이 붙은 것만. '게임에 없는 아이템'(예전 자료로 만든 템)·'생성 기록 없음'은 우리 쪽 자료 변경이라 막지 않음
    return { problems: [...new Set(problems)].filter((p) => p.includes(' (원본 ') || p.includes(': 없는 줄 ')), tampered, owners };
  };
  // 변조 경고 대상: 2026-11-23(한국 시각)부터 생긴 템 중 수치가 원본보다 높거나 원본에 없는 줄이 붙은 것. 생성 시각은 템 id 끝 8자리(36진수 ms)
  // 생성 기록 없음·게임에 없는 템(자료 바뀜 등)은 세지 않음: 우리 쪽 버그로 잘못 걸리면 안 되므로
  const CUTOFF = Date.UTC(2026, 10, 22, 15);
  const bornAt = (it) => parseInt(String(it.id ?? '').slice(-8), 36) || 0;
  const isTampered = (it) => bornAt(it) >= CUTOFF && !!it.roll && itemProblems(it).some((p) => p.includes(' (원본 ') || p.includes(': 없는 줄 '));
  // 세이브에서 id 가 맞는 템을 빼냄(배열은 빼고, 칸 이름으로 든 것은 지움)
  const dropIds = (root, ids) => {
    const want = new Set(ids), seen = new Set();
    const walk = (o, d) => {
      if (!o || typeof o !== 'object' || seen.has(o) || d > 8) return; seen.add(o);
      if (Array.isArray(o)) { for (let i = o.length - 1; i >= 0; i--) if (want.has(o[i]?.id)) o.splice(i, 1); }
      else for (const k of Object.keys(o)) if (want.has(o[k]?.id) && o[k]?.rarity) delete o[k];
      for (const k in o) walk(o[k], d + 1);
    };
    walk(root, 0);
  };
  // 아이템 하나 검사(우편으로 받은 아이템도 이걸로 거름)
  const itemProblems = (it) => {
    const problems = [];
    if (!['unique', 'set', 'runeword'].includes(it.rarity)) return problems;
    const name = `${it.name}(${it.base})`;
    if (!it.roll) { if (!QUEST.has(it.name) && it.type !== 'quest') problems.push(`${name}: 생성 기록 없음`); return problems; }
    let r = null;
    try { r = globalThis.__regen?.(it); } catch {}
    if (!r) return [`${name}: 게임에 없는 아이템`];
    // 같은 줄이 두 번 나오는 템(룬워드 옵션 + 룬 옵션 등)이 있어 줄마다 값을 합쳐 비교
    const sum = (list) => { const m = new Map(); for (const x of list ?? []) m.set(line(x), (m.get(line(x)) ?? 0) + x.value); return m; };
    const orig = sum(r.stats);
    for (const [k, value] of sum(it.stats)) {
      const v = orig.get(k);
      if (v === undefined) { if (k !== 'item_lightradius') problems.push(`${name}: 없는 줄 ${k}=${value}`); } // 빛 반경은 예전 버전 아이템에 붙어 있음
      else if (value > v) problems.push(`${name}: ${k} ${value} (원본 ${v})`);
    }
    return problems;
  };
  globalThis.__guardItem = itemProblems;
  const box = (text) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#000b;display:flex;align-items:center;justify-content:center';
    d.innerHTML = '<div class="__d2p" style="max-width:640px;max-height:70vh;overflow:auto;padding:20px 26px;background:#14110c;border:1px solid #8a6d3b;color:#e8d8a8;font:16px \'D2R Kodia\',sans-serif;white-space:pre-line"></div>';
    d.firstChild.textContent = `${text}\n\n(누르면 닫힘)`;
    d.onclick = () => d.remove();
    document.body.append(d);
  };
  // 캐릭터 시작 전에 부름: true 면 시작, false 면 막고 이유를 띄움
  globalThis.__guardOk = async (cls, depth = 0) => {
    const s = globalThis.__gm?.save;
    if (!s || !globalThis.__regen) return true;
    const { problems, tampered, owners } = check(s, cls);
    const r = await api('POST', '/guard', { fp: `${s.born}:${s.leaderboard?.id ?? ''}`, cls, problems, tampered, owners, digest: await globalThis.d2app?.remodDigest?.().catch?.(() => null) ?? null, ticket: s.remodTicket ?? null });
    if (r?.ticket) { s.remodTicket = r.ticket; try { globalThis.__saveNow?.(); } catch {} } // 세이브 입장권: 이 세이브가 살아 있는 곳은 여기
    if (r?.marked && !globalThis.__markedShown) { globalThis.__markedShown = 1; box('⚠ 변조된 게임 파일이 감지되었습니다.\n이 계정에는 [변조] 표시가 붙고 기록·랭킹이 남지 않습니다.\n정식 설치 파일(D2-Vampire-Remod.bat)로 다시 설치하세요.'); }
    if (r?.ok || (!r && !problems.length)) return true; // 서버 연결이 안 되면 내 검사만
    const RULE = '\n\n경고 1·2회: 변조 아이템 삭제\n경고 3회: 그 캐릭터 사용 불가\n경고 4회: 계정·접속 차단';
    if (r?.why === 'strike') { // 1·2차: 변조 템을 지우고 다시 검사
      dropIds(s, r.del ?? []); try { globalThis.__saveNow?.(); } catch {}
      box(`⚠ 변조 아이템 경고 ${r.strike}/4\n변조된 아이템 ${(r.del ?? []).length}개를 삭제했습니다.${RULE}`);
      return depth < 1 ? globalThis.__guardOk(cls, depth + 1) : false;
    }
    if (r?.why === 'dead') { box(`⛔ 변조 아이템 경고 ${r.strike ?? 3}/4\n이 캐릭터는 변조로 더 이상 사용할 수 없습니다.${RULE}`); return false; }
    const why = { banned: `${r?.strike ? `⛔ 변조 아이템 경고 ${r.strike}/4\n` : ''}관리자가 접속을 막은 계정입니다.${r?.note ? `\n이유: ${r.note}` : ''}`, copy: '다른 곳에서 쓰던 세이브를 복사한 것으로 보여 접속할 수 없습니다.\n관리자에게 문의하세요.', moved: '이 세이브는 다른 곳으로 옮겨져 여기서는 더 이상 쓸 수 없습니다.\n(세이브는 마지막으로 켠 한 곳에서만 살아 있습니다)\n잘못된 경우 관리자에게 문의하세요.' }[r?.why];
    box(why ?? `변조된 것으로 보이는 캐릭터라 시작할 수 없습니다.\n관리자 승인이 필요합니다.\n\n${problems.slice(0, 12).join('\n')}${problems.length > 12 ? `\n외 ${problems.length - 12}개` : ''}`);
    return false;
  };
  // GM 이 이름으로 보낸 아이템(우편 {make}) 만들기: 원본 생성기로 roll 까지 붙여 검사를 통과하게
  globalThis.__makeItem = (name) => {
    const m = globalThis.__mk?.();
    if (!m) return null;
    const u = m.GJ.find((x) => x.name === name), st = !u && m.tZ.get(name);
    if (!u && !st) return null;
    const seed = m.Cq(), it = m.Sq(seed, () => (u ? m.eZ(u, 99, 99) : m.iZ(st, 99, 99)));
    it.id = m.lQ(); it.roll = [m.cK() ? 2 : 1, seed, 99];
    return it;
  };
  globalThis.__guardCheck = (cls) => check(globalThis.__gm.save, cls).problems; // 시험용
  globalThis.__guardTampered = (cls) => check(globalThis.__gm.save, cls).tampered; // 시험용
  // 1.2 룬워드 이름 옮김: 레저렉션 룬워드와 영어 이름이 겹치던 우리 룬워드 6개를 새 이름으로. 세이브마다 한 번(그 뒤에 만든 레저렉션 룬워드는 그대로)
  const RW_RENAME = { 'Flickering Flame': 'Wavering Flame', Mist: 'Pale Mist', Obsession: 'Tenacity', Pattern: 'Cant', Plague: 'Black Pest', 'Unbending Will': 'Iron Resolve' };
  globalThis.__rwRename = () => {
    const s = globalThis.__gm?.save;
    if (!s || s.remodRw12) return 0;
    let n = 0;
    const seen = new Set();
    const walk = (o, d) => { if (!o || typeof o !== 'object' || seen.has(o) || d > 10) return; seen.add(o); if (o.rarity === 'runeword' && RW_RENAME[o.name]) { o.name = RW_RENAME[o.name]; n++; } for (const k in o) walk(o[k], d + 1); };
    walk(s, 0);
    s.remodRw12 = 1;
    try { globalThis.__saveNow?.(); } catch {}
    return n;
  };
  // 최초 획득자: 세이브에 처음 들어온 템(룬·재료 포함)에 내 "닉네임#번호"를 박음. 이미 박힌 템(거래·우편으로 받은 것)은 그대로
  // 룬은 소켓에 박히면 바탕 템 안에 들어가 따로 안 보이고, 룬워드가 되면 바탕 템의 획득자만 남음
  const stamp = () => {
    const s = globalThis.__gm?.save, me = globalThis.__myName, cls = globalThis.__gm?.world?.player?.cls ?? globalThis.__gm?.kit?.id;
    if (!s || !me) return;
    const seen = new Set();
    const walk = (o, d) => { if (!o || typeof o !== 'object' || seen.has(o) || d > 8) return; seen.add(o); if (o.id && o.base && o.rarity && !o.own) { o.own = me; if (cls) o.ownCls = cls; } for (const k in o) walk(o[k], d + 1); };
    walk(s, 0);
  };
  // 툴팁 맨 아래(획득 날짜 줄 뒤)에 최초 획득자: Alt 를 누르고 있을 때만(자세히 보기). 줄은 MyPatch 의 __lockL 이 만듦
  // 닉네임을 알 수 없거나 8글자 넘으면 "직업#번호"(박을 때 캐릭터 직업 ownCls 도 같이 박음)
  const CLS_KO = { amazon: '아마존', sorceress: '원소술사', necromancer: '강령술사', paladin: '성기사', barbarian: '야만용사', druid: '드루이드', assassin: '암살자', warlock: '악마술사' };
  const ownName = (e) => {
    const t = globalThis.__tag?.(e.own) ?? e.own, i = t.lastIndexOf('#'), nick = i > 0 ? t.slice(0, i) : '';
    return !nick || nick.length > 8 ? `${CLS_KO[e.ownCls] ?? '?'}${i >= 0 ? t.slice(i) : ''}` : t;
  };
  // 최초 획득 줄은 하늘색으로(다른 줄과 구분). 줄은 D2 글꼴로 그린 canvas(금색)라 색조를 돌림
  new MutationObserver(() => { if (!globalThis.__alt) return; for (const el of document.querySelectorAll('canvas.d2-text')) if (!el.style.filter && el.textContent.startsWith('최초 획득: ')) el.style.filter = 'hue-rotate(150deg) saturate(1.6) brightness(1.15)'; }).observe(document.documentElement, { childList: true, subtree: true });
  const wrapLock = () => {
    const f = globalThis.__lockL;
    if (!f || f.__own) return;
    const g = (e) => [...f(e), ...(globalThis.__alt && e?.own ? [`최초 획득: ${ownName(e)}`] : [])];
    g.__own = 1; globalThis.__lockL = g;
  };
  // Alt 를 누르거나 떼면 지금 마우스 아래 툴팁을 다시 그리게 마우스 이동을 한 번 흉내
  let px = 0, py = 0;
  addEventListener('pointermove', (e) => { if (e.isTrusted) { px = e.clientX; py = e.clientY; } }, true);
  const alt = (on) => (e) => { if (e.key !== 'Alt' || globalThis.__alt === on) return; globalThis.__alt = on; document.elementFromPoint(px, py)?.dispatchEvent(new PointerEvent('pointermove', { clientX: px, clientY: py, bubbles: true })); };
  addEventListener('keydown', alt(true), true); addEventListener('keyup', alt(false), true); addEventListener('blur', () => { globalThis.__alt = false; });
  setInterval(() => { globalThis.__rwRename(); stamp(); wrapLock(); }, 1000);
})();
