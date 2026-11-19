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
  const get = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const CH = [['room', '일반', '#fff'], ['all', '전체', '#ddd'], ['trade', '거래', '#8cf'], ['guild', '길드', '#7e7']];
  const HELP = '명령: /이름 닉네임 (번호 #00000 은 자동, 이 PC 세이브에 고정) · 대기실은 [대기실] 버튼, 길드는 [길드 관리] 버튼';
  let ch = get('d2s:chatch', 'room'), name = '', room = '로비', members = [], since = 0, guild = null, open = false;
  const lines = [];
  const css = (on) => `padding:2px 8px;font:12px sans-serif;cursor:pointer;border:1px solid #5a4a2a;background:${on ? '#3a3020' : '#151209'};color:${on ? '#fff' : '#c8b27a'}`;
  const btn = (text, on, active) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = css(active);
    b.onclick = (e) => { e.stopPropagation(); on(); };
    return b;
  };
  const el = (tag, style, text) => { const d = document.createElement(tag); d.style.cssText = style ?? ''; d.textContent = text ?? ''; return d; };

  const box = el('div', 'position:fixed;right:8px;bottom:23%;width:440px;z-index:99990;font:13px sans-serif;color:#ddd;pointer-events:auto');
  box.id = '__chat';
  const tabs = el('div', 'display:flex;gap:2px;align-items:center');
  const list = el('div', 'height:150px;overflow-y:auto;background:#000a;padding:3px 6px;border:1px solid #5a4a2a');
  const input = el('input', 'display:none;width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #8a6d3b;padding:3px 6px;font:13px sans-serif');
  input.maxLength = 200;
  box.append(tabs, list, input);

  const note = (text) => { lines.push({ text, color: '#c8b27a' }); draw(); };
  const draw = () => {
    tabs.replaceChildren(
      ...CH.map(([k, l]) => btn(k === 'room' ? `${l}(${room})` : l, () => { ch = k; set('d2s:chatch', k); draw(); }, k === ch)),
      el('span', 'margin-left:auto'),
      btn('숙제', () => globalThis.__remodQuests?.(), false),
      btn('대기실', roomPanel, false),
      btn(guild ? `길드 관리 (${guild})` : '길드 관리', guildPanel, false),
      btn('?', () => (globalThis.__remodGuide ? globalThis.__remodGuide() : note(HELP)), false),
    );
    // 알림(ch 없음)은 모든 탭에, 대화는 그 채널 탭에만
    list.replaceChildren(...lines.filter((m) => !m.ch || m.ch === ch).slice(-200).map((m) => el('div', `color:${m.color ?? CH.find(([k]) => k === m.ch)?.[2]}`, m.text)));
    list.scrollTop = list.scrollHeight;
  };

  // 대기실 창(원작 배틀넷 게임 목록처럼 크게): 왼쪽 공개 방 목록, 오른쪽 방 만들기/참가 탭, 아래 지금 방 사람들
  const D2BTN = 'padding:8px 22px;font:bold 15px "D2 Exocet",Cinzel,serif;letter-spacing:1px;cursor:pointer;color:#e8d8a8;background:linear-gradient(#5a5650,#2c2a26);border:2px solid #8a6d3b;box-shadow:inset 0 0 0 1px #000,0 2px 0 #000';
  const bigBtn = (text, on) => { const b = btn(text, on); b.style.cssText = D2BTN; return b; };
  const roomPanel = async () => {
    globalThis.__openLobby = roomPanel;
    if (!name) return note('서버에 연결되지 않았습니다.');
    const { wrap, panel, row, field } = modal('__room', true);
    let tab = 'join', pick = '';
    const enter = async (body) => {
      const r = await api('POST', '/room', { name, ...body });
      if (r.status !== 200) return note({ exists: '이미 있는 방 이름입니다.', not_found: '없는 방입니다.', bad_pw: '비밀번호가 틀렸습니다.', full: '방이 꽉 찼습니다 (4명).' }[r.json?.error] ?? '방 요청 실패');
      room = r.json.room; lines.splice(0, lines.length, ...lines.filter((m) => m.ch !== 'room')); note(`대기방: ${room}`); ch = 'room'; await poll(); render();
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
      panel.replaceChildren(title, cols, here, row(el('span', 'flex:1'), bigBtn('닫기', () => wrap.remove())));
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
    for (const m of r.json) { const { at, ...item } = m.item; (s.stashTabs.shared9 ??= []).push(item); note(`${m.from} 님이 아이템을 보냈습니다: ${String(globalThis.__ko?.(item.name) ?? item.name)} (공유 창고 9)`); }
    globalThis.__saveNow?.();
  };
  // 창 틀: 배경 클릭·닫기로 닫힘, 안의 키 입력은 게임으로 안 보냄
  const modal = (id, big) => {
    document.getElementById(id)?.remove();
    const wrap = el('div', 'position:fixed;inset:0;z-index:99995;background:rgb(0 0 0/.6);display:flex;align-items:center;justify-content:center;font:14px sans-serif;color:#c8b27a');
    wrap.id = id;
    const panel = el('div', big ? 'width:min(900px,92vw);max-height:88vh;overflow:auto;padding:22px 26px;background:radial-gradient(ellipse at top,#2a2418,#0c0a07 70%);border:3px ridge #8a6d3b;box-shadow:0 0 0 2px #000,0 0 40px #000' : 'background:#111;border:2px solid #5a4a2a;padding:14px 18px;min-width:400px;max-height:80vh;overflow:auto');
    wrap.append(panel);
    wrap.onclick = (e) => { if (e.target === wrap) wrap.remove(); };
    wrap.onkeydown = (e) => e.stopPropagation();
    wrap.onkeyup = (e) => e.stopPropagation();
    document.body.append(wrap);
    const row = (...kids) => { const d = el('div', 'display:flex;gap:6px;align-items:center;margin:4px 0'); d.append(...kids); return d; };
    const field = (ph, n = 16) => { const f = el('input', 'flex:1;background:#000;color:#fff;border:1px solid #5a4a2a;padding:3px 6px'); f.placeholder = ph; f.maxLength = n; return f; };
    return { wrap, panel, row, field };
  };
  // 길드 창: 길드가 없으면 목록·가입·만들기, 있으면 길드장·공지·길드원(길드장은 추방·공지 수정)·탈퇴
  const guildPanel = async () => {
    if (!name) return note('서버에 연결되지 않았습니다.');
    const { wrap, panel, row, field } = modal('__guild', true);
    const fail = (r) => ({ exists: '이미 있는 길드입니다.', not_found: '없는 길드입니다.', in_guild: '이미 길드에 있습니다.', not_leader: '길드장만 할 수 있습니다.' }[r.json?.error] ?? '요청 실패');
    const act = async (body) => { const r = await api('POST', '/guild', { name, ...body }); if (r.status !== 200) note(fail(r)); else guild = r.json?.guild ?? null; render(); };
    const render = async () => {
      panel.replaceChildren(el('div', 'font-size:18px;margin-bottom:8px', '길드'));
      if (!guild) {
        const all = (await api('GET', '/guild')).json ?? [];
        panel.append(el('div', 'color:#888;font-size:12px', '가입할 길드를 고르거나 새로 만드세요.'));
        for (const g of all) panel.append(row(el('span', 'flex:1;color:#ddd', `${g.guild}  (${g.members}명 · 길드장 ${g.leader})`), btn('가입', () => act({ act: 'join', guild: g.guild }))));
        if (!all.length) panel.append(el('div', 'color:#888', '아직 길드가 없습니다.'));
        const f = field('새 길드 이름 (16자)');
        panel.append(row(f, btn('만들기', () => f.value.trim() && act({ act: 'create', guild: f.value.trim() }))));
      } else {
        const g = (await api('GET', `/guild?g=${encodeURIComponent(guild)}`)).json;
        if (!g) { guild = null; return render(); }
        const lead = g.leader === name;
        panel.append(el('div', 'color:#7e7;font-size:16px', g.guild), el('div', 'color:#ddd;margin:4px 0', `공지: ${g.notice || '(없음)'}`));
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
    if (cmd === '이름' && arg) return api('POST', '/id', { nick: arg.slice(0, 12) }).then((r) => { if (r.json?.name) { name = r.json.name; set('d2s:nick', arg.slice(0, 12)); note(`이름: ${name}`); } else note('이름을 바꾸지 못했습니다.'); });
    note(HELP);
  };
  const poll = async () => {
    box.style.display = ['camp', 'playing'].includes(globalThis.__gm?.state) ? '' : 'none';
    if (!name) { const r = await api('POST', '/id', { nick: get('d2s:nick', '') }); if (!r.json?.name) return; name = r.json.name; note(`내 이름: ${name}  (/이름 으로 닉네임 변경)`); }
    const r = await api('GET', `/chat?since=${since}&name=${encodeURIComponent(name)}`);
    if (!r.json) return;
    guild = r.json.guild; members = r.json.members ?? [];
    if (r.json.mail > 0) takeMail();
    if (r.json.room && r.json.room !== room) { room = r.json.room; lines.splice(0, lines.length, ...lines.filter((m) => m.ch !== 'room')); }
    for (const m of r.json.rows) {
      since = Math.max(since, m.id);
      lines.push({ ch: m.ch, text: `${m.guild && m.ch !== 'guild' ? `<${m.guild}> ` : ''}${m.name}: ${m.text}` });
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
    if (text.startsWith('/')) return command(text);
    if (!name) return note('서버에 연결되지 않았습니다.');
    const title = globalThis.__remodTitle?.();
    const r = await api('POST', '/chat', { ch, name, text: title ? `「${title}」 ${text}` : text });
    if (r.status !== 201) note(r.json?.error === 'no_guild' ? '길드가 없습니다. [길드] 버튼으로 가입하세요.' : '보내지 못했습니다 (서버 확인).');
    poll();
  };
  input.onkeyup = (e) => e.stopPropagation();
  addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || open || e.repeat || document.activeElement?.tagName === 'INPUT') return;
    if (!['camp', 'playing'].includes(globalThis.__gm?.state)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    open = true; input.style.display = 'block'; input.focus();
  }, true);
  globalThis.__openLobby = roomPanel;
  const start = () => { document.body.append(box); draw(); poll(); setInterval(poll, 2000); };
  document.body ? start() : addEventListener('DOMContentLoaded', start);
})();
