// The story rules: what each verb, item, exit, keypad, pad, chess and time input does in each state (PRD puzzle chain
// E01-E30, character states, lures and wariness, timers, guarded places and captures). interact() is pure: it returns a new state, the
// beats to play and the telemetry facts.
import { isSolution } from './chess';
import { connected, isBoard } from './circuit';
import { cloneState, Ctx } from './ctx';
import {
  CELLAR_SPAWN,
  DOOR_SPAWN,
  findExit,
  findHotspot,
  HotspotDef,
  isGuardedRoom,
  occupant,
  START_CHARS,
  START_POS,
} from './world';
import { CharacterId, DoorRoom, Facing, Flag, GameState, GuardedRoom, Input, ItemId, KeypadId, NoteId, Outcome, PadId, PlaceId, Point, SfxName, Verb, ViewId } from './types';

export const CODES: Record<KeypadId, string> = { computer: '7867', safe: '1987', lab: '2510' };
// The notebook entry that tells each code: the keypad does not open before it is known (no guessing).
export const CODE_NOTE: Record<KeypadId, NoteId> = { computer: 'n08', safe: 'n11', lab: 'n17' };
const KEYPAD_PLACE: Record<KeypadId, PlaceId> = { computer: 'office', safe: 'parents', lab: 'attic' };

// The sequence pads: the buttons shown (in this order) and the expected sequence, once its notebook entry is known.
export const PADS: Record<PadId, { buttons: readonly string[]; code: readonly string[]; note: NoteId; place: PlaceId }> = {
  bottles: { buttons: ['2003', '1987', '2011', '1994'], code: ['1987', '1994', '2003', '2011'], note: 'n13', place: 'cellar' },
  trunk: { buttons: ['blue', 'orange', 'green', 'red', 'purple', 'yellow'], code: ['red', 'yellow', 'blue', 'green'], note: 'n14', place: 'attic' },
};

// Timer durations in ms of the timer clock (PRD "Timers").
export const TIMER_MS = { answer: 15_000, outside: 60_000, back: 30_000, dough: 120_000, cook: 90_000, change: 90_000, delivery: 60_000, fuses: 60_000, machine: 60_000 } as const;

export function newGame(): GameState {
  return {
    v: 5,
    place: 'front',
    pos: { ...START_POS },
    facing: 'right',
    inventory: [],
    flags: {},
    chars: { ...START_CHARS },
    notes: ['n01'],
    unread: ['n01'],
    cuts: [],
    solved: [],
    captures: 0,
    tutorial: 0,
    playMs: 0,
    clock: 0,
    timers: { dad: null, dough: null, mom: null, delivery: null, machine: null },
    finished: false,
    wrongIdx: 0,
  };
}

const rejected = (s: GameState): Outcome => ({ state: s, beats: [], events: [], accepted: false });
const done = (c: Ctx): Outcome => ({ state: c.s, beats: c.beats, events: c.events, accepted: true });

export function interact(state: GameState, input: Input): Outcome {
  if (state.finished || !plausible(state, input)) return rejected(state);
  const c = new Ctx(state);
  switch (input.kind) {
    case 'verb': {
      const h = findHotspot(state, input.target);
      if (!h || !h.verbs.includes(input.verb)) return rejected(state);
      if (h.character) character(c, h.character);
      else if (h.door) doorVerb(c, h, input.verb);
      else hotspotVerb(c, input.target, input.verb);
      return done(c);
    }
    case 'item': {
      if (!state.inventory.includes(input.item)) return rejected(state);
      if (input.target.startsWith('item:')) {
        const other = input.target.slice(5) as ItemId;
        if (other === input.item || !state.inventory.includes(other)) return rejected(state);
        combine(c, input.item, other);
        return done(c);
      }
      if (!findHotspot(state, input.target)) return rejected(state);
      applyItem(c, input.item, input.target);
      return done(c);
    }
    case 'lookItem':
      if (!state.inventory.includes(input.item)) return rejected(state);
      c.hero(input.item === 'note' && c.is('ink_revealed') ? 'item.note.lookInk' : `item.${input.item}.look`);
      return done(c);
    case 'exit': {
      const e = findExit(state, input.exit);
      if (!e) return rejected(state);
      c.sfx('door');
      goTo(c, e.to, e.spawn, e.spawnFace);
      return done(c);
    }
    case 'keypad':
      return keypad(c, input.keypad, input.code) ? done(c) : rejected(state);
    case 'pad':
      return pad(c, input.pad, input.code) ? done(c) : rejected(state);
    case 'chess': {
      if (state.place !== 'living' || !c.is('theo_back') || c.is('chess_solved') || !isSolution(input.moves)) return rejected(state);
      c.set('chess_solved').hero('e06.solved').note('n08').solve(6);
      return done(c);
    }
    // E31: the board of Florent's console game; the bulb lit solves it and opens his Nerf kit.
    case 'circuit': {
      if (state.place !== 'florent' || c.isSolved(31) || !isBoard(input.board)) return rejected(state);
      c.s.circuit = [...input.board];
      if (connected(input.board)) c.sfx('solved').hero('line.kitOpen').solve(31);
      return done(c);
    }
    case 'tick':
      if (!(input.ms >= 0)) return rejected(state);
      advanceClock(c, c.s.clock + input.ms);
      return done(c);
    case 'wait': {
      const next = nextDeadline(state);
      if (next === null) return rejected(state);
      advanceClock(c, Math.max(next, c.s.clock));
      return done(c);
    }
  }
}

// Cheap checks that reject an input before the state is copied (the exhaustive search tries many inputs).
function plausible(s: GameState, input: Input): boolean {
  switch (input.kind) {
    case 'verb':
      return findHotspot(s, input.target)?.verbs.includes(input.verb) === true;
    case 'item':
      return s.inventory.includes(input.item) && (input.target.startsWith('item:') || findHotspot(s, input.target) !== undefined);
    case 'lookItem':
      return s.inventory.includes(input.item);
    case 'keypad':
      return s.place === KEYPAD_PLACE[input.keypad];
    case 'pad':
      return s.place === PADS[input.pad].place;
    case 'chess':
      return s.place === 'living';
    case 'circuit':
      return s.place === 'florent';
    default:
      return true;
  }
}

// ---------- time ----------

type TimerId = keyof GameState['timers'];
// Order among timers ending at the same time.
const TIMER_ORDER: readonly TimerId[] = ['dough', 'dad', 'mom', 'delivery', 'machine'];

export function nextDeadline(s: GameState): number | null {
  const ds = TIMER_ORDER.map((id) => s.timers[id]).filter((d): d is number => d !== null);
  return ds.length ? Math.min(...ds) : null;
}

function dueTimer(s: GameState, at: number): TimerId | null {
  return TIMER_ORDER.find((id) => s.timers[id] !== null && (s.timers[id] as number) <= at) ?? null;
}

