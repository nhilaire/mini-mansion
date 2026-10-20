// T-14: pixel buffer, characters and item icons drawn in code (AC-14, AC-19 support).
import { heroFrame, personFrame, SPECS, spriteSet, walkSet } from '../art/cast';
import { allItemIcons, ICON_ROWS } from '../art/items';
import { drawPerson, SPRITE_H, SPRITE_W } from '../art/people';
import { CLEAR, fromAscii, PixelBuffer } from '../art/pixels';
import { encodePng } from '../art/png';
import { ITEMS, SLOT_SIZE } from '../game/world';

describe('pixel buffer', () => {
  it('stores RGBA bytes and reads colours back', () => {
    const b = new PixelBuffer(4, 2).set(1, 0, 0x112233).set(9, 9, 0xffffff);
    expect([...b.data.subarray(4, 8)]).toEqual([0x11, 0x22, 0x33, 0xff]);
    expect(b.get(1, 0)).toBe(0x112233);
    expect(b.get(0, 0)).toBe(CLEAR);
    expect(b.get(-1, 0)).toBe(CLEAR);
    b.set(1, 0, CLEAR);
    expect(b.get(1, 0)).toBe(CLEAR);
  });

  it('draws rects, lines and mirrors sprites', () => {
    const b = new PixelBuffer(5, 5).rect(1, 1, 2, 2, 0xff0000).line(0, 4, 4, 4, 0x00ff00);
    expect(b.get(2, 2)).toBe(0xff0000);
    expect(b.get(3, 3)).toBe(CLEAR);
    expect([0, 1, 2, 3, 4].every((x) => b.get(x, 4) === 0x00ff00)).toBe(true);
    const s = fromAscii(['ab.'], { a: 1, b: 2 });
    const f = s.flipped();
    expect([f.get(0, 0), f.get(1, 0), f.get(2, 0)]).toEqual([CLEAR, 2, 1]);
    expect(() => fromAscii(['z'], {})).toThrow();
  });

  it('outlines only transparent neighbours', () => {
    const b = new PixelBuffer(3, 3).set(1, 1, 5).outline(9);
    expect([b.get(1, 0), b.get(0, 1), b.get(2, 1), b.get(1, 2), b.get(1, 1), b.get(0, 0)]).toEqual([9, 9, 9, 9, 5, CLEAR]);
  });

  it('encodes a valid PNG header at the requested scale', () => {
    const png = encodePng(new PixelBuffer(2, 1).set(0, 0, 1), 3, (d) => d);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(png.buffer);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([6, 3]);
  });
});

describe('characters (AC-14)', () => {
  it('draws the hero and the five inhabitants in all poses at 24x48, feet on the ground', () => {
    for (const [id, spec] of Object.entries(SPECS)) {
      for (const dir of ['down', 'up', 'side'] as const) {
        for (const frame of [-2, -1, 0, 1, 2, 3]) {
          const b = drawPerson(spec, { dir, frame });
          expect([id, b.w, b.h]).toEqual([id, SPRITE_W, SPRITE_H]);
          expect([id, Array.from({ length: SPRITE_W }, (_, x) => b.get(x, 47)).some((c) => c !== CLEAR)]).toEqual([id, true]);
        }
      }
      const set = spriteSet(spec);
      expect(set.idle).toHaveLength(2);
      expect(set.activity).toHaveLength(2);
      // The activity pose differs from standing (the arms are raised).
      expect(set.activity[0].data.every((v, i) => v === set.idle[0].data[i])).toBe(false);
    }
  });

  it('every inhabitant has a distinct silhouette and colours', () => {
    const looks = Object.values(SPECS).map((s) => `${s.height}-${s.top}-${s.hairStyle}-${s.hair}`);
    expect(new Set(looks).size).toBe(looks.length);
  });

  it('walks in 4 frames per direction; left is the mirrored side view', () => {
    const hero = walkSet(SPECS.hero);
    expect(hero.walk.side).toHaveLength(4);
    expect(heroFrame(hero, 'left', 1, false)).toEqual({ image: hero.walk.side[1], flip: true });
    expect(heroFrame(hero, 'right', -1, false)).toEqual({ image: hero.stand.side, flip: false });
    expect(heroFrame(hero, 'down', -1, true).image).toBe(hero.talk);
    expect(hero.walk.side[0].data.every((v, i) => v === hero.walk.side[1].data[i])).toBe(false);
  });

  it('inhabitants talk, blink and play their activity over time', () => {
    const set = spriteSet(SPECS.florent);
    expect(personFrame(set, 'florent', { talking: true, busy: true, clock: 0 })).toBe(set.talk);
    expect(personFrame(set, 'florent', { talking: false, busy: true, clock: 0 })).toBe(set.activity[0]);
    expect(personFrame(set, 'florent', { talking: false, busy: true, clock: 300 })).toBe(set.activity[1]);
    const frames = new Set(Array.from({ length: 64 }, (_, i) => personFrame(set, 'florent', { talking: false, busy: false, clock: i * 50 })));
    expect(frames.has(set.idle[0])).toBe(true);
  });
});

describe('item icons', () => {
  it('has a 16x16 icon for every item, fitting an inventory slot', () => {
    const icons = allItemIcons();
    for (const item of ITEMS) {
      expect([item, ICON_ROWS[item].length, ICON_ROWS[item].every((r) => r.length === 16)]).toEqual([item, 16, true]);
      expect([icons[item].w, icons[item].h]).toEqual([16, 16]);
      expect(16).toBeLessThanOrEqual(SLOT_SIZE);
    }
  });

  it('icons are all different', () => {
    const icons = Object.values(ICON_ROWS).map((rows) => rows.join('|'));
    expect(new Set(icons).size).toBe(icons.length);
  });
});
