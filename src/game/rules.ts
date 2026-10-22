// The story rules: what each verb, item, exit, keypad, chess and time input does in each state (PRD puzzle chain
// E01-E19, character states, timers, guarded places and captures). interact() is pure: it returns a new state, the
// beats to play and the telemetry facts.
import { isSolution } from './chess';
import { cloneState, Ctx } from './ctx';
import { BUSY_LINE, BYE, findOption } from './dialogue';
import {
  CELLAR_SPAWN,
  characterPlacement,
  DOOR_SPAWN,
  findExit,
  findHotspot,
  HotspotDef,
  isGuardedRoom,
  occupant,
  START_CHARS,
  START_POS,
} from './world';
import { CharacterId, DoorRoom, Facing, Flag, GameState, GuardedRoom, Input, ItemId, KeypadId, NoteId, Outcome, PlaceId, Point, SfxName, Verb } from './types';

export const CODES: Record<KeypadId, string> = { computer: '7867', safe: '1987', lab: '2510' };
// The notebook entry that tells each code: the keypad does not open before it is known (no guessing).
export const CODE_NOTE: Record<KeypadId, NoteId> = { computer: 'n08', safe: 'n11', lab: 'n10' };
const KEYPAD_PLACE: Record<KeypadId, PlaceId> = { computer: 'office', safe: 'parents', lab: 'attic' };

// Timer durations in ms of the timer clock (PRD "Timers").
export const TIMER_MS = { answer: 30_000, outside: 120_000, back: 60_000, dough: 120_000 } as const;

export function newGame(): GameState {
  return {
    v: 2,
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
    seen: [],
    tutorial: 0,
    playMs: 0,
    clock: 0,
    timers: { dad: null, dough: null },
    finished: false,
    wrongIdx: 0,
  };
}

const rejected = (s: GameState): Outcome => ({ state: s, beats: [], events: [], accepted: false });
const done = (c: Ctx): Outcome => ({ state: c.s, beats: c.beats, events: c.events, accepted: true });