// Moves the timer clock forward, resolving every timer that ends on the way, in time order (a timer started by an
// expiry counts from that expiry).
function advanceClock(c: Ctx, to: number): void {
  for (;;) {
    const next = nextDeadline(c.s);
    if (next === null || next > to || c.s.finished) break;
    c.s.clock = Math.max(c.s.clock, next);
    const id = dueTimer(c.s, next);
    if (id === 'dough') doughReady(c);
    else if (id === 'dad') dadTimer(c);
    else if (id === 'mom') momBack(c);
    else if (id === 'delivery') deliveryArrives(c);
    else machineDone(c);
  }
  c.s.clock = Math.max(c.s.clock, to);
}

// An outside view played without control: the lines cannot be skipped.
function view(c: Ctx, id: ViewId, script: (k: Ctx) => void): void {
  c.cinematic(true).beats.push({ type: 'view', view: id });
  script(c);
  c.wait(SCENE_MS.view).cinematic(false);
}

// Papa's timer: the doorbell sequence (answering -> front door view, outside -> returning -> at his desk), the end of
// his cooking, his return from the fuse box.
function dadTimer(c: Ctx): void {
  const now = c.s.clock;
  switch (c.state('dad')) {
    case 'answering':
      c.move('dad', 'outside');
      c.s.timers.dad = now + TIMER_MS.outside;
      c.sfx('door');
      // Charlie still in front of the house: Papa comes out next to Charlie, takes Charlie for a salesman and goes
      // straight back in. Otherwise the front door view shows him looking around.
      if (c.s.place === 'front') salesman(c);
      else view(c, 'door', (k) => k.say('dad', 'line.dadAtDoor'));
      return;
    case 'outside':
      c.move('dad', 'returning');
      c.s.timers.dad = now + TIMER_MS.back;
      c.say('dad', 'line.dadGoingBack');
      return;
    // Done cooking, he carries the dough up to the proofing cabinet of his lab.
    case 'cooking':
      c.set('dough_up').say('dad', 'line.dadEtuve');
      backAtDesk(c);
      return;
    case 'fuses':
      c.say('dad', 'line.dadFusesDone');
      backAtDesk(c);
      return;
    default:
      lockDoor(c);
      backAtDesk(c);
  }
}

// Papa meets Charlie in front of the house while he is outside: no capture, he goes back to his desk.
function salesman(c: Ctx): void {
  c.cinematic(true).captor('dad').say('dad', 'line.dadSalesman');
  lockDoor(c);
  c.captor(null).cinematic(false);
  backAtDesk(c);
}

// Papa going back in after the doorbell locks the front door; the house key opens it again from outside.
function lockDoor(c: Ctx): void {
  c.clear('door_unlocked').sfx('door').say('dad', 'line.dadLocks');
}

// E17 ends: the washing machine's cycle is over; Maman goes down to the garden.
function machineDone(c: Ctx): void {
  c.s.timers.machine = null;
  c.clear('machine_running').set('machine_done').sfx('ding').narrator('line.machineDing').say('mom', 'mom.machine');
  c.move('mom', 'gardening').solve(17);
  arrival(c, 'garden');
}

// Papa back at his desk. The first time after the computer was used, he notices it and becomes wary: no more doorbell
// for him, the dough no longer frees his office, and the parcel is delivered 60 s later (PRD "Lures and wariness").
function backAtDesk(c: Ctx): void {
  c.move('dad', 'at_desk');
  c.s.timers.dad = null;
  arrival(c, 'office');
  if (c.is('computer_read') && !c.is('dad_wary')) {
    // He locks his sketchbook in his drawer and gives the key to Maman.
    c.set('dad_wary').say('dad', 'line.dadWary').say('dad', 'line.dadKey');
    c.s.timers.delivery = c.s.clock + TIMER_MS.delivery;
  }
}

// E19: the dough is ready; Papa comes to cook (CUT12), whatever the doorbell sequence was doing. Wary, he only grabs
// the bowl and carries it up to his lab at once: his office is never free, but the dough is never lost.
function doughReady(c: Ctx): void {
  c.s.timers.dough = null;
  if (c.is('dad_wary')) {
    c.set('dough_up');
    c.cut('cut12', (k) => view(k, 'kitchen', (q) => q.say('dad', 'line.dadDoughWary')));
    // He only passes through the kitchen: Charlie there then is caught all the same.
    if (c.s.place === 'kitchen') capture(c, 'kitchen', 'dad');
    return;
  }
  // Called away from the front of the house, he goes back in and locks the door.
  if (c.state('dad') === 'outside' || c.state('dad') === 'returning') lockDoor(c);
  c.move('dad', 'cooking');
  c.s.timers.dad = c.s.clock + TIMER_MS.cook;
  c.cut('cut12', (k) => view(k, 'kitchen', (q) => q.say('dad', 'line.dadDough')));
  arrival(c, 'kitchen');
}

// E22 ends: Maman is back in the garden after changing.
function momBack(c: Ctx): void {
  c.s.timers.mom = null;
  c.move('mom', 'gardening');
  c.say('mom', 'line.momBack');
  arrival(c, 'garden');
}

// E27: the electromagnet on Florent's power strip blows the fuses; Papa goes down to the garage. False when refused.
function blowFuses(c: Ctx): boolean {
  if (c.is('drawer_open') && c.is('pliers_taken')) {
    c.hero('line.fusesNoNeed');
    return false;
  }
  if (c.state('dad') !== 'at_desk' && c.state('dad') !== 'answering') {
    c.hero('line.fusesNobody');
    return false;
  }
  const first = !c.is('fuses_cut');
  c.set('fuses_cut').sfx('fuse');
  view(c, 'dark', (k) => k.say('dad', first ? 'line.dadFuses' : 'line.fusesAgain'));
  c.move('dad', 'fuses');
  c.s.timers.dad = c.s.clock + TIMER_MS.fuses;
  c.solve(27);
  arrival(c, 'garage');
  return true;
}

// CUT13: the parcel is delivered; nobody opens, the driver throws it over the gate and the cat lies on it.
function deliveryArrives(c: Ctx): void {
  c.s.timers.delivery = null;
  c.set('delivered');
  c.cut('cut13', (k) => {
    k.sfx('van');
    view(k, 'delivery', (q) => q.say('driver', 'line.deliveryRing').sfx('bell').say('dad', 'line.bellIgnored').say('driver', 'line.deliveryThrow'));
    view(k, 'garden', (q) => q.sfx('cat').narrator('cut13'));
    k.note('n16');
  });
}

// An inhabitant arrives where the hero is: a capture.
function arrival(c: Ctx, place: GuardedRoom): void {
  const who = occupant(place, c.s.chars);
  if (c.s.place === place && who) capture(c, place, who);
}

// ---------- moving ----------

