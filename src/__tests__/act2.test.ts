// T-54..T-63: Act II rules - lures and wariness, the delivery, the hose, the cat and the parcel, Florent's bike, the
// power cut, invisible ink and bottles, the drawer and the trunk, the finale and the timer order (AC-59..AC-69).
import { interact, newGame, playAll, TIMER_MS } from '../game/rules';
import { Beat, CharacterStates, Flag, GameEvent, GameState, Input, ItemId, PlaceId } from '../game/types';
import { characterPlacement, findHotspot, occupant } from '../game/world';

const flags = (...names: Flag[]) => Object.fromEntries(['door_unlocked', ...names].map((n) => [n, true])) as GameState['flags'];
const chars = (patch: Partial<CharacterStates>): CharacterStates => ({ ...newGame().chars, ...patch });
const at = (place: PlaceId, extra: Partial<GameState> = {}): GameState => ({ ...newGame(), place, flags: flags(), ...extra });
const tick = (ms: number): Input => ({ kind: 'tick', ms });
const use = (target: string): Input => ({ kind: 'verb', verb: 'use', target });
const take = (target: string): Input => ({ kind: 'verb', verb: 'take', target });
const give = (item: ItemId, target: string): Input => ({ kind: 'item', item, target });
const go = (exit: string): Input => ({ kind: 'exit', exit });
const said = (speaker: string, key: string): Beat => ({ type: 'say', speaker, key } as Beat);
const keys = (beats: readonly Beat[]) => beats.flatMap((b) => (b.type === 'say' ? [b.key] : []));
const puzzles = (o: { events: readonly GameEvent[] }) => o.events.flatMap((e) => (e.type === 'puzzle' ? [e.puzzle] : []));

// Papa wary: the computer was read and he came back to his desk once.
const wary = (place: PlaceId, extra: Partial<GameState> = {}) => at(place, { flags: flags('computer_read', 'dad_wary'), ...extra });

describe('lures and wariness (AC-59)', () => {
  it('Papa back at his desk after E07 notices his computer: he becomes wary and the delivery is 60 s away', () => {
    const rung = interact(at('front', { flags: flags('computer_read') }), use('front.bell')).state;
    let s = interact({ ...rung, place: 'hall' }, tick(TIMER_MS.answer + TIMER_MS.outside)).state;
    expect(s.chars.dad).toBe('returning');
    expect(s.flags.dad_wary).toBeUndefined();
    const back = interact(s, tick(TIMER_MS.back));
    expect(back.beats).toContainEqual(said('dad', 'line.dadWary'));
    expect(back.beats).toContainEqual(said('dad', 'line.dadKey'));
    s = back.state;
    expect(s.chars.dad).toBe('at_desk');
    expect(s.flags.dad_wary).toBe(true);
    expect(s.timers.delivery).toBe(s.clock + TIMER_MS.delivery);
  });

  it('before E07 he only goes back to his desk, the doorbell works again', () => {
    const rung = interact(at('front'), use('front.bell')).state;
    const s = interact({ ...rung, place: 'hall' }, tick(TIMER_MS.answer + TIMER_MS.outside + TIMER_MS.back));
    expect(keys(s.beats)).not.toContain('line.dadWary');
    expect(interact({ ...s.state, place: 'front' }, use('front.bell')).state.chars.dad).toBe('answering');
  });

  it('back from cooking after E07, he becomes wary as well', () => {
    const s = at('music', { flags: flags('computer_read', 'dough_mixed'), chars: chars({ dad: 'cooking' }), timers: { dad: 5000, dough: null, mom: null, delivery: null } });
    const o = interact(s, tick(5000));
    expect(keys(o.beats)).toEqual(['line.dadOven', 'line.dadWary', 'line.dadKey']);
    expect(o.state.flags.dad_wary).toBe(true);
  });

  it('a wary Papa ignores the doorbell and the dough, and says so through his door', () => {
    const bell = interact(wary('front'), use('front.bell'));
    expect(bell.beats).toContainEqual(said('dad', 'line.bellIgnored'));
    expect(bell.state.chars.dad).toBe('at_desk');
    expect(bell.state.timers.dad).toBeNull();
    expect(bell.events).toEqual([]);
    const door = interact(wary('corridor0'), { kind: 'verb', verb: 'listen', target: 'corridor0.officeDoor' });
    expect(door.beats[0]).toEqual(said('dad', 'dad.doorWary'));
    const dough = playAll(wary('kitchen', { inventory: ['ricemilk', 'chestnut', 'riceflour'] }), [
      give('ricemilk', 'kitchen.robot'),
      give('chestnut', 'kitchen.robot'),
      give('riceflour', 'kitchen.robot'),
    ]);
    const last = dough.outcomes[2];
    expect(last.beats).toContainEqual(said('dad', 'line.doughIgnored'));
    expect(puzzles(last)).toEqual([19]);
    expect(dough.state.timers.dough).toBeNull();
  });

  it('a dough timer ending once Papa is wary plays his refusal instead of CUT12', () => {
    const s = wary('music', { flags: flags('computer_read', 'dad_wary', 'dough_mixed'), timers: { dad: null, dough: 1000, mom: null, delivery: null } });
    const o = interact(s, tick(1000));
    expect(o.beats).toEqual([said('dad', 'line.doughIgnored')]);
    expect(o.state.chars.dad).toBe('at_desk');
    expect(o.state.cuts).not.toContain('cut12');
  });
});

