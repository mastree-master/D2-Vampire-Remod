// app.asar 풀기·묶기(외부 도구 없이). 사용자 PC 에 Node·npx 가 없어도 게임 실행 파일(ELECTRON_RUN_AS_NODE)로 빌드할 수 있게
// asar 형식: [4][머리 크기 pickle] [머리 JSON pickle] [파일 내용들]. unpacked 파일은 app.asar.unpacked 폴더에 따로 있다
const fs = require(process.versions.electron ? 'original-fs' : 'node:fs');
const path = require('node:path');

function readHeader(file) {
  const fd = fs.openSync(file, 'r');
  const b = Buffer.alloc(16);
  fs.readSync(fd, b, 0, 16, 0);
  const headerSize = b.readUInt32LE(4); // pickle(머리) 전체 크기
  const jsonLen = b.readUInt32LE(12);
  const h = Buffer.alloc(jsonLen);
  fs.readSync(fd, h, 0, jsonLen, 16);
  fs.closeSync(fd);
  return { header: JSON.parse(h.toString('utf8')), base: 8 + headerSize };
}

function extract(file, out) {
  const { header, base } = readHeader(file);
  const fd = fs.openSync(file, 'r');
  const walk = (node, dir) => {
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, n] of Object.entries(node.files)) {
      const p = path.join(dir, name);
      if (n.files) walk(n, p);
      else if (n.link) continue;
      else if (n.unpacked) fs.copyFileSync(path.join(file + '.unpacked', path.relative(out, p)), p);
      else { const buf = Buffer.alloc(n.size); if (n.size) fs.readSync(fd, buf, 0, n.size, base + Number(n.offset)); fs.writeFileSync(p, buf); if (n.executable) fs.chmodSync(p, 0o755); }
    }
  };
  walk(header, out);
  fs.closeSync(fd);
}

// unpackedFrom: 원래 asar 의 머리. 거기서 unpacked 였던 파일은 다시 unpacked 로(내용은 app.asar.unpacked 에 그대로 둠)
function pack(dir, file, unpackedFrom) {
  const old = unpackedFrom && fs.existsSync(unpackedFrom) ? readHeader(unpackedFrom).header : null;
  const isUnpacked = (rel) => { let n = old; for (const part of rel.split(path.sep)) { n = n?.files?.[part]; if (!n) return false; } return !!n.unpacked; };
  const chunks = [];
  let offset = 0;
  const walk = (d, rel) => {
    const node = { files: {} };
    for (const name of fs.readdirSync(d).sort()) {
      const p = path.join(d, name), r = rel ? path.join(rel, name) : name, st = fs.statSync(p);
      if (st.isDirectory()) node.files[name] = walk(p, r);
      else if (isUnpacked(r)) node.files[name] = { size: st.size, unpacked: true };
      else { const buf = fs.readFileSync(p); node.files[name] = { size: buf.length, offset: String(offset) }; chunks.push(buf); offset += buf.length; }
    }
    return node;
  };
  const json = Buffer.from(JSON.stringify(walk(dir, '')), 'utf8');
  const pad = (4 - (json.length % 4)) % 4;
  const headerPickle = Buffer.alloc(8 + json.length + pad);
  headerPickle.writeUInt32LE(4 + json.length + pad, 0);
  headerPickle.writeUInt32LE(json.length, 4);
  json.copy(headerPickle, 8);
  const sizePickle = Buffer.alloc(8);
  sizePickle.writeUInt32LE(4, 0);
  sizePickle.writeUInt32LE(headerPickle.length, 4);
  fs.writeFileSync(file, Buffer.concat([sizePickle, headerPickle, ...chunks]));
}

module.exports = { extract, pack, readHeader };
