// 리모드 채팅 창: 일반(같은 대기방)·전체·거래·길드 채널과 길드 창. 내 서버(/chat, /guild)를 2초마다 확인. Enter 로 입력
(() => {
  // 이 설치(세이브 폴더)의 숨은 열쇠. 서버가 이 열쇠에 "닉네임#번호"를 묶어 준다
  let key = (() => { try { return localStorage.getItem('d2s:key'); } catch { return null; } })();
  if (!key) { key = crypto.randomUUID(); try { localStorage.setItem('d2s:key', key); } catch {} }
  const api = async (method, path, body) => {
    if (method === 'GET') path += (path.includes('?') ? '&' : '?') + 'key=' + key;
    const r = await globalThis.d2app?.leaderboard?.(method, path, body && JSON.stringify({ ...body, key }));
    try { return { status: r?.status, json: JSON.parse(r?.body ?? 'null') }; } catch { return { status: r?.status, json: null }; }
  };
  // 이름 옆 순위: 서버가 5분마다 계산한 {이름: [공포, 던전]} 을 5분에 한 번 받음. 이름표는 5초마다 공포·던전을 번갈아
  const rankLoad = async () => { const r = await api('GET', '/tags'); if (r.status === 200 && r.json) globalThis.__rankTags = r.json; };
  const medal = (n) => ['', '🥇', '🥈', '🥉'][n] ?? ''; // 1·2·3등 금은동
  globalThis.__rankLabel = (n) => { const v = globalThis.__rankTags?.[n]; const a = v ? [v[0] && `${medal(v[0])}[공포 ${v[0]}위]`, v[1] && `${medal(v[1])}[던전 ${v[1]}위]`].filter(Boolean) : []; return a.length ? a[Math.floor(Date.now() / 5000) % a.length] : ''; };
  const rankTxt = (v) => (v && (v[0] || v[1]) ? `[${v[0] ? medal(v[0]) + v[0] + '등' : 'x'}-${v[1] ? medal(v[1]) + v[1] + '등' : 'x'}] ` : ''); // 채팅: [공포-던전]
  const get = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  // 채널마다 글자색을 뚜렷하게: 일반/파티 흰색, 전체 금색, 거래 하늘색, 길드 초록, 편 주황
  const CH = [['all', '전체', '#ffd75a'], ['room', '일반', '#ffffff'], ['trade', '거래', '#5ec8ff'], ['guild', '길드', '#5cff7a'], ['team', '파티', '#ff9a4a'], ['whisper', '귓속말', '#ff8cf0']];
  const chName = (k) => ( CH.find(([c]) => c === k)?.[1] ?? k);
  const HELP = '채팅: !전체 @거래 #길드 · /w #번호 할말 귓속말 · /r 할말 답장 · 명령: /이름 닉네임 (번호 #00000 은 자동, 이 PC 세이브에 고정) · 대기실은 [대기실] 버튼, 길드는 [길드 관리] 버튼';
  let ch = get('d2s:chatch', 'room'), name = '', room = '로비', members = [], faces = {}, since = 0, guild = null, open = false;
  const lines = [];
  const css = (on) => `padding:2px 8px;font:12px "D2R Kodia",sans-serif;white-space:nowrap;cursor:pointer;border:1px solid #5a4a2a;background:${on ? '#3a3020' : '#151209'};color:${on ? '#fff' : '#c8b27a'}`;
  const btn = (text, on, active) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = css(active);
    if (active) b.dataset.on = '1'; // 스킨(remod-skin.js)이 배경을 덮어써서 고른 탭은 따로 표시
    b.onclick = (e) => { e.stopPropagation(); on(); };
    return b;
  };
  // 이름#00123 → 이름#123: 번호는 5자리로 저장하고 화면에만 앞 0 을 생략
  globalThis.__tag = (t) => String(t).replace(/#0+(?=\d)/g, '#'); const __tag = globalThis.__tag;
  const el = (tag, style, text) => { const d = document.createElement(tag); d.style.cssText = style ?? ''; d.textContent = __tag(text ?? ''); return d; };

  const box = el('div', 'position:fixed;right:8px;bottom:8px;width:440px;z-index:99990;font:13px "D2R Kodia",sans-serif;color:#ddd;pointer-events:auto');
  box.id = '__chat';
  const tabs = el('div', 'display:flex;flex-wrap:wrap;gap:2px;align-items:center');
  const list = el('div', 'height:150px;overflow-y:auto;background:#000e;padding:3px 6px;border:1px solid #5a4a2a');
  const input = el('input', 'display:none;width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #8a6d3b;padding:3px 6px;font:13px "D2R Kodia",sans-serif');
  input.maxLength = 200;
  box.append(tabs, list, input);

  const note = (text) => { lines.push({ text, color: '#c8b27a' }); draw(); };
  // 방 난이도: 멀티는 캐릭터 선택 때 난이도를 안 고르고, 방에 들어가면 방 난이도(보통·악몽·지옥·공포)로 판을 새로 시작. PvP 방·로비는 그대로
  const roomOf = async (b) => (b.room === '로비' ? null : b.act === 'create' ? b : ((await api('GET', '/room')).json ?? []).find((g) => g.room === b.room));
  const ROOM_DIFF = { normal: '보통', nightmare: '악몽', hell: '지옥', terror: '공포 영역' };
  const diffLocked = (g) => {
    const a = globalThis.__cfApi, cls = globalThis.__remodChar?.id;
    if (!g || (g.mode ?? 'coop') !== 'coop' || !a || !cls) return null;
    const d = g.diff ?? 'normal';
    if (d !== 'terror') return (a.diffs(cls) ?? ['normal']).includes(d) ? null : `이 캐릭터는 아직 ${ROOM_DIFF[d]} 난이도가 열리지 않았습니다.`;
    const now = terrorNow(cls);
    return !now ? '이 캐릭터는 아직 공포 영역이 열리지 않았습니다.' : now < (g.tier ?? 1) ? `이 캐릭터는 공포 ${now}단계까지만 들어갈 수 있습니다.` : null;
  };
  // 공포 영역 지금 단계(원작 글 'Terror 24 · Best tier: 27' 의 앞 숫자)
  const terrorNow = (cls) => +(globalThis.__cfApi?.terror(cls)?.score?.match(/(\d+)/)?.[1] ?? 0);
  // 파티 이동: 들어간 방(협동)을 기억. 방장이 던전(place run:…)에 있으면 들어올 때 바로 던전, 내가 마을인데 방장이 던전에 들어가면 따라감
  // ponytail: 같은 난이도로 새 판을 시작할 뿐이라 방장이 이어하기로 다른 막에 있으면 막이 다를 수 있음. 막 맞추기는 판 저장본을 만드는 다음 단계
  let joined = null;
  const hostPlace = async (g) => {
    if (!g?.owner || g.owner === name) return null;
    const list = (await api('GET', '/pos')).json ?? [];
    return list.find((p) => p.name === g.owner)?.place ?? null;
  };
  setInterval(async () => {
    const gm = globalThis.__gm;
    if (!joined || room !== joined.room || gm?.state !== 'camp' || document.getElementById('__bnet')) return;
    const hp = await hostPlace(joined);
    if (hp?.startsWith('run:')) { note('방장을 따라 던전으로 갑니다.'); playRoom({ ...joined, start: 'dungeon', act: +hp.split(':')[1] + 1 }); }
  }, 1000);
  // 판 시작(started=true)이면 불러오기 화면(loading·travel)이 뜰 때까지(최대 3초) 기다렸다 close
  const afterStart = (started, close) => {
    if (!started) return close();
    const t0 = Date.now(), tm = setInterval(() => { if (['loading', 'travel'].includes(globalThis.__gm?.state) || Date.now() - t0 > 3000) { clearInterval(tm); close(); } }, 30);
  };
  const playRoom = (g) => {
    const a = globalThis.__cfApi, cls = globalThis.__remodChar?.id;
    if (!g || !a || !cls) return false;
    // 마을 = 야영지(enterCamp). play 는 저장된 판이 있으면 그 판을 이어 시작해서 안 씀
    const camp = (kit, d = 'pvp') => (globalThis.__campDiff = d, globalThis.__gm?.enterCamp ? globalThis.__gm.enterCamp(kit) : a.play(kit, 'normal'), true);
    if ((g.mode ?? 'coop') !== 'coop') return camp(a.kit(cls)); // PvP: 무조건 마을로, 거기서 준비(remod-pvp.js)
    const kit = a.kit(cls), d = g.diff ?? 'normal';
    const gm = globalThis.__gm, dungeon = g.start === 'dungeon';
    if (!dungeon) return camp(kit, d);
    globalThis.__campDiff = null;
    if (d !== 'terror') return gm.startAct(kit, d, g.act ?? 1), true;
    // 방 단계가 내 단계보다 낮으면 다시하기(replay: 깬 단계를 기록 안 건드리고 다시)로, 같으면 내 공포 판 그대로. 높으면 diffLocked 가 막음
    const now = terrorNow(cls), t = g.tier ?? now;
    if (t < now && globalThis.__gm?.startReplay) return globalThis.__gm.startReplay(kit, t), true;
    // 남은 다시하기(replay)가 있으면 원작이 그걸 먼저 집으니 지우고, 고를 판 세 개 중 첫 번째로
    const T = globalThis.__gm?.save?.terror?.[cls];
    if (T) { delete T.replay; delete T.left; }
    a.startTerror(kit, 0);
    return true;
  };
  // 화면 가운데 아이템 이름·골드 알림은 띄우지 않음(획득 목록 창에 남음). 등급 색(magic·rare·unique·set…) 알림과 골드 글은 건너뜀
  setInterval(() => {
    const h = globalThis.__gm?.hud;
    if (!h?.banner || h.banner.__remod) return;
    const orig = h.banner.bind(h);
    h.banner = Object.assign((t, style, ...rest) => ((style && style !== 'normal') || /골드|gold/i.test(String(t)) ? undefined : orig(t, style, ...rest)), { __remod: 1 });
  }, 1000);
  globalThis.__afterLeave = () => {
    const to = globalThis.__leaveTo ?? (globalThis.__mp ? 'lobby' : 'town');
    globalThis.__leaveTo = null;
    if (to === 'lobby') setTimeout(() => bnet(), 300);
  };
  const draw = () => {
    // 입력창 안내: 지금 탭의 앞글자 단축키(다른 탭에서도 앞글자로 바로 보냄)
    input.placeholder = `${{ room: '일반: 그냥 입력', all: '전체: !할말', trade: '거래: @할말', guild: '길드: #할말', team: '파티' }[ch] ?? ''}  ·  귓속말: /w #번호 할말  ·  답장: /r 할말`;
    tabs.replaceChildren(
      ...CH.filter(([k]) => k !== 'whisper' && (k !== 'team' || room !== '로비')).map(([k, l]) => btn(l, () => { ch = k; set('d2s:chatch', k); draw(); open = true; input.style.display = 'block'; input.focus(); }, k === ch)),
      el('span', 'margin-left:auto'),
      btn('숙제', () => globalThis.__remodQuests?.(), false),
      btn('대기실', () => bnet(), false), // 큰 대기실(배틀넷식). 들어가면 하던 방에서 나와 로비로
      btn('친구', friendPanel, false),
      btn(guild ? `길드 관리 (${guild})` : '길드 관리', guildPanel, false),
      btn('?', () => (globalThis.__remodGuide ? globalThis.__remodGuide() : note(HELP)), false),
    );
    // 알림(ch 없음)·귓속말은 모든 탭에, 대화는 그 채널 탭에만. [전체] 탭은 모든 채널을 [채널] 표시와 색으로(대기실과 같게)
    list.replaceChildren(...lines.filter((m) => !m.ch || m.ch === 'whisper' || ch === 'all' || m.ch === ch).slice(-200).map((m) => el('div', `color:${m.color ?? CH.find(([k]) => k === m.ch)?.[2]}`, (m.ch && (ch === 'all' || m.ch === 'whisper') && m.ch !== ch || m.ch === 'whisper' ? `[${chName(m.ch)}] ` : '') + m.text)));
    list.scrollTop = list.scrollHeight;
  };

  // 대기실 창(원작 배틀넷 게임 목록처럼 크게): 왼쪽 공개 방 목록, 오른쪽 방 만들기/참가 탭, 아래 지금 방 사람들
  const D2BTN = 'padding:8px 22px;font:bold 15px "D2 Exocet",Cinzel,serif;letter-spacing:1px;cursor:pointer;color:#e8d8a8;background:linear-gradient(#5a5650,#2c2a26);border:2px solid #8a6d3b;box-shadow:inset 0 0 0 1px #000,0 2px 0 #000';
  const bigBtn = (text, on) => { const b = btn(text, on); b.style.cssText = D2BTN; return b; };
  const roomPanel = async () => {
    globalThis.__openLobby = roomPanel;
    if (!name) return note('서버에 연결되지 않았습니다.');
    const { wrap, panel, row, field } = modal('__room', 'full');
    let tab = 'join', pick = '';
    const enter = async (body) => {
      const g = body.act === 'leave' ? null : await roomOf(body), lock = diffLocked(g);
      if (lock) return note(lock);
      const r = await api('POST', '/room', { name, ...body });
      if (r.status !== 200) return note({ exists: '이미 있는 방 이름입니다.', not_found: '없는 방입니다.', bad_pw: '비밀번호가 틀렸습니다.', full: '방이 꽉 찼습니다 (4명).' }[r.json?.error] ?? '방 요청 실패');
      room = r.json.room; lines.splice(0, lines.length, ...lines.filter((m) => m.ch !== 'room')); note(`대기방: ${room}`); ch = 'room'; await poll(); if (body.act !== 'leave') afterStart(playRoom(g), () => { wrap.remove(); document.getElementById('__bnet')?.remove(); }); else render();
    };
    const render = async () => {
      const all = (await api('GET', '/room')).json ?? [];
      const title = el('div', 'font:bold 30px "D2 Exocet",Cinzel,serif;color:#d8b860;text-align:center;letter-spacing:3px;text-shadow:0 0 10px #a60,0 2px 0 #000;margin-bottom:12px', '대기실');
      const cols = el('div', 'display:flex;gap:16px;align-items:stretch');
      // 왼쪽: 공개 방 목록 (비밀번호 방은 안 보임)
      const left = el('div', 'flex:1.3;border:2px solid #5a4a2a;background:#0008;padding:8px;min-height:300px');
      left.append(el('div', 'font:bold 16px Cinzel,serif;color:#d8b860;margin-bottom:6px', '공개 방 목록'));
      const head = row(el('span', 'flex:1;color:#887', '방 이름'), el('span', 'width:60px;color:#887;text-align:center', '인원'), el('span', 'width:120px;color:#887', '방장'));
      left.append(head);
      const box = el('div', 'max-height:250px;overflow:auto');
      for (const g of all) {
        const r = row(el('span', 'flex:1;color:#eee', g.room + (g.hard ? '  [어려움]' : '')), el('span', 'width:60px;text-align:center;color:#ccc', g.room === '로비' ? `${g.count}` : `${g.count}/4`), el('span', 'width:120px;color:#aaa;overflow:hidden;white-space:nowrap', g.owner || '-'));
        r.style.cssText += `;cursor:pointer;padding:3px 4px;background:${g.room === pick ? '#3a3020' : g.room === room ? '#1f2a14' : 'transparent'}`;
        r.onclick = () => { pick = g.room; tab = 'join'; render(); };
        r.ondblclick = () => enter({ act: 'join', room: g.room });
        box.append(r);
      }
      left.append(box, el('div', 'color:#776;font-size:12px;margin-top:6px', '한 번 누르면 선택, 두 번 누르면 입장. 비밀번호 방은 오른쪽 [참가]에서 이름·비번으로 들어갑니다.'));
      // 오른쪽: 만들기 / 참가
      const right = el('div', 'flex:1;border:2px solid #5a4a2a;background:#0008;padding:10px');
      const tabs = row(bigBtn('방 만들기', () => { tab = 'create'; render(); }), bigBtn('참가', () => { tab = 'join'; render(); }));
      tabs.children[tab === 'create' ? 0 : 1].style.color = '#fff';
      tabs.children[tab === 'create' ? 1 : 0].style.opacity = '.6';
      const rn = field('방 이름', 24), pw = field(tab === 'create' ? '비밀번호 (비우면 공개 방)' : '비밀번호 (있으면)', 24);
      pw.type = 'password';
      rn.value = tab === 'join' ? pick : '';
      for (const f of [rn, pw]) f.style.cssText += ';font-size:16px;padding:8px';
      const hard = document.createElement('label');
      hard.style.cssText = 'display:' + (tab === 'create' ? 'flex' : 'none') + ';gap:6px;align-items:center;margin-top:10px;color:#f96;cursor:pointer';
      hard.innerHTML = '<input type="checkbox"> 파티 어려움 모드 (몬스터 체력 2.5배·공격 1.8배, 경험치 2배·골드/매찬 +150)';
      right.append(tabs, el('div', 'margin:12px 0 4px', '방 이름'), rn, el('div', 'margin:10px 0 4px', '비밀번호'), pw, hard,
        row(el('span', 'flex:1'), bigBtn(tab === 'create' ? '만들기' : '입장', () => rn.value.trim() && enter({ act: tab, room: rn.value.trim(), pw: pw.value, hard: hard.querySelector('input').checked }))));
      cols.append(left, right);
      // 아래: 지금 방과 사람들
      const here = el('div', 'margin-top:14px;border:2px solid #5a4a2a;background:#0008;padding:8px');
      here.append(row(el('span', 'flex:1;font:bold 16px Cinzel,serif;color:#d8b860', `지금 방: ${room}  (${members.length}명)`), ...(room !== '로비' ? [bigBtn('로비로 나가기', () => enter({ act: 'leave' }))] : [])));
      here.append(el('div', 'color:#776;font-size:12px', '아이템을 손에 든 채 [아이템 보내기]를 누르면 그 사람 공유 창고 9로 갑니다. 같은 방 사람은 마을·던전에서 서로 보입니다.'));
      for (const m of members) here.append(row(el('span', 'flex:1;color:#6f6', `● ${m}${m === name ? ' (나)' : ''}`), ...(m === name ? [] : [btn('아이템 보내기', () => sendItem(m))])));
      panel.replaceChildren(title, cols, here, row(el('span', 'flex:1'), bigBtn(document.getElementById('__bnet') ? '대기실로' : '닫기', () => wrap.remove())));
    };
    render();
  };
  // 손에 든 아이템을 보낸다. 서버가 받으면 내 손에서 지운다
  const sendItem = async (to) => {
    const g = globalThis.__gm, held = g?.save?.cursor;
    if (!held?.item) return note('보낼 아이템을 먼저 손에 드세요(창고·인벤에서 집기).');
    const r = await api('POST', '/mail', { from: name, to, item: held.item });
    if (r.status !== 201) return note(r.json?.error === 'no_player' ? '그 사람을 찾을 수 없습니다.' : '보내지 못했습니다.');
    delete g.save.cursor;
    globalThis.__saveNow?.();
    note(`${to} 님에게 보냈습니다: ${String(globalThis.__ko?.(held.item.name) ?? held.item.name)}`);
    document.getElementById('__room')?.remove();
    g.hud?.d2?.onPanelClose?.();
  };
  // 받은 아이템은 공유 창고 9 빈 자리에 넣는다(자리는 창고가 열릴 때 정해짐)
  const takeMail = async () => {
    const r = await api('GET', `/mail?name=${encodeURIComponent(name)}`);
    const s = globalThis.__gm?.save;
    if (!Array.isArray(r.json) || !s) return;
    for (const m of r.json) { const { at, ...raw } = m.item, item = raw.make ? globalThis.__makeItem?.(raw.make) : raw; if (!item) { note(`${m.from} 님이 보낸 아이템(${raw.make})을 만들 수 없습니다.`); continue; } const bad = globalThis.__guardItem?.(item) ?? []; if (bad.length) { note(`${m.from} 님이 보낸 아이템이 변조되어 받지 않았습니다: ${bad[0]}`); continue; } (s.stashTabs.shared9 ??= []).push(item); note(`${m.from} 님이 아이템을 보냈습니다: ${String(globalThis.__ko?.(item.name) ?? item.name)} (공유 창고 9)`); }
    globalThis.__saveNow?.();
  };
  // 창 틀: 배경 클릭·닫기로 닫힘, 안의 키 입력은 게임으로 안 보냄
  const modal = (id, big) => {
    document.getElementById(id)?.remove();
    const wrap = el('div', 'position:fixed;inset:0;z-index:99995;background:rgb(0 0 0/.6);display:flex;align-items:center;justify-content:center;font:14px "D2R Kodia",sans-serif;color:#c8b27a');
    wrap.id = id;
    const panel = el('div', big === 'full' ? 'position:fixed;inset:0;overflow:auto;padding:28px 5vw;box-sizing:border-box;background:radial-gradient(ellipse at top,#2a2418,#050403 75%)' : big ? 'width:min(900px,92vw);max-height:88vh;overflow:auto;padding:22px 26px;background:radial-gradient(ellipse at top,#2a2418,#0c0a07 70%);border:3px ridge #8a6d3b;box-shadow:0 0 0 2px #000,0 0 40px #000' : 'background:#111;border:2px solid #5a4a2a;padding:14px 18px;min-width:400px;max-height:80vh;overflow:auto');
    wrap.append(panel);
    if (big !== 'full') wrap.onclick = (e) => { if (e.target === wrap && !wrap.__drag) wrap.remove(); }; // 끌다 놓은 건 닫기 아님
    wrap.onkeydown = (e) => e.stopPropagation();
    wrap.onkeyup = (e) => e.stopPropagation();
    document.body.append(wrap);
    const row = (...kids) => { const d = el('div', 'display:flex;gap:6px;align-items:center;margin:4px 0'); d.append(...kids); return d; };
    const field = (ph, n = 16) => { const f = el('input', 'flex:1;background:#000;color:#fff;border:1px solid #5a4a2a;padding:3px 6px'); f.placeholder = ph; f.maxLength = n; return f; };
    return { wrap, panel, row, field };
  };
  // 원작 D2 패널 창(게임 안 퀘스트 창 그림): 테두리는 그림 9칸 자르기라 크기를 바꿔도 모서리가 안 깨짐
  const d2win = (id, title, pos) => {
    document.getElementById(id)?.remove();
    const wrap = el('div', `position:fixed;${pos};min-width:200px;min-height:220px;z-index:99994;background:#101010;resize:both;overflow:hidden;font:14px "D2R Kodia",sans-serif;color:#c7b377;box-shadow:0 0 18px #000`);
    wrap.id = id; wrap.onkeydown = wrap.onkeyup = (e) => e.stopPropagation();
    const frame = el('div', 'position:absolute;inset:0;z-index:1;pointer-events:none;box-sizing:border-box;border-style:solid;border-width:30px 7px 8px 7px;border-image:url(../d2/town/quest.png) 30 7 8 7 stretch');
    const head = el('div', 'position:absolute;z-index:2;left:0;right:0;top:0;height:30px;display:flex;align-items:center;justify-content:center;cursor:move;user-select:none');
    head.append(el('span', 'font:bold 16px "D2 Exocet","D2R Kodia",serif;color:#c7b377;letter-spacing:1px;text-shadow:0 1px 2px #000', title));
    const x = el('div', 'position:absolute;right:2px;top:2px;width:26px;height:26px;cursor:pointer;background:url(../d2/ui/storebtn-10.png) center/100% 100%'); x.title = '닫기'; x.onclick = () => wrap.remove();
    head.append(x);
    head.onmousedown = (e) => { if (e.target === x) return; const r0 = wrap.getBoundingClientRect(), dx = e.clientX - r0.left, dy = e.clientY - r0.top; const mv = (m) => Object.assign(wrap.style, { left: `${m.clientX - dx}px`, top: `${m.clientY - dy}px`, right: 'auto' }); addEventListener('mousemove', mv); addEventListener('mouseup', () => removeEventListener('mousemove', mv), { once: true }); };
    const panel = el('div', 'position:absolute;left:7px;right:7px;top:30px;bottom:10px;overflow-y:auto;overflow-x:hidden;padding:6px 8px');
    wrap.append(panel, frame, head); document.body.append(wrap);
    const row = (...kids) => { const d = el('div', 'display:flex;gap:4px;align-items:center;margin:5px 0'); d.append(...kids); return d; };
    const field = (ph, n = 16) => { const x2 = el('input', 'flex:1;min-width:0;background:#000;color:#fff;border:1px solid #4a4436;padding:3px 6px;font:13px "D2R Kodia",sans-serif'); x2.placeholder = ph; x2.maxLength = n; return x2; };
    return { wrap, panel, row, field };
  };
  // 친구 창: #번호(또는 이름#번호)로 추가, 접속 중/미접속(마지막 접속), 우클릭 메뉴 귓속말·같이하기·길드 초대·친구 삭제
  const ago = (t) => { if (!t) return '접속 기록 없음'; const m = Math.floor((Date.now() - t) / 60000); return m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`; };
  const friendPanel = async () => {
    if (!name) return note('서버에 연결되지 않았습니다.');
    // 메신저식: 화면 오른쪽에 좁고 긴 원작 D2 패널. 게임을 막지 않음. 다시 [친구] 를 누르면 닫힘
    const old = document.getElementById('__friend'); if (old) return old.remove();
    const { wrap, panel, row, field } = d2win('__friend', '친구', 'right:24px;top:80px;width:250px;height:68vh');
    const fail = (r) => ({ no_player: '그런 사람이 없습니다(한 번이라도 접속한 사람만).', self: '나 자신은 추가할 수 없습니다.', full: '친구는 100명까지입니다.' }[r.json?.error] ?? '요청 실패');
    const box = el('div', 'margin-top:8px');
    const menu = (e, f) => {
      e.preventDefault();
      document.getElementById('__fmenu')?.remove();
      const m = el('div', `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:99999;background:#14110c;border:1px solid #8a6d3b;padding:4px 0;font:14px "D2R Kodia",sans-serif;min-width:140px`);
      m.id = '__fmenu';
      const item = (t, on, ok = true) => { const d = el('div', `padding:5px 14px;cursor:${ok ? 'pointer' : 'default'};color:${ok ? '#e8d8a8' : '#666'}`, t); if (ok) { d.onmouseenter = () => (d.style.background = '#3a3020'); d.onmouseleave = () => (d.style.background = ''); d.onclick = () => { m.remove(); on(); }; } m.append(d); };
      item('귓속말', () => { open = true; input.style.display = 'block'; input.value = `/w ${f.name} `; input.focus(); });
      item(f.room ? `같이하기 (${f.room})` : '같이하기 (방에 없음)', async () => { const r = await api('POST', '/room', { act: 'join', room: f.room }); if (r.status !== 200) return note(fail(r)); room = r.json.room; document.getElementById('__friend')?.remove(); note(`${f.name} 님의 방 [${room}] 에 들어갔습니다.`); }, !!f.room);
      item('길드 초대', async () => { const r = await api('POST', '/guild', { act: 'invite', target: f.name }); if (r.status !== 200) return note(r.json?.error === 'not_leader' ? '길드장만 초대할 수 있습니다.' : '초대 실패'); sayText(`/w ${f.name} [길드 초대] ${guild} 길드에 초대했습니다. 길드 관리에서 "${guild}" 가입을 누르면 바로 들어옵니다.`); }, !!guild && f.guild !== guild);
      item('친구 삭제', async () => { await api('POST', '/friend', { act: 'del', to: f.name }); draw2(); });
      document.body.append(m);
      setTimeout(() => addEventListener('click', () => m.remove(), { once: true }), 0);
    };
    const draw2 = async () => {
      const l = (await api('GET', '/friend')).json ?? [];
      l.sort((a, b) => b.on - a.on || (b.last ?? 0) - (a.last ?? 0));
      box.replaceChildren(...(l.length ? l.map((f) => {
        const d = el('div', 'display:flex;gap:8px;align-items:center;padding:5px 2px;border-bottom:1px solid #2a2418;cursor:context-menu');
        const t = el('div', 'flex:1;min-width:0'); t.append(el('div', `color:${f.on ? '#f0e6d0' : '#888'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, f.name + (f.guild ? ` [${f.guild}]` : '')), el('div', `color:${f.on ? '#5cff7a' : '#777'};font-size:11px`, f.on ? (f.room ? `접속 중 · ${f.room}` : '접속 중') : `미접속 · ${ago(f.last)}`));
        d.append(el('span', `flex:none;width:9px;height:9px;border-radius:50%;background:${f.on ? '#3c3' : '#555'}`), t);
        d.oncontextmenu = (e) => menu(e, f);
        return d;
      }) : [el('div', 'color:#887;padding:8px', '친구가 없습니다. 위에 #번호를 넣고 [추가]를 누르세요.')]));
    };
    const to = field('#번호 또는 이름#번호', 24);
    const add = btn('추가', async () => { const r = await api('POST', '/friend', { act: 'add', to: to.value.trim() }); if (r.status !== 200) return note(fail(r)); to.value = ''; note(`친구 추가: ${r.json.name}`); draw2(); });
    to.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') add.click(); };
    panel.append(el('div', 'color:#887;font-size:11px;margin-top:6px', '우클릭: 귓속말·같이하기·길드 초대·삭제'), row(to, add), box);
    draw2();
    const t = setInterval(() => { if (!document.getElementById('__friend')) return clearInterval(t); draw2(); }, 10000);
  };
  // 길드 창: 길드가 없으면 목록·가입·만들기, 있으면 길드장·공지·길드원(길드장은 추방·공지 수정)·탈퇴
  const guildPanel = async () => {
    if (!name) return note('서버에 연결되지 않았습니다.');
    const { wrap, panel, row, field } = d2win('__guild', '길드', 'left:calc(50% - 210px);top:12vh;width:420px;height:70vh');
    const fail = (r) => ({ exists: '이미 있는 길드입니다.', not_found: '없는 길드입니다.', in_guild: '이미 길드에 있습니다.', not_leader: '길드장만 할 수 있습니다.' }[r.json?.error] ?? '요청 실패');
    const act = async (body) => { const r = await api('POST', '/guild', { name, ...body }); if (r.status === 202) note(`[${r.json.pending}] 길드에 가입 신청했습니다. 길드장이 승인하면 들어갑니다.`); else if (r.status !== 200) note(fail(r)); else guild = r.json?.guild ?? null; render(); };
    const render = async () => {
      panel.replaceChildren();
      if (!guild) {
        const all = (await api('GET', '/guild')).json ?? [];
        panel.append(el('div', 'color:#888;font-size:12px', '가입 신청하면 길드장이 승인해야 들어갑니다(초대받았으면 바로). 새로 만들 수도 있습니다.'));
        for (const g of all) panel.append(row(el('span', 'flex:1;color:#ddd', `${g.guild}  (${g.members}명 · 길드장 ${g.leader})`), btn('가입 신청', () => act({ act: 'join', guild: g.guild }))));
        if (!all.length) panel.append(el('div', 'color:#888', '아직 길드가 없습니다.'));
        const f = field('새 길드 이름 (16자)');
        panel.append(row(f, btn('만들기', () => f.value.trim() && act({ act: 'create', guild: f.value.trim() }))));
      } else {
        const g = (await api('GET', `/guild?g=${encodeURIComponent(guild)}`)).json;
        if (!g) { guild = null; return render(); }
        const lead = g.leader === name;
        panel.append(el('div', 'color:#7e7;font-size:16px', g.guild), el('div', 'color:#ddd;margin:4px 0', `공지: ${g.notice || '(없음)'}`));
        if (lead && g.pending?.length) { panel.append(el('div', 'color:#ffd75a;margin-top:8px', `가입 신청 (${g.pending.length}명)`)); for (const m of g.pending) panel.append(row(el('span', 'flex:1;color:#ddd', m), btn('승인', () => act({ act: 'accept', target: m })), btn('거절', () => act({ act: 'reject', target: m })))); }
        if (lead) { const f = field('공지 (120자)', 120); f.value = g.notice; panel.append(row(f, btn('공지 저장', () => act({ act: 'notice', text: f.value })))); }
        // 길드원: 접속 중(초록)·미접속(회색, 마지막 접속 시각) 두 칸으로 접었다 폈다
        const on = (m) => g.now - (g.seen?.[m] ?? 0) < g.onlineMs;
        const when = (t) => { if (!t) return '접속 기록 없음'; const d = new Date(t), P = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${P(d.getMonth() + 1)}-${P(d.getDate())} ${P(d.getHours())}:${P(d.getMinutes())} 종료`; };
        for (const [title, list, color] of [['접속 중', g.members.filter(on), '#6f6'], ['미접속', g.members.filter((m) => !on(m)), '#888']]) {
          const d = document.createElement('details');
          d.open = true;
          d.style.cssText = 'margin-top:8px';
          d.append(el('summary', `cursor:pointer;color:${color}`, `${title} (${list.length}명)`));
          for (const m of list) d.append(row(el('span', `flex:1;color:${color}`, `● ${m === g.leader ? '★ ' : ''}${m}${m === name ? ' (나)' : ''}`), ...(on(m) ? [] : [el('span', 'color:#777;font-size:12px', when(g.seen?.[m]))]), ...(lead && m !== name ? [btn('추방', () => act({ act: 'kick', target: m }))] : [])));
          panel.append(d);
        }
        panel.append(row(el('span', 'flex:1'), btn('길드 탈퇴', () => act({ act: 'leave' }))));
      }
      panel.append(row(el('span', 'flex:1'), btn('닫기', () => wrap.remove())));
      draw();
    };
    render();
  };

  const command = (text) => {
    const [cmd, ...rest] = text.slice(1).split(/\s+/);
    const arg = rest.join(' ').trim();
    if (cmd === '이름' && arg) return api('POST', '/id', { nick: arg.slice(0, 12) }).then((r) => { if (r.json?.name) { name = globalThis.__myName = r.json.name; set('d2s:nick', arg.slice(0, 12)); note(`이름: ${name}`); } else note('이름을 바꾸지 못했습니다.'); });
    note(HELP);
  };
  // 보내기: 앞글자 !전체 @거래 #길드, /w #번호(또는 이름#번호) 할말 귓속말, /r 할말 마지막 귓속말에 답장
  let lastWhisper = null;
  const sayText = async (text, defCh) => {
    let c = defCh, to;
    const w = text.match(/^\/[wWㅈ]\s+(\S+)\s+(.+)$/), r = text.match(/^\/[rRㄱ]\s+(.+)$/);
    if (w) { c = 'whisper'; to = w[1]; text = w[2]; }
    else if (r) { if (!lastWhisper) return note('답장할 귓속말이 없습니다.'); c = 'whisper'; to = lastWhisper; text = r[1]; }
    else if (text.startsWith('/')) return command(text);
    else if (/^[!@#]./.test(text)) { c = { '!': 'all', '@': 'trade', '#': 'guild' }[text[0]]; text = text.slice(1).trim(); }
    if (!name) return note('서버에 연결되지 않았습니다.');
    const title = c !== 'whisper' && globalThis.__remodTitle?.();
    const res = await api('POST', '/chat', { ch: c, name, to, text: title ? `「${title}」 ${text}` : text });
    if (res.status !== 201) note({ no_guild: '길드가 없습니다. [길드] 버튼으로 가입하세요.', no_user: `${to} 님을 찾지 못했습니다.` }[res.json?.error] ?? '보내지 못했습니다 (서버 확인).');
    poll();
  };
  const poll = async () => {
    box.style.display = globalThis.__gm?.world && !['select', 'title'].includes(globalThis.__gm.state) ? '' : 'none'; // 판 안이면 레벨업·창 열림·일시정지 중에도 항상
    if (!name) { const r = await api('POST', '/id', { nick: get('d2s:nick', '') }); if (!r.json?.name) return; name = globalThis.__myName = r.json.name; note(`내 이름: ${name}  (/이름 으로 닉네임 변경)`); }
    const rc = globalThis.__remodChar, face = rc ? `&cls=${rc.id}&lvl=${rc.level ?? 0}&char=${encodeURIComponent(rc.name)}` : '';
    const r = await api('GET', `/chat?since=${since}&name=${encodeURIComponent(name)}${face}`);
    if (!r.json) return;
    guild = r.json.guild; members = r.json.members ?? []; faces = r.json.faces ?? {};
    if (r.json.mail > 0) takeMail();
    if (r.json.room && r.json.room !== room) { room = r.json.room; lines.splice(0, lines.length, ...lines.filter((m) => m.ch !== 'room')); }
    // 채팅 시각 [월/일 시:분] (24시간)
    const stamp = (t) => { if (!t) return ''; const d = new Date(t), p = (n) => String(n).padStart(2, '0'); return `[${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}] `; };
    for (const m of r.json.rows) {
      since = Math.max(since, m.id);
      if (m.ch === 'whisper') { if (m.name !== name) lastWhisper = m.name; lines.push({ ch: m.ch, text: stamp(m.t) + (m.name === name ? `→ ${m.to}: ${m.text}` : `${m.name} → 나: ${m.text}`) }); continue; }
      lines.push({ ch: m.ch, text: `${stamp(m.t)}${rankTxt(m.rank)}${m.guild && m.ch !== 'guild' ? `<${m.guild}> ` : ''}${m.name}: ${m.text}` });
    }
    if (lines.length > 400) lines.splice(0, lines.length - 400);
    draw();
  };
  input.onkeydown = async (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { input.value = ''; input.style.display = 'none'; input.blur(); open = false; return; }
    if (e.key !== 'Enter') return;
    const text = input.value.trim();
    input.value = ''; input.style.display = 'none'; input.blur(); open = false;
    if (!text) return;
    sayText(text, ch);
  };
  input.onkeyup = (e) => e.stopPropagation();
  addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || open || e.repeat || document.activeElement?.tagName === 'INPUT') return;
    if (!['camp', 'playing'].includes(globalThis.__gm?.state)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    open = true; input.style.display = 'block'; input.focus();
  }, true);
  // D2R 대기실 그대로: D2R 레이아웃(lobbybackground·lobbychat·joingame·creategame·ladder hd json)의 좌표를 3840x2160 판에 올리고 화면에 맞춰 줄인다
  const bnet = async () => {
    if (!name) return note('서버에 연결되지 않았습니다.');
    // 대기실에 오면 전에 있던 게임 방에서 나온다(게임을 껐다 켜도 서버는 30초 동안 그 방에 있는 걸로 봄)
    const out = await api('POST', '/room', { name, act: 'leave' });
    if (out.json?.room) room = out.json.room;
    const ui = globalThis.__d2ui, fe = await ui.frontend();
    await ui.ready();
    const { wrap, panel } = modal('__bnet', 'full');
    wrap.style.zIndex = 99994;
    const FONT = '"D2 Exocet","D2R Kodia",serif', DIFF = { normal: '보통', nightmare: '악몽', hell: '지옥', terror: '공포' };
    panel.style.cssText = 'position:fixed;inset:0;background:#000;overflow:hidden';
    const stage = el('div', `position:absolute;left:50%;top:50%;width:3840px;height:2160px;transform-origin:0 0;font-family:${FONT};color:#d8cdb0`);
    const fit = () => { const s = Math.min(innerWidth / 3840, innerHeight / 2160); stage.style.transform = `scale(${s}) translate(-50%,-50%)`; };
    fit(); addEventListener('resize', fit);
    panel.append(stage);
    // (x, y) 위치에 D2R 그림 한 장(원래 크기) 또는 빈 칸(w, h)
    const put = (parent, x, y, name, frame = 0, w, h) => {
      const m = name && ui.d2r()?.['hd/global/ui/' + name];
      const d = name ? ui.sp(name, frame, `position:absolute;left:${x}px;top:${y}px;width:${w ?? m?.frameW ?? 0}px;height:${h ?? m?.h ?? 0}px`) : el('div', `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px`);
      parent.append(d);
      return d;
    };
    const text = (parent, x, y, w, h, t, style = '') => { const d = put(parent, x, y, null, 0, w, h); d.textContent = __tag(t); d.style.cssText += `;font-size:38px;line-height:${h}px;white-space:nowrap;overflow:hidden;` + style; return d; };
    const input = (parent, x, y, w, h, ph = '', n = 24) => { const f = el('input', `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;background:#0008;border:0;outline:0;color:#f0f0f0;font:34px ${FONT};padding:0 12px`); f.placeholder = ph; f.maxLength = n; parent.append(f); return f; };
    const button = (parent, x, y, name, t, on, size = 38, w, h) => {
      const b = put(parent, x, y, name, 0, w, h);
      b.style.cursor = 'pointer';
      b.append(el('div', `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;white-space:nowrap;font-size:${size}px;color:#d8cdb0;text-shadow:0 2px 3px #000;pointer-events:none`, t));
      b.onmouseenter = () => b.frame(1); b.onmouseleave = () => b.frame(0); b.onmousedown = () => b.frame(2); b.onmouseup = () => b.frame(1);
      b.onclick = (e) => { e.stopPropagation(); on(); };
      return b;
    };
    const L = 'lobby/final/';
    put(stage, 0, 0, L + 'lobby_bg');
    // 가운데 판: 로고·내 캐릭터·이름
    put(stage, 1558, 4, L + 'lobby_centerpanel');
    put(stage, 422, 1681, L + 'lobby_bottompanel');
    const logo = el('canvas', 'position:absolute;left:1620px;top:80px;width:600px;height:315px'); logo.width = 400; logo.height = 210; stage.append(logo);
    const me = el('canvas', 'position:absolute;left:1620px;top:420px;width:600px;height:840px'); me.width = 600; me.height = 840; stage.append(me);
    const rc = globalThis.__remodChar;
    text(stage, 1640, 1292, 561, 58, rc?.name ?? name.split('#')[0], 'text-align:center;color:#f0f0f0');
    text(stage, 1590, 1350, 661, 50, rc ? `${rc.level ? rc.level + ' 레벨 ' : ''}${rc.cls}` : '', 'text-align:center;font-size:32px;color:#c7a24a');
    if (rc?.terror) text(stage, 1590, 1230, 661, 48, `공포 ${rc.terror.now} · 최고 ${rc.terror.best}단계${rc.terror.best >= 100 ? ' · 보스 탑' : ''}`, 'text-align:center;font-size:30px;color:#b080ff;text-shadow:0 2px 4px #000');

    // 왼쪽 판: 채널 대화
    const left = put(stage, 243, 25, L + 'lobby_leftpanel');
    put(stage, 240, 1676, L + 'lobby_bottombackingl');
    const chan = text(left, 177, 91, 951, 47, '대기실', 'text-align:center;font-size:36px');
    const log = put(left, 76, 184, null, 0, 1100, 1225);
    log.style.cssText += ';overflow-y:auto;font:34px "D2R Kodia",sans-serif;padding:0 12px;box-sizing:border-box';
    text(left, 178, 1453, 110, 100, '[대기실]', 'font-size:28px;color:#aaa');
    const say = input(left, 298, 1478, 705, 52, '', 200);
    say.onkeydown = async (e) => { e.stopPropagation(); if (e.key !== 'Enter' || !say.value.trim()) return; const t = say.value.trim(); say.value = ''; sayText(t, 'room'); };
    button(left, 1012, 1458, L + 'sendbutton', '보내기', () => say.onkeydown({ key: 'Enter', stopPropagation() {} }), 34);
    button(left, 76, 1458, L + 'friends_button', '', () => guildPanel());

    // 오른쪽 판: 게임 생성 / 게임 참가 / 래더
    const right = put(stage, 2291, 27, L + 'lobby_rightpanel');
    put(stage, 3420, 1676, L + 'lobby_bottombackingr');
    let tab = 'join', pick = null, diffPick = 'normal', ladder = 'arena';
    const tabsBox = put(right, 67, 81, null, 0, 1170, 101);
    const sub = put(stage, 2372, 210, null, 0, 1136, 1224);
    button(right, 78, 1457, L + 'lobbybutton', '대기실 나가기', () => { wrap.remove(); globalThis.__gm?.toMainMenu?.(); setTimeout(() => globalThis.__remodChars?.(true), 300); });
    const enter = async (b) => {
      const g = await roomOf(b), lock = diffLocked(g);
      if (lock) return note(lock);
      const r = await api('POST', '/room', { name, ...b });
      if (r.status !== 200) return note({ exists: '이미 있는 게임 이름입니다.', not_found: '없는 게임입니다.', bad_pw: '비밀번호가 틀렸습니다.', full: '게임이 꽉 찼습니다.', no_guild: '길드에 들어가야 길드전을 할 수 있습니다.', other_guild: '이 길드전에 정해진 길드가 아닙니다.' }[r.json?.error] ?? '요청 실패');
      room = r.json.room; ch = 'room'; await poll();
      note(`${room} 게임에 들어갔습니다.`);
      // 판을 먼저 시작하고 불러오기 화면이 뜬 뒤 닫음(먼저 닫으면 뒤에 있던 지난 화면이 잠깐 비침)
      joined = g && (g.mode ?? 'coop') === 'coop' ? { ...g, room } : null;
      const hp0 = joined && (await hostPlace(joined));
      if (hp0?.startsWith('run:')) { joined.start = 'dungeon'; joined.act = +hp0.split(':')[1] + 1; } // 방장이 던전 중이면 그 막으로 바로 // 방장이 던전 중이면 바로 던전으로
      afterStart(playRoom(joined ?? g), () => { removeEventListener('resize', fit); wrap.remove(); });
    };
    const drawTabs = () => {
      tabsBox.replaceChildren();
      [['create', '게임 생성'], ['join', '게임 참가'], ['ladder', '래더']].forEach(([k, t], i) => {
        const b = put(tabsBox, i * 387, 0, L + 'lobbytabs', k === tab ? 1 : 0);
        b.style.cursor = 'pointer';
        b.append(el('div', `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:36px;color:${k === tab ? '#ffd870' : '#8a8478'};${k === tab ? 'text-shadow:0 0 12px #c80;border-bottom:4px solid #c7a24a;box-sizing:border-box' : ''}`, t));
        if (k === tab) b.style.filter = 'brightness(1.35)';
        b.onclick = () => { tab = k; drawRight(); };
      });
    };
    const drawRight = async () => {
      drawTabs();
      sub.replaceChildren();
      if (tab === 'create') {
        put(sub, 0, 0, 'lobby/creategame/creategamebg');
        put(sub, 178, 105, 'lobby/creategame/creategame_textboxes');
        text(sub, 200, 58, 730, 44, '게임 이름', 'color:#c7a24a');
        const gn = input(sub, 204, 112, 720, 46);
        text(sub, 200, 196, 730, 44, '비밀번호 (선택)', 'color:#c7a24a');
        const pw = input(sub, 204, 250, 720, 46); pw.type = 'password';
        text(sub, 200, 334, 730, 44, '게임 설명 (선택)', 'color:#c7a24a');
        const ds = input(sub, 204, 388, 720, 74, '', 60);
        const diffBox = put(sub, 0, 0, null, 0, 1136, 1224); diffBox.style.pointerEvents = 'none';
        const drawD = () => {
          diffBox.replaceChildren();
          Object.entries(DIFF).forEach(([k, t], i) => {
            const b = button(diffBox, [200, 395, 590, 785][i], 500, 'lobby/creategame/creategame_difficultybtn', k === diffPick ? '✓ ' + t : t, () => { diffPick = k; drawD(); showTier(); globalThis.__drawS?.(); }, 32, 190, 70);
            b.style.pointerEvents = 'auto';
            if (k === diffPick) put(diffBox, [200, 395, 590, 785][i], 500, 'lobby/creategame/difficultyselector', 0, 190, 70);
          });
        };
        drawD();
        // 공포 고르면 단계 칸(1 ~ 내 지금 단계). 내 단계보다 낮으면 다시하기로 그 단계
        const tierNow = terrorNow(globalThis.__remodChar?.id);
        const tierLbl = text(sub, 200, 575, 300, 44, '공포 단계', 'color:#b080ff'), tierMax = text(sub, 700, 575, 300, 44, tierNow ? `1~${tierNow}단계 가능` : '공포 영역 안 열림', 'color:#8a8478');
        const tierIn = input(sub, 520, 570, 160, 50, String(tierNow || 1), 4); tierIn.type = 'number'; tierIn.min = 1; tierIn.max = tierNow || 1;
        const showTier = () => { const n = terrorNow(globalThis.__remodChar?.id); tierMax.textContent = n ? `1~${n}단계 가능` : '공포 영역 안 열림'; tierIn.max = n || 1; tierLbl.style.display = tierMax.style.display = tierIn.style.display = diffPick === 'terror' ? '' : 'none'; };
        showTier();
        let max = 4, mode = 'coop', opt = { rounds: 3, split: 'all', mins: 3 };
        const MODES = [['coop', '협동'], ['duel', '결투 1:1'], ['team', '다대다 4:4'], ['guild', '길드전']], MAXES = { duel: 2, team: 8 };
        const modeBox = put(sub, 0, 0, null, 0, 1136, 1224); modeBox.style.pointerEvents = 'none';
        const drawM = () => { modeBox.replaceChildren(); MODES.forEach(([k, t], i) => { const b = button(modeBox, 200 + i * 183, 1000, 'lobby/creategame/creategame_difficultybtn', k === mode ? '✓ ' + t : t, () => { mode = k; if (MAXES[k]) { max = MAXES[k]; maxN.textContent = max; } if (k === 'guild') { max = 16; maxN.textContent = '8:8'; } drawM(); globalThis.__drawS?.(); }, 26, 180, 60); b.style.pointerEvents = 'auto'; if (k === mode) b.style.filter = 'brightness(1.5) sepia(.4)'; });
          // 모드별 규칙: 결투 판 수 / 팀전 승패 방식 / 길드전 시간
          const OPTS = { duel: ['rounds', [[1, '단판'], [3, '3판 2선승'], [5, '5판 3선승']]], team: ['split', [['all', '승자독식'], ['solo', '각자 대결']]], guild: ['mins', [[3, '3분'], [4, '4분'], [5, '5분']]] }[mode];
          if (OPTS) OPTS[1].forEach(([v, t], i) => { const b = button(modeBox, 200 + i * 245, 860, 'lobby/creategame/creategame_difficultybtn', opt[OPTS[0]] === v ? '✓ ' + t : t, () => { opt[OPTS[0]] = v; drawM(); }, 26, 240, 60); b.style.pointerEvents = 'auto'; if (opt[OPTS[0]] === v) b.style.filter = 'brightness(1.5) sepia(.4)'; });
        };
        text(sub, 200, 950, 560, 44, '모드', 'color:#c7a24a');
        text(sub, 200, 623, 560, 56, '최대 플레이어 수', 'color:#c7a24a');
        put(sub, 810, 610, 'lobby/creategame/numbercounterslot');
        const maxN = text(sub, 810, 610, 121, 72, '4', 'text-align:center;color:#fff');
        button(sub, 940, 606, L + 'dropdown_arrows', '', () => { if (MAXES[mode]) return; if (mode === 'guild') { max = Math.min(16, max + 2); maxN.textContent = `${max / 2}:${max / 2}`; return; } max = Math.min(8, max + 1); maxN.textContent = max; });
        button(sub, 940, 645, L + 'dropdown_arrows', '', () => { if (MAXES[mode]) return; if (mode === 'guild') { max = Math.max(4, max - 2); maxN.textContent = `${max / 2}:${max / 2}`; return; } max = Math.max(2, max - 1); maxN.textContent = max; });
        drawM();
        let hard = false;
        const hb = put(sub, 200, 699, 'lobby/creategame/creategame_advancedcheckbox', 0);
        const hv = el('div', 'position:absolute;inset:0;display:none;align-items:center;justify-content:center;font:bold 56px sans-serif;color:#ffd870;text-shadow:0 0 8px #c80;pointer-events:none', '✓'); hb.append(hv);
        hb.style.cursor = 'pointer'; hb.onclick = () => { hard = !hard; hb.frame(hard ? 1 : 0); hv.style.display = hard ? 'flex' : 'none'; };
        text(sub, 300, 714, 760, 44, '파티 어려움 모드 (체력 2.5배·경험치 2배)', 'color:#c49cff;font-size:32px');
        // 시작 위치(협동): 마을(야영지 포탈 앞) / 던전(바로 판 시작)
        let start = 'town';
        const startLbl = text(sub, 200, 800, 280, 44, '시작 위치', 'color:#c7a24a');
        // 길드전 연합(선택): "우리 연합 길드 vs 상대 길드" 쉼표로. 비우면 방장 길드 vs 처음 들어온 다른 길드
        const allyLbl = text(sub, 200, 800, 280, 44, '연합 (선택)', 'color:#c7a24a'), allyIn = input(sub, 480, 790, 500, 50); allyIn.placeholder = '우리편길드,… vs 상대길드,…';
        const startBox = put(sub, 0, 0, null, 0, 1136, 1224); startBox.style.pointerEvents = 'none';
        const drawS = () => { startBox.replaceChildren(); [['town', '마을'], ['dungeon', '던전']].forEach(([k, t], i) => { const b = button(startBox, 480 + i * 205, 785, 'lobby/creategame/creategame_difficultybtn', k === start ? '✓ ' + t : t, () => { start = k; drawS(); globalThis.__drawS?.(); }, 30, 190, 70); b.style.pointerEvents = 'auto'; }); startBox.style.display = startLbl.style.display = mode === 'coop' ? '' : 'none'; allyLbl.style.display = allyIn.style.display = mode === 'guild' ? '' : 'none'; };
        drawS(); globalThis.__drawS = drawS;
        let act = 1;
        const actBox = put(sub, 0, 0, null, 0, 1136, 1224); actBox.style.pointerEvents = 'none';
        const drawAct = () => { actBox.replaceChildren(); [1, 2, 3, 4, 5].forEach((n) => { const b = button(actBox, 480 + (n - 1) * 120, 870, 'lobby/creategame/creategame_difficultybtn', (n === act ? '✓ ' : '') + n + '막', () => { act = n; drawAct(); }, 26, 110, 60); b.style.pointerEvents = 'auto'; }); actBox.style.display = mode === 'coop' && start === 'dungeon' && diffPick !== 'terror' ? '' : 'none'; };
        drawAct(); const drawS0 = drawS; globalThis.__drawS = () => { drawS0(); drawAct(); };
        button(sub, 332, 1090, 'frontend/hd/final/frontend_buttonmed', '게임 생성', () => gn.value.trim() && enter({ act: 'create', room: gn.value.trim(), pw: pw.value, desc: ds.value.trim(), diff: diffPick, start, startAct: act, tier: Math.max(1, Math.min(9999, Math.floor(+tierIn.value) || 1)), max, hard, mode, ...opt, ...mode === 'guild' && { size: max / 2, ga: allyIn.value.split(/vs/i)[0] ?? '', gb: allyIn.value.split(/vs/i)[1] ?? '' } }));
        gn.focus();
      } else if (tab === 'join') {
        put(sub, 0, 0, 'lobby/joingame/joingame_bg');
        const rooms = ((await api('GET', '/room')).json ?? []).filter((g) => g.room !== '로비');
        text(sub, 25, 8, 400, 44, '게임 이름', 'color:#c7a24a');
        const gn = input(sub, 37, 64, 504, 46); gn.value = pick ?? '';
        text(sub, 575, 8, 400, 44, '비밀번호', 'color:#c7a24a');
        const pw = input(sub, 587, 64, 504, 46); pw.type = 'password';
        text(sub, 25, 130, 400, 44, '검색', 'color:#c7a24a');
        const q = input(sub, 37, 180, 504, 46);
        button(sub, 587, 166, 'frontend/hd/final/frontend_buttonsmall', '새로 고침', drawRight, 30, 240, 60);
        text(sub, 27, 243, 400, 44, '게임 이름', 'color:#8a8478;font-size:32px');
        text(sub, 497, 243, 200, 44, '플레이어', 'color:#8a8478;font-size:32px');
        const list = put(sub, 30, 288, null, 0, 597, 760); list.style.overflowY = 'auto';
        const info = put(sub, 695, 353, null, 0, 410, 695); info.style.cssText += ';text-align:center;font-size:32px';
        put(sub, 690, 288, 'lobby/joingame/joingame_tabs', 0);
        text(sub, 690, 288, 210, 60, '설정', 'text-align:center;font-size:30px');
        const drawInfo = (g) => {
          info.replaceChildren();
          if (!g) return;
          const mins = Math.floor((Date.now() - g.at) / 60000);
          for (const [k, v] of [['난이도', g.diff === 'terror' ? `공포 ${g.tier ?? 1}단계` : DIFF[g.diff] ?? '보통'], ['경과 시간', g.at ? `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}` : '-'], ['시작', (g.mode ?? 'coop') === 'coop' ? (g.start === 'dungeon' ? '던전' : '마을') : '마을(준비 후 경기장)'], ['모드', ({ duel: '결투 1:1', team: '다대다 4:4', guild: '길드전 8:8' }[g.mode] ?? '협동') + ({ duel: ` · ${{ 1: '단판', 3: '3판 2선승', 5: '5판 3선승' }[g.rounds] ?? ''}`, team: g.split === 'solo' ? ' · 각자 대결' : ' · 승자독식', guild: ` · ${g.mins ?? 3}분` }[g.mode] ?? '') + (g.hard ? ' · 어려움' : '')], ['설명', g.desc || '-'], ['플레이어', g.players.join(', ')]]) info.append(el('div', 'color:#8a8478;margin-top:14px', k), el('div', 'color:#f0f0f0;font:30px "D2R Kodia",sans-serif', v));
        };
        const drawList = () => {
          list.replaceChildren();
          rooms.filter((g) => !q.value.trim() || g.room.includes(q.value.trim())).forEach((g, i) => {
            const row = put(list, 0, i * 54, 'lobby/joingame/joingame_slats', g.room === pick ? 1 : 0, 597, 54);
            row.style.position = 'absolute'; row.style.cursor = 'pointer';
            row.append(el('div', `position:absolute;left:8px;top:0;width:470px;height:54px;line-height:54px;font:30px "D2R Kodia",sans-serif;color:#f0f0f0;overflow:hidden;white-space:nowrap`, (g.locked ? '🔒 ' : '') + g.room), el('div', 'position:absolute;left:500px;top:0;width:90px;height:54px;line-height:54px;font-size:30px;color:#ccc', `${g.count}/${g.max}`));
            row.onclick = () => { pick = g.room; gn.value = g.room; drawList(); drawInfo(g); };
            row.ondblclick = () => enter({ act: 'join', room: g.room, pw: pw.value });
          });
          if (!rooms.length) text(list, 10, 10, 580, 54, '열린 게임이 없습니다.', 'color:#8a8478;font-size:30px');
        };
        q.oninput = drawList;
        drawList(); drawInfo(rooms.find((g) => g.room === pick));
        button(sub, 330, 1080, 'frontend/hd/final/frontend_buttonmed', '게임 참가', () => gn.value.trim() && enter({ act: 'join', room: gn.value.trim(), pw: pw.value }));
      } else {
        put(sub, 0, 30, 'lobby/ladder/ladder_mainpanel');
        put(sub, 10, 262, 'lobby/ladder/ladder_list');
        // 래더: D2R 래더 판 위쪽 세 칸 = [종류] [직업] [내 순위]. 종류: 아레나(PvP 승점) · 보스 탑 버티기 · 공포 영역 최고 단계
        const KINDS = [['arena', '아레나'], ['tower', '보스 탑'], ['terror', '공포 영역']], KO = globalThis.__d2ui?.KO ?? {};
        const sel = (x, w, opts, val, on) => { const f = el('select', `position:absolute;left:${x}px;top:32px;width:${w}px;height:54px;background:#000c;color:#e8d8a8;border:0;outline:0;font:30px ${FONT};padding:0 10px;cursor:pointer`); for (const [k, t] of opts) { const o = el('option', 'background:#111;color:#e8d8a8', t); o.value = k; f.append(o); } f.value = val; f.onchange = () => on(f.value); sub.append(f); return f; };
        sel(4, 300, KINDS, ladder, (v) => { ladder = v; drawRight(); });
        sel(324, 300, [['', '모든 직업'], ...Object.entries(KO)], globalThis.__ladderCls ?? '', (v) => { globalThis.__ladderCls = v; drawRight(); });
        let rows = [];
        const cls = globalThis.__ladderCls ?? '', me = name.split('#')[0];
        if (ladder === 'arena') rows = ((await api('GET', '/pvp?rank=1')).json ?? []).map((x) => [x.name, `${x.win}승 ${x.lose}패`, `${x.pts}점`, null]);
        else if (ladder === 'tower') { const t = (await api('GET', '/tower')).json ?? {}; rows = Object.entries(t).flatMap(([boss, rs]) => rs.map((x) => ({ boss, ...x }))).sort((p, q) => q.time - p.time).map((x) => [x.name, x.boss, `${Math.floor(x.time / 60)}분 ${Math.floor(x.time % 60)}초`, x.cls ?? null]); }
        else rows = ((await api('GET', '/rank')).json ?? []).map((x) => [x.name, `${KO[x.cls] ?? x.cls ?? ''} ${x.level ?? ''}`, `${x.tier}단계 · ${Math.round(x.time)}분`, x.cls]);
        if (cls) rows = rows.filter((r) => !r[3] || r[3] === cls);
        const mine = rows.findIndex((r) => String(r[0]).split('#')[0] === me);
        text(sub, 694, 32, 346, 54, mine >= 0 ? `내 순위 ${mine + 1}위` : '내 순위 없음', 'font-size:30px;text-align:center;color:#ffd870');
        // 목록 위 빈 줄 = 칸 제목
        const HEAD = { arena: ['순위', '이름', '전적', '승점'], tower: ['순위', '이름', '보스', '버틴 시간'], terror: ['순위', '이름', '직업', '단계 · 시간'] }[ladder];
        [[23, 230], [263, 300], [573, 240], [813, 300]].forEach(([x, w], i) => text(sub, x, 180, w, 54, HEAD[i], 'font-size:28px;color:#8a8478'));
        rows = rows.slice(0, 12);
        rows.forEach(([n, mid, val], i) => {
          const y = 264 + i * 54, my = String(n).split('#')[0] === me;
          text(sub, 23, y, 230, 54, `${i + 1}`, 'font-size:32px' + (my ? ';color:#ffd870' : ''));
          text(sub, 263, y, 400, 54, String(n).split('#')[0], 'font:30px "D2R Kodia",sans-serif' + (my ? ';color:#ffd870' : ''));
          text(sub, 573, y, 300, 54, mid, 'font-size:30px;color:#c7a24a');
          text(sub, 813, y, 300, 54, val, 'font-size:30px');
        });
        if (!rows.length) text(sub, 40, 280, 900, 54, '아직 기록이 없습니다.', 'color:#8a8478;font-size:32px');
      }
    };
    drawRight();

    // 아래 판: 채널 사람들 캐릭터
    const strip = el('canvas', 'position:absolute;left:520px;top:1700px;width:2800px;height:440px'); strip.width = 2800; strip.height = 440; stage.append(strip);
    put(stage, 291, 1821, L + 'lobbyarrowlargel'); put(stage, 3452, 1823, L + 'lobbyarrowlarger');

    const LG = fe.logo.layers.map((a) => [a, ui.img(a.file)]), sprite = {};
    const anim = (cls) => (cls && fe.heroSelect.heroes[cls] ? (sprite[cls] ??= [fe.heroSelect.heroes[cls].selected, ui.img(fe.heroSelect.heroes[cls].selected.file)]) : null);
    // 장비 입은 모습: 내 것은 이 PC 에 찍어 둔 것(서버에도 올림), 다른 사람 것은 서버 /look 에서
    const myLook0 = rc?.key && JSON.parse(localStorage.getItem('d2vr/look/' + rc.key) ?? 'null'), myLook = myLook0?.cls === rc?.id ? myLook0 : null; // 직업이 같은 모습만
    if (myLook) api('POST', '/look', { look: myLook });
    let mine = ui.lookAnim(myLook) ?? anim(rc?.id), lookAt = 0;
    const others = {};
    const lookOf = (m) => { if (m === name) return mine; if (!(m in others)) { others[m] = null; api('GET', `/look?who=${encodeURIComponent(m)}`).then((r) => (others[m] = ui.lookAnim(r.json))); } return others[m]; };
    const draw = (t) => {
      if (!wrap.isConnected) return;
      requestAnimationFrame(draw);
      const lc = logo.getContext('2d');
      lc.clearRect(0, 0, 400, 210);
      for (const [a, i] of LG) { lc.globalCompositeOperation = a.blend === 'add' ? 'lighter' : 'source-over'; ui.frame(lc, a, i, t, 200, 110); }
      lc.globalCompositeOperation = 'source-over';
      lc.font = `bold 30px ${FONT}`; lc.textAlign = 'center'; lc.fillStyle = '#b01818'; lc.shadowColor = '#600'; lc.shadowBlur = 14; lc.fillText('뱀파이어 리모드', 200, 198); lc.shadowBlur = 0;
      // 게임에 들어가서 장비 모습이 새로 찍히면 바로 바꿔 그림(서버에도 올림)
      if (!mine?.[2] && rc?.key && t - lookAt > 2000) { lookAt = t; const lk = JSON.parse(localStorage.getItem('d2vr/look/' + rc.key) ?? 'null'); if (lk?.cls === rc.id) { mine = ui.lookAnim(lk); api('POST', '/look', { look: lk }); } }
      const mc = me.getContext('2d');
      mc.clearRect(0, 0, 600, 840);
      if (mine) { mc.imageSmoothingEnabled = !mine[2]; mc.imageSmoothingQuality = 'high'; ui.frame(mc, mine[0], mine[1], t, mine[2] ? 300 : 330, mine[2] ? 760 : 430, (mine[2] ? 620 : 560) / mine[0].height); }
      const sc = strip.getContext('2d');
      sc.clearRect(0, 0, 2800, 440);
      members.slice(0, 8).forEach((m, i) => {
        const f = faces[m], a = lookOf(m) ?? anim(f?.cls) ?? anim('barbarian'), x = 175 + i * 350;
        sc.globalAlpha = f ? 1 : 0.4; sc.imageSmoothingEnabled = !a[2];
        ui.frame(sc, a[0], a[1], t + i * 400, x, a[2] ? 380 : 230, (a[2] ? 300 : 330) / a[0].height);
        sc.globalAlpha = 1;
        sc.font = '30px "D2R Kodia",sans-serif'; sc.textAlign = 'center'; sc.fillStyle = m === name ? '#ff6' : '#ddd';
        sc.fillText(`${f?.char ? f.char + ' · ' : ''}${m.split('#')[0]}`, x, 425);
        const rl = globalThis.__rankLabel(m); if (rl) { sc.font = '24px "D2R Kodia",sans-serif'; sc.fillStyle = '#e8c860'; sc.fillText(rl, x, 392); }
      });
    };
    requestAnimationFrame(draw);
    const paint = () => {
      if (!wrap.isConnected) { removeEventListener('resize', fit); return clearInterval(tm); }
      chan.textContent = `${room} (${members.length})`;
      log.replaceChildren(...lines.slice(-200).map((m) => {
        const d = el('div', 'margin:4px 0'), i = m.text.indexOf(': '), c = CH.find(([k]) => k === m.ch)?.[2] ?? '#f0f0f0';
        if (m.ch && i > 0) d.append(el('span', `color:${c};opacity:.85`, `[${chName(m.ch)}] `), el('span', 'color:#e8c860', m.text.slice(0, i) + ': '), el('span', `color:${c}`, m.text.slice(i + 2)));
        else d.append(el('span', 'color:#6aa8ff', m.text));
        return d;
      }));
      log.scrollTop = log.scrollHeight;
    };
    const tm = setInterval(paint, 500);
    paint(); say.focus();
  };
  // 메인 [멀티플레이] → 원작 캐릭터 선택 → 게임에 들어가면(camp) 대기실 전체 화면
  let wasCamp = false;
  setInterval(() => {
    const camp = ['camp', 'playing'].includes(globalThis.__gm?.state);
    if (camp && !wasCamp && globalThis.__mpFlow) { globalThis.__mpFlow = false; bnet(); }
    wasCamp = camp;
  }, 300);
  globalThis.__openLobby = roomPanel;
  globalThis.__bnet = bnet; // 캐릭터 선택 [대기실 입장]이 게임을 켜지 않고 바로 부름
  const start = () => { document.body.append(box); draw(); poll(); setInterval(poll, 2000); rankLoad(); setInterval(rankLoad, 300e3); };
  document.body ? start() : addEventListener('DOMContentLoaded', start);
})();
