// The 23 places and the house at dusk, painted in code on a 320x180 buffer (place 320x150, inventory band below).
// The rooms the author photographed (living room, music corner and dining room, kitchen, office, utility room, the
// four bedrooms, the parents' shower, the bathroom, the pool) are redrawn by hand after the photos: wall and floor
// colours, the main furniture and a few characteristic objects. No photo enters the repository and no photo pixel is
// copied. Every prop is drawn inside the rect of its hotspot and every exit from its own rect (src/game/world.ts), so
// art and touch areas cannot drift apart; the rest of each photo's furniture is drawn as decor around them.
import { GameState, PlaceId, Rect } from '../game/types';
import { EXITS, HOTSPOTS, MENU_BUTTON, NOTEBOOK_BUTTON, ROOM_H, SCENE_H, SCENE_W, slotRect, SLOTS } from '../game/world';
import { C } from './palette';
import { Color, PixelBuffer } from './pixels';

const FLOOR_Y = 100;
type Flags = GameState['flags'];
const on = (s: GameState, f: keyof Flags) => s.flags[f] === true;

// ---------- walls, floors, sky ----------

// A painted wall with a skirting board.
function paint(b: PixelBuffer, base: Color, shade: Color, x0 = 0, x1 = SCENE_W) {
  b.rect(x0, 0, x1 - x0, FLOOR_Y, base);
  b.hline(x0, x1 - 1, 0, shade).hline(x0, x1 - 1, FLOOR_Y - 3, shade);
  b.rect(x0, FLOOR_Y - 2, x1 - x0, 2, C.white);
}

function tileFloor(b: PixelBuffer, base: Color, grout: Color, size = 16) {
  b.rect(0, FLOOR_Y, SCENE_W, ROOM_H - FLOOR_Y, base);
  for (let y = FLOOR_Y; y < ROOM_H; y += Math.floor(size / 2)) b.hline(0, SCENE_W - 1, y, grout);
  for (let y = FLOOR_Y; y < ROOM_H; y += Math.floor(size / 2)) {
    const off = (Math.floor((y - FLOOR_Y) / (size / 2)) % 2) * (size / 2);
    for (let x = off; x < SCENE_W; x += size) b.vline(x, y, Math.min(ROOM_H - 1, y + size / 2 - 1), grout);
  }
}

function plankFloor(b: PixelBuffer, a: Color, dark: Color) {
  for (let y = FLOOR_Y; y < ROOM_H; y++) b.hline(0, SCENE_W - 1, y, Math.floor((y - FLOOR_Y) / 5) % 2 === 0 ? a : shadeOf(a, dark));
  for (let y = FLOOR_Y; y < ROOM_H; y += 5) {
    b.hline(0, SCENE_W - 1, y, dark);
    for (let x = ((y / 5) % 4) * 19; x < SCENE_W; x += 76) b.vline(x, y, Math.min(ROOM_H - 1, y + 4), dark);
  }
}

// Two neighbouring tones for alternate planks.
function shadeOf(a: Color, dark: Color): Color {
  const mix = (s: number) => Math.round((((a >> s) & 255) * 3 + ((dark >> s) & 255)) / 4);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

function grass(b: PixelBuffer, y0 = FLOOR_Y, base: Color = C.lawn) {
  b.dither(0, y0, SCENE_W, ROOM_H - y0, base, C.grassHi);
  for (let i = 0; i < 70; i++) b.set((i * 53 + 7) % SCENE_W, y0 + ((i * 29) % (ROOM_H - y0)), C.green2);
}

function sky(b: PixelBuffer, bottom = FLOOR_Y) {
  b.gradient(0, 0, SCENE_W, bottom, [C.sky0, C.sky1, C.sky2, C.sky3]);
  for (let i = 0; i < 14; i++) b.set((i * 97 + 13) % SCENE_W, (i * 17 + 3) % 30, C.star);
}

function hedgeLine(b: PixelBuffer, y = 66) {
  for (let x = 0; x < SCENE_W; x += 12) b.ellipse(x + 6, y, 9, 8, C.hedge);
  b.rect(0, y, SCENE_W, FLOOR_Y - y, C.hedge);
  for (let i = 0; i < 40; i++) b.set((i * 37) % SCENE_W, y + ((i * 13) % (FLOOR_Y - y)), C.green2);
}

function bricks(b: PixelBuffer, x0: number, y0: number, w: number, h: number, a: Color, line: Color) {
  b.rect(x0, y0, w, h, a);
  for (let y = y0; y < y0 + h; y += 6) {
    b.hline(x0, x0 + w - 1, y, line);
    for (let x = x0 + (Math.floor((y - y0) / 6) % 2) * 6; x < x0 + w; x += 12) b.vline(x, y, Math.min(y0 + h - 1, y + 5), line);
  }
}

// The garden side wall of the house: ochre render under a terracotta roof edge (photo of the pool).
function renderWall(b: PixelBuffer, x0: number, x1: number, top = 14) {
  b.rect(x0, top, x1 - x0, FLOOR_Y - top, C.ochre);
  b.rect(x0 - 4, top - 6, x1 - x0 + 8, 6, C.terracotta);
  for (let x = x0 - 4; x < x1 + 4; x += 6) b.vline(x, top - 6, top - 1, C.wine1);
}

function band(b: PixelBuffer) {
  b.rect(0, ROOM_H, SCENE_W, SCENE_H - ROOM_H, C.wood0);
  b.hline(0, SCENE_W - 1, ROOM_H, C.goldDark).hline(0, SCENE_W - 1, ROOM_H + 1, C.wood1);
  for (let i = 0; i < SLOTS; i++) {
    const r = slotRect(i);
    b.rect(r.x, r.y, r.w, r.h, C.wood1).frame(r.x - 1, r.y - 1, r.w + 2, r.h + 2, C.wood2);
  }
  // Notebook button: a little book; menu button: drawn by the UI on top.
  const n = NOTEBOOK_BUTTON;
  b.rect(n.x, n.y, n.w, n.h, C.wood1).frame(n.x - 1, n.y - 1, n.w + 2, n.h + 2, C.goldDark);
  b.rect(n.x + 5, n.y + 4, 14, 16, C.red).vline(n.x + 7, n.y + 4, n.y + 19, C.redDark).rect(n.x + 10, n.y + 8, 7, 1, C.paper).rect(n.x + 10, n.y + 11, 7, 1, C.paper);
  const m = MENU_BUTTON;
  b.rect(m.x, m.y, m.w, m.h, C.wood1).frame(m.x - 1, m.y - 1, m.w + 2, m.h + 2, C.goldDark);
}

// ---------- building blocks ----------

function door(b: PixelBuffer, r: Rect, wood: Color = C.wood3, plate?: Color) {
  b.rect(r.x - 2, r.y - 2, r.w + 4, r.h + 2, C.wood0);
  b.rect(r.x, r.y, r.w, r.h, wood);
  b.frame(r.x + 3, r.y + 4, r.w - 6, Math.floor(r.h / 2) - 6, shadeOf(wood, C.wood0));
  b.frame(r.x + 3, r.y + Math.floor(r.h / 2) + 2, r.w - 6, Math.floor(r.h / 2) - 6, shadeOf(wood, C.wood0));
  b.rect(r.x + r.w - 6, r.y + Math.floor(r.h / 2), 2, 2, C.gold);
  if (plate !== undefined) b.rect(r.x + 6, r.y + 8, r.w - 12, 5, plate).frame(r.x + 6, r.y + 8, r.w - 12, 5, C.wood0);
}

function doorway(b: PixelBuffer, r: Rect, inside: Color = C.wood0) {
  b.rect(r.x, r.y, r.w, FLOOR_Y - r.y, inside);
  b.frame(r.x - 1, r.y - 1, r.w + 2, FLOOR_Y - r.y + 1, C.white);
  b.dither(r.x, FLOOR_Y - 8, r.w, 8, inside, shadeOf(inside, C.black));
}

function windowPane(b: PixelBuffer, r: Rect, view: 'dusk' | 'garden' | 'night' = 'dusk', frame: Color = C.white) {
  b.rect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, frame);
  if (view === 'night') b.gradient(r.x, r.y, r.w, r.h, [C.night0, C.night1]);
  else b.gradient(r.x, r.y, r.w, r.h, [C.sky1, C.sky2, C.sky3]);
  if (view === 'garden') b.rect(r.x, r.y + Math.floor(r.h * 0.6), r.w, Math.ceil(r.h * 0.4), C.hedge);
  b.vline(r.x + Math.floor(r.w / 2), r.y, r.y + r.h - 1, frame).hline(r.x, r.x + r.w - 1, r.y + Math.floor(r.h / 2), frame);
}

// Stairs seen from the front, inside a doorway: going up, the steps rise and shrink into the dark; going down,
// they drop into the dark.
function frontStairs(b: PixelBuffer, r: Rect, up: boolean) {
  const h = FLOOR_Y - r.y;
  b.rect(r.x - 3, r.y - 3, r.w + 6, h + 3, C.white).rect(r.x, r.y, r.w, h, C.black);
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const inset = Math.round(t * r.w * 0.28);
    const sh = Math.max(2, Math.round((h / steps) * (1 - t * 0.5)));
    const y = up ? r.y + h - Math.round(t * h * 0.95) - sh : r.y + Math.round(t * h * 0.7);
    const tread = up ? [C.wood4, C.wood3, C.wood2, C.wood1, C.wood0][Math.min(4, Math.floor(i / 2))] : [C.wood4, C.wood3, C.wood2, C.wood1, C.wood0][Math.min(4, Math.floor(i / 2))];
    const w = up ? r.w - inset * 2 : Math.round(r.w * (1 - t * 0.4));
    const x = up ? r.x + inset : r.x + Math.round((r.w - w) / 2);
    b.rect(x, y, w, sh, tread).hline(x, x + w - 1, y, C.wood5);
  }
  // The handrail.
  if (up) b.line(r.x + 2, r.y + h - 4, r.x + Math.round(r.w * 0.3), r.y + 6, C.wood1);
  else b.line(r.x + 2, r.y + 6, r.x + Math.round(r.w * 0.25), r.y + h - 4, C.wood1);
}

function ladder(b: PixelBuffer, r: Rect) {
  b.vline(r.x + 6, r.y, r.y + r.h - 1, C.wood4).vline(r.x + r.w - 7, r.y, r.y + r.h - 1, C.wood4);
  for (let y = r.y + 4; y < r.y + r.h; y += 8) b.hline(r.x + 6, r.x + r.w - 7, y, C.wood3);
}

function hatch(b: PixelBuffer, r: Rect, open: boolean) {
  b.rect(r.x, r.y, r.w, r.h, open ? C.black : C.wood2).frame(r.x, r.y, r.w, r.h, C.wood0);
  if (!open) for (let x = r.x + 6; x < r.x + r.w; x += 8) b.vline(x, r.y + 1, r.y + r.h - 2, C.wood1);
  else for (let y = r.y + 3; y < r.y + r.h; y += 5) b.hline(r.x + 14, r.x + r.w - 15, y, C.wood3);
}

function table(b: PixelBuffer, r: Rect, top: Color = C.wood3, legs: Color = C.wood1) {
  b.rect(r.x, r.y + 2, r.w, 4, top).hline(r.x, r.x + r.w - 1, r.y + 2, shadeOf(top, C.white));
  b.rect(r.x + 2, r.y + 6, 3, r.h - 6, legs).rect(r.x + r.w - 5, r.y + 6, 3, r.h - 6, legs);
}

function books(b: PixelBuffer, x0: number, x1: number, y: number, h: number, seed: number) {
  const colors = [C.red, C.green3, C.blue, C.gold, C.wine2, C.teal2, C.purple, C.orange, C.white];
  let x = x0;
  let i = seed;
  while (x < x1 - 2) {
    const w = 2 + (i % 3);
    const bh = h - (i % 3);
    b.rect(x, y + h - bh, Math.min(w, x1 - x), bh, colors[i % colors.length]);
    x += w + (i % 5 === 0 ? 1 : 0);
    i += 7;
  }
}

function shelfBox(b: PixelBuffer, r: Rect, seed: number, wood: Color = C.wood2) {
  b.rect(r.x, r.y, r.w, r.h, wood).frame(r.x, r.y, r.w, r.h, shadeOf(wood, C.wood0));
  for (let y = r.y + 4; y < r.y + r.h - 4; y += 12) {
    b.hline(r.x + 1, r.x + r.w - 2, y + 9, shadeOf(wood, C.wood0));
    books(b, r.x + 2, r.x + r.w - 2, y, 9, seed + y);
  }
}

// White cube shelves (2 x n) with coloured boxes.
function cubes(b: PixelBuffer, x: number, y: number, cols: number, rows: number, seed: number) {
  const s = 12;
  b.rect(x, y, cols * s + 1, rows * s + 1, C.white);
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      b.rect(x + 1 + i * s, y + 1 + j * s, s - 1, s - 1, C.stone4);
      if ((i + j + seed) % 3 === 0) b.rect(x + 2 + i * s, y + 3 + j * s, s - 3, s - 4, [C.wood3, C.blue, C.lime][(i + seed) % 3]);
      else books(b, x + 2 + i * s, x + s - 1 + i * s, y + 2 + j * s, s - 3, seed + i * 5 + j);
    }
}

function pot(b: PixelBuffer, x: number, y: number, leaf: Color) {
  b.rect(x - 4, y - 6, 9, 6, C.orange).hline(x - 5, x + 5, y - 6, C.wood3);
  b.ellipse(x, y - 13, 6, 7, leaf);
}

