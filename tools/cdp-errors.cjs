// Remod 게임을 디버그 포트로 켜서 페이지를 새로 고치고 콘솔 오류를 모아 출력한다 (시험용)
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const ROOT = path.join(__dirname, '..');
const game = spawn(path.join(ROOT, 'game', 'D2 Survivors.exe'), ['--remote-debugging-port=9333'], {
  env: { ...process.env, D2S_USER_DATA: path.join(ROOT, 'save'), D2S_LEADERBOARD_URL: 'http://127.0.0.1:8520' }, detached: true, stdio: 'ignore',
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let page;
  for (let i = 0; i < 30 && !page; i++) { await sleep(1000); try { page = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((p) => p.type === 'page' && p.url.startsWith('app://game')); } catch {} }
  if (!page) { console.log('페이지 못 찾음'); process.exit(1); }
  const ws = new WebSocket(page.webSocketDebuggerUrl); let id = 0; const send = (method, params = {}) => ws.send(JSON.stringify({ id: ++id, method, params }));
  ws.onmessage = (m) => { const d = JSON.parse(m.data);
    if (d.method === 'Runtime.exceptionThrown') console.log('EXC', d.params.exceptionDetails.exception?.description?.slice(0, 1500) ?? d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && /error|warn/.test(d.params.type)) console.log(d.params.type.toUpperCase(), d.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 800));
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') console.log('LOG', d.params.entry.text.slice(0, 800), d.params.entry.url ?? ''); };
  ws.onopen = () => { send('Runtime.enable'); send('Log.enable'); send('Page.reload'); };
  await sleep(12000); send('Page.captureScreenshot'); await new Promise((r) => { const old = ws.onmessage; ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.result?.data) { fs.writeFileSync(path.join(require('node:os').tmpdir(), 'remod-shot.png'), Buffer.from(d.result.data, 'base64')); r(); } else old(m); }; setTimeout(r, 5000); }); try { process.kill(game.pid); } catch {} process.exit(0);
})();
