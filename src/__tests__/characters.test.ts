// T-05 / T-28 / T-31: character states, timers, guarded places, door announcements, captures and the cellar hatch.
import { interact, newGame, playAll, TIMER_MS } from '../game/rules';
import { Beat, CharacterStates, DoorRoom, GameState, GuardedRoom, Input, PlaceId } from '../game/types';
import { charactersIn, DOOR_SPAWN, occupant } from '../game/world';

const base = (place: PlaceId, extra: Partial<GameState> = {}): GameState => ({ ...newGame(), place, flags: { door_unlocked: true }, ...extra });
const chars = (patch: Partial<CharacterStates>): CharacterStates => ({ ...newGame().chars, ...patch });
const enter = (room: DoorRoom): Input => ({ kind: 'verb', verb: 'use', target: DOOR_SPAWN[room].door });
const go = (exit: string): Input => ({ kind: 'exit', exit });
const tick = (ms: number): Input => ({ kind: 'tick', ms });
const said = (who: string, key: string) => ({ type: 'say', speaker: who, key });

const ROOMS: DoorRoom[] = ['office', 'parents', 'julien', 'florent', 'theo'];
const AWAY: Record<DoorRoom, Partial<CharacterStates>> = {
  office: { dad: 'cooking' },
  parents: { mom: 'gardening' },
  julien: { julien: 'football' },
  florent: { florent: 'drumming' },
  theo: { theo: 'chess' },
};
const OCCUPANT = { office: 'dad', parents: 'mom', julien: 'julien', florent: 'florent', theo: 'theo' } as const;

// The open places guarded by an occupant who came there, entered by an exit (AC-23).
const OPEN: [GuardedRoom, PlaceId, string, Partial<CharacterStates>, 'dad' | 'mom'][] = [
  ['front', 'hall', 'hall.toFront', { dad: 'outside' }, 'dad'],
  ['kitchen', 'music', 'music.toKitchen', { dad: 'cooking' }, 'dad'],
  ['garden', 'football', 'football.toGarden', { mom: 'gardening' }, 'mom'],
];

