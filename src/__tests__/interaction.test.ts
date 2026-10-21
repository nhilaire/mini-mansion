// T-04: verbs per hotspot, using / giving / combining items, wrong lines in rotation, looking at items, line timing.
import { WRONG_LINES } from '../game/ctx';
import { GAGS, interact, newGame, USE_RULES } from '../game/rules';
import { GameState, ItemId, PlaceId } from '../game/types';
import { findHotspot, hotspotsIn, HOTSPOTS, ITEMS } from '../game/world';
import { applyTestingLink, lineDurationMs, resetFastModeForTests } from '../testing/fastMode';

const at = (place: PlaceId, inventory: ItemId[] = [], extra: Partial<GameState> = {}): GameState => ({
  ...newGame(),
  place,
  inventory,
  flags: { door_unlocked: true },
  ...extra,
});

// The parts of a state the rules can change (everything but the wrong-line rotation).
const story = (s: GameState) => JSON.stringify({ ...s, wrongIdx: 0 });

describe('action menu verbs (AC-17)', () => {
  it('look is always offered; take, talk and use only where they apply', () => {
    for (const h of HOTSPOTS) expect([h.id, h.verbs.includes('look')]).toEqual([h.id, true]);
    expect(findHotspot(at('front'), 'front.hedge')?.verbs).toEqual(['look']);
    expect(findHotspot(at('front'), 'front.doormat')?.verbs).toEqual(['look', 'take']);
    expect(findHotspot(at('front'), 'front.bell')?.verbs).toEqual(['look', 'use']);
    expect(findHotspot(at('football', [], { chars: { ...newGame().chars, julien: 'football' } }), 'julien')?.verbs).toEqual(['look', 'talk']);
  });

  it('talk is offered on the door of an occupied room only', () => {
    const s = at('landing');
    expect(findHotspot(s, 'landing.julienDoor')?.verbs).toEqual(['look', 'use', 'talk']);
    const away = { ...s, chars: { ...s.chars, julien: 'football' as const } };
    expect(findHotspot(away, 'landing.julienDoor')?.verbs).toEqual(['look', 'use']);
  });

  it('a verb that a hotspot does not offer is rejected without any change', () => {
    const s = at('front');
    const o = interact(s, { kind: 'verb', verb: 'take', target: 'front.hedge' });
    expect(o.accepted).toBe(false);
    expect(o.state).toBe(s);
    expect(interact(s, { kind: 'verb', verb: 'look', target: 'kitchen.oven' }).accepted).toBe(false);
  });
});

