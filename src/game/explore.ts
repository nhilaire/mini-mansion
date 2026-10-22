// Exhaustive exploration of the story state graph from a new game (PRD AC-31), shared by the solver tests.
//
// A plain search over (place x story) explodes (more than 2 million states: 23 places times every order of picking
// up items). The search is therefore done on story nodes, with a sound reduction:
// - the story part of a state is everything that can change what happens next: inventory, flags, character states
//   (Papa's doorbell phases included), whether the dough timer runs, the notebook entries that gate something (the
//   three codes), cutscenes, solved puzzles and the end. Position, the timer clock and deadlines,
//   the capture count, the wrong-line rotation, the tutorial, play time and the purely informative notebook entries
//   are left out;
// - two side systems are reduced, each claim being checked by tests on the sampled states:
//   - the side gates (E18) only connect the front to the garden side, as the bay window does: the story part keeps
//     one "garden side open" bit, and the gate key and the gate inputs are not explored;
//   - the dough (E19) is explored as one step (see doughSteps): the three ingredients put in the food processor,
//     the hero walks anywhere in the component, Papa arrives in the kitchen. The ingredients and the half-filled
//     processor change nothing else, and what can be done while the dough rests can also be done once Papa cooks
//     (he only takes the kitchen, where nothing is left to do, and frees his office), except ringing, which can
//     be done before mixing;
//   - stuck in the cellar (hatch not unblocked yet), the only story steps are taking the iron bar and unblocking the
//     hatch, which commute with the timers (nobody guards the cellar): a state that gets stuck is explored after
//     those two steps (see unstick). Once the hatch is unblocked, nothing but the cellar's own access depends on it
//     (a later capture says another line), so the hatch, the iron bar and E15 are left out of the story part too;
//   - the circuit breaker only matters to the washing machine: it is explored together with starting the machine
//     (see machineSteps), and left out of the story part;
// - the timers are explored by firing each running timer next (whatever the deadlines), which covers every order
//   a player can obtain by choosing when to ring and when to mix. Papa's doorbell phases are reduced to two: while
//   he answers he still guards his office, so the story goes on exactly as at his desk (an action done then can be
//   done before ringing); on his way back he guards nothing, as outside except the front (where nothing but the
//   reduced gates happens). The doorbell is therefore explored as one step (see bellSteps: ring, walk anywhere in
//   the component, Papa comes out) and his way back as one step (the two timers in a row);
// - moving (an exit or a door) that leaves the story part unchanged is a free move: all places reachable by free
//   moves form one component, and a node is (story part, component). The story part says when the hero is stuck in
//   the cellar (hatch not unblocked), so free moves are always reversible. Every input is tried from every place of
//   the component; moves that change the story (an inhabitant going back, the washing machine's end) are ordinary
//   transitions.
// So every reachable concrete state belongs to exactly one explored node and every input from it is tried.
import { SOLUTION_MOVES } from './chess';
import { CODES, GAGS, interact, newGame, playAll, USE_RULES } from './rules';
import { Beat, Flag, GameState, Input, ItemId, KeypadId, NoteId } from './types';
import { exitsIn, hotspotsIn } from './world';

// Notebook entries that change the rules: the keypads only open once their code is noted.
const GATING_NOTES: readonly NoteId[] = ['n08', 'n10', 'n11'];
const KEYPADS: readonly KeypadId[] = ['computer', 'safe', 'lab'];

// Flags and items left out of the story part (see above): connectivity flags (replaced by one bit), the gate key,
// the dough ingredients and the wet toilet floor (only drawn).
export const REDUCED_FLAGS: readonly Flag[] = [
  'bay_open',
  'gates_open',
  'gatekey_taken',
  'wc_wet',
  'fridge_open',
  'milk_taken',
  'flours_taken',
  'milk_in',
  'chestnut_in',
  'riceflour_in',
  'hatch_open',
  'bar_taken',
  'power_on',
];
export const REDUCED_ITEMS: readonly ItemId[] = ['gatekey', 'ricemilk', 'chestnut', 'riceflour', 'bar'];
export const REDUCED_PUZZLES: readonly number[] = [15, 18];
// Inputs of the reduced side systems, not explored one by one.
export const GATE_TARGETS: readonly string[] = ['front.gateLeft', 'front.gateRight', 'football.gate', 'pool.gate'];
export const BELL = 'front.bell';
export const SIDE_TAKES: readonly string[] = ['hall.shoes', 'kitchen.fridge', 'utility.flours', 'cellar.rack', 'cellar.hatch', 'garage.breaker'];

