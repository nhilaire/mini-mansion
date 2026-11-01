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
//   - the circuit breaker (and the spare fuse it needs, from the hall cabinet) only matters to the washing machine: it
//     is explored together with starting the machine (see machineSteps), and left out of the story part;
//   - once Charlie has the house key and has been in (E01), the front door that Papa locks again only matters at the
//     door, which the key opens: the lock is left out of the story part;
//   - Théo's electromagnet (its wire, nail, battery and old plug, put together) and the sardines (utility room) are
//     only needed where they are used (Florent's power strip, the cat): holding them changes nothing else, so they are
//     left out of the story part and taken (the electromagnet: assembled) "on the way" when used (see lazyItem);
//   - the parcel's delivery (CUT13) only adds the cat, the parcel and a notebook entry, and catches nobody: whatever a
//     player does while it is on its way can be done once it has arrived, so it is fired as soon as Papa is wary;
//   - the first power cut and the later ones only differ by Papa's line (fuses_cut is left out of the story part),
//     and the patches are taken with the O-ring (patches_taken repeats oring_taken);
//   - Papa's drawer key (in Maman's gardening basket, once he is wary) can be fetched during any hose window until it
//     is taken (the hose works as long as the garden holds it), and it is only used on the drawer: it is taken "on the
//     way" too, solving E25;
//   - while Papa is away from his desk (doorbell, dough, fuse box), only his office opens: the window is explored as
//     one step (see officeWindow) with what can be done in the office (the computer, the pliers, the drawer), Papa
//     then back with Charlie out of the office or caught in it. What can be done elsewhere meanwhile can be done before
//     or after (checked by a test);
//   - the hose is explored as one step (see hoseSteps): the tap, the garden actions of the window (the cat, the
//     parcel), Maman back with Charlie out of the garden or caught there. During the window only the garden opens (and
//     the parents' room closes), and nothing else depends on Maman: actions elsewhere can be done before or after;
//   - Florent's bike is explored once all its parts are held: a part put in alone only says a line and waits for the
//     other (see partSteps);
//   - the three fragments are only ever used to put the recipe together, in the inventory: they are put together once
//     all three are held (the first two, then the third), never two by two earlier;
// - the timers are explored by firing each running timer next (whatever the deadlines), which covers every order
//   a player can obtain by choosing when to ring, mix, use the hose or blow the fuses. Papa's doorbell phases are reduced to two: while
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
import { SOLUTION_BOARD } from './circuit';
import { CODES, GAGS, interact, newGame, PADS, playAll, USE_RULES } from './rules';
import { Beat, Flag, GameState, Input, ItemId, KeypadId, NoteId, PadId } from './types';
import { exitsIn, hotspotsIn } from './world';