describe('items (AC-18)', () => {
  it('a valid use runs its effect', () => {
    const o = interact(at('front', ['key'], { flags: {} }), { kind: 'item', item: 'key', target: 'front.door' });
    expect(o.state.flags.door_unlocked).toBe(true);
    expect(o.state.inventory).toEqual([]);
    expect(o.state.place).toBe('hall');
  });

  it('combines the pole and its extension, in either order', () => {
    for (const [a, b] of [
      ['pole', 'extension'],
      ['extension', 'pole'],
    ] as const) {
      const o = interact(at('garage', [a, b]), { kind: 'item', item: a, target: `item:${b}` });
      expect(o.state.inventory).toEqual(['longpole']);
      expect(o.beats).toContainEqual({ type: 'say', speaker: 'hero', key: 'combine.pole' });
    }
  });

  it('wrong combinations rotate through the 6 generic lines and change nothing else', () => {
    let s = at('front', ['pole', 'sticks']);
    const keys: string[] = [];
    for (let i = 0; i < WRONG_LINES + 1; i++) {
      const o = interact(s, { kind: 'item', item: 'sticks', target: 'front.hedge' });
      expect(o.accepted).toBe(true);
      expect(story(o.state)).toBe(story(s));
      keys.push((o.beats.find((b) => b.type === 'say') as { key: string }).key);
      s = o.state;
    }
    expect(keys).toEqual(['wrong.0', 'wrong.1', 'wrong.2', 'wrong.3', 'wrong.4', 'wrong.5', 'wrong.0']);
    const combo = interact(s, { kind: 'item', item: 'pole', target: 'item:sticks' });
    expect(story(combo.state)).toBe(story(s));
    expect(combo.beats.some((b) => b.type === 'say' && b.key.startsWith('wrong.'))).toBe(true);
  });

  it('an item not held, or combined with itself, is rejected', () => {
    const s = at('front', ['pole']);
    expect(interact(s, { kind: 'item', item: 'key', target: 'front.door' }).accepted).toBe(false);
    expect(interact(s, { kind: 'item', item: 'pole', target: 'item:pole' }).accepted).toBe(false);
  });

  it('every item pair without a rule only answers a wrong line (the search relies on it)', () => {
    // Every hotspot and character, in a state where every hotspot is visible enough to be tried.
    for (const h of HOTSPOTS) {
      const s = at(h.place, [...ITEMS], { flags: { door_unlocked: true, cover_open: true, safe_found: true, door_revealed: true }, chars: { ...newGame().chars, julien: 'football' } });
      if (!hotspotsIn(s).some((x) => x.id === h.id)) continue;
      for (const item of ITEMS) {
        if (USE_RULES.includes(`${item}>${h.id}`)) continue;
        const o = interact(s, { kind: 'item', item, target: h.id });
        expect([`${item}>${h.id}`, story(o.state) === story(s)]).toEqual([`${item}>${h.id}`, true]);
      }
    }
  });

  it('long press on an item looks at it', () => {
    for (const item of ITEMS) {
      const o = interact(at('hall', [item]), { kind: 'lookItem', item });
      expect(o.beats).toEqual([{ type: 'say', speaker: 'hero', key: `item.${item}.look` }]);
    }
  });
});

const heroSays = (line: string) => ({ type: 'say', speaker: 'hero', key: line });

describe('gags (AC-54)', () => {
  it('the Japanese toilet sprays and wets the floor for good; the other gags only answer a line', () => {
    const wc = interact(at('wc0'), { kind: 'verb', verb: 'use', target: 'wc0.toilet' });
    expect(wc.beats).toEqual([
      { type: 'sfx', sfx: 'spray' },
      heroSays('wc0.toilet.use'),
    ]);
    expect(wc.state.flags.wc_wet).toBe(true);
    expect(interact(wc.state, { kind: 'verb', verb: 'look', target: 'wc0.toilet' }).beats).toEqual([heroSays('wc0.toilet.lookWet')]);
    expect(interact(wc.state, { kind: 'verb', verb: 'use', target: 'wc0.toilet' }).beats).toContainEqual(heroSays('wc0.toilet.useAgain'));
    for (const id of Object.keys(GAGS)) {
      if (id === 'wc0.toilet' || id === 'theo.cube') continue;
      const h = HOTSPOTS.find((x) => x.id === id)!;
      const s = at(h.place);
      const o = interact(s, { kind: 'verb', verb: 'use', target: id });
      expect([id, o.beats]).toEqual([id, [{ type: 'sfx', sfx: GAGS[id] }, { type: 'say', speaker: 'hero', key: `${id}.use` }]]);
      expect(story(o.state)).toBe(story(s));
    }
    for (const id of ['music.piano', 'living.tv', 'landing.lamp', 'bathroom.duck']) expect(GAGS[id]).toBeDefined();
  });
});

describe('spoken lines (AC-49)', () => {
  afterEach(resetFastModeForTests);

  it('stay max(2 s, 50 ms x length) unless tapped', () => {
    expect(lineDurationMs('Salut')).toBe(2000);
    expect(lineDurationMs('x'.repeat(100))).toBe(5000);
  });

  it('are short only in the testing fast mode', () => {
    expect(applyTestingLink('https://example.org')).toBe(false);
    expect(applyTestingLink('minimansion://test/fast')).toBe(true);
    expect(lineDurationMs('x'.repeat(100))).toBe(250);
  });
});
