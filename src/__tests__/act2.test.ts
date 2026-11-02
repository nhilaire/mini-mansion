// T-54..T-63: Act II rules - lures and wariness, the delivery, the hose, the cat and the parcel, Florent's bike, the
// power cut, invisible ink and bottles, the drawer and the trunk, the finale and the timer order (AC-59..AC-69).
import { interact, newGame, PADS, playAll, TIMER_MS } from '../game/rules';
import { Beat, CharacterStates, Flag, GameEvent, GameState, Input, ItemId, PlaceId } from '../game/types';
import { characterPlacement, findHotspot, occupant } from '../game/world';
import { line, noteText } from '../content/index';
import { guestSpots } from '../render/Scene';
import { fr as frStrings } from '../i18n/fr';

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
    expect(interact({ ...s.state, place: 'front', solved: [1] }, use('front.bell')).state.chars.dad).toBe('answering');
  });

  it('back from cooking after E07, he becomes wary as well', () => {
    const s = at('music', { flags: flags('computer_read', 'dough_mixed'), chars: chars({ dad: 'cooking' }), timers: { dad: 5000, dough: null, mom: null, delivery: null, machine: null } });
    const o = interact(s, tick(5000));
    expect(keys(o.beats)).toEqual(['line.dadEtuve', 'line.dadWary', 'line.dadKey']);
    expect(o.state.flags.dad_wary).toBe(true);
    expect(o.state.flags.dough_up).toBe(true);
  });

  it('a wary Papa ignores the doorbell, says so through his door, and the dough no longer frees his office', () => {
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
    expect(puzzles(last)).toEqual([19]);
    // The dough still brings him once (see below), but only to carry it up to his lab.
    expect(dough.state.timers.dough).toBe(dough.state.clock + TIMER_MS.dough);
  });

  it('a dough timer ending once Papa is wary: he grabs the bowl and carries it up at once, his office never free', () => {
    const s = wary('music', { flags: flags('computer_read', 'dad_wary', 'dough_mixed'), timers: { dad: null, dough: 1000, mom: null, delivery: null, machine: null } });
    const o = interact(s, tick(1000));
    expect(o.beats).toContainEqual({ type: 'view', view: 'kitchen' });
    expect(keys(o.beats)).toEqual(['line.dadDoughWary']);
    expect(o.state.chars.dad).toBe('at_desk');
    expect(o.state.timers.dad).toBeNull();
    expect(occupant('office', o.state.chars)).toBe('dad');
    expect(o.state.flags.dough_up).toBe(true);
    // Still in the kitchen then: caught.
    const caught = interact({ ...s, place: 'kitchen' }, tick(1000));
    expect(caught.state.place).toBe('cellar');
    expect(caught.state.flags.dough_up).toBe(true);
  });
});