// Notebook entries that change the rules: the keypads only open once their code is noted.
const GATING_NOTES: readonly NoteId[] = ['n08', 'n11', 'n13', 'n14', 'n17'];
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
  'sardines_taken',
  'chestnut_taken',
  'riceflour_taken',
  'fuse_taken',
  'fuse_in',
  'stone_left',
  'stone_right',
  'hairdryer_taken',
  'wire_taken',
  'nail_taken',
  'battery_taken',
  'plug_taken',
  'magnet_ready',
  'keyring_taken',
  'patches_taken',
  'fuses_cut',
];
export const REDUCED_ITEMS: readonly ItemId[] = ['gatekey', 'ricemilk', 'chestnut', 'riceflour', 'bar', 'fuse', 'wire', 'nail', 'battery', 'plug', 'coil', 'magnet'];
// The parts of the electromagnet, with the flag their take sets, and what each combination uses up.
const MAGNET_PARTS: readonly ItemId[] = ['wire', 'nail', 'battery', 'plug', 'coil', 'magnet'];
const MAGNET_FLAGS: readonly Flag[] = ['wire_taken', 'nail_taken', 'battery_taken', 'plug_taken'];
// Items taken on the way when used (see above), with the flag their take sets.
export const LAZY_ITEMS: Readonly<Partial<Record<ItemId, Flag>>> = { magnetPlug: 'magnet_ready', sardines: 'sardines_taken', keyring: 'keyring_taken' };
// The pieces put together in one step: the bike (E26).
export const PART_GROUPS: readonly { target: string; items: readonly ItemId[] }[] = [{ target: 'garage.bike', items: ['patches', 'pump'] }];
// The fragments of the recipe, put together in the inventory once all three are held.
export const FRAGMENT_ITEMS: readonly ItemId[] = ['scrap', 'scrap2', 'scrap3'];
// Two fragments, or the torn recipe and a fragment, put together: a side input (explored once all three are held).
export function isRecipeCombination(item: ItemId, target: string): boolean {
  const pieces: readonly ItemId[] = [...FRAGMENT_ITEMS, 'recipeHalf'];
  return target.startsWith('item:') && pieces.includes(item) && pieces.includes(target.slice(5) as ItemId);
}
const isPart = (item: ItemId, target: string) => PART_GROUPS.some((g) => g.target === target && g.items.includes(item));
export const TAP = 'pool.tap';
const isLazy = (i: ItemId) => i in LAZY_ITEMS;
export const REDUCED_PUZZLES: readonly number[] = [15, 18];
// Inputs of the reduced side systems, not explored one by one.
export const GATE_TARGETS: readonly string[] = ['front.gateLeft', 'front.gateRight', 'football.gate', 'pool.gate'];
export const BELL = 'front.bell';
export const SIDE_TAKES: readonly string[] = ['hall.shoes', 'kitchen.fridge', 'utility.flours', 'cellar.rack', 'cellar.hatch', 'cellar.stoneLeft', 'cellar.stoneRight', 'garage.breaker', 'hall.console', 'kitchen.milk', 'kitchen.sardines', 'utility.chestnut', 'utility.riceflour', 'bathroom.hairdryer', 'garage.wire', 'garden.shed', 'living.remote', 'attic.boxes', 'garden.basket', TAP];
const PAD_IDS = Object.keys(PADS) as PadId[];

// Story keys are computed once per state object (states are never mutated once returned by the engine).
const keyCache = new WeakMap<GameState, string>();

export function storyKey(s: GameState): string {
  const cached = keyCache.get(s);
  if (cached !== undefined) return cached;
  const key = computeStoryKey(s);
  keyCache.set(s, key);
  return key;
}

// The house key is kept after E01: the front door lock no longer matters (see above).
const keyKept = (s: GameState) => s.solved.includes(1) && s.inventory.includes('key');

