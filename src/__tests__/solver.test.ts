// T-11 (AC-31): exhaustive exploration of the story graph from a new game. From every reachable state the ending
// stays reachable, no needed item is removed early and no puzzle is solved before the ones it depends on.
// The search (src/game/explore.ts) prunes inputs that cannot change the story; the "pruning" tests below check each
// of those claims on a regular sample of the explored states. Takes about a minute.
import { actionInputs, allInputs, canFinish, exploreStory, StoryGraph, storyKey } from '../game/explore';
import { interact } from '../game/rules';
import { GameState } from '../game/types';
import { ITEMS } from '../game/world';

jest.setTimeout(600_000);

// PRD "Dependencies": each puzzle with the puzzles that must be solved before it.
const DEPENDS: Record<number, number[]> = {
  2: [1],
  3: [1],
  16: [1],
  17: [1],
  4: [2],
  5: [4],
  6: [5],
  7: [6, 16],
  8: [3, 17],
  9: [8],
  10: [9, 17],
  14: [2],
  11: [14],
  12: [10, 11],
  13: [12, 7],
};

// An item taken and no longer held must have been used by its own puzzle.
const USED: [keyof GameState['flags'], (s: GameState) => boolean][] = [
  ['key_taken', (s) => s.flags.door_unlocked === true || s.inventory.includes('key')],
  ['pole_taken', (s) => s.inventory.includes('pole') || s.inventory.includes('longpole') || s.flags.ball_freed === true],
  ['extension_taken', (s) => s.inventory.includes('extension') || s.inventory.includes('longpole') || s.flags.ball_freed === true],
  ['sticks_taken', (s) => s.inventory.includes('sticks') || s.cuts.includes('cut05')],
  ['queen_taken', (s) => s.inventory.includes('queen') || s.flags.queen_placed === true],
  ['booklet_taken', (s) => s.inventory.includes('booklet') || s.flags.cube_solved === true],
  ['detergent_taken', (s) => s.inventory.includes('detergent') || s.flags.machine_running === true || s.flags.machine_done === true],
  ['oring_taken', (s) => s.inventory.includes('oring') || s.flags.oring_fitted === true],
  ['wrench_taken', (s) => s.inventory.includes('wrench') || s.flags.wrench_used === true],
  ['pliers_taken', (s) => s.inventory.includes('pliers') || s.flags.plug_fixed === true],
  ['thinner_taken', (s) => s.inventory.includes('thinner') || s.flags.door_revealed === true],
  ['bar_taken', (s) => s.inventory.includes('bar') || s.flags.shutter_open === true],
  ['safe_open', (s) => (s.inventory.includes('oldkey') || s.flags.secret_open === true) && (s.inventory.includes('scrap') || s.finished) && s.inventory.includes('photo') && s.inventory.includes('note')],
];

const SAMPLE_EVERY = 97;

describe('story graph (AC-31)', () => {
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

  describe('pruning claims, checked on a sample of the explored states', () => {
    it('looks (except the painting), talking, dialogues, item looks and item pairs without a rule never change the story', () => {
      const pruned: string[] = [];
      expect(samples.length).toBeGreaterThan(1000);
      for (const s of samples) {
        const tried = actionInputs(s);
        const triedIds = new Set(tried.map((i) => JSON.stringify(i)));
        // A pruned input may only keep the story or land where a tried input lands (the reversed combination).
        const allowed = new Set([storyKey(s), ...tried.map((i) => storyKey(interact(s, i).state))]);
        for (const input of allInputs(s)) {
          if (input.kind === 'exit' || triedIds.has(JSON.stringify(input))) continue;
          if (input.kind === 'verb' && input.verb === 'use') continue; // door uses are moves, explored as such
          const o = interact(s, input);
          if (o.accepted && !allowed.has(storyKey(o.state))) pruned.push(`pruned input changes the story: ${JSON.stringify(input)}`);
        }
      }
      expect(pruned.slice(0, 5)).toEqual([]);
    });

    it('the capture count and the bay window never change what the story inputs do', () => {
      const differs: string[] = [];
      for (const s of samples) {
        const variants = [
          { ...s, captures: s.captures + 3 },
          { ...s, flags: s.flags.bay_open ? { ...s.flags, bay_open: undefined } : { ...s.flags, bay_open: true as const } },
        ].map((v) => ({ ...v, flags: Object.fromEntries(Object.entries(v.flags).filter(([, x]) => x)) as GameState['flags'] }));
        for (const input of actionInputs(s)) {
          if (input.kind === 'verb' && (input.target === 'pool.bay' || input.target === 'living.bay')) continue;
          const ref = interact(s, input);
          for (const v of variants) {
            const o = interact(v, input);
            if (o.accepted !== ref.accepted || storyKey(o.state) !== storyKey(ref.state)) differs.push(`variant differs on ${JSON.stringify(input)}`);
          }
        }
      }
      expect(differs.slice(0, 5)).toEqual([]);
    });
  });
});
