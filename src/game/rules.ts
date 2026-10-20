// The story rules: what each verb, item, exit, keypad and chess input does in each state (PRD puzzle chain E01-E17,
// character states, guarded rooms and captures). interact() is pure: it returns a new state, the beats to play and
// the telemetry facts.
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
import { CharacterId, Facing, GameState, GuardedRoom, Input, ItemId, KeypadId, NoteId, Outcome, PlaceId, Point, Verb } from './types';

export const CODES: Record<KeypadId, string> = { computer: '7867', safe: '1987' };
// The notebook entry that tells each code: the keypad does not open before it is known (no guessing).
export const CODE_NOTE: Record<KeypadId, NoteId> = { computer: 'n08', safe: 'n11' };

export function newGame(): GameState {
  return {
    v: 1,
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
      if (input.exit === 'cellar.toGarage' && c.is('trap_locked')) {
        c.hero('line.trapLocked');
        return done(c);
      }
      if (input.exit === 'cellar.toFront') c.clear('trap_locked');
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
  }
}

// Moves the hero to another place, running the events tied to a place change in this order: inhabitants going back
// to their room when the hero leaves it, the washing machine's end of cycle, then a capture if the destination is
// a guarded room with its occupant inside.
function goTo(c: Ctx, to: PlaceId, spawn: Point, face: Facing): void {
  const from = c.s.place;
  if (from === 'florent' && c.state('florent') === 'drumming' && c.is('oring_taken')) {
    c.move('florent', 'in_room').narrator('florent.back');
  }
  if (from === 'theo' && c.state('theo') === 'chess' && c.is('cube_solved')) {
    c.move('theo', 'in_room').set('theo_back');
    c.cut('cut07', (k) => k.say('theo', 'line.theoBack').say('theo', 'line.theoMono1').say('theo', 'line.theoMono2').say('theo', 'line.theoMono3').note('n07'));
  }
  if (c.is('machine_running')) {
    c.clear('machine_running').set('machine_done').sfx('ding').narrator('line.machineDing').say('mom', 'mom.machine');
    c.move('mom', 'gardening').solve(17);
  }
  if (isGuardedRoom(to)) {
    const who = occupant(to, c.s.chars);
    if (who) {
      capture(c, to, who);
      return;
    }
  }
  c.s.place = to;
  c.s.pos = { ...spawn };
  c.s.facing = face;
  c.beats.push({ type: 'room', place: to });
}

function capture(c: Ctx, room: GuardedRoom, who: CharacterId): void {
  const again = c.is('shutter_open');
  c.sfx('capture').say(who, again ? 'line.captureAgain' : `capture.${who}`);
  c.s.captures += 1;
  c.events.push({ type: 'capture', room, count: c.s.captures });
  c.beats.push({ type: 'capture' });
  c.set('trap_locked');
  c.s.place = 'cellar';
  c.s.pos = { ...CELLAR_SPAWN };
  c.s.facing = 'down';
  c.beats.push({ type: 'room', place: 'cellar' });
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
  const room = h.door as GuardedRoom;
  const who = occupant(room, c.s.chars);
  if (verb === 'look') {
    c.hero(who ? `door.${room}.occupied` : `door.${room}.empty`);
    return;
  }
  if (verb === 'talk') {
    if (!who) return;
    c.say(who, `${who}.door`).note(DOOR_NOTE[who]);
    return;
  }
  // use: open the door and go in (never blocked; a capture when the occupant is inside).
  c.sfx('door');
  goTo(c, room, { x: 36, y: 116 }, 'right');
}

