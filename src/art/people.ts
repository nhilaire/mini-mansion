// Character sprites (24x48 px), built from a few parameters per person so that everyone shares one style.
// Poses: front (down), back (up) and side (right; left is the mirror), idle / blink / talk, a 4-frame walk and an
// activity frame (arms raised: drumming, cooking, gardening, cheering), from the front or from the back.
import { C } from './palette';
import { Color, PixelBuffer } from './pixels';

export const SPRITE_W = 24;
export const SPRITE_H = 48;

export type HairStyle = 'messy' | 'slick' | 'bun' | 'cap' | 'bald' | 'ponytail' | 'spiky';

export interface PersonSpec {
  height: number;
  skin: Color;
  hair: Color;
  hairStyle: HairStyle;
  top: Color;
  topShade: Color;
  bottom: Color;
  shoes: Color;
  wide?: number;
  skirt?: boolean;
  apron?: Color;
  shirt?: Color;
  tie?: Color;
  goggles?: boolean;
  mustache?: Color;
  cap?: Color;
  stripes?: Color;
  glasses?: boolean;
}

export type Dir = 'down' | 'up' | 'side';

export interface Pose {
  dir: Dir;
  // 0-3 walk frames, -1 standing, -2 standing with eyes closed (blink).
  frame: number;
  talk?: boolean;
  // Arms raised (front or back view).
  activity?: boolean;
}

export function drawPerson(spec: PersonSpec, pose: Pose): PixelBuffer {
  const b = new PixelBuffer(SPRITE_W, SPRITE_H);
  const y0 = SPRITE_H - spec.height;
  const torsoH = Math.round((spec.height - 10) * 0.42);
  const wide = spec.wide ?? 0;
  const ty = y0 + 11;
  const ly = ty + torsoH;
  if (pose.dir === 'side') drawSide(b, spec, pose, y0, ty, ly, torsoH, wide);
  else drawFront(b, spec, pose, y0, ty, ly, torsoH, wide);
  return b.outline(C.outline);
}

function drawFront(b: PixelBuffer, s: PersonSpec, pose: Pose, y0: number, ty: number, ly: number, th: number, wide: number) {
  const back = pose.dir === 'up';
  const tw = 10 + wide * 2;
  const tx = 12 - tw / 2;
  const lift = pose.frame === 0 ? 'left' : pose.frame === 2 ? 'right' : null;

  // Legs and shoes.
  const legW = 3;
  const legs: [number, 'left' | 'right'][] = [
    [tx + 1, 'left'],
    [tx + tw - 1 - legW, 'right'],
  ];
  for (const [lx, side] of legs) {
    const up = lift === side ? 1 : 0;
    b.rect(lx, ly, legW, 46 - ly - up, s.skirt ? C.ink : s.bottom);
    b.rect(lx - (side === 'left' ? 1 : 0), 46 - up, legW + 1, 2, s.shoes);
  }
  if (s.skirt) {
    const sh = Math.round((46 - ly) * 0.65);
    for (let j = 0; j < sh; j++) b.hline(tx - Math.floor(j / 3), tx + tw - 1 + Math.floor(j / 3), ly + j, s.bottom);
  }

  // Torso, arms, hands.
  b.rect(tx, ty, tw, th, s.top);
  b.vline(tx + tw - 1, ty, ty + th - 1, s.topShade);
  if (s.stripes !== undefined) for (let j = ty + 1; j < ty + th; j += 3) b.hline(tx, tx + tw - 1, j, s.stripes);
  if (!back && s.shirt !== undefined) b.rect(10, ty, 4, Math.min(5, th), s.shirt);
  if (!back && s.tie !== undefined) b.vline(11, ty, ty + 4, s.tie).vline(12, ty, ty + 3, s.tie);
  if (!back && s.apron !== undefined) b.rect(tx + 2, ty + 3, tw - 4, th - 3, s.apron).rect(tx + 1, ly, tw - 2, Math.round((46 - ly) * 0.55), s.apron);
  const swing = pose.frame === 0 ? 1 : pose.frame === 2 ? -1 : 0;
  for (const [ax, dir] of [
    [tx - 2, swing],
    [tx + tw, -swing],
  ] as const) {
    if (pose.activity) {
      // Arms raised above the shoulders, hands up.
      b.rect(ax, ty - 6, 2, 8, s.top);
      b.rect(ax, ty - 8, 2, 2, s.skin);
      continue;
    }
    const len = th - 2 + dir;
    b.rect(ax, ty + 1, 2, len, s.top);
    b.rect(ax, ty + 1 + len, 2, 2, s.skin);
  }

  // Neck and head.
  b.rect(11, y0 + 10, 2, 1, s.skin);
  const hx = 7;
  b.rect(hx, y0 + 1, 10, 9, s.skin);
  b.rect(hx + 1, y0, 8, 1, s.skin);
  b.set(hx, y0 + 9, -1);
  b.set(hx + 9, y0 + 9, -1);
  hair(b, s, hx, y0, back);
  if (back) return;

  // Face.
  const blink = pose.frame === -2;
  b.set(9, y0 + 5, blink ? shade(s.skin) : C.ink);
  b.set(14, y0 + 5, blink ? shade(s.skin) : C.ink);
  if (s.goggles) b.rect(8, y0 + 1, 8, 2, C.brass).set(9, y0 + 1, C.glassHi).set(14, y0 + 1, C.glassHi);
  if (s.glasses) b.frame(8, y0 + 4, 3, 3, C.ink).frame(13, y0 + 4, 3, 3, C.ink).hline(11, 12, y0 + 5, C.ink);
  if (s.mustache !== undefined) b.hline(10, 13, y0 + 7, s.mustache);
  if (pose.talk) b.rect(11, y0 + 8, 2, 1, C.ink).set(11, y0 + 9, C.redDark);
  else b.hline(11, 12, y0 + 8, C.skinDark);
}

