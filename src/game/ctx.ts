// Mutable working copy of the state while one interaction is resolved; collects beats and events.
import { Beat, CharacterId, CutId, Flag, GameEvent, GameState, ItemId, NoteId, SfxName, Speaker } from './types';

export const PUZZLE_COUNT = 30;
export const WRONG_LINES = 6;
// E18 (side gates) is optional; one of E16 (doorbell) and E19 (dough) frees the office the first time.
export const OPTIONAL_PUZZLES: readonly number[] = [18];
export const OFFICE_ACCESS: readonly number[] = [16, 19];

export function cloneState(s: GameState): GameState {
  return {
    ...s,
    pos: { ...s.pos },
    inventory: [...s.inventory],
    flags: { ...s.flags },
    chars: { ...s.chars },
    notes: [...s.notes],
    unread: [...s.unread],
    cuts: [...s.cuts],
    solved: [...s.solved],
    timers: { ...s.timers },
  };
}

export class Ctx {
  readonly s: GameState;
  readonly beats: Beat[] = [];
  readonly events: GameEvent[] = [];

  constructor(state: GameState) {
    this.s = cloneState(state);
  }

  say(speaker: Speaker, key: string): this {
    this.beats.push({ type: 'say', speaker, key });
    return this;
  }

  hero(key: string): this {
    return this.say('hero', key);
  }

  narrator(key: string): this {
    return this.say('narrator', key);
  }

  wait(ms: number): this {
    this.beats.push({ type: 'wait', ms });
    return this;
  }

  cinematic(on: boolean): this {
    this.beats.push({ type: 'cinematic', on });
    return this;
  }

  captor(character: CharacterId | null): this {
    this.beats.push({ type: 'captor', character });
    return this;
  }

  sfx(sfx: SfxName): this {
    this.beats.push({ type: 'sfx', sfx });
    return this;
  }

  is(flag: Flag): boolean {
    return this.s.flags[flag] === true;
  }

  set(flag: Flag): this {
    this.s.flags[flag] = true;
    return this;
  }

  clear(flag: Flag): this {
    delete this.s.flags[flag];
    return this;
  }

  holds(item: ItemId): boolean {
    return this.s.inventory.includes(item);
  }

  give(item: ItemId): this {
    if (!this.holds(item)) this.s.inventory.push(item);
    return this.sfx('take');
  }

  remove(item: ItemId): this {
    this.s.inventory = this.s.inventory.filter((i) => i !== item);
    return this;
  }

  state<C extends CharacterId>(id: C): GameState['chars'][C] {
    return this.s.chars[id];
  }

  move<C extends CharacterId>(id: C, to: GameState['chars'][C]): this {
    this.s.chars = { ...this.s.chars, [id]: to };
    return this;
  }

  wrong(): this {
    const key = `wrong.${this.s.wrongIdx}`;
    this.s.wrongIdx = (this.s.wrongIdx + 1) % WRONG_LINES;
    return this.sfx('wrong').hero(key);
  }

  // A notebook entry, added once and marked unread.
  note(id: NoteId): this {
    if (this.s.notes.includes(id)) return this;
    this.s.notes.push(id);
    this.s.unread.push(id);
    this.sfx('note');
    this.beats.push({ type: 'note', note: id });
    return this;
  }

  played(id: CutId): boolean {
    return this.s.cuts.includes(id);
  }

  // Runs a cutscene once; returns false (and does nothing) when it already played.
  cut(id: CutId, script: (c: this) => void): boolean {
    if (this.played(id)) return false;
    this.s.cuts.push(id);
    script(this);
    return true;
  }

  isSolved(n: number): boolean {
    return this.s.solved.includes(n);
  }

  // Marks a puzzle solved (once). E30 ends the game.
  solve(n: number): this {
    if (this.s.solved.includes(n)) return this;
    this.s.solved.push(n);
    this.events.push({ type: 'puzzle', puzzle: n });
    this.sfx('solved');
    return this;
  }

  finish(): this {
    this.set('ending');
    this.s.finished = true;
    this.events.push({ type: 'complete', captures: this.s.captures });
    return this;
  }
}
