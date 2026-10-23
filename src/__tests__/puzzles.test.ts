// T-06 / T-08 / T-30: each puzzle E01-E19 - refusals with the rule's line and no change, effects exactly once,
// puzzle_solved once with the right number (AC-21); keypads (AC-27); the pool (AC-28); the ending (AC-32).
import { interact, newGame, playAll } from '../game/rules';
import { SOLUTION } from '../game/solution';
import { CharacterStates, GameState, Input, ItemId, PlaceId } from '../game/types';

const hero = (key: string) => ({ type: 'say', speaker: 'hero', key });
const at = (place: PlaceId, extra: Partial<GameState> = {}): GameState => ({ ...newGame(), place, ...extra });
const flags = (...f: (keyof GameState['flags'])[]) => Object.fromEntries(f.map((x) => [x, true])) as GameState['flags'];
const chars = (patch: Partial<CharacterStates>): CharacterStates => ({ ...newGame().chars, ...patch });
const use = (target: string): Input => ({ kind: 'verb', verb: 'use', target });
const item = (i: ItemId, target: string): Input => ({ kind: 'item', item: i, target });

// A refusal: accepted, the rule's line, and nothing but that line changes.
function expectRefusal(s: GameState, input: Input, key: string) {
  const o = interact(s, input);
  expect(o.accepted).toBe(true);
  expect(o.beats).toContainEqual(hero(key));
  expect(o.events).toEqual([]);
  expect({ ...o.state, wrongIdx: 0 }).toEqual({ ...s, wrongIdx: 0 });
}

describe('the whole solution (AC-21, AC-32)', () => {
  const { state, outcomes } = playAll(newGame(), SOLUTION);
  const events = outcomes.flatMap((o) => o.events);

  it('is accepted step by step and reaches the ending', () => {
    expect(outcomes.every((o) => o.accepted)).toBe(true);
    expect(state.finished).toBe(true);
    expect(state.flags.ending).toBe(true);
  });

  it('solves every puzzle exactly once except the doorbell (the dough frees the office)', () => {
    const puzzles = events.filter((e) => e.type === 'puzzle').map((e) => (e as { puzzle: number }).puzzle);
    expect([...puzzles].sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1).filter((n) => n !== 16));
  });

  it('E30 ends the game: game_complete once, with the captures, then the ending beat', () => {
    expect(events.filter((e) => e.type === 'complete')).toEqual([{ type: 'complete', captures: 0 }]);
    const last = outcomes[outcomes.length - 1];
    expect(last.beats[last.beats.length - 1]).toEqual({ type: 'ending' });
    expect(interact(state, { kind: 'verb', verb: 'look', target: 'laundry.cake' }).accepted).toBe(false);
  });

  it('replaying any solving step after the ending changes nothing', () => {
    for (const input of SOLUTION) expect(interact(state, input).accepted).toBe(false);
    expect(interact(state, { kind: 'tick', ms: 1000 }).accepted).toBe(false);
  });
});

describe('E01: the key under the doormat', () => {
  it('the door is locked without the key; the key opens it once and Sam slips in', () => {
    expectRefusal(at('front'), use('front.door'), 'front.door.locked');
    const { state, outcomes } = playAll(at('front'), [{ kind: 'verb', verb: 'take', target: 'front.doormat' }, item('key', 'front.door')]);
    expect(outcomes[1].events).toEqual([{ type: 'puzzle', puzzle: 1 }]);
    expect(state.place).toBe('hall');
    expect(state.inventory).toEqual([]);
    expectRefusal({ ...state, place: 'front' }, { kind: 'verb', verb: 'take', target: 'front.doormat' }, 'front.doormat.empty');
  });
});

describe('E16: the doorbell', () => {
  it('refuses before E01, while Papa is not at his desk and once he cooks; otherwise starts the sequence', () => {
    expectRefusal(at('front'), use('front.bell'), 'line.bellRefuse');
    expectRefusal(at('front', { flags: flags('door_unlocked'), chars: chars({ dad: 'cooking' }) }), use('front.bell'), 'line.bellNobody');
    for (const dad of ['answering', 'outside', 'returning'] as const) {
      expectRefusal(at('front', { flags: flags('door_unlocked'), chars: chars({ dad }) }), use('front.bell'), 'line.bellBusy');
    }
    const o = interact(at('front', { flags: flags('door_unlocked') }), use('front.bell'));
    expect(o.state.chars.dad).toBe('answering');
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 16 }]);
    expect(o.beats).toContainEqual({ type: 'say', speaker: 'dad', key: 'line.dadAnswer' });
  });
});