// Moves the hero to another place, running the events tied to a place change in this order: inhabitants going back
// to their room when the hero leaves it, the washing machine's end of cycle, then a capture if the destination is
// guarded by its occupant.
function goTo(c: Ctx, to: PlaceId, spawn: Point, face: Facing): void {
  // The cellar hatch locks again behind Charlie (E15: the stones open it from below).
  if (to === 'cellar') c.clear('hatch_open');
  const from = c.s.place;
  // Florent and Théo go back to their room once Charlie has left it: heard from the landing, after the place change.
  const after: ((k: Ctx) => void)[] = [];
  if (from === 'florent' && c.state('florent') === 'drumming' && c.is('oring_taken')) {
    c.move('florent', 'in_room');
    after.push((k) => k.narrator('florent.back'));
  }
  if (from === 'theo' && c.state('theo') === 'chess' && c.is('cube_solved')) {
    c.move('theo', 'in_room').set('theo_back');
    after.push((k) => k.cut('cut07', (q) => q.say('theo', 'line.theoBack').say('theo', 'line.theoMono1').say('theo', 'line.theoMono2').note('n07')));
  }
  // CUT15: Florent sees his bike repaired and rides away until the finale.
  if (from === 'garage' && c.is('bike_fixed') && c.state('florent') !== 'riding') {
    c.move('florent', 'riding');
    after.push((k) => k.cut('cut15', (q) => view(q, 'ride', (v) => v.sfx('bikebell').say('florent', 'line.florentBike'))));
  }
  // Walking in front of the house while Papa looks around there: he takes Charlie for a salesman.
  if (to === 'front' && c.state('dad') === 'outside') after.push((k) => salesman(k));
  if (isGuardedRoom(to)) {
    const who = occupant(to, c.s.chars);
    if (who) {
      // Charlie steps into the room first: the capture scene plays there.
      c.beats.push({ type: 'room', place: to, pos: { ...spawn }, facing: face });
      for (const run of after) run(c);
      capture(c, to, who);
      return;
    }
  }
  c.s.place = to;
  c.s.pos = { ...spawn };
  c.s.facing = face;
  c.beats.push({ type: 'room', place: to });
  for (const run of after) run(c);
}

// The capture scene, which cannot be skipped (PRD "Guarded places and captures"): a boy shouts for Papa, who comes
// 2 s later; the adult says the capture line, takes Charlie to the cellar, says "don't run away" and leaves 3 s later.
export const SCENE_MS = { call: 2000, beforeCellar: 1500, leave: 3000, view: 1500, reunion: 2500 } as const;

function capture(c: Ctx, room: GuardedRoom, who: CharacterId): void {
  // "Encore toi ?!" only from the second capture on; the narrator says whether the hatch opens from below.
  const again = c.s.captures > 0;
  // The hatch locks again behind Charlie; once a stone is wedged, pressing the other one opens it.
  const wedged = c.is('stone_left') || c.is('stone_right');
  c.clear('hatch_open');
  const adult: CharacterId = who === 'mom' ? 'mom' : 'dad';
  c.sfx('capture').cinematic(true);
  if (who !== adult) c.say(who, `capture.${who}`).wait(SCENE_MS.call).captor(adult);
  c.say(adult, again ? 'line.captureAgain' : `capture.${adult}`).wait(SCENE_MS.beforeCellar);
  c.s.captures += 1;
  c.events.push({ type: 'capture', room, count: c.s.captures });
  c.beats.push({ type: 'capture' });
  c.s.place = 'cellar';
  c.s.pos = { ...CELLAR_SPAWN };
  c.s.facing = 'down';
  c.beats.push({ type: 'room', place: 'cellar' });
  c.captor(adult).say(adult, 'capture.keep').wait(SCENE_MS.leave).captor(null).cinematic(false);
  c.narrator(wedged ? 'capture.cellarOpen' : 'capture.cellar');
}

// Nobody can be talked to: an inhabitant can only be looked at.
function character(c: Ctx, id: CharacterId): void {
  c.hero(`${id}.look`);
}

const DOOR_NOTE: Record<CharacterId, NoteId> = { julien: 'n02', florent: 'n03', theo: 'n04', mom: 'n05', dad: 'n06' };

function doorVerb(c: Ctx, h: HotspotDef, verb: Verb): void {
  const room = h.door as DoorRoom;
  const who = occupant(room, c.s.chars);
  if (verb === 'look') {
    if (who) c.hero(room === 'parents' && c.state('mom') === 'changing' ? 'door.parents.changing' : `door.${room}.occupied`);
    else c.hero(room === 'florent' && c.state('florent') === 'riding' ? 'door.florent.riding' : `door.${room}.empty`);
    return;
  }
  // listen: Charlie puts an ear to the door and hears the occupant talking to themself.
  if (verb === 'listen') {
    if (!who) return;
    if (who === 'dad' && c.state('dad') === 'answering') c.say('dad', 'dad.doorComing');
    else if (who === 'dad' && c.is('dad_wary')) c.say('dad', 'dad.doorWary').note(DOOR_NOTE.dad);
    else c.say(who, `${who}.door`).note(DOOR_NOTE[who]);
    return;
  }
  // use: open the door and go in (never blocked; a capture when the occupant is inside).
  c.sfx('door');
  goTo(c, room, { x: 36, y: 116 }, 'right');
}

// ---------- hotspots ----------

// Optional gags: using them only says a line (with a sound); they never change the story. The Japanese toilet also
// wets the floor for good (`wc_wet`, only drawn).
export const GAGS: Readonly<Record<string, SfxName>> = {
  'front.mailbox': 'gag',
  'football.goal': 'gag',
  'garden.flowers': 'gag',
  'garden.hose': 'water',
  'garden.swing': 'gag',
  'hall.mirror': 'gag',
  'living.sofa': 'gag',
  'living.tv': 'gag',
  'music.piano': 'gag',
  'music.guitar': 'gag',
  'kitchen.oven': 'gag',
  'wc0.toilet': 'spray',
  'wc0.paper': 'gag',
  'office.lamp': 'gag',
  'office.chair': 'gag',
  'attic.horse': 'gag',
  'attic.lamp': 'gag',
  'attic.stain': 'gag',
  'laundry.mixer': 'robot',
  'landing.lamp': 'gag',
  'wc1.freshener': 'spray',
  'wc1.toilet': 'water',
  'julien.radio': 'gag',
  'bathroom.sink': 'water',
  'bathroom.scale': 'gag',
  'bathroom.duck': 'gag',
  'theo.desk': 'gag',
  'theo.cube': 'gag',
  'florent.nerf': 'gag',
  'parents.sink': 'water',
};

const GATES = ['front.gateLeft', 'front.gateRight', 'football.gate', 'pool.gate'];
const INGREDIENTS: Partial<Record<ItemId, Flag>> = { ricemilk: 'milk_in', chestnut: 'chestnut_in', riceflour: 'riceflour_in' };
// The three pieces of the recipe, from the safe, the cellar and the attic trunk, put together in the inventory.
const FRAGMENTS: Partial<Record<ItemId, Flag>> = { scrap: 'frag1_in', scrap2: 'frag2_in', scrap3: 'frag3_in' };