describe('character states (AC-22)', () => {
  it('everyone starts in their room, Papa at his desk, no timer running', () => {
    expect(newGame().chars).toEqual({ dad: 'at_desk', mom: 'folding', julien: 'in_room', florent: 'in_room', theo: 'in_room' });
    expect(newGame().timers).toEqual({ dad: null, dough: null });
  });

  it('walking around and time passing change nobody while no timer runs', () => {
    const { state } = playAll(base('hall'), [go('hall.toLiving'), go('living.toMusic'), tick(600_000), go('music.toLiving'), go('living.toHall'), go('hall.stairs')]);
    expect(state.chars).toEqual(newGame().chars);
    expect(interact(base('hall'), { kind: 'wait' }).accepted).toBe(false);
  });

  it('Florent goes back to his room once the O-ring is taken and the hero leaves his room', () => {
    const drumming = base('florent', { chars: chars({ florent: 'drumming' }) });
    expect(interact(drumming, go('florent.toLanding')).state.chars.florent).toBe('drumming');
    const { state } = playAll(drumming, [{ kind: 'verb', verb: 'take', target: 'florent.kit' }, go('florent.toLanding')]);
    expect(state.chars.florent).toBe('in_room');
    expect(state.place).toBe('landing');
  });

  it('Florent and Théo are heard going back once Sam is out of their room, not while Sam is still inside', () => {
    const drumming = base('florent', { chars: chars({ florent: 'drumming' }), flags: { door_unlocked: true, oring_taken: true } });
    const out = interact(drumming, go('florent.toLanding')).beats;
    const room = out.findIndex((b) => b.type === 'room' && b.place === 'landing');
    expect(room).toBeGreaterThanOrEqual(0);
    expect(out.findIndex((b) => b.type === 'say' && b.key === 'florent.back')).toBeGreaterThan(room);
    const playing = base('theo', { chars: chars({ theo: 'chess' }), flags: { door_unlocked: true, cube_solved: true } });
    const back = interact(playing, go('theo.toLanding')).beats;
    const landing = back.findIndex((b) => b.type === 'room' && b.place === 'landing');
    expect(back.findIndex((b) => b.type === 'say' && b.key === 'line.theoBack')).toBeGreaterThan(landing);
  });

  it('Théo goes back to his room once the cube is solved and the hero leaves his room; CUT07 plays once', () => {
    const playing = base('theo', { chars: chars({ theo: 'chess' }), inventory: ['booklet'] });
    expect(interact(playing, go('theo.toLanding')).state.chars.theo).toBe('chess');
    const { state, outcomes } = playAll(playing, [{ kind: 'item', item: 'booklet', target: 'theo.cube' }, go('theo.toLanding')]);
    expect(state.chars.theo).toBe('in_room');
    expect(state.flags.theo_back).toBe(true);
    expect(state.cuts).toContain('cut07');
    const mono = outcomes[1].beats.filter((b) => b.type === 'say' && b.key.startsWith('line.theoMono'));
    expect(mono).toEqual([said('theo', 'line.theoMono1'), said('theo', 'line.theoMono2')]);
    expect(state.notes).toContain('n07');
    const again = interact({ ...state, place: 'theo', chars: chars({ theo: 'chess' }) }, go('theo.toLanding'));
    expect(again.beats.filter((b) => b.type === 'say' && b.key.startsWith('line.theoMono'))).toHaveLength(0);
  });

  it('the inhabitants are where their state says (Papa nowhere on his way back)', () => {
    expect(charactersIn(base('kitchen', { chars: chars({ dad: 'cooking' }) })).map((c) => c.id)).toEqual(['dad']);
    expect(charactersIn(base('front', { chars: chars({ dad: 'outside' }) })).map((c) => c.id)).toEqual(['dad']);
    expect(charactersIn(base('office', { chars: chars({ dad: 'answering' }) })).map((c) => c.id)).toEqual(['dad']);
    for (const place of ['front', 'office', 'kitchen'] as const) expect(charactersIn(base(place, { chars: chars({ dad: 'returning' }) }))).toEqual([]);
    expect(charactersIn(base('garden', { chars: chars({ mom: 'gardening' }) })).map((c) => c.id)).toEqual(['mom']);
    expect(charactersIn(base('football', { chars: chars({ julien: 'football' }) })).map((c) => c.id)).toEqual(['julien']);
    expect(charactersIn(base('music', { chars: chars({ florent: 'drumming' }) })).map((c) => c.id)).toEqual(['florent']);
    expect(charactersIn(base('living', { chars: chars({ theo: 'chess' }) })).map((c) => c.id)).toEqual(['theo']);
    expect(charactersIn(base('kitchen'))).toEqual([]);
  });
});

