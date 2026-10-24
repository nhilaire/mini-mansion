// T-15 / T-39: the 23 place scenes (photographed rooms redrawn after the photos) and the house at dusk (AC-15 support: one scene per place of the plan).
import { paintHouse, paintRoom, PAINTED_HOTSPOTS, roomKey, VISUAL_FLAGS } from '../art/rooms';
import { newGame } from '../game/rules';
import { GameState } from '../game/types';
import { HOTSPOTS, PLACES, SCENE_H, SCENE_W } from '../game/world';

const transparentPixels = (data: Uint8Array) => {
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] === 0) n++;
  return n;
};

describe('places drawn in code', () => {
  it('paints every place of the plan on a full, opaque 320x180 scene', () => {
    for (const place of PLACES) {
      const b = paintRoom({ ...newGame(), place });
      expect([place, b.w, b.h]).toEqual([place, SCENE_W, SCENE_H]);
      expect([place, transparentPixels(b.data)]).toEqual([place, 0]);
    }
  });

  it('places look different from each other', () => {
    const sigs = PLACES.map((place) => {
      const d = paintRoom({ ...newGame(), place }).data;
      let h = 0;
      for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
      return h;
    });
    expect(new Set(sigs).size).toBe(PLACES.length);
  });

  it('every hotspot has its prop painted (doors of the guarded rooms as doors)', () => {
    for (const h of HOTSPOTS) expect([h.id, h.door !== undefined || PAINTED_HOTSPOTS.includes(h.id)]).toEqual([h.id, true]);
  });

  it('repaints a place only when one of its visible flags changes, and the drawing follows the state', () => {
    const pool: GameState = { ...newGame(), place: 'pool' };
    expect(roomKey(pool)).toBe(roomKey({ ...pool, flags: { key_taken: true } }));
    expect(roomKey(pool)).not.toBe(roomKey({ ...pool, flags: { ball_freed: true } }));
    // Flags only visible once another one is set (the bottle is under the cover...).
    const needs: Partial<Record<keyof GameState['flags'], GameState['flags']>> = {
      thinner_taken: { cover_open: true },
      pool_drained: { cover_open: true },
      safe_open: { safe_found: true },
      secret_open: { door_revealed: true },
      lab_code: { door_revealed: true },
      milk_taken: { fridge_open: true },
      sardines_taken: { fridge_open: true },
      cat_fed: { delivered: true },
      parcel_taken: { delivered: true },
      // Maman's basket (with the drawer key) is only in the garden while she changes, once Papa is wary.
      keyring_taken: { dad_wary: true },
    };
    const charsFor: Partial<Record<keyof GameState['flags'], Partial<GameState['chars']>>> = { keyring_taken: { mom: 'changing' } };
    for (const place of PLACES) {
      for (const flag of VISUAL_FLAGS[place]) {
        const s: GameState = { ...newGame(), place, flags: { ...needs[flag] }, chars: { ...newGame().chars, ...charsFor[flag] } };
        const changed = paintRoom({ ...s, flags: { ...s.flags, [flag]: true } }).data;
        const base = paintRoom(s).data;
        expect([place, flag, changed.some((v, i) => v !== base[i])]).toEqual([place, flag, true]);
      }
    }
  });

  it('paints the house at dusk for the home screen', () => {
    const b = paintHouse();
    expect([b.w, b.h]).toEqual([SCENE_W, SCENE_H]);
    expect(transparentPixels(b.data)).toBe(0);
  });
});