// A take hotspot that gives its item(s) once: [flag set when taken, item or items, line, puzzle solved if any].
const TAKES: Readonly<Record<string, readonly [Flag, ItemId | readonly ItemId[], string, number?]>> = {
  'hall.shoes': ['gatekey_taken', 'gatekey', 'hall.shoes.take'],
  'music.basket': ['sticks_taken', 'sticks', 'music.basket.take'],
  'julien.trophy': ['queen_taken', 'queen', 'julien.trophy.take'],
  'living.bookshelf': ['booklet_taken', 'booklet', 'living.bookshelf.take'],
  'utility.shelf': ['detergent_taken', 'detergent', 'utility.shelf.take'],
  // The Nerf kit also holds the puncture patches (Florent's bike, E26).
  'florent.kit': ['oring_taken', ['oring', 'patches'], 'florent.kit.take'],
  'garage.bench': ['wrench_taken', 'wrench', 'garage.bench.take'],
  'office.shelf': ['pliers_taken', 'pliers', 'office.shelf.take'],
  'garage.pole': ['pole_taken', 'pole', 'garage.pole.take'],
  'football.bench': ['extension_taken', 'extension', 'football.bench.take'],
  'cellar.rack': ['bar_taken', 'bar', 'cellar.rack.take'],
  'kitchen.milk': ['milk_taken', 'ricemilk', 'kitchen.milk.take'],
  'kitchen.sardines': ['sardines_taken', 'sardines', 'kitchen.sardines.take'],
  'utility.chestnut': ['chestnut_taken', 'chestnut', 'utility.chestnut.take'],
  'utility.riceflour': ['riceflour_taken', 'riceflour', 'utility.riceflour.take'],
  'hall.console': ['fuse_taken', 'fuse', 'hall.console.take'],
  // The four parts of Théo's electromagnet (E27).
  'garage.wire': ['wire_taken', 'wire', 'garage.wire.take'],
  'garden.shed': ['nail_taken', 'nail', 'garden.shed.take'],
  'living.remote': ['battery_taken', 'battery', 'living.remote.take'],
  'attic.boxes': ['plug_taken', 'plug', 'attic.boxes.take'],
  // E25: the drawer key in Maman's gardening basket, left in the garden while she changes.
  'garden.basket': ['keyring_taken', 'keyring', 'garden.basket.take', 25],
};

