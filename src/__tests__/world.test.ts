// T-03 / T-29: the 23 places, the canonical exits of the PRD, lock rules, hotspots and tap sizes.
import { pointInPolygon } from '../game/geometry';
import { interact, newGame } from '../game/rules';
import { GameState, PlaceId } from '../game/types';
import {
  EXITS,
  FLOORS,
  HOTSPOTS,
  inventoryPage,
  MENU_BUTTON,
  MIN_TAP,
  NOTEBOOK_BUTTON,
  PLACES,
  ROOM_H,
  SCENE_W,
  sceneTransform,
  slotRect,
  SLOTS,
  toLogical,
  toScreenRect,
  exitsIn,
} from '../game/world';

// PRD "Places and exits": every exit by destination (the guarded rooms are entered through their door hotspot).
const CANONICAL: Record<PlaceId, PlaceId[]> = {
  front: ['hall', 'football', 'pool'],
  football: ['front', 'pool', 'garden'],
  pool: ['front', 'football', 'living'],
  garden: ['football'],
  hall: ['front', 'living', 'corridor0', 'landing'],
  living: ['hall', 'music', 'pool'],
  music: ['living', 'kitchen'],
  kitchen: ['music'],
  corridor0: ['hall', 'wc0', 'utility', 'garage'],
  wc0: ['corridor0'],
  office: ['corridor0'],
  utility: ['corridor0'],
  garage: ['corridor0', 'attic', 'cellar'],
  cellar: ['garage'],
  attic: ['garage', 'laundry'],
  laundry: ['attic'],
  landing: ['hall', 'wc1', 'bathroom'],
  wc1: ['landing'],
  julien: ['landing'],
  bathroom: ['landing'],
  theo: ['landing'],
  florent: ['landing'],
  parents: ['landing'],
};

const DOORS: Record<string, PlaceId> = {
  'corridor0.officeDoor': 'office',
  'landing.julienDoor': 'julien',
  'landing.theoDoor': 'theo',
  'landing.florentDoor': 'florent',
  'landing.parentsDoor': 'parents',
};

const withFlags = (s: GameState, ...flags: (keyof GameState['flags'])[]): GameState => ({ ...s, flags: { ...s.flags, ...Object.fromEntries(flags.map((f) => [f, true])) } });
const at = (place: PlaceId, ...flags: (keyof GameState['flags'])[]): GameState => withFlags({ ...newGame(), place }, ...flags);