describe('the delivery (AC-60)', () => {
  const pending = (place: PlaceId) => wary(place, { timers: { dad: null, dough: null, mom: null, delivery: TIMER_MS.delivery } });

  it('60 s after Papa is wary, CUT13 plays wherever Sam is: the parcel lands in the garden under the cat', () => {
    expect(interact(pending('hall'), tick(TIMER_MS.delivery - 1)).state.flags.delivered).toBeUndefined();
    const o = interact(pending('hall'), tick(TIMER_MS.delivery));
    const views = o.beats.flatMap((b) => (b.type === 'view' ? [b.view] : []));
    expect(views).toEqual(['delivery', 'garden']);
    expect(keys(o.beats)).toEqual(['line.deliveryRing', 'line.bellIgnored', 'line.deliveryThrow', 'cut13']);
    expect(o.beats[o.beats.findIndex((b) => b.type === 'view') - 1]).toEqual({ type: 'cinematic', on: true });
    expect(o.state.flags.delivered).toBe(true);
    expect(o.state.notes).toContain('n16');
    expect(o.state.cuts).toContain('cut13');
    expect(o.state.timers.delivery).toBeNull();
    const garden = { ...o.state, place: 'garden' as const };
    expect(findHotspot(garden, 'garden.cat')).toBeDefined();
    expect(findHotspot(garden, 'garden.parcel')).toBeDefined();
  });

  it('nobody catches Sam in front of the house: the driver only delivers', () => {
    const o = interact(pending('front'), tick(TIMER_MS.delivery));
    expect(o.state.place).toBe('front');
    expect(o.events).toEqual([]);
  });
});

