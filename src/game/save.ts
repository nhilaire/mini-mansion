// Serialisation of the single autosaved game. Anything that does not match the current format exactly is rejected
// (the caller then ignores the save and reports a non-fatal error).
import { CHARACTERS, FLAGS, ITEMS, PLACES } from './world';
import { CharacterStates, CutId, GameState, NoteId } from './types';

export const SAVE_VERSION = 2;

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

const NOTE_IDS: readonly NoteId[] = ['n01', 'n02', 'n03', 'n04', 'n05', 'n06', 'n07', 'n08', 'n09', 'n10', 'n11', 'n12'];
const CUT_IDS: readonly CutId[] = ['cut01', 'cut04', 'cut05', 'cut06', 'cut07', 'cut08', 'cut09', 'cut10', 'cut11', 'cut12'];
const CHAR_STATES: { [C in keyof CharacterStates]: readonly CharacterStates[C][] } = {
  dad: ['at_desk', 'answering', 'outside', 'returning', 'cooking'],
  mom: ['folding', 'gardening'],
  julien: ['in_room', 'football'],
  florent: ['in_room', 'drumming'],
  theo: ['in_room', 'chess'],
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNat = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const FACINGS = ['left', 'right', 'up', 'down'];
const isDeadline = (v: unknown) => v === null || (isNum(v) && v >= 0);
const uniqueOf = (v: unknown, allowed: readonly unknown[]) => Array.isArray(v) && v.every((x) => allowed.includes(x)) && new Set(v).size === v.length;

export class SaveError extends Error {}

export function deserialize(json: string): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new SaveError('save is not JSON');
  }
  if (!isObj(raw)) throw new SaveError('save is not an object');
  if (raw.v !== SAVE_VERSION) throw new SaveError(`unknown save version ${String(raw.v)}`);
  const chars = raw.chars;
  const ok =
    typeof raw.place === 'string' &&
    (PLACES as readonly string[]).includes(raw.place) &&
    isObj(raw.pos) &&
    isNum(raw.pos.x) &&
    isNum(raw.pos.y) &&
    typeof raw.facing === 'string' &&
    FACINGS.includes(raw.facing) &&
    uniqueOf(raw.inventory, ITEMS) &&
    isObj(raw.flags) &&
    Object.entries(raw.flags).every(([k, v]) => (FLAGS as readonly string[]).includes(k) && v === true) &&
    isObj(chars) &&
    Object.keys(chars).length === CHARACTERS.length &&
    CHARACTERS.every((c) => (CHAR_STATES[c] as readonly unknown[]).includes(chars[c])) &&
    uniqueOf(raw.notes, NOTE_IDS) &&
    uniqueOf(raw.unread, NOTE_IDS) &&
    (raw.unread as unknown[]).every((n) => (raw.notes as unknown[]).includes(n)) &&
    uniqueOf(raw.cuts, CUT_IDS) &&
    Array.isArray(raw.solved) &&
    raw.solved.every((n) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 19) &&
    new Set(raw.solved).size === raw.solved.length &&
    isNat(raw.captures) &&
    (raw.tutorial === 0 || raw.tutorial === 1 || raw.tutorial === 2 || raw.tutorial === 3) &&
    isNum(raw.playMs) &&
    raw.playMs >= 0 &&
    isNum(raw.clock) &&
    raw.clock >= 0 &&
    isObj(raw.timers) &&
    Object.keys(raw.timers).length === 2 &&
    isDeadline(raw.timers.dad) &&
    isDeadline(raw.timers.dough) &&
    typeof raw.finished === 'boolean' &&
    isNat(raw.wrongIdx) &&
    (raw.wrongIdx as number) < 6;
  if (!ok) throw new SaveError('save has an invalid shape');
  const c = chars as unknown as CharacterStates;
  return {
    v: 2,
    place: raw.place as GameState['place'],
    pos: { x: (raw.pos as { x: number }).x, y: (raw.pos as { y: number }).y },
    facing: raw.facing as GameState['facing'],
    inventory: [...(raw.inventory as GameState['inventory'])],
    flags: { ...(raw.flags as GameState['flags']) },
    chars: { dad: c.dad, mom: c.mom, julien: c.julien, florent: c.florent, theo: c.theo },
    notes: [...(raw.notes as NoteId[])],
    unread: [...(raw.unread as NoteId[])],
    cuts: [...(raw.cuts as CutId[])],
    solved: [...(raw.solved as number[])],
    captures: raw.captures as number,
    tutorial: raw.tutorial as GameState['tutorial'],
    playMs: raw.playMs as number,
    clock: raw.clock as number,
    timers: { dad: (raw.timers as GameState['timers']).dad, dough: (raw.timers as GameState['timers']).dough },
    finished: raw.finished as boolean,
    wrongIdx: raw.wrongIdx as number,
  };
}