function hotspotVerb(c: Ctx, id: string, verb: Verb): void {
  // The fridge opens and closes; the rice milk and the sardines inside are taken one at a time while it is open.
  if (id === 'kitchen.fridge') {
    const open = c.is('fridge_open');
    if (verb === 'use') {
      if (open) c.clear('fridge_open').sfx('door').hero('kitchen.fridge.close');
      else c.set('fridge_open').sfx('door').hero('kitchen.fridge.open');
      return;
    }
    c.hero(!open ? 'kitchen.fridge.lookClosed' : c.is('milk_taken') && c.is('sardines_taken') ? 'kitchen.fridge.lookEmpty' : 'kitchen.fridge.look');
    return;
  }
  // E31: Florent's Nerf kit is locked until his console's level 99 is beaten.
  if (id === 'florent.kit' && !c.isSolved(31)) {
    c.hero(verb === 'take' ? 'line.kitLocked' : 'florent.kit.lookLocked');
    return;
  }
  const take = TAKES[id];
  if (take) {
    const [flag, items, line, puzzle] = take;
    if (verb === 'look') {
      c.hero(c.is(flag) ? `${id}.lookEmpty` : `${id}.look`);
      return;
    }
    if (verb === 'take') {
      if (c.is(flag)) c.hero(`${id}.empty`);
      else {
        c.set(flag);
        for (const item of typeof items === 'string' ? [items] : items) c.give(item);
        c.hero(line);
        if (puzzle) c.solve(puzzle);
      }
      return;
    }
  }
  if (GATES.includes(id) && verb === 'use') {
    c.hero('line.gateLocked');
    return;
  }
  switch (`${id}:${verb}`) {
    // E01: the key under the doormat, the front door.
    case 'front.doormat:look':
      c.hero(c.is('key_taken') ? 'front.doormat.lookEmpty' : 'front.doormat.look');
      return;
    case 'front.doormat:take':
      if (c.is('key_taken')) c.hero('front.doormat.empty');
      else c.set('key_taken').give('key').hero('e01.key');
      return;
    case 'front.door:use':
      c.hero('front.door.locked');
      return;
    // E16: the doorbell starts Papa's doorbell sequence; it can be rung again once he is back at his desk.
    case 'front.bell:use':
      if (!c.isSolved(1) && !c.is('door_unlocked')) c.hero('line.bellRefuse');
      else if (c.is('dad_wary')) c.sfx('bell').say('dad', 'line.bellIgnored');
      else if (c.state('dad') === 'cooking') c.hero('line.bellNobody');
      else if (c.state('dad') !== 'at_desk') c.hero('line.bellBusy');
      else {
        c.sfx('bell').say('dad', 'line.dadAnswer');
        c.move('dad', 'answering');
        c.s.timers.dad = c.s.clock + TIMER_MS.answer;
        c.solve(16);
      }
      return;
    // E19: the flours (two items on one shelf).
    case 'utility.flours:look':
      c.hero(c.is('flours_taken') ? 'utility.flours.lookEmpty' : 'utility.flours.look');
      return;
    case 'utility.flours:take':
      if (c.is('flours_taken')) c.hero('utility.flours.empty');
      else c.set('flours_taken').give('chestnut').give('riceflour').hero('utility.flours.take');
      return;
    // E19: the food processor.
    case 'kitchen.robot:look':
      c.hero(c.is('dough_up') ? 'kitchen.robot.lookUp' : c.is('dough_mixed') ? 'kitchen.robot.lookDone' : 'kitchen.robot.look');
      return;
    case 'kitchen.robot:use':
      if (c.is('dough_up')) c.hero('kitchen.robot.lookUp');
      else if (c.is('dough_mixed')) c.hero('kitchen.robot.done');
      else if (Object.values(INGREDIENTS).some((f) => c.is(f!))) c.hero('line.doughMissing');
      else c.hero('kitchen.robot.empty');
      return;
    case 'kitchen.bowl:look':
      c.hero(c.is('dough_mixed') ? 'kitchen.bowl.lookDone' : 'kitchen.bowl.look');
      return;
    // E02 / E14: the pool, its cover, the ball, the pump and the bottle at the bottom.
    case 'pool.ball:look':
      c.hero('pool.ball.look').note('n02');
      return;
    case 'pool.cover:look':
      c.hero(c.is('pool_drained') ? 'pool.cover.lookDrained' : c.is('cover_open') ? 'pool.cover.lookOpen' : c.is('ball_freed') ? 'pool.cover.lookFree' : 'pool.cover.look');
      return;
    case 'pool.switch:use':
      if (!c.is('ball_freed')) c.hero('line.coverBall');
      else if (c.is('cover_open')) c.hero('pool.switch.already');
      else c.set('cover_open').sfx('pump').hero('pool.switch.open');
      return;
    case 'pool.pump:look':
      c.hero(c.is('plug_fixed') ? 'pool.pump.lookFixed' : 'pool.pump.look');
      return;
    // The pump drains the pool, and fills it again when used on the drained pool (a gag).
    case 'pool.pump:use':
      if (!c.is('plug_fixed')) c.hero('line.pumpPlug');
      else if (!c.is('cover_open')) c.hero('line.pumpCover');
      else if (c.is('pool_drained')) c.clear('pool_drained').sfx('water').narrator('pool.fill');
      else c.set('pool_drained').sfx('pump').narrator('pool.drain');
      return;
    case 'pool.bottle:look':
      c.hero(c.is('pool_drained') ? 'pool.bottle.lookDrained' : 'pool.bottle.look');
      return;
    case 'pool.bottle:take':
      if (!c.is('pool_drained')) c.hero('pool.bottle.deep');
      else c.set('thinner_taken').give('thinner').hero('e14.take').solve(14);
      return;
    case 'pool.bay:use':
      c.hero('line.bayLocked');
      return;
    case 'living.bay:use':
      c.set('bay_open').sfx('door').hero('living.bay.open');
      return;
    // E03: the drums.
    case 'music.drums:look':
      c.hero(c.played('cut05') ? 'music.drums.lookPlayed' : 'music.drums.look');
      return;
    case 'music.drums:use':
      c.hero(c.played('cut05') ? 'music.drums.usePlayed' : 'music.drums.use');
      return;
    // E04-E06: the electronic chessboard, the Rubik's Cube.
    case 'living.chess:look':
      if (!c.is('queen_placed')) c.hero('living.chess.lookMissing').note('n04');
      else if (c.state('theo') === 'chess') c.hero('living.chess.lookPlaying');
      else c.hero(c.is('chess_solved') ? 'living.chess.lookSolved' : 'living.chess.lookProblem');
      return;
    case 'living.chess:use':
      if (!c.is('queen_placed')) c.hero('living.chess.lookMissing').note('n04');
      else if (c.state('theo') === 'chess') c.hero('line.chessBusy');
      else if (c.is('chess_solved')) c.hero('living.chess.lookSolved');
      else c.beats.push({ type: 'chess' });
      return;
    case 'theo.cube:look':
      c.hero(c.is('cube_solved') ? 'theo.cube.lookSolved' : 'theo.cube.look');
      return;
    case 'theo.cube:use':
      c.sfx('gag').hero(c.is('cube_solved') ? 'theo.cube.useSolved' : 'theo.cube.use');
      return;
    // E07: Papa's computer.
    case 'office.computer:look':
      c.hero(c.is('computer_read') ? 'office.computer.lookRead' : 'office.computer.look');
      return;
    case 'office.computer:use':
      if (c.is('computer_read')) c.beats.push({ type: 'documents' });
      else if (!c.s.notes.includes(CODE_NOTE.computer)) c.hero('line.codeUnknown');
      else c.beats.push({ type: 'keypad', keypad: 'computer' });
      return;
    // E17: the circuit breaker and the washing machine.
    case 'garage.breaker:look':
      c.hero(c.is('power_on') ? 'garage.breaker.lookOn' : c.is('fuse_in') ? 'garage.breaker.lookFuse' : 'garage.breaker.look');
      return;
    case 'garage.breaker:use':
      if (c.is('power_on')) c.hero('garage.breaker.already');
      else if (!c.is('fuse_in')) c.sfx('breaker').hero('line.breakerFuse');
      else c.set('power_on').sfx('breaker').hero('garage.breaker.on');
      return;
    case 'utility.machine:look':
      c.hero(c.is('machine_done') ? 'utility.machine.lookDone' : c.is('machine_running') ? 'utility.machine.lookRunning' : c.is('power_on') ? 'utility.machine.lookPower' : 'utility.machine.look');
      return;
    case 'utility.machine:use':
      if (c.is('machine_done') || c.is('machine_running')) c.hero('line.machineDone');
      else c.hero(c.is('power_on') ? 'line.machineEmpty' : 'line.machinePower');
      return;
    // E08-E10: the shower (broken, joint fitted, repaired), the mirror, the painting and the safe.
    case 'parents.shower:look':
      c.hero(c.is('mirror_code') ? 'parents.shower.lookDone' : c.is('shower_repaired') ? 'parents.shower.lookRepaired' : c.is('oring_fitted') ? 'parents.shower.lookLoose' : 'parents.shower.look');
      return;
    case 'parents.shower:use':
      if (!c.is('oring_fitted')) c.hero('line.showerBroken');
      else if (!c.is('shower_repaired')) c.sfx('water').hero('line.showerLoose');
      else if (c.is('mirror_code')) c.sfx('water').hero('parents.shower.again');
      else {
        c.sfx('water').set('mirror_code');
        c.cut('cut08', (k) => k.narrator('cut08').hero('e09.code').note('n11'));
        c.solve(9);
      }
      return;
    case 'parents.mirror:look':
      c.hero(c.is('mirror_code') ? 'parents.mirror.lookCode' : 'parents.mirror.look');
      return;
    case 'parents.painting:look':
      c.set('safe_found').hero('parents.painting.look');
      return;
    case 'parents.safe:look':
      c.hero(c.is('safe_open') ? 'parents.safe.lookOpen' : 'parents.safe.look');
      return;
    case 'parents.safe:use':
      if (c.is('safe_open')) c.hero('parents.safe.empty');
      else if (!c.s.notes.includes(CODE_NOTE.safe)) c.hero('line.codeUnknown');
      else c.beats.push({ type: 'keypad', keypad: 'safe' });
      return;
    // E11-E13: the attic, the lab door (lock + keypad), Papa's lab.
    case 'attic.door:look':
      c.hero(c.is('lab_code') ? 'attic.door.lookCode' : c.is('lab_lock') ? 'attic.door.lookKey' : 'attic.door.look');
      return;
    case 'attic.door:use':
      if (c.is('lab_code')) c.hero('attic.door.lockStill');
      else if (!c.s.notes.includes(CODE_NOTE.lab)) c.hero('line.doorLocked');
      else c.beats.push({ type: 'keypad', keypad: 'lab' });
      return;
    case 'laundry.notebook:look':
      c.hero(c.isSolved(13) ? 'laundry.notebook.lookDone' : 'laundry.notebook.look');
      return;
    case 'laundry.notebook:use':
      c.hero(c.isSolved(13) ? 'laundry.notebook.lookDone' : 'laundry.notebook.use');
      return;
    // E30: Papa's proofing cabinet, where his dough rests once he has carried it up.
    case 'laundry.etuve:look':
      c.hero(c.is('tonka_in') ? 'laundry.etuve.lookTonka' : c.is('dough_up') ? 'laundry.etuve.lookDough' : 'laundry.etuve.look');
      return;
    case 'laundry.etuve:use':
      c.hero(c.is('dough_up') ? 'laundry.etuve.useDough' : 'line.tonkaNoDough');
      return;
    // E22: the garden tap; the hose soaks Maman when she gardens (CUT14), as long as the garden still holds something
    // (the parcel, the drawer key in her basket, the big nail in the shed): she guards the garden otherwise.
    case 'pool.tap:use':
      if (c.state('mom') !== 'gardening') c.sfx('water').hero('line.hoseLawn');
      else if (c.is('parcel_taken') && c.is('keyring_taken') && c.is('nail_taken')) c.hero('line.hoseOff');
      else {
        const again = c.isSolved(22);
        c.sfx('spray');
        view(c, 'hose', (k) => k.say('mom', again ? 'line.momSoakedAgain' : 'line.momSoaked'));
        c.move('mom', 'changing');
        c.s.timers.mom = c.s.clock + TIMER_MS.change;
        c.solve(22);
        arrival(c, 'parents');
      }
      return;
    // E23 / E24: the cat lying on the parcel, the parcel.
    case 'garden.cat:use':
      c.sfx('cat').hero('line.catHiss');
      return;
    case 'garden.parcel:take':
      if (!c.is('cat_fed')) c.sfx('cat').hero('line.catHiss');
      else c.set('parcel_taken').give('tonka').give('pump').hero('line.parcelOpen').solve(24);
      return;
    // E26: Florent's bike.
    case 'garage.bike:look':
      c.hero(c.is('bike_fixed') ? 'garage.bike.lookFixed' : 'garage.bike.look');
      return;
    case 'garage.bike:use':
      c.sfx(c.is('bike_fixed') ? 'bikebell' : 'gag').hero(c.is('bike_fixed') ? 'garage.bike.useFixed' : 'garage.bike.use');
      return;
    // E21: Papa's bottles in the cellar.
    case 'cellar.bottles:look':
      c.hero(c.is('bottles_done') ? 'cellar.bottles.lookOpen' : 'cellar.bottles.look');
      return;
    case 'cellar.bottles:use':
      if (c.is('bottles_done')) c.hero('cellar.bottles.lookOpen');
      else if (!c.s.notes.includes(PADS.bottles.note)) c.hero('line.bottlesUnknown');
      else c.beats.push({ type: 'pad', pad: 'bottles' });
      return;
    // E28: Papa's desk drawer.
    case 'office.drawer:look':
      c.hero(c.is('drawer_open') ? 'office.drawer.lookOpen' : c.is('dad_wary') ? 'office.drawer.lookWary' : 'office.drawer.look');
      return;
    case 'office.drawer:use':
      c.hero(c.is('drawer_open') ? 'office.drawer.lookOpen' : 'line.drawerLocked');
      return;
    // E29: the attic trunk and its colour padlock.
    case 'attic.trunk:look':
      c.hero(c.is('trunk_open') ? 'attic.trunk.lookOpen' : 'attic.trunk.look');
      return;
    case 'attic.trunk:use':
      if (c.is('trunk_open')) c.hero('attic.trunk.empty');
      else if (!c.s.notes.includes(PADS.trunk.note)) c.hero('line.trunkUnknown');
      else c.beats.push({ type: 'pad', pad: 'trunk' });
      return;
    case 'florent.strip:look':
      c.hero(c.is('magnet_plugged') ? 'florent.strip.lookPlugged' : 'florent.strip.look');
      return;
    // The electromagnet left plugged in (E27): switching the power strip back on blows the fuses again.
    case 'florent.strip:use':
      if (c.is('magnet_plugged')) blowFuses(c);
      else c.hero('florent.strip.use');
      return;
    // E31: Florent's console, level 99 of the broken circuit game; his Nerf kit is locked until it is beaten.
    case 'florent.console:use':
      if (c.isSolved(31)) c.hero('console.done');
      else c.beats.push({ type: 'circuit' });
      return;
    // The hair dryer stays plugged in on its hook: nothing to dry without Papa's note.
    case 'bathroom.hairdryer:use':
      c.hero('line.dryNothing');
      return;
    // E15: the cellar hatch, locked from below; the two wall stones, pressed together, unlock it.
    case 'cellar.hatch:use':
      c.hero('line.hatchStuck');
      return;
    case 'cellar.stoneLeft:look':
    case 'cellar.stoneRight:look':
      c.hero(c.is(id === 'cellar.stoneLeft' ? 'stone_left' : 'stone_right') ? 'cellar.stone.lookWedged' : 'cellar.stone.look');
      return;
    case 'cellar.stoneLeft:use':
    case 'cellar.stoneRight:use': {
      const mine: Flag = id === 'cellar.stoneLeft' ? 'stone_left' : 'stone_right';
      const other: Flag = mine === 'stone_left' ? 'stone_right' : 'stone_left';
      if (c.is('hatch_open')) c.hero('cellar.stone.useOpen');
      else if (c.is(mine)) c.hero('cellar.stone.useWedged');
      else if (c.is(other)) c.set('hatch_open').sfx('secret').hero(c.isSolved(15) ? 'cellar.stone.unlock' : 'e15.open').solve(15);
      else c.sfx('gag').hero('line.stoneAlone');
      return;
    }
    case 'wc0.toilet:look':
      c.hero(c.is('wc_wet') ? 'wc0.toilet.lookWet' : 'wc0.toilet.look');
      return;
    case 'wc0.toilet:use':
      c.sfx('spray').hero(c.is('wc_wet') ? 'wc0.toilet.useAgain' : 'wc0.toilet.use').set('wc_wet');
      return;
  }
  if (verb === 'look') {
    c.hero(`${id}.look`);
    return;
  }
  const gag = GAGS[id];
  if (verb === 'use' && gag) {
    c.sfx(gag).hero(`${id}.use`);
    return;
  }
  c.wrong();
}

