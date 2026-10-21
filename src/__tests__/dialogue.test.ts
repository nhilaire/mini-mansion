// T-10 / T-32: Julien's dialogue, busy lines of Florent and Théo, door lines; Papa and Maman never talk (AC-20).
import { allDialogueOptions, BYE, dialogueOptions } from '../game/dialogue';
import { interact, newGame } from '../game/rules';
import { CharacterStates, GameState, PlaceId } from '../game/types';
import { findHotspot } from '../game/world';

const chars = (patch: Partial<CharacterStates>): CharacterStates => ({ ...newGame().chars, ...patch });
const at = (place: PlaceId, extra: Partial<GameState> = {}): GameState => ({ ...newGame(), place, flags: { door_unlocked: true }, ...extra });
const julien = (flags: GameState['flags'] = {}) => at('football', { chars: chars({ julien: 'football' }), flags: { door_unlocked: true, ...flags } });
const ids = (s: GameState) => dialogueOptions(s, 'julien').map((o) => o.id);

describe('dialogues (AC-20)', () => {
  it('talking to Julien opens the choices, with "Au revoir" always last', () => {
    const o = interact(julien(), { kind: 'verb', verb: 'talk', target: 'julien' });
    expect(o.beats).toEqual([{ type: 'dialogue', character: 'julien' }]);
    const options = dialogueOptions(julien(), 'julien');
    expect(options.length).toBeGreaterThanOrEqual(3);
    expect(options.length).toBeLessThanOrEqual(5);
    expect(options[options.length - 1]).toEqual({ id: BYE, label: 'dialogue.bye', seen: false });
  });

  it('the choices of the PRD under their conditions: the pump until E14, the attic after CUT07', () => {
    expect(ids(julien())).toEqual(['julien.ball', 'julien.family', 'julien.pool', BYE]);
    expect(ids(julien({ thinner_taken: true }))).toEqual(['julien.ball', 'julien.family', BYE]);
    expect(ids(julien({ theo_back: true }))).toEqual(['julien.ball', 'julien.family', 'julien.pool', 'julien.attic', BYE]);
    const pool = interact(julien(), { kind: 'dialogue', character: 'julien', option: 'julien.pool' });
    expect(pool.beats).toContainEqual({ type: 'say', speaker: 'julien', key: 'julien.a.pool2' });
  });

  it('Papa and Maman cannot be talked to: they catch Sam instead', () => {
    expect(findHotspot(at('kitchen', { chars: chars({ dad: 'cooking' }) }), 'dad')?.verbs).toEqual(['look']);
    expect(findHotspot(at('garden', { chars: chars({ mom: 'gardening' }) }), 'mom')?.verbs).toEqual(['look']);
    expect(dialogueOptions(at('kitchen'), 'dad').map((o) => o.id)).toEqual([BYE]);
  });

  it('a chosen option stays available, greyed, and reopens the conversation', () => {
    const o = interact(julien(), { kind: 'dialogue', character: 'julien', option: 'julien.pool' });
    expect(o.beats).toContainEqual({ type: 'say', speaker: 'julien', key: 'julien.a.pool1' });
    expect(o.beats[o.beats.length - 1]).toEqual({ type: 'dialogue', character: 'julien' });
    const seen = dialogueOptions(o.state, 'julien').find((x) => x.id === 'julien.pool');
    expect(seen?.seen).toBe(true);
    expect(interact(o.state, { kind: 'dialogue', character: 'julien', option: 'julien.pool' }).accepted).toBe(true);
  });

  it('no choice changes the story: every option only says lines (it cannot block progress)', () => {
    for (const { character, option } of allDialogueOptions()) {
      const s = julien({ theo_back: true });
      const o = interact(s, { kind: 'dialogue', character, option: option.id });
      expect(o.accepted).toBe(true);
      expect({ ...o.state, seen: [] }).toEqual({ ...s, seen: [] });
    }
  });

  it('"Au revoir" ends the conversation; an absent character cannot be talked to', () => {
    expect(interact(julien(), { kind: 'dialogue', character: 'julien', option: BYE }).beats).toEqual([]);
    expect(interact(at('football'), { kind: 'dialogue', character: 'julien', option: 'julien.ball' }).accepted).toBe(false);
  });

  it('busy Florent and Théo answer one line and open no menu', () => {
    const drumming = interact(at('music', { chars: chars({ florent: 'drumming' }) }), { kind: 'verb', verb: 'talk', target: 'florent' });
    expect(drumming.beats).toEqual([{ type: 'say', speaker: 'florent', key: 'line.florentBusy' }]);
    const playing = interact(at('living', { chars: chars({ theo: 'chess' }) }), { kind: 'verb', verb: 'talk', target: 'theo' });
    expect(playing.beats).toEqual([{ type: 'say', speaker: 'theo', key: 'line.theoBusy' }]);
  });

  it("talking through a door gives the occupant's line and no menu", () => {
    const o = interact(at('landing'), { kind: 'verb', verb: 'talk', target: 'landing.parentsDoor' });
    expect(o.beats.filter((b) => b.type === 'dialogue')).toEqual([]);
    expect(o.beats[0]).toEqual({ type: 'say', speaker: 'mom', key: 'mom.door' });
  });
});