describe('the hose (AC-61)', () => {
  const gardening = (extra: Partial<GameState> = {}) => at('pool', { chars: chars({ mom: 'gardening' }), ...extra });

  it('soaks Maman (CUT14): she changes in her room for 90 s, the garden is free and her room guarded', () => {
    const o = interact(gardening(), use('pool.tap'));
    expect(o.beats).toContainEqual({ type: 'view', view: 'hose' });
    expect(o.beats).toContainEqual(said('mom', 'line.momSoaked'));
    expect(puzzles(o)).toEqual([22]);
    expect(o.state.chars.mom).toBe('changing');
    expect(o.state.timers.mom).toBe(TIMER_MS.change);
    expect(occupant('garden', o.state.chars)).toBeNull();
    expect(occupant('parents', o.state.chars)).toBe('mom');
    const intoHerRoom = interact({ ...o.state, place: 'landing' }, use('landing.parentsDoor'));
    expect(intoHerRoom.events).toEqual([{ type: 'capture', room: 'parents', count: 1 }]);
  });

  it('she comes back 90 s later and catches Sam still in the garden', () => {
    const s = interact(gardening(), use('pool.tap')).state;
    const inGarden = { ...s, place: 'garden' as const };
    expect(interact(inGarden, tick(TIMER_MS.change - 1)).state.chars.mom).toBe('changing');
    const o = interact(inGarden, tick(TIMER_MS.change));
    expect(o.beats).toContainEqual(said('mom', 'line.momBack'));
    expect(o.state.chars.mom).toBe('gardening');
    expect(o.events).toEqual([{ type: 'capture', room: 'garden', count: 1 }]);
  });

  it('works again once she is back, waters the lawn when she is not gardening, and stays closed once the garden holds nothing more', () => {
    let s = interact(gardening(), use('pool.tap')).state;
    expect(interact(s, use('pool.tap')).beats).toContainEqual(said('hero', 'line.hoseLawn'));
    s = interact(s, tick(TIMER_MS.change)).state;
    const again = interact(s, use('pool.tap'));
    expect(again.beats).toContainEqual(said('mom', 'line.momSoakedAgain'));
    expect(again.events).toEqual([]);
    expect(interact(at('pool'), use('pool.tap')).beats).toContainEqual(said('hero', 'line.hoseLawn'));
    const done = gardening({ flags: flags('parcel_taken', 'keyring_taken') });
    const off = interact(done, use('pool.tap'));
    expect(off.beats).toEqual([said('hero', 'line.hoseOff')]);
    expect(off.state.chars.mom).toBe('gardening');
  });
});

describe('the cat, the parcel and the shed (AC-62)', () => {
  const garden = (inventory: ItemId[] = []) => wary('garden', { flags: flags('computer_read', 'dad_wary', 'delivered'), chars: chars({ mom: 'changing' }), inventory });

  it('the cat hisses until it gets the sardines, then the parcel gives the tonka bean and the bike pump', () => {
    expect(interact(garden(), use('garden.cat')).beats).toContainEqual(said('hero', 'line.catHiss'));
    const refused = interact(garden(), take('garden.parcel'));
    expect(refused.beats).toContainEqual(said('hero', 'line.catHiss'));
    expect(refused.state.inventory).toEqual([]);
    const fed = interact(garden(['sardines']), give('sardines', 'garden.cat'));
    expect(puzzles(fed)).toEqual([23]);
    expect(fed.state.inventory).toEqual([]);
    expect(findHotspot(fed.state, 'garden.cat')).toBeUndefined();
    const parcel = interact(fed.state, take('garden.parcel'));
    expect(puzzles(parcel)).toEqual([24]);
    expect(parcel.state.inventory).toEqual(['tonka', 'pump']);
    expect(findHotspot(parcel.state, 'garden.parcel')).toBeUndefined();
  });

  it('Papa gives his drawer key to Maman when he becomes wary; her gardening basket holds it while she changes', () => {
    expect(findHotspot({ ...garden(), flags: flags('delivered') }, 'garden.basket')).toBeUndefined();
    expect(findHotspot({ ...garden(), chars: chars({ mom: 'folding' }) }, 'garden.basket')).toBeUndefined();
    const o = interact(garden(), take('garden.basket'));
    expect(puzzles(o)).toEqual([25]);
    expect(o.state.inventory).toEqual(['keyring']);
    expect(findHotspot(o.state, 'garden.basket')).toBeUndefined();
    expect(findHotspot(garden(), 'garden.shed')?.verbs).toEqual(['look']);
  });

  it('the sardines are on the utility shelf', () => {
    expect(interact(at('utility'), take('utility.sardines')).state.inventory).toEqual(['sardines']);
  });
});