function palm(b: PixelBuffer, x: number, y: number) {
  b.rect(x - 5, y - 10, 11, 10, C.beech);
  b.vline(x, y - 34, y - 10, C.wood1);
  for (let i = -3; i <= 3; i++) b.line(x, y - 34, x + i * 5, y - 26 + Math.abs(i) * 2, C.green3).line(x, y - 32, x + i * 4, y - 22 + Math.abs(i) * 2, C.green2);
}

function textLines(b: PixelBuffer, r: Rect, ink: Color, step = 3) {
  for (let y = r.y + 3; y < r.y + r.h - 2; y += step) b.hline(r.x + 3, r.x + r.w - 4 - ((y * 7) % 5), y, ink);
}

// A string of cotton-ball lights (the three boys' rooms all have one).
function garland(b: PixelBuffer, x0: number, x1: number, y: number, colors: readonly Color[]) {
  for (let x = x0, i = 0; x <= x1; x += 6, i++) {
    const sag = Math.round(Math.sin(((x - x0) / Math.max(1, x1 - x0)) * Math.PI) * 6);
    b.ellipse(x, y + sag, 2, 2, colors[i % colors.length]);
    if (x + 6 <= x1) b.line(x + 2, y + sag, x + 4, y + Math.round(Math.sin(((x + 6 - x0) / Math.max(1, x1 - x0)) * Math.PI) * 6), C.stone2);
  }
}

function lampBall(b: PixelBuffer, x: number, y: number, shadeColor: Color) {
  b.vline(x, y, y + 20, C.ink).ellipse(x, y - 2, 6, 5, shadeColor).rect(x - 5, y + 20, 11, 2, C.ink);
}

function toilet(b: PixelBuffer, r: Rect, japanese = false) {
  b.rect(r.x + 4, r.y, 22, 14, C.white).frame(r.x + 4, r.y, 22, 14, C.stone3).ellipse(r.x + 15, r.y + 24, 11, 6, C.white).rect(r.x + 9, r.y + 28, 12, r.h - 28, C.white);
  if (japanese) {
    // The control panel with its buttons.
    b.rect(r.x + 24, r.y + 16, 6, 10, C.stone3).set(r.x + 26, r.y + 18, C.blue).set(r.x + 26, r.y + 21, C.red).set(r.x + 26, r.y + 24, C.green3);
  }
}

function sink(b: PixelBuffer, r: Rect, cabinet = false) {
  if (cabinet) b.rect(r.x + 2, r.y + 16, r.w - 4, r.h - 16, C.white).frame(r.x + 2, r.y + 16, r.w - 4, r.h - 16, C.stone3).hline(r.x + 4, r.x + r.w - 5, r.y + 26, C.stone3);
  else b.rect(r.x + r.w / 2 - 3, r.y + 16, 6, r.h - 16, C.white);
  b.rect(r.x + 2, r.y + 10, r.w - 4, 6, C.white).frame(r.x + 2, r.y + 10, r.w - 4, 6, C.stone3).rect(r.x + r.w / 2 - 1, r.y + 4, 3, 6, C.chrome);
}

function bed(b: PixelBuffer, r: Rect, frame: Color, sheet: Color, duvet: Color, pillow: Color = C.white) {
  b.rect(r.x, r.y - 4, 5, r.h + 4, frame).rect(r.x, r.y + 14, r.w, r.h - 14, frame);
  b.rect(r.x + 4, r.y + 8, r.w - 5, 8, sheet).rect(r.x + 14, r.y + 6, r.w - 16, 10, duvet).rect(r.x + 5, r.y + 4, 10, 6, pillow);
}

function posterBox(b: PixelBuffer, r: Rect, bg: Color, fg: Color) {
  b.rect(r.x, r.y, r.w, r.h, bg).frame(r.x, r.y, r.w, r.h, C.ink).ellipse(r.x + r.w / 2, r.y + 14, 6, 6, C.skin).rect(r.x + r.w / 2 - 6, r.y + 20, 12, 14, fg);
}

function gate(b: PixelBuffer, r: Rect) {
  // A wooden side gate between two posts, with a padlock.
  b.rect(r.x, r.y + 10, 4, r.h - 10, C.wood1).rect(r.x + r.w - 4, r.y + 10, 4, r.h - 10, C.wood1);
  for (let x = r.x + 5; x < r.x + r.w - 5; x += 4) b.rect(x, r.y + 18, 3, r.h - 20, C.wood3);
  b.rect(r.x + 4, r.y + 26, r.w - 8, 3, C.wood2).rect(r.x + 4, r.y + 50, r.w - 8, 3, C.wood2);
  b.rect(r.x + r.w / 2 - 2, r.y + 36, 5, 6, C.brass).frame(r.x + r.w / 2 - 1, r.y + 33, 3, 4, C.chrome);
}

// ---------- props, one per hotspot (drawn inside its rect) ----------

type Prop = (b: PixelBuffer, r: Rect, s: GameState) => void;

