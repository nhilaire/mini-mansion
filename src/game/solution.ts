// The walkthrough from a new game to the ending (E15 is optional and not on it): used by the engine tests and to
// generate the Maestro walkthrough flow.
import { SOLUTION_MOVES } from './chess';
import { Input, ItemId, KeypadId } from './types';

const go = (exit: string): Input => ({ kind: 'exit', exit });
const take = (target: string): Input => ({ kind: 'verb', verb: 'take', target });
const use = (target: string): Input => ({ kind: 'verb', verb: 'use', target });
const look = (target: string): Input => ({ kind: 'verb', verb: 'look', target });
const give = (item: ItemId, target: string): Input => ({ kind: 'item', item, target });
const combine = (item: ItemId, other: ItemId): Input => ({ kind: 'item', item, target: `item:${other}` });
const code = (keypad: KeypadId, value: string): Input => ({ kind: 'keypad', keypad, code: value });

export const SOLUTION: readonly Input[] = [
  take('front.doormat'),
  give('key', 'front.door'), // E01
  go('hall.toCorridor'),
  go('corridor0.toGarage'),
  take('garage.pole'),
  take('garage.crate'),
  take('garage.bench'),
  take('garage.drawer'),
  combine('pole', 'extension'),
  go('garage.toCorridor'),
  go('corridor0.toHall'),
  go('hall.toFront'),
  go('front.toPool'),
  give('longpole', 'pool.ball'), // E02
  use('pool.switch'),
  give('pliers', 'pool.pump'),
  use('pool.pump'),
  take('pool.bottle'), // E14
  go('pool.toFront'),
  use('front.bell'), // E16
  go('front.toHall'),
  go('hall.toLiving'),
  take('living.bookshelf'),
  go('living.toMusic'),
  go('music.toDining'),
  take('dining.basket'),
  go('dining.toMusic'),
  give('sticks', 'music.drums'), // E03
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
  go('office.toCorridor'),
  go('corridor0.toUtility'),
  take('utility.shelf'),
  give('detergent', 'utility.machine'),
  go('utility.toCorridor'), // E17
  go('corridor0.toHall'),
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
  give('oldkey', 'attic.door'), // E12
  go('attic.toLaundry'),
  give('scrap', 'laundry.notebook'), // E13
];
