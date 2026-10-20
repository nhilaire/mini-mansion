// T-05: character states, guarded rooms, door announcements, captures, the wine cellar and its shutter.
import { interact, newGame, playAll } from '../game/rules';
import { CharacterStates, GameState, GuardedRoom, Input, PlaceId } from '../game/types';
import { charactersIn, DOOR_SPAWN, occupant } from '../game/world';

const base = (place: PlaceId, extra: Partial<GameState> = {}): GameState => ({ ...newGame(), place, flags: { door_unlocked: true }, ...extra });
const chars = (patch: Partial<CharacterStates>): CharacterStates => ({ ...newGame().chars, ...patch });
const enter = (room: GuardedRoom): Input => ({ kind: 'verb', verb: 'use', target: DOOR_SPAWN[room].door });

const ROOMS: GuardedRoom[] = ['office', 'parents', 'julien', 'florent', 'theo'];
const AWAY: Record<GuardedRoom, Partial<CharacterStates>> = {
  office: { dad: 'cooking' },
  parents: { mom: 'gardening' },
  julien: { julien: 'football' },
  florent: { florent: 'drumming' },
  theo: { theo: 'chess' },
};
const OCCUPANT = { office: 'dad', parents: 'mom', julien: 'julien', florent: 'florent', theo: 'theo' } as const;

describe('character states (AC-22)', () => {
  it('everyone starts in their room, Papa at his desk', () => {
    expect(newGame().chars).toEqual({ dad: 'at_desk', mom: 'folding', julien: 'in_room', florent: 'in_room', theo: 'in_room' });
  });

  it('walking around changes nobody', () => {
    const { state } = playAll(base('hall'), [
      { kind: 'exit', exit: 'hall.toLiving' },
      { kind: 'exit', exit: 'living.toMusic' },
      { kind: 'exit', exit: 'music.toLiving' },
      { kind: 'exit', exit: 'living.toHall' },
      { kind: 'exit', exit: 'hall.stairs' },
    ]);
    expect(state.chars).toEqual(newGame().chars);
  });

  it('Florent goes back to his room once the O-ring is taken and the hero leaves his room', () => {
    const drumming = base('florent', { chars: chars({ florent: 'drumming' }) });
    // Leaving without the O-ring: he keeps drumming.
    expect(interact(drumming, { kind: 'exit', exit: 'florent.toLanding' }).state.chars.florent).toBe('drumming');
    const { state } = playAll(drumming, [
      { kind: 'verb', verb: 'take', target: 'florent.kit' },
      { kind: 'exit', exit: 'florent.toLanding' },
    ]);
    expect(state.chars.florent).toBe('in_room');
    expect(state.place).toBe('landing');
  });

  it('Théo goes back to his room once the cube is solved and the hero leaves his room; CUT07 plays once', () => {
    const playing = base('theo', { chars: chars({ theo: 'chess' }), inventory: ['booklet'] });
    expect(interact(playing, { kind: 'exit', exit: 'theo.toLanding' }).state.chars.theo).toBe('chess');
    const { state, outcomes } = playAll(playing, [
      { kind: 'item', item: 'booklet', target: 'theo.cube' },
      { kind: 'exit', exit: 'theo.toLanding' },
    ]);
    expect(state.chars.theo).toBe('in_room');
    expect(state.flags.theo_back).toBe(true);
    expect(state.cuts).toContain('cut07');
    const mono = outcomes[1].beats.filter((b) => b.type === 'say' && b.key.startsWith('line.theoMono'));
    expect(mono).toHaveLength(3);
    expect(state.notes).toContain('n07');
    // Never twice.
    const again = interact({ ...state, place: 'theo', chars: chars({ theo: 'chess' }) }, { kind: 'exit', exit: 'theo.toLanding' });
    expect(again.beats.filter((b) => b.type === 'say' && b.key.startsWith('line.theoMono'))).toHaveLength(0);
  });

  it('the inhabitants met in common places are where their state says', () => {
    expect(charactersIn(base('kitchen', { chars: chars({ dad: 'cooking' }) })).map((c) => c.id)).toEqual(['dad']);
    expect(charactersIn(base('garden', { chars: chars({ mom: 'gardening' }) })).map((c) => c.id)).toEqual(['mom']);
    expect(charactersIn(base('football', { chars: chars({ julien: 'football' }) })).map((c) => c.id)).toEqual(['julien']);
    expect(charactersIn(base('music', { chars: chars({ florent: 'drumming' }) })).map((c) => c.id)).toEqual(['florent']);
    expect(charactersIn(base('living', { chars: chars({ theo: 'chess' }) })).map((c) => c.id)).toEqual(['theo']);
    expect(charactersIn(base('kitchen'))).toEqual([]);
  });
});

