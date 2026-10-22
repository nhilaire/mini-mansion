// The walkthrough from a new game to the ending: used by the engine tests and to generate the Maestro walkthrough
// flow. E15 (cellar hatch) is optional and not on it; the office is freed by the dough (E19), whose single timer
// suits an automated run better than the three doorbell timers (E16, covered by the unit tests).
import { SOLUTION_MOVES } from './chess';
import { Input, ItemId, KeypadId } from './types';

const go = (exit: string): Input => ({ kind: 'exit', exit });
const take = (target: string): Input => ({ kind: 'verb', verb: 'take', target });
const use = (target: string): Input => ({ kind: 'verb', verb: 'use', target });
const look = (target: string): Input => ({ kind: 'verb', verb: 'look', target });
const give = (item: ItemId, target: string): Input => ({ kind: 'item', item, target });
const combine = (item: ItemId, other: ItemId): Input => ({ kind: 'item', item, target: `item:${other}` });
const wait = (): Input => ({ kind: 'wait' });
const code = (keypad: KeypadId, value: string): Input => ({ kind: 'keypad', keypad, code: value });

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
  take('kitchen.fridge'),
  give('ricemilk', 'kitchen.robot'),
  give('chestnut', 'kitchen.robot'),
  give('riceflour', 'kitchen.robot'), // E19
  go('kitchen.toMusic'),
  go('music.toLiving'),
  wait(), // CUT12: Papa comes to the kitchen for good
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
  take('florent.kit'),
  go('florent.toLanding'),
  go('landing.toHall'),
  go('hall.toLiving'),
  use('living.chess'),
  { kind: 'chess', moves: [...SOLUTION_MOVES] }, // E06
  go('living.toHall'),
  go('hall.toCorridor'),
  use('corridor0.officeDoor'),
  use('office.computer'),
  code('computer', '7867'), // E07
  take('office.shelf'),
  go('office.toCorridor'),
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
  go('parents.toLanding'),
  go('landing.toHall'),
  go('hall.toCorridor'),
  go('corridor0.toGarage'),
  go('garage.toAttic'),
  give('thinner', 'attic.stain'), // E11
  give('oldkey', 'attic.door'),
  use('attic.door'),
  code('lab', '2510'), // E12
  go('attic.toLaundry'),
  give('scrap', 'laundry.notebook'), // E13
];