describe('E18: the side gates (AC-53)', () => {
  it('locked without the key; the key from the hall shoes opens both for good', () => {
    const gates = [
      ['front', 'front.gateLeft'],
      ['front', 'front.gateRight'],
      ['football', 'football.gate'],
      ['pool', 'pool.gate'],
    ] as const;
    for (const [place, gate] of gates) expectRefusal(at(place), use(gate), 'line.gateLocked');
    const { state, outcomes } = playAll(at('hall', { flags: flags('door_unlocked') }), [
      { kind: 'verb', verb: 'take', target: 'hall.shoes' },
      { kind: 'exit', exit: 'hall.toFront' },
      item('gatekey', 'front.gateLeft'),
    ]);
    expect(outcomes[0].state.inventory).toEqual(['gatekey']);
    expect(outcomes[2].events).toEqual([{ type: 'puzzle', puzzle: 18 }]);
    expect(state.flags.gates_open).toBe(true);
    expect(state.inventory).toEqual([]);
  });
});

describe('E19: the dough', () => {
  it('the rice milk in the fridge, the two flours in the utility room; the processor waits for all three', () => {
    expectRefusal(at('kitchen'), { kind: 'verb', verb: 'take', target: 'kitchen.fridge' }, 'kitchen.fridge.closed');
    const opened = interact(at('kitchen'), use('kitchen.fridge')).state;
    expect(opened.flags.fridge_open).toBe(true);
    const milk = interact(opened, { kind: 'verb', verb: 'take', target: 'kitchen.fridge' });
    expect(milk.state.inventory).toEqual(['ricemilk']);
    const flours = interact(at('utility'), { kind: 'verb', verb: 'take', target: 'utility.flours' });
    expect(flours.state.inventory).toEqual(['chestnut', 'riceflour']);
    expectRefusal(at('kitchen'), use('kitchen.robot'), 'kitchen.robot.empty');
    const half = interact(at('kitchen', { inventory: ['ricemilk'] }), item('ricemilk', 'kitchen.robot')).state;
    expectRefusal(half, use('kitchen.robot'), 'line.doughMissing');
  });
});

describe('E02: the ball on the pool cover', () => {
  it('the extension is under the football corner bench, not next to the pole', () => {
    expect(interact(at('football'), { kind: 'verb', verb: 'take', target: 'football.bench' }).state.inventory).toEqual(['extension']);
    expect(interact(at('garage'), { kind: 'verb', verb: 'take', target: 'garage.crate' }).accepted).toBe(false);
  });

  it('the pole alone is too short; the extended pole frees the ball and Julien runs out', () => {
    expectRefusal(at('pool', { inventory: ['pole'] }), item('pole', 'pool.ball'), 'line.poleShort');
    const o = interact(at('pool', { inventory: ['longpole'] }), item('longpole', 'pool.ball'));
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 2 }]);
    expect(o.state.chars.julien).toBe('football');
    expect(o.state.inventory).toEqual([]);
    expect(o.beats).toContainEqual({ type: 'say', speaker: 'julien', key: 'line.julienBall' });
  });
});

describe('E03: the drumsticks', () => {
  it('the drums without sticks say so; the sticks bring Florent down', () => {
    expectRefusal(at('music'), use('music.drums'), 'music.drums.use');
    const { state, outcomes } = playAll(at('music'), [{ kind: 'verb', verb: 'take', target: 'music.basket' }, item('sticks', 'music.drums')]);
    expect(outcomes[1].events).toEqual([{ type: 'puzzle', puzzle: 3 }]);
    expect(state.chars.florent).toBe('drumming');
    expect(state.inventory).toEqual([]);
  });
});

describe('E04: the white queen', () => {
  it('the chessboard misses its queen; putting it back starts Théo\'s game', () => {
    expectRefusal(at('living', { notes: ['n01', 'n04'] }), use('living.chess'), 'living.chess.lookMissing');
    const o = interact(at('living', { inventory: ['queen'] }), item('queen', 'living.chess'));
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 4 }]);
    expect(o.state.chars.theo).toBe('chess');
    expectRefusal(o.state, use('living.chess'), 'line.chessBusy');
  });
});

describe('E05: the Rubik\'s Cube', () => {
  it('the booklet solves the cube once', () => {
    const o = interact(at('theo', { inventory: ['booklet'], chars: chars({ theo: 'chess' }) }), item('booklet', 'theo.cube'));
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 5 }]);
    expect(o.state.flags.cube_solved).toBe(true);
    expect(o.state.inventory).toEqual([]);
  });
});