// ---------- items ----------

// Every item>target pair that has a rule; any other pair only answers a generic wrong line (checked by a test, used
// to prune the exhaustive search).
export const USE_RULES: readonly string[] = [
  'key>front.door',
  'fuse>garage.breaker',
  'bar>cellar.stoneLeft',
  'bar>cellar.stoneRight',
  ...GATES.map((g) => `gatekey>${g}`),
  'pole>pool.ball',
  'longpole>pool.ball',
  'sticks>music.drums',
  'queen>living.chess',
  'booklet>theo.cube',
  'detergent>utility.machine',
  'oring>parents.shower',
  'wrench>parents.shower',
  'pliers>pool.pump',
  'thinner>attic.stain',
  'oldkey>attic.door',
  'recipe>laundry.notebook',
  'ricemilk>kitchen.robot',
  'chestnut>kitchen.robot',
  'riceflour>kitchen.robot',
  'sardines>garden.cat',
  'patches>garage.bike',
  'pump>garage.bike',
  'magnetPlug>florent.strip',
  'note>bathroom.hairdryer',
  'keyring>office.drawer',
  'tonka>laundry.etuve',
  'tonka>kitchen.robot',
];

// The parts of Théo's electromagnet before it has its plug (E27), on the power strip: what is still missing.
const STRIP_PARTS: Partial<Record<ItemId, string>> = {
  wire: 'line.stripParts',
  nail: 'line.stripParts',
  coil: 'line.stripParts',
  battery: 'line.stripParts',
  magnet: 'line.stripNoPlug',
  plug: 'line.stripPlugAlone',
};