describe('the doorbell sequence (AC-51)', () => {
  const rung = () => interact(base('front'), { kind: 'verb', verb: 'use', target: 'front.bell' });

  it('ringing: Papa answers from his desk and stays in his office for 30 s of play time', () => {
    const o = rung();
    expect(o.beats).toContainEqual(said('dad', 'line.dadAnswer'));
    expect(o.state.chars.dad).toBe('answering');
    expect(occupant('office', o.state.chars)).toBe('dad');
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 16 }]);
    const later = interact({ ...o.state, place: 'hall' }, tick(TIMER_MS.answer - 1)).state;
    expect(later.chars.dad).toBe('answering');
  });

  it('then the front door view: Papa outside 90 s (office free, front guarded), then back 60 s after his line', () => {
    const s = { ...rung().state, place: 'hall' as const };
    const out = interact(s, tick(TIMER_MS.answer));
    expect(out.beats).toContainEqual({ type: 'view', view: 'door' });
    expect(out.beats).toContainEqual(said('dad', 'line.dadAtDoor'));
    expect(out.state.chars.dad).toBe('outside');
    expect(out.state.place).toBe('hall');
    expect(occupant('office', out.state.chars)).toBeNull();
    expect(occupant('front', out.state.chars)).toBe('dad');
    expect(interact(out.state, tick(TIMER_MS.outside - 1)).state.chars.dad).toBe('outside');
    const back = interact(out.state, tick(TIMER_MS.outside));
    expect(back.beats).toContainEqual(said('dad', 'line.dadGoingBack'));
    expect(interact(back.state, tick(TIMER_MS.back - 1)).state.chars.dad).toBe('returning');
    expect(back.state.chars.dad).toBe('returning');
    expect(occupant('front', back.state.chars)).toBeNull();
    expect(occupant('office', back.state.chars)).toBeNull();
    const desk = interact(back.state, tick(TIMER_MS.back));
    expect(desk.state.chars.dad).toBe('at_desk');
    expect(desk.state.timers.dad).toBeNull();
  });

  it('Sam still in front of the house when Papa opens is caught', () => {
    const o = interact(rung().state, tick(TIMER_MS.answer));
    expect(o.state.place).toBe('cellar');
    expect(o.events).toEqual([{ type: 'capture', room: 'front', count: 1 }]);
  });

  it('Sam still in the office when Papa is back is caught', () => {
    const s = interact({ ...rung().state, place: 'corridor0' }, tick(TIMER_MS.answer)).state;
    const inOffice = interact(s, enter('office')).state;
    expect(inOffice.place).toBe('office');
    const o = interact(inOffice, tick(TIMER_MS.outside + TIMER_MS.back));
    expect(o.state.place).toBe('cellar');
    expect(o.events).toEqual([{ type: 'capture', room: 'office', count: 1 }]);
  });

  it('the doorbell is busy meanwhile and can be rung again once Papa is back (no second puzzle_solved)', () => {
    const s = rung().state;
    const busy = interact(s, { kind: 'verb', verb: 'use', target: 'front.bell' });
    expect(busy.beats).toContainEqual(said('hero', 'line.bellBusy'));
    const backHome = playAll({ ...s, place: 'hall' }, [tick(TIMER_MS.answer + TIMER_MS.outside + TIMER_MS.back), go('hall.toFront')]).state;
    expect(backHome.chars.dad).toBe('at_desk');
    const again = interact(backHome, { kind: 'verb', verb: 'use', target: 'front.bell' });
    expect(again.state.chars.dad).toBe('answering');
    expect(again.events).toEqual([]);
  });

  it('one long tick resolves the timers in order, each from the end of the previous one', () => {
    const o = interact({ ...rung().state, place: 'hall' }, tick(TIMER_MS.answer + TIMER_MS.outside + TIMER_MS.back + 5000));
    expect(o.state.chars.dad).toBe('at_desk');
    expect(o.state.clock).toBe(TIMER_MS.answer + TIMER_MS.outside + TIMER_MS.back + 5000);
    expect(o.beats.filter((b) => b.type === 'say').map((b) => (b as { key: string }).key)).toEqual(['line.dadAtDoor', 'line.dadGoingBack']);
  });
});

describe('the dough (AC-52)', () => {
  const mixed = () =>
    playAll(base('kitchen', { inventory: ['ricemilk', 'chestnut', 'riceflour'] }), [
      { kind: 'item', item: 'riceflour', target: 'kitchen.robot' },
      { kind: 'item', item: 'ricemilk', target: 'kitchen.robot' },
      { kind: 'item', item: 'chestnut', target: 'kitchen.robot' },
    ]);

  it('the three ingredients in any order: E19, then Papa comes to cook 120 s later, for good', () => {
    const { state, outcomes } = mixed();
    expect(outcomes[2].beats).toContainEqual(said('hero', 'line.doughMixed'));
    expect(outcomes[2].events).toEqual([{ type: 'puzzle', puzzle: 19 }]);
    expect(outcomes[0].events).toEqual([]);
    const away = interact(state, go('kitchen.toMusic')).state;
    expect(interact(away, tick(TIMER_MS.dough - 1)).state.chars.dad).toBe('at_desk');
    const o = interact(away, tick(TIMER_MS.dough));
    expect(o.beats).toContainEqual({ type: 'view', view: 'kitchen' });
    expect(o.beats).toContainEqual(said('dad', 'line.dadDough'));
    expect(o.state.chars.dad).toBe('cooking');
    expect(o.state.cuts).toContain('cut12');
    expect(occupant('office', o.state.chars)).toBeNull();
    expect(interact(o.state, tick(3_600_000)).state.chars.dad).toBe('cooking');
  });

  it('Sam still in the kitchen when Papa arrives is caught', () => {
    const o = interact(mixed().state, tick(TIMER_MS.dough));
    expect(o.state.place).toBe('cellar');
    expect(o.events).toEqual([{ type: 'capture', room: 'kitchen', count: 1 }]);
  });

  it('the dough cancels a doorbell sequence and the doorbell then finds nobody', () => {
    // Mixed first, rung 10 s later: Papa comes out, then the dough calls him to the kitchen while he is outside.
    let s = interact(mixed().state, go('kitchen.toMusic')).state;
    s = interact(s, tick(10_000)).state;
    s = interact({ ...s, place: 'front' }, { kind: 'verb', verb: 'use', target: 'front.bell' }).state;
    s = interact({ ...s, place: 'hall' }, tick(TIMER_MS.answer)).state;
    expect(s.chars.dad).toBe('outside');
    s = interact(s, { kind: 'wait' }).state;
    expect(s.chars.dad).toBe('cooking');
    expect(s.timers).toEqual({ dad: null, dough: null });
    const bell = interact({ ...s, place: 'front' }, { kind: 'verb', verb: 'use', target: 'front.bell' });
    expect(bell.beats).toContainEqual(said('hero', 'line.bellNobody'));
  });
});