const PROPS: Record<string, Prop> = {
  // Outside: the front of the house at dusk.
  'front.door': (b, r) => door(b, r, C.wine2),
  'front.doormat': (b, r, s) => {
    b.rect(r.x, r.y + 8, r.w, 10, C.mud).frame(r.x, r.y + 8, r.w, 10, C.wood1);
    b.hline(r.x + 6, r.x + r.w - 7, r.y + 13, C.wood5);
    if (!on(s, 'key_taken')) b.rect(r.x + 14, r.y + 10, 8, 3, C.wood2); // the bulge
  },
  'front.bell': (b, r) => b.rect(r.x + 6, r.y + 5, 10, 12, C.brass).frame(r.x + 6, r.y + 5, 10, 12, C.goldDark).rect(r.x + 9, r.y + 9, 4, 4, C.white),
  'front.hedge': (b, r) => {
    for (let x = r.x; x < r.x + r.w; x += 10) b.ellipse(x + 5, r.y + 12, 8, 10, C.hedge);
    b.rect(r.x, r.y + 12, r.w, r.h - 12, C.hedge);
    for (let i = 0; i < 20; i++) b.set(r.x + ((i * 13) % r.w), r.y + 8 + ((i * 7) % (r.h - 8)), C.green3);
  },
  'front.mailbox': (b, r) => b.rect(r.x + 9, r.y + 18, 4, r.h - 18, C.wood1).rect(r.x + 2, r.y + 4, 18, 14, C.yellow).frame(r.x + 2, r.y + 4, 18, 14, C.goldDark).hline(r.x + 6, r.x + 15, r.y + 10, C.ink),
  'front.gateLeft': (b, r) => gate(b, r),
  'front.gateRight': (b, r) => gate(b, r),
  // The football corner: a goal, cones, the bench, Julien's ball when he plays.
  'football.goal': (b, r) => {
    b.frame(r.x, r.y, r.w, r.h - 2, C.white).frame(r.x + 1, r.y + 1, r.w - 2, r.h - 4, C.white);
    for (let x = r.x + 4; x < r.x + r.w - 2; x += 5) b.vline(x, r.y + 2, r.y + r.h - 4, C.stone3);
    for (let y = r.y + 4; y < r.y + r.h - 4; y += 5) b.hline(r.x + 2, r.x + r.w - 3, y, C.stone3);
  },
  'football.cones': (b, r) => {
    for (let i = 0; i < 3; i++) {
      const x = r.x + 4 + i * 8;
      for (let j = 0; j < 8; j++) b.hline(x - Math.floor(j / 3), x + Math.floor(j / 3), r.y + 12 + j, j % 4 === 2 ? C.white : C.orange);
    }
  },
  'football.ball': (b, r) => b.ellipse(r.x + 11, r.y + 15, 6, 6, C.white).set(r.x + 9, r.y + 13, C.ink).set(r.x + 13, r.y + 16, C.ink).set(r.x + 12, r.y + 12, C.ink).set(r.x + 10, r.y + 17, C.ink),
  'football.bench': (b, r, s) => {
    b.rect(r.x, r.y + 10, r.w, 5, C.wood3).rect(r.x + 3, r.y + 15, 3, r.h - 15, C.wood1).rect(r.x + r.w - 6, r.y + 15, 3, r.h - 15, C.wood1);
    if (!on(s, 'extension_taken')) b.rect(r.x + 10, r.y + r.h - 6, 24, 3, C.blue).rect(r.x + 32, r.y + r.h - 7, 3, 5, C.chrome);
  },
  'football.gate': (b, r) => gate(b, r),
  // The pool (photo): the slatted cover in the dark decking, the hammock chair, the shed, the patio table.
  'pool.gate': (b, r) => gate(b, r),
  'pool.bay': (b, r) => windowPane(b, r, 'night', C.white),
  'pool.cover': (b, r, s) => {
    const open = on(s, 'cover_open');
    const drained = on(s, 'pool_drained');
    b.rect(r.x - 6, r.y - 4, r.w + 12, r.h + 6, C.ipe).frame(r.x - 6, r.y - 4, r.w + 12, r.h + 6, C.wood1);
    if (!open) {
      b.rect(r.x, r.y, r.w, r.h, C.poolCover);
      for (let x = r.x + 3; x < r.x + r.w; x += 5) b.vline(x, r.y, r.y + r.h - 1, C.poolCoverDark);
    } else if (drained) {
      b.rect(r.x, r.y, r.w, r.h, C.sky).dither(r.x, r.y + r.h - 8, r.w, 8, C.sky, C.tile1);
      b.vline(r.x + r.w - 6, r.y, r.y + r.h - 1, C.chrome).vline(r.x + r.w - 3, r.y, r.y + r.h - 1, C.chrome);
    } else {
      b.gradient(r.x, r.y, r.w, r.h, [C.water2, C.water1, C.water0]);
      for (let i = 0; i < 8; i++) b.hline(r.x + ((i * 23) % (r.w - 10)), r.x + ((i * 23) % (r.w - 10)) + 6, r.y + 4 + ((i * 9) % (r.h - 8)), C.water2);
      b.rect(r.x, r.y, 6, r.h, C.poolCoverDark); // the cover rolled up
    }
  },
  'pool.ball': (b, r) => b.ellipse(r.x + 11, r.y + 12, 7, 7, C.white).set(r.x + 9, r.y + 10, C.ink).set(r.x + 13, r.y + 13, C.ink).set(r.x + 12, r.y + 9, C.ink),
  'pool.bottle': (b, r, s) => {
    const x = r.x + 9;
    const y = r.y + (on(s, 'pool_drained') ? 6 : 8);
    b.rect(x, y, 6, 10, on(s, 'pool_drained') ? C.water1 : C.water0).rect(x + 2, y - 3, 2, 3, C.ironHi);
  },
  'pool.switch': (b, r, s) => b.rect(r.x + 5, r.y + 4, 12, 16, C.stone3).frame(r.x + 5, r.y + 4, 12, 16, C.stone1).rect(r.x + 9, r.y + (on(s, 'cover_open') ? 6 : 13), 4, 5, C.red),
  'pool.pump': (b, r, s) => {
    b.rect(r.x + 2, r.y + 10, r.w - 4, r.h - 10, C.stone2).frame(r.x + 2, r.y + 10, r.w - 4, r.h - 10, C.stone0).ellipse(r.x + r.w / 2, r.y + 20, 6, 6, C.stone3);
    if (on(s, 'plug_fixed')) b.line(r.x + 4, r.y + 14, r.x - 6, r.y + 6, C.ink);
    else b.line(r.x + 4, r.y + 30, r.x - 2, r.y + 34, C.ink).set(r.x - 3, r.y + 33, C.yellow).set(r.x - 4, r.y + 35, C.yellow);
  },
  // The garden tap (E22): a brass tap on a post, the green hose running away towards the garden.
  'pool.tap': (b, r) => {
    b.rect(r.x + 9, r.y + 6, 6, r.h - 6, C.stone2).frame(r.x + 9, r.y + 6, 6, r.h - 6, C.stone0);
    b.rect(r.x + 6, r.y + 8, 12, 3, C.brass).rect(r.x + 4, r.y + 10, 3, 4, C.brass).rect(r.x + 11, r.y + 4, 2, 4, C.red);
    b.line(r.x + 5, r.y + 14, r.x + 2, r.y + r.h - 2, C.green1).hline(r.x - 10, r.x + 2, r.y + r.h - 2, C.green1).hline(r.x - 10, r.x + 2, r.y + r.h - 1, C.green3);
  },
  // The delivered parcel among the flowers (CUT13), with the neighbours' cat curled up on it until it is fed.
  'garden.parcel': (b, r) => {
    b.rect(r.x + 3, r.y + 6, r.w - 6, r.h - 8, C.wood4).frame(r.x + 3, r.y + 6, r.w - 6, r.h - 8, C.wood2);
    b.vline(r.x + r.w / 2, r.y + 6, r.y + r.h - 3, C.mustard).hline(r.x + 3, r.x + r.w - 4, r.y + 11, C.mustard).rect(r.x + 6, r.y + 13, 6, 4, C.white);
  },
  'garden.cat': (b, r) => {
    const y = r.y + r.h + 2;
    b.ellipse(r.x + 13, y, 9, 5, C.orange).ellipse(r.x + 21, y - 4, 5, 4, C.orange);
    b.set(r.x + 18, y - 9, C.orange).set(r.x + 19, y - 8, C.orange).set(r.x + 23, y - 9, C.orange).set(r.x + 22, y - 8, C.orange);
    b.set(r.x + 19, y - 5, C.ink).set(r.x + 23, y - 5, C.ink).set(r.x + 21, y - 3, C.pink);
    for (let i = 0; i < 3; i++) b.hline(r.x + 8 + i * 4, r.x + 9 + i * 4, y - 3, C.wood2);
    b.line(r.x + 4, y + 1, r.x + 1, y - 6, C.orange);
  },
  // The garden, at the end of the football corner.
  'garden.flowers': (b, r) => {
    b.rect(r.x, r.y + 18, r.w, r.h - 18, C.mud);
    for (let i = 0; i < 12; i++) {
      const x = r.x + 4 + i * 6;
      b.vline(x, r.y + 8, r.y + 20, C.green3).ellipse(x, r.y + 7, 2, 2, [C.rose, C.yellow, C.pink, C.purple][i % 4]);
    }
  },
  'garden.gnome': (b, r) => {
    for (let j = 0; j < 8; j++) b.hline(r.x + 11 - Math.floor(j / 2), r.x + 11 + Math.floor(j / 2), r.y + 2 + j, C.red);
    b.rect(r.x + 8, r.y + 10, 7, 4, C.skin).rect(r.x + 8, r.y + 13, 7, 3, C.white).rect(r.x + 7, r.y + 16, 9, 6, C.blue);
  },
  'garden.hose': (b, r) => {
    b.rect(r.x + 2, r.y + r.h - 3, r.w - 4, 3, C.wood1).vline(r.x + 4, r.y + 6, r.y + r.h - 1, C.wood1).vline(r.x + r.w - 5, r.y + 6, r.y + r.h - 1, C.wood1);
    b.ellipse(r.x + r.w / 2, r.y + 12, 8, 8, C.green1);
    for (let i = 0; i < 3; i++) b.ellipse(r.x + r.w / 2, r.y + 12, 7 - i * 2, 7 - i * 2, i % 2 === 0 ? C.green3 : C.green1);
    b.ellipse(r.x + r.w / 2, r.y + 12, 1, 1, C.ink);
  },
  'garden.swing': (b, r) => {
    b.rect(r.x, r.y, r.w, 4, C.wood2).rect(r.x, r.y, 4, r.h, C.wood2).rect(r.x + r.w - 4, r.y, 4, r.h, C.wood2);
    b.vline(r.x + 16, r.y + 4, r.y + 46, C.stone3).vline(r.x + 32, r.y + 4, r.y + 46, C.stone3).rect(r.x + 14, r.y + 46, 21, 4, C.red);
  },
  'garden.shed': (b, r) => {
    b.rect(r.x, r.y + 12, r.w, r.h - 12, C.wood3);
    for (let y = 0; y < 12; y++) b.hline(r.x + 12 - y, r.x + r.w - 13 + y, r.y + y, C.wine1);
    b.rect(r.x + 12, r.y + 34, 16, r.h - 34, C.wood1);
  },
  // Maman's wicker gardening basket with her gloves, and Papa's small golden key at the bottom.
  'garden.basket': (b, r) => {
    b.ellipse(r.x + 13, r.y + 4, 10, 6, C.wood4).ellipse(r.x + 13, r.y + 4, 8, 4, -1);
    b.rect(r.x + 3, r.y + 8, 20, 12, C.wood4).frame(r.x + 3, r.y + 8, 20, 12, C.wood2);
    for (let x = r.x + 5; x < r.x + 22; x += 3) b.vline(x, r.y + 9, r.y + 18, C.wood3);
    b.rect(r.x + 6, r.y + 5, 5, 4, C.green3).rect(r.x + 15, r.y + 6, 3, 2, C.gold);
  },
  // The hall.
  'hall.umbrella': (b, r) => {
    b.rect(r.x + 4, r.y + 10, 14, r.h - 10, C.stone1).frame(r.x + 4, r.y + 10, 14, r.h - 10, C.stone0);
    b.line(r.x + 7, r.y + 10, r.x + 5, r.y, C.red).line(r.x + 11, r.y + 10, r.x + 12, r.y - 2, C.blue).line(r.x + 15, r.y + 10, r.x + 18, r.y + 1, C.ink);
  },
  'hall.coats': (b, r) => {
    b.rect(r.x + 13, r.y, 4, r.h, C.wood1).hline(r.x + 4, r.x + 26, r.y + 4, C.wood1);
    b.rect(r.x + 2, r.y + 6, 10, 22, C.blue).rect(r.x + 18, r.y + 6, 10, 18, C.red).rect(r.x + 9, r.y + 2, 12, 5, C.orange);
  },
  'hall.console': (b, r, s) => {
    table(b, r, C.oak);
    b.rect(r.x + 4, r.y, 8, 3, C.ink).rect(r.x + 16, r.y + 1, 6, 2, C.chrome).rect(r.x + 26, r.y, 7, 3, C.paper);
    // The drawer, half open on the spare fuse until it is taken.
    b.rect(r.x + 10, r.y + 6, 20, 6, C.oakDark).rect(r.x + 18, r.y + 8, 4, 2, C.brass);
    if (!on(s, 'fuse_taken')) b.rect(r.x + 12, r.y + 4, 6, 3, C.white).rect(r.x + 14, r.y + 4, 2, 3, C.red);
  },
  'hall.shoes': (b, r, s) => {
    for (let i = 0; i < 5; i++) b.rect(r.x + 2 + i * 6, r.y + 12 - (i % 2) * 3, 5, 3, [C.white, C.ink, C.red, C.blue, C.green3][i]);
    if (!on(s, 'gatekey_taken')) b.set(r.x + 9, r.y + 8, C.chrome).set(r.x + 10, r.y + 8, C.white);
  },
  'hall.mirror': (b, r) => b.ellipse(r.x + 12, r.y + 16, 10, 15, C.gold).ellipse(r.x + 12, r.y + 16, 8, 13, C.glassHi).line(r.x + 7, r.y + 8, r.x + 12, r.y + 4, C.white),
  // The living room (photo): stepped oak bookshelf, grey sofa with yellow cushions, mustard armchair, white TV unit
  // with the electronic chessboard, white paper floor lamp, bay window with a teal curtain.
  'living.bookshelf': (b, r, s) => {
    // Stepped, hung on the wall above the sofa: each column a little taller than the previous one.
    for (let i = 0; i < 4; i++) {
      const top = r.y + 24 - i * 8;
      const col = { x: r.x + i * 13, y: top, w: 13, h: r.y + r.h - top };
      b.rect(col.x, col.y, col.w, col.h, C.oak).frame(col.x, col.y, col.w, col.h, C.oakDark);
      for (let y = col.y + 2; y < col.y + col.h - 8; y += 10) {
        books(b, col.x + 1, col.x + col.w - 1, y, 8, i * 11 + y);
        b.hline(col.x + 1, col.x + col.w - 2, y + 8, C.oakDark);
      }
    }
    if (!on(s, 'booklet_taken')) b.rect(r.x + 17, r.y + 30, 6, 8, C.yellow).set(r.x + 19, r.y + 33, C.red).set(r.x + 20, r.y + 34, C.blue);
  },
  'living.sofa': (b, r) => {
    b.rect(r.x - 40, r.y + 10, r.w + 40, r.h - 10, C.sofaGrey).rect(r.x - 40, r.y + 2, r.w + 40, 10, C.sofaShade).rect(r.x - 42, r.y + 4, 4, r.h - 4, C.sofaShade);
    b.rect(r.x - 34, r.y + 4, 9, 8, C.yellow).rect(r.x - 22, r.y + 4, 9, 8, C.orange).rect(r.x + 4, r.y + 4, 9, 8, C.yellow);
    b.rect(r.x - 10, r.y + 12, 20, 8, C.red).set(r.x - 7, r.y + 14, C.white).set(r.x - 2, r.y + 17, C.white).set(r.x + 4, r.y + 14, C.white);
  },
  'living.bay': (b, r, s) => {
    if (on(s, 'bay_open')) doorway(b, r, C.night1);
    else windowPane(b, r, 'night');
    b.rect(r.x - 4, r.y - 2, 8, r.h + 2, C.tealDeep).hline(r.x - 4, r.x + 3, r.y + 30, C.orange).hline(r.x - 4, r.x + 3, r.y + 32, C.yellow);
  },
  'living.lamp': (b, r) => {
    b.vline(r.x + 12, r.y + 22, FLOOR_Y - 1, C.stone2);
    b.ellipse(r.x + 12, r.y + 14, 8, 13, C.white).ellipse(r.x + 12, r.y + 14, 6, 11, C.candleHot);
  },
  'living.chess': (b, r, s) => {
    // The white TV unit with an oak top; the electronic chessboard and its little screen on it.
    b.rect(r.x - 4, r.y + 8, r.w + 8, r.h - 8, C.white).rect(r.x - 4, r.y + 6, r.w + 8, 3, C.oak).hline(r.x - 2, r.x + r.w + 1, r.y + 15, C.stone3);
    b.rect(r.x + 6, r.y, 22, 6, C.ink);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) b.rect(r.x + 7 + i * 4, r.y + 1 + j * 2, 4, 2, (i + j) % 2 === 0 ? C.cream : C.wood2);
    b.rect(r.x + 24, r.y + 1, 3, 4, on(s, 'queen_placed') ? C.green3 : C.red);
    if (on(s, 'queen_placed')) b.rect(r.x + 13, r.y - 3, 2, 3, C.white);
  },
  'living.tv': (b, r) => b.rect(r.x, r.y, r.w, r.h - 6, C.ink).frame(r.x, r.y, r.w, r.h - 6, C.chrome).rect(r.x + 2, r.y + 2, r.w - 4, r.h - 10, C.night1).rect(r.x + 10, r.y + r.h - 6, 8, 6, C.stone0),
  // The music corner and the dining room, now one room (photos): black digital piano, guitar, foosball and
  // xylophone, black electronic drums; the pine table with its teal tablecloth, the white dresser, the dancers
  // painting.
  'music.piano': (b, r) => {
    b.rect(r.x, r.y + 4, r.w, r.h - 4, C.ink).rect(r.x + 2, r.y + 20, r.w - 4, 6, C.white);
    for (let x = r.x + 4; x < r.x + r.w - 2; x += 4) b.vline(x, r.y + 20, r.y + 25, C.stone2).rect(x + 2, r.y + 20, 2, 4, C.ink);
    b.rect(r.x + 14, r.y + 8, 16, 10, C.blue).vline(r.x + 22, r.y + 8, r.y + 17, C.white);
  },
  'music.guitar': (b, r) => b.ellipse(r.x + 11, r.y + 38, 8, 10, C.orange).rect(r.x + 10, r.y + 4, 3, 28, C.wood1).rect(r.x + 8, r.y, 7, 5, C.ink).ellipse(r.x + 11, r.y + 38, 3, 3, C.ink),
  'music.drums': (b, r) => {
    const cx = r.x + r.w / 2;
    // The chrome rack.
    b.hline(r.x + 4, r.x + r.w - 5, r.y + 16, C.chrome).vline(r.x + 5, r.y + 16, r.y + r.h - 1, C.chrome).vline(r.x + r.w - 6, r.y + 16, r.y + r.h - 1, C.chrome);
    // Cymbals (hi-hat on the left, crash on the right), with their stands.
    b.vline(r.x + 4, r.y + 4, r.y + 16, C.chrome).ellipse(r.x + 5, r.y + 4, 6, 1, C.gold).ellipse(r.x + 5, r.y + 6, 6, 1, C.goldDark);
    b.vline(r.x + r.w - 5, r.y + 1, r.y + 16, C.chrome).ellipse(r.x + r.w - 6, r.y + 2, 7, 2, C.gold);
    // Toms and snare: black pads with a grey mesh.
    for (const [dx, dy, rx] of [
      [13, 12, 5],
      [r.w - 13, 12, 5],
      [10, 22, 6],
    ] as const)
      b.ellipse(r.x + dx, r.y + dy, rx, 3, C.ink).ellipse(r.x + dx, r.y + dy - 1, rx - 1, 2, C.stone2);
    // The kick drum with its logo, the floor tom and the stool.
    b.ellipse(cx, r.y + 32, 9, 9, C.ink).ellipse(cx, r.y + 32, 6, 6, C.stone1).ellipse(cx, r.y + 32, 2, 2, C.red);
    b.ellipse(r.x + r.w - 11, r.y + 30, 5, 3, C.ink).ellipse(r.x + r.w - 11, r.y + 29, 4, 2, C.stone2).vline(r.x + r.w - 11, r.y + 32, r.y + r.h - 1, C.chrome);
  },
  'music.xylo': (b, r) => {
    for (let i = 0; i < 6; i++) b.rect(r.x + 2 + i * 5, r.y + 4 + i, 4, 12 - i, [C.red, C.orange, C.yellow, C.green3, C.blue, C.purple][i]);
    b.vline(r.x + 4, r.y + 16, r.y + r.h - 1, C.wood1).vline(r.x + r.w - 5, r.y + 16, r.y + r.h - 1, C.wood1);
  },
  'music.table': (b, r) => {
    table(b, r, C.pine);
    b.rect(r.x + 2, r.y + 2, r.w - 4, 6, C.tealCloth);
    for (let x = r.x + 4; x < r.x + r.w - 4; x += 7) b.set(x, r.y + 4, C.pink).set(x + 3, r.y + 6, C.green3);
    // Pine chairs with crossed backs.
    for (const cx of [r.x + 8, r.x + r.w - 16]) b.rect(cx, r.y - 6, 8, 2, C.pine).line(cx, r.y - 4, cx + 7, r.y + 2, C.pine).line(cx + 7, r.y - 4, cx, r.y + 2, C.pine);
  },
  'music.basket': (b, r, s) => {
    b.ellipse(r.x + 13, r.y + 16, 11, 5, C.wood4).ellipse(r.x + 13, r.y + 14, 9, 3, C.wood2);
    if (!on(s, 'sticks_taken')) b.line(r.x + 6, r.y + 6, r.x + 18, r.y + 14, C.wood5).line(r.x + 8, r.y + 5, r.x + 20, r.y + 13, C.wood5);
  },
  'music.sideboard': (b, r) => {
    // The white dresser with its glass doors.
    b.rect(r.x, r.y, r.w, r.h, C.white).frame(r.x, r.y, r.w, r.h, C.stone3).rect(r.x + 3, r.y + 3, r.w - 6, 18, C.glassHi).vline(r.x + r.w / 2, r.y + 3, r.y + 20, C.stone3);
    b.rect(r.x + 5, r.y + 8, 5, 6, C.blue).rect(r.x + 16, r.y + 9, 5, 5, C.white).hline(r.x + 2, r.x + r.w - 3, r.y + 26, C.stone3);
  },
  // The kitchen (photo): sky-blue walls, white tiles with geometric inserts, the steel fridge, butcher-block worktop,
  // steel oven and hood, the white farmhouse sink, the multicooker.
  'kitchen.oven': (b, r) => {
    b.rect(r.x, r.y, r.w, r.h, C.steel).frame(r.x, r.y, r.w, r.h, C.steelDark).rect(r.x + 5, r.y + 16, r.w - 10, r.h - 22, C.ink).rect(r.x + 8, r.y + 19, r.w - 16, r.h - 28, C.orange);
    b.rect(r.x - 2, r.y - 2, r.w + 4, 4, C.ink).ellipse(r.x + 10, r.y - 3, 4, 2, C.red);
  },
  'kitchen.fridge': (b, r, s) => {
    if (!on(s, 'fridge_open')) {
      b.rect(r.x, r.y, r.w, r.h, C.steel).frame(r.x, r.y, r.w, r.h, C.steelDark).hline(r.x, r.x + r.w - 1, r.y + 30, C.steelDark).rect(r.x + r.w - 6, r.y + 10, 2, 12, C.steelDark);
      b.rect(r.x + 5, r.y + 36, 6, 6, C.yellow).rect(r.x + 14, r.y + 40, 7, 5, C.white).rect(r.x + 6, r.y + 48, 5, 5, C.red);
      return;
    }
    // Open: the lit inside with its shelves, the door swung to the left.
    b.rect(r.x, r.y, r.w, r.h, C.steelDark).rect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, C.white);
    for (let y = r.y + 16; y < r.y + r.h - 4; y += 14) b.hline(r.x + 2, r.x + r.w - 3, y, C.glass);
    b.rect(r.x + 3, r.y + 8, 4, 6, C.cream).rect(r.x + 22, r.y + 9, 4, 6, C.green3).rect(r.x + 3, r.y + 44, 5, 5, C.red);
    b.rect(r.x - 10, r.y, 10, r.h, C.steel).frame(r.x - 10, r.y, 10, r.h, C.steelDark);
  },
  'kitchen.sink': (b, r) => {
    b.rect(r.x, r.y + 6, r.w, r.h - 6, C.white).frame(r.x, r.y + 6, r.w, r.h - 6, C.stone3).vline(r.x + r.w / 2, r.y + 6, r.y + r.h - 1, C.stone3);
    b.line(r.x + r.w / 2, r.y + 6, r.x + r.w / 2, r.y - 4, C.chrome).line(r.x + r.w / 2, r.y - 4, r.x + r.w / 2 + 6, r.y, C.chrome);
  },
  'kitchen.robot': (b, r, s) => {
    b.rect(r.x + 4, r.y + 12, 16, r.h - 12, C.white).frame(r.x + 4, r.y + 12, 16, r.h - 12, C.stone3);
    b.rect(r.x + 6, r.y + 2, 12, 10, C.glassHi).frame(r.x + 6, r.y + 2, 12, 10, C.stone2);
    if (on(s, 'dough_mixed')) b.rect(r.x + 7, r.y + 6, 10, 5, C.beech);
    else if (on(s, 'milk_in') || on(s, 'chestnut_in') || on(s, 'riceflour_in')) b.rect(r.x + 7, r.y + 9, 10, 2, C.cream);
  },
  'kitchen.bowl': (b, r, s) => b.ellipse(r.x + 13, r.y + 17, 11, 5, C.chrome).ellipse(r.x + 13, r.y + 15, 9, 2, on(s, 'dough_mixed') ? C.chocHi : C.choc),
  // The ground-floor corridor.
  'corridor0.photos': (b, r) => {
    for (let i = 0; i < 2; i++) b.rect(r.x + 2 + i * 10, r.y + 4 + i * 4, 9, 11, C.gold).rect(r.x + 3 + i * 10, r.y + 5 + i * 4, 7, 9, C.sky).rect(r.x + 5 + i * 10, r.y + 9 + i * 4, 3, 4, C.choc);
  },
  'corridor0.plant': (b, r) => pot(b, r.x + 11, r.y + r.h, C.leaf),
  // The ground-floor toilet: a Japanese toilet.
  'wc0.brush': (b, r) => b.rect(r.x + 7, r.y + 12, 8, 10, C.white).vline(r.x + 11, r.y + 2, r.y + 12, C.stone2),
  'wc0.toilet': (b, r) => toilet(b, r, true),
  'wc0.paper': (b, r) => b.hline(r.x + 2, r.x + 20, r.y + 6, C.chrome).ellipse(r.x + 11, r.y + 12, 7, 6, C.white).ellipse(r.x + 11, r.y + 12, 2, 2, C.stone3),
  'wc0.magazine': (b, r) => b.rect(r.x + 3, r.y + 6, 18, 14, C.pink).rect(r.x + 5, r.y + 8, 14, 4, C.choc).hline(r.x + 5, r.x + 18, r.y + 15, C.white),
  'wc0.sign': (b, r) => b.rect(r.x, r.y + 2, r.w, r.h - 4, C.white).frame(r.x, r.y + 2, r.w, r.h - 4, C.ink).hline(r.x + 4, r.x + r.w - 5, r.y + 8, C.ink).hline(r.x + 4, r.x + r.w - 9, r.y + 13, C.ink),
  // The office (photo): teal walls with a mustard section, a long birch desk, two big monitors, a navy mesh chair.
  'office.window': (b, r) => windowPane(b, r, 'garden'),
  'office.lamp': (b, r) => b.rect(r.x + 4, r.y + 26, 12, 3, C.ink).line(r.x + 8, r.y + 26, r.x + 6, r.y + 12, C.ink).line(r.x + 6, r.y + 12, r.x + 16, r.y + 6, C.ink).rect(r.x + 14, r.y + 4, 8, 5, C.ink),
  // Papa's desk drawer (E28), under the computer.
  'office.drawer': (b, r, s) => {
    b.rect(r.x, r.y, r.w, r.h - 4, C.wood3).frame(r.x, r.y, r.w, r.h - 4, C.wood1).rect(r.x + r.w / 2 - 3, r.y + 6, 6, 2, C.brass);
    if (on(s, 'drawer_open')) b.rect(r.x + 2, r.y + r.h - 6, r.w - 4, 5, C.wood4).rect(r.x + 6, r.y + r.h - 7, 10, 3, C.paper);
    else b.set(r.x + r.w / 2, r.y + 10, C.ink);
  },
  'office.computer': (b, r) => {
    b.rect(r.x - 40, r.y + 22, r.w + 80, 4, C.beech).rect(r.x - 38, r.y + 26, 3, 12, C.white).rect(r.x + r.w + 36, r.y + 26, 3, 12, C.white);
    b.rect(r.x - 6, r.y + 18, r.w + 12, 3, C.white);
    // Two monitors: a sunset lake wallpaper on the left one.
    b.rect(r.x - 2, r.y, 20, 16, C.ink).gradient(r.x, r.y + 2, 16, 12, [C.sky1, C.sky3, C.blue]).rect(r.x + 22, r.y, 20, 16, C.ink).rect(r.x + 24, r.y + 2, 16, 12, C.teal1);
    b.rect(r.x + 4, r.y + 21, 22, 2, C.purple).rect(r.x + 36, r.y + 3, 4, 4, C.yellow);
  },
  'office.chair': (b, r) => {
    b.rect(r.x + 6, r.y, 14, 16, C.navy).dither(r.x + 7, r.y + 1, 12, 14, C.navy, C.sofaShade);
    b.rect(r.x + 4, r.y + 16, 18, 4, C.ink).vline(r.x + 13, r.y + 20, r.y + 26, C.ink).hline(r.x + 6, r.x + 20, r.y + 27, C.ink);
  },
  'office.shelf': (b, r, s) => {
    b.rect(r.x, r.y, r.w, r.h, C.white).frame(r.x, r.y, r.w, r.h, C.stone3);
    for (let y = r.y + 4; y < r.y + 40; y += 16) for (let i = 0; i < 5; i++) b.rect(r.x + 4 + i * 9, y, 7, 13, [C.blue, C.red, C.green3, C.gold, C.stone3][i]);
    // Papa's red toolbox on the bottom shelf, the pliers sticking out.
    b.rect(r.x + 6, r.y + 48, 30, 16, C.red).frame(r.x + 6, r.y + 48, 30, 16, C.redDark).hline(r.x + 14, r.x + 28, r.y + 46, C.stone1);
    if (!on(s, 'pliers_taken')) b.line(r.x + 22, r.y + 48, r.x + 30, r.y + 40, C.chrome).line(r.x + 24, r.y + 48, r.x + 33, r.y + 41, C.chrome);
  },
  // The utility room (photo): pale blue walls, a window with pink blinds, the white washing machine under the dryer,
  // the drying rack, the ironing board, the pantry shelves.
  'utility.basket': (b, r) => b.rect(r.x + 2, r.y + 6, r.w - 4, r.h - 6, C.blue).frame(r.x + 2, r.y + 6, r.w - 4, r.h - 6, C.blueDark).ellipse(r.x + 12, r.y + 6, 6, 3, C.stone4).ellipse(r.x + 24, r.y + 5, 5, 3, C.pink),
  'utility.machine': (b, r, s) => {
    // The tumble dryer stacked on top.
    b.rect(r.x, r.y - 34, r.w, 33, C.white).frame(r.x, r.y - 34, r.w, 33, C.stone3).ellipse(r.x + r.w / 2, r.y - 16, 10, 10, C.stone3);
    b.rect(r.x, r.y, r.w, r.h, C.white).frame(r.x, r.y, r.w, r.h, C.stone3).rect(r.x + 4, r.y + 3, r.w - 8, 5, C.stone4);
    b.rect(r.x + r.w - 12, r.y + 4, 6, 3, on(s, 'power_on') ? C.green3 : C.ink);
    b.ellipse(r.x + r.w / 2, r.y + 24, 13, 13, C.stone3).ellipse(r.x + r.w / 2, r.y + 24, 10, 10, on(s, 'machine_running') ? C.water1 : C.glass);
  },
  'utility.shelf': (b, r, s) => {
    b.rect(r.x, r.y, r.w, r.h, C.white).frame(r.x, r.y, r.w, r.h, C.stone3).hline(r.x, r.x + r.w - 1, r.y + 18, C.stone3);
    b.rect(r.x + 4, r.y + 8, 6, 10, C.goldDark).rect(r.x + 12, r.y + 10, 5, 8, C.red).rect(r.x + 4, r.y + 26, 10, 10, C.white).rect(r.x + 18, r.y + 24, 10, 12, C.gold);
    if (!on(s, 'detergent_taken')) b.rect(r.x + 32, r.y + 6, 12, 12, C.green3).rect(r.x + 34, r.y + 9, 8, 4, C.white);
  },
  'utility.flours': (b, r, s) => {
    b.rect(r.x, r.y, r.w, r.h, C.white).frame(r.x, r.y, r.w, r.h, C.stone3).hline(r.x, r.x + r.w - 1, r.y + r.h - 2, C.stone3);
    b.rect(r.x + 4, r.y + 14, 14, 12, C.water1).rect(r.x + 4, r.y + 4, 10, 8, C.red);
  },
  // The two flour packets, taken one at a time.
  'utility.chestnut': (b, r) => b.rect(r.x + 6, r.y + 6, 10, 16, C.wood3).rect(r.x + 8, r.y + 10, 6, 5, C.cream),
  'utility.riceflour': (b, r) => b.rect(r.x + 6, r.y + 6, 10, 16, C.paper).rect(r.x + 8, r.y + 10, 6, 5, C.water1),
  // In the open fridge: the rice milk carton and the tin of sardines.
  'kitchen.milk': (b, r) => b.rect(r.x + 7, r.y + 6, 8, 14, C.white).frame(r.x + 7, r.y + 6, 8, 14, C.stone2).rect(r.x + 8, r.y + 10, 6, 4, C.water1),
  'kitchen.sardines': (b, r) => b.rect(r.x + 3, r.y + 10, 16, 6, C.chrome).frame(r.x + 3, r.y + 10, 16, 6, C.stone1).rect(r.x + 6, r.y + 12, 10, 2, C.blue),
  'utility.broom': (b, r) => b.vline(r.x + 11, r.y, r.y + r.h - 14, C.wood4).rect(r.x + 4, r.y + r.h - 14, 15, 14, C.yellow),
  // The garage.
  'garage.pole': (b, r, s) => {
    b.rect(r.x + 9, r.y + 2, 4, 4, C.stone1);
    if (!on(s, 'pole_taken')) b.rect(r.x + 10, r.y + 4, 2, r.h - 6, C.blue).rect(r.x + 9, r.y + r.h - 4, 4, 3, C.chrome);
  },
  'garage.crate': (b, r) => {
    b.rect(r.x, r.y, r.w, r.h, C.wood4).frame(r.x, r.y, r.w, r.h, C.wood2).line(r.x, r.y, r.x + r.w - 1, r.y + r.h - 1, C.wood2).line(r.x + r.w - 1, r.y, r.x, r.y + r.h - 1, C.wood2);
    b.rect(r.x + 6, r.y - 4, 12, 4, C.green3).rect(r.x + 20, r.y - 3, 12, 3, C.red);
  },
  'garage.bike': (b, r, s) => {
    // The back tyre is flat until E26.
    const flat = !on(s, 'bike_fixed');
    b.ellipse(r.x + 8, r.y + 30, 7, 7, C.ink).ellipse(r.x + 8, r.y + 30, 5, 5, C.stone3);
    if (flat) b.ellipse(r.x + 30, r.y + 32, 8, 5, C.ink).ellipse(r.x + 30, r.y + 32, 6, 3, C.stone3);
    else b.ellipse(r.x + 30, r.y + 30, 7, 7, C.ink).ellipse(r.x + 30, r.y + 30, 5, 5, C.stone3);
    b.line(r.x + 8, r.y + 30, r.x + 18, r.y + 18, C.red).line(r.x + 18, r.y + 18, r.x + 30, r.y + 30, C.red).line(r.x + 18, r.y + 18, r.x + 28, r.y + 18, C.red).rect(r.x + 14, r.y + 15, 6, 2, C.ink);
  },
  'garage.paint': (b, r) => {
    b.hline(r.x, r.x + r.w - 1, r.y + r.h - 2, C.wood1);
    for (let i = 0; i < 4; i++) b.rect(r.x + 2 + i * 10, r.y + 12, 8, r.h - 14, [C.white, C.white, C.blue, C.red][i]).hline(r.x + 2 + i * 10, r.x + 9 + i * 10, r.y + 12, C.stone2);
  },
  'garage.bench': (b, r, s) => {
    table(b, { x: r.x, y: r.y + 12, w: r.w, h: r.h - 12 }, C.wood4);
    if (!on(s, 'wrench_taken')) b.line(r.x + 20, r.y + 12, r.x + 34, r.y + 10, C.chrome).rect(r.x + 18, r.y + 10, 4, 3, C.chrome);
  },
  'garage.breaker': (b, r, s) => {
    b.rect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, C.white).frame(r.x + 1, r.y + 1, r.w - 2, r.h - 2, C.stone2);
    // The fuse of the "Cellier" line, once screwed in.
    if (on(s, 'fuse_in')) b.rect(r.x + 12, r.y + 22, 4, 5, C.white).rect(r.x + 13, r.y + 23, 2, 3, C.red);
    for (let i = 0; i < 4; i++) {
      const down = i === 2 && !on(s, 'power_on');
      b.rect(r.x + 4 + i * 4, r.y + 8, 3, 12, C.stone3).rect(r.x + 4 + i * 4, r.y + (down ? 15 : 9), 3, 4, down ? C.red : C.ink);
    }
  },
  'garage.drawer': (b, r) => {
    b.rect(r.x, r.y, r.w, r.h, C.red).frame(r.x, r.y, r.w, r.h, C.redDark).hline(r.x + 2, r.x + r.w - 3, r.y + 8, C.redDark).hline(r.x + 2, r.x + r.w - 3, r.y + 16, C.redDark);
  },
  // The wine cellar.
  'cellar.rack': (b, r, s) => {
    b.rect(r.x, r.y, r.w, r.h, C.wood2);
    for (let y = r.y + 4; y < r.y + r.h - 4; y += 9) for (let x = r.x + 4; x < r.x + r.w - 4; x += 9) b.ellipse(x + 3, y + 3, 3, 3, C.wine1).set(x + 3, y + 3, C.green1);
    if (!on(s, 'bar_taken')) b.line(r.x + 4, r.y + 28, r.x + r.w - 4, r.y + 24, C.ironHi);
  },
  'cellar.barrel': (b, r) => b.ellipse(r.x + 15, r.y + 16, 13, 13, C.wood3).hline(r.x + 3, r.x + 27, r.y + 9, C.iron).hline(r.x + 3, r.x + 27, r.y + 23, C.iron),
  // The two wall stones of the hatch mechanism; a wedged one holds the iron bar.
  'cellar.stoneLeft': (b, r, s) => stone(b, r, on(s, 'stone_left')),
  'cellar.stoneRight': (b, r, s) => stone(b, r, on(s, 'stone_right')),
  'cellar.hatch': (b, r) => {
    // The hatch in the ceiling, seen from below, and the steep steps up to it.
    b.rect(r.x, r.y, r.w, 10, C.wood1).frame(r.x, r.y, r.w, 10, C.wood0);
    for (let x = r.x + 4; x < r.x + r.w; x += 6) b.vline(x, r.y + 1, r.y + 8, C.wood2);
    b.vline(r.x + 8, r.y + 10, FLOOR_Y - 1, C.wood3).vline(r.x + r.w - 9, r.y + 10, FLOOR_Y - 1, C.wood3);
    for (let y = r.y + 18; y < FLOOR_Y; y += 10) b.hline(r.x + 8, r.x + r.w - 9, y, C.wood3);
  },
  // Papa's four old bottles (E21); once in order, the hiding place behind them is open.
  'cellar.bottles': (b, r, s) => {
    b.rect(r.x + 1, r.y + 12, r.w - 2, r.h - 12, C.wood1);
    if (on(s, 'bottles_done')) b.rect(r.x + 6, r.y + 18, r.w - 12, 14, C.black).frame(r.x + 5, r.y + 17, r.w - 10, 16, C.wood3);
    for (let i = 0; i < 4; i++) {
      const x = r.x + 4 + i * 9;
      b.rect(x, r.y + 22, 6, 26, C.green1).rect(x + 1, r.y + 15, 4, 7, C.green1).rect(x + 1, r.y + 30, 4, 6, C.paper).set(x + 2, r.y + 26, C.green3);
    }
  },
  'cellar.cobweb': (b, r) => {
    for (let i = 0; i < 5; i++) b.line(r.x + 2, r.y + 2, r.x + 2 + i * 6, r.y + 22 - i * 4, C.stone3);
    for (let k = 1; k < 4; k++) b.line(r.x + 2 + k * 5, r.y + 2, r.x + 2, r.y + 2 + k * 5, C.stone3);
    b.ellipse(r.x + 18, r.y + 14, 2, 2, C.ink);
  },
  // The attic, cluttered with junk.
  'attic.horse': (b, r) => {
    b.line(r.x + 2, r.y + 28, r.x + 26, r.y + 28, C.red).line(r.x + 2, r.y + 26, r.x + 14, r.y + 29, C.red).line(r.x + 26, r.y + 26, r.x + 14, r.y + 29, C.red);
    b.rect(r.x + 6, r.y + 12, 16, 8, C.white).rect(r.x + 18, r.y + 4, 6, 10, C.white).rect(r.x + 7, r.y + 20, 2, 7, C.white).rect(r.x + 19, r.y + 20, 2, 7, C.white).vline(r.x + 17, r.y + 4, r.y + 12, C.wood1);
  },
  'attic.boxes': (b, r) => {
    b.rect(r.x, r.y + 14, 30, 26, C.wood4).rect(r.x + 26, r.y + 4, 30, 36, C.wood5).rect(r.x + 8, r.y, 22, 14, C.wood3);
    b.frame(r.x, r.y + 14, 30, 26, C.wood2).frame(r.x + 26, r.y + 4, 30, 36, C.wood3).frame(r.x + 8, r.y, 22, 14, C.wood1).hline(r.x + 30, r.x + 52, r.y + 12, C.wood2);
  },
  'attic.chairs': (b, r) => {
    for (let i = 0; i < 3; i++) {
      const y = r.y + 28 - i * 13;
      const x = r.x + 4 + (i % 2) * 4;
      b.rect(x, y, 20, 3, C.wood5).vline(x + 1, y + 3, y + 12, C.wood0).vline(x + 18, y + 3, y + 12, C.wood0).rect(x + 14, y - 10, 4, 10, C.wood5).frame(x, y, 20, 3, C.wood0);
    }
  },
  'attic.suitcase': (b, r) => {
    b.rect(r.x + 2, r.y + 6, r.w - 4, r.h - 6, C.wine2).frame(r.x + 2, r.y + 6, r.w - 4, r.h - 6, C.wine0).rect(r.x + r.w / 2 - 4, r.y + 2, 8, 4, C.wine0);
    b.rect(r.x + 6, r.y + 9, 7, 5, C.yellow).rect(r.x + 22, r.y + 12, 8, 5, C.sky).rect(r.x + 14, r.y + 16, 6, 4, C.green3);
  },
  'attic.window': (b, r) => windowPane(b, r, 'night', C.wood2),
  'attic.lamp': (b, r) => {
    b.vline(r.x + 12, r.y + 14, r.y + r.h - 1, C.brass).rect(r.x + 6, r.y + r.h - 2, 13, 2, C.brass);
    for (let j = 0; j < 12; j++) b.hline(r.x + 7 - Math.floor(j / 4), r.x + 17 + Math.floor(j / 4), r.y + 2 + j, C.rose);
    for (let x = r.x + 4; x < r.x + 21; x += 2) b.vline(x, r.y + 14, r.y + 17, C.wine1);
  },
  // The trunk with its colour padlock (E29): open, the lid stands up and the padlock hangs loose.
  'attic.trunk': (b, r, s) => {
    b.rect(r.x, r.y + 6, r.w, r.h - 6, C.wood3);
    if (on(s, 'trunk_open')) b.rect(r.x + 2, r.y - 10, r.w - 4, 14, C.wood4).frame(r.x + 2, r.y - 10, r.w - 4, 14, C.wood2).rect(r.x + 4, r.y + 6, r.w - 8, 4, C.black);
    else b.ellipse(r.x + r.w / 2, r.y + 7, r.w / 2, 5, C.wood4);
    b.vline(r.x + 8, r.y + 3, r.y + r.h - 1, C.iron).vline(r.x + r.w - 9, r.y + 3, r.y + r.h - 1, C.iron);
    const ly = on(s, 'trunk_open') ? r.y + 14 : r.y + 10;
    b.rect(r.x + r.w / 2 - 5, ly, 10, 7, C.brass);
    for (let i = 0; i < 4; i++) b.set(r.x + r.w / 2 - 4 + i * 2, ly + 3, [C.red, C.yellow, C.blue, C.green3][i]);
  },
  'attic.stain': (b, r) => {
    b.ellipse(r.x + 20, r.y + 34, 18, 30, C.cream);
    b.dither(r.x + 6, r.y + 12, 28, 50, C.cream, C.white);
  },
  'attic.door': (b, r, s) => {
    door(b, { x: r.x + 4, y: r.y + 4, w: r.w - 8, h: r.h - 4 }, C.wood2);
    // The keypad next to the lock, green once the code is typed.
    b.rect(r.x + 8, r.y + 30, 8, 10, C.ink).rect(r.x + 9, r.y + 31, 6, 2, on(s, 'lab_code') ? C.green3 : C.red);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) b.set(r.x + 9 + i * 2, r.y + 35 + j * 2, C.stone3);
  },
  'attic.dummy': (b, r) => {
    b.vline(r.x + 15, r.y + 40, r.y + r.h - 1, C.wood1).rect(r.x + 9, r.y + r.h - 2, 13, 2, C.wood1);
    b.ellipse(r.x + 15, r.y + 18, 9, 14, C.cream).rect(r.x + 11, r.y + 4, 9, 4, C.cream);
    b.rect(r.x + 9, r.y + 16, 13, 14, C.white).hline(r.x + 9, r.x + 21, r.y + 22, C.choc);
  },
  // Papa's secret lab.
  'laundry.machine': (b, r) => b.rect(r.x, r.y, r.w, r.h, C.white).frame(r.x, r.y, r.w, r.h, C.stone3).ellipse(r.x + 20, r.y + 26, 12, 12, C.stone3).rect(r.x + 18, r.y - 8, 4, 10, C.chrome).ellipse(r.x + 20, r.y - 10, 6, 3, C.chrome),
  'laundry.mixer': (b, r) => {
    b.rect(r.x + 4, r.y + 4, 18, 9, C.yellow).rect(r.x + 20, r.y + 6, 6, 5, C.ink).vline(r.x + 10, r.y + 13, r.y + 24, C.chrome);
    b.ellipse(r.x + 10, r.y + 26, 4, 3, C.chrome).rect(r.x + 2, r.y + 24, 24, 6, C.stone4);
  },
  'laundry.notebook': (b, r) => {
    b.rect(r.x - 40, r.y + 14, r.w + 120, 4, C.wood4).rect(r.x - 38, r.y + 18, 3, 16, C.wood2);
    b.rect(r.x + 2, r.y + 4, 26, 10, C.paper).vline(r.x + 15, r.y + 4, r.y + 13, C.wood2);
    textLines(b, { x: r.x + 2, y: r.y + 3, w: 13, h: 11 }, C.stone2);
  },
  'laundry.cake': (b, r) => b.ellipse(r.x + 15, r.y + 12, 13, 13, C.glassHi).rect(r.x + 5, r.y + 14, 20, 10, C.choc).rect(r.x + 5, r.y + 14, 20, 3, C.chocHi).set(r.x + 15, r.y + 12, C.red),
  'laundry.form': (b, r) => {
    b.rect(r.x + 3, r.y + 2, 24, 28, C.white).frame(r.x + 3, r.y + 2, 24, 28, C.stone3).rect(r.x + 6, r.y + 5, 18, 4, C.gold);
    textLines(b, { x: r.x + 3, y: r.y + 10, w: 24, h: 18 }, C.stone2);
  },
  // Upstairs.
  'landing.lamp': (b, r) => b.rect(r.x + 10, r.y + 12, 4, 10, C.brass).ellipse(r.x + 12, r.y + 10, 8, 6, C.candle),
  'landing.picture': (b, r) => {
    b.rect(r.x, r.y + 2, r.w, r.h - 4, C.white).frame(r.x, r.y + 2, r.w, r.h - 4, C.wood2);
    b.rect(r.x + 4, r.y + 10, 8, 8, C.red).rect(r.x + 20, r.y + 12, 6, 6, C.choc).set(r.x + 15, r.y + 14, C.ink).set(r.x + 17, r.y + 14, C.ink);
  },
  'wc1.towel': (b, r) => b.hline(r.x + 2, r.x + r.w - 3, r.y + 4, C.chrome).rect(r.x + 4, r.y + 5, r.w - 8, 28, C.white).hline(r.x + 4, r.x + r.w - 5, r.y + 26, C.blue),
  'wc1.freshener': (b, r) => b.rect(r.x + 7, r.y + 8, 8, 20, C.sky).rect(r.x + 8, r.y + 4, 6, 4, C.white).rect(r.x + 9, r.y + 14, 4, 6, C.white),
  'wc1.toilet': (b, r) => toilet(b, r),
  'wc1.comics': (b, r) => {
    for (let i = 0; i < 4; i++) b.rect(r.x + 2, r.y + 18 - i * 4, 20, 4, [C.red, C.blue, C.yellow, C.green3][i]);
  },
  'wc1.plant': (b, r) => pot(b, r.x + 12, r.y + r.h, C.green3),
  // Julien's room (photo): grey-white walls with a big blue triangle behind the bed, white desk with a teal lamp,
  // the bed with a turquoise sheet and a yellow plush, a cotton-ball garland.
  'julien.poster': (b, r) => posterBox(b, r, C.green3, C.white),
  'julien.radio': (b, r) => b.ellipse(r.x + 13, r.y + 12, 9, 9, C.white).set(r.x + 10, r.y + 9, C.ink).set(r.x + 15, r.y + 12, C.ink).set(r.x + 12, r.y + 15, C.ink).vline(r.x + 20, r.y, r.y + 6, C.chrome),
  'julien.trophy': (b, r, s) => {
    b.rect(r.x + 4, r.y + 28, 18, 10, C.white).rect(r.x + 8, r.y + 18, 10, 10, C.gold).rect(r.x + 11, r.y + 10, 4, 8, C.gold);
    if (!on(s, 'queen_taken')) b.rect(r.x + 11, r.y + 4, 4, 6, C.white).set(r.x + 12, r.y + 3, C.white);
  },
  'julien.medals': (b, r) => {
    for (let i = 0; i < 6; i++) b.vline(r.x + 4 + i * 8, r.y + 2, r.y + 12, [C.red, C.blue, C.green3][i % 3]).ellipse(r.x + 4 + i * 8, r.y + 16, 3, 3, [C.gold, C.chrome, C.orange][i % 3]);
  },
  'julien.bed': (b, r) => {
    bed(b, r, C.iceBlue, C.turquoiseSheet, C.white);
    b.ellipse(r.x + 10, r.y + 2, 4, 4, C.yellow).set(r.x + 8, r.y + 1, C.ink).set(r.x + 12, r.y + 1, C.ink);
  },
  // The bathroom (photo): glossy square tiles in many colours, the white bath, the white vanity.
  'bathroom.sink': (b, r) => sink(b, r, true),
  'bathroom.cabinet': (b, r) => b.rect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, C.white).frame(r.x + 2, r.y + 2, r.w - 4, r.h - 4, C.chrome).rect(r.x + 5, r.y + 5, r.w - 10, r.h - 10, C.glassHi),
  'bathroom.scale': (b, r) => b.rect(r.x + 2, r.y + 12, r.w - 4, 8, C.white).frame(r.x + 2, r.y + 12, r.w - 4, 8, C.stone3).rect(r.x + 9, r.y + 14, 8, 3, C.ink),
  'bathroom.bath': (b, r) => {
    b.rect(r.x, r.y + 8, r.w, r.h - 8, C.white).frame(r.x, r.y + 8, r.w, r.h - 8, C.stone3).rect(r.x + 4, r.y + 10, r.w - 8, 4, C.water2).rect(r.x + r.w - 10, r.y, 3, 10, C.chrome);
    for (let x = r.x + 2; x < r.x + r.w - 6; x += 8) b.rect(x, r.y + 18, 6, 6, [C.lime, C.redTile, C.royal, C.tileYellow, C.turquoise][(x / 8) % 5 | 0]);
    b.ellipse(r.x + 20, r.y - 4, 5, 4, C.pink);
  },
  'bathroom.hairdryer': (b, r, s) => {
    b.rect(r.x + 9, r.y + 2, 6, 3, C.stone2);
    if (!on(s, 'hairdryer_taken')) b.rect(r.x + 4, r.y + 6, 16, 9, C.pink).ellipse(r.x + 6, r.y + 10, 4, 5, C.pink).rect(r.x + 14, r.y + 14, 5, 12, C.pink).set(r.x + 3, r.y + 10, C.ink);
  },
  'bathroom.duck': (b, r) => b.ellipse(r.x + 11, r.y + 14, 7, 5, C.yellow).ellipse(r.x + 15, r.y + 8, 4, 4, C.yellow).set(r.x + 19, r.y + 8, C.orange).hline(r.x + 13, r.x + 17, r.y + 7, C.ink),
  // Théo's room (photo): bright turquoise walls, white cube bookcase, oak desk, pine bed with a pink blanket.
  'theo.poster': (b, r) => posterBox(b, r, C.blueDark, C.white),
  'theo.bed': (b, r) => b.rect(r.x, r.y + 4, r.w, r.h - 4, C.beech).rect(r.x + 4, r.y, r.w - 8, 8, C.white).rect(r.x + 18, r.y + 2, r.w - 22, 8, C.coral).frame(r.x, r.y + 4, r.w, r.h - 4, C.wood2),
  'theo.cube': (b, r, s) => {
    const solved = on(s, 'cube_solved');
    const col = [C.red, C.green3, C.blue, C.yellow, C.orange, C.white];
    // On the corner of the white bookcase.
    b.rect(r.x, r.y + 16, r.w, r.h - 16, C.white).frame(r.x, r.y + 16, r.w, r.h - 16, C.stone3);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) b.rect(r.x + 6 + i * 4, r.y + 4 + j * 4, 3, 3, solved ? C.red : col[(i * 2 + j * 5) % 6]);
  },
  'theo.desk': (b, r) => {
    table(b, { x: r.x, y: r.y + 10, w: r.w, h: r.h - 10 }, C.beech, C.white);
    b.rect(r.x + 6, r.y + 6, 12, 6, C.paper).rect(r.x + 24, r.y + 4, 10, 8, C.red).rect(r.x + 38, r.y + 2, 6, 10, C.lime);
  },
  'theo.cubes': (b, r) => {
    b.hline(r.x, r.x + r.w - 1, r.y + r.h - 4, C.white);
    for (let i = 0; i < 6; i++) {
      const c = [C.red, C.blue, C.yellow, C.green3, C.orange, C.white][i];
      b.rect(r.x + 2 + i * 10, r.y + r.h - 12, 8, 8, c).frame(r.x + 2 + i * 10, r.y + r.h - 12, 8, 8, C.ink);
    }
  },
  // Florent's room (photo): white upper wall, emerald lower wall, white bed with a navy sheet, egg chair, white
  // desk with a mustard lamp, a garland.
  'florent.nerf': (b, r) => {
    b.rect(r.x, r.y, r.w, r.h, C.white).frame(r.x, r.y, r.w, r.h, C.stone3);
    for (let i = 0; i < 3; i++) b.rect(r.x + 4, r.y + 6 + i * 12, 34, 6, [C.orange, C.blue, C.yellow][i]).rect(r.x + 8, r.y + 12 + i * 12, 4, 5, C.ink);
  },
  'florent.bed': (b, r) => bed(b, r, C.white, C.navy, C.stone4, C.white),
  'florent.poster': (b, r) => {
    b.rect(r.x, r.y, r.w, r.h, C.ink).frame(r.x, r.y, r.w, r.h, C.white).ellipse(r.x + 15, r.y + 20, 8, 5, C.red);
    b.line(r.x + 8, r.y + 4, r.x + 12, r.y + 14, C.wood4).line(r.x + 22, r.y + 4, r.x + 18, r.y + 14, C.wood4);
  },
  'florent.kit': (b, r, s) => {
    b.rect(r.x - 30, r.y + 16, r.w + 60, 4, C.white).rect(r.x - 28, r.y + 20, 3, 10, C.white).rect(r.x + r.w + 26, r.y + 20, 3, 10, C.white);
    b.rect(r.x + 4, r.y + 6, 22, 10, C.yellow).frame(r.x + 4, r.y + 6, 22, 10, C.orange);
    if (!on(s, 'oring_taken')) b.frame(r.x + 8, r.y + 9, 4, 4, C.ink);
    b.frame(r.x + 15, r.y + 9, 4, 4, C.ink);
    b.line(r.x + 34, r.y + 14, r.x + 38, r.y + 2, C.ink).rect(r.x + 34, r.y, 8, 4, C.mustard);
  },
  // The overloaded power strip: console, amp and fairy lights all plugged in.
  'florent.strip': (b, r) => {
    b.rect(r.x + 2, r.y + r.h - 6, r.w - 4, 5, C.white).frame(r.x + 2, r.y + r.h - 6, r.w - 4, 5, C.stone2).set(r.x + 4, r.y + r.h - 4, C.red);
    for (let i = 0; i < 4; i++) b.line(r.x + 7 + i * 4, r.y + r.h - 6, r.x + 4 + i * 6, r.y + 2, [C.ink, C.stone1, C.green3, C.ink][i]);
  },
  'florent.console': (b, r) => b.rect(r.x, r.y, r.w, r.h - 10, C.ink).rect(r.x + 2, r.y + 2, r.w - 4, r.h - 14, C.purple).rect(r.x + 8, r.y + r.h - 8, 12, 6, C.stone1).rect(r.x + 30, r.y + r.h - 8, 10, 6, C.stone2),
  // The parents' room (photo): pale walls with a mauve band behind the bed, the rainbow-striped duvet with mustard
  // pillows, two white cylinder lamps, the white wardrobe, a tall black-framed mirror, and the ensuite shower with
  // its red wall and red/orange checker tiles.
  'parents.bed': (b, r) => {
    b.rect(r.x, r.y + 14, r.w, r.h - 14, C.beech).rect(r.x + 2, r.y + 8, r.w - 4, 8, C.turquoiseSheet);
    const stripes = [C.white, C.red, C.white, C.orange, C.white, C.blue, C.white, C.mint, C.white, C.yellow];
    for (let i = 0; i < r.w - 22; i++) b.vline(r.x + 20 + i, r.y + 6, r.y + 17, stripes[Math.floor(i / 6) % stripes.length]);
    b.rect(r.x + 4, r.y + 2, 8, 6, C.mustard).rect(r.x + 12, r.y + 3, 8, 5, C.mustard);
  },
  'parents.painting': (b, r) => {
    // Crooked frame.
    for (let i = 0; i < r.w - 4; i++) b.vline(r.x + 2 + i, r.y + 2 + Math.floor(i / 8), r.y + r.h - 4 + Math.floor(i / 8), C.gold);
    b.rect(r.x + 5, r.y + 6, r.w - 10, r.h - 12, C.sky).rect(r.x + 8, r.y + 14, r.w - 16, 6, C.green3);
  },
  'parents.safe': (b, r, s) => {
    b.rect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, C.stone1).frame(r.x + 2, r.y + 2, r.w - 4, r.h - 4, C.iron);
    if (on(s, 'safe_open')) b.rect(r.x + 6, r.y + 6, r.w - 12, r.h - 12, C.black);
    else b.ellipse(r.x + r.w / 2, r.y + r.h / 2, 5, 5, C.chrome).rect(r.x + r.w - 9, r.y + 8, 3, 8, C.chrome);
  },
  'parents.wardrobe': (b, r) => {
    b.rect(r.x, r.y, r.w, r.h, C.white).frame(r.x, r.y, r.w, r.h, C.stone3).rect(r.x + 3, r.y + 3, r.w - 6, 30, C.stone4);
    b.rect(r.x + 4, r.y + 22, 8, 10, C.blue).rect(r.x + 13, r.y + 20, 8, 12, C.pink).rect(r.x + 4, r.y + 38, r.w - 8, 10, C.white).frame(r.x + 4, r.y + 38, r.w - 8, 10, C.stone3);
    b.rect(r.x + 5, r.y + 54, r.w - 10, 12, C.wood4);
  },
  'parents.mirror': (b, r, s) => {
    b.rect(r.x + 4, r.y + 2, r.w - 8, r.h - 4, C.ink).rect(r.x + 6, r.y + 4, r.w - 12, r.h - 8, on(s, 'mirror_code') ? C.stone4 : C.glassHi);
    if (on(s, 'mirror_code')) for (let i = 0; i < 4; i++) b.vline(r.x + 9 + i * 5, r.y + 10, r.y + 18, C.white).hline(r.x + 8 + i * 5, r.x + 10 + i * 5, r.y + 10, C.white);
  },
  'parents.sink': (b, r) => sink(b, r, true),
  'parents.shower': (b, r, s) => {
    const tiles = [C.redTile, C.orangeTile, C.white, C.pink];
    for (let y = r.y; y < r.y + r.h; y += 8) for (let x = r.x; x < r.x + r.w; x += 8) b.rect(x, y, Math.min(8, r.x + r.w - x), Math.min(8, r.y + r.h - y), tiles[((x - r.x) / 8 + (y - r.y) / 8) % 4 | 0]);
    b.rect(r.x + 29, r.y + 4, 4, 24, C.ink).rect(r.x + 30, r.y + 5, 2, 22, C.steelDark);
    b.rect(r.x + 19, r.y + 4, 14, 6, C.ink).rect(r.x + 20, r.y + 5, 12, 4, C.steelDark).hline(r.x + 21, r.x + 30, r.y + 9, C.white);
    if (on(s, 'oring_fitted')) b.rect(r.x + 24, r.y + 10, 4, 2, C.ink);
    if (!on(s, 'shower_repaired')) b.set(r.x + 24, r.y + 14, C.water2).set(r.x + 25, r.y + 18, C.water2).set(r.x + 23, r.y + 24, C.water2);
    if (on(s, 'mirror_code')) b.dither(r.x + 2, r.y + 10, r.w - 4, 30, C.white, C.stone4);
    b.rect(r.x, r.y, 8, r.h, C.glass).vline(r.x + 8, r.y, r.y + r.h - 1, C.chrome);
  },
};