function computeStoryKey(s: GameState): string {
  const ch = s.chars;
  return [
    s.inventory
      .filter((i) => !REDUCED_ITEMS.includes(i) && !isLazy(i))
      .sort()
      .join(','),
    (Object.keys(s.flags) as Flag[])
      .filter((f) => !REDUCED_FLAGS.includes(f) && !(f === 'door_unlocked' && keyKept(s)))
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
  for (const pad of PAD_IDS) out.push({ kind: 'pad', pad, code: [...PADS[pad].code] }, { kind: 'pad', pad, code: [...PADS[pad].code].reverse() });
  out.push({ kind: 'chess', moves: [...SOLUTION_MOVES] }, { kind: 'circuit', board: [...SOLUTION_BOARD] }, { kind: 'wait' }, { kind: 'tick', ms: 1000 });
  return out;
}

// Whether an input belongs to a reduced side system (the gates, the dough ingredients).
export function isSideInput(input: Input): boolean {
  if (input.kind === 'verb') return SIDE_TAKES.includes(input.target) || GATE_TARGETS.includes(input.target) || input.target === BELL;
  if (input.kind === 'item')
    return (
      REDUCED_ITEMS.includes(input.item) ||
      isPart(input.item, input.target) ||
      (input.item === 'magnetPlug' && input.target === 'florent.strip') ||
      (input.target.startsWith('item:') && REDUCED_ITEMS.includes(input.target.slice(5) as ItemId)) ||
      isRecipeCombination(input.item, input.target)
    );
  return false;
}

// The non-move inputs the search tries. Pruned (each pruning is proven by a test on every sample state): item pairs
// without a rule only answer a wrong line, looking at an item, listening at a door and the gags only say lines; the
// pole and its extension and the electromagnet's parts are the only item-on-item rules; the side systems are
// explored by sideSteps; a wrong pad sequence only says a line.
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
    for (const item of s.inventory) if (USE_RULES.includes(`${item}>${h.id}`) && !REDUCED_ITEMS.includes(item) && !isLazy(item) && !isPart(item, h.id)) out.push({ kind: 'item', item, target: h.id });
    for (const item of Object.keys(LAZY_ITEMS) as ItemId[]) {
      const input: Input = { kind: 'item', item, target: h.id };
      if (USE_RULES.includes(`${item}>${h.id}`) && lazyAvailable(s, item) && !isSideInput(input)) out.push(input);
    }
  }
  if (s.inventory.includes('pole') && s.inventory.includes('extension')) out.push({ kind: 'item', item: 'pole', target: 'item:extension' });
  if (FRAGMENT_ITEMS.every((i) => s.inventory.includes(i))) out.push({ kind: 'item', item: 'scrap', target: 'item:scrap2' });
  if (s.inventory.includes('recipeHalf') && s.inventory.includes('scrap3')) out.push({ kind: 'item', item: 'recipeHalf', target: 'item:scrap3' });
  for (const keypad of KEYPADS) out.push({ kind: 'keypad', keypad, code: CODES[keypad] }, { kind: 'keypad', keypad, code: '0000' });
  for (const pad of PAD_IDS) out.push({ kind: 'pad', pad, code: [...PADS[pad].code] });
  out.push({ kind: 'chess', moves: [...SOLUTION_MOVES] }, { kind: 'circuit', board: [...SOLUTION_BOARD] });
  return out;
}

// A lazy item can be fetched while it is still in its place (the sardines are used up by the cat), once inside;
// the drawer key once Papa gave it to Maman and she gardens (the hose then gives a window).
export function lazyAvailable(s: GameState, item: ItemId): boolean {
  if (!s.solved.includes(1)) return false;
  if (item === 'keyring' && !s.inventory.includes(item) && !(s.flags.dad_wary && s.flags.machine_done)) return false;
  return s.inventory.includes(item) || !s.flags[LAZY_ITEMS[item]!];
}

// The state with a lazy item taken on the way (no change when it is already held). Taking the drawer key solves E25,
// during a hose window (E22).
export function lazyItem(s: GameState, input: Input): GameState {
  if (input.kind !== 'item' || !isLazy(input.item) || s.inventory.includes(input.item)) return s;
  const solved = input.item === 'keyring' ? [...s.solved, ...[22, 25].filter((n) => !s.solved.includes(n))] : s.solved;
  // The electromagnet: its parts taken and put together on the way.
  const magnet = input.item === 'magnetPlug';
  const inventory = magnet ? s.inventory.filter((i) => !MAGNET_PARTS.includes(i)) : s.inventory;
  const parts = magnet ? Object.fromEntries(MAGNET_FLAGS.map((f) => [f, true])) : {};
  return { ...s, inventory: [...inventory, input.item], flags: { ...s.flags, ...parts, [LAZY_ITEMS[input.item]!]: true }, solved };
}

// The pieces of a group put in together, once all are held (the bike).
export function partSteps(members: readonly GameState[]): { state: GameState; beats: Beat[] }[] {
  const out: { state: GameState; beats: Beat[] }[] = [];
  for (const g of PART_GROUPS) {
    const m = members.find((x) => g.items.every((i) => x.inventory.includes(i)) && hotspotsIn(x).some((h) => h.id === g.target));
    if (!m) continue;
    const r = playAll(m, g.items.map((item) => ({ kind: 'item', item, target: g.target })));
    out.push({ state: r.state, beats: r.outcomes.flatMap((o) => o.beats) });
  }
  return out;
}