function hotspotVerb(c: Ctx, id: string, verb: Verb): void {
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
    // E16: the doorbell sends Papa to the kitchen for good.
    case 'front.bell:use':
      if (!c.is('door_unlocked')) c.hero('line.bellRefuse');
      else if (c.state('dad') !== 'at_desk') c.hero('line.bellNobody');
      else {
        c.sfx('bell');
        c.cut('cut02', (k) => k.narrator('cut02.hide').say('dad', 'line.dadDoor1').say('dad', 'line.dadDoor2'));
        c.move('dad', 'cooking').solve(16);
      }
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
    // E03: the drumsticks in the bread basket, the drums.
    case 'dining.basket:look':
      c.hero(c.is('sticks_taken') ? 'dining.basket.lookEmpty' : 'dining.basket.look');
      return;
    case 'dining.basket:take':
      if (c.is('sticks_taken')) c.hero('dining.basket.empty');
      else c.set('sticks_taken').give('sticks').hero('dining.basket.take');
      return;
    case 'music.drums:look':
      c.hero(c.played('cut05') ? 'music.drums.lookPlayed' : 'music.drums.look');
      return;
    case 'music.drums:use':
      c.hero(c.played('cut05') ? 'music.drums.usePlayed' : 'music.drums.use');
      return;
    // E04-E06: the queen on Julien's trophy, the chessboard, the Rubik's Cube.
    case 'julien.trophy:look':
      c.hero(c.is('queen_taken') ? 'julien.trophy.lookEmpty' : 'julien.trophy.look');
      return;
    case 'julien.trophy:take':
      if (c.is('queen_taken')) c.hero('julien.trophy.empty');
      else c.set('queen_taken').give('queen').hero('julien.trophy.take');
      return;
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
    case 'living.bookshelf:look':
      c.hero(c.is('booklet_taken') ? 'living.bookshelf.lookEmpty' : 'living.bookshelf.look');
      return;
    case 'living.bookshelf:take':
      if (c.is('booklet_taken')) c.hero('living.bookshelf.empty');
      else c.set('booklet_taken').give('booklet').hero('living.bookshelf.take');
      return;
    case 'theo.cube:look':
      c.hero(c.is('cube_solved') ? 'theo.cube.lookSolved' : 'theo.cube.look');
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
    // E17: the washing machine.
    case 'utility.shelf:look':
      c.hero(c.is('detergent_taken') ? 'utility.shelf.lookEmpty' : 'utility.shelf.look');
      return;
    case 'utility.shelf:take':
      if (c.is('detergent_taken')) c.hero('utility.shelf.empty');
      else c.set('detergent_taken').give('detergent').hero('utility.shelf.take');
      return;
    case 'utility.machine:look':
      c.hero(c.is('machine_done') ? 'utility.machine.lookDone' : c.is('machine_running') ? 'utility.machine.lookRunning' : 'utility.machine.look');
      return;
    case 'utility.machine:use':
      c.hero(c.is('machine_done') || c.is('machine_running') ? 'line.machineDone' : 'line.machineEmpty');
      return;
    // E08-E10: the Nerf modding kit, the wrench, the shower, the mirror, the painting and the safe.
    case 'florent.kit:look':
      c.hero(c.is('oring_taken') ? 'florent.kit.lookEmpty' : 'florent.kit.look');
      return;
    case 'florent.kit:take':
      if (c.is('oring_taken')) c.hero('florent.kit.empty');
      else c.set('oring_taken').give('oring').hero('florent.kit.take');
      return;
    case 'garage.bench:look':
      c.hero(c.is('wrench_taken') ? 'garage.bench.lookEmpty' : 'garage.bench.look');
      return;
    case 'garage.bench:take':
      if (c.is('wrench_taken')) c.hero('garage.bench.empty');
      else c.set('wrench_taken').give('wrench').hero('garage.bench.take');
      return;
    case 'parents.shower:look':
      c.hero(c.is('mirror_code') ? 'parents.shower.lookDone' : c.is('shower_repaired') ? 'parents.shower.lookRepaired' : 'parents.shower.look');
      return;
    case 'parents.shower:use':
      if (!c.is('shower_repaired')) c.hero('line.showerBroken');
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
    // E14: the pliers.
    case 'garage.drawer:look':
      c.hero(c.is('pliers_taken') ? 'garage.drawer.lookEmpty' : 'garage.drawer.look');
      return;
    case 'garage.drawer:take':
      if (c.is('pliers_taken')) c.hero('garage.drawer.empty');
      else c.set('pliers_taken').give('pliers').hero('garage.drawer.take');
      return;
    // E02: the pole and its extension.
    case 'garage.pole:look':
      c.hero(c.is('pole_taken') ? 'garage.pole.lookEmpty' : 'garage.pole.look');
      return;
    case 'garage.pole:take':
      if (c.is('pole_taken')) c.hero('garage.pole.empty');
      else c.set('pole_taken').give('pole').hero('garage.pole.take');
      return;
    case 'garage.crate:look':
      c.hero(c.is('extension_taken') ? 'garage.crate.lookEmpty' : 'garage.crate.look');
      return;
    case 'garage.crate:take':
      if (c.is('extension_taken')) c.hero('garage.crate.empty');
      else c.set('extension_taken').give('extension').hero('garage.crate.take');
      return;
    // E11-E13: the attic, the secret door, Papa's lab.
    case 'attic.door:use':
      c.hero('line.doorLocked');
      return;
    case 'laundry.notebook:use':
      c.hero('laundry.notebook.use');
      return;
    // E15: the wine cellar.
    case 'cellar.rack:look':
      c.hero(c.is('bar_taken') ? 'cellar.rack.lookEmpty' : 'cellar.rack.look');
      return;
    case 'cellar.rack:take':
      if (c.is('bar_taken')) c.hero('cellar.rack.empty');
      else c.set('bar_taken').give('bar').hero('cellar.rack.take');
      return;
    case 'cellar.shutter:use':
      c.hero('line.shutterStuck');
      return;
  }
  if (verb === 'look') {
    c.hero(`${id}.look`);
    return;
  }
  c.wrong();
}

