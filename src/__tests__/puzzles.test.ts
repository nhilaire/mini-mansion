// T-06 / T-08: each puzzle E01-E17 - refusals with the rule's line and no change, effects exactly once,
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

  it('solves every puzzle except the optional E15 exactly once', () => {
    const puzzles = events.filter((e) => e.type === 'puzzle').map((e) => (e as { puzzle: number }).puzzle);
    expect([...puzzles].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17]);
  });

  it('E13 ends the game: game_complete once, with the captures, then the ending beat', () => {
    expect(events.filter((e) => e.type === 'complete')).toEqual([{ type: 'complete', captures: 0 }]);
    const last = outcomes[outcomes.length - 1];
    expect(last.beats[last.beats.length - 1]).toEqual({ type: 'ending' });
    expect(interact(state, { kind: 'verb', verb: 'look', target: 'laundry.cake' }).accepted).toBe(false);
  });

  it('replaying any solving step after the ending changes nothing', () => {
    for (const input of SOLUTION) expect(interact(state, input).accepted).toBe(false);
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
  it('refuses before E01 and once Papa cooks; otherwise Papa leaves his desk for good', () => {
    expectRefusal(at('front'), use('front.bell'), 'line.bellRefuse');
    expectRefusal(at('front', { flags: flags('door_unlocked'), chars: chars({ dad: 'cooking' }) }), use('front.bell'), 'line.bellNobody');
    const o = interact(at('front', { flags: flags('door_unlocked') }), use('front.bell'));
    expect(o.state.chars.dad).toBe('cooking');
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 16 }]);
    expect(o.beats).toContainEqual({ type: 'say', speaker: 'dad', key: 'line.dadDoor1' });
  });
});

describe('E02: the ball on the pool cover', () => {
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
    const { state, outcomes } = playAll(at('dining'), [{ kind: 'verb', verb: 'take', target: 'dining.basket' }, { kind: 'exit', exit: 'dining.toMusic' }, item('sticks', 'music.drums')]);
    expect(outcomes[2].events).toEqual([{ type: 'puzzle', puzzle: 3 }]);
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

describe('E17: the washing machine', () => {
  it('needs detergent; ends at the next place change and Maman goes to the garden for good', () => {
    expectRefusal(at('utility'), use('utility.machine'), 'line.machineEmpty');
    const started = interact(at('utility', { inventory: ['detergent'] }), item('detergent', 'utility.machine'));
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

describe('E07 / E10: the keypads (AC-27)', () => {
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

  it('is broken until both the O-ring and the wrench are used, in any order', () => {
    expectRefusal(room([]), use('parents.shower'), 'line.showerBroken');
    for (const order of [
      ['oring', 'wrench'],
      ['wrench', 'oring'],
    ] as ItemId[][]) {
      const { state, outcomes } = playAll(room(order), order.map((i) => item(i, 'parents.shower')));
      expect(outcomes[0].events).toEqual([]);
      expect(outcomes[1].events).toEqual([{ type: 'puzzle', puzzle: 8 }]);
      expect(state.flags.shower_repaired).toBe(true);
      expect(state.inventory).toEqual([]);
    }
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

describe('E11-E13: the attic, the secret door, the lab', () => {
  it('the thinner reveals the door, the old key opens it, the laundry leads to the revelation', () => {
    const attic = at('attic', { inventory: ['thinner', 'oldkey'] });
    const revealed = interact(attic, item('thinner', 'attic.stain'));
    expect(revealed.events).toEqual([{ type: 'puzzle', puzzle: 11 }]);
    expectRefusal(revealed.state, use('attic.door'), 'line.doorLocked');
    const opened = interact(revealed.state, item('oldkey', 'attic.door'));
    expect(opened.events).toEqual([{ type: 'puzzle', puzzle: 12 }]);
    expect(opened.state.flags.secret_open).toBe(true);
  });

  it('the revelation needs the computer documents', () => {
    expectRefusal(at('laundry', { inventory: ['scrap'] }), item('scrap', 'laundry.notebook'), 'line.finalMissing');
    const o = interact(at('laundry', { inventory: ['scrap'], flags: flags('computer_read'), captures: 2 }), item('scrap', 'laundry.notebook'));
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 13 }, { type: 'complete', captures: 2 }]);
    expect(o.state.finished).toBe(true);
    expect(o.beats[o.beats.length - 1]).toEqual({ type: 'ending' });
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