describe('Florent\'s bike (AC-63)', () => {
  it('the Nerf kit holds the O-ring and the puncture patches', () => {
    const o = interact(at('florent', { chars: chars({ florent: 'drumming' }) }), take('florent.kit'));
    expect(o.state.inventory).toEqual(['oring', 'patches']);
  });

  it('the patches and the pump repair the bike in any order; leaving the garage, Florent rides away until the finale', () => {
    let s = at('garage', { inventory: ['pump', 'patches'] });
    const half = interact(s, give('pump', 'garage.bike'));
    expect(half.beats).toContainEqual(said('hero', 'line.bikeHalf'));
    expect(half.events).toEqual([]);
    const fixed = interact(half.state, give('patches', 'garage.bike'));
    expect(puzzles(fixed)).toEqual([26]);
    expect(fixed.state.inventory).toEqual([]);
    s = fixed.state;
    expect(s.chars.florent).toBe('in_room');
    const out = interact(s, go('garage.toCorridor'));
    expect(out.state.chars.florent).toBe('riding');
    expect(out.beats).toContainEqual({ type: 'view', view: 'ride' });
    expect(out.beats).toContainEqual(said('florent', 'line.florentBike'));
    expect(out.state.cuts).toContain('cut15');
    expect(occupant('florent', out.state.chars)).toBeNull();
    expect(characterPlacement('florent', out.state)).toBeNull();
    expect(interact({ ...out.state, place: 'garage' }, go('garage.toCorridor')).state.cuts.filter((c) => c === 'cut15')).toHaveLength(1);
  });
});

describe('the power cut (AC-64)', () => {
  const room = (extra: Partial<GameState> = {}) => wary('florent', { chars: chars({ florent: 'riding' }), inventory: ['hairdryer'], ...extra });

  it('only once Florent rides away: his console runs on the power strip', () => {
    for (const florent of ['in_room', 'drumming'] as const) {
      const o = interact(room({ chars: chars({ florent }) }), give('hairdryer', 'florent.strip'));
      expect(o.beats).toContainEqual(said('hero', 'line.stripNotNow'));
      expect(o.state.chars.dad).toBe('at_desk');
    }
  });

  it('the fuses blow (CUT18): Papa is at the garage fuse box for 60 s, the office is free, then he comes back', () => {
    const o = interact(room(), give('hairdryer', 'florent.strip'));
    expect(o.beats).toContainEqual({ type: 'view', view: 'dark' });
    expect(o.beats).toContainEqual(said('dad', 'line.dadFuses'));
    expect(puzzles(o)).toEqual([27]);
    expect(o.state.inventory).toEqual(['hairdryer']);
    expect(o.state.chars.dad).toBe('fuses');
    expect(occupant('garage', o.state.chars)).toBe('dad');
    expect(occupant('office', o.state.chars)).toBeNull();
    const inOffice = { ...o.state, place: 'office' as const };
    expect(interact(inOffice, tick(TIMER_MS.fuses - 1)).state.chars.dad).toBe('fuses');
    const back = interact(inOffice, tick(TIMER_MS.fuses));
    expect(back.beats).toContainEqual(said('dad', 'line.dadFusesDone'));
    expect(back.state.chars.dad).toBe('at_desk');
    expect(back.events).toEqual([{ type: 'capture', room: 'office', count: 1 }]);
    const garage = interact({ ...o.state, place: 'corridor0' }, go('corridor0.toGarage'));
    expect(garage.events).toEqual([{ type: 'capture', room: 'garage', count: 1 }]);
  });

  it('can be caused again while the office holds something needed, then is useless; never while Papa is away', () => {
    const first = interact(room(), give('hairdryer', 'florent.strip')).state;
    expect(interact(first, give('hairdryer', 'florent.strip')).beats).toContainEqual(said('hero', 'line.fusesNobody'));
    const back = interact(first, tick(TIMER_MS.fuses)).state;
    const again = interact(back, give('hairdryer', 'florent.strip'));
    expect(again.beats).toContainEqual(said('dad', 'line.fusesAgain'));
    expect(again.events).toEqual([]);
    const drawerOnly = room({ flags: flags('computer_read', 'dad_wary', 'drawer_open') });
    expect(interact(drawerOnly, give('hairdryer', 'florent.strip')).state.chars.dad).toBe('fuses');
    const nothingLeft = room({ flags: flags('computer_read', 'dad_wary', 'drawer_open', 'pliers_taken') });
    const no = interact(nothingLeft, give('hairdryer', 'florent.strip'));
    expect(no.beats).toEqual([said('hero', 'line.fusesNoNeed')]);
    expect(no.state.chars.dad).toBe('at_desk');
  });
});