describe('E17: the breaker and the washing machine', () => {
  it('needs the breaker back on and detergent; ends at the next place change and Maman goes to the garden for good', () => {
    expectRefusal(at('utility'), use('utility.machine'), 'line.machinePower');
    expectRefusal(at('utility', { inventory: ['detergent'] }), item('detergent', 'utility.machine'), 'line.machinePower');
    const power = interact(at('garage'), use('garage.breaker'));
    expect(power.state.flags.power_on).toBe(true);
    expectRefusal(power.state, use('garage.breaker'), 'garage.breaker.already');
    expectRefusal(at('utility', { flags: flags('power_on') }), use('utility.machine'), 'line.machineEmpty');
    const started = interact(at('utility', { inventory: ['detergent'], flags: flags('power_on') }), item('detergent', 'utility.machine'));
    expect(started.events).toEqual([]);
    expect(started.state.flags.machine_running).toBe(true);
    expect(started.state.chars.mom).toBe('folding');
    const ding = interact(started.state, { kind: 'exit', exit: 'utility.toCorridor' });
    expect(ding.events).toEqual([{ type: 'puzzle', puzzle: 17 }]);
    expect(ding.state.chars.mom).toBe('gardening');
    expect(ding.beats).toContainEqual({ type: 'sfx', sfx: 'ding' });
    expectRefusal({ ...ding.state, place: 'utility' }, use('utility.machine'), 'line.machineDone');
  });
});

describe('E07 / E10 / E12: the keypads (AC-27)', () => {
  const office = (extra: Partial<GameState> = {}) => at('office', { chars: chars({ dad: 'cooking' }), ...extra });
  const parents = (extra: Partial<GameState> = {}) => at('parents', { chars: chars({ mom: 'gardening' }), flags: flags('safe_found'), ...extra });

  it('do not open before their code is in the notebook (no guessing)', () => {
    expectRefusal(office(), use('office.computer'), 'line.codeUnknown');
    expectRefusal(parents(), use('parents.safe'), 'line.codeUnknown');
    expect(interact(office(), { kind: 'keypad', keypad: 'computer', code: '7867' }).accepted).toBe(false);
    expect(interact(parents(), { kind: 'keypad', keypad: 'safe', code: '1987' }).accepted).toBe(false);
  });

  it('once the code is known: only the right code opens, wrong codes have unlimited tries', () => {
    const s = office({ notes: ['n01', 'n08'] });
    expect(interact(s, use('office.computer')).beats).toEqual([{ type: 'keypad', keypad: 'computer' }]);
    for (const code of ['0000', '1987', '7868', '9999']) expectRefusal(s, { kind: 'keypad', keypad: 'computer', code }, 'line.codeWrong');
    const ok = interact(s, { kind: 'keypad', keypad: 'computer', code: '7867' });
    expect(ok.events).toEqual([{ type: 'puzzle', puzzle: 7 }]);
    expect(ok.beats).toContainEqual({ type: 'documents' });
    expect(ok.state.flags.computer_read).toBe(true);
    expect(interact(ok.state, { kind: 'keypad', keypad: 'computer', code: '7867' }).accepted).toBe(false);

    const p = parents({ notes: ['n01', 'n11'] });
    expectRefusal(p, { kind: 'keypad', keypad: 'safe', code: '7867' }, 'line.codeWrong');
    const safe = interact(p, { kind: 'keypad', keypad: 'safe', code: '1987' });
    expect(safe.events).toEqual([{ type: 'puzzle', puzzle: 10 }]);
    expect(safe.state.inventory).toEqual(['oldkey', 'photo', 'scrap', 'note']);
    expect(safe.state.notes).toContain('n12');
  });

  it('the lab door keypad opens once N10 is known and only takes 2510', () => {
    const attic = (extra: Partial<GameState> = {}) => at('attic', { flags: flags('door_revealed'), ...extra });
    expectRefusal(attic(), use('attic.door'), 'line.doorLocked');
    expect(interact(attic(), { kind: 'keypad', keypad: 'lab', code: '2510' }).accepted).toBe(false);
    const s = attic({ notes: ['n01', 'n10'] });
    expect(interact(s, use('attic.door')).beats).toEqual([{ type: 'keypad', keypad: 'lab' }]);
    for (const code of ['0000', '7867', '1987']) expectRefusal(s, { kind: 'keypad', keypad: 'lab', code }, 'line.codeWrong');
    const ok = interact(s, { kind: 'keypad', keypad: 'lab', code: '2510' });
    expect(ok.state.flags.lab_code).toBe(true);
    expect(ok.events).toEqual([]);
  });

  it('codes must be 4 digits', () => {
    expect(interact(office({ notes: ['n08'] }), { kind: 'keypad', keypad: 'computer', code: '786' }).accepted).toBe(false);
  });

  it('the computer cannot be reached while Papa is at his desk', () => {
    const o = interact(at('corridor0', { flags: flags('door_unlocked') }), use('corridor0.officeDoor'));
    expect(o.state.place).toBe('cellar');
  });
});

