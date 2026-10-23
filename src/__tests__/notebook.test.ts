// T-09 / T-55: the clue notebook N01-N16 (AC-29) and once-only cutscenes.
import { interact, newGame, playAll, readNotes } from '../game/rules';
import { SOLUTION } from '../game/solution';
import { CharacterStates, GameState, Input, NoteId, PlaceId } from '../game/types';

const at = (place: PlaceId, extra: Partial<GameState> = {}): GameState => ({ ...newGame(), place, flags: { door_unlocked: true }, ...extra });
const chars = (patch: Partial<CharacterStates>): CharacterStates => ({ ...newGame().chars, ...patch });

// Where each entry is first written along the solution.
function firstNoteSteps(): Map<NoteId, number> {
  const seen = new Map<NoteId, number>();
  let s = newGame();
  SOLUTION.forEach((input, i) => {
    s = interact(s, input).state;
    for (const n of s.notes) if (!seen.has(n)) seen.set(n, i);
  });
  return seen;
}

describe('clue notebook (AC-29)', () => {
  it('starts with the rumour, unread', () => {
    expect(newGame().notes).toEqual(['n01']);
    expect(newGame().unread).toEqual(['n01']);
  });

  it('adds each entry once, marked unread until the notebook is opened', () => {
    let s = at('landing');
    const listen: Input = { kind: 'verb', verb: 'listen', target: 'landing.julienDoor' };
    s = interact(s, listen).state;
    expect(s.notes).toEqual(['n01', 'n02']);
    expect(s.unread).toEqual(['n01', 'n02']);
    s = readNotes(s);
    expect(s.unread).toEqual([]);
    const again = interact(s, listen);
    expect(again.state.notes).toEqual(['n01', 'n02']);
    expect(again.state.unread).toEqual([]);
    expect(again.beats.some((b) => b.type === 'note')).toBe(false);
    expect(readNotes(again.state)).toBe(again.state);
  });

  it('each door gives its own entry (hearing Maman does not reveal Papa\'s secret)', () => {
    const doors: [string, NoteId, PlaceId][] = [
      ['landing.julienDoor', 'n02', 'landing'],
      ['landing.florentDoor', 'n03', 'landing'],
      ['landing.theoDoor', 'n04', 'landing'],
      ['landing.parentsDoor', 'n05', 'landing'],
      ['corridor0.officeDoor', 'n06', 'corridor0'],
    ];
    for (const [door, note, place] of doors) {
      const o = interact(at(place), { kind: 'verb', verb: 'listen', target: door });
      expect([door, o.state.notes]).toEqual([door, ['n01', note]]);
    }
  });

  it('the other triggers: ball look, chessboard look, CUT07, E06, E07, CUT08, E10', () => {
    expect(interact(at('pool'), { kind: 'verb', verb: 'look', target: 'pool.ball' }).state.notes).toContain('n02');
    expect(interact(at('living'), { kind: 'verb', verb: 'look', target: 'living.chess' }).state.notes).toContain('n04');
    const steps = firstNoteSteps();
    const stepOf = (n: NoteId) => steps.get(n)!;
    const indexOf = (pred: (i: Input) => boolean) => SOLUTION.findIndex(pred);
    expect(stepOf('n07')).toBe(indexOf((i) => i.kind === 'exit' && i.exit === 'theo.toLanding'));
    expect(stepOf('n08')).toBe(indexOf((i) => i.kind === 'chess'));
    expect(stepOf('n09')).toBe(indexOf((i) => i.kind === 'keypad' && i.keypad === 'computer'));
    expect(stepOf('n10')).toBe(stepOf('n09'));
    expect(stepOf('n11')).toBe(indexOf((i) => i.kind === 'verb' && i.verb === 'use' && i.target === 'parents.shower'));
    expect(stepOf('n12')).toBe(indexOf((i) => i.kind === 'keypad' && i.keypad === 'safe'));
  });

  it('no entry appears before its trigger', () => {
    const steps = firstNoteSteps();
    // The codes come after the puzzles that tell them; the lab note after the safe.
    expect(steps.get('n08')!).toBeGreaterThan(steps.get('n07')!);
    expect(steps.get('n11')!).toBeLessThan(steps.get('n12')!);
    let s = newGame();
    for (const input of SOLUTION) {
      const before = s;
      s = interact(s, input).state;
      for (const n of s.notes) if (!before.notes.includes(n)) expect(s.unread).toContain(n);
    }
  });
});

describe('once-only cutscenes', () => {
  it('every cutscene of the solution plays exactly once', () => {
    const { state, outcomes } = playAll(newGame(), SOLUTION);
    expect([...state.cuts].sort()).toEqual(['cut01', 'cut04', 'cut05', 'cut06', 'cut07', 'cut08', 'cut09', 'cut10', 'cut11', 'cut12', 'cut13', 'cut15']);
    const narratorKeys = outcomes.flatMap((o) => o.beats).filter((b) => b.type === 'say' && b.speaker === 'narrator').map((b) => (b as { key: string }).key);
    for (const k of ['cut01', 'cut04', 'cut05', 'cut06', 'cut08', 'cut09', 'cut10', 'cut13']) expect(narratorKeys.filter((x) => x === k)).toHaveLength(1);
  });

  it('a cutscene is never half-played in the state: its effects are in the state of the same interaction (AC-50)', () => {
    // The UI saves the outcome state at once, before playing the lines: whatever moment the app is killed, the save
    // holds the state after the cutscene.
    let s = newGame();
    for (const input of SOLUTION) {
      const o = interact(s, input);
      const narrated = o.beats.filter((b) => b.type === 'say' && b.speaker === 'narrator' && /^cut\d\d$/.test(b.key)).map((b) => (b as { key: string }).key);
      for (const cut of narrated) expect(o.state.cuts).toContain(cut);
      if (o.state.cuts.includes('cut11')) expect(o.state.finished).toBe(true);
      s = o.state;
    }
  });

  it('the drum cutscene cannot replay even if Florent drums again', () => {
    const s = at('music', { cuts: ['cut05'], chars: chars({ florent: 'in_room' }), inventory: ['sticks'] });
    const o = interact(s, { kind: 'item', item: 'sticks', target: 'music.drums' });
    expect(o.beats.filter((b) => b.type === 'say' && b.key === 'cut05')).toHaveLength(0);
  });
});