function drawSide(b: PixelBuffer, s: PersonSpec, pose: Pose, y0: number, ty: number, ly: number, th: number, wide: number) {
  const tw = 7 + wide;
  const tx = 9;
  const hip = 12;
  // Legs: back leg darker, both as slanted columns from the hip to the foot.
  const stride = pose.frame === 0 || pose.frame === 2 ? 4 : 0;
  const feet = pose.frame === 2 ? [hip + stride, hip - stride] : [hip - stride, hip + stride];
  feet.forEach((fx, k) => {
    const color = s.skirt ? C.ink : k === 0 ? shade(s.bottom) : s.bottom;
    for (let y = ly; y < 46; y++) {
      const x = Math.round(hip + ((fx - hip) * (y - ly)) / Math.max(1, 45 - ly)) - 1;
      b.hline(x, x + 2, y, color);
    }
    b.rect(fx - 2, 46, 5, 2, k === 0 ? shade(s.shoes) : s.shoes);
  });
  if (s.skirt) {
    const sh = Math.round((46 - ly) * 0.65);
    for (let j = 0; j < sh; j++) b.hline(tx - Math.floor(j / 3), tx + tw - 1 + Math.floor(j / 3), ly + j, s.bottom);
  }
  b.rect(tx, ty, tw, th, s.top);
  b.vline(tx, ty, ty + th - 1, s.topShade);
  if (s.stripes !== undefined) for (let j = ty + 1; j < ty + th; j += 3) b.hline(tx, tx + tw - 1, j, s.stripes);
  if (s.apron !== undefined) b.rect(tx + tw - 2, ty + 3, 2, th - 3, s.apron);
  // Arm swinging along the walk.
  const swing = pose.frame === 0 ? 2 : pose.frame === 2 ? -2 : 0;
  const len = th - 1;
  for (let j = 0; j < len; j++) {
    const x = 11 + Math.round((swing * j) / len);
    b.hline(x, x + 1, ty + 1 + j, s.topShade);
  }
  b.rect(11 + swing, ty + len, 2, 2, s.skin);
  // Head.
  b.rect(11, y0 + 10, 2, 1, s.skin);
  b.rect(8, y0 + 1, 9, 9, s.skin);
  b.rect(9, y0, 7, 1, s.skin);
  b.rect(17, y0 + 5, 1, 2, s.skin);
  hairSide(b, s, y0);
  b.set(14, y0 + 5, pose.frame === -2 ? C.skinShade : C.ink);
  if (s.goggles) b.rect(12, y0 + 1, 5, 2, C.brass).set(16, y0 + 1, C.glassHi);
  if (s.glasses) b.frame(13, y0 + 4, 3, 3, C.ink).hline(10, 12, y0 + 5, C.ink);
  if (s.mustache !== undefined) b.hline(14, 17, y0 + 7, s.mustache);
  if (pose.talk) b.rect(15, y0 + 8, 2, 1, C.ink);
  else b.set(16, y0 + 8, C.skinDark);
}