// ---------- exits ----------

function paintExit(b: PixelBuffer, id: string, r: Rect, s: GameState) {
  // Unlocked, the front door stays ajar: the warm light of the hall shows through.
  if (id === 'front.toHall') {
    doorway(b, r, C.candle);
    b.rect(r.x, r.y, 6, FLOOR_Y - r.y, C.wine2);
    return;
  }
  if (id === 'hall.toFront') return door(b, r, C.wine2);
  // Both stairs are seen from the front, in a doorway.
  if (id === 'hall.stairs') return frontStairs(b, r, true);
  if (id === 'corridor0.toGarage') return frontStairs(b, r, false);
  if (id === 'garage.toCorridor') return frontStairs(b, r, true);
  if (id === 'landing.toHall') return frontStairs(b, r, false);
  if (id === 'garage.toAttic') return ladder(b, r);
  if (id === 'cellar.toGarage') {
    // The hatch unblocked: open, with the garage light above.
    b.rect(r.x, r.y, r.w, 10, C.candle).frame(r.x, r.y, r.w, 10, C.wood0);
    return ladder(b, { x: r.x, y: r.y + 10, w: r.w, h: FLOOR_Y - r.y - 10 });
  }
  if (id === 'garage.toCellar' || id === 'attic.toGarage') return hatch(b, r, id === 'attic.toGarage');
  if (id === 'attic.toLaundry') return doorway(b, r, C.wine0);
  if (id === 'living.toPool' || id === 'pool.toLiving') return doorway(b, r, C.night1);
  // The ways between the parts of the garden (the middle path, the swing corner): a wicket gate and stepping stones.
  if (id === 'football.toPool' || id === 'pool.toFootball' || id === 'football.toGarden' || id === 'garden.toFootball') return wicket(b, r, id === 'pool.toFootball');
  const outdoor = s.place === 'front' || s.place === 'football' || s.place === 'pool' || s.place === 'garden';
  if (outdoor) {
    // An open gate, or a path to the next part of the garden.
    if (id.endsWith('toFront') || id === 'front.toFootball' || id === 'front.toPool') {
      b.rect(r.x, r.y + 10, 4, r.h - 10, C.wood1).rect(r.x + r.w - 4, r.y + 10, 4, r.h - 10, C.wood1);
      for (let x = r.x + 5; x < r.x + 12; x += 3) b.rect(x, r.y + 18, 2, r.h - 20, C.wood3);
    }
    b.dither(r.x, FLOOR_Y, r.w, 46, C.tile1, C.grass);
    return;
  }
  if (r.x <= 4 || r.x >= 286) return doorway(b, r);
  door(b, r);
}