export function storyKey(s: GameState): string {
  const ch = s.chars;
  return [
    s.inventory
      .filter((i) => !REDUCED_ITEMS.includes(i))
      .sort()
      .join(','),
    (Object.keys(s.flags) as Flag[])
      .filter((f) => !REDUCED_FLAGS.includes(f))
      .sort()
      .join(','),
    s.flags.bay_open || s.flags.gates_open ? 'out' : 'in',
    s.place === 'cellar' && !s.flags.hatch_open ? 'stuck' : '',
    `${ch.dad}${ch.mom}${ch.julien}${ch.florent}${ch.theo}`,
    s.timers.dough !== null ? 'dough' : '',
    s.notes.filter((n) => GATING_NOTES.includes(n)).sort().join(','),
    [...s.cuts].sort().join(','),
    s.solved
      .filter((n) => !REDUCED_PUZZLES.includes(n))
      .sort((a, b) => a - b)
      .join(','),
    s.finished ? 1 : 0,
  ].join('|');
}

function moveInputs(s: GameState): Input[] {
  const out: Input[] = exitsIn(s).map((e) => ({ kind: 'exit', exit: e.id }));
  for (const h of hotspotsIn(s)) if (h.door) out.push({ kind: 'verb', verb: 'use', target: h.id });
  return out;
}

const isMove = (s: GameState, input: Input) =>
  input.kind === 'exit' || (input.kind === 'verb' && input.verb === 'use' && hotspotsIn(s).some((h) => h.door && h.id === input.target));

// Every input that can be tried in a state, all kinds included (used by the pruning tests).
export function allInputs(s: GameState): Input[] {
  const out: Input[] = [];
  for (const h of hotspotsIn(s)) {
    for (const verb of h.verbs) out.push({ kind: 'verb', verb, target: h.id });
    for (const item of s.inventory) out.push({ kind: 'item', item, target: h.id });
  }
  for (const a of s.inventory) for (const b of s.inventory) if (a !== b) out.push({ kind: 'item', item: a, target: `item:${b}` });
  for (const e of exitsIn(s)) out.push({ kind: 'exit', exit: e.id });
  for (const item of s.inventory) out.push({ kind: 'lookItem', item });
  for (const keypad of KEYPADS) out.push({ kind: 'keypad', keypad, code: CODES[keypad] }, { kind: 'keypad', keypad, code: '0000' });
  out.push({ kind: 'chess', moves: [...SOLUTION_MOVES] }, { kind: 'wait' }, { kind: 'tick', ms: 1000 });
  return out;
}

// Whether an input belongs to a reduced side system (the gates, the dough ingredients).
export function isSideInput(input: Input): boolean {
  if (input.kind === 'verb') return SIDE_TAKES.includes(input.target) || GATE_TARGETS.includes(input.target) || input.target === BELL;
  if (input.kind === 'item') return REDUCED_ITEMS.includes(input.item) || input.target.startsWith('item:') && REDUCED_ITEMS.includes(input.target.slice(5) as ItemId);
  return false;
}

// The non-move inputs the search tries. Pruned (each pruning is proven by a test on every sample state): item pairs
// without a rule only answer a wrong line, looking at an item, listening at a door and the gags only say lines; the combination
// of the pole and its extension is the only item-on-item rule; the side systems are explored by sideSteps.
// Looking only says a line, except at the painting, which reveals the safe.
export const STORY_LOOKS: readonly string[] = ['parents.painting'];

export function actionInputs(s: GameState): Input[] {
  const out: Input[] = [];
  for (const h of hotspotsIn(s)) {
    for (const verb of h.verbs) {
      if (h.door && verb === 'use') continue;
      if (verb === 'listen') continue;
      if (verb === 'look' && !STORY_LOOKS.includes(h.id)) continue;
      if (verb === 'use' && GAGS[h.id]) continue;
      const input: Input = { kind: 'verb', verb, target: h.id };
      if (!isSideInput(input)) out.push(input);
    }
    for (const item of s.inventory) if (USE_RULES.includes(`${item}>${h.id}`) && !REDUCED_ITEMS.includes(item)) out.push({ kind: 'item', item, target: h.id });
  }
  if (s.inventory.includes('pole') && s.inventory.includes('extension')) out.push({ kind: 'item', item: 'pole', target: 'item:extension' });
  for (const keypad of KEYPADS) out.push({ kind: 'keypad', keypad, code: CODES[keypad] }, { kind: 'keypad', keypad, code: '0000' });
  out.push({ kind: 'chess', moves: [...SOLUTION_MOVES] });
  return out;
}