function applyItem(c: Ctx, item: ItemId, target: string): void {
  if (item === 'gatekey' && GATES.includes(target)) {
    c.remove('gatekey').set('gates_open').sfx('door').hero('e18.open').solve(18);
    return;
  }
  // E27: an unfinished electromagnet tried on Florent's power strip says what is still missing.
  const missing = STRIP_PARTS[item];
  if (missing && target === 'florent.strip') {
    c.hero(missing);
    return;
  }
  const ingredient = INGREDIENTS[item];
  if (ingredient && target === 'kitchen.robot') {
    c.remove(item).set(ingredient).hero('kitchen.robot.add');
    if (Object.values(INGREDIENTS).every((f) => c.is(f!))) {
      c.set('dough_mixed').sfx('robot').hero('line.doughMixed').solve(19);
      c.s.timers.dough = c.s.clock + TIMER_MS.dough;
    }
    return;
  }
  // E13: the recipe put back in Papa's notebook. With the tonka bean already in the dough, the family gathers (CUT11);
  // otherwise the recipe says the secret touch is still missing.
  if (item === 'recipe' && target === 'laundry.notebook') {
    c.remove('recipe').sfx('take').solve(13);
    if (c.is('tonka_in')) reunion(c);
    else c.hero('line.recipeTonka');
    return;
  }
  // E30: the tonka bean grated into Papa's dough, resting in the proofing cabinet of his lab.
  if (item === 'tonka' && target === 'kitchen.robot') {
    c.hero('line.tonkaKitchen');
    return;
  }
  if (item === 'tonka' && target === 'laundry.etuve') {
    if (!c.is('dough_up')) c.hero('line.tonkaNoDough');
    else {
      c.remove('tonka').set('tonka_in').sfx('robot').hero('e30.tonka').solve(30);
      if (c.isSolved(13)) reunion(c);
    }
    return;
  }
  switch (`${item}>${target}`) {
    // E01: the house key opens the front door; it is kept (Papa locks the door again after each doorbell).
    case 'key>front.door':
      c.set('door_unlocked').sfx('door').solve(1);
      c.cut('cut01', (k) => k.narrator('cut01'));
      goTo(c, 'hall', { x: 160, y: 114 }, 'down');
      return;
    // E17: the spare fuse in the circuit breaker.
    case 'fuse>garage.breaker':
      c.remove('fuse').set('fuse_in').sfx('breaker').hero('garage.breaker.fuse');
      return;
    case 'pole>pool.ball':
      c.hero('line.poleShort');
      return;
    case 'longpole>pool.ball':
      c.remove('longpole').set('ball_freed');
      c.cut('cut04', (k) => k.narrator('cut04').say('julien', 'line.julienBall'));
      c.move('julien', 'football').solve(2);
      return;
    case 'sticks>music.drums':
      c.remove('sticks').sfx('drums');
      c.cut('cut05', (k) => stepAside(k, { x: 196, y: 124 }, 'right').narrator('cut05').say('florent', 'line.florentDrums'));
      c.move('florent', 'drumming').solve(3);
      return;
    case 'queen>living.chess':
      c.remove('queen').set('queen_placed');
      c.cut('cut06', (k) => stepAside(k, { x: 256, y: 126 }, 'left').narrator('cut06').say('theo', 'line.theoQueen'));
      c.move('theo', 'chess').solve(4);
      return;
    case 'booklet>theo.cube':
      c.remove('booklet').set('cube_solved').hero('e05.solve').solve(5);
      return;
    case 'detergent>utility.machine':
      if (c.is('machine_running') || c.is('machine_done')) break;
      if (!c.is('power_on')) {
        c.hero('line.machinePower');
        return;
      }
      c.remove('detergent').set('machine_running').sfx('machine').hero('e17.start');
      c.s.timers.machine = c.s.clock + TIMER_MS.machine;
      return;
    case 'oring>parents.shower':
      c.remove('oring').set('oring_fitted').hero('e08.oring');
      return;
    case 'wrench>parents.shower':
      if (!c.is('oring_fitted')) {
        c.hero('line.wrenchNothing');
        return;
      }
      c.remove('wrench').set('wrench_used').set('shower_repaired').hero('e08.wrench').hero('e08.done').solve(8);
      return;
    case 'pliers>pool.pump':
      c.remove('pliers').set('plug_fixed').hero('pool.pump.fix');
      return;
    case 'thinner>attic.stain':
      c.remove('thinner').set('door_revealed').sfx('secret');
      c.cut('cut09', (k) => k.narrator('cut09'));
      c.solve(11);
      return;
    case 'oldkey>attic.door':
      c.remove('oldkey').set('lab_lock').sfx('door').hero('e12.key');
      openLab(c);
      return;
    // E23: the sardines for the cat.
    case 'sardines>garden.cat':
      c.remove('sardines').set('cat_fed').sfx('cat').narrator('e23.cat').solve(23);
      return;
    // E26: the patches and the pump on Florent's bike, in any order.
    case 'patches>garage.bike':
    case 'pump>garage.bike':
      c.remove(item).set(item === 'patches' ? 'patches_in' : 'pump_in');
      if (c.is('patches_in') && c.is('pump_in')) c.set('bike_fixed').sfx('bikebell').hero('e26.fixed').solve(26);
      else c.hero('line.bikeHalf');
      return;
    // E20: the hair dryer on its hook warms Papa's note: invisible ink written with lemon juice appears.
    case 'note>bathroom.hairdryer':
      if (c.is('ink_revealed')) c.hero('item.note.lookInk');
      else c.set('ink_revealed').hero('e20.ink').hero('e20.read').note('n13').solve(20);
      return;
    // E27: Théo's electromagnet plugged into Florent's power strip blows the fuses; Papa goes down to the garage.
    // It stays plugged in, out of the inventory.
    case 'magnetPlug>florent.strip':
      if (c.state('florent') !== 'riding') c.hero('line.stripNotNow');
      else if (blowFuses(c)) c.remove('magnetPlug').set('magnet_plugged');
      return;
    // E28: the drawer key opens Papa's desk drawer: his sketchbook.
    case 'keyring>office.drawer':
      if (c.is('drawer_open')) break;
      c.remove('keyring').set('drawer_open').sfx('door').hero('e28.open').note('n14').solve(28);
      return;
    // E15: the iron bar wedges one stone pressed in; pressing the other one then unlocks the hatch.
    case 'bar>cellar.stoneLeft':
    case 'bar>cellar.stoneRight':
      if (c.is('stone_left') || c.is('stone_right')) break;
      c.remove('bar').set(target === 'cellar.stoneLeft' ? 'stone_left' : 'stone_right').sfx('gag').hero('line.stoneWedged');
      return;
  }
  c.wrong();
}

