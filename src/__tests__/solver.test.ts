// T-11 / T-35 (AC-31): exhaustive exploration of the story graph from a new game, timers included. From every
// reachable state the ending stays reachable, no needed item is removed early and no puzzle is solved before the
// ones it depends on. The search (src/game/explore.ts) prunes inputs that cannot change the story and reduces the
// side systems (gates, dough, cellar, breaker, Papa's doorbell phases, the hose, the delivery, the items taken on the
// way, the pieces put together); the "reduction" tests below check each of those claims on a regular sample of the
// explored states. Takes several minutes.
import {
  actionInputs,
  allInputs,
  canFinish,
  exploreStory,
  deliver,
  fire,
  isSideInput,
  LAZY_ITEMS,
  lazyItem,
  mixDough,
  PART_GROUPS,
  REDUCED_ITEMS,
  StoryGraph,
  storyKey,
  timerSteps,
  unstick,
} from '../game/explore';
import { hasLine } from '../content/index';
import { interact, playAll } from '../game/rules';
import { DICTIONARIES, LANGUAGES } from '../i18n';
import { CharacterStates, Flag, GameState, Input } from '../game/types';
import { exitsIn, hotspotsIn, ITEMS } from '../game/world';

jest.setTimeout(3_600_000);

// PRD "Dependencies": each puzzle with the puzzles that must be solved before it (E07 and E14 also need E16 or E19).
const DEPENDS: Record<number, number[]> = {
  2: [1],
  3: [1],
  16: [1],
  17: [1],
  18: [1],
  19: [1],
  4: [2],
  5: [4],
  6: [5],
  7: [6],
  8: [3, 17, 31],
  9: [8],
  10: [9, 17],
  14: [2],
  11: [14],
  12: [10, 11, 7],
  13: [12, 21, 29],
  20: [10],
  21: [20],
  22: [17],
  23: [7],
  24: [23],
  25: [7, 22],
  26: [24, 31],
  27: [26],
  28: [25, 27],
  29: [28],
  30: [19, 24],
  31: [3],
};

const has = (s: GameState, i: GameState['inventory'][number]) => s.inventory.includes(i);
// An item taken and no longer held must have been used by its own puzzle.
const USED: [Flag, (s: GameState) => boolean][] = [
  ['key_taken', (s) => s.flags.door_unlocked === true || has(s, 'key')],
  ['gatekey_taken', (s) => s.flags.gates_open === true || has(s, 'gatekey')],
  ['pole_taken', (s) => has(s, 'pole') || has(s, 'longpole') || s.flags.ball_freed === true],
  ['extension_taken', (s) => has(s, 'extension') || has(s, 'longpole') || s.flags.ball_freed === true],
  ['sticks_taken', (s) => has(s, 'sticks') || s.cuts.includes('cut05')],
  ['queen_taken', (s) => has(s, 'queen') || s.flags.queen_placed === true],
  ['booklet_taken', (s) => has(s, 'booklet') || s.flags.cube_solved === true],
  ['detergent_taken', (s) => has(s, 'detergent') || s.flags.machine_running === true || s.flags.machine_done === true],
  ['oring_taken', (s) => has(s, 'oring') || s.flags.oring_fitted === true],
  ['wrench_taken', (s) => has(s, 'wrench') || s.flags.wrench_used === true],
  ['pliers_taken', (s) => has(s, 'pliers') || s.flags.plug_fixed === true],
  ['thinner_taken', (s) => has(s, 'thinner') || s.flags.door_revealed === true],
  ['bar_taken', (s) => has(s, 'bar') || s.flags.hatch_open === true],
  ['milk_taken', (s) => has(s, 'ricemilk') || s.flags.milk_in === true],
  ['flours_taken', (s) => (has(s, 'chestnut') || s.flags.chestnut_in === true) && (has(s, 'riceflour') || s.flags.riceflour_in === true)],
  ['safe_open', (s) => (has(s, 'oldkey') || s.flags.lab_lock === true) && (has(s, 'scrap') || s.flags.frag1_in === true) && has(s, 'photo') && has(s, 'note')],
  ['sardines_taken', (s) => has(s, 'sardines') || s.flags.cat_fed === true],
  ['keyring_taken', (s) => has(s, 'keyring') || s.flags.drawer_open === true],
  ['patches_taken', (s) => has(s, 'patches') || s.flags.patches_in === true],
  ['magnet_ready', (s) => has(s, 'magnetPlug')],
  ['parcel_taken', (s) => (has(s, 'tonka') || s.flags.tonka_in === true) && (has(s, 'pump') || s.flags.pump_in === true)],
  ['bottles_done', (s) => has(s, 'scrap2') || s.flags.frag2_in === true],
  ['trunk_open', (s) => has(s, 'scrap3') || s.flags.frag3_in === true],
];