// The dough mixed from the kitchen while Papa is not there: the three ingredients put in the food processor.
export function mixDough(s: GameState): GameState | null {
  if (s.place !== 'kitchen' || s.flags.dough_mixed || s.chars.dad === 'cooking') return null;
  const ready: GameState = {
    ...s,
    inventory: [...s.inventory.filter((i) => !REDUCED_ITEMS.includes(i) || i === 'gatekey'), 'ricemilk', 'chestnut', 'riceflour'],
    flags: { ...s.flags, milk_taken: true, flours_taken: true, milk_in: undefined, chestnut_in: undefined, riceflour_in: undefined },
  };
  ready.flags = Object.fromEntries(Object.entries(ready.flags).filter(([, v]) => v)) as GameState['flags'];
  const items = ['ricemilk', 'chestnut', 'riceflour'] as const;
  return playAll(ready, items.map((item) => ({ kind: 'item', item, target: 'kitchen.robot' }))).state;
}

// Fires one running timer now, whatever the deadlines (the other one is pushed after it).
export function fire(s: GameState, timer: 'dad' | 'dough'): { state: GameState; beats: Beat[] } {
  const other = timer === 'dad' ? 'dough' : 'dad';
  const timers = { ...s.timers, [timer]: s.clock, [other]: s.timers[other] === null ? null : s.clock + 1 };
  const o = interact({ ...s, timers }, { kind: 'tick', ms: 0 });
  return { state: o.state, beats: o.beats };
}

// Each running timer fired next. Papa's way back (outside, then returning) is fired in one step.
export function timerSteps(s: GameState): { state: GameState; beats: Beat[] }[] {
  const out: { state: GameState; beats: Beat[] }[] = [];
  if (s.timers.dough !== null) out.push(fire(s, 'dough'));
  if (s.timers.dad !== null) {
    let step = fire(s, 'dad');
    const beats = [...step.beats];
    while (step.state.timers.dad !== null && step.state.chars.dad === 'returning') {
      step = fire(step.state, 'dad');
      beats.push(...step.beats);
    }
    out.push({ state: step.state, beats });
  }
  return out;
}

// The doorbell in one step: rung from the front, then Papa comes out while the hero is at any place of the component
// (members), a capture if it is the front.
export function bellSteps(members: readonly GameState[]): { state: GameState; beats: Beat[] }[] {
  const ringer = members.find((m) => m.place === 'front');
  if (!ringer) return [];
  const rung = interact(ringer, { kind: 'verb', verb: 'use', target: BELL });
  if (rung.state.chars.dad !== 'answering') return [];
  return members.map((m) => {
    const step = fire({ ...rung.state, place: m.place, pos: m.pos, facing: m.facing }, 'dad');
    return { state: step.state, beats: [...rung.beats, ...step.beats] };
  });
}

// The dough in one step: mixed from the kitchen, then Papa arrives while the hero is at any place of the component.
export function doughSteps(members: readonly GameState[]): { state: GameState; beats: Beat[] }[] {
  const cook = members.find((m) => m.place === 'kitchen');
  const mixed = cook && mixDough(cook);
  if (!mixed) return [];
  return members.map((m) => fire({ ...mixed, place: m.place, pos: m.pos, facing: m.facing }, 'dough'));
}

// Out of the cellar when stuck in it: take the iron bar (if it is still in the rack), unblock the hatch.
export function unstick(s: GameState): { state: GameState; beats: Beat[] } {
  if (s.place !== 'cellar' || s.flags.hatch_open) return { state: s, beats: [] };
  const inputs: Input[] = s.flags.bar_taken ? [] : [{ kind: 'verb', verb: 'take', target: 'cellar.rack' }];
  const r = playAll(s, [...inputs, { kind: 'item', item: 'bar', target: 'cellar.hatch' }]);
  return { state: r.state, beats: r.outcomes.flatMap((o) => o.beats) };
}

// The washing machine started from the utility room with the detergent, the breaker switched on first if needed.
export function machineSteps(members: readonly GameState[]): { state: GameState; beats: Beat[] }[] {
  const m = members.find((x) => x.place === 'utility' && x.inventory.includes('detergent') && !x.flags.machine_running && !x.flags.machine_done);
  if (!m) return [];
  const o = interact({ ...m, flags: { ...m.flags, power_on: true } }, { kind: 'item', item: 'detergent', target: 'utility.machine' });
  return [{ state: o.state, beats: o.beats }];
}

// The story transitions of a component that are not a single explored input.
export function sideSteps(members: readonly GameState[]): { state: GameState; beats: Beat[]; label: string }[] {
  return [
    ...members.flatMap((m) => timerSteps(m).map((t) => ({ ...t, label: '(timer)' }))),
    ...bellSteps(members).map((t) => ({ ...t, label: '(bell)' })),
    ...doughSteps(members).map((t) => ({ ...t, label: '(dough)' })),
    ...machineSteps(members).map((t) => ({ ...t, label: '(machine)' })),
  ];
}