// An open white wicket gate under a wooden arch, with stepping stones on the grass leading to it, so that the way to
// another part of the garden is seen at once.
function wicket(b: PixelBuffer, r: Rect, leafRight = false) {
  const left = r.x + 2;
  const right = r.x + r.w - 3;
  const cx = (left + right) / 2;
  const half = (right - left) / 2;
  const top = r.y + 14;
  // The posts and the arch.
  b.rect(left, top, 3, FLOOR_Y - top, C.wood1).rect(right - 2, top, 3, FLOOR_Y - top, C.wood1);
  for (let x = left; x <= right; x++) {
    const d = (x - cx) / half;
    b.rect(x, top - 8 + Math.round(6 * d * d), 1, 3, C.wood3);
  }
  // The gate leaf, swung open against a post (the right one where the pool tap stands in front of the left one).
  const l0 = leafRight ? right - 11 : left + 3;
  for (let x = l0 + 1; x < l0 + 8; x += 3) b.rect(x, FLOOR_Y - 22, 2, 20, C.white);
  b.hline(l0, l0 + 8, FLOOR_Y - 18, C.white).hline(l0, l0 + 8, FLOOR_Y - 8, C.white);
  // Stepping stones from the front of the scene to the gate.
  for (let i = 0; i < 4; i++) {
    const sx = Math.round(cx) + (i % 2 === 0 ? -3 : 3);
    const sy = FLOOR_Y + 6 + i * 11;
    b.ellipse(sx, sy, 7, 4, C.stone1).ellipse(sx, sy - 1, 6, 3, C.stone3);
  }
}

