#!/usr/bin/env node
// Generates the launcher icon, the adaptive icon layers and the splash image: the little house at dusk with lit
// windows, under a detective's magnifying glass, in pixel art (64x64 drawn here, scaled up with nearest neighbour).
// No dependency: PNG written with zlib. Usage: node scripts/generate-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const rgb = (hex) => [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff, 255];
const SKY0 = rgb(0x2a2c5e);
const SKY1 = rgb(0x4a4280);
const SKY2 = rgb(0x8a5a8c);
const WALL = rgb(0xc8a878);
const WALL_DARK = rgb(0xa88a5c);
const ROOF = rgb(0x5a1e24);
const LIT = rgb(0xffd77a);
const DOOR = rgb(0x7c2c30);
const GRASS = rgb(0x3e7a3a);
const GOLD = rgb(0xd4a23a);
const GLASS = rgb(0x9ab8d8);
const INK = rgb(0x120e18);
const WHITE = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];

function canvas(n, fill) {
  const px = Array.from({ length: n * n }, () => [...fill]);
  const set = (x, y, c) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < n && y < n) px[y * n + x] = [...c];
  };
  const rect = (x, y, w, h, c) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c);
  };
  return { n, px, set, rect };
}

function ring(c, cx, cy, r0, r1, color) {
  for (let y = -r1; y <= r1; y++) for (let x = -r1; x <= r1; x++) {
    const d = x * x + y * y;
    if (d <= r1 * r1 + r1 * 0.6 && d >= r0 * r0) c.set(cx + x, cy + y, color);
  }
}

function sky(c) {
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) c.set(x, y, y < 22 ? SKY0 : y < 40 ? ((x + y) % 2 ? SKY0 : SKY1) : SKY1);
  for (let y = 44; y < 64; y++) for (let x = 0; x < 64; x++) if ((x + y) % 2 === 0) c.set(x, y, SKY2);
  for (const [x, y] of [[6, 8], [14, 4], [52, 6], [58, 14], [4, 30], [60, 26]]) c.set(x, y, WHITE);
}

// The house, its feet at (cx, base), about s pixels wide; mono draws a white silhouette.
function house(c, cx, base, s, mono) {
  const w = s;
  const h = Math.round(s * 0.6);
  const x0 = cx - Math.floor(w / 2);
  const y0 = base - h;
  c.rect(x0, y0, w, h, mono ? WHITE : WALL);
  if (!mono) for (let y = y0 + 2; y < base; y += 4) for (let x = x0 + ((y / 4) % 2 ? 0 : 2); x < x0 + w; x += 6) c.set(x, y, WALL_DARK);
  const roofH = Math.round(s * 0.42);
  for (let j = 0; j < roofH; j++) c.rect(x0 - 2 + j, y0 - roofH + (roofH - j), w + 4 - 2 * j, 1, mono ? WHITE : ROOF);
  const win = Math.max(3, Math.round(s * 0.16));
  for (const [fx, fy] of [[0.18, 0.18], [0.62, 0.18], [0.18, 0.58]]) c.rect(x0 + Math.round(w * fx), y0 + Math.round(h * fy), win, win, mono ? CLEAR : LIT);
  c.rect(x0 + Math.round(w * 0.6), base - Math.round(h * 0.45), win, Math.round(h * 0.45), mono ? CLEAR : DOOR);
  if (!mono) c.rect(x0 - 4, base, w + 8, 2, GRASS);
}

function magnifier(c, cx, cy, r, mono) {
  ring(c, cx, cy, 0, r - 2, mono ? CLEAR : GLASS);
  ring(c, cx, cy, r - 2, r, mono ? WHITE : GOLD);
  for (let i = 0; i < r; i++) for (let k = -1; k <= 1; k++) c.set(cx + r * 0.7 + i + k, cy + r * 0.7 + i, mono ? WHITE : INK);
  if (!mono) c.set(cx - r / 2, cy - r / 2, WHITE);
}

function png(c, size) {
  const scale = size / c.n;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) raw.set(c.px[Math.floor(y / scale) * c.n + Math.floor(x / scale)], y * (size * 4 + 1) + 1 + x * 4);
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    return v >>> 0;
  });
  const crc = (buf) => {
    let v = 0xffffffff;
    for (const b of buf) v = crcTable[(v ^ b) & 0xff] ^ (v >>> 8);
    return (v ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const write = (name, c, size) => {
  fs.writeFileSync(path.join(ASSETS, name), png(c, size));
  console.log(`${name} ${size}x${size}`);
};

// Legacy icon: full square, dusk sky, house and magnifier.
const icon = canvas(64, SKY0);
sky(icon);
house(icon, 28, 50, 34, false);
magnifier(icon, 44, 40, 9, false);
write('icon.png', icon, 1024);

// Adaptive icon: background layer, foreground within the 66% safe zone, monochrome silhouette.
const bg = canvas(64, SKY0);
sky(bg);
write('android-icon-background.png', bg, 512);
const fg = canvas(64, CLEAR);
house(fg, 29, 44, 24, false);
magnifier(fg, 40, 37, 7, false);
write('android-icon-foreground.png', fg, 512);
const mono = canvas(64, CLEAR);
house(mono, 29, 44, 24, true);
magnifier(mono, 40, 37, 7, true);
write('android-icon-monochrome.png', mono, 512);

// Splash image (shown centred on the dusk background) and web favicon.
const splash = canvas(64, CLEAR);
house(splash, 28, 50, 34, false);
magnifier(splash, 44, 40, 9, false);
write('splash-icon.png', splash, 512);
write('favicon.png', icon, 48);