const SAMPLE_EVERY = 31;
const clean = (flags: GameState['flags']) => Object.fromEntries(Object.entries(flags).filter(([, x]) => x)) as GameState['flags'];
const withChars = (s: GameState, patch: Partial<CharacterStates>): GameState => ({ ...s, chars: { ...s.chars, ...patch } });
// An input as the search plays it: the items taken on the way first.
const after = (s: GameState, input: Input) => interact(lazyItem(s, input), input);
const isMove = (s: GameState, input: Input) =>
  input.kind === 'exit' || (input.kind === 'verb' && input.verb === 'use' && hotspotsIn(s).some((h) => h.door && h.id === input.target));
const moves = (s: GameState): Input[] => [
  ...exitsIn(s).map((e): Input => ({ kind: 'exit', exit: e.id })),
  ...hotspotsIn(s)
    .filter((h) => h.door)
    .map((h): Input => ({ kind: 'verb', verb: 'use', target: h.id })),
];
// The story part after the cellar escape (a capture into the stuck cellar is explored after it).
const settled = (s: GameState) => storyKey(unstick(s).state);
// The items taken on the way (hair dryer, sardines, keyring) put in the pocket while they are still to be taken.
const withLazy = (s: GameState): GameState => {
  const extra = (Object.keys(LAZY_ITEMS) as GameState['inventory']).filter((i) => !s.flags[LAZY_ITEMS[i]!]);
  return { ...s, inventory: [...s.inventory, ...extra], flags: { ...s.flags, ...Object.fromEntries(extra.map((i) => [LAZY_ITEMS[i], true])) } };
};