// ---------- places ----------

const DOOR_PLATES: Record<string, Color> = {
  'corridor0.officeDoor': C.officeTeal,
  'landing.julienDoor': C.blueTri,
  'landing.theoDoor': C.turquoise,
  'landing.florentDoor': C.emerald,
  'landing.parentsDoor': C.mauve,
};

interface Style {
  bg: (b: PixelBuffer, s: GameState) => void;
  floor: (b: PixelBuffer) => void;
}

const beigeTiles = (b: PixelBuffer) => tileFloor(b, C.beigeTile, C.beigeGrout, 20);
const oakFloor = (b: PixelBuffer) => plankFloor(b, C.laminate, C.laminateDark);

const STYLES: Record<PlaceId, Style> = {
  front: {
    bg: (b) => {
      sky(b);
      renderWall(b, 20, 300, 20);
      for (let y = 0; y < 14; y++) b.hline(20 - y, 299 + y, 14 - y, C.terracotta);
      windowPane(b, { x: 60, y: 28, w: 30, h: 20 }, 'dusk');
      windowPane(b, { x: 230, y: 28, w: 30, h: 20 }, 'dusk');
      b.rect(0, 40, 20, 60, C.hedge).rect(300, 40, 20, 60, C.hedge);
    },
    floor: (b) => tileFloor(b, C.tile1, C.tile0, 16),
  },
  football: {
    bg: (b) => {
      sky(b);
      hedgeLine(b, 60);
      renderWall(b, 270, 320, 30);
    },
    floor: (b) => grass(b),
  },
  garden: {
    bg: (b) => {
      sky(b);
      hedgeLine(b, 64);
      // A washing line with Maman's laundry.
      b.line(10, 30, 120, 34, C.orange);
      for (let i = 0; i < 5; i++) b.rect(20 + i * 20, 32, 10, 12, [C.white, C.pink, C.blue, C.white, C.yellow][i]);
    },
    floor: (b) => grass(b),
  },
  pool: {
    bg: (b) => {
      sky(b);
      hedgeLine(b, 58);
      renderWall(b, 0, 96, 16);
      // The pergola post, a neighbour's pool far away.
      b.rect(126, 6, 6, FLOOR_Y - 6, C.ochre).rect(96, 6, 150, 4, C.ochre);
      b.rect(232, 54, 18, 4, C.water1);
    },
    floor: (b) => tileFloor(b, C.beigeGrout, C.beigeTile, 18),
  },
  hall: {
    bg: (b) => {
      paint(b, C.wallWarm, C.wallWarmDark);
      b.rect(0, 64, SCENE_W, 34, C.wallWarmDark).hline(0, SCENE_W - 1, 64, C.wood1);
    },
    floor: beigeTiles,
  },
  living: {
    bg: (b) => {
      // Near-white on the left, lavender grey on the right; the cross-trainer, the mustard armchair, the beech stool.
      paint(b, C.offWhite, C.stone3, 0, 130);
      paint(b, C.lavender, C.mauve, 130, SCENE_W);
      b.line(8, 60, 30, 98, C.ink).line(30, 60, 8, 98, C.ink).ellipse(19, 88, 10, 6, C.ink).ellipse(19, 88, 8, 4, C.offWhite).vline(28, 50, 62, C.ink);
      b.rect(186, 70, 26, 28, C.mustard).rect(186, 62, 26, 10, C.mustard).rect(182, 70, 5, 20, C.mustard).rect(211, 70, 5, 20, C.mustard).rect(190, 76, 18, 6, C.tealDeep);
      b.rect(234, 30, 40, 3, C.oak).set(240, 27, C.ink).set(241, 26, C.white).set(250, 28, C.red);
      b.ellipse(40, 18, 8, 6, C.yellow).hline(33, 47, 18, C.white);
    },
    floor: beigeTiles,
  },
  music: {
    bg: (b) => {
      // The dining part on the left (blue wall, wooden pendant lamp, rainbow strip), the music part on the right (the
      // dancers painting, the big garden window, the palm, children's drawings).
      paint(b, C.coolWhite, C.stone3);
      b.rect(0, 0, 36, FLOOR_Y - 2, C.dinerBlue);
      b.rect(154, 6, 40, 30, C.wood1).rect(157, 9, 34, 24, C.mustard);
      for (let i = 0; i < 3; i++) b.ellipse(164 + i * 10, 24, 3, 4, C.ink).vline(164 + i * 10, 14, 20, C.ink);
      b.hline(70, 136, 2, C.wood2);
      for (let i = 0; i < 4; i++) b.vline(76 + i * 16, 2, 46, C.ink).ellipse(76 + i * 16, 48, 2, 2, C.candle);
      for (let x = 40; x < 146; x += 6) b.rect(x, 42, 6, 3, [C.red, C.orange, C.yellow, C.green3, C.blue, C.purple][(x / 6) % 6 | 0]);
      windowPane(b, { x: 214, y: 8, w: 56, h: 40 }, 'garden', C.white);
      palm(b, 148, FLOOR_Y);
      b.hline(274, 316, 10, C.stone2);
      for (let i = 0; i < 3; i++) b.rect(276 + i * 13, 11, 10, 10, C.white).set(280 + i * 13, 15, [C.red, C.blue, C.green3][i]);
    },
    floor: beigeTiles,
  },
  kitchen: {
    bg: (b) => {
      // Sky-blue upper wall, white tiled splashback with geometric inserts, oak worktop, window on the right.
      paint(b, C.skyWall, C.blue);
      b.rect(0, 42, SCENE_W, 30, C.white);
      for (let y = 42; y < 72; y += 6) b.hline(0, SCENE_W - 1, y, C.stone4);
      for (let y = 42; y < 72; y += 6) for (let x = (y / 6) % 2 === 0 ? 0 : 6; x < SCENE_W; x += 12) b.vline(x, y, y + 5, C.stone4);
      for (let x = 10; x < SCENE_W; x += 36) for (let j = 0; j < 5; j++) b.hline(x, x + j, 50 + j, [C.steel, C.butcher, C.steelDark][(x / 36) % 3 | 0]);
      b.rect(0, 72, SCENE_W, 4, C.butcher).rect(0, 76, SCENE_W, FLOOR_Y - 78, C.white);
      for (let x = 6; x < SCENE_W; x += 22) b.hline(x + 4, x + 14, 82, C.steel);
      b.rect(30, 8, 60, 30, C.white).frame(30, 8, 60, 30, C.stone3).vline(60, 8, 37, C.stone3);
      b.rect(46, 38, 20, 12, C.steel);
      windowPane(b, { x: 270, y: 10, w: 40, h: 28 }, 'garden', C.white);
      b.ellipse(250, 70, 6, 2, C.yellow).ellipse(252, 68, 5, 2, C.yellow);
    },
    floor: (b) => tileFloor(b, C.beigeTile, C.beigeGrout, 22),
  },
  corridor0: { bg: (b) => paint(b, C.wallWarm, C.wallWarmDark), floor: beigeTiles },
  wc0: {
    bg: (b) => {
      paint(b, C.tile2, C.tile1);
      for (let y = 50; y < FLOOR_Y - 2; y += 8) b.hline(0, SCENE_W - 1, y, C.tile1);
    },
    floor: (b) => tileFloor(b, C.tile2, C.tile1, 14),
  },
  wc1: { bg: (b) => paint(b, C.sky, C.blue), floor: (b) => tileFloor(b, C.tile2, C.tile1, 14) },
  office: {
    bg: (b) => {
      // Teal walls with a mustard section on the left and its white pegboard.
      paint(b, C.officeTeal, C.officeTealDark);
      paint(b, C.mustard, C.goldDark, 0, 46);
      b.rect(6, 14, 34, 26, C.white);
      for (let y = 16; y < 40; y += 4) for (let x = 8; x < 40; x += 4) b.set(x, y, C.stone3);
      b.rect(10, 28, 8, 5, C.red).rect(24, 24, 10, 3, C.wood3);
      // The second black chair on the right.
      b.rect(286, 60, 14, 22, C.ink).rect(284, 82, 18, 4, C.ink).vline(293, 86, 96, C.ink);
    },
    floor: (b) => plankFloor(b, C.paleBlue, C.stone3),
  },
  utility: {
    bg: (b) => {
      // Pale blue walls, the window with pink blinds, the drying rack with jeans, the ironing board, a fridge.
      paint(b, C.paleBlue, C.iceBlue);
      b.rect(84, 12, 50, 34, C.iceBlue);
      for (let y = 14; y < 44; y += 3) b.hline(86, 131, y, C.pink);
      for (let x = 16; x < 48; x += 6) b.vline(x, 40, 96, C.stone3);
      b.hline(14, 50, 40, C.stone3).rect(20, 42, 10, 26, C.blueDark).rect(34, 42, 8, 18, C.stone2);
      b.line(96, 70, 136, 66, C.iceBlue).rect(96, 68, 40, 3, C.iceBlue).line(104, 71, 128, 98, C.stone2).line(128, 71, 104, 98, C.stone2);
      b.rect(186, 10, 28, 88, C.white).frame(186, 10, 28, 88, C.stone3).rect(190, 30, 14, 12, C.paper);
    },
    floor: beigeTiles,
  },
  garage: { bg: (b) => bricks(b, 0, 0, SCENE_W, FLOOR_Y, C.stone2, C.stone1), floor: (b) => b.dither(0, FLOOR_Y, SCENE_W, ROOM_H - FLOOR_Y, C.stone2, C.stone3) },
  cellar: {
    bg: (b) => bricks(b, 0, 0, SCENE_W, FLOOR_Y, C.wine0, C.black),
    floor: (b) => tileFloor(b, C.stone1, C.stone0, 18),
  },
  attic: {
    bg: (b) => {
      b.rect(0, 0, SCENE_W, FLOOR_Y, C.wood3);
      for (let x = 0; x < SCENE_W; x += 16) b.vline(x, 0, FLOOR_Y - 1, C.wood2);
      for (let y = 0; y < 30; y++) {
        b.hline(0, 40 - y, y, C.wood0);
        b.hline(280 + y, SCENE_W - 1, y, C.wood0);
      }
      b.rect(0, FLOOR_Y - 2, SCENE_W, 2, C.wood1);
      // More junk: a rolled carpet, an old bicycle wheel, a birdcage hanging from a beam.
      b.rect(100, 90, 40, 8, C.wine1).ellipse(140, 94, 4, 4, C.wine2);
      b.ellipse(226, 26, 8, 8, C.ink).ellipse(226, 26, 6, 6, C.wood3);
      b.vline(126, 0, 8, C.ink).ellipse(126, 14, 6, 6, C.brass).ellipse(126, 14, 4, 4, C.wood3);
    },
    floor: (b) => plankFloor(b, C.wood3, C.wood1),
  },
  laundry: { bg: (b) => paint(b, C.wallPink, C.wallPinkDark), floor: (b) => tileFloor(b, C.tile2, C.tile1, 14) },
  landing: { bg: (b) => paint(b, C.wallWarm, C.wallWarmDark), floor: oakFloor },
  julien: {
    bg: (b) => {
      // Grey-white wall, the big blue triangle behind the bed, the window with cream curtains, a star mobile.
      paint(b, C.greyWhite, C.stone3);
      for (let y = 0; y < 60; y++) b.hline(276 - y, 276 + Math.floor(y * 0.6), 38 + y, C.blueTri);
      windowPane(b, { x: 120, y: 12, w: 50, h: 36 }, 'dusk', C.white);
      b.rect(112, 10, 8, 50, C.cream).rect(170, 10, 8, 50, C.cream);
      garland(b, 200, 300, 24, [C.navy, C.stone3, C.yellow, C.white, C.sky]);
      b.vline(40, 0, 10, C.stone3).ellipse(40, 14, 4, 4, C.yellow).ellipse(36, 20, 3, 3, C.white);
    },
    floor: oakFloor,
  },
  bathroom: {
    bg: (b) => {
      // Square glossy tiles in a random mix of colours.
      const tiles = [C.white, C.lime, C.redTile, C.royal, C.tileYellow, C.turquoise, C.emerald, C.white, C.wine2];
      for (let y = 0; y < FLOOR_Y; y += 16) for (let x = 0; x < SCENE_W; x += 16) b.rect(x, y, 16, 16, tiles[(x * 7 + y * 13 + (x * y) % 5) % tiles.length]).hline(x, x + 15, y, C.white).vline(x, y, y + 15, C.white);
      windowPane(b, { x: 230, y: 6, w: 24, h: 16 }, 'dusk', C.white);
    },
    floor: (b) => tileFloor(b, C.white, C.stone4, 16),
  },
  theo: {
    bg: (b) => {
      // Bright turquoise walls, the window with mint and coral curtains, the white cube bookcase, the pine bed.
      paint(b, C.turquoise, C.turquoiseDark);
      windowPane(b, { x: 130, y: 10, w: 46, h: 34 }, 'dusk', C.white);
      b.rect(122, 8, 8, 54, C.cream).rect(176, 8, 8, 54, C.cream).rect(122, 28, 8, 8, C.mint).rect(176, 28, 8, 8, C.mint);
      for (let y = 40; y < 62; y += 4) b.hline(122, 129, y, C.coral).hline(176, 183, y, C.coral);
      cubes(b, 8, 46, 2, 4, 3);
      garland(b, 196, 260, 20, [C.red, C.yellow, C.blue, C.green3]);
    },
    floor: oakFloor,
  },
  florent: {
    bg: (b) => {
      // White upper wall, emerald lower part, the window with starred curtains, the egg chair, the white desk.
      paint(b, C.white, C.stone3);
      b.rect(0, 58, SCENE_W, FLOOR_Y - 60, C.emerald).hline(0, SCENE_W - 1, 58, C.white);
      windowPane(b, { x: 182, y: 10, w: 44, h: 34 }, 'garden', C.white);
      for (let i = 0; i < 6; i++) b.set(176 + (i % 2) * 54, 14 + i * 6, C.gold).set(178 + (i % 2) * 54, 17 + i * 6, C.red);
      garland(b, 100, 168, 52, [C.red, C.yellow, C.mint, C.lime]);
      b.ellipse(290, 82, 12, 14, C.white).ellipse(290, 84, 8, 10, C.stone4).vline(290, 96, 99, C.chrome);
      b.rect(270, 16, 30, 22, C.white);
      for (let y = 18; y < 38; y += 4) for (let x = 272; x < 300; x += 4) b.set(x, y, C.stone3);
    },
    floor: oakFloor,
  },
  parents: {
    bg: (b) => {
      // Pale grey walls, the dusty mauve band behind the bed, the plum curtain, the two cylinder lamps; the ensuite
      // on the right with its bright red wall.
      paint(b, C.greyWhite, C.stone3);
      b.rect(30, 40, 112, FLOOR_Y - 42, C.mauve);
      b.rect(0, 8, 14, 80, C.plum1).rect(14, 10, 10, 50, C.sky1);
      for (const x of [34, 128]) b.rect(x, 56, 8, 16, C.white).frame(x, 56, 8, 16, C.stone3).rect(x + 3, 72, 2, 6, C.stone3);
      b.rect(262, 0, 58, FLOOR_Y - 2, C.redWall);
    },
    floor: oakFloor,
  },
};

