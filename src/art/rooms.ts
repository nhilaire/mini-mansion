// The 24 places (provisional pixel art) and the house at dusk, painted in code on a 320x180 buffer (place 320x150,
// inventory band below). Every prop is drawn inside the rect of its hotspot and every exit from its own rect
// (src/game/world.ts), so art and touch areas cannot drift apart. Later versions will replace these scenes with
// pixel art converted from the author's room photos.
import { GameState, PlaceId, Rect } from '../game/types';
import { EXITS, HOTSPOTS, MENU_BUTTON, NOTEBOOK_BUTTON, ROOM_H, SCENE_H, SCENE_W, slotRect, SLOTS } from '../game/world';
import { C } from './palette';
import { Color, PixelBuffer } from './pixels';

const FLOOR_Y = 100;
type Flags = GameState['flags'];
const on = (s: GameState, f: keyof Flags) => s.flags[f] === true;

// ---------- walls, floors, sky ----------

type Wall = { base: Color; dark: Color; motif?: Color; panel?: boolean };
type Floor = 'planks' | 'tiles' | 'checker' | 'carpet' | 'concrete' | 'flagstones' | 'grass' | 'paving';

function wall(b: PixelBuffer, w: Wall) {
  b.rect(0, 0, SCENE_W, FLOOR_Y, w.base);
  if (w.motif !== undefined) {
    for (let y = 8; y < FLOOR_Y - 24; y += 12) {
      for (let x = (y / 12) % 2 === 0 ? 6 : 12; x < SCENE_W; x += 12) b.set(x, y, w.motif).set(x - 1, y + 1, w.motif).set(x + 1, y + 1, w.motif).set(x, y + 2, w.motif);
    }
  }
  if (w.panel) {
    b.rect(0, FLOOR_Y - 22, SCENE_W, 22, w.dark).hline(0, SCENE_W - 1, FLOOR_Y - 22, C.wood1);
    for (let x = 8; x < SCENE_W - 4; x += 20) b.frame(x, FLOOR_Y - 18, 14, 14, w.base);
  }
  b.hline(0, SCENE_W - 1, FLOOR_Y - 2, C.wood1).hline(0, SCENE_W - 1, FLOOR_Y - 1, C.wood0);
}

function floor(b: PixelBuffer, kind: Floor) {
  const y0 = FLOOR_Y;
  const h = ROOM_H - y0;
  switch (kind) {
    case 'planks':
      for (let y = y0; y < ROOM_H; y++) {
        b.hline(0, SCENE_W - 1, y, Math.floor((y - y0) / 6) % 2 === 0 ? C.wood3 : C.wood4);
        if ((y - y0) % 6 === 0) b.hline(0, SCENE_W - 1, y, C.wood2);
      }
      for (let y = y0; y < ROOM_H; y += 6) for (let x = ((y / 6) % 3) * 23; x < SCENE_W; x += 70) b.vline(x, y, Math.min(ROOM_H - 1, y + 5), C.wood2);
      break;
    case 'tiles':
      b.rect(0, y0, SCENE_W, h, C.tile1);
      for (let y = y0; y < ROOM_H; y += 10) b.hline(0, SCENE_W - 1, y, C.tile0);
      for (let x = 0; x < SCENE_W; x += 16) b.vline(x, y0, ROOM_H - 1, C.tile0);
      break;
    case 'checker':
      for (let y = y0; y < ROOM_H; y++) for (let x = 0; x < SCENE_W; x++) b.set(x, y, (Math.floor(x / 16) + Math.floor((y - y0) / 8)) % 2 === 0 ? C.tile2 : C.stone1);
      break;
    case 'carpet':
      b.dither(0, y0, SCENE_W, h, C.wine1, C.wine0);
      b.frame(10, y0 + 6, SCENE_W - 20, h - 10, C.gold);
      break;
    case 'concrete':
      b.dither(0, y0, SCENE_W, h, C.stone2, C.stone3);
      break;
    case 'flagstones':
      b.rect(0, y0, SCENE_W, h, C.stone1);
      for (let y = y0; y < ROOM_H; y += 9) {
        b.hline(0, SCENE_W - 1, y, C.stone0);
        for (let x = (Math.floor((y - y0) / 9) % 2) * 14; x < SCENE_W; x += 28) b.vline(x, y, Math.min(ROOM_H - 1, y + 8), C.stone0);
      }
      break;
    case 'grass':
      b.dither(0, y0, SCENE_W, h, C.grass, C.grassHi);
      for (let i = 0; i < 60; i++) b.set((i * 53 + 7) % SCENE_W, y0 + ((i * 29) % h), C.green2);
      break;
    case 'paving':
      b.rect(0, y0, SCENE_W, h, C.tile1);
      for (let y = y0; y < ROOM_H; y += 8) {
        b.hline(0, SCENE_W - 1, y, C.tile0);
        for (let x = (Math.floor((y - y0) / 8) % 2) * 10; x < SCENE_W; x += 20) b.vline(x, y, Math.min(ROOM_H - 1, y + 7), C.tile0);
      }
      break;
  }
}

function sky(b: PixelBuffer, bottom = FLOOR_Y) {
  b.gradient(0, 0, SCENE_W, bottom, [C.sky0, C.sky1, C.sky2, C.sky3]);
  for (let i = 0; i < 14; i++) b.set((i * 97 + 13) % SCENE_W, (i * 17 + 3) % 30, C.star);
}

function hedgeLine(b: PixelBuffer, y = 66) {
  for (let x = 0; x < SCENE_W; x += 12) b.ellipse(x + 6, y, 9, 8, C.green2);
  b.rect(0, y, SCENE_W, FLOOR_Y - y, C.green2);
  for (let i = 0; i < 40; i++) b.set((i * 37) % SCENE_W, y + ((i * 13) % (FLOOR_Y - y)), C.green3);
}