describe('invisible ink and the cellar bottles (AC-65)', () => {
  it('the hair dryer on Papa\'s note reveals the invisible ink once (E20)', () => {
    const o = interact(at('hall', { inventory: ['hairdryer', 'note'] }), { kind: 'item', item: 'hairdryer', target: 'item:note' });
    expect(puzzles(o)).toEqual([20]);
    expect(o.state.notes).toContain('n13');
    expect(o.state.inventory).toEqual(['hairdryer', 'note']);
    expect(interact(o.state, { kind: 'lookItem', item: 'note' }).beats).toEqual([said('hero', 'item.note.lookInk')]);
    const again = interact(o.state, { kind: 'item', item: 'note', target: 'item:hairdryer' });
    expect(again.events).toEqual([]);
    expect(again.beats.some((b) => b.type === 'note')).toBe(false);
  });

  it('the bottles refuse before N13, then only take the oldest to the youngest (E21)', () => {
    expect(interact(at('cellar'), use('cellar.bottles')).beats).toEqual([said('hero', 'line.bottlesUnknown')]);
    const s = at('cellar', { notes: ['n01', 'n13'] });
    expect(interact(s, use('cellar.bottles')).beats).toEqual([{ type: 'pad', pad: 'bottles' }]);
    const wrong = interact(s, { kind: 'pad', pad: 'bottles', code: ['1994', '1987', '2003', '2011'] });
    expect(wrong.beats).toContainEqual(said('hero', 'line.bottlesWrong'));
    expect(wrong.state.inventory).toEqual([]);
    expect(wrong.events).toEqual([]);
    const right = interact(wrong.state, { kind: 'pad', pad: 'bottles', code: ['1987', '1994', '2003', '2011'] });
    expect(puzzles(right)).toEqual([21]);
    expect(right.state.inventory).toEqual(['scrap2']);
    expect(interact(right.state, { kind: 'pad', pad: 'bottles', code: ['1987', '1994', '2003', '2011'] }).accepted).toBe(false);
    expect(interact(at('cellar'), { kind: 'pad', pad: 'bottles', code: ['1987', '1994', '2003', '2011'] }).accepted).toBe(false);
    expect(interact(s, { kind: 'pad', pad: 'bottles', code: ['1987', '1994', '2003'] }).accepted).toBe(false);
  });
});

describe('the desk drawer and the attic trunk (AC-66)', () => {
  it('the drawer is locked without its key, then gives the sketchbook (E28)', () => {
    expect(interact(at('office', { chars: chars({ dad: 'fuses' }) }), use('office.drawer')).beats).toEqual([said('hero', 'line.drawerLocked')]);
    expect(interact(wary('office', { chars: chars({ dad: 'fuses' }) }), { kind: 'verb', verb: 'look', target: 'office.drawer' }).beats).toEqual([said('hero', 'office.drawer.lookWary')]);
    const o = interact(wary('office', { chars: chars({ dad: 'fuses' }), inventory: ['keyring'] }), give('keyring', 'office.drawer'));
    expect(puzzles(o)).toEqual([28]);
    expect(o.state.notes).toContain('n14');
    expect(o.state.inventory).toEqual([]);
  });

  it('the trunk refuses before N14, then only takes red, yellow, blue, green (E29)', () => {
    expect(interact(at('attic'), use('attic.trunk')).beats).toEqual([said('hero', 'line.trunkUnknown')]);
    const s = at('attic', { notes: ['n01', 'n14'] });
    expect(interact(s, use('attic.trunk')).beats).toEqual([{ type: 'pad', pad: 'trunk' }]);
    const wrong = interact(s, { kind: 'pad', pad: 'trunk', code: ['red', 'yellow', 'green', 'blue'] });
    expect(wrong.beats).toContainEqual(said('hero', 'line.codeWrong'));
    expect(wrong.events).toEqual([]);
    const right = interact(s, { kind: 'pad', pad: 'trunk', code: ['red', 'yellow', 'blue', 'green'] });
    expect(puzzles(right)).toEqual([29]);
    expect(right.state.inventory).toEqual(['scrap3']);
    expect(interact(s, { kind: 'pad', pad: 'trunk', code: ['red', 'yellow', 'blue', 'pink'] }).accepted).toBe(false);
  });
});

