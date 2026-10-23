// The walkthrough from a new game to the ending: used by the engine tests and to generate the Maestro walkthrough
// flow. E18 (side gates) is taken on the way; the office is freed the first time by the dough (E19), whose single
// timer suits an automated run better than the three doorbell timers (E16, covered by the unit tests). Sam waits next
// to each window (the corridor for the office) so that the automated run fits the timed windows.
import { SOLUTION_MOVES } from './chess';
import { Input, ItemId, KeypadId, PadId } from './types';

const go = (exit: string): Input => ({ kind: 'exit', exit });
const take = (target: string): Input => ({ kind: 'verb', verb: 'take', target });
const use = (target: string): Input => ({ kind: 'verb', verb: 'use', target });
const look = (target: string): Input => ({ kind: 'verb', verb: 'look', target });
const give = (item: ItemId, target: string): Input => ({ kind: 'item', item, target });
const combine = (item: ItemId, other: ItemId): Input => ({ kind: 'item', item, target: `item:${other}` });
const wait = (): Input => ({ kind: 'wait' });
const code = (keypad: KeypadId, value: string): Input => ({ kind: 'keypad', keypad, code: value });
const pad = (id: PadId, value: string[]): Input => ({ kind: 'pad', pad: id, code: value });

export const SOLUTION: readonly Input[] = [
  take('front.doormat'),
  give('key', 'front.door'), // E01
  take('hall.shoes'),
  go('hall.toCorridor'),
  go('corridor0.toGarage'),
  take('garage.pole'),
  take('garage.bench'),
  use('garage.breaker'),
  go('garage.toCorridor'),
  go('corridor0.toUtility'),
  take('utility.shelf'),
  take('utility.flours'),
  take('utility.sardines'),
  give('detergent', 'utility.machine'),
  go('utility.toCorridor'), // E17
  go('corridor0.toHall'),
  go('hall.toFront'),
  give('gatekey', 'front.gateRight'), // E18
  go('front.toPool'),
  go('pool.toFootball'),
  take('football.bench'),
  combine('pole', 'extension'),
  go('football.toPool'),
  give('longpole', 'pool.ball'), // E02
  use('pool.switch'),
  go('pool.toFront'),
  go('front.toHall'),
  go('hall.toLiving'),
  take('living.bookshelf'),
  go('living.toMusic'),
  take('music.basket'),
  give('sticks', 'music.drums'), // E03
  go('music.toKitchen'),
  use('kitchen.fridge'),
  take('kitchen.fridge'),
  go('kitchen.toMusic'),
  go('music.toLiving'),
  go('living.toHall'),
  go('hall.stairs'),
  use('landing.julienDoor'),
  take('julien.trophy'),
  go('julien.toLanding'),
  go('landing.toHall'),
  go('hall.toLiving'),
  give('queen', 'living.chess'), // E04
  go('living.toHall'),
  go('hall.stairs'),
  use('landing.theoDoor'),
  give('booklet', 'theo.cube'), // E05
  go('theo.toLanding'), // CUT07
  use('landing.florentDoor'),
  take('florent.kit'), // the O-ring and the puncture patches
  go('florent.toLanding'),
  go('landing.toBathroom'),
  take('bathroom.hairdryer'),
  go('bathroom.toLanding'),
  go('landing.toHall'),
  go('hall.toLiving'),
  use('living.chess'),
  { kind: 'chess', moves: [...SOLUTION_MOVES] }, // E06
  go('living.toMusic'),
  go('music.toKitchen'),
  give('ricemilk', 'kitchen.robot'),
  give('chestnut', 'kitchen.robot'),
  give('riceflour', 'kitchen.robot'), // E19
  go('kitchen.toMusic'),
  go('music.toLiving'),
  go('living.toHall'),
  go('hall.toCorridor'),
  wait(), // CUT12: Papa comes to cook for 90 s
  use('corridor0.officeDoor'),
  use('office.computer'),
  code('computer', '7867'), // E07
  take('office.shelf'),
  go('office.toCorridor'),
  wait(), // Papa back at his desk: he notices the computer and becomes wary
  wait(), // CUT13: the parcel lands in the garden under the cat
  go('corridor0.toHall'),
  go('hall.toFront'),
  go('front.toPool'),
  give('pliers', 'pool.pump'),
  use('pool.pump'),
  take('pool.bottle'), // E14
  go('pool.toFront'),
  go('front.toHall'),
  go('hall.stairs'),
  use('landing.parentsDoor'),
  give('oring', 'parents.shower'),
  give('wrench', 'parents.shower'), // E08
  use('parents.shower'), // E09
  look('parents.painting'),
  use('parents.safe'),
  code('safe', '1987'), // E10
  combine('hairdryer', 'note'), // E20
  go('parents.toLanding'),
  go('landing.toHall'),
  go('hall.toFront'),
  go('front.toPool'),
  use('pool.tap'), // E22: Maman soaked, she changes for 90 s
  go('pool.toFootball'),
  go('football.toGarden'),
  give('sardines', 'garden.cat'), // E23
  take('garden.parcel'), // E24
  take('garden.basket'), // E25: Papa's drawer key
  go('garden.toFootball'),
  go('football.toPool'),
  go('pool.toFront'),
  go('front.toHall'),
  go('hall.toLiving'),
  go('living.toMusic'),
  go('music.toKitchen'),
  give('tonka', 'kitchen.robot'), // E30: the secret touch in Papa's dough
  go('kitchen.toMusic'),
  go('music.toLiving'),
  go('living.toHall'),
  go('hall.toCorridor'),
  go('corridor0.toGarage'),
  give('patches', 'garage.bike'),
  give('pump', 'garage.bike'), // E26
  go('garage.toCorridor'), // CUT15: Florent rides away
  go('corridor0.toHall'),
  go('hall.stairs'),
  use('landing.florentDoor'),
  give('hairdryer', 'florent.strip'), // E27: Papa goes down to the fuse box for 60 s
  go('florent.toLanding'),
  go('landing.toHall'),
  go('hall.toCorridor'),
  use('corridor0.officeDoor'),
  give('keyring', 'office.drawer'), // E28
  go('office.toCorridor'),
  wait(), // Papa back from the garage
  go('corridor0.toGarage'),
  go('garage.toCellar'),
  take('cellar.rack'),
  give('bar', 'cellar.hatch'), // E15
  use('cellar.bottles'),
  pad('bottles', ['1987', '1994', '2003', '2011']), // E21
  go('cellar.toGarage'),
  go('garage.toAttic'),
  give('thinner', 'attic.stain'), // E11
  give('oldkey', 'attic.door'),
  use('attic.door'),
  code('lab', '2510'), // E12
  use('attic.trunk'),
  pad('trunk', ['red', 'yellow', 'blue', 'green']), // E29
  go('attic.toLaundry'),
  give('scrap', 'laundry.notebook'),
  give('scrap2', 'laundry.notebook'),
  give('scrap3', 'laundry.notebook'), // E13: CUT11, the family gathers, the Ending
];