function hair(b: PixelBuffer, s: PersonSpec, hx: number, y0: number, back: boolean) {
  const h = s.hair;
  switch (s.hairStyle) {
    case 'messy':
      b.rect(hx, y0, 10, 3, h).vline(hx, y0, y0 + 4, h).vline(hx + 9, y0, y0 + 4, h);
      b.set(hx + 1, y0 - 1, h).set(hx + 4, y0 - 1, h).set(hx + 7, y0 - 1, h).set(hx + 3, y0 + 3, h);
      break;
    case 'slick':
      b.rect(hx, y0, 10, 2, h).vline(hx, y0, y0 + 4, h).vline(hx + 9, y0, y0 + 4, h).set(hx + 3, y0 + 2, h);
      break;
    case 'bun':
      b.rect(hx, y0, 10, 3, h).vline(hx, y0, y0 + 5, h).vline(hx + 9, y0, y0 + 5, h).rect(10, y0 - 3, 4, 3, h).hline(11, 12, y0 - 4, h);
      break;
    case 'cap':
      b.rect(hx, y0 + 2, 10, 2, h).rect(hx, y0 - 1, 10, 3, s.cap ?? h).hline(hx - 1, hx + 10, y0 + 2, s.cap ?? h);
      break;
    case 'bald':
      b.vline(hx, y0 + 3, y0 + 6, h).vline(hx + 9, y0 + 3, y0 + 6, h);
      break;
    case 'ponytail':
      b.rect(hx, y0, 10, 3, h).vline(hx, y0, y0 + 5, h).vline(hx + 9, y0, y0 + 5, h).rect(hx + 10, y0 + 2, 2, 7, h);
      break;
    case 'spiky':
      b.rect(hx, y0, 10, 2, h).vline(hx, y0, y0 + 3, h).vline(hx + 9, y0, y0 + 3, h);
      for (let i = 0; i < 5; i++) b.set(hx + 1 + i * 2, y0 - 1, h).set(hx + 1 + i * 2, y0 - 2, h);
      break;
  }
  if (back) {
    if (s.hairStyle === 'bald') b.rect(hx + 1, y0 + 2, 8, 6, s.skin).rect(hx, y0 + 3, 10, 5, h);
    else b.rect(hx, y0, 10, s.hairStyle === 'cap' ? 4 : 8, s.hairStyle === 'cap' ? (s.cap ?? h) : h);
    if (s.hairStyle === 'cap') b.rect(hx, y0 + 4, 10, 3, h);
  }
}

function hairSide(b: PixelBuffer, s: PersonSpec, y0: number) {
  const h = s.hair;
  switch (s.hairStyle) {
    case 'messy':
      b.rect(8, y0, 9, 3, h).rect(8, y0, 4, 7, h).set(10, y0 - 1, h).set(14, y0 - 1, h);
      break;
    case 'slick':
      b.rect(8, y0, 9, 2, h).rect(8, y0, 4, 6, h);
      break;
    case 'bun':
      b.rect(8, y0, 9, 3, h).rect(8, y0, 4, 7, h).ellipse(8, y0 + 2, 2, 2, h);
      break;
    case 'cap':
      b.rect(8, y0 + 2, 4, 4, h).rect(8, y0 - 1, 9, 3, s.cap ?? h).hline(13, 19, y0 + 2, s.cap ?? h);
      break;
    case 'bald':
      b.rect(8, y0 + 3, 2, 4, h);
      break;
    case 'ponytail':
      b.rect(8, y0, 9, 3, h).rect(8, y0, 4, 7, h).rect(5, y0 + 2, 3, 7, h);
      break;
    case 'spiky':
      b.rect(8, y0, 9, 2, h).rect(8, y0, 3, 5, h);
      for (let i = 0; i < 4; i++) b.set(9 + i * 2, y0 - 1, h).set(9 + i * 2, y0 - 2, h);
      break;
  }
}

function shade(c: Color): Color {
  const r = (c >> 16) & 0xff;
  const g = (c >> 8) & 0xff;
  const bl = c & 0xff;
  return (Math.round(r * 0.72) << 16) | (Math.round(g * 0.72) << 8) | Math.round(bl * 0.72);
}
