// T-12 (AC-35): the save keeps the whole game; a corrupt or unknown-version save is rejected.
import { newGame, playAll } from '../game/rules';
import { deserialize, SaveError, serialize } from '../game/save';
import { SOLUTION } from '../game/solution';
import { GameState } from '../game/types';

describe('save format v1 (AC-35)', () => {
  it('restores every state of the walkthrough identically', () => {
    let s: GameState = newGame();
    for (const input of SOLUTION) {
      s = playAll(s, [input]).state;
      const saved = { ...s, playMs: 123456, tutorial: 3 as const, captures: 2, seen: ['dad.rumour'], wrongIdx: 4 };
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

  const valid = JSON.parse(serialize(newGame()));
  const broken: [string, unknown][] = [
    ['not JSON', '{'],
    ['an array', '[]'],
    ['an unknown version', JSON.stringify({ ...valid, v: 2 })],
    ['an unknown place', JSON.stringify({ ...valid, place: 'tower' })],
    ['an unknown item', JSON.stringify({ ...valid, inventory: ['lantern'] })],
    ['a duplicated item', JSON.stringify({ ...valid, inventory: ['pole', 'pole'] })],
    ['an unknown flag', JSON.stringify({ ...valid, flags: { flying: true } })],
    ['a bad character state', JSON.stringify({ ...valid, chars: { ...valid.chars, dad: 'sleeping' } })],
    ['a missing character', JSON.stringify({ ...valid, chars: { dad: 'at_desk' } })],
    ['an unknown note', JSON.stringify({ ...valid, notes: ['n99'] })],
    ['an unread note not learnt', JSON.stringify({ ...valid, notes: [], unread: ['n01'] })],
    ['an unknown cutscene', JSON.stringify({ ...valid, cuts: ['cut99'] })],
    ['an out-of-range puzzle', JSON.stringify({ ...valid, solved: [18] })],
    ['negative captures', JSON.stringify({ ...valid, captures: -1 })],
    ['a bad play time', JSON.stringify({ ...valid, playMs: 'long' })],
  ];

  it.each(broken)('rejects a save with %s', (_name, json) => {
    expect(() => deserialize(json as string)).toThrow(SaveError);
  });
});
