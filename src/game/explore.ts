// Exhaustive exploration of the story state graph from a new game (PRD AC-31), shared by the solver tests.
//
// A plain search over (place x story) explodes (more than 2 million states: 24 places times every order of picking
// up items). The search is therefore done on story nodes, with a sound reduction:
// - the story part of a state is everything that can change what happens next: inventory, flags, character states,
//   the notebook entries that gate something (the two codes), cutscenes, solved puzzles, whether a capture happened
//   and the end. Position, dialogue history, the wrong-line rotation, the tutorial, play time and the purely
//   informative notebook entries (n02-n07, n09, n10, n12: they gate nothing) are left out;
// - moving (an exit or a door) that leaves the story part unchanged is a free move: all places reachable by free
//   moves form one component, and a node is (story part, component). Every input is tried from every place of the
//   component; moves that change the story (a capture, an inhabitant going back, the washing machine's end) are
//   ordinary transitions.
// So every reachable concrete state belongs to exactly one explored node and every input from it is tried.
import { SOLUTION_MOVES } from './chess';
import { BYE, dialogueOptions } from './dialogue';
import { CODES, interact, newGame, USE_RULES } from './rules';
import { Beat, Flag, GameState, Input, NoteId } from './types';
import { exitsIn, hotspotsIn } from './world';

// Notebook entries that change the rules: the keypads only open once their code is noted.
const GATING_NOTES: readonly NoteId[] = ['n08', 'n11'];
// Flags that only change which places connect, inside a component that is connected anyway once the front door is
// open (the bay window): they never change what can happen next.
const MOVE_ONLY_FLAGS: readonly Flag[] = ['bay_open'];

// The story part of a state. The capture count, the dialogue history and the informative notebook entries are
// left out: no rule reads them (checked by tests on every sample state).
export function storyKey(s: GameState): string {
  const ch = s.chars;
  return [
    [...s.inventory].sort().join(','),
    (Object.keys(s.flags) as Flag[])
      .filter((f) => !MOVE_ONLY_FLAGS.includes(f))
      .sort()
      .join(','),
    `${ch.dad}${ch.mom}${ch.julien}${ch.florent}${ch.theo}`,
    s.notes.filter((n) => GATING_NOTES.includes(n)).sort().join(','),
    [...s.cuts].sort().join(','),
    [...s.solved].sort((a, b) => a - b).join(','),
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
    if (h.character) for (const o of dialogueOptions(s, h.character)) if (o.id !== BYE) out.push({ kind: 'dialogue', character: h.character, option: o.id });
  }
  for (const a of s.inventory) for (const b of s.inventory) if (a !== b) out.push({ kind: 'item', item: a, target: `item:${b}` });
  for (const e of exitsIn(s)) out.push({ kind: 'exit', exit: e.id });
  for (const item of s.inventory) out.push({ kind: 'lookItem', item });
  for (const keypad of ['computer', 'safe'] as const) out.push({ kind: 'keypad', keypad, code: CODES[keypad] }, { kind: 'keypad', keypad, code: '0000' });
  out.push({ kind: 'chess', moves: [...SOLUTION_MOVES] });
  return out;
}

// The non-move inputs the search tries. Pruned (each pruning is proven by a test on every sample state): item pairs
// without a rule only answer a wrong line, looking at an item and talking only say lines; the combination of the
// pole and its extension is the only item-on-item rule.
// Looking only says a line, except at the painting, which reveals the safe.
export const STORY_LOOKS: readonly string[] = ['parents.painting'];

export function actionInputs(s: GameState): Input[] {
  const out: Input[] = [];
  for (const h of hotspotsIn(s)) {
    for (const verb of h.verbs) {
      if (h.door && verb === 'use') continue;
      if (h.character && verb === 'talk') continue;
      if (verb === 'look' && !STORY_LOOKS.includes(h.id)) continue;
      out.push({ kind: 'verb', verb, target: h.id });
    }
    for (const item of s.inventory) if (USE_RULES.includes(`${item}>${h.id}`)) out.push({ kind: 'item', item, target: h.id });
  }
  if (s.inventory.includes('pole') && s.inventory.includes('extension')) out.push({ kind: 'item', item: 'pole', target: 'item:extension' });
  for (const keypad of ['computer', 'safe'] as const) out.push({ kind: 'keypad', keypad, code: CODES[keypad] }, { kind: 'keypad', keypad, code: '0000' });
  out.push({ kind: 'chess', moves: [...SOLUTION_MOVES] });
  return out;
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
  parent: Map<string, { from: string; input: Input }>;
  samples: number;
}

// onSample is called with every concrete state met (one per place of each node), to check invariants without
// keeping hundreds of thousands of states in memory.
export function exploreStory(onSample: (s: GameState) => void = () => {}, limit = 400_000): StoryGraph {
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

  const start = component(newGame());
  const finished = (c: Component) => c.members.some((s) => s.finished);
  const nodes = new Map([[start.key, finished(start)]]);
  const edges = new Map<string, Set<string>>();
  const parent = new Map<string, { from: string; input: Input }>();
  let samples = start.members.length;
  start.members.forEach(onSample);
  const queue: (Component | null)[] = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const comp = queue[qi]!;
    queue[qi] = null; // free the explored component
    const next = new Set<string>();
    const visit = (st: GameState, input: Input) => {
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
    for (const st of comp.exits) visit(st, { kind: 'exit', exit: '(move)' });
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