describe('guarded rooms and captures (AC-23)', () => {
  it.each(ROOMS)('entering %s with its occupant inside is a capture that keeps everything', (room) => {
    const from = DOOR_SPAWN[room].from;
    const s = base(from, { inventory: ['pole', 'booklet'], notes: ['n01', 'n02'], solved: [1] });
    const o = interact(s, enter(room));
    expect(o.state.place).toBe('cellar');
    expect(o.state.flags.trap_locked).toBe(true);
    expect(o.state.captures).toBe(1);
    expect(o.events).toEqual([{ type: 'capture', room, count: 1 }]);
    expect(o.beats).toContainEqual({ type: 'say', speaker: OCCUPANT[room], key: `capture.${OCCUPANT[room]}` });
    expect(o.state.inventory).toEqual(s.inventory);
    expect(o.state.notes).toEqual(s.notes);
    expect(o.state.solved).toEqual(s.solved);
    expect(o.state.chars).toEqual(s.chars);
    expect({ ...o.state.flags, trap_locked: undefined }).toEqual({ ...s.flags, trap_locked: undefined });
  });

  it.each(ROOMS)('entering %s while its occupant is away is safe', (room) => {
    const o = interact(base(DOOR_SPAWN[room].from, { chars: chars(AWAY[room]) }), enter(room));
    expect(o.state.place).toBe(room);
    expect(o.events).toEqual([]);
    expect(o.state.captures).toBe(0);
  });

  it('walking in common places never captures, even next to the inhabitants', () => {
    const s = base('music', { chars: chars({ florent: 'drumming' }) });
    const { state, outcomes } = playAll(s, [
      { kind: 'exit', exit: 'music.toLiving' },
      { kind: 'exit', exit: 'living.toMusic' },
      { kind: 'exit', exit: 'music.toDining' },
    ]);
    expect(state.captures).toBe(0);
    expect(outcomes.flatMap((o) => o.events)).toEqual([]);
  });
});

describe('the wine cellar (AC-24)', () => {
  const caught = () => interact(base('landing'), enter('julien')).state;

  it('after a first capture the trapdoor is locked and the shutter stuck until the iron bar opens it', () => {
    let s = caught();
    expect(interact(s, { kind: 'exit', exit: 'cellar.toGarage' }).beats).toContainEqual({ type: 'say', speaker: 'hero', key: 'line.trapLocked' });
    expect(interact(s, { kind: 'exit', exit: 'cellar.toGarage' }).state.place).toBe('cellar');
    expect(interact(s, { kind: 'verb', verb: 'use', target: 'cellar.shutter' }).beats).toContainEqual({ type: 'say', speaker: 'hero', key: 'line.shutterStuck' });
    const { state, outcomes } = playAll(s, [
      { kind: 'verb', verb: 'take', target: 'cellar.rack' },
      { kind: 'item', item: 'bar', target: 'cellar.shutter' },
    ]);
    expect(outcomes[1].events).toEqual([{ type: 'puzzle', puzzle: 15 }]);
    expect(state.flags.shutter_open).toBe(true);
    expect(state.inventory).not.toContain('bar');
    s = interact(state, { kind: 'exit', exit: 'cellar.toFront' }).state;
    expect(s.place).toBe('front');
    expect(s.flags.trap_locked).toBeUndefined();
  });

  it('a later capture says "Encore toi ?!" and the shutter is already open', () => {
    const first = playAll(caught(), [
      { kind: 'verb', verb: 'take', target: 'cellar.rack' },
      { kind: 'item', item: 'bar', target: 'cellar.shutter' },
      { kind: 'exit', exit: 'cellar.toFront' },
    ]).state;
    const again = interact({ ...first, place: 'landing' }, enter('florent'));
    expect(again.beats).toContainEqual({ type: 'say', speaker: 'florent', key: 'line.captureAgain' });
    expect(again.state.captures).toBe(2);
    expect(again.events).toEqual([{ type: 'capture', room: 'florent', count: 2 }]);
    expect(interact(again.state, { kind: 'exit', exit: 'cellar.toFront' }).state.place).toBe('front');
  });

  it('a free visit through the trapdoor can open the shutter, which solves E15; a capture then works like a later one', () => {
    const visit = playAll(base('garage'), [
      { kind: 'exit', exit: 'garage.toCellar' },
      { kind: 'verb', verb: 'take', target: 'cellar.rack' },
      { kind: 'item', item: 'bar', target: 'cellar.shutter' },
      { kind: 'exit', exit: 'cellar.toGarage' },
    ]);
    expect(visit.state.solved).toEqual([15]);
    expect(visit.state.place).toBe('garage');
    const caughtLater = interact({ ...visit.state, place: 'landing' }, enter('theo'));
    expect(caughtLater.beats).toContainEqual({ type: 'say', speaker: 'theo', key: 'line.captureAgain' });
  });
});

describe('door announcements (AC-25)', () => {
  it.each(ROOMS)('the door of %s names its occupant (look and talk) and says when the room is free', (room) => {
    const { from, door } = DOOR_SPAWN[room];
    const who = OCCUPANT[room];
    const s = base(from);
    expect(occupant(room, s.chars)).toBe(who);
    expect(interact(s, { kind: 'verb', verb: 'look', target: door }).beats).toEqual([{ type: 'say', speaker: 'hero', key: `door.${room}.occupied` }]);
    const talk = interact(s, { kind: 'verb', verb: 'talk', target: door });
    expect(talk.beats[0]).toEqual({ type: 'say', speaker: who, key: `${who}.door` });
    const free = base(from, { chars: chars(AWAY[room]) });
    expect(interact(free, { kind: 'verb', verb: 'look', target: door }).beats).toEqual([{ type: 'say', speaker: 'hero', key: `door.${room}.empty` }]);
    expect(interact(free, { kind: 'verb', verb: 'talk', target: door }).accepted).toBe(false);
  });
});