function bricks(b: PixelBuffer, x0: number, y0: number, w: number, h: number, a: Color, line: Color) {
  b.rect(x0, y0, w, h, a);
  for (let y = y0; y < y0 + h; y += 6) {
    b.hline(x0, x0 + w - 1, y, line);
    for (let x = x0 + (Math.floor((y - y0) / 6) % 2) * 6; x < x0 + w; x += 12) b.vline(x, y, Math.min(y0 + h - 1, y + 5), line);
  }
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

function frameRect(b: PixelBuffer, r: Rect, c: Color) {
  b.frame(r.x, r.y, r.w, r.h, c);
}

function door(b: PixelBuffer, r: Rect, wood: Color = C.wood3, plate?: Color) {
  b.rect(r.x - 2, r.y - 2, r.w + 4, r.h + 2, C.wood0);
  b.rect(r.x, r.y, r.w, r.h, wood);
  b.frame(r.x + 3, r.y + 4, r.w - 6, Math.floor(r.h / 2) - 6, C.wood1);
  b.frame(r.x + 3, r.y + Math.floor(r.h / 2) + 2, r.w - 6, Math.floor(r.h / 2) - 6, C.wood1);
  b.rect(r.x + r.w - 6, r.y + Math.floor(r.h / 2), 2, 2, C.gold);
  if (plate !== undefined) b.rect(r.x + 6, r.y + 8, r.w - 12, 5, plate).frame(r.x + 6, r.y + 8, r.w - 12, 5, C.wood0);
}

function doorway(b: PixelBuffer, r: Rect, inside: Color = C.wood0) {
  b.rect(r.x, r.y, r.w, FLOOR_Y - r.y, inside);
  b.frame(r.x - 1, r.y - 1, r.w + 2, FLOOR_Y - r.y + 1, C.wood1);
  b.dither(r.x, r.y + FLOOR_Y - r.y - 8, r.w, 8, inside, C.wood1);
}

function windowPane(b: PixelBuffer, r: Rect, view: 'dusk' | 'garden' | 'night' = 'dusk') {
  b.rect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, C.wood1);
  if (view === 'night') b.gradient(r.x, r.y, r.w, r.h, [C.night0, C.night1]);
  else b.gradient(r.x, r.y, r.w, r.h, [C.sky1, C.sky2, C.sky3]);
  if (view === 'garden') b.rect(r.x, r.y + Math.floor(r.h * 0.65), r.w, Math.ceil(r.h * 0.35), C.green2);
  b.vline(r.x + Math.floor(r.w / 2), r.y, r.y + r.h - 1, C.wood1).hline(r.x, r.x + r.w - 1, r.y + Math.floor(r.h / 2), C.wood1);
}

