// T-10: dialogues with Papa, Maman and Julien, busy lines of Florent and Théo, door lines (AC-20).
import { allDialogueOptions, BYE, dialogueOptions } from '../game/dialogue';
import { interact, newGame } from '../game/rules';
import { CharacterId, CharacterStates, GameState, PlaceId } from '../game/types';

const chars = (patch: Partial<CharacterStates>): CharacterStates => ({ ...newGame().chars, ...patch });
const at = (place: PlaceId, extra: Partial<GameState> = {}): GameState => ({ ...newGame(), place, flags: { door_unlocked: true }, ...extra });
const MET: Record<'dad' | 'mom' | 'julien', GameState> = {
  dad: at('kitchen', { chars: chars({ dad: 'cooking' }) }),
  mom: at('garden', { chars: chars({ mom: 'gardening' }) }),
  julien: at('football', { chars: chars({ julien: 'football' }) }),
};

describe('dialogues (AC-20)', () => {
  it('talking to Papa, Maman or Julien opens the choices, with "Au revoir" always last', () => {
    for (const [id, s] of Object.entries(MET) as [CharacterId, GameState][]) {
      const o = interact(s, { kind: 'verb', verb: 'talk', target: id });
      expect(o.beats).toEqual([{ type: 'dialogue', character: id }]);
      const options = dialogueOptions(s, id);
      expect(options.length).toBeGreaterThanOrEqual(3);
      expect(options.length).toBeLessThanOrEqual(5);
      expect(options[options.length - 1]).toEqual({ id: BYE, label: 'dialogue.bye', seen: false });
    }
  });

  it('choices depend on flags: the contest topic appears once the computer is read', () => {
    expect(dialogueOptions(MET.dad, 'dad').map((o) => o.id)).not.toContain('dad.contest');
    const read = { ...MET.dad, flags: { ...MET.dad.flags, computer_read: true as const } };
    expect(dialogueOptions(read, 'dad').map((o) => o.id)).toContain('dad.contest');
  });

  it('a chosen option stays available, greyed, and reopens the conversation', () => {
    const o = interact(MET.julien, { kind: 'dialogue', character: 'julien', option: 'julien.pool' });
    expect(o.beats).toContainEqual({ type: 'say', speaker: 'julien', key: 'julien.a.pool1' });
    expect(o.beats[o.beats.length - 1]).toEqual({ type: 'dialogue', character: 'julien' });
    const seen = dialogueOptions(o.state, 'julien').find((x) => x.id === 'julien.pool');
    expect(seen?.seen).toBe(true);
    expect(interact(o.state, { kind: 'dialogue', character: 'julien', option: 'julien.pool' }).accepted).toBe(true);
  });

  it('no choice changes the story: every option only says lines (it cannot block progress)', () => {
    for (const { character, option } of allDialogueOptions()) {
      const s = { ...(MET as Record<string, GameState>)[character], flags: { door_unlocked: true as const, computer_read: true as const } };
      const o = interact(s, { kind: 'dialogue', character, option: option.id });
      expect(o.accepted).toBe(true);
      expect({ ...o.state, seen: [] }).toEqual({ ...s, seen: [] });
    }
  });

  it('"Au revoir" ends the conversation; an absent character cannot be talked to', () => {
    expect(interact(MET.mom, { kind: 'dialogue', character: 'mom', option: BYE }).beats).toEqual([]);
    expect(interact(at('kitchen'), { kind: 'dialogue', character: 'dad', option: 'dad.rumour' }).accepted).toBe(false);
  });

  it('busy Florent and Théo answer one line and open no menu', () => {
    const drumming = interact(at('music', { chars: chars({ florent: 'drumming' }) }), { kind: 'verb', verb: 'talk', target: 'florent' });
    expect(drumming.beats).toEqual([{ type: 'say', speaker: 'florent', key: 'line.florentBusy' }]);
    const playing = interact(at('living', { chars: chars({ theo: 'chess' }) }), { kind: 'verb', verb: 'talk', target: 'theo' });
    expect(playing.beats).toEqual([{ type: 'say', speaker: 'theo', key: 'line.theoBusy' }]);
  });

  it('talking through a door gives the occupant\'s line and no menu', () => {
    const o = interact(at('landing'), { kind: 'verb', verb: 'talk', target: 'landing.parentsDoor' });
    expect(o.beats.filter((b) => b.type === 'dialogue')).toEqual([]);
    expect(o.beats[0]).toEqual({ type: 'say', speaker: 'mom', key: 'mom.door' });
  });
});
