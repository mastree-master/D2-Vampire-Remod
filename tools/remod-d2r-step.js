// 게임 추출 단계 "D2R 화면"(extract-worker 맨 앞에 붙음): D2R 설치 폴더의 메뉴·대기실 그림(.sprite)과 배치(layouts json)를 d2/d2r 에 PNG 로 꺼낸다. D2 만 깔린 PC 는 건너뜀
function remodD2rUi(installDir, out) {
  const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
  const WANT = /^data:data\/hd\/global\/ui\/(lobby|frontend)\/.*\.sprite$|^data:data\/global\/ui\/layouts\/[^/]+\.json$|^data:data\/global\/video\/d2x_intro\.webm$/i;
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const t = Buffer.from(type), len = Buffer.alloc(4), sum = Buffer.alloc(4); len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, sum]); };
  // PNG(RGBA 8비트, 필터 없음)
  const png = (w, h, rgba) => {
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  };
  const index = {};
  let casc;
  try { casc = openCascFolder(installDir); } catch { fs.writeFileSync(path.join(out, 'd2r.json'), '{}'); return; } // D2R 아님
  try {
    for (const f of casc.files()) {
      const n = f.name.replace(/\\/g, '/');
      if (!WANT.test(n) || /lowend|controller/i.test(n)) continue;
      const rel = n.replace(/^data:data\//i, '').toLowerCase(), dest = path.join(out, 'd2r', rel), b = Buffer.from(casc.read(f.name));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (rel.endsWith('.json') || rel.endsWith('.webm')) { fs.writeFileSync(dest, b); continue; } // 제목 배경 영상은 그대로
      // .sprite(SpA1, 판 31): 머리 40바이트 [SpA1][판 u16][한 장 너비 u16][전체 너비 u32][높이 u32][0][장 수 u32]… 뒤에 RGBA
      if (b.toString('latin1', 0, 4) !== 'SpA1' || b.readUInt16LE(4) !== 31) continue;
      const frameW = b.readUInt16LE(6), w = b.readUInt32LE(8), h = b.readUInt32LE(12), frames = b.readUInt32LE(20);
      if (b.length < 40 + w * h * 4) continue;
      fs.writeFileSync(dest.replace(/\.sprite$/, '.png'), png(w, h, b.subarray(40, 40 + w * h * 4)));
      index[rel.replace(/\.sprite$/, '')] = { w, h, frameW, frames };
    }
  } finally { casc.close?.(); }
  fs.writeFileSync(path.join(out, 'd2r.json'), JSON.stringify(index));
}
