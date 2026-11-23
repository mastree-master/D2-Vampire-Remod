// ESC 옵션의 "리모드 설정" 창: 기존 패치 기능을 켜고 끄고, 게임을 다시 켜면 Remod.bat 이 그 설정으로 다시 빌드한다
globalThis.__remodOptions = async () => {
  const LABELS = [
    ['carry', '유니크·세트 자동 등록'], ['pickup', '즉시 습득'], ['goldchest', '골드·상자 자동'], ['overflow', '인벤이 차면 창고로'],
    ['log', '획득 목록'], ['swpop', '교체 비교 창'], ['twins', '비교 상자'], ['hidden', '숨은 값 표시'],
    ['auto', '공포 영역 자동 진행'], ['nopause', '창 열어도 안 멈춤'], ['stash', 'B 키 창고'], ['afk', 'AFK 모드 (F8)'],
    ['speed', '배속'], ['bright', '밝기·명암'], ['hud', 'HUD 배치'], ['corpse', '시체 숨김'], ['fps', 'FPS 표시'],
    ['dropsnd', '드롭 소리'], ['shard', '파편 안내'], ['tyrael', '티리엘 멈춤'], ['stats', '통계'], ['f2tip', 'F2 판정 표시'],
    ['font', '한글 폰트'], ['skillcharm', '스킬 부적'],
  ];
  const opts = (await globalThis.d2remod?.get()) ?? {};
  document.getElementById('__remod')?.remove();
  const box = document.createElement('div');
  box.id = '__remod';
  box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgb(0 0 0/.85);display:flex;align-items:center;justify-content:center;font:14px sans-serif;color:#c8b27a';
  const panel = document.createElement('div');
  panel.style.cssText = 'background:#111;border:2px solid #5a4a2a;padding:16px 20px;max-height:90vh;overflow:auto;min-width:320px';
  panel.className = '__d2p';
  panel.innerHTML = '<div style="font-size:18px;margin-bottom:10px">리모드 설정</div>';
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px 16px';
  for (const [key, label] of LABELS) {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;cursor:pointer;color:#ddd';
    row.innerHTML = `<input type="checkbox" data-k="${key}" ${opts[key] ? 'checked' : ''}>${label}`;
    grid.append(row);
  }
  const delay = document.createElement('label');
  delay.style.cssText = 'display:block;margin-top:10px;color:#ddd';
  delay.innerHTML = `자동 진행 대기 (초) <input type="number" min="0" max="60" value="${opts.delay ?? 4}" style="width:50px">`;
  const note = document.createElement('div');
  note.style.cssText = 'margin-top:10px;color:#888';
  note.textContent = '저장하고 게임을 다시 켜면 적용됩니다.';
  const buttons = document.createElement('div');
  buttons.style.cssText = 'margin-top:12px;display:flex;gap:8px;justify-content:flex-end';
  const button = (text, on) => { const b = document.createElement('button'); b.textContent = text; b.style.cssText = 'padding:4px 14px;background:#2a2318;color:#c8b27a;border:1px solid #5a4a2a;cursor:pointer'; b.onclick = on; buttons.append(b); };
  button('닫기', () => box.remove());
  button('저장', async () => {
    for (const c of grid.querySelectorAll('input')) opts[c.dataset.k] = c.checked;
    opts.delay = Math.max(0, Math.min(60, Number(delay.querySelector('input').value) || 0));
    opts.watch = false;
    note.textContent = (await globalThis.d2remod?.set(opts)) ? '저장했습니다. 게임을 다시 켜면 적용됩니다.' : '저장하지 못했습니다.';
    note.style.color = '#c8b27a';
  });
  panel.append(grid, delay, note, buttons);
  box.append(panel);
  box.onkeydown = (e) => e.stopPropagation();
  box.onclick = (e) => { if (e.target === box) box.remove(); };
  document.body.append(box);
};
// F5 창 위에 [수동 모드]/[자동 모드] 단추: 수동은 자동 등록·즉시 습득(전체 줍기)·골드 원거리·꽉 차면 창고·자동 진행을 한 번에 끔(원작처럼 직접 줍고 등록). 리모드 아이템·창은 그대로
(() => {
  const MANUAL = ['carry', 'pickup', 'goldchest', 'overflow', 'auto'];
  const set = (on) => { const w = document.getElementById('__onw'); if (!w) return; for (const k of MANUAL) { const c = w.querySelector(`input[data-k=${k}]`); if (c && c.checked !== on) c.click(); } };
  setInterval(() => {
    const w = document.getElementById('__onw'); if (!w || w.querySelector('.__manual')) return;
    const bar = document.createElement('div'); bar.className = '__manual';
    bar.style.cssText = 'padding:8px 16px;border-bottom:1px solid #4a3a20;display:flex;gap:8px;align-items:center';
    const b = (t, on, tip) => { const x = document.createElement('button'); x.textContent = t; x.title = tip; x.style.cssText = 'padding:4px 14px;background:#222;color:#fc6;border:1px solid #8a6d3b;cursor:pointer;font:bold 14px sans-serif'; x.onclick = () => set(on); return x; };
    bar.append(b('수동 모드', false, '자동 등록·전체 줍기·골드 원거리·꽉 차면 창고·자동 진행 끄기'), b('자동 모드', true, '위 기능 다시 켜기'), Object.assign(document.createElement('span'), { textContent: '수동: 원작처럼 직접 줍고 등록 (리모드 아이템은 그대로)', style: 'color:#888;font-size:12px' }));
    w.firstElementChild?.after(bar);
  }, 300);
})();