describe('the timers and play time (AC-58)', () => {
  it('only advance through tick inputs, which the screen sends while playing', () => {
    const s = interact(base('front'), { kind: 'verb', verb: 'use', target: 'front.bell' }).state;
    expect(s.timers.dad).toBe(TIMER_MS.answer);
    expect({ ...s, playMs: s.playMs + 600_000 }.chars.dad).toBe('answering');
    expect(interact(s, tick(-1)).accepted).toBe(false);
  });
});

describe('guarded places and captures (AC-23)', () => {
  it.each(ROOMS)('entering %s with its occupant inside is a capture that keeps everything', (room) => {
    const from = DOOR_SPAWN[room].from;
    // A dough timer is running: the capture keeps it as it is.
    const s = base(from, { inventory: ['pole', 'booklet'], notes: ['n01', 'n02'], solved: [1, 19], timers: { dad: null, dough: 90_000 } });
    const o = interact(s, enter(room));
    expect(o.state.place).toBe('cellar');
    expect(o.state.captures).toBe(1);
    expect(o.events).toEqual([{ type: 'capture', room, count: 1 }]);
    expect(o.beats).toContainEqual(said(OCCUPANT[room], `capture.${OCCUPANT[room]}`));
    // The scene plays inside the room: Sam steps in first.
    const stepIn = o.beats.findIndex((b) => b.type === 'room' && b.place === room);
    const first = o.beats.findIndex((b) => b.type === 'say');
    expect(stepIn).toBeGreaterThanOrEqual(0);
    expect(stepIn).toBeLessThan(first);
    expect(o.state.inventory).toEqual(s.inventory);
    expect(o.state.notes).toEqual(s.notes);
    expect(o.state.solved).toEqual(s.solved);
    expect(o.state.chars).toEqual(s.chars);
    expect(o.state.flags).toEqual(s.flags);
    expect(o.state.timers).toEqual(s.timers);
  });

  it.each(ROOMS)('entering %s while its occupant is away is safe', (room) => {
    const o = interact(base(DOOR_SPAWN[room].from, { chars: chars(AWAY[room]) }), enter(room));
    expect(o.state.place).toBe(room);
    expect(o.events).toEqual([]);
    expect(o.state.captures).toBe(0);
  });

  it.each(OPEN)('walking into the %s while its occupant is there is a capture that keeps everything', (room, from, exit, patch, who) => {
    // Papa outside has his way-back timer running; it is kept by the capture.
    const timers = patch.dad === 'outside' ? { dad: 40_000, dough: null } : { dad: null, dough: null };
    const s = base(from, { chars: chars(patch), flags: { door_unlocked: true, gates_open: true }, inventory: ['pole', 'sticks'], notes: ['n01', 'n03'], solved: [1, 16], timers });
    const o = interact(s, go(exit));
    expect(o.state.place).toBe('cellar');
    expect(o.events).toEqual([{ type: 'capture', room, count: 1 }]);
    expect(o.beats).toContainEqual(said(who, `capture.${who}`));
    expect(o.state.inventory).toEqual(s.inventory);
    expect(o.state.notes).toEqual(s.notes);
    expect(o.state.solved).toEqual(s.solved);
    expect(o.state.chars).toEqual(s.chars);
    expect(o.state.flags).toEqual(s.flags);
    expect(o.state.timers).toEqual(s.timers);
    const free = interact({ ...s, chars: newGame().chars }, go(exit));
    expect(free.state.place).not.toBe('cellar');
  });

  it('walking in common places never captures, even next to the inhabitants', () => {
    const s = base('music', { chars: chars({ florent: 'drumming' }) });
    const { state, outcomes } = playAll(s, [go('music.toLiving'), go('living.toMusic'), go('music.toKitchen')]);
    expect(state.captures).toBe(0);
    expect(outcomes.flatMap((o) => o.events)).toEqual([]);
  });
});