describe('the delivery (AC-60)', () => {
  const pending = (place: PlaceId) => wary(place, { timers: { dad: null, dough: null, mom: null, delivery: TIMER_MS.delivery, machine: null } });

  it('60 s after Papa is wary, CUT13 plays wherever Charlie is: the parcel lands in the garden under the cat', () => {
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

  it('nobody catches Charlie in front of the house: the driver only delivers', () => {
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

  it('she comes back 90 s later and catches Charlie still in the garden', () => {
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
    // The shed now holds the big nail of Théo's electromagnet (T-87).
    expect(findHotspot(garden(), 'garden.shed')?.verbs).toEqual(['look', 'take']);
  });

  it('the sardines are in the fridge, next to the rice milk', () => {
    const open = interact(at('kitchen'), use('kitchen.fridge')).state;
    expect(interact(open, take('kitchen.sardines')).state.inventory).toEqual(['sardines']);
  });
});

describe('Florent\'s bike (AC-63)', () => {
  it('the Nerf kit holds the O-ring and the puncture patches', () => {
    const o = interact(at('florent', { chars: chars({ florent: 'drumming' }), solved: [31] }), take('florent.kit'));
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
  const room = (extra: Partial<GameState> = {}) => wary('florent', { chars: chars({ florent: 'riding' }), inventory: ['magnetPlug'], ...extra });

  it('only once Florent rides away: his console runs on the power strip', () => {
    for (const florent of ['in_room', 'drumming'] as const) {
      const o = interact(room({ chars: chars({ florent }) }), give('magnetPlug', 'florent.strip'));
      expect(o.beats).toContainEqual(said('hero', 'line.stripNotNow'));
      expect(o.state.chars.dad).toBe('at_desk');
    }
  });

  it('an unfinished electromagnet on the power strip says what is still missing, and changes nothing', () => {
    const cases = [
      ['wire', 'line.stripParts'],
      ['nail', 'line.stripParts'],
      ['coil', 'line.stripParts'],
      ['battery', 'line.stripParts'],
      ['magnet', 'line.stripNoPlug'],
      ['plug', 'line.stripPlugAlone'],
    ] as const;
    for (const [item, key] of cases) {
      const s = room({ inventory: [item] });
      const o = interact(s, give(item, 'florent.strip'));
      expect(o.beats).toContainEqual(said('hero', key));
      expect(o.state.inventory).toEqual([item]);
      expect(o.state.flags).toEqual(s.flags);
      expect(o.state.chars).toEqual(s.chars);
    }
  });

  it('the fuses blow (CUT18): Papa is at the garage fuse box for 60 s, the office is free, then he comes back', () => {
    const o = interact(room(), give('magnetPlug', 'florent.strip'));
    expect(o.beats).toContainEqual({ type: 'view', view: 'dark' });
    expect(o.beats).toContainEqual(said('dad', 'line.dadFuses'));
    expect(puzzles(o)).toEqual([27]);
    // The electromagnet stays plugged in, out of the inventory, and is drawn on the power strip.
    expect(o.state.inventory).toEqual([]);
    expect(o.state.flags.magnet_plugged).toBe(true);
    expect(interact(o.state, { kind: 'verb', verb: 'look', target: 'florent.strip' }).beats).toEqual([said('hero', 'florent.strip.lookPlugged')]);
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
    // Once plugged in, the power strip switched back on blows the fuses again.
    const first = interact(room(), give('magnetPlug', 'florent.strip')).state;
    expect(interact(first, use('florent.strip')).beats).toContainEqual(said('hero', 'line.fusesNobody'));
    const back = interact(first, tick(TIMER_MS.fuses)).state;
    const again = interact(back, use('florent.strip'));
    expect(again.beats).toContainEqual(said('dad', 'line.fusesAgain'));
    expect(again.events).toEqual([]);
    expect(again.state.chars.dad).toBe('fuses');
    const plugged = { ...back, flags: { ...back.flags, drawer_open: true as const, pliers_taken: true as const } };
    expect(interact(plugged, use('florent.strip')).beats).toEqual([said('hero', 'line.fusesNoNeed')]);
    // Before anything is plugged in, the power strip only says so.
    expect(interact(room(), use('florent.strip')).beats).toEqual([said('hero', 'florent.strip.use')]);
    const drawerOnly = room({ flags: flags('computer_read', 'dad_wary', 'drawer_open') });
    expect(interact(drawerOnly, give('magnetPlug', 'florent.strip')).state.chars.dad).toBe('fuses');
    const nothingLeft = room({ flags: flags('computer_read', 'dad_wary', 'drawer_open', 'pliers_taken') });
    const no = interact(nothingLeft, give('magnetPlug', 'florent.strip'));
    expect(no.beats).toEqual([said('hero', 'line.fusesNoNeed')]);
    expect(no.state.chars.dad).toBe('at_desk');
  });
});

describe('invisible ink and the cellar bottles (AC-65)', () => {
  it('the hair dryer on its hook warms Papa\'s note and reveals the invisible ink once (E20)', () => {
    const o = interact(at('bathroom', { inventory: ['note'] }), give('note', 'bathroom.hairdryer'));
    expect(puzzles(o)).toEqual([20]);
    expect(o.state.notes).toContain('n13');
    expect(o.state.inventory).toEqual(['note']);
    expect(interact(o.state, { kind: 'lookItem', item: 'note' }).beats).toEqual([said('hero', 'item.note.lookInk')]);
    const again = interact(o.state, give('note', 'bathroom.hairdryer'));
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
    // The trunk is open for good: the code is not asked again and the Fragment n° 3 is given only once.
    expect(interact(right.state, { kind: 'pad', pad: 'trunk', code: ['red', 'yellow', 'blue', 'green'] }).accepted).toBe(false);
    const again = interact(right.state, use('attic.trunk'));
    expect(again.beats).toEqual([said('hero', 'attic.trunk.empty')]);
    expect(again.state.inventory).toEqual(['scrap3']);
  });
});

describe('the recipe, the tonka bean and the end (AC-67, AC-68)', () => {
  const combine = (item: ItemId, other: ItemId): Input => ({ kind: 'item', item, target: `item:${other}` });
  const lab = (extra: Partial<GameState> = {}) => at('laundry', { inventory: ['recipe', 'tonka'], flags: flags('secret_open', 'dough_up'), captures: 3, ...extra });
  const casts = (beats: readonly Beat[]) => beats.flatMap((b) => (b.type === 'cast' ? [b.characters.length] : []));

  it.each([
    ['scrap', 'scrap2', 'scrap3'],
    ['scrap3', 'scrap', 'scrap2'],
    ['scrap2', 'scrap3', 'scrap'],
  ] as const)('%s and %s make the torn recipe, %s completes it and notes the lab code (N17) once', (a, b, c) => {
    const s = at('hall', { inventory: ['scrap', 'scrap2', 'scrap3'], notes: ['n01'] });
    const half = interact(s, combine(a, b));
    expect(half.beats).toContainEqual(said('hero', 'combine.recipeHalf'));
    expect([...half.state.inventory].sort()).toEqual(['recipeHalf', c].sort());
    expect(half.state.notes).not.toContain('n17');
    // The third fragment on the torn recipe, or the torn recipe on the third fragment.
    for (const last of [combine(c, 'recipeHalf'), combine('recipeHalf', c)]) {
      const whole = interact(half.state, last);
      expect(whole.state.inventory).toEqual(['recipe']);
      expect(whole.beats).toContainEqual(said('hero', 'line.recipeJoined'));
      expect(whole.state.notes.filter((n) => n === 'n17')).toEqual(['n17']);
    }
  });

  it('the lab code is on the back of the recipe, and the fragments each hold a bit of it', () => {
    expect(line(frStrings, 'item.recipe.look')).toMatch(/Labo\s*: 2510/);
    expect(line(frStrings, 'line.recipeJoined')).toMatch(/Labo\s*: 2510/);
    expect(noteText(frStrings, 'n10')).toMatch(/au dos de sa recette/);
    expect(noteText(frStrings, 'n10')).not.toMatch(/2510/);
    for (const scrap of ['scrap', 'scrap2', 'scrap3']) expect(line(frStrings, `item.${scrap}.look`)).toMatch(/Au dos/);
  });

  it('the proofing cabinet takes the tonka bean only once Papa has carried his dough up (E30); the food processor never takes it', () => {
    const empty = interact(lab({ flags: flags('secret_open') }), give('tonka', 'laundry.etuve'));
    expect(empty.beats).toEqual([said('hero', 'line.tonkaNoDough')]);
    expect(empty.state.inventory).toContain('tonka');
    const kitchen = interact(at('kitchen', { inventory: ['tonka'], flags: flags('dough_mixed') }), give('tonka', 'kitchen.robot'));
    expect(kitchen.beats).toEqual([said('hero', 'line.tonkaKitchen')]);
    expect(kitchen.state.inventory).toEqual(['tonka']);
    const o = interact(lab(), give('tonka', 'laundry.etuve'));
    expect(puzzles(o)).toEqual([30]);
    expect(o.state.flags.tonka_in).toBe(true);
    expect(o.state.inventory).toEqual(['recipe']);
    expect(o.state.finished).toBe(false);
  });

  it('the recipe back in the notebook (E13) with the tonka bean already in the dough: the family gathers in the lab, then the Ending', () => {
    const o = interact(lab({ inventory: ['recipe'], flags: flags('secret_open', 'dough_up', 'tonka_in'), solved: [30] }), give('recipe', 'laundry.notebook'));
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 13 }, { type: 'complete', captures: 3 }]);
    expect(o.state.finished).toBe(true);
    expect(casts(o.beats)).toEqual([1, 2, 3, 4, 5]);
    // In the lab, Charlie in the middle of the floor so that nobody hides anybody.
    expect(o.beats).toContainEqual({ type: 'room', place: 'laundry', pos: { x: 160, y: 124 }, facing: 'down' });
    expect(keys(o.beats)).toContain('line.final1');
    expect(o.beats[o.beats.length - 1]).toEqual({ type: 'ending' });
    expect(keys(o.beats).slice(-2)).toEqual(['line.dadThanks', 'line.finalBakery']);
  });

  it('the tonka bean last, after the recipe: the family gathers in the lab as well', () => {
    const o = interact(lab({ inventory: ['tonka'], solved: [13] }), give('tonka', 'laundry.etuve'));
    expect(o.state.flags.tonka_in).toBe(true);
    expect(o.state.finished).toBe(true);
    expect(o.beats).toContainEqual({ type: 'room', place: 'laundry', pos: { x: 160, y: 124 }, facing: 'down' });
    expect(keys(o.beats)).toEqual(expect.arrayContaining(['e30.tonka', 'line.final1', 'line.final8']));
    expect(casts(o.beats)).toEqual([1, 2, 3, 4, 5]);
    expect(o.beats[o.beats.length - 1]).toEqual({ type: 'ending' });
  });

  it('without the tonka bean, the recipe asks for the secret touch, and coming back to the lab does not end the game', () => {
    const done = interact(lab(), give('recipe', 'laundry.notebook'));
    expect(done.beats).toContainEqual(said('hero', 'line.recipeTonka'));
    expect(done.state.finished).toBe(false);
    expect(done.state.solved).toContain(13);
    const away = interact(done.state, go('laundry.toAttic')).state;
    expect(interact({ ...away, place: 'attic' }, go('attic.toLaundry')).state.finished).toBe(false);
  });

  it('the fragments no longer go on the notebook one by one', () => {
    const o = interact(lab({ inventory: ['scrap'] }), give('scrap', 'laundry.notebook'));
    expect(o.state.inventory).toEqual(['scrap']);
    expect(o.state.solved).not.toContain(13);
  });
});

describe('the timer order (AC-69)', () => {
  it('due timers fire one after another in deadline order within one tick', () => {
    const s = wary('hall', { chars: chars({ mom: 'changing' }), timers: { dad: null, dough: null, mom: 20_000, delivery: 5_000, machine: null } });
    const o = interact(s, tick(30_000));
    const order = keys(o.beats).filter((k) => k === 'cut13' || k === 'line.momBack');
    expect(order).toEqual(['cut13', 'line.momBack']);
  });

  it('timers ending at the same time fire in a fixed order: dough, Papa, Maman, delivery', () => {
    const s = wary('hall', { chars: chars({ mom: 'changing', dad: 'fuses' }), flags: flags('computer_read', 'dad_wary', 'dough_mixed'), timers: { dad: 1000, dough: 1000, mom: 1000, delivery: 1000, machine: null } });
    const o = interact(s, tick(1000));
    expect(keys(o.beats).filter((k) => ['line.dadDoughWary', 'line.dadFusesDone', 'line.momBack', 'cut13'].includes(k))).toEqual([
      'line.dadDoughWary',
      'line.dadFusesDone',
      'line.momBack',
      'cut13',
    ]);
  });
});

describe('Charlie steps aside when an inhabitant arrives where Charlie stands', () => {
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
    const o = interact(wary('hall', { timers: { dad: null, dough: null, mom: null, delivery: 1000, machine: null } }), tick(1000));
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
    wrapped(interact(wary('florent', { chars: chars({ florent: 'riding' }), inventory: ['magnetPlug'] }), give('magnetPlug', 'florent.strip')).beats, 'dark');
  });
});

describe('items taken from the wall or a shelf leave nothing to tap', () => {
  it.each([
    ['utility', 'utility.chestnut', 'chestnut'],
    ['utility', 'utility.riceflour', 'riceflour'],
    ['garage', 'garage.pole', 'pole'],
  ] as const)('%s', (place, target, item) => {
    const o = interact(at(place), take(target));
    expect(o.state.inventory).toEqual([item]);
    expect(findHotspot(o.state, target)).toBeUndefined();
  });
});

it('the flour cupboard stays once both flours are taken; Théo plays standing in front of the chessboard', () => {
  const o = playAll(at('utility'), [take('utility.chestnut'), take('utility.riceflour')]);
  expect(o.state.inventory).toEqual(['chestnut', 'riceflour']);
  expect(findHotspot(o.state, 'utility.flours')).toBeDefined();
  expect(findHotspot(o.state, 'utility.flours')?.verbs).toEqual(['look']);
  const living = at('living', { chars: chars({ theo: 'chess' }) });
  const theo = characterPlacement('theo', living)!;
  const board = findHotspot(living, 'living.chess')!.rect;
  expect(theo.pos.x).toBeGreaterThan(board.x);
  expect(theo.pos.x).toBeLessThan(board.x + board.w);
});

// T-76..T-80: the 2026-10-24 amendment (AC-70, AC-71 and the clue rewrites).
describe('the 2026-10-24 amendment', () => {
  const look = (target: string): Input => ({ kind: 'verb', verb: 'look', target });
  const fr = (key: string) => line(frStrings, key);

  it('the drained pool fills up again when the pump is used once more (a gag, nothing else changes)', () => {
    const drained = at('pool', { flags: flags('plug_fixed', 'cover_open', 'pool_drained') });
    const o = interact(drained, use('pool.pump'));
    expect(o.beats).toContainEqual(said('narrator', 'pool.fill'));
    expect(o.state.flags.pool_drained).toBeUndefined();
    expect(o.events).toEqual([]);
    expect(interact(o.state, use('pool.pump')).state.flags.pool_drained).toBe(true);
  });

  it('the trunk buttons are shuffled against the code', () => {
    expect(PADS.trunk.buttons).toHaveLength(6);
    expect([...PADS.trunk.buttons].sort()).toEqual(['blue', 'green', 'orange', 'purple', 'red', 'yellow']);
    expect(PADS.trunk.buttons.slice(0, 4)).not.toEqual(PADS.trunk.code);
    expect(PADS.trunk.buttons.filter((b) => PADS.trunk.code.includes(b))).not.toEqual(PADS.trunk.code);
  });

  it('the desk drawer only says it is locked, never which key opens it', () => {
    for (const s of [at('office'), wary('office')]) {
      for (const input of [look('office.drawer'), use('office.drawer')]) {
        const said = interact(s, input).beats.flatMap((b) => (b.type === 'say' ? [fr(b.key)] : []));
        expect(said.join(' ')).toMatch(/fermé à clé/i);
        expect(said.join(' ')).not.toMatch(/petite clé|trousseau/i);
      }
    }
  });

  it('lemon ink: the science magazine upstairs explains it, the note smells of lemon', () => {
    expect(keys(interact(at('wc1'), look('wc1.comics')).beats)).toEqual(['wc1.comics.look']);
    expect(fr('wc1.comics.look')).toMatch(/citron/);
    expect(fr('wc1.comics.look')).toMatch(/chauffe/);
    expect(fr('item.note.look')).toMatch(/sent fortement le citron/);
    // Found in the safe: Charlie says it at once.
    const safe = interact(at('parents', { notes: ['n01', 'n11'], flags: flags('safe_found'), chars: chars({ mom: 'gardening' }) }), { kind: 'keypad', keypad: 'safe', code: '1987' });
    expect(keys(safe.beats)).toContain('line.noteLemon');
    expect(fr('line.noteLemon')).toMatch(/sent fortement le citron/);
  });

  it('warming the note reads the revealed message aloud', () => {
    const o = interact(at('bathroom', { inventory: ['note'] }), give('note', 'bathroom.hairdryer'));
    expect(keys(o.beats)).toEqual(['e20.ink', 'e20.read']);
    expect(fr('e20.read')).toMatch(/de la plus vieille à la plus jeune/);
  });

  it('the bottles: the revealed ink says how to sort them, the bottles look like a mechanism', () => {
    expect(fr('item.note.lookInk')).toMatch(/de la plus vieille à la plus jeune/);
    expect(fr('cellar.bottles.look')).toMatch(/mécanisme/);
  });

  it('the colour code of the sketchbook is called strange', () => {
    expect(fr('e28.open')).toMatch(/vraiment étrange, ce code couleur/);
  });

  it('the spare fuse waits in the hall cabinet drawer, then only the breaker takes it', () => {
    expect(fr('hall.console.look')).toMatch(/fusible/);
    const taken = interact(at('hall'), take('hall.console')).state;
    expect(keys(interact(taken, look('hall.console')).beats)).toEqual(['hall.console.lookEmpty']);
    expect(interact({ ...taken, place: 'garage' }, give('fuse', 'garage.breaker')).state.flags.fuse_in).toBe(true);
    expect(interact({ ...taken, place: 'utility' }, give('fuse', 'utility.machine')).state.inventory).toEqual(['fuse']);
  });
});

describe('phone feedback of 2026-10-24 (evening)', () => {
  it('the salesman scene: Papa comes out next to Charlie in front of the house (no front door view), then goes back in', () => {
    const rung = interact(at('front', { solved: [1] }), use('front.bell')).state;
    const o = interact(rung, tick(TIMER_MS.answer));
    expect(o.beats.some((b) => b.type === 'view')).toBe(false);
    const captor = o.beats.findIndex((b) => b.type === 'captor' && b.character === 'dad');
    const sales = o.beats.findIndex((b) => b.type === 'say' && b.key === 'line.dadSalesman');
    const locks = o.beats.findIndex((b) => b.type === 'say' && b.key === 'line.dadLocks');
    const gone = o.beats.findIndex((b) => b.type === 'captor' && b.character === null);
    expect(captor).toBeGreaterThanOrEqual(0);
    expect(captor).toBeLessThan(sales);
    expect(sales).toBeLessThan(locks);
    expect(locks).toBeLessThan(gone);
    expect(o.state.place).toBe('front');
  });

  it('the bike leaves the garage with Florent', () => {
    const fixed = at('garage', { flags: flags('bike_fixed') });
    expect(findHotspot(fixed, 'garage.bike')).toBeDefined();
    const gone = interact(fixed, go('garage.toCorridor')).state;
    expect(gone.chars.florent).toBe('riding');
    expect(findHotspot({ ...gone, place: 'garage' }, 'garage.bike')).toBeUndefined();
  });

  it('nobody hides anybody in a scene with guests, wherever Charlie stands', () => {
    for (let x = 14; x <= 306; x += 4) {
      const spots = guestSpots({ x, y: 124 }, 5);
      expect(spots).toHaveLength(5);
      const xs = [x, ...spots.map((s) => s.x)].sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(26);
      for (const s of spots) expect(s.x >= 14 && s.x <= 306).toBe(true);
    }
  });
});

// T-87: the hair dryer stays on its hook; Théo's electromagnet makes the power cut (AC-64, AC-65, AC-72).
describe("Théo's electromagnet and the hair dryer on its hook", () => {
  const look = (target: string): Input => ({ kind: 'verb', verb: 'look', target });
  const fr = (key: string) => line(frStrings, key);

  it('the hair dryer cannot be taken; used alone it has nothing to dry', () => {
    const bath = at('bathroom');
    expect(findHotspot(bath, 'bathroom.hairdryer')?.verbs).toEqual(['look', 'use']);
    expect(interact(bath, use('bathroom.hairdryer')).beats).toEqual([said('hero', 'line.dryNothing')]);
    expect(fr('line.dryNothing')).toBe("Je n'ai rien à sécher.");
    expect(fr('bathroom.hairdryer.look')).toMatch(/branché/);
  });

  it('the four parts are found in the garage, the garden shed, the TV remote and the attic boxes', () => {
    const takes: [PlaceId, string, ItemId][] = [
      ['garage', 'garage.wire', 'wire'],
      ['garden', 'garden.shed', 'nail'],
      ['living', 'living.remote', 'battery'],
      ['attic', 'attic.boxes', 'plug'],
    ];
    for (const [place, target, item] of takes) {
      const o = interact(at(place), take(target));
      expect(o.state.inventory).toEqual([item]);
      expect(keys(interact(o.state, take(target)).beats).every((k) => k.endsWith('.empty'))).toBe(true);
    }
    expect(findHotspot(interact(at('garage'), take('garage.wire')).state, 'garage.wire')).toBeUndefined();
  });

  it('wire on nail, then the battery, then the old plug: the electromagnet to plug in (AC-72)', () => {
    const s = at('hall', { inventory: ['wire', 'nail', 'battery', 'plug'] });
    expect(interact(s, give('battery', 'item:nail')).state.inventory).toEqual(s.inventory);
    expect(interact(s, give('plug', 'item:wire')).state.inventory).toEqual(s.inventory);
    const coil = interact(s, give('nail', 'item:wire'));
    expect(coil.state.inventory).toEqual(['battery', 'plug', 'coil']);
    expect(keys(coil.beats)).toEqual(['combine.coil']);
    const magnet = interact(coil.state, give('coil', 'item:battery'));
    expect(magnet.state.inventory).toEqual(['plug', 'magnet']);
    expect(keys(magnet.beats)).toEqual(['line.magnetWorks']);
    const ready = interact(magnet.state, give('magnet', 'item:plug'));
    expect(ready.state.inventory).toEqual(['magnetPlug']);
    expect(ready.state.flags.magnet_ready).toBe(true);
    expect(keys(ready.beats)).toEqual(['combine.magnetPlug']);
  });

  it("the magazine in Julien's room explains the experiment and warns that plugging it in blows every fuse", () => {
    const room = at('julien', { chars: chars({ julien: 'football' }) });
    expect(keys(interact(room, look('julien.magazine')).beats)).toEqual(['julien.magazine.look']);
    expect(fr('julien.magazine.look')).toMatch(/fil de cuivre.*gros clou.*pile/);
    expect(fr('julien.magazine.look')).toMatch(/JAMAIS le brancher sur une prise.*plombs/);
  });

  it("Papa's post-it on Florent's power strip says one more device blows the fuses", () => {
    expect(fr('florent.strip.look')).toMatch(/post-it de Papa/);
    expect(fr('florent.strip.look')).toMatch(/ça fait sauter les plombs/);
  });
});