describe('the tonka bean and the end (AC-67, AC-68)', () => {
  const lab = (flagsOn: Flag[]) => at('laundry', { inventory: ['scrap', 'scrap2', 'scrap3'], flags: flags('secret_open', ...flagsOn), captures: 3 });
  const pieces = [give('scrap', 'laundry.notebook'), give('scrap2', 'laundry.notebook'), give('scrap3', 'laundry.notebook')];

  it('the tonka bean goes into Papa\'s dough in the food processor once the dough is made (E30)', () => {
    const none = interact(at('kitchen', { inventory: ['tonka'] }), give('tonka', 'kitchen.robot'));
    expect(none.beats).toEqual([said('hero', 'line.tonkaNoDough')]);
    expect(none.state.inventory).toEqual(['tonka']);
    const o = interact(at('kitchen', { inventory: ['tonka'], flags: flags('dough_mixed') }), give('tonka', 'kitchen.robot'));
    expect(puzzles(o)).toEqual([30]);
    expect(o.state.flags.tonka_in).toBe(true);
    expect(o.state.inventory).toEqual([]);
  });

  it('with the tonka bean in the dough, the last fragment gathers the family one after the other, then the Ending', () => {
    const { outcomes, state } = playAll(lab(['tonka_in']), pieces);
    const o = outcomes[2];
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 13 }, { type: 'complete', captures: 3 }]);
    expect(state.finished).toBe(true);
    const casts = o.beats.flatMap((b) => (b.type === 'cast' ? [b.characters.length] : []));
    expect(casts).toEqual([1, 2, 3, 4, 5]);
    expect(o.beats[o.beats.length - 1]).toEqual({ type: 'ending' });
    expect(keys(o.beats).slice(-2)).toEqual(['line.dadThanks', 'line.finalBakery']);
  });

  it('the tonka bean put in the dough after the recipe is complete does not end the game in the kitchen', () => {
    const o = interact(at('kitchen', { inventory: ['tonka'], flags: flags('dough_mixed'), solved: [13] }), give('tonka', 'kitchen.robot'));
    expect(o.state.flags.tonka_in).toBe(true);
    expect(o.state.finished).toBe(false);
    expect(o.beats.some((b) => b.type === 'ending')).toBe(false);
  });

  it('without it, the recipe asks for the secret touch; the family gathers once Sam is back in the lab with it', () => {
    const done = playAll(lab([]), pieces);
    expect(done.outcomes[2].beats).toContainEqual(said('hero', 'line.recipeTonka'));
    expect(done.state.finished).toBe(false);
    expect(done.state.solved).toContain(13);
    const away = interact(done.state, go('laundry.toAttic')).state;
    expect(interact({ ...away, place: 'attic' }, go('attic.toLaundry')).state.finished).toBe(false);
    const back = interact({ ...away, flags: { ...away.flags, tonka_in: true } }, go('attic.toLaundry'));
    expect(back.state.finished).toBe(true);
    expect(back.beats[back.beats.length - 1]).toEqual({ type: 'ending' });
  });
});

describe('the timer order (AC-69)', () => {
  it('due timers fire one after another in deadline order within one tick', () => {
    const s = wary('hall', { chars: chars({ mom: 'changing' }), timers: { dad: null, dough: null, mom: 20_000, delivery: 5_000 } });
    const o = interact(s, tick(30_000));
    const order = keys(o.beats).filter((k) => k === 'cut13' || k === 'line.momBack');
    expect(order).toEqual(['cut13', 'line.momBack']);
  });

  it('timers ending at the same time fire in a fixed order: dough, Papa, Maman, delivery', () => {
    const s = wary('hall', { chars: chars({ mom: 'changing', dad: 'fuses' }), flags: flags('computer_read', 'dad_wary', 'dough_mixed'), timers: { dad: 1000, dough: 1000, mom: 1000, delivery: 1000 } });
    const o = interact(s, tick(1000));
    expect(keys(o.beats).filter((k) => ['line.doughIgnored', 'line.dadFusesDone', 'line.momBack', 'cut13'].includes(k))).toEqual([
      'line.doughIgnored',
      'line.dadFusesDone',
      'line.momBack',
      'cut13',
    ]);
  });
});

