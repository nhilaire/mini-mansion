// T-12 (AC-35): the save keeps the whole game; a corrupt or unknown-version save is rejected.
import { interact, newGame, playAll, TIMER_MS } from '../game/rules';
import { applyTestingLink, FAST_LINK, resetFastModeForTests, timerScale } from '../testing/fastMode';
import { deserialize, SaveError, serialize } from '../game/save';
import { SOLUTION } from '../game/solution';
import { GameState } from '../game/types';

describe('save format v3 (AC-35, AC-58)', () => {
  it('restores every state of the walkthrough identically', () => {
    let s: GameState = newGame();
    for (const input of SOLUTION) {
      s = playAll(s, [input]).state;
      const saved = { ...s, playMs: 123456, clock: 234567, tutorial: 3 as const, captures: 2, wrongIdx: 4 };
      expect(deserialize(serialize(saved))).toEqual(saved);
    }
  });

  it('keeps place, position, inventory, flags, character states, notebook, cutscenes and captures', () => {
    const s = playAll(newGame(), SOLUTION.slice(0, 45)).state;
    const back = deserialize(serialize(s));
    expect(back.place).toBe(s.place);
    expect(back.pos).toEqual(s.pos);
    expect(back.inventory).toEqual(s.inventory);
    expect(back.flags).toEqual(s.flags);
    expect(back.chars).toEqual(s.chars);
    expect(back.notes).toEqual(s.notes);
    expect(back.unread).toEqual(s.unread);
    expect(back.cuts).toEqual(s.cuts);
    expect(back.captures).toBe(s.captures);
  });

  it('fast mode makes the timers 30 times faster without changing the saved format (AC-58)', () => {
    resetFastModeForTests();
    expect(timerScale()).toBe(1);
    applyTestingLink(FAST_LINK);
    expect(timerScale()).toBe(30);
    // One second of play time in fast mode, as the game screen sends it, then saved and reloaded.
    const rung = interact({ ...newGame(), place: 'front', flags: { door_unlocked: true } }, { kind: 'verb', verb: 'use', target: 'front.bell' }).state;
    const s = interact({ ...rung, place: 'hall' }, { kind: 'tick', ms: 1000 * timerScale() }).state;
    expect(s.chars.dad).toBe('outside');
    expect(deserialize(serialize(s))).toEqual(s);
    resetFastModeForTests();
  });

  it('keeps the running timers and the timer clock', () => {
    const s = { ...newGame(), clock: 5000, timers: { dad: 125000, dough: 65000, mom: 30000, delivery: 70000 }, chars: { ...newGame().chars, dad: 'answering' as const } };
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('migrates a v0.1 save (format 2): no hose or delivery timer, and Papa cooking for good now cooks 90 s from the load', () => {
    const old = { ...newGame(), v: 2, clock: 5000, timers: { dad: null, dough: null }, chars: { ...newGame().chars, dad: 'cooking' } };
    const back = deserialize(JSON.stringify(old));
    expect(back.v).toBe(3);
    expect(back.timers).toEqual({ dad: 5000 + TIMER_MS.cook, dough: null, mom: null, delivery: null });
    const ringing = { ...old, chars: newGame().chars, timers: { dad: 9000, dough: 20000 } };
    expect(deserialize(JSON.stringify(ringing)).timers).toEqual({ dad: 9000, dough: 20000, mom: null, delivery: null });
  });

  const valid = JSON.parse(serialize(newGame()));
  const broken: [string, unknown][] = [
    ['not JSON', '{'],
    ['an array', '[]'],
    ['an unknown version', JSON.stringify({ ...valid, v: 1 })],
    ['an unknown place', JSON.stringify({ ...valid, place: 'tower' })],
    ['an unknown item', JSON.stringify({ ...valid, inventory: ['lantern'] })],
    ['a duplicated item', JSON.stringify({ ...valid, inventory: ['pole', 'pole'] })],
    ['an unknown flag', JSON.stringify({ ...valid, flags: { flying: true } })],
    ['a bad character state', JSON.stringify({ ...valid, chars: { ...valid.chars, dad: 'sleeping' } })],
    ['a missing character', JSON.stringify({ ...valid, chars: { dad: 'at_desk' } })],
    ['an unknown note', JSON.stringify({ ...valid, notes: ['n99'] })],
    ['an unread note not learnt', JSON.stringify({ ...valid, notes: [], unread: ['n01'] })],
    ['an unknown cutscene', JSON.stringify({ ...valid, cuts: ['cut99'] })],
    ['an out-of-range puzzle', JSON.stringify({ ...valid, solved: [31] })],
    ['a bad timer', JSON.stringify({ ...valid, timers: { ...valid.timers, dad: -5 } })],
    ['a missing hose timer', JSON.stringify({ ...valid, timers: { dad: null, dough: null, delivery: null } })],
    ['a v2 save with v3 states', JSON.stringify({ ...valid, v: 2, timers: { dad: null, dough: null }, chars: { ...valid.chars, florent: 'riding', theo: 'sleeping' } })],
    ['a missing timer clock', JSON.stringify({ ...valid, clock: undefined })],
    ['negative captures', JSON.stringify({ ...valid, captures: -1 })],
    ['a bad play time', JSON.stringify({ ...valid, playMs: 'long' })],
  ];

  it.each(broken)('rejects a save with %s', (_name, json) => {
    expect(() => deserialize(json as string)).toThrow(SaveError);
  });
});