describe('the capture scene (AC-23)', () => {
  const lines = (beats: readonly Beat[]) => beats.flatMap((b) => (b.type === 'say' ? [b] : []));

  it('caught by a boy: he shouts for Papa, Papa comes 2 s later, takes Sam to the cellar and leaves 3 s later; all unskippable', () => {
    const o = interact(base('landing'), enter('theo'));
    expect(lines(o.beats).map((l) => [l.speaker, l.key])).toEqual([
      ['theo', 'capture.theo'],
      ['dad', 'capture.dad'],
      ['dad', 'capture.keep'],
      ['narrator', 'capture.cellar'],
    ]);
    const kinds = o.beats.map((b) => (b.type === 'say' ? b.key : b.type === 'wait' ? `wait ${b.ms}` : b.type === 'captor' ? `captor ${b.character}` : b.type === 'cinematic' ? `cinematic ${b.on}` : b.type === 'room' ? `room ${b.place}` : b.type));
    // The door, Sam steps into the room, then the capture sting.
    expect(kinds).toEqual([
      'sfx',
      'room theo',
      'sfx',
      'cinematic true',
      'capture.theo',
      'wait 2000',
      'captor dad',
      'capture.dad',
      'wait 1500',
      'capture',
      'room cellar',
      'captor dad',
      'capture.keep',
      'wait 3000',
      'captor null',
      'cinematic false',
      'capture.cellar',
    ]);
  });

  it('caught by an adult: the capture line, then the same end in the cellar with that adult', () => {
    const o = interact(base('landing'), enter('parents'));
    expect(lines(o.beats).map((l) => [l.speaker, l.key])).toEqual([
      ['mom', 'capture.mom'],
      ['mom', 'capture.keep'],
      ['narrator', 'capture.cellar'],
    ]);
    expect(o.beats).toContainEqual({ type: 'captor', character: 'mom' });
    expect(o.beats.filter((b) => b.type === 'wait')).toEqual([
      { type: 'wait', ms: 1500 },
      { type: 'wait', ms: 3000 },
    ]);
  });

  it('the front door and kitchen views cannot be skipped either', () => {
    const rung = interact(base('front'), { kind: 'verb', verb: 'use', target: 'front.bell' }).state;
    const view = interact({ ...rung, place: 'hall' }, tick(TIMER_MS.answer));
    const at = view.beats.findIndex((b) => b.type === 'view');
    expect(view.beats[at - 1]).toEqual({ type: 'cinematic', on: true });
    expect(view.beats.slice(at)).toContainEqual({ type: 'cinematic', on: false });
    const dough: GameState = { ...base('music'), flags: { door_unlocked: true, dough_mixed: true }, timers: { dad: null, dough: 1000 } };
    const kitchen = interact(dough, tick(1000));
    const k = kitchen.beats.findIndex((b) => b.type === 'view');
    expect(kitchen.beats[k]).toEqual({ type: 'view', view: 'kitchen' });
    expect(kitchen.beats[k - 1]).toEqual({ type: 'cinematic', on: true });
    expect(kitchen.beats.slice(k)).toContainEqual({ type: 'cinematic', on: false });
  });

  it('the PRD durations: answer 30 s, outside 90 s, back 60 s, dough 120 s', () => {
    expect(TIMER_MS).toEqual({ answer: 30_000, outside: 90_000, back: 60_000, dough: 120_000 });
  });
});