// The hose in one step: the tap from the pool, then in the garden while Maman changes nothing, the cat fed, or the
// cat fed and the parcel taken; then Maman comes back with Charlie out of the garden (football corner) or still in it.
export function hoseSteps(members: readonly GameState[]): { state: GameState; beats: Beat[] }[] {
  const pool = members.find((m) => m.place === 'pool');
  if (!pool || pool.chars.mom !== 'gardening') return [];
  const soaked = interact(pool, { kind: 'verb', verb: 'use', target: TAP });
  if (soaked.state.chars.mom !== 'changing') return [];
  const inGarden = playAll(soaked.state, [{ kind: 'exit', exit: 'pool.toFootball' }, { kind: 'exit', exit: 'football.toGarden' }]);
  const plans: Input[][] = [[]];
  const g = inGarden.state;
  if (g.flags.delivered && !g.flags.cat_fed && lazyAvailable(g, 'sardines')) {
    const feed: Input = { kind: 'item', item: 'sardines', target: 'garden.cat' };
    plans.push([feed], [feed, { kind: 'verb', verb: 'take', target: 'garden.parcel' }]);
  }
  if (g.flags.cat_fed && !g.flags.parcel_taken) plans.push([{ kind: 'verb', verb: 'take', target: 'garden.parcel' }]);
  const out: { state: GameState; beats: Beat[] }[] = [];
  for (const plan of plans) {
    let s = g;
    const beats = [...soaked.beats, ...inGarden.outcomes.flatMap((o) => o.beats)];
    for (const input of plan) {
      const o = interact(lazyItem(s, input), input);
      beats.push(...o.beats);
      s = o.state;
    }
    for (const stay of [false, true]) {
      const where = stay ? s : interact(s, { kind: 'exit', exit: 'garden.toFootball' }).state;
      const back = fire(where, 'mom');
      out.push({ state: back.state, beats: [...beats, ...back.beats] });
    }
  }
  return out;
}

// The dough mixed from the kitchen while Papa is not there: the three ingredients put in the food processor.
export function mixDough(s: GameState): GameState | null {
  if (s.place !== 'kitchen' || s.flags.dough_mixed || s.chars.dad === 'cooking') return null;
  const ready: GameState = {
    ...s,
    inventory: [...s.inventory.filter((i) => i !== 'ricemilk' && i !== 'chestnut' && i !== 'riceflour'), 'ricemilk', 'chestnut', 'riceflour'],
    flags: { ...s.flags, milk_taken: true, chestnut_taken: true, riceflour_taken: true, milk_in: undefined, chestnut_in: undefined, riceflour_in: undefined },
  };
  ready.flags = Object.fromEntries(Object.entries(ready.flags).filter(([, v]) => v)) as GameState['flags'];
  const items = ['ricemilk', 'chestnut', 'riceflour'] as const;
  return playAll(ready, items.map((item) => ({ kind: 'item', item, target: 'kitchen.robot' }))).state;
}

type TimerId = keyof GameState['timers'];
const TIMERS: readonly TimerId[] = ['dad', 'dough', 'mom', 'delivery', 'machine'];

// Fires one timer now, whatever the deadlines (the other running ones are pushed after it).
export function fire(s: GameState, timer: TimerId): { state: GameState; beats: Beat[] } {
  const timers = { ...s.timers };
  for (const id of TIMERS) if (id !== timer && timers[id] !== null) timers[id] = s.clock + 1;
  timers[timer] = s.clock;
  const o = interact({ ...s, timers }, { kind: 'tick', ms: 0 });
  return { state: o.state, beats: o.beats };
}

// The parcel is delivered as soon as it is on its way (see above).
export function deliver(s: GameState): { state: GameState; beats: Beat[] } {
  return s.timers.delivery === null ? { state: s, beats: [] } : fire(s, 'delivery');
}

