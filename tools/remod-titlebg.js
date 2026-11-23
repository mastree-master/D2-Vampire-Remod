// 제목·메뉴 배경: D2R 확장팩 인트로 영상(d2/d2r/video/d2x_intro.webm, 각자 PC 의 D2R 에서 꺼냄)을 소리 없이 반복. 영상이 없으면 원래 그림
(() => {
  const v = document.createElement('video');
  Object.assign(v, { src: '/d2/d2r/video/d2x_intro.webm', muted: true, playsInline: true, preload: 'auto' });
  // 영상 앞 6.5초가 검은 화면이라 7초부터 틀고, 끝나면 다시 7초로
  const START = 7;
  v.addEventListener('loadedmetadata', () => { v.currentTime = START; });
  v.addEventListener('ended', () => { v.currentTime = START; v.play().catch(() => {}); });
  let ok = false;
  v.addEventListener('canplay', () => { ok = true; });
  v.addEventListener('error', () => { ok = false; });
  // 원작 그림 그리기(picture)가 title.png·menu.png 를 그릴 때 대신 영상을 화면 꽉 채워(넘치는 쪽은 잘라) 그림. 그림 1장 안 그려지면 영상 멈춤
  let last = 0;
  globalThis.__tv = (ctx, file) => {
    if (!/(^|\/)(title|menu)\.png$/.test(String(file))) return false;
    if (v.paused) v.play().catch(() => {});
    if (!ok || !v.videoWidth) return false;
    last = performance.now();
    const W = ctx.canvas.width, H = ctx.canvas.height, s = Math.max(W / v.videoWidth, H / v.videoHeight), w = v.videoWidth * s, h = v.videoHeight * s;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(v, (W - w) / 2, (H - h) / 2, w, h); ctx.fillStyle = 'rgb(0 0 0 / .35)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    return true;
  };
  setInterval(() => { if (!v.paused && performance.now() - last > 1000) v.pause(); }, 1000);
})();