describe('places and exits (AC-15)', () => {
  it('has the 23 places of the plan (the music corner and the dining room are one place)', () => {
    expect(PLACES).toHaveLength(23);
    expect(new Set(PLACES).size).toBe(23);
    expect(PLACES).not.toContain('dining');
  });

  it('exits lead exactly where the canonical table says', () => {
    for (const place of PLACES) {
      const to = EXITS.filter((e) => e.place === place).map((e) => e.to);
      expect([place, [...to].sort()]).toEqual([place, [...CANONICAL[place]].sort()]);
    }
  });

  it('guarded rooms are entered through the doors of the corridors', () => {
    for (const [id, room] of Object.entries(DOORS)) {
      const h = HOTSPOTS.find((x) => x.id === id);
      expect(h?.door).toBe(room);
      expect(h?.place).toBe(room === 'office' ? 'corridor0' : 'landing');
    }
  });

  it('the landing doors are in the PRD order from the stairs', () => {
    const order = ['landing.toWc', 'landing.julienDoor', 'landing.toBathroom', 'landing.theoDoor', 'landing.florentDoor', 'landing.parentsDoor'];
    const xs = order.map((id) => (EXITS.find((e) => e.id === id) ?? HOTSPOTS.find((h) => h.id === id))!.rect.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    const corridor = ['corridor0.toWc', 'corridor0.officeDoor', 'corridor0.toUtility', 'corridor0.toGarage'];
    const cx = corridor.map((id) => (EXITS.find((e) => e.id === id) ?? HOTSPOTS.find((h) => h.id === id))!.rect.x);
    expect([...cx].sort((a, b) => a - b)).toEqual(cx);
  });

  it('the front door opens only after E01, the bay window only from the living room, the hatch from below once unblocked', () => {
    const ids = (s: GameState) => exitsIn(s).map((e) => e.id);
    expect(ids(at('front'))).not.toContain('front.toHall');
    expect(ids(at('front', 'door_unlocked'))).toContain('front.toHall');
    expect(ids(at('pool'))).not.toContain('pool.toLiving');
    expect(ids(at('living'))).not.toContain('living.toPool');
    const refused = interact(at('pool'), { kind: 'verb', verb: 'use', target: 'pool.bay' });
    expect(refused.beats).toContainEqual({ type: 'say', speaker: 'hero', key: 'line.bayLocked' });
    expect(refused.state.flags.bay_open).toBeUndefined();
    const opened = interact(at('living'), { kind: 'verb', verb: 'use', target: 'living.bay' }).state;
    expect(ids(opened)).toContain('living.toPool');
    expect(ids({ ...opened, place: 'pool' })).toContain('pool.toLiving');
    expect(ids(at('cellar'))).not.toContain('cellar.toGarage');
    expect(ids(at('cellar', 'hatch_open'))).toContain('cellar.toGarage');
    expect(ids(at('garage'))).toContain('garage.toCellar');
  });

  it('the side gates close the garden side until the gate key opens them, for good (AC-53)', () => {
    const ids = (s: GameState) => exitsIn(s).map((e) => e.id);
    for (const [place, exit] of [['front', 'front.toFootball'], ['front', 'front.toPool'], ['football', 'football.toFront'], ['pool', 'pool.toFront']] as const) {
      expect(ids(at(place))).not.toContain(exit);
      expect(ids(at(place, 'gates_open'))).toContain(exit);
    }
    // From inside, the bay window still leads to the garden side.
    expect(ids(at('living', 'bay_open'))).toContain('living.toPool');
  });

  it('the secret laundry is reachable only from the attic, once the secret door is open', () => {
    const into = EXITS.filter((e) => e.to === 'laundry');
    expect(into.map((e) => e.place)).toEqual(['attic']);
    expect(exitsIn(at('attic')).map((e) => e.to)).not.toContain('laundry');
    expect(exitsIn(at('attic', 'door_revealed', 'secret_open')).map((e) => e.to)).toContain('laundry');
  });

  it('every exit spawns the hero on the floor of its destination and every "at" point is walkable', () => {
    for (const e of EXITS) {
      expect([e.id, pointInPolygon(e.spawn, FLOORS[e.to])]).toEqual([e.id, true]);
      expect([e.id, pointInPolygon(e.at, FLOORS[e.place])]).toEqual([e.id, true]);
    }
    for (const h of HOTSPOTS) expect([h.id, pointInPolygon(h.at, FLOORS[h.place])]).toEqual([h.id, true]);
  });
});

describe('hotspots and tap sizes (AC-19)', () => {
  it('every hotspot, exit and inventory slot is at least 22x22 logical px and inside the scene', () => {
    const rects = [...HOTSPOTS.map((h) => [h.id, h.rect] as const), ...EXITS.map((e) => [e.id, e.rect] as const)];
    for (const [id, r] of rects) {
      expect([id, r.w >= MIN_TAP && r.h >= MIN_TAP]).toEqual([id, true]);
      expect([id, r.x >= 0 && r.y >= 0 && r.x + r.w <= SCENE_W && r.y + r.h <= ROOM_H]).toEqual([id, true]);
    }
    for (let i = 0; i < SLOTS; i++) {
      const r = slotRect(i);
      expect(r.w).toBeGreaterThanOrEqual(MIN_TAP);
      expect(r.x + r.w).toBeLessThanOrEqual(NOTEBOOK_BUTTON.x);
    }
    expect(NOTEBOOK_BUTTON.x + NOTEBOOK_BUTTON.w).toBeLessThanOrEqual(MENU_BUTTON.x);
  });

  it('richer rooms: at least 5 hotspots, 2 of them more than a look line; corridors 3; the attic 8', () => {
    for (const place of PLACES) {
      const here = HOTSPOTS.filter((h) => h.place === place);
      const active = here.filter((h) => h.door || h.verbs.some((v) => v === 'take' || v === 'use')).length;
      const min = place === 'attic' ? 8 : place === 'corridor0' || place === 'landing' ? 3 : 5;
      expect([place, here.length >= min]).toEqual([place, true]);
      if (min === 5) expect([place, active >= 2]).toEqual([place, true]);
    }
  });

  it('a 360 dp-high landscape screen gives at least 2 dp per logical px', () => {
    const t = sceneTransform(780, 360);
    expect(t.scale).toBeGreaterThanOrEqual(2);
    const r = toScreenRect(t, { x: 10, y: 10, w: MIN_TAP, h: MIN_TAP });
    expect(r.w).toBeGreaterThanOrEqual(44);
    expect(toLogical(t, r.x, r.y)).toEqual({ x: 10, y: 10 });
  });

  it('the inventory band pages when more items are held than slots fit', () => {
    const nine = ['key', 'pole', 'extension', 'sticks', 'queen', 'booklet', 'oring', 'wrench', 'pliers'] as const;
    expect(inventoryPage(nine, 0)).toEqual({ items: [...nine], pages: 1, page: 0 });
    const eleven = [...nine, 'detergent', 'bar'] as const;
    const first = inventoryPage(eleven, 0);
    expect(first.items).toHaveLength(SLOTS - 1);
    expect(first.pages).toBe(2);
    expect(inventoryPage(eleven, 1).items).toEqual(['pliers', 'detergent', 'bar']);
    expect(inventoryPage(eleven, 2).page).toBe(0);
  });
});