describe('E08 / E09: the shower and the mirror', () => {
  const room = (inventory: ItemId[], extra: Partial<GameState> = {}) => at('parents', { chars: chars({ mom: 'gardening' }), inventory, ...extra });

  it('broken: "a seal is missing"; the wrench has nothing to tighten yet (AC-55)', () => {
    const look = interact(room([]), { kind: 'verb', verb: 'look', target: 'parents.shower' });
    expect(look.beats).toEqual([hero('parents.shower.look')]);
    expectRefusal(room([]), use('parents.shower'), 'line.showerBroken');
    expectRefusal(room(['wrench']), item('wrench', 'parents.shower'), 'line.wrenchNothing');
  });

  it('the O-ring fitted but not tightened leaks; the wrench then repairs it (E08, AC-55)', () => {
    const fitted = interact(room(['oring', 'wrench']), item('oring', 'parents.shower'));
    expect(fitted.events).toEqual([]);
    expect(fitted.state.inventory).toEqual(['wrench']);
    expect(interact(fitted.state, { kind: 'verb', verb: 'look', target: 'parents.shower' }).beats).toEqual([hero('parents.shower.lookLoose')]);
    const leak = interact(fitted.state, use('parents.shower'));
    expect(leak.beats).toContainEqual(hero('line.showerLoose'));
    expect(leak.state).toEqual(fitted.state);
    const repaired = interact(fitted.state, item('wrench', 'parents.shower'));
    expect(repaired.events).toEqual([{ type: 'puzzle', puzzle: 8 }]);
    expect(repaired.state.flags.shower_repaired).toBe(true);
    expect(repaired.state.inventory).toEqual([]);
  });

  it('the hot water reveals the safe code on the mirror and notes it; it stays for good', () => {
    const repaired = room([], { flags: flags('shower_repaired', 'oring_fitted', 'wrench_used') });
    const o = interact(repaired, use('parents.shower'));
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 9 }]);
    expect(o.state.notes).toContain('n11');
    expect(o.state.flags.mirror_code).toBe(true);
    expect(interact(o.state, { kind: 'verb', verb: 'look', target: 'parents.mirror' }).beats).toEqual([hero('parents.mirror.lookCode')]);
    const again = interact(o.state, use('parents.shower'));
    expect(again.events).toEqual([]);
    expect(again.beats).toContainEqual(hero('parents.shower.again'));
  });

  it('looking at the crooked painting reveals the safe', () => {
    const o = interact(room([]), { kind: 'verb', verb: 'look', target: 'parents.painting' });
    expect(o.state.flags.safe_found).toBe(true);
  });
});

describe('E14: draining the pool (AC-28)', () => {
  const pool = (extra: Partial<GameState> = {}) => at('pool', extra);

  it('the cover switch refuses before E02', () => {
    expectRefusal(pool(), use('pool.switch'), 'line.coverBall');
  });

  it('the pump refuses without the pliers, then with the cover closed', () => {
    expectRefusal(pool({ flags: flags('ball_freed') }), use('pool.pump'), 'line.pumpPlug');
    expectRefusal(pool({ flags: flags('ball_freed', 'plug_fixed') }), use('pool.pump'), 'line.pumpCover');
  });

  it('after draining, the bottle can be taken and E14 is solved when taken', () => {
    const { state, outcomes } = playAll(pool({ flags: flags('ball_freed'), inventory: ['pliers'] }), [
      use('pool.switch'),
      { kind: 'verb', verb: 'take', target: 'pool.bottle' },
      item('pliers', 'pool.pump'),
      use('pool.pump'),
      { kind: 'verb', verb: 'take', target: 'pool.bottle' },
    ]);
    expect(outcomes[1].beats).toContainEqual(hero('pool.bottle.deep'));
    expect(outcomes[1].events).toEqual([]);
    expect(outcomes[4].events).toEqual([{ type: 'puzzle', puzzle: 14 }]);
    expect(state.inventory).toEqual(['thinner']);
  });
});