interface Component {
  key: string;
  // One concrete state per place of the component.
  members: GameState[];
  // Results of moves that changed the story (leaving the component).
  exits: GameState[];
  beats: Beat[];
}

export interface StoryGraph {
  // Whether each node contains a finished state.
  nodes: Map<string, boolean>;
  edges: Map<string, Set<string>>;
  // Every beat any explored interaction produced (to check that each line exists in every language).
  beats: Beat[];
  // How each node was first reached (for counter-examples).
  parent: Map<string, { from: string; input: Input | string }>;
  samples: number;
}

// onSample is called with every concrete state met (one per place of each node), to check invariants without
// keeping hundreds of thousands of states in memory.
export function exploreStory(onSample: (s: GameState) => void = () => {}, limit = 600_000): StoryGraph {
  const componentOf = new Map<string, Component>();
  const beatKeys = new Set<string>();
  const beats: Beat[] = [];
  const addBeats = (bs: readonly Beat[]) => {
    for (const b of bs) {
      const k = JSON.stringify(b);
      if (!beatKeys.has(k)) {
        beatKeys.add(k);
        beats.push(b);
      }
    }
  };

  // The free-move component of a state: BFS over the moves that keep the story part.
  const component = (s: GameState): Component => {
    const story = storyKey(s);
    const memo = componentOf.get(`${story}@${s.place}`);
    if (memo) return memo;
    const byPlace = new Map([[s.place, s]]);
    const exits: GameState[] = [];
    const queue = [s];
    for (let i = 0; i < queue.length; i++) {
      for (const input of moveInputs(queue[i])) {
        const o = interact(queue[i], input);
        if (!o.accepted) continue;
        addBeats(o.beats);
        if (storyKey(o.state) !== story) exits.push(o.state);
        else if (!byPlace.has(o.state.place)) {
          byPlace.set(o.state.place, o.state);
          queue.push(o.state);
        }
      }
    }
    const places = [...byPlace.keys()].sort();
    const c: Component = { key: `${story}#${places[0]}`, members: [...byPlace.values()], exits, beats: [] };
    for (const place of places) componentOf.set(`${story}@${place}`, c);
    return c;
  };

  const start = component(unstick(newGame()).state);
  const finished = (c: Component) => c.members.some((s) => s.finished);
  const nodes = new Map([[start.key, finished(start)]]);
  const edges = new Map<string, Set<string>>();
  const parent = new Map<string, { from: string; input: Input | string }>();
  let samples = start.members.length;
  start.members.forEach(onSample);
  const queue: (Component | null)[] = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const comp = queue[qi]!;
    queue[qi] = null; // free the explored component
    const next = new Set<string>();
    const visit = (reached: GameState, input: Input | string) => {
      const out = unstick(reached);
      addBeats(out.beats);
      const st = out.state;
      const c = component(st);
      next.add(c.key);
      if (!nodes.has(c.key)) {
        nodes.set(c.key, finished(c));
        parent.set(c.key, { from: comp.key, input });
        samples += c.members.length;
        c.members.forEach(onSample);
        queue.push(c);
        if (nodes.size > limit) throw new Error(`story graph larger than ${limit}`);
      }
    };
    for (const st of comp.exits) visit(st, '(move)');
    for (const step of sideSteps(comp.members)) {
      addBeats(step.beats);
      if (storyKey(step.state) !== storyKey(comp.members[0])) visit(step.state, step.label);
    }
    for (const member of comp.members) {
      for (const input of actionInputs(member)) {
        if (isMove(member, input)) continue;
        const o = interact(member, input);
        if (!o.accepted) continue;
        addBeats(o.beats);
        if (storyKey(o.state) === storyKey(member)) continue; // a look or a refusal: same node
        visit(o.state, input);
      }
    }
    edges.set(comp.key, next);
    // Explored: only its key is needed from now on (the memo still maps its places to it).
    comp.members = [];
    comp.exits = [];
  }
  return { nodes, edges, beats, parent, samples };
}

// Nodes from which the ending can still be reached (backward closure over the edges).
export function canFinish(graph: StoryGraph): Set<string> {
  const reverse = new Map<string, string[]>();
  for (const [k, next] of graph.edges) for (const n of next) (reverse.get(n) ?? reverse.set(n, []).get(n)!).push(k);
  const ok = new Set([...graph.nodes].filter(([, done]) => done).map(([k]) => k));
  const stack = [...ok];
  while (stack.length) {
    const k = stack.pop()!;
    for (const p of reverse.get(k) ?? []) {
      if (!ok.has(p)) {
        ok.add(p);
        stack.push(p);
      }
    }
  }
  return ok;
}