// Every item>target pair that has a rule; any other pair only answers a generic wrong line (checked by a test, used
// to prune the exhaustive search).
export const USE_RULES: readonly string[] = [
  'key>front.door',
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
  'bar>cellar.shutter',
];

function useItem(c: Ctx, item: ItemId, target: string): void {
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
      c.remove('detergent').set('machine_running').sfx('machine').hero('e17.start');
      return;
    case 'oring>parents.shower':
      c.remove('oring').set('oring_fitted').hero('e08.oring');
      repairShower(c);
      return;
    case 'wrench>parents.shower':
      c.remove('wrench').set('wrench_used').hero('e08.wrench');
      repairShower(c);
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
      c.remove('oldkey').set('secret_open').sfx('secret');
      c.cut('cut10', (k) => k.narrator('cut10'));
      c.solve(12);
      return;
    case 'scrap>laundry.notebook':
      if (!c.is('computer_read')) {
        c.hero('line.finalMissing');
        return;
      }
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
    case 'bar>cellar.shutter':
      c.remove('bar').set('shutter_open').sfx('door').hero('e15.open').solve(15);
      return;
  }
  c.wrong();
}

function repairShower(c: Ctx): void {
  if (c.is('oring_fitted') && c.is('wrench_used') && !c.is('shower_repaired')) c.set('shower_repaired').hero('e08.done').solve(8);
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
  const place: PlaceId = id === 'computer' ? 'office' : 'parents';
  const open = id === 'computer' ? c.is('computer_read') : c.is('safe_open');
  if (c.s.place !== place || open || !c.s.notes.includes(CODE_NOTE[id]) || !/^\d{4}$/.test(code)) return false;
  if (code !== CODES[id]) {
    c.sfx('wrong').hero('line.codeWrong');
    return true;
  }
  c.sfx('beep');
  if (id === 'computer') {
    c.set('computer_read');
    c.beats.push({ type: 'documents' });
    c.note('n09').note('n10').solve(7);
  } else {
    c.set('safe_open').narrator('e10.open');
    for (const item of ['oldkey', 'photo', 'scrap', 'note'] as const) c.give(item);
    c.note('n12').solve(10);
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