describe('E11-E13: the attic, the lab door, the lab', () => {
  it('the thinner reveals a door with a lock and a keypad; it opens once both the old key and the code are used', () => {
    const attic = at('attic', { inventory: ['thinner', 'oldkey'], notes: ['n01', 'n10'] });
    const revealed = interact(attic, item('thinner', 'attic.stain'));
    expect(revealed.events).toEqual([{ type: 'puzzle', puzzle: 11 }]);
    const keyFirst = playAll(revealed.state, [item('oldkey', 'attic.door'), { kind: 'keypad', keypad: 'lab', code: '2510' }]);
    expect(keyFirst.outcomes[0].events).toEqual([]);
    expect(keyFirst.outcomes[0].state.flags.secret_open).toBeUndefined();
    expect(keyFirst.outcomes[1].events).toEqual([{ type: 'puzzle', puzzle: 12 }]);
    expect(keyFirst.state.flags.secret_open).toBe(true);
    const codeFirst = playAll(revealed.state, [{ kind: 'keypad', keypad: 'lab', code: '2510' }, use('attic.door'), item('oldkey', 'attic.door')]);
    expect(codeFirst.outcomes[1].beats).toContainEqual(hero('attic.door.lockStill'));
    expect(codeFirst.outcomes[2].events).toEqual([{ type: 'puzzle', puzzle: 12 }]);
  });

  it('the three fragments on the recipe notebook lead to the revelation (E13), then the jury rings (AC-67)', () => {
    let s = at('laundry', { inventory: ['scrap', 'scrap2', 'scrap3'], captures: 2 });
    for (const piece of ['scrap3', 'scrap'] as const) {
      const more = interact(s, item(piece, 'laundry.notebook'));
      expect(more.beats).toContainEqual({ type: 'say', speaker: 'hero', key: 'line.recipeMore' });
      expect(more.events).toEqual([]);
      s = more.state;
    }
    const o = interact(s, item('scrap2', 'laundry.notebook'));
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 13 }]);
    expect(o.state.finished).toBe(false);
    expect(o.state.flags.finale).toBe(true);
    expect(o.state.inventory).toEqual([]);
    expect(o.state.cuts).toEqual(['cut11', 'cut16']);
    expect(o.beats).toContainEqual({ type: 'view', view: 'jury' });
    expect(o.beats).toContainEqual({ type: 'say', speaker: 'jury', key: 'line.juryRing' });
    expect(o.beats[o.beats.length - 1]).toEqual({ type: 'say', speaker: 'dad', key: 'line.dadJury' });
    // The whole family joins Sam in the lab, each one before their line.
    const casts = o.beats.filter((b) => b.type === 'cast');
    expect(casts[casts.length - 2]).toEqual({ type: 'cast', characters: ['dad', 'mom', 'theo', 'julien', 'florent'] });
    // Then the scene hands over to the family standing in the lab for the finale.
    expect(casts[casts.length - 1]).toEqual({ type: 'cast', characters: [] });
    for (const [who, key] of [['dad', 'line.final2'], ['mom', 'line.final5'], ['theo', 'line.final6'], ['julien', 'line.final7'], ['florent', 'line.final8']] as const) {
      const said = o.beats.findIndex((b) => b.type === 'say' && b.key === key);
      const joined = o.beats.findIndex((b) => b.type === 'cast' && b.characters.includes(who));
      expect([who, joined >= 0 && joined < said]).toEqual([who, true]);
    }
  });
});

describe('E06: the chess problem on the board', () => {
  it('opens after CUT07 only and accepts the reference solution once', () => {
    const before = at('living', { flags: flags('queen_placed'), chars: chars({ theo: 'chess' }) });
    expect(interact(before, { kind: 'chess', moves: ['c4g8', 'h6f7'] }).accepted).toBe(false);
    const after = at('living', { flags: flags('queen_placed', 'cube_solved', 'theo_back') });
    expect(interact(after, use('living.chess')).beats).toEqual([{ type: 'chess' }]);
    expect(interact(after, { kind: 'chess', moves: ['c4c8', 'h6f7'] }).accepted).toBe(false);
    const o = interact(after, { kind: 'chess', moves: ['c4g8', 'h6f7'] });
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 6 }]);
    expect(o.state.notes).toContain('n08');
    expect(interact(o.state, { kind: 'chess', moves: ['c4g8', 'h6f7'] }).accepted).toBe(false);
  });
});