// The hotspots that have a prop painter (doors of the guarded rooms are painted as doors).
export const PAINTED_HOTSPOTS: readonly string[] = Object.keys(PROPS);

// Flags that change how a place looks: its image is repainted only when one of them changes.
export const VISUAL_FLAGS: Record<PlaceId, (keyof Flags)[]> = {
  front: ['key_taken', 'door_unlocked', 'gates_open'],
  football: ['extension_taken', 'gates_open'],
  pool: ['ball_freed', 'cover_open', 'pool_drained', 'plug_fixed', 'thinner_taken', 'bay_open', 'gates_open'],
  garden: ['delivered', 'cat_fed', 'parcel_taken', 'keyring_taken'],
  hall: ['gatekey_taken', 'fuse_taken'],
  living: ['booklet_taken', 'queen_placed', 'bay_open'],
  music: ['sticks_taken'],
  kitchen: ['milk_taken', 'sardines_taken', 'dough_mixed', 'fridge_open'],
  corridor0: [],
  wc0: ['wc_wet'],
  office: ['pliers_taken', 'drawer_open'],
  utility: ['detergent_taken', 'machine_running', 'power_on', 'chestnut_taken', 'riceflour_taken'],
  garage: ['pole_taken', 'wrench_taken', 'power_on', 'bike_fixed', 'fuse_in'],
  cellar: ['bar_taken', 'hatch_open', 'bottles_done', 'stone_left', 'stone_right'],
  attic: ['door_revealed', 'secret_open', 'lab_code', 'trunk_open'],
  laundry: [],
  landing: [],
  wc1: [],
  julien: ['queen_taken'],
  bathroom: ['hairdryer_taken'],
  theo: ['cube_solved'],
  florent: ['oring_taken'],
  parents: ['safe_found', 'safe_open', 'mirror_code', 'shower_repaired', 'oring_fitted'],
};

