// 纯 Node 生成 PNG 图标，不依赖任何第三方包
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf){
  let c, table = [];
  for (let n = 0; n < 256; n++){
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const cd = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(cd), 0);
  return Buffer.concat([len, cd, crc]);
}
function encodePNG(w, h, rgba){
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++){
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// 画图工具，rgba 为 Buffer(w*h*4)
function px(buf, w, x, y, [r, g, b, a]){
  if (x < 0 || y < 0 || x >= w || y >= buf.length / (w * 4) / 1) return;
  const i = (y * w + x) * 4;
  if (i + 3 >= buf.length) return;
  const sa = a / 255, da = buf[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0){ buf[i] = buf[i+1] = buf[i+2] = 0; buf[i+3] = 0; return; }
  buf[i]     = Math.round((r * sa + buf[i]   * da * (1 - sa)) / oa);
  buf[i + 1] = Math.round((g * sa + buf[i+1] * da * (1 - sa)) / oa);
  buf[i + 2] = Math.round((b * sa + buf[i+2] * da * (1 - sa)) / oa);
  buf[i + 3] = Math.round(oa * 255);
}
function fillCircle(buf, w, h, cx, cy, r, color){
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++){
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) px(buf, w, x, y, color);
    }
}
function fillRoundRect(buf, w, h, x0, y0, x1, y1, rad, color){
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++){
      let ok = true;
      const cx = x0 + rad, cy = y0 + rad, cx2 = x1 - rad, cy2 = y1 - rad;
      if (x < cx && y < cy && (cx - x) ** 2 + (cy - y) ** 2 > rad * rad) ok = false;
      if (x > cx2 && y < cy && (cx2 - x) ** 2 + (cy - y) ** 2 > rad * rad) ok = false;
      if (x < cx && y > cy2 && (cx - x) ** 2 + (cy2 - y) ** 2 > rad * rad) ok = false;
      if (x > cx2 && y > cy2 && (cx2 - x) ** 2 + (cy2 - y) ** 2 > rad * rad) ok = false;
      if (ok) px(buf, w, x, y, color);
    }
}

const PAPER = [251, 248, 241, 255];
const PLUM  = [155, 134, 166, 255];
const CORAL = [224, 138, 115, 255];

// dock 图标 512
(() => {
  const S = 512, buf = Buffer.alloc(S * S * 4);
  fillRoundRect(buf, S, S, 0, 0, S - 1, S - 1, 110, PAPER);
  fillRoundRect(buf, S, S, S - 150, 60, S - 60, S - 61, 26, PLUM);
  fillCircle(buf, S, S, 200, 256, 96, CORAL);
  fs.mkdirSync(path.join(__dirname, 'assets'), {recursive: true});
  fs.writeFileSync(path.join(__dirname, 'assets', 'dock.png'), encodePNG(S, S, buf));
  console.log('dock.png 写入');
})();

// 菜单栏模板图标 22，单色，系统自动着色
(() => {
  const S = 22, buf = Buffer.alloc(S * S * 4);
  fillRoundRect(buf, S, S, 2, 2, S - 3, S - 3, 5, [255, 255, 255, 255]);
  fs.writeFileSync(path.join(__dirname, 'assets', 'trayTemplate.png'), encodePNG(S, S, buf));
  console.log('trayTemplate.png 写入');
})();
