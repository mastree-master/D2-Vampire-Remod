// 번들 안 직업별 객체({amazon:…,druid:…,necromancer:…,sorceress:…})마다 warlock 키가 없으면 강령술사 값을 복사해 넣는다
const BT = String.fromCharCode(96);
// s[i] 가 여는 괄호일 때 짝 닫는 괄호 위치(문자열·템플릿 건너뜀)
function close(s, i) {
  let d = 0, str = null; const tpl = [];
  for (; i < s.length; i++) {
    const c = s[i];
    if (str) {
      if (c === '\\') { i++; continue; }
      if (str === BT && c === '$' && s[i + 1] === '{') { tpl.push(d); d++; str = null; i++; continue; }
      if (c === str) str = null;
      continue;
    }
    if (c === BT || c === '"' || c === "'") { str = c; continue; }
    if ('{(['.includes(c)) d++;
    else if ('})]'.includes(c)) { d--; if (tpl.length && tpl[tpl.length - 1] === d) { tpl.pop(); str = BT; continue; } if (d === 0) return i; }
  }
  return -1;
}
// 객체 {…} 의 최상위 키 → [값 시작, 값 끝]
function keys(s, open, end) {
  const out = {}; let i = open + 1;
  while (i < end) {
    const m = /^([\w$]+):/.exec(s.slice(i, i + 60));
    if (!m) return null;
    const v = i + m[0].length; let j = v;
    for (; j < end; j++) {
      const c = s[j];
      if ('{(['.includes(c) || c === BT || c === '"' || c === "'") { j = c === BT || c === '"' || c === "'" ? skipStr(s, j) : close(s, j); continue; }
      if (c === ',') break;
    }
    out[m[1]] = [v, j]; i = j + 1;
  }
  return out;
}
function skipStr(s, i) { const q = s[i]; for (i++; i < s.length; i++) { if (s[i] === '\\') { i++; continue; } if (q === BT && s[i] === '$' && s[i + 1] === '{') { i = close(s, i + 1); continue; } if (s[i] === q) return i; } return i; }

module.exports = function addWarlock(s) {
  const adds = []; const seen = new Set();
  for (let at = s.indexOf('necromancer:'); at >= 0; at = s.indexOf('necromancer:', at + 1)) {
    // 바로 앞 여는 { 를 거슬러 찾기(같은 깊이)
    let d = 0, open = -1;
    for (let i = at - 1; i >= 0 && at - i < 20000; i--) { const c = s[i]; if ('})]'.includes(c)) d++; else if ('{(['.includes(c)) { if (d === 0) { open = c === '{' ? i : -1; break; } d--; } }
    if (open < 0 || seen.has(open)) continue;
    seen.add(open);
    const end = close(s, open); if (end < 0) continue;
    const k = keys(s, open, end);
    if (!k || !k.druid || !k.sorceress || !k.amazon || k.warlock) continue;
    const [a, b] = k.necromancer;
    adds.push([end, `,warlock:${s.slice(a, b)}`]);
  }
  adds.sort((x, y) => y[0] - x[0]);
  for (const [at, text] of adds) s = s.slice(0, at) + text + s.slice(at);
  return { text: s, count: adds.length };
};