describe('Sam steps aside when an inhabitant arrives where Sam stands', () => {
  it.each([
    ['florent', 'music', 'sticks', 'music.drums', 'line.florentDrums'],
    ['theo', 'living', 'queen', 'living.chess', 'line.theoQueen'],
  ] as const)('%s', (who, place, item, target, key) => {
    const o = interact(at(place, { inventory: [item] }), give(item, target));
    const step = o.beats.findIndex((b) => b.type === 'step');
    const line = o.beats.findIndex((b) => b.type === 'say' && b.key === key);
    expect(step).toBeGreaterThanOrEqual(0);
    expect(step).toBeLessThan(line);
    const placed = characterPlacement(who, o.state)!;
    // The sprites (24 px wide) no longer overlap.
    expect(Math.abs(o.state.pos.x - placed.pos.x)).toBeGreaterThanOrEqual(24);
    expect(o.beats[step]).toEqual({ type: 'step', pos: o.state.pos, facing: o.state.facing });
  });
});

describe('the notebook entries of Act II (AC-29)', () => {
  it('N15 comes with the computer (E07); N16 at the end of CUT13, after both views', () => {
    const computer = interact(wary('office', { flags: flags(), notes: ['n01', 'n08'], chars: chars({ dad: 'outside' }) }), { kind: 'keypad', keypad: 'computer', code: '7867' });
    expect(computer.state.notes).toEqual(['n01', 'n08', 'n09', 'n10', 'n15']);
    const o = interact(wary('hall', { timers: { dad: null, dough: null, mom: null, delivery: 1000 } }), tick(1000));
    const lastView = o.beats.map((b) => b.type).lastIndexOf('view');
    const note = o.beats.findIndex((b) => b.type === 'note' && b.note === 'n16');
    expect(note).toBeGreaterThan(lastView);
  });
});

describe('the outside views of Act II cannot be skipped (AC-49)', () => {
  const wrapped = (beats: readonly Beat[], view: string) => {
    const at = beats.findIndex((b) => b.type === 'view' && b.view === view);
    expect(at).toBeGreaterThan(0);
    expect(beats[at - 1]).toEqual({ type: 'cinematic', on: true });
    expect(beats.slice(at)).toContainEqual({ type: 'cinematic', on: false });
  };

  it('Florent riding away and the power cut', () => {
    const fixed = at('garage', { flags: flags('bike_fixed') });
    wrapped(interact(fixed, go('garage.toCorridor')).beats, 'ride');
    wrapped(interact(wary('florent', { chars: chars({ florent: 'riding' }), inventory: ['hairdryer'] }), give('hairdryer', 'florent.strip')).beats, 'dark');
  });
});

describe('items taken from the wall or a shelf leave nothing to tap', () => {
  it.each([
    ['bathroom', 'bathroom.hairdryer', 'hairdryer'],
    ['utility', 'utility.sardines', 'sardines'],
    ['garage', 'garage.pole', 'pole'],
  ] as const)('%s', (place, target, item) => {
    const o = interact(at(place), take(target));
    expect(o.state.inventory).toEqual([item]);
    expect(findHotspot(o.state, target)).toBeUndefined();
  });
});

it('the flours leave the utility shelf once taken; Théo plays standing in front of the chessboard', () => {
  const o = interact(at('utility'), take('utility.flours'));
  expect(o.state.inventory).toEqual(['chestnut', 'riceflour']);
  expect(findHotspot(o.state, 'utility.flours')).toBeUndefined();
  const living = at('living', { chars: chars({ theo: 'chess' }) });
  const theo = characterPlacement('theo', living)!;
  const board = findHotspot(living, 'living.chess')!.rect;
  expect(theo.pos.x).toBeGreaterThan(board.x);
  expect(theo.pos.x).toBeLessThan(board.x + board.w);
});