export function interact(state: GameState, input: Input): Outcome {
  if (state.finished) return rejected(state);
  const c = new Ctx(state);
  switch (input.kind) {
    case 'verb': {
      const h = findHotspot(state, input.target);
      if (!h || !h.verbs.includes(input.verb)) return rejected(state);
      if (h.character) character(c, h.character, input.verb);
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
      useItem(c, input.item, input.target);
      return done(c);
    }
    case 'lookItem':
      if (!state.inventory.includes(input.item)) return rejected(state);
      c.hero(`item.${input.item}.look`);
      return done(c);
    case 'exit': {
      const e = findExit(state, input.exit);
      if (!e) return rejected(state);
      c.sfx('door');
      goTo(c, e.to, e.spawn, e.spawnFace);
      return done(c);
    }
    case 'dialogue': {
      const present = characterPlacement(input.character, state);
      if (!present || present.place !== state.place) return rejected(state);
      if (input.option === BYE) return done(c);
      const option = findOption(state, input.character, input.option);
      if (!option) return rejected(state);
      if (!c.s.seen.includes(option.id)) c.s.seen.push(option.id);
      option.run(c);
      c.beats.push({ type: 'dialogue', character: input.character });
      return done(c);
    }
    case 'keypad':
      return keypad(c, input.keypad, input.code) ? done(c) : rejected(state);
    case 'chess': {
      if (state.place !== 'living' || !c.is('theo_back') || c.is('chess_solved') || !isSolution(input.moves)) return rejected(state);
      c.set('chess_solved').hero('e06.solved').note('n08').solve(6);
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

// ---------- time ----------

export function nextDeadline(s: GameState): number | null {
  const ds = [s.timers.dad, s.timers.dough].filter((d): d is number => d !== null);
  return ds.length ? Math.min(...ds) : null;
}

// Moves the timer clock forward, resolving every timer that ends on the way, in time order (a timer started by an
// expiry counts from that expiry).
function advanceClock(c: Ctx, to: number): void {
  for (;;) {
    const next = nextDeadline(c.s);
    if (next === null || next > to || c.s.finished) break;
    c.s.clock = Math.max(c.s.clock, next);
    if (c.s.timers.dough !== null && c.s.timers.dough <= next) doughReady(c);
    else dadTimer(c);
  }
  c.s.clock = Math.max(c.s.clock, to);
}

// The doorbell sequence: answering -> (front door view) outside -> returning -> at his desk.
function dadTimer(c: Ctx): void {
  const now = c.s.clock;
  switch (c.state('dad')) {
    case 'answering':
      c.move('dad', 'outside');
      c.s.timers.dad = now + TIMER_MS.outside;
      c.sfx('door').cinematic(true).beats.push({ type: 'view', view: 'door' });
      c.say('dad', 'line.dadAtDoor').wait(SCENE_MS.view).cinematic(false);
      arrival(c, 'front');
      return;
    case 'outside':
      c.move('dad', 'returning');
      c.s.timers.dad = now + TIMER_MS.back;
      c.say('dad', 'line.dadGoingBack');
      return;
    default:
      c.move('dad', 'at_desk');
      c.s.timers.dad = null;
      arrival(c, 'office');
  }
}

// E19: the dough is ready; Papa comes to the kitchen for good (CUT12), whatever the doorbell sequence was doing.
function doughReady(c: Ctx): void {
  c.s.timers.dough = null;
  c.s.timers.dad = null;
  c.move('dad', 'cooking');
  c.cut('cut12', (k) => {
    k.cinematic(true).beats.push({ type: 'view', view: 'kitchen' });
    k.say('dad', 'line.dadDough').wait(SCENE_MS.view).cinematic(false);
  });
  arrival(c, 'kitchen');
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
  const from = c.s.place;
  if (from === 'florent' && c.state('florent') === 'drumming' && c.is('oring_taken')) {
    c.move('florent', 'in_room').narrator('florent.back');
  }
  if (from === 'theo' && c.state('theo') === 'chess' && c.is('cube_solved')) {
    c.move('theo', 'in_room').set('theo_back');
    c.cut('cut07', (k) => k.say('theo', 'line.theoBack').say('theo', 'line.theoMono1').say('theo', 'line.theoMono2').note('n07'));
  }
  if (c.is('machine_running')) {
    c.clear('machine_running').set('machine_done').sfx('ding').narrator('line.machineDing').say('mom', 'mom.machine');
    c.move('mom', 'gardening').solve(17);
  }
  if (isGuardedRoom(to)) {
    const who = occupant(to, c.s.chars);
    if (who) {
      // Sam steps into the room first: the capture scene plays there.
      c.beats.push({ type: 'room', place: to, pos: { ...spawn }, facing: face });
      capture(c, to, who);
      return;
    }
  }
  c.s.place = to;
  c.s.pos = { ...spawn };
  c.s.facing = face;
  c.beats.push({ type: 'room', place: to });
}

// The capture scene, which cannot be skipped (PRD "Guarded places and captures"): a boy shouts for Papa, who comes
// 2 s later; the adult says the capture line, takes Sam to the cellar, says "don't run away" and leaves 3 s later.
export const SCENE_MS = { call: 2000, beforeCellar: 1500, leave: 3000, view: 1500 } as const;

function capture(c: Ctx, room: GuardedRoom, who: CharacterId): void {
  const again = c.is('hatch_open');
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
  c.narrator(again ? 'capture.cellarOpen' : 'capture.cellar');
}

function character(c: Ctx, id: CharacterId, verb: Verb): void {
  if (verb === 'talk') {
    const busy = BUSY_LINE[id];
    if (busy) c.say(id, busy);
    else c.beats.push({ type: 'dialogue', character: id });
    return;
  }
  c.hero(`${id}.look`);
}

const DOOR_NOTE: Record<CharacterId, NoteId> = { julien: 'n02', florent: 'n03', theo: 'n04', mom: 'n05', dad: 'n06' };

function doorVerb(c: Ctx, h: HotspotDef, verb: Verb): void {
  const room = h.door as DoorRoom;
  const who = occupant(room, c.s.chars);
  if (verb === 'look') {
    c.hero(who ? `door.${room}.occupied` : `door.${room}.empty`);
    return;
  }
  if (verb === 'talk') {
    if (!who) return;
    if (who === 'dad' && c.state('dad') === 'answering') c.say('dad', 'dad.doorComing');
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
  'garage.bike': 'gag',
  'attic.horse': 'gag',
  'attic.lamp': 'gag',
  'attic.trunk': 'gag',
  'attic.stain': 'gag',
  'laundry.mixer': 'robot',
  'landing.lamp': 'gag',
  'wc1.freshener': 'spray',
  'wc1.toilet': 'water',
  'julien.radio': 'gag',
  'bathroom.sink': 'water',
  'bathroom.scale': 'gag',
  'bathroom.duck': 'gag',
  'theo.lamp': 'gag',
  'theo.cube': 'gag',
  'florent.nerf': 'gag',
  'florent.console': 'gag',
  'parents.sink': 'water',
};

const GATES = ['front.gateLeft', 'front.gateRight', 'football.gate', 'pool.gate'];
const INGREDIENTS: Partial<Record<ItemId, Flag>> = { ricemilk: 'milk_in', chestnut: 'chestnut_in', riceflour: 'riceflour_in' };

// A take hotspot that gives its item once: [flag set when taken, item, line].
const TAKES: Readonly<Record<string, readonly [Flag, ItemId, string]>> = {
  'hall.shoes': ['gatekey_taken', 'gatekey', 'hall.shoes.take'],
  'music.basket': ['sticks_taken', 'sticks', 'music.basket.take'],
  'julien.trophy': ['queen_taken', 'queen', 'julien.trophy.take'],
  'living.bookshelf': ['booklet_taken', 'booklet', 'living.bookshelf.take'],
  'utility.shelf': ['detergent_taken', 'detergent', 'utility.shelf.take'],
  'florent.kit': ['oring_taken', 'oring', 'florent.kit.take'],
  'garage.bench': ['wrench_taken', 'wrench', 'garage.bench.take'],
  'garage.drawer': ['pliers_taken', 'pliers', 'garage.drawer.take'],
  'garage.pole': ['pole_taken', 'pole', 'garage.pole.take'],
  'football.bench': ['extension_taken', 'extension', 'football.bench.take'],
  'cellar.rack': ['bar_taken', 'bar', 'cellar.rack.take'],
  'kitchen.fridge': ['milk_taken', 'ricemilk', 'kitchen.fridge.take'],
};

function hotspotVerb(c: Ctx, id: string, verb: Verb): void {
  const take = TAKES[id];
  if (take) {
    const [flag, item, line] = take;
    if (verb === 'look') {
      c.hero(c.is(flag) ? `${id}.lookEmpty` : `${id}.look`);
      return;
    }
    if (verb === 'take') {
      if (c.is(flag)) c.hero(`${id}.empty`);
      else c.set(flag).give(item).hero(line);
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
      if (!c.is('door_unlocked')) c.hero('line.bellRefuse');
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
      c.hero(c.is('dough_mixed') ? 'kitchen.robot.lookDone' : 'kitchen.robot.look');
      return;
    case 'kitchen.robot:use':
      if (c.is('dough_mixed')) c.hero('kitchen.robot.done');
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
    case 'pool.pump:use':
      if (!c.is('plug_fixed')) c.hero('line.pumpPlug');
      else if (!c.is('cover_open')) c.hero('line.pumpCover');
      else if (c.is('pool_drained')) c.hero('pool.pump.done');
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
      c.hero(c.is('power_on') ? 'garage.breaker.lookOn' : 'garage.breaker.look');
      return;
    case 'garage.breaker:use':
      if (c.is('power_on')) c.hero('garage.breaker.already');
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
    case 'laundry.notebook:use':
      c.hero('laundry.notebook.use');
      return;
    // E15: the cellar hatch, stuck from below.
    case 'cellar.hatch:use':
      c.hero('line.hatchStuck');
      return;
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
  'scrap>laundry.notebook',
  'bar>cellar.hatch',
  'ricemilk>kitchen.robot',
  'chestnut>kitchen.robot',
  'riceflour>kitchen.robot',
];

function useItem(c: Ctx, item: ItemId, target: string): void {
  if (item === 'gatekey' && GATES.includes(target)) {
    c.remove('gatekey').set('gates_open').sfx('door').hero('e18.open').solve(18);
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
  switch (`${item}>${target}`) {
    case 'key>front.door':
      c.remove('key').set('door_unlocked').sfx('door').solve(1);
      c.cut('cut01', (k) => k.narrator('cut01'));
      goTo(c, 'hall', { x: 160, y: 114 }, 'down');
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
      c.cut('cut05', (k) => k.narrator('cut05').say('florent', 'line.florentDrums'));
      c.move('florent', 'drumming').solve(3);
      return;
    case 'queen>living.chess':
      c.remove('queen').set('queen_placed');
      c.cut('cut06', (k) => k.narrator('cut06').say('theo', 'line.theoQueen'));
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
    case 'scrap>laundry.notebook':
      c.remove('scrap').solve(13).finish();
      c.cut('cut11', (k) =>
        k
          .narrator('line.final1')
          .say('dad', 'line.final2')
          .hero('line.final3')
          .say('dad', 'line.final4')
          .say('mom', 'line.final5')
          .say('theo', 'line.final6')
          .say('julien', 'line.final7')
          .say('florent', 'line.final8'),
      );
      c.beats.push({ type: 'ending' });
      return;
    case 'bar>cellar.hatch':
      c.remove('bar').set('hatch_open').sfx('door').hero('e15.open').solve(15);
      return;
  }
  c.wrong();
}

// E12: the lab door opens once both its lock (old key) and its keypad (code 2510) are done, in any order.
function openLab(c: Ctx): void {
  if (c.is('lab_lock') && c.is('lab_code') && !c.is('secret_open')) {
    c.set('secret_open').sfx('secret');
    c.cut('cut10', (k) => k.narrator('cut10'));
    c.solve(12);
  }
}

function combine(c: Ctx, a: ItemId, b: ItemId): void {
  const pair = [a, b].sort().join('+');
  if (pair === 'extension+pole') {
    c.remove('pole').remove('extension').give('longpole').hero('combine.pole');
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
    c.note('n09').note('n10').solve(7);
  } else if (id === 'safe') {
    c.set('safe_open').narrator('e10.open');
    for (const item of ['oldkey', 'photo', 'scrap', 'note'] as const) c.give(item);
    c.note('n12').solve(10);
  } else {
    c.set('lab_code').hero('e12.code');
    openLab(c);
  }
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