function stairs(b: PixelBuffer, r: Rect, up: boolean) {
  const steps = 7;
  for (let i = 0; i < steps; i++) {
    const h = Math.floor((r.h / steps) * (up ? i + 1 : steps - i));
    const x = r.x + Math.floor((r.w / steps) * i);
    b.rect(x, r.y + r.h - h, Math.ceil(r.w / steps), h, i % 2 === 0 ? C.wood3 : C.wood4).hline(x, x + Math.ceil(r.w / steps) - 1, r.y + r.h - h, C.wood5);
  }
  b.line(r.x, r.y + (up ? r.h - 4 : 4), r.x + r.w - 1, r.y + (up ? 4 : r.h - 4), C.wood1);
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

function table(b: PixelBuffer, r: Rect, top: Color = C.wood3) {
  b.rect(r.x, r.y + 2, r.w, 4, top).hline(r.x, r.x + r.w - 1, r.y + 2, C.wood5);
  b.rect(r.x + 2, r.y + 6, 3, r.h - 6, C.wood1).rect(r.x + r.w - 5, r.y + 6, 3, r.h - 6, C.wood1);
}

function shelfBox(b: PixelBuffer, r: Rect, seed: number) {
  b.rect(r.x, r.y, r.w, r.h, C.wood2).frame(r.x, r.y, r.w, r.h, C.wood1);
  const colors = [C.red, C.green3, C.blue, C.gold, C.wine2, C.teal2, C.purple, C.orange];
  for (let y = r.y + 4; y < r.y + r.h - 4; y += 12) {
    b.hline(r.x + 1, r.x + r.w - 2, y + 9, C.wood1);
    let x = r.x + 2;
    let i = seed + y;
    while (x < r.x + r.w - 4) {
      const w = 2 + (i % 3);
      const h = 6 + (i % 3);
      b.rect(x, y + 9 - h, w, h, colors[i % colors.length]);
      x += w + (i % 4 === 0 ? 1 : 0);
      i += 5;
    }
  }
}

function pot(b: PixelBuffer, x: number, y: number, leaf: Color) {
  b.rect(x - 4, y - 6, 9, 6, C.orange).hline(x - 5, x + 5, y - 6, C.wood3);
  b.ellipse(x, y - 13, 6, 7, leaf);
}

function textLines(b: PixelBuffer, r: Rect, ink: Color, step = 3) {
  for (let y = r.y + 3; y < r.y + r.h - 2; y += step) b.hline(r.x + 3, r.x + r.w - 4 - ((y * 7) % 5), y, ink);
}

// ---------- props, one per hotspot (drawn inside its rect) ----------

type Prop = (b: PixelBuffer, r: Rect, s: GameState) => void;

const PROPS: Record<string, Prop> = {
  'front.door': (b, r) => door(b, r, C.wine2),
  'front.doormat': (b, r, s) => {
    b.rect(r.x, r.y + 8, r.w, 10, C.mud).frame(r.x, r.y + 8, r.w, 10, C.wood1);
    b.hline(r.x + 6, r.x + r.w - 7, r.y + 13, C.wood5);
    if (!on(s, 'key_taken')) b.rect(r.x + 14, r.y + 10, 8, 3, C.wood2); // the bulge
  },
  'front.bell': (b, r) => b.rect(r.x + 6, r.y + 5, 10, 12, C.brass).frame(r.x + 6, r.y + 5, 10, 12, C.goldDark).rect(r.x + 9, r.y + 9, 4, 4, C.white),
  'front.hedge': (b, r) => {
    for (let x = r.x; x < r.x + r.w; x += 10) b.ellipse(x + 5, r.y + 12, 8, 10, C.green2);
    b.rect(r.x, r.y + 12, r.w, r.h - 12, C.green2);
    for (let i = 0; i < 20; i++) b.set(r.x + ((i * 13) % r.w), r.y + 8 + ((i * 7) % (r.h - 8)), C.green3);
  },
  'front.mailbox': (b, r) => b.rect(r.x + 9, r.y + 18, 4, r.h - 18, C.wood1).rect(r.x + 2, r.y + 4, 18, 14, C.yellow).frame(r.x + 2, r.y + 4, 18, 14, C.goldDark).hline(r.x + 6, r.x + 15, r.y + 10, C.ink),
  'football.goal': (b, r) => {
    b.frame(r.x, r.y, r.w, r.h - 2, C.white).frame(r.x + 1, r.y + 1, r.w - 2, r.h - 4, C.white);
    for (let x = r.x + 4; x < r.x + r.w - 2; x += 5) b.vline(x, r.y + 2, r.y + r.h - 4, C.stone3);
    for (let y = r.y + 4; y < r.y + r.h - 4; y += 5) b.hline(r.x + 2, r.x + r.w - 3, y, C.stone3);
  },
  'football.bench': (b, r) => b.rect(r.x, r.y + 10, r.w, 5, C.wood3).rect(r.x + 3, r.y + 15, 3, r.h - 15, C.wood1).rect(r.x + r.w - 6, r.y + 15, 3, r.h - 15, C.wood1),
  'pool.bay': (b, r) => windowPane(b, r, 'night'),
  'pool.cover': (b, r, s) => {
    const open = on(s, 'cover_open');
    const drained = on(s, 'pool_drained');
    b.rect(r.x - 4, r.y - 4, r.w + 8, r.h + 6, C.tile2).frame(r.x - 4, r.y - 4, r.w + 8, r.h + 6, C.tile0);
    if (!open) {
      b.rect(r.x, r.y, r.w, r.h, C.blue);
      for (let x = r.x + 4; x < r.x + r.w; x += 6) b.vline(x, r.y, r.y + r.h - 1, C.blueDark);
    } else if (drained) {
      b.rect(r.x, r.y, r.w, r.h, C.sky).dither(r.x, r.y + r.h - 8, r.w, 8, C.sky, C.tile1);
      b.vline(r.x + r.w - 6, r.y, r.y + r.h - 1, C.chrome).vline(r.x + r.w - 3, r.y, r.y + r.h - 1, C.chrome);
    } else {
      b.gradient(r.x, r.y, r.w, r.h, [C.water2, C.water1, C.water0]);
      for (let i = 0; i < 8; i++) b.hline(r.x + ((i * 23) % (r.w - 10)), r.x + ((i * 23) % (r.w - 10)) + 6, r.y + 4 + ((i * 9) % (r.h - 8)), C.water2);
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
  'garden.flowers': (b, r) => {
    b.rect(r.x, r.y + 18, r.w, r.h - 18, C.mud);
    for (let i = 0; i < 12; i++) {
      const x = r.x + 4 + i * 6;
      b.vline(x, r.y + 8, r.y + 20, C.green3).ellipse(x, r.y + 7, 2, 2, [C.rose, C.yellow, C.pink, C.purple][i % 4]);
    }
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
  'hall.coats': (b, r) => {
    b.rect(r.x + 13, r.y, 4, r.h, C.wood1).hline(r.x + 4, r.x + 26, r.y + 4, C.wood1);
    b.rect(r.x + 2, r.y + 6, 10, 22, C.blue).rect(r.x + 18, r.y + 6, 10, 18, C.red).rect(r.x + 9, r.y + 2, 12, 5, C.orange);
  },
  'hall.shoes': (b, r) => {
    for (let i = 0; i < 5; i++) b.rect(r.x + 2 + i * 6, r.y + 12 - (i % 2) * 3, 5, 3, [C.white, C.ink, C.red, C.blue, C.green3][i]);
  },
  'hall.mirror': (b, r) => b.ellipse(r.x + 12, r.y + 16, 10, 15, C.gold).ellipse(r.x + 12, r.y + 16, 8, 13, C.glassHi).line(r.x + 7, r.y + 8, r.x + 12, r.y + 4, C.white),
  'living.bookshelf': (b, r, s) => {
    shelfBox(b, r, 3);
    if (!on(s, 'booklet_taken')) b.rect(r.x + 14, r.y + 22, 6, 8, C.yellow).set(r.x + 16, r.y + 25, C.red).set(r.x + 17, r.y + 26, C.blue);
  },
  'living.sofa': (b, r) => b.rect(r.x - 30, r.y + 8, r.w + 30, r.h - 8, C.green2).rect(r.x - 30, r.y + 2, r.w + 30, 8, C.green3).rect(r.x - 32, r.y + 6, 4, r.h - 6, C.green1),
  'living.bay': (b, r, s) => (on(s, 'bay_open') ? doorway(b, r, C.night1) : windowPane(b, r, 'night')),
  'living.chess': (b, r, s) => {
    table(b, { x: r.x + 2, y: r.y + 8, w: r.w - 4, h: r.h - 8 }, C.wood2);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) b.rect(r.x + 8 + i * 5, r.y + 4 + j * 3, 5, 3, (i + j) % 2 === 0 ? C.white : C.ink);
    b.set(r.x + 10, r.y + 2, C.white).set(r.x + 22, r.y + 2, C.ink);
    if (on(s, 'queen_placed')) b.rect(r.x + 15, r.y, 2, 4, C.white);
  },
  'living.tv': (b, r) => b.rect(r.x, r.y, r.w, r.h - 6, C.ink).rect(r.x + 2, r.y + 2, r.w - 4, r.h - 10, C.stone1).rect(r.x + 10, r.y + r.h - 6, 8, 6, C.stone0),
  'music.piano': (b, r) => {
    b.rect(r.x, r.y + 4, r.w, r.h - 4, C.ink).rect(r.x + 2, r.y + 20, r.w - 4, 8, C.white);
    for (let x = r.x + 4; x < r.x + r.w - 2; x += 4) b.vline(x, r.y + 20, r.y + 27, C.stone2).rect(x + 2, r.y + 20, 2, 5, C.ink);
  },
  'music.guitar': (b, r) => b.ellipse(r.x + 11, r.y + 38, 8, 10, C.red).rect(r.x + 10, r.y + 4, 3, 28, C.wood1).rect(r.x + 8, r.y, 7, 5, C.ink).ellipse(r.x + 11, r.y + 38, 3, 3, C.ink),
  'music.drums': (b, r) => {
    b.ellipse(r.x + 25, r.y + 28, 12, 10, C.red).ellipse(r.x + 25, r.y + 26, 10, 3, C.white);
    b.ellipse(r.x + 9, r.y + 18, 7, 4, C.red).ellipse(r.x + 41, r.y + 18, 7, 4, C.red).ellipse(r.x + 44, r.y + 6, 7, 2, C.gold).vline(r.x + 44, r.y + 7, r.y + 30, C.chrome);
  },
  'music.xylo': (b, r) => {
    for (let i = 0; i < 7; i++) b.rect(r.x + 3 + i * 5, r.y + 6 + i, 4, 14 - i, [C.red, C.orange, C.yellow, C.green3, C.blue, C.purple, C.pink][i]);
  },
  'dining.table': (b, r) => {
    table(b, r, C.wood3);
    b.rect(r.x + 10, r.y - 6, 8, 8, C.wood2).rect(r.x + r.w - 18, r.y - 6, 8, 8, C.wood2);
  },
  'dining.basket': (b, r, s) => {
    b.ellipse(r.x + 13, r.y + 14, 11, 5, C.wood4).ellipse(r.x + 13, r.y + 12, 9, 3, C.wood2);
    if (!on(s, 'sticks_taken')) b.line(r.x + 6, r.y + 4, r.x + 18, r.y + 12, C.wood5).line(r.x + 8, r.y + 3, r.x + 20, r.y + 11, C.wood5);
  },
  'dining.sideboard': (b, r) => b.rect(r.x, r.y + 16, r.w, r.h - 16, C.wood2).frame(r.x, r.y + 16, r.w, r.h - 16, C.wood1).rect(r.x + 4, r.y + 4, 8, 12, C.white).rect(r.x + 16, r.y + 6, 8, 10, C.white).rect(r.x + 28, r.y + 2, 8, 14, C.white),
  'kitchen.oven': (b, r) => b.rect(r.x, r.y, r.w, r.h, C.chrome).frame(r.x, r.y, r.w, r.h, C.stone1).rect(r.x + 5, r.y + 16, r.w - 10, r.h - 22, C.ink).rect(r.x + 8, r.y + 19, r.w - 16, r.h - 28, C.orange),
  'kitchen.fridge': (b, r) => b.rect(r.x, r.y, r.w, r.h, C.white).frame(r.x, r.y, r.w, r.h, C.stone3).hline(r.x, r.x + r.w - 1, r.y + 26, C.stone3).rect(r.x + r.w - 6, r.y + 10, 2, 10, C.stone2).rect(r.x + 6, r.y + 34, 6, 6, C.yellow),
  'kitchen.bowl': (b, r) => {
    b.rect(r.x - 30, r.y + 10, r.w + 60, 6, C.tile2).rect(r.x - 30, r.y + 16, r.w + 60, r.h - 16, C.wood2);
    b.ellipse(r.x + 13, r.y + 7, 11, 5, C.chrome).ellipse(r.x + 13, r.y + 5, 9, 2, C.choc);
  },
  'corridor0.photos': (b, r) => {
    for (let i = 0; i < 2; i++) b.rect(r.x + 2 + i * 10, r.y + 4 + i * 4, 9, 11, C.gold).rect(r.x + 3 + i * 10, r.y + 5 + i * 4, 7, 9, C.sky).rect(r.x + 5 + i * 10, r.y + 9 + i * 4, 3, 4, C.choc);
  },
  'corridor0.plant': (b, r) => pot(b, r.x + 11, r.y + r.h, C.leaf),
  'wc0.toilet': (b, r) => toilet(b, r),
  'wc1.toilet': (b, r) => toilet(b, r),
  'wc0.magazine': (b, r) => b.rect(r.x + 3, r.y + 6, 18, 14, C.pink).rect(r.x + 5, r.y + 8, 14, 4, C.choc).hline(r.x + 5, r.x + 18, r.y + 15, C.white),
  'wc0.sign': (b, r) => b.rect(r.x, r.y + 2, r.w, r.h - 4, C.white).frame(r.x, r.y + 2, r.w, r.h - 4, C.ink).hline(r.x + 4, r.x + r.w - 5, r.y + 8, C.ink).hline(r.x + 4, r.x + r.w - 9, r.y + 13, C.ink),
  'wc1.comics': (b, r) => {
    for (let i = 0; i < 4; i++) b.rect(r.x + 2, r.y + 18 - i * 4, 20, 4, [C.red, C.blue, C.yellow, C.green3][i]);
  },
  'wc1.plant': (b, r) => pot(b, r.x + 12, r.y + r.h, C.green3),
  'office.window': (b, r) => windowPane(b, r, 'garden'),
  'office.computer': (b, r) => {
    b.rect(r.x - 20, r.y + 22, r.w + 50, 4, C.wood3).rect(r.x - 18, r.y + 26, 3, 12, C.wood1).rect(r.x + r.w + 26, r.y + 26, 3, 12, C.wood1);
    b.rect(r.x + 6, r.y, 28, 18, C.ink).rect(r.x + 8, r.y + 2, 24, 14, C.teal1).rect(r.x + 18, r.y + 18, 4, 4, C.stone2).rect(r.x + 4, r.y + 20, 32, 2, C.stone3);
    b.rect(r.x + 28, r.y + 3, 4, 4, C.yellow);
  },
  'office.shelf': (b, r) => {
    b.rect(r.x, r.y, r.w, r.h, C.wood2).frame(r.x, r.y, r.w, r.h, C.wood1);
    for (let y = r.y + 4; y < r.y + r.h - 8; y += 16) for (let i = 0; i < 5; i++) b.rect(r.x + 4 + i * 9, y, 7, 13, [C.blue, C.red, C.green3, C.gold, C.stone3][i]);
  },
  'utility.basket': (b, r) => b.rect(r.x + 2, r.y + 6, r.w - 4, r.h - 6, C.wood4).frame(r.x + 2, r.y + 6, r.w - 4, r.h - 6, C.wood2).ellipse(r.x + 12, r.y + 6, 6, 3, C.sky).ellipse(r.x + 24, r.y + 5, 5, 3, C.pink),
  'utility.machine': (b, r, s) => {
    b.rect(r.x, r.y, r.w, r.h, C.white).frame(r.x, r.y, r.w, r.h, C.stone3).rect(r.x + 4, r.y + 3, r.w - 8, 5, C.stone4);
    b.ellipse(r.x + r.w / 2, r.y + 24, 13, 13, C.stone3).ellipse(r.x + r.w / 2, r.y + 24, 10, 10, on(s, 'machine_running') ? C.water1 : C.glass);
  },
  'utility.shelf': (b, r, s) => {
    b.hline(r.x, r.x + r.w - 1, r.y + 18, C.wood1).hline(r.x, r.x + r.w - 1, r.y + 36, C.wood1);
    b.rect(r.x + 4, r.y + 8, 6, 10, C.blue).rect(r.x + 12, r.y + 10, 5, 8, C.green3).rect(r.x + 4, r.y + 28, 8, 8, C.yellow);
    if (!on(s, 'detergent_taken')) b.rect(r.x + 30, r.y + 6, 12, 12, C.orange).rect(r.x + 32, r.y + 9, 8, 4, C.white);
  },
  'utility.broom': (b, r) => b.vline(r.x + 11, r.y, r.y + r.h - 14, C.wood4).rect(r.x + 4, r.y + r.h - 14, 15, 14, C.yellow),
  'garage.pole': (b, r, s) => {
    b.rect(r.x + 9, r.y + 2, 4, 4, C.stone1);
    if (!on(s, 'pole_taken')) b.rect(r.x + 10, r.y + 4, 2, r.h - 6, C.blue).rect(r.x + 9, r.y + r.h - 4, 4, 3, C.chrome);
  },
  'garage.crate': (b, r, s) => {
    b.rect(r.x, r.y, r.w, r.h, C.wood4).frame(r.x, r.y, r.w, r.h, C.wood2).line(r.x, r.y, r.x + r.w - 1, r.y + r.h - 1, C.wood2).line(r.x + r.w - 1, r.y, r.x, r.y + r.h - 1, C.wood2);
    if (!on(s, 'extension_taken')) b.rect(r.x + r.w - 2, r.y - 6, 3, 10, C.blue);
  },
  'garage.bike': (b, r) => {
    b.ellipse(r.x + 8, r.y + 30, 7, 7, C.ink).ellipse(r.x + 8, r.y + 30, 5, 5, C.stone3).ellipse(r.x + 30, r.y + 30, 7, 7, C.ink).ellipse(r.x + 30, r.y + 30, 5, 5, C.stone3);
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
  'garage.drawer': (b, r, s) => {
    b.rect(r.x, r.y, r.w, r.h, C.red).frame(r.x, r.y, r.w, r.h, C.redDark).hline(r.x + 2, r.x + r.w - 3, r.y + 8, C.redDark).hline(r.x + 2, r.x + r.w - 3, r.y + 16, C.redDark);
    if (!on(s, 'pliers_taken')) b.line(r.x + 8, r.y + 4, r.x + 16, r.y - 2, C.chrome);
  },
  'cellar.rack': (b, r, s) => {
    b.rect(r.x, r.y, r.w, r.h, C.wood2);
    for (let y = r.y + 4; y < r.y + r.h - 4; y += 9) for (let x = r.x + 4; x < r.x + r.w - 4; x += 9) b.ellipse(x + 3, y + 3, 3, 3, C.wine1).set(x + 3, y + 3, C.green1);
    if (!on(s, 'bar_taken')) b.line(r.x + 4, r.y + 28, r.x + r.w - 4, r.y + 24, C.ironHi);
  },
  'cellar.barrel': (b, r) => b.ellipse(r.x + 15, r.y + 16, 13, 13, C.wood3).hline(r.x + 3, r.x + 27, r.y + 9, C.iron).hline(r.x + 3, r.x + 27, r.y + 23, C.iron),
  'cellar.bottles': (b, r) => {
    for (let i = 0; i < 5; i++) b.rect(r.x + 4 + i * 7, r.y + 20, 5, 28, C.green1).rect(r.x + 5 + i * 7, r.y + 14, 3, 6, C.green1).set(r.x + 5 + i * 7, r.y + 24, C.green3);
  },
  'cellar.shutter': (b, r) => {
    b.rect(r.x, r.y, r.w, r.h, C.wood1);
    for (let y = r.y + 3; y < r.y + r.h; y += 5) b.hline(r.x + 1, r.x + r.w - 2, y, C.wood3);
  },
  'attic.boxes': (b, r) => b.rect(r.x, r.y + 14, 30, 26, C.wood4).rect(r.x + 26, r.y + 4, 30, 36, C.wood5).frame(r.x, r.y + 14, 30, 26, C.wood2).frame(r.x + 26, r.y + 4, 30, 36, C.wood3),
  'attic.window': (b, r) => windowPane(b, r, 'night'),
  'attic.stain': (b, r) => {
    b.ellipse(r.x + 20, r.y + 34, 18, 30, C.cream);
    b.dither(r.x + 6, r.y + 12, 28, 50, C.cream, C.white);
  },
  'attic.door': (b, r) => door(b, { x: r.x + 4, y: r.y + 4, w: r.w - 8, h: r.h - 4 }, C.wood2),
  'laundry.machine': (b, r) => b.rect(r.x, r.y, r.w, r.h, C.white).frame(r.x, r.y, r.w, r.h, C.stone3).ellipse(r.x + 20, r.y + 26, 12, 12, C.stone3).rect(r.x + 18, r.y - 8, 4, 10, C.chrome).ellipse(r.x + 20, r.y - 10, 6, 3, C.chrome),
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
  'landing.lamp': (b, r) => b.rect(r.x + 10, r.y + 12, 4, 10, C.brass).ellipse(r.x + 12, r.y + 10, 8, 6, C.candle),
  'landing.picture': (b, r) => {
    b.rect(r.x, r.y + 2, r.w, r.h - 4, C.white).frame(r.x, r.y + 2, r.w, r.h - 4, C.wood2);
    b.rect(r.x + 4, r.y + 10, 8, 8, C.red).rect(r.x + 20, r.y + 12, 6, 6, C.choc).set(r.x + 15, r.y + 14, C.ink).set(r.x + 17, r.y + 14, C.ink);
  },
  'julien.poster': (b, r) => posterBox(b, r, C.green3, C.white),
  'julien.trophy': (b, r, s) => {
    b.rect(r.x + 4, r.y + 28, 18, 10, C.wood2).rect(r.x + 8, r.y + 18, 10, 10, C.gold).rect(r.x + 11, r.y + 10, 4, 8, C.gold);
    if (!on(s, 'queen_taken')) b.rect(r.x + 11, r.y + 4, 4, 6, C.white).set(r.x + 12, r.y + 3, C.white);
  },
  'julien.medals': (b, r) => {
    for (let i = 0; i < 6; i++) b.vline(r.x + 4 + i * 8, r.y + 2, r.y + 12, [C.red, C.blue, C.green3][i % 3]).ellipse(r.x + 4 + i * 8, r.y + 16, 3, 3, [C.gold, C.chrome, C.orange][i % 3]);
  },
  'julien.bed': (b, r) => bed(b, r, C.green3),
  'parents.bed': (b, r) => bed(b, r, C.wine2),
  'bathroom.sink': (b, r) => sink(b, r),
  'parents.sink': (b, r) => sink(b, r),
  'bathroom.bath': (b, r) => b.rect(r.x, r.y + 8, r.w, r.h - 8, C.white).frame(r.x, r.y + 8, r.w, r.h - 8, C.stone3).rect(r.x + 4, r.y + 10, r.w - 8, 4, C.water2).rect(r.x + r.w - 10, r.y, 3, 10, C.chrome),
  'bathroom.duck': (b, r) => b.ellipse(r.x + 11, r.y + 14, 7, 5, C.yellow).ellipse(r.x + 15, r.y + 8, 4, 4, C.yellow).set(r.x + 19, r.y + 8, C.orange).hline(r.x + 13, r.x + 17, r.y + 7, C.ink),
  'theo.poster': (b, r) => posterBox(b, r, C.blueDark, C.white),
  'theo.cube': (b, r, s) => {
    b.rect(r.x - 30, r.y + 14, r.w + 60, 4, C.wood3).rect(r.x - 28, r.y + 18, 3, 12, C.wood1);
    const solved = on(s, 'cube_solved');
    const col = [C.red, C.green3, C.blue, C.yellow, C.orange, C.white];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) b.rect(r.x + 6 + i * 4, r.y + 2 + j * 4, 3, 3, solved ? C.red : col[(i * 2 + j * 5) % 6]);
  },
  'theo.cubes': (b, r) => {
    b.hline(r.x, r.x + r.w - 1, r.y + r.h - 4, C.wood1);
    for (let i = 0; i < 6; i++) {
      const c = [C.red, C.blue, C.yellow, C.green3, C.orange, C.white][i];
      b.rect(r.x + 2 + i * 10, r.y + r.h - 12, 8, 8, c).frame(r.x + 2 + i * 10, r.y + r.h - 12, 8, 8, C.ink);
    }
  },
  'florent.nerf': (b, r) => {
    for (let i = 0; i < 3; i++) b.rect(r.x + 4, r.y + 6 + i * 12, 34, 6, [C.orange, C.blue, C.yellow][i]).rect(r.x + 8, r.y + 12 + i * 12, 4, 5, C.ink);
  },
  'florent.kit': (b, r, s) => {
    b.rect(r.x - 30, r.y + 16, r.w + 60, 4, C.wood3).rect(r.x - 28, r.y + 20, 3, 10, C.wood1);
    b.rect(r.x + 4, r.y + 6, 22, 10, C.yellow).frame(r.x + 4, r.y + 6, 22, 10, C.orange);
    if (!on(s, 'oring_taken')) b.frame(r.x + 8, r.y + 9, 4, 4, C.ink);
    b.frame(r.x + 15, r.y + 9, 4, 4, C.ink);
  },
  'florent.console': (b, r) => b.rect(r.x, r.y, r.w, r.h - 10, C.ink).rect(r.x + 2, r.y + 2, r.w - 4, r.h - 14, C.purple).rect(r.x + 8, r.y + r.h - 8, 12, 6, C.stone1).rect(r.x + 30, r.y + r.h - 8, 10, 6, C.stone2),
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
  'parents.mirror': (b, r, s) => {
    b.rect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, C.chrome).rect(r.x + 4, r.y + 4, r.w - 8, r.h - 8, on(s, 'mirror_code') ? C.stone4 : C.glassHi);
    if (on(s, 'mirror_code')) for (let i = 0; i < 4; i++) b.vline(r.x + 8 + i * 6, r.y + 10, r.y + 18, C.white).hline(r.x + 7 + i * 6, r.x + 9 + i * 6, r.y + 10, C.white);
  },
  'parents.shower': (b, r, s) => {
    b.rect(r.x, r.y, r.w, r.h, C.tile2);
    for (let y = r.y; y < r.y + r.h; y += 8) b.hline(r.x, r.x + r.w - 1, y, C.tile1);
    b.rect(r.x + 26, r.y + 6, 3, 20, C.chrome).rect(r.x + 18, r.y + 6, 12, 4, C.chrome);
    if (!on(s, 'shower_repaired')) b.set(r.x + 20, r.y + 12, C.water2).set(r.x + 21, r.y + 16, C.water2).set(r.x + 19, r.y + 22, C.water2);
    if (on(s, 'mirror_code')) b.dither(r.x + 2, r.y + 10, r.w - 4, 30, C.tile2, C.white);
    b.vline(r.x, r.y, r.y + r.h - 1, C.glass);
  },
};

function toilet(b: PixelBuffer, r: Rect) {
  b.rect(r.x + 4, r.y, 22, 14, C.white).frame(r.x + 4, r.y, 22, 14, C.stone3).ellipse(r.x + 15, r.y + 24, 11, 6, C.white).rect(r.x + 9, r.y + 28, 12, r.h - 28, C.white);
}

function sink(b: PixelBuffer, r: Rect) {
  b.rect(r.x + 2, r.y + 10, r.w - 4, 6, C.white).frame(r.x + 2, r.y + 10, r.w - 4, 6, C.stone3).rect(r.x + r.w / 2 - 3, r.y + 16, 6, r.h - 16, C.white).rect(r.x + r.w / 2 - 1, r.y + 4, 3, 6, C.chrome);
}

function bed(b: PixelBuffer, r: Rect, cover: Color) {
  b.rect(r.x, r.y, 6, r.h, C.wood2).rect(r.x, r.y + 12, r.w, r.h - 12, C.wood1).rect(r.x + 4, r.y + 8, r.w - 6, 10, cover).rect(r.x + 6, r.y + 4, 14, 6, C.white);
}

function posterBox(b: PixelBuffer, r: Rect, bg: Color, fg: Color) {
  b.rect(r.x, r.y, r.w, r.h, bg).frame(r.x, r.y, r.w, r.h, C.ink).ellipse(r.x + r.w / 2, r.y + 14, 6, 6, C.skin).rect(r.x + r.w / 2 - 6, r.y + 20, 12, 14, fg);
}

// ---------- exits ----------

function paintExit(b: PixelBuffer, id: string, r: Rect, s: GameState) {
  // Unlocked, the front door stays ajar: the warm light of the hall shows through.
  if (id === 'front.toHall') {
    doorway(b, r, C.candle);
    b.rect(r.x, r.y, 6, FLOOR_Y - r.y, C.wine2);
    return;
  }
  if (id === 'hall.toFront') return door(b, r, C.wine2);
  if (id.endsWith('.stairs') || id === 'landing.toHall') return stairs(b, r, id === 'hall.stairs');
  if (id === 'garage.toCorridor') return stairs(b, r, true);
  if (id === 'corridor0.toGarage') return stairs(b, r, false);
  if (id === 'garage.toAttic' || id === 'cellar.toGarage') return ladder(b, r);
  if (id === 'garage.toCellar' || id === 'attic.toGarage') return hatch(b, r, id === 'attic.toGarage');
  if (id === 'cellar.toFront') return b.rect(r.x, r.y, r.w, r.h, C.sky2).frame(r.x, r.y, r.w, r.h, C.wood1);
  if (id === 'attic.toLaundry') return doorway(b, r, C.wine0);
  if (id === 'living.toPool' || id === 'pool.toLiving') return doorway(b, r, C.night1);
  if (id === 'football.toPool' || id === 'pool.toFootball') return b.rect(r.x + 4, r.y + r.h - 30, r.w - 8, 30, C.tile1).frame(r.x + 2, r.y + r.h - 34, r.w - 4, 34, C.wood3);
  const outdoor = s.place === 'front' || s.place === 'football' || s.place === 'pool' || s.place === 'garden';
  if (outdoor) {
    // A path to the next part of the garden.
    b.dither(r.x, FLOOR_Y, r.w, 46, C.tile1, C.grass);
    return;
  }
  if (r.x <= 4 || r.x >= 286) return doorway(b, r);
  door(b, r);
}

// ---------- places ----------

const DOOR_PLATES: Record<string, Color> = {
  'corridor0.officeDoor': C.blue,
  'landing.julienDoor': C.green3,
  'landing.theoDoor': C.yellow,
  'landing.florentDoor': C.purple,
  'landing.parentsDoor': C.pink,
};

interface Style {
  bg: (b: PixelBuffer, s: GameState) => void;
  floor: Floor;
}

const warm: Wall = { base: C.wallWarm, dark: C.wallWarmDark, motif: C.wallWarmDark, panel: true };

const STYLES: Record<PlaceId, Style> = {
  front: {
    bg: (b) => {
      sky(b);
      bricks(b, 20, 20, 280, 80, C.wallWarm, C.wallWarmDark);
      for (let y = 0; y < 20; y++) b.hline(20 - y, 299 + y, 20 - y, C.wine1);
      windowPane(b, { x: 60, y: 30, w: 30, h: 20 }, 'dusk');
      windowPane(b, { x: 230, y: 30, w: 30, h: 20 }, 'dusk');
    },
    floor: 'paving',
  },
  football: { bg: (b) => (sky(b), hedgeLine(b)), floor: 'grass' },
  garden: { bg: (b) => (sky(b), hedgeLine(b, 72)), floor: 'grass' },
  pool: {
    bg: (b) => {
      sky(b);
      hedgeLine(b, 70);
      bricks(b, 0, 10, 100, 90, C.wallWarm, C.wallWarmDark);
    },
    floor: 'paving',
  },
  hall: { bg: (b) => wall(b, warm), floor: 'checker' },
  living: { bg: (b) => wall(b, { base: C.wallGreen, dark: C.wallGreenDark, motif: C.green3 }), floor: 'planks' },
  music: { bg: (b) => wall(b, { base: C.wallBlue, dark: C.wallBlueDark, motif: C.blue }), floor: 'planks' },
  dining: { bg: (b) => wall(b, { base: C.wallPink, dark: C.wallPinkDark, panel: true }), floor: 'planks' },
  kitchen: {
    bg: (b) => {
      wall(b, { base: C.tile2, dark: C.tile1 });
      for (let y = 40; y < FLOOR_Y - 2; y += 8) b.hline(0, SCENE_W - 1, y, C.tile1);
      for (let x = 0; x < SCENE_W; x += 8) b.vline(x, 40, FLOOR_Y - 3, C.tile1);
      windowPane(b, { x: 240, y: 20, w: 34, h: 26 }, 'garden');
    },
    floor: 'tiles',
  },
  corridor0: { bg: (b) => wall(b, warm), floor: 'planks' },
  wc0: { bg: (b) => wall(b, { base: C.tile2, dark: C.tile1 }), floor: 'tiles' },
  wc1: { bg: (b) => wall(b, { base: C.sky, dark: C.blue }), floor: 'tiles' },
  office: { bg: (b) => wall(b, { base: C.wallBlueDark, dark: C.blueDark, panel: true }), floor: 'carpet' },
  utility: { bg: (b) => wall(b, { base: C.stone3, dark: C.stone2 }), floor: 'tiles' },
  garage: { bg: (b) => bricks(b, 0, 0, SCENE_W, FLOOR_Y, C.stone2, C.stone1), floor: 'concrete' },
  cellar: { bg: (b) => bricks(b, 0, 0, SCENE_W, FLOOR_Y, C.wine0, C.black), floor: 'flagstones' },
  attic: {
    bg: (b) => {
      b.rect(0, 0, SCENE_W, FLOOR_Y, C.wood3);
      for (let x = 0; x < SCENE_W; x += 16) b.vline(x, 0, FLOOR_Y - 1, C.wood2);
      for (let y = 0; y < 30; y++) {
        b.hline(0, 40 - y, y, C.wood0);
        b.hline(280 + y, SCENE_W - 1, y, C.wood0);
      }
      b.rect(0, FLOOR_Y - 2, SCENE_W, 2, C.wood1);
    },
    floor: 'planks',
  },
  laundry: { bg: (b) => wall(b, { base: C.wallPink, dark: C.wallPinkDark, motif: C.choc }), floor: 'tiles' },
  landing: { bg: (b) => wall(b, warm), floor: 'carpet' },
  julien: { bg: (b) => wall(b, { base: C.wallGreen, dark: C.wallGreenDark }), floor: 'planks' },
  bathroom: { bg: (b) => wall(b, { base: C.tile2, dark: C.tile1, motif: C.water2 }), floor: 'tiles' },
  theo: { bg: (b) => wall(b, { base: C.wallBlue, dark: C.wallBlueDark, motif: C.yellow }), floor: 'planks' },
  florent: { bg: (b) => wall(b, { base: C.purple, dark: C.plum2 }), floor: 'carpet' },
  parents: { bg: (b) => wall(b, { base: C.wallPink, dark: C.wallPinkDark, panel: true }), floor: 'planks' },
};

// The hotspots that have a prop painter (doors of the guarded rooms are painted as doors).
export const PAINTED_HOTSPOTS: readonly string[] = Object.keys(PROPS);

// Flags that change how a place looks: its image is repainted only when one of them changes.
export const VISUAL_FLAGS: Record<PlaceId, (keyof Flags)[]> = {
  front: ['key_taken', 'door_unlocked'],
  football: [],
  pool: ['ball_freed', 'cover_open', 'pool_drained', 'plug_fixed', 'thinner_taken', 'bay_open'],
  garden: [],
  hall: [],
  living: ['booklet_taken', 'queen_placed', 'bay_open'],
  music: [],
  dining: ['sticks_taken'],
  kitchen: [],
  corridor0: [],
  wc0: [],
  office: [],
  utility: ['detergent_taken', 'machine_running'],
  garage: ['pole_taken', 'extension_taken', 'wrench_taken', 'pliers_taken'],
  cellar: ['bar_taken', 'shutter_open'],
  attic: ['door_revealed', 'secret_open'],
  laundry: [],
  landing: [],
  wc1: [],
  julien: ['queen_taken'],
  bathroom: [],
  theo: ['cube_solved'],
  florent: ['oring_taken'],
  parents: ['safe_found', 'safe_open', 'mirror_code', 'shower_repaired'],
};

export function roomKey(s: GameState): string {
  return [s.place, ...VISUAL_FLAGS[s.place].map((f) => (s.flags[f] ? 1 : 0))].join(':');
}

export function paintRoom(s: GameState): PixelBuffer {
  const b = new PixelBuffer(SCENE_W, SCENE_H);
  const style = STYLES[s.place];
  style.bg(b, s);
  floor(b, style.floor);
  for (const e of EXITS) if (e.place === s.place && (!e.visible || e.visible(s))) paintExit(b, e.id, e.rect, s);
  for (const h of HOTSPOTS) {
    if (h.place !== s.place || (h.visible && !h.visible(s))) continue;
    if (h.door) door(b, h.rect, C.wood3, DOOR_PLATES[h.id]);
    else PROPS[h.id]?.(b, h.rect, s);
  }
  band(b);
  return b;
}

// The house at dusk (home screen, intro and ending backdrop).
export function paintHouse(): PixelBuffer {
  const b = new PixelBuffer(SCENE_W, SCENE_H);
  b.gradient(0, 0, SCENE_W, 130, [C.sky0, C.sky1, C.sky2, C.sky3]);
  b.ellipse(266, 104, 18, 18, C.sun);
  for (let i = 0; i < 40; i++) b.set((i * 97 + 13) % SCENE_W, (i * 41 + 7) % 60, C.star);
  b.rect(0, 120, SCENE_W, 60, C.green1);
  for (let x = 0; x < SCENE_W; x += 10) b.ellipse(x + 5, 122, 7, 4, C.green1);
  // House: two floors, a pointed roof, garage on the right.
  bricks(b, 80, 62, 140, 74, C.wallWarm, C.wallWarmDark);
  for (let y = 0; y < 34; y++) b.hline(72 + y, 228 - y, 62 - y, C.wine1);
  b.rect(190, 18, 10, 20, C.wine0);
  bricks(b, 220, 92, 50, 44, C.wallWarmDark, C.wood2);
  b.rect(228, 104, 34, 32, C.stone2);
  for (let y = 106; y < 136; y += 4) b.hline(228, 261, y, C.stone1);
  const lit = [true, false, true, true, false, true];
  for (let i = 0; i < 6; i++) {
    const x = 92 + (i % 3) * 44;
    const y = i < 3 ? 72 : 100;
    b.rect(x, y, 18, 14, lit[i] ? C.candle : C.night1).frame(x - 1, y - 1, 20, 16, C.wood1).vline(x + 9, y, y + 13, C.wood1);
  }
  b.rect(142, 110, 16, 26, C.wine2).rect(154, 122, 2, 2, C.gold);
  b.rect(136, 136, 28, 4, C.stone3);
  for (let y = 140; y < SCENE_H; y++) b.hline(140 - (y - 140), 160 + (y - 140), y, C.tile1);
  // Hedge and the pool on the left.
  for (let x = 0; x < 72; x += 10) b.ellipse(x + 5, 126, 8, 8, C.green2);
  b.ellipse(40, 150, 30, 8, C.water1);
  return b;
}