// CUT11, the end, in the lab: Papa then the whole family join Charlie one after the other, Charlie in the middle so
// that everybody is seen; then the Ending.
// Where Charlie stands for the final scene: the middle of the floor, room for three people on each side.
const REUNION_SPOT: Point = { x: 160, y: 124 };

function reunion(c: Ctx): void {
  c.finish();
  c.cut('cut11', (k) => {
    const cast = (characters: CharacterId[]) => k.beats.push({ type: 'cast', characters });
    k.s.pos = { ...REUNION_SPOT };
    k.s.facing = 'down';
    k.beats.push({ type: 'room', place: k.s.place, pos: { ...REUNION_SPOT }, facing: 'down' });
    k.cinematic(true).narrator('line.final1');
    cast(['dad']);
    k.say('dad', 'line.final2').hero('line.final3').say('dad', 'line.final4');
    cast(['dad', 'mom']);
    k.say('mom', 'line.final5');
    cast(['dad', 'mom', 'theo']);
    k.say('theo', 'line.final6');
    cast(['dad', 'mom', 'theo', 'julien']);
    k.say('julien', 'line.final7');
    cast(['dad', 'mom', 'theo', 'julien', 'florent']);
    k.say('florent', 'line.final8').wait(SCENE_MS.reunion);
    k.sfx('applause').say('dad', 'line.dadThanks').narrator('line.finalBakery').cinematic(false);
  });
  c.beats.push({ type: 'ending' });
}

// Florent coming down to his drums and Théo to the chessboard would stand where Charlie is: Charlie steps aside as they arrive.
function stepAside(c: Ctx, pos: Point, facing: Facing): Ctx {
  c.s.pos = { ...pos };
  c.s.facing = facing;
  c.beats.push({ type: 'step', pos: { ...pos }, facing });
  return c;
}

// E12: the lab door opens once both its lock (old key) and its keypad (code 2510) are done, in any order.
function openLab(c: Ctx): void {
  if (c.is('lab_lock') && c.is('lab_code') && !c.is('secret_open')) {
    c.set('secret_open').sfx('secret');
    c.cut('cut10', (k) => k.narrator('cut10'));
    c.solve(12);
  }
}

// The item-on-item rules (checked by a test, used to prune the exhaustive search).
export const COMBINE_RULES: readonly string[] = [
  'extension+pole',
  'nail+wire',
  'battery+coil',
  'magnet+plug',
  'scrap+scrap2',
  'scrap+scrap3',
  'scrap2+scrap3',
  'recipeHalf+scrap',
  'recipeHalf+scrap2',
  'recipeHalf+scrap3',
];

function combine(c: Ctx, a: ItemId, b: ItemId): void {
  const pair = [a, b].sort().join('+');
  if (pair === 'extension+pole') {
    c.remove('pole').remove('extension').give('longpole').hero('combine.pole');
    return;
  }
  // Théo's electromagnet (E27): the wire around the nail, then the battery, then the old plug.
  if (pair === 'nail+wire') {
    c.remove('wire').remove('nail').give('coil').hero('combine.coil');
    return;
  }
  if (pair === 'battery+coil') {
    c.remove('battery').remove('coil').give('magnet').sfx('gag').hero('line.magnetWorks');
    return;
  }
  if (pair === 'magnet+plug') {
    c.remove('magnet').remove('plug').give('magnetPlug').set('magnet_ready').hero('combine.magnetPlug');
    return;
  }
  // The recipe: two fragments give the torn recipe, the third completes it; the lab code is on its back (N17).
  const fa = FRAGMENTS[a];
  const fb = FRAGMENTS[b];
  if (fa && fb) {
    c.remove(a).remove(b).set(fa).set(fb).give('recipeHalf').sfx('take').hero('combine.recipeHalf');
    return;
  }
  const third = a === 'recipeHalf' ? fb : b === 'recipeHalf' ? fa : undefined;
  if (third) {
    c.remove(a).remove(b).set(third).give('recipe').sfx('secret').hero('line.recipeJoined').note('n17');
    return;
  }
  c.wrong();
}

function keypad(c: Ctx, id: KeypadId, code: string): boolean {
  const open = id === 'computer' ? c.is('computer_read') : id === 'safe' ? c.is('safe_open') : c.is('lab_code') || !c.is('door_revealed');
  if (c.s.place !== KEYPAD_PLACE[id] || open || !c.s.notes.includes(CODE_NOTE[id]) || !/^\d{4}$/.test(code)) return false;
  if (code !== CODES[id]) {
    c.sfx('wrong').hero('line.codeWrong');
    return true;
  }
  c.sfx('beep');
  if (id === 'computer') {
    c.set('computer_read');
    c.beats.push({ type: 'documents' });
    c.note('n09').note('n10').note('n15').solve(7);
  } else if (id === 'safe') {
    c.set('safe_open').narrator('e10.open').hero('line.noteLemon');
    for (const item of ['oldkey', 'photo', 'scrap', 'note'] as const) c.give(item);
    c.note('n12').solve(10);
  } else {
    c.set('lab_code').hero('e12.code');
    openLab(c);
  }
  return true;
}

// E21 / E29: a sequence pad (the bottles, the trunk padlock). Rejected when the pad cannot be open here.
function pad(c: Ctx, id: PadId, code: readonly string[]): boolean {
  const def = PADS[id];
  const open = id === 'bottles' ? c.is('bottles_done') : c.is('trunk_open');
  if (c.s.place !== def.place || open || !c.s.notes.includes(def.note) || code.length !== def.code.length || !code.every((b) => def.buttons.includes(b))) return false;
  if (code.some((b, i) => b !== def.code[i])) {
    if (id === 'bottles') c.sfx('bottle').hero('line.bottlesWrong');
    else c.sfx('wrong').hero('line.codeWrong');
    return true;
  }
  if (id === 'bottles') c.set('bottles_done').sfx('secret').give('scrap2').hero('e21.open').solve(21);
  else c.set('trunk_open').sfx('padlock').give('scrap3').hero('e29.open').solve(29);
  return true;
}

// Exposed for tests: the state after applying several inputs (rejected inputs leave it unchanged).
export function playAll(state: GameState, inputs: readonly Input[]): { state: GameState; outcomes: Outcome[] } {
  let s = cloneState(state);
  const outcomes: Outcome[] = [];
  for (const input of inputs) {
    const o = interact(s, input);
    outcomes.push(o);
    s = o.state;
  }
  return { state: s, outcomes };
}

// Marks every notebook entry as read (the notebook screen was opened).
export function readNotes(s: GameState): GameState {
  return s.unread.length ? { ...s, unread: [] } : s;
}

// Exposed for the door spawn points (UI uses them to place the hero when going back out).
export { DOOR_SPAWN };
