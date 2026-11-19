// 게임을 켜고 키·클릭 순서를 보낸 뒤 스크린샷 (시험용)
const { spawn } = require('node:child_process'); const path = require('node:path'); const fs = require('node:fs');
const ROOT = 'C:/Users/Administrator/Desktop/D2S-Remod';
const steps = JSON.parse(process.argv[2]);
spawn(path.join(ROOT, 'game', 'D2 Survivors.exe'), ['--remote-debugging-port=9333'], { env: { ...process.env, D2S_USER_DATA: path.join(ROOT, 'save'), D2S_LEADERBOARD_URL: 'http://127.0.0.1:8520' }, detached: true, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let page; for (let i = 0; i < 30 && !page; i++) { await sleep(1000); try { page = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((p) => p.type === 'page' && p.url.startsWith('app://game')); } catch {} }
  const ws = new WebSocket(page.webSocketDebuggerUrl); let id = 0; const wait = new Map();
  const send = (method, params = {}) => new Promise((r) => { wait.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') console.log('EXC', d.params.exceptionDetails.exception?.description?.slice(0, 500)); wait.get(d.id)?.(d.result); };
  await new Promise((r) => (ws.onopen = r)); await send('Runtime.enable'); await sleep(9000);
  let n = 0;
  for (const s of steps) {
    if (s.key) for (const t of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type: t, key: s.key, code: s.code ?? s.key, windowsVirtualKeyCode: s.vk ?? 0 });
    if (s.click) for (const t of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type: t, x: s.click[0], y: s.click[1], button: s.right ? 'right' : 'left', clickCount: 1 });
    if (s.text) await send('Input.insertText', { text: s.text });
    if (s.eval) { const r = await send('Runtime.evaluate', { expression: s.eval, returnByValue: true }); console.log('EVAL', JSON.stringify(r?.result?.value)?.slice(0, 1500)); }
    await sleep(s.wait ?? 1500);
    if (s.shot) { const r = await send('Page.captureScreenshot'); fs.writeFileSync(path.join(process.env.TEMP, `drive${++n}.png`), Buffer.from(r.data, 'base64')); }
  }
  process.exit(0);
})();