describe('story graph (AC-31)', () => {
  const spoken = new Set<string>();
  const problems: string[] = [];
  const samples: GameState[] = [];
  let count = 0;
  let graph: StoryGraph;

  beforeAll(() => {
    graph = exploreStory((s) => {
      count++;
      if (count % SAMPLE_EVERY === 0) samples.push(s);
      if (new Set(s.inventory).size !== s.inventory.length || !s.inventory.every((i) => ITEMS.includes(i))) problems.push(`bad inventory ${s.inventory}`);
      for (const [flag, ok] of USED) if (s.flags[flag] && !ok(s)) problems.push(`${flag} lost: ${storyKey(s)}`);
      for (const n of s.solved) for (const d of DEPENDS[n] ?? []) if (!s.solved.includes(d)) problems.push(`E${n} before E${d}: ${storyKey(s)}`);
      if (s.solved.includes(7) && !s.solved.includes(16) && !s.solved.includes(19)) problems.push(`E07 before E16/E19: ${storyKey(s)}`);
      if (s.solved.includes(14) && !s.solved.includes(16) && !s.solved.includes(19) && !s.solved.includes(27)) problems.push(`E14 before E16/E19/E27 (the pliers are in the office): ${storyKey(s)}`);
      if (s.solved.includes(28) && !s.flags.dad_wary) problems.push(`E28 before Papa is wary: ${storyKey(s)}`);
      // Only the reunion ends the game, once the recipe is complete and the tonka bean is in the dough: in the lab or the kitchen.
      if (s.finished && !(s.solved.includes(13) && s.solved.includes(30) && (s.place === 'laundry' || s.place === 'kitchen'))) problems.push(`ended elsewhere: ${storyKey(s)}`);
    });
  });

  it('explores a finite graph that contains the ending', () => {
    expect(graph.nodes.size).toBeGreaterThan(1000);
    expect([...graph.nodes.values()].some(Boolean)).toBe(true);
  });

  it('from every reachable state the ending remains reachable (no dead end)', () => {
    const ok = canFinish(graph);
    const stuck = [...graph.nodes.keys()].filter((k) => !ok.has(k));
    expect(stuck.slice(0, 5)).toEqual([]);
  });

  it('no needed item is ever removed early and every puzzle comes after the ones it depends on', () => {
    expect(problems.slice(0, 10)).toEqual([]);
  });

  describe('pruning and reduction claims, checked on a sample of the explored states', () => {
    const live = () => samples.filter((s) => !s.finished);

    it('looks (except the painting), listening at doors, gags, item looks and item pairs without a rule never change the story', () => {
      const pruned: string[] = [];
      expect(samples.length).toBeGreaterThan(1000);
      for (const s of samples) {
        const tried = actionInputs(s);
        const triedIds = new Set(tried.map((i) => JSON.stringify(i)));
        // A pruned input may only keep the story or land where a tried input lands (the reversed combination).
        const allowed = new Set([storyKey(s), ...tried.map((i) => storyKey(after(s, i).state))]);
        for (const input of allInputs(s)) {
          const o = after(s, input);
          for (const b of o.beats) if (b.type === 'say') spoken.add(b.key);
          if (isMove(s, input) || triedIds.has(JSON.stringify(input)) || isSideInput(input)) continue;
          if (input.kind === 'tick' || input.kind === 'wait') continue; // timers: checked below
          if (o.accepted && !allowed.has(storyKey(o.state))) pruned.push(`pruned input changes the story: ${JSON.stringify(input)}`);
        }
      }
      expect(pruned.slice(0, 5)).toEqual([]);
    });

    it('the side inputs only change their own side system (gates, dough, cellar, breaker, doorbell)', () => {
      const wrong: string[] = [];
      for (const s of live()) {
        const bay = storyKey({ ...s, flags: { ...s.flags, bay_open: true } });
        const dough = mixDough(s);
        for (const input of allInputs(s)) {
          if (!isSideInput(input)) continue;
          const o = after(s, input);
          if (!o.accepted) continue;
          const k = storyKey(o.state);
          if (input.kind === 'verb' && (input.target === 'front.bell' || input.target === 'pool.tap')) {
            // Ringing or the hose: only Papa or Maman, the timers and E16 / E22 change (see hoseSteps).
            const back = { ...o.state, chars: s.chars, timers: s.timers, solved: s.solved };
            if (storyKey(back) !== storyKey(s)) wrong.push(`${input.target} changes more: ${JSON.stringify(input)}`);
            continue;
          }
          // The power cut: only Papa, his timer and E27 change (see fuseSteps).
          if (input.kind === 'item' && input.target === 'florent.strip' && storyKey({ ...o.state, chars: s.chars, timers: s.timers, solved: s.solved }) === storyKey(s)) continue;
          // The basket gives the drawer key and solves E25 (the key is taken on the way, see lazyItem).
          if (input.kind === 'verb' && input.target === 'garden.basket' && storyKey({ ...o.state, solved: s.solved }) === storyKey(s)) continue;
          // A piece put in alone: checked with the pieces below.
          if (input.kind === 'item' && PART_GROUPS.some((g) => g.target === input.target && g.items.includes(input.item))) continue;
          if (k === storyKey(s) || k === bay || (dough && k === storyKey(dough))) continue;
          wrong.push(`side input changes the story: ${JSON.stringify(input)} at ${s.place}`);
        }
      }
      expect(wrong.slice(0, 5)).toEqual([]);
    });

    it('the reduced flags and items never change what the story inputs do', () => {
      const differs: string[] = [];
      for (const s of live()) {
        const toggled = (f: Flag): GameState => ({ ...s, flags: clean({ ...s.flags, [f]: s.flags[f] ? undefined : true }) });
        const variants: GameState[] = [
          { ...s, captures: s.captures + 3 },
          // The garden side open by the gates instead of the bay window (or the other way round).
          s.flags.bay_open || s.flags.gates_open ? { ...s, flags: clean({ ...s.flags, gates_open: !s.flags.gates_open || undefined, bay_open: !s.flags.bay_open || undefined }) } : s,
          toggled('wc_wet'),
          // The hatch unblocked (with the bar used) or not.
          s.flags.hatch_open
            ? { ...s, flags: clean({ ...s.flags, hatch_open: undefined, bar_taken: undefined }), solved: s.solved.filter((n) => n !== 15) }
            : { ...s, flags: { ...s.flags, hatch_open: true, bar_taken: true }, inventory: s.inventory.filter((i) => i !== 'bar') },
          // The breaker on or off (only the washing machine reads it).
          toggled('power_on'),
          // A gate key and dough ingredients in the pocket, half of them in the food processor.
          { ...s, inventory: [...s.inventory.filter((i) => !REDUCED_ITEMS.includes(i)), 'gatekey', 'ricemilk'], flags: { ...s.flags, gatekey_taken: true, milk_taken: true, flours_taken: true, chestnut_in: true, riceflour_in: true } },
          // The items taken on the way already in the pocket (when still to be taken).
          withLazy(s),
          // The first power cut already done (only Papa's line differs).
          toggled('fuses_cut'),
        ];
        for (const input of actionInputs(s)) {
          if (input.kind === 'verb' && (input.target === 'pool.bay' || input.target === 'living.bay')) continue;
          if (input.kind === 'item' && input.target === 'utility.machine') continue; // the breaker: see machineSteps
          if (input.kind === 'verb' && input.target === 'kitchen.robot') continue; // the half-filled processor answers another line
          if (input.kind === 'verb' && input.target === 'pool.tap') continue; // the hose: see hoseSteps
          const ref = after(s, input);
          for (const v of variants) {
            const o = after(v, input);
            if (o.accepted !== ref.accepted || settled(o.state) !== settled(ref.state)) differs.push(`variant differs on ${JSON.stringify(input)} at ${s.place}`);
          }
        }
      }
      expect(differs.slice(0, 5)).toEqual([]);
    });

    it('while Papa answers the door, the story goes on exactly as when he is at his desk', () => {
      const differs: string[] = [];
      const desk = live().filter((s) => s.chars.dad === 'at_desk' && s.flags.door_unlocked);
      expect(desk.length).toBeGreaterThan(100);
      const asDesk = (x: GameState) => storyKey(x.chars.dad === 'answering' ? withChars(x, { dad: 'at_desk' }) : x);
      for (const s of desk) {
        const answering: GameState = { ...withChars(s, { dad: 'answering' }), timers: { ...s.timers, dad: s.clock + 60_000 } };
        for (const input of [...actionInputs(s), ...moves(s)]) {
          const ref = after(s, input);
          const o = after(answering, input);
          if (o.accepted !== ref.accepted || asDesk(unstick(o.state).state) !== settled(ref.state)) differs.push(`answering differs on ${JSON.stringify(input)} at ${s.place}`);
        }
      }
      expect(differs.slice(0, 5)).toEqual([]);
    });

    it('while Papa is away from his desk, only his office opens (and the place he went to closes): elsewhere the story goes on as at his desk', () => {
      const differs: string[] = [];
      const desk = live().filter((s) => s.chars.dad === 'at_desk' && s.flags.door_unlocked && !['office', 'front', 'kitchen', 'garage', 'corridor0', 'hall', 'music'].includes(s.place));
      expect(desk.length).toBeGreaterThan(100);
      const asDesk = (x: GameState) => storyKey(['outside', 'returning', 'cooking', 'fuses'].includes(x.chars.dad) ? { ...withChars(x, { dad: 'at_desk' }), timers: { ...x.timers, dad: null } } : x);
      for (const s of desk) {
        for (const dad of ['outside', 'returning', 'cooking', 'fuses'] as const) {
          const away: GameState = { ...withChars(s, { dad }), timers: { ...s.timers, dad: s.clock + 60_000 } };
          for (const input of [...actionInputs(s), ...moves(s)]) {
            const ref = after(s, input);
            const o = after(away, input);
            if (o.accepted !== ref.accepted || asDesk(unstick(o.state).state) !== settled(ref.state)) differs.push(`${dad} differs on ${JSON.stringify(input)} at ${s.place}`);
          }
        }
      }
      expect(differs.slice(0, 5)).toEqual([]);
    });

    it('what can be done while the dough rests can also be done once Papa cooks (except ringing)', () => {
      const differs: string[] = [];
      let checked = 0;
      for (const s of live()) {
        if (s.place === 'kitchen' || s.flags.dough_mixed || s.chars.dad === 'cooking') continue;
        const resting: GameState = {
          ...s,
          flags: { ...s.flags, dough_mixed: true, milk_taken: true, flours_taken: true, milk_in: true, chestnut_in: true, riceflour_in: true },
          inventory: s.inventory.filter((i) => !['ricemilk', 'chestnut', 'riceflour'].includes(i)),
          timers: { ...s.timers, dough: s.clock + 60_000 },
          solved: [...s.solved, 19],
        };
        const cooked = fire(resting, 'dough').state;
        for (const input of actionInputs(resting)) {
          const during = after(resting, input);
          // Reaching the ending first leaves nothing to commute with.
          if (!during.accepted || storyKey(during.state) === storyKey(resting) || during.state.finished) continue;
          checked++;
          const later = fire(during.state, 'dough').state;
          const instead = after(cooked, input);
          if (!instead.accepted || settled(instead.state) !== settled(later)) differs.push(`dough does not commute with ${JSON.stringify(input)} at ${s.place}`);
        }
      }
      expect(checked).toBeGreaterThan(100);
      expect(differs.slice(0, 5)).toEqual([]);
    });

    it('stuck in the cellar, what changes the story can also be done after the escape, and the timers commute with it', () => {
      const differs: string[] = [];
      for (const s of live()) {
        const stuck: GameState = { ...s, place: 'cellar', flags: clean({ ...s.flags, hatch_open: undefined, bar_taken: undefined }), inventory: s.inventory.filter((i) => i !== 'bar') };
        const out = unstick(stuck).state;
        for (const input of allInputs(stuck)) {
          if (isSideInput(input) || input.kind === 'tick' || input.kind === 'wait') continue;
          const o = after(stuck, input);
          if (!o.accepted || storyKey(o.state) === storyKey(stuck)) continue;
          const later = after(out, input);
          if (!later.accepted || settled(o.state) !== storyKey(later.state)) differs.push(`stuck: ${JSON.stringify(input)} does not commute with the escape`);
        }
        const fireThenOut = timerSteps(stuck).map((t) => settled(t.state)).sort();
        const outThenFire = timerSteps(out).map((t) => settled({ ...t.state, place: 'cellar' })).sort();
        if (JSON.stringify(fireThenOut) !== JSON.stringify(outThenFire)) differs.push(`timers do not commute with the cellar escape`);
      }
      expect(differs.slice(0, 5)).toEqual([]);
    });

    it('while Maman changes after the hose, only the garden opens and her room closes: elsewhere the story goes on as when she gardens', () => {
      const differs: string[] = [];
      const gardening = live().filter((s) => s.chars.mom === 'gardening');
      expect(gardening.length).toBeGreaterThan(100);
      const asGardening = (x: GameState) => storyKey(x.chars.mom === 'changing' ? withChars(x, { mom: 'gardening' }) : x);
      for (const s of gardening) {
        if (s.place === 'garden' || s.place === 'parents' || s.place === 'football' || s.place === 'landing') continue;
        const changing: GameState = { ...withChars(s, { mom: 'changing' }), timers: { ...s.timers, mom: s.clock + 60_000 } };
        for (const input of [...actionInputs(s), ...moves(s)]) {
          if (input.kind === 'verb' && input.target === 'pool.tap') continue;
          const ref = after(s, input);
          const o = after(changing, input);
          if (o.accepted !== ref.accepted || asGardening(unstick(o.state).state) !== settled(ref.state)) differs.push(`changing differs on ${JSON.stringify(input)} at ${s.place}`);
        }
      }
      expect(differs.slice(0, 5)).toEqual([]);
    });

    it('a parcel on its way changes nothing but its delivery: what can be done meanwhile can be done once delivered', () => {
      const differs: string[] = [];
      let checked = 0;
      for (const s of live()) {
        if (!s.flags.delivered || s.flags.cat_fed || s.place === 'garden') continue;
        const pending: GameState = {
          ...s,
          flags: clean({ ...s.flags, delivered: undefined }),
          notes: s.notes.filter((n) => n !== 'n16'),
          unread: s.unread.filter((n) => n !== 'n16'),
          cuts: s.cuts.filter((c) => c !== 'cut13'),
          timers: { ...s.timers, delivery: s.clock + 60_000 },
        };
        for (const input of [...actionInputs(pending), ...moves(pending)]) {
          const o = after(pending, input);
          if (!o.accepted) continue;
          checked++;
          const ref = after(s, input);
          if (!ref.accepted || settled(deliver(o.state).state) !== settled(ref.state)) differs.push(`pending delivery differs on ${JSON.stringify(input)} at ${s.place}`);
        }
      }
      expect(checked).toBeGreaterThan(50);
      expect(differs.slice(0, 5)).toEqual([]);
    });

    it('a piece put in alone only waits for the others: putting them all in, in any order, ends the same', () => {
      const differs: string[] = [];
      for (const g of PART_GROUPS) {
        const s = live().find((x) => g.items.every((i) => x.inventory.includes(i)) || g.items.some((i) => x.inventory.includes(i)));
        const base: GameState = { ...(s ?? live()[0]), place: g.target === 'garage.bike' ? 'garage' : 'laundry', inventory: [...g.items], flags: { door_unlocked: true, secret_open: true } };
        const orders = g.items.length === 2 ? [[0, 1], [1, 0]] : [[0, 1, 2], [2, 1, 0], [1, 2, 0]];
        const ends = orders.map((o) => storyKey(playAll(base, o.map((i) => ({ kind: 'item', item: g.items[i], target: g.target }))).state));
        if (new Set(ends).size !== 1) differs.push(`${g.target}: the order matters`);
        for (const i of g.items) {
          const alone = after(base, { kind: 'item', item: i, target: g.target });
          if (alone.events.length || alone.state.finished) differs.push(`${g.target}: ${i} alone does more than wait`);
        }
      }
      expect(differs).toEqual([]);
    });

    // After the pruning checks, which also collect the lines of every input tried on the samples.
    it.each(LANGUAGES)('every line any explored interaction says exists in %s (AC-45)', (language) => {
      for (const b of graph.beats) if (b.type === 'say') spoken.add(b.key);
      expect(spoken.size).toBeGreaterThan(300);
      expect([...spoken].filter((k) => !hasLine(DICTIONARIES[language], k))).toEqual([]);
    });
  });
});