describe('first and later captures (AC-24)', () => {
  it('the first capture asks who Sam is, even when the hatch was already unblocked; later ones say "Encore toi ?!"', () => {
    const visited: GameState = { ...base('landing'), flags: { door_unlocked: true, hatch_open: true, bar_taken: true }, solved: [15] };
    const first = interact(visited, enter('julien'));
    expect(first.beats).toContainEqual(said('dad', 'capture.dad'));
    expect(first.beats).not.toContainEqual(said('dad', 'line.captureAgain'));
    const second = interact({ ...first.state, place: 'landing' }, enter('julien'));
    expect(second.beats).toContainEqual(said('dad', 'line.captureAgain'));
    expect(second.beats).not.toContainEqual(said('dad', 'capture.dad'));
  });
});

describe('the cellar hatch (AC-24)', () => {
  const caught = () => interact(base('landing'), enter('julien')).state;
  const take = (target: string): Input => ({ kind: 'verb', verb: 'take', target });

  it('the hatch is stuck from below until the iron bar unblocks it (E15), then it leads up for good', () => {
    const s = caught();
    expect(interact(s, go('cellar.toGarage')).accepted).toBe(false);
    expect(interact(s, { kind: 'verb', verb: 'use', target: 'cellar.hatch' }).beats).toContainEqual(said('hero', 'line.hatchStuck'));
    const { state, outcomes } = playAll(s, [take('cellar.rack'), { kind: 'item', item: 'bar', target: 'cellar.hatch' }]);
    expect(outcomes[1].events).toEqual([{ type: 'puzzle', puzzle: 15 }]);
    expect(state.flags.hatch_open).toBe(true);
    expect(state.inventory).not.toContain('bar');
    const up = interact(state, go('cellar.toGarage')).state;
    expect(up.place).toBe('garage');
    expect(interact(up, go('garage.toCellar')).state.place).toBe('cellar');
  });

  it('going down from the garage is always possible, then the hatch is stuck from below', () => {
    const down = interact(base('garage'), go('garage.toCellar')).state;
    expect(down.place).toBe('cellar');
    expect(interact(down, go('cellar.toGarage')).accepted).toBe(false);
  });

  it('a later capture says "Encore toi ?!" and Sam can walk straight up', () => {
    const open = playAll(caught(), [take('cellar.rack'), { kind: 'item', item: 'bar', target: 'cellar.hatch' }]).state;
    const again = interact({ ...open, place: 'landing' }, enter('florent'));
    expect(again.beats).toContainEqual(said('dad', 'line.captureAgain'));
    expect(again.state.captures).toBe(2);
    expect(again.events).toEqual([{ type: 'capture', room: 'florent', count: 2 }]);
    expect(interact(again.state, go('cellar.toGarage')).state.place).toBe('garage');
  });
});

describe('announcements (AC-25)', () => {
  it.each(ROOMS)('the door of %s names its occupant (look and talk) and says when the room is free', (room) => {
    const { from, door } = DOOR_SPAWN[room];
    const who = OCCUPANT[room];
    const s = base(from);
    expect(occupant(room, s.chars)).toBe(who);
    expect(interact(s, { kind: 'verb', verb: 'look', target: door }).beats).toEqual([said('hero', `door.${room}.occupied`)]);
    const talk = interact(s, { kind: 'verb', verb: 'talk', target: door });
    expect(talk.beats[0]).toEqual(said(who, `${who}.door`));
    const free = base(from, { chars: chars(AWAY[room]) });
    expect(interact(free, { kind: 'verb', verb: 'look', target: door }).beats).toEqual([said('hero', `door.${room}.empty`)]);
    expect(interact(free, { kind: 'verb', verb: 'talk', target: door }).accepted).toBe(false);
  });

  it('Papa answering the bell says he is coming through his door', () => {
    const s = base('corridor0', { chars: chars({ dad: 'answering' }) });
    expect(interact(s, { kind: 'verb', verb: 'talk', target: 'corridor0.officeDoor' }).beats).toEqual([said('dad', 'dad.doorComing')]);
  });
});