// Each running timer fired next. Papa's way back (outside, then returning) is fired in one step.
export function timerSteps(s: GameState): { state: GameState; beats: Beat[] }[] {
  const out: { state: GameState; beats: Beat[] }[] = [];
  if (s.timers.dough !== null) out.push(fire(s, 'dough'));
  if (s.timers.mom !== null) out.push(fire(s, 'mom'));
  if (s.timers.delivery !== null) out.push(fire(s, 'delivery'));
  if (s.timers.machine !== null) out.push(fire(s, 'machine'));
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

type Step = { state: GameState; beats: Beat[] };
const AWAY: readonly GameState['chars']['dad'][] = ['outside', 'returning', 'cooking', 'fuses'];

// Papa's timer fired until he is back at his desk (outside, returning; cooking; the fuse box).
function backToDesk(s: GameState): Step {
  let step: Step = { state: s, beats: [] };
  while (AWAY.includes(step.state.chars.dad) && step.state.timers.dad !== null) {
    const next = fire(step.state, 'dad');
    step = { state: next.state, beats: [...step.beats, ...next.beats] };
  }
  return step;
}

// Papa away from his desk: Charlie goes to the office and does any of what can be done there (the computer, the pliers,
// the drawer), then Papa comes back with Charlie out of the office or still in it. Caught before reaching the office
// (or with Papa not away), Papa simply comes back.
export function officeWindow(away: GameState): Step[] {
  if (!AWAY.includes(away.chars.dad) || away.place === 'cellar') return [backToDesk(away)];
  const office: GameState = { ...away, place: 'office', pos: { x: 36, y: 116 }, facing: 'right' };
  const options: Input[] = [];
  if (office.notes.includes('n08') && !office.flags.computer_read) options.push({ kind: 'keypad', keypad: 'computer', code: CODES.computer });
  if (!office.flags.pliers_taken) options.push({ kind: 'verb', verb: 'take', target: 'office.shelf' });
  if (office.flags.dad_wary && !office.flags.drawer_open && lazyAvailable(office, 'keyring')) options.push({ kind: 'item', item: 'keyring', target: 'office.drawer' });
  const out: Step[] = [];
  for (let mask = 0; mask < 1 << options.length; mask++) {
    let s = office;
    const beats: Beat[] = [];
    options.forEach((input, i) => {
      if (!(mask & (1 << i))) return;
      const o = interact(lazyItem(s, input), input);
      beats.push(...o.beats);
      s = o.state;
    });
    for (const stay of [false, true]) {
      const where: GameState = stay ? s : { ...s, place: 'corridor0', pos: { x: 120, y: 120 }, facing: 'down' };
      const back = backToDesk(where);
      out.push({ state: back.state, beats: [...beats, ...back.beats] });
    }
  }
  return out;
}

// The doorbell in one step: rung from the front, Papa comes out while the hero is at any place of the component
// (members), a capture if it is the front, then his absence (see officeWindow).
export function bellSteps(members: readonly GameState[]): Step[] {
  const ringer = members.find((m) => m.place === 'front');
  if (!ringer) return [];
  const rung = interact(ringer, { kind: 'verb', verb: 'use', target: BELL });
  if (rung.state.chars.dad !== 'answering') return [];
  return members.flatMap((m) => {
    const step = fire({ ...rung.state, place: m.place, pos: m.pos, facing: m.facing }, 'dad');
    return officeWindow(step.state).map((w) => ({ state: w.state, beats: [...rung.beats, ...step.beats, ...w.beats] }));
  });
}

// The dough in one step: mixed from the kitchen, Papa arrives while the hero is at any place of the component, then
// his absence from the office while he cooks.
export function doughSteps(members: readonly GameState[]): Step[] {
  const cook = members.find((m) => m.place === 'kitchen');
  const mixed = cook && mixDough(cook);
  if (!mixed) return [];
  return members.flatMap((m) => {
    const step = fire({ ...mixed, place: m.place, pos: m.pos, facing: m.facing }, 'dough');
    return officeWindow(step.state).map((w) => ({ state: w.state, beats: [...step.beats, ...w.beats] }));
  });
}

// The power cut in one step: Théo's electromagnet on Florent's power strip, then Papa's absence at the fuse box.
export function fuseSteps(members: readonly GameState[]): Step[] {
  const room = members.find((m) => m.place === 'florent' && lazyAvailable(m, 'magnetPlug'));
  if (!room) return [];
  const input: Input = { kind: 'item', item: 'magnetPlug', target: 'florent.strip' };
  const cut = interact(lazyItem(room, input), input);
  if (cut.state.chars.dad !== 'fuses') return [];
  return officeWindow(cut.state).map((w) => ({ state: w.state, beats: [...cut.beats, ...w.beats] }));
}

// Out of the cellar when stuck in it: take the iron bar (if it is still in the rack), wedge a wall stone with it, press
// the other stone: the hatch unlocks.
export function unstick(s: GameState): { state: GameState; beats: Beat[] } {
  if (s.place !== 'cellar' || s.flags.hatch_open) return { state: s, beats: [] };
  const inputs: Input[] = s.flags.bar_taken ? [] : [{ kind: 'verb', verb: 'take', target: 'cellar.rack' }];
  if (!s.flags.stone_left && !s.flags.stone_right) inputs.push({ kind: 'item', item: 'bar', target: 'cellar.stoneLeft' });
  inputs.push({ kind: 'verb', verb: 'use', target: s.flags.stone_left || !s.flags.stone_right ? 'cellar.stoneRight' : 'cellar.stoneLeft' });
  const r = playAll(s, inputs);
  return { state: r.state, beats: r.outcomes.flatMap((o) => o.beats) };
}

// The washing machine started from the utility room with the detergent, the breaker switched on first if needed.
export function machineSteps(members: readonly GameState[]): { state: GameState; beats: Beat[] }[] {
  const m = members.find((x) => x.place === 'utility' && x.inventory.includes('detergent') && !x.flags.machine_running && !x.flags.machine_done);
  if (!m) return [];
  const o = interact({ ...m, flags: { ...m.flags, fuse_taken: true, fuse_in: true, power_on: true }, inventory: m.inventory.filter((i) => i !== 'fuse') }, { kind: 'item', item: 'detergent', target: 'utility.machine' });
  return [{ state: o.state, beats: o.beats }];
}

// The story transitions of a component that are not a single explored input.
export function sideSteps(members: readonly GameState[]): { state: GameState; beats: Beat[]; label: string }[] {
  return [
    ...members.flatMap((m) => timerSteps(m).map((t) => ({ ...t, label: '(timer)' }))),
    ...bellSteps(members).map((t) => ({ ...t, label: '(bell)' })),
    ...doughSteps(members).map((t) => ({ ...t, label: '(dough)' })),
    ...machineSteps(members).map((t) => ({ ...t, label: '(machine)' })),
    ...hoseSteps(members).map((t) => ({ ...t, label: '(hose)' })),
    ...fuseSteps(members).map((t) => ({ ...t, label: '(fuses)' })),
    ...partSteps(members).map((t) => ({ ...t, label: '(parts)' })),
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
  // Every line any explored interaction said (to check that each exists in every language).
  beats: Beat[];
  // How each node was first reached (for counter-examples).
  parent: Map<string, { from: string; input: Input | string }>;
  samples: number;
}

// onSample is called with every concrete state met (one per place of each node), to check invariants without
// keeping hundreds of thousands of states in memory.
export function exploreStory(onSample: (s: GameState) => void = () => {}, limit = 600_000): StoryGraph {
  const componentOf = new Map<string, Component>();
  // Only the spoken lines are kept (to check that each exists in every language).
  const lineKeys = new Set<string>();
  const beats: Beat[] = [];
  const addBeats = (bs: readonly Beat[]) => {
    for (const b of bs) {
      if (b.type !== 'say') continue;
      const k = `${b.speaker}:${b.key}`;
      if (!lineKeys.has(k)) {
        lineKeys.add(k);
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
        // Going down to the cellar: the escape is part of the move (so the cellar belongs to the component).
        const freed = unstick(o.state);
        addBeats(freed.beats);
        o.state = freed.state;
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
      const sent = deliver(reached);
      addBeats(sent.beats);
      const out = unstick(sent.state);
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
        const o = interact(lazyItem(member, input), input);
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