// Julien's ball lies on the grass of the football corner while he plays: part of the drawing too.
function stateKey(s: GameState): string {
  if (s.place === 'garden') return `${s.chars.mom}${s.flags.dad_wary ? '-wary' : ''}`;
  return s.place === 'football' ? s.chars.julien : '';
}

export function roomKey(s: GameState): string {
  return [s.place, ...VISUAL_FLAGS[s.place].map((f) => (s.flags[f] ? 1 : 0)), stateKey(s)].join(':');
}

export function paintRoom(s: GameState): PixelBuffer {
  const b = new PixelBuffer(SCENE_W, SCENE_H);
  const style = STYLES[s.place];
  style.bg(b, s);
  style.floor(b);
  // Once the Japanese toilet has sprayed, its floor stays wet.
  if (s.place === 'wc0' && on(s, 'wc_wet')) wetFloor(b);
  for (const e of EXITS) if (e.place === s.place && (!e.visible || e.visible(s))) paintExit(b, e.id, e.rect, s);
  for (const h of HOTSPOTS) {
    if (h.place !== s.place || (h.visible && !h.visible(s))) continue;
    if (h.door) door(b, h.rect, C.white, DOOR_PLATES[h.id]);
    else PROPS[h.id]?.(b, h.rect, s);
  }
  band(b);
  return b;
}

// A stone sticking out of the cellar wall, pushed in (with the iron bar across it) once wedged.
function stone(b: PixelBuffer, r: Rect, wedged: boolean) {
  b.ellipse(r.x + 11, r.y + 11, 9, 8, C.stone1).ellipse(r.x + 11, r.y + 10, 7, 6, wedged ? C.stone0 : C.stone3);
  if (wedged) b.line(r.x + 2, r.y + 18, r.x + 20, r.y + 4, C.iron).line(r.x + 3, r.y + 18, r.x + 21, r.y + 4, C.ironHi);
}

function wetFloor(b: PixelBuffer) {
  for (let i = 0; i < 9; i++) b.ellipse(80 + i * 22, 112 + ((i * 7) % 24), 12 - (i % 3) * 2, 3, i % 2 === 0 ? C.water2 : C.glassHi);
}

// The house at dusk (home screen, intro and ending backdrop).
export function paintHouse(): PixelBuffer {
  const b = new PixelBuffer(SCENE_W, SCENE_H);
  b.gradient(0, 0, SCENE_W, 130, [C.sky0, C.sky1, C.sky2, C.sky3]);
  b.ellipse(266, 104, 18, 18, C.sun);
  for (let i = 0; i < 40; i++) b.set((i * 97 + 13) % SCENE_W, (i * 41 + 7) % 60, C.star);
  b.rect(0, 120, SCENE_W, 60, C.green1);
  for (let x = 0; x < SCENE_W; x += 10) b.ellipse(x + 5, 122, 7, 4, C.green1);
  // House: two floors of ochre render, a terracotta roof, the garage on the right.
  b.rect(80, 62, 140, 74, C.ochre);
  for (let y = 0; y < 34; y++) b.hline(72 + y, 228 - y, 62 - y, C.terracotta);
  b.rect(190, 18, 10, 20, C.wine0);
  b.rect(220, 92, 50, 44, C.ochre).rect(216, 88, 58, 5, C.terracotta);
  b.rect(228, 104, 34, 32, C.stone2);
  for (let y = 106; y < 136; y += 4) b.hline(228, 261, y, C.stone1);
  const lit = [true, false, true, true, false, true];
  for (let i = 0; i < 6; i++) {
    const x = 92 + (i % 3) * 44;
    const y = i < 3 ? 72 : 100;
    b.rect(x, y, 18, 14, lit[i] ? C.candle : C.night1).frame(x - 1, y - 1, 20, 16, C.white).vline(x + 9, y, y + 13, C.white);
  }
  b.rect(142, 110, 16, 26, C.wine2).rect(154, 122, 2, 2, C.gold);
  b.rect(136, 136, 28, 4, C.stone3);
  for (let y = 140; y < SCENE_H; y++) b.hline(140 - (y - 140), 160 + (y - 140), y, C.tile1);
  // Hedge and the pool on the left.
  for (let x = 0; x < 72; x += 10) b.ellipse(x + 5, 126, 8, 8, C.hedge);
  b.ellipse(40, 150, 30, 8, C.poolCover);
  return b;
}
