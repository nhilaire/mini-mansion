// The house: 23 places (320x150 logical px above a 30 px inventory band), walkable floors, hotspots, exits (PRD
// "Places and exits") and where each inhabitant stands depending on its state.
import { Polygon } from './geometry';
import { CharacterId, CharacterStates, DoorRoom, Facing, Flag, GameState, GuardedRoom, ItemId, PlaceId, Point, Rect, Verb } from './types';

export const SCENE_W = 320;
export const SCENE_H = 180;
export const ROOM_H = 150;
export const MIN_TAP = 22; // logical px, = 44 dp at 2 dp per logical px

export const PLACES: readonly PlaceId[] = [
  'front',
  'football',
  'pool',
  'garden',
  'hall',
  'living',
  'music',
  'kitchen',
  'corridor0',
  'wc0',
  'office',
  'utility',
  'garage',
  'cellar',
  'attic',
  'laundry',
  'landing',
  'wc1',
  'julien',
  'bathroom',
  'theo',
  'florent',
  'parents',
];

export const OUTDOOR: readonly PlaceId[] = ['front', 'football', 'pool', 'garden'];

export const ITEMS: readonly ItemId[] = [
  'key',
  'gatekey',
  'pole',
  'extension',
  'longpole',
  'sticks',
  'queen',
  'booklet',
  'oring',
  'wrench',
  'pliers',
  'detergent',
  'thinner',
  'oldkey',
  'photo',
  'scrap',
  'note',
  'bar',
  'ricemilk',
  'chestnut',
  'riceflour',
];

export const CHARACTERS: readonly CharacterId[] = ['dad', 'mom', 'julien', 'florent', 'theo'];

export const FLAGS: readonly Flag[] = [
  'key_taken',
  'gatekey_taken',
  'gates_open',
  'door_unlocked',
  'pole_taken',
  'extension_taken',
  'ball_freed',
  'sticks_taken',
  'queen_taken',
  'queen_placed',
  'booklet_taken',
  'cube_solved',
  'theo_back',
  'chess_solved',
  'computer_read',
  'detergent_taken',
  'power_on',
  'machine_running',
  'machine_done',
  'oring_taken',
  'oring_fitted',
  'wrench_taken',
  'wrench_used',
  'shower_repaired',
  'mirror_code',
  'safe_found',
  'safe_open',
  'pliers_taken',
  'plug_fixed',
  'cover_open',
  'pool_drained',
  'thinner_taken',
  'door_revealed',
  'lab_code',
  'lab_lock',
  'secret_open',
  'bar_taken',
  'hatch_open',
  'bay_open',
  'milk_taken',
  'flours_taken',
  'milk_in',
  'chestnut_in',
  'riceflour_in',
  'dough_mixed',
  'wc_wet',
  'ending',
];

export const START_CHARS: CharacterStates = { dad: 'at_desk', mom: 'folding', julien: 'in_room', florent: 'in_room', theo: 'in_room' };

const FLOOR: Polygon = [p(6, 104), p(314, 104), p(318, 147), p(2, 147)];

export const FLOORS: Record<PlaceId, Polygon> = Object.fromEntries(PLACES.map((id) => [id, FLOOR])) as Record<PlaceId, Polygon>;

export const START_POS: Point = { x: 120, y: 124 };

export interface HotspotDef {
  id: string;
  place: PlaceId;
  rect: Rect;
  // Where the hero stands to act, and the direction faced.
  at: Point;
  face: Facing;
  verbs: readonly Verb[];
  visible?: (s: GameState) => boolean;
  character?: CharacterId;
  // Doors of rooms that can be guarded: "use" enters, "talk" is offered while the occupant is inside.
  door?: DoorRoom;
}

export interface ExitDef {
  id: string;
  place: PlaceId;
  rect: Rect;
  at: Point;
  face: Facing;
  to: PlaceId;
  spawn: Point;
  spawnFace: Facing;
  visible?: (s: GameState) => boolean;
}

const has = (s: GameState, f: Flag) => s.flags[f] === true;

// Common rects: side edges and the door of a small room (its only exit, on the left edge).
const LEFT = r(4, 38, 30, 66);
const RIGHT = r(286, 38, 30, 66);
const AT_LEFT = p(20, 110);
const AT_RIGHT = p(300, 110);
const IN_LEFT = p(36, 116);
const IN_RIGHT = p(284, 116);

// Landing doors, from the stairs (PRD order): WC, Julien, bathroom, Théo, Florent, parents.
const LANDING_X = [50, 94, 138, 182, 226, 270] as const;
const landingDoor = (i: number) => r(LANDING_X[i], 34, 30, 66);
const landingAt = (i: number) => p(LANDING_X[i] + 15, 108);

// Ground-floor corridor doors: WC, office, utility; then the stairs down to the garage.
const CORRIDOR_X = [60, 110, 160] as const;
const corridorDoor = (i: number) => r(CORRIDOR_X[i], 32, 30, 68);
const corridorAt = (i: number) => p(CORRIDOR_X[i] + 15, 108);

export const DOOR_SPAWN: Record<DoorRoom, { from: PlaceId; door: string; at: Point }> = {
  office: { from: 'corridor0', door: 'corridor0.officeDoor', at: corridorAt(1) },
  julien: { from: 'landing', door: 'landing.julienDoor', at: landingAt(1) },
  theo: { from: 'landing', door: 'landing.theoDoor', at: landingAt(3) },
  florent: { from: 'landing', door: 'landing.florentDoor', at: landingAt(4) },
  parents: { from: 'landing', door: 'landing.parentsDoor', at: landingAt(5) },
};

export const HOTSPOTS: readonly HotspotDef[] = [
  // Outside. The side gates are locked until the gate key opens them (E18).
  hs('front.door', 'front', r(146, 40, 28, 60), p(160, 108), ['look', 'use'], (s) => !has(s, 'door_unlocked')),
  hs('front.doormat', 'front', r(142, 104, 36, 22), p(160, 130), ['look', 'take']),
  hs('front.bell', 'front', r(180, 56, 22, 22), p(191, 108), ['look', 'use']),
  hs('front.hedge', 'front', r(40, 54, 70, 46), p(75, 108), ['look']),
  hs('front.mailbox', 'front', r(232, 60, 22, 40), p(243, 108), ['look', 'use']),
  hs('front.gateLeft', 'front', LEFT, AT_LEFT, ['look', 'use'], gatesClosed),
  hs('front.gateRight', 'front', RIGHT, AT_RIGHT, ['look', 'use'], gatesClosed),
  hs('football.goal', 'football', r(36, 40, 74, 60), p(73, 108), ['look', 'use']),
  hs('football.cones', 'football', r(112, 80, 26, 22), p(125, 110), ['look']),
  hs('football.ball', 'football', r(194, 90, 22, 22), p(205, 116), ['look'], (s) => s.chars.julien === 'football'),
  hs('football.bench', 'football', r(220, 70, 50, 30), p(245, 108), ['look', 'take']),
  hs('football.gate', 'football', RIGHT, AT_RIGHT, ['look', 'use'], gatesClosed),
  hs('pool.gate', 'pool', LEFT, AT_LEFT, ['look', 'use'], gatesClosed),
  hs('pool.bay', 'pool', r(40, 30, 46, 70), p(63, 108), ['look', 'use'], (s) => !has(s, 'bay_open')),
  hs('pool.cover', 'pool', r(140, 64, 100, 36), p(190, 108), ['look']),
  hs('pool.ball', 'pool', r(196, 66, 22, 22), p(207, 108), ['look'], (s) => !has(s, 'ball_freed')),
  hs('pool.bottle', 'pool', r(222, 78, 22, 22), p(233, 108), ['look', 'take'], (s) => has(s, 'cover_open') && !has(s, 'thinner_taken')),
  hs('pool.switch', 'pool', r(250, 60, 22, 24), p(261, 108), ['look', 'use']),
  hs('pool.pump', 'pool', r(282, 64, 30, 36), p(297, 108), ['look', 'use']),
  hs('garden.flowers', 'garden', r(40, 70, 80, 30), p(80, 108), ['look', 'use']),
  hs('garden.gnome', 'garden', r(126, 78, 22, 22), p(137, 108), ['look']),
  hs('garden.hose', 'garden', r(124, 40, 30, 26), p(139, 108), ['look', 'use']),
  hs('garden.swing', 'garden', r(170, 30, 50, 70), p(195, 108), ['look', 'use']),
  hs('garden.shed', 'garden', r(236, 30, 40, 70), p(256, 108), ['look']),
  // Ground floor.
  hs('hall.umbrella', 'hall', r(36, 76, 22, 24), p(47, 108), ['look']),
  hs('hall.coats', 'hall', r(60, 40, 30, 60), p(75, 108), ['look']),
  hs('hall.console', 'hall', r(96, 52, 40, 26), p(116, 108), ['look']),
  hs('hall.shoes', 'hall', r(100, 80, 30, 22), p(115, 110), ['look', 'take']),
  hs('hall.mirror', 'hall', r(186, 36, 24, 32), p(198, 108), ['look', 'use']),
  hs('living.bookshelf', 'living', r(50, 26, 40, 74), p(70, 108), ['look', 'take']),
  hs('living.sofa', 'living', r(96, 70, 30, 30), p(111, 108), ['look', 'use']),
  hs('living.bay', 'living', r(130, 26, 50, 74), p(155, 108), ['look', 'use'], (s) => !has(s, 'bay_open')),
  hs('living.lamp', 'living', r(186, 30, 24, 30), p(198, 108), ['look']),
  hs('living.chess', 'living', r(214, 78, 36, 22), p(232, 110), ['look', 'use']),
  hs('living.tv', 'living', r(254, 44, 28, 30), p(268, 108), ['look', 'use']),
  hs('music.piano', 'music', r(40, 46, 50, 54), p(65, 108), ['look', 'use']),
  hs('music.guitar', 'music', r(94, 40, 22, 50), p(105, 108), ['look', 'use']),
  hs('music.drums', 'music', r(120, 60, 46, 40), p(143, 112), ['look', 'use']),
  hs('music.xylo', 'music', r(170, 78, 30, 22), p(185, 110), ['look']),
  hs('music.table', 'music', r(204, 76, 76, 24), p(222, 110), ['look']),
  hs('music.basket', 'music', r(228, 52, 26, 22), p(241, 108), ['look', 'take']),
  hs('music.sideboard', 'music', r(256, 28, 28, 40), p(270, 108), ['look']),
  hs('kitchen.oven', 'kitchen', r(40, 50, 40, 50), p(60, 108), ['look', 'use']),
  hs('kitchen.fridge', 'kitchen', r(90, 24, 30, 76), p(105, 108), ['look', 'take']),
  hs('kitchen.sink', 'kitchen', r(126, 56, 40, 26), p(146, 108), ['look']),
  hs('kitchen.robot', 'kitchen', r(176, 58, 24, 26), p(188, 108), ['look', 'use']),
  hs('kitchen.bowl', 'kitchen', r(206, 72, 26, 22), p(219, 110), ['look']),
  door('corridor0.officeDoor', 'corridor0', corridorDoor(1), corridorAt(1), 'office'),
  hs('corridor0.photos', 'corridor0', r(196, 40, 22, 24), p(207, 108), ['look']),
  hs('corridor0.plant', 'corridor0', r(218, 72, 22, 28), p(229, 110), ['look']),
  hs('wc0.brush', 'wc0', r(110, 78, 22, 22), p(121, 110), ['look']),
  hs('wc0.toilet', 'wc0', r(140, 60, 30, 40), p(155, 110), ['look', 'use']),
  hs('wc0.paper', 'wc0', r(176, 64, 22, 24), p(187, 110), ['look', 'use']),
  hs('wc0.magazine', 'wc0', r(206, 74, 24, 24), p(218, 110), ['look']),
  hs('wc0.sign', 'wc0', r(240, 30, 30, 24), p(255, 108), ['look']),
  hs('office.window', 'office', r(50, 24, 40, 40), p(70, 108), ['look']),
  hs('office.lamp', 'office', r(110, 40, 24, 30), p(122, 108), ['look', 'use']),
  hs('office.computer', 'office', r(150, 62, 40, 30), p(170, 110), ['look', 'use']),
  hs('office.chair', 'office', r(196, 70, 26, 30), p(209, 110), ['look', 'use']),
  hs('office.shelf', 'office', r(230, 30, 50, 70), p(255, 108), ['look', 'take']),
  hs('utility.basket', 'utility', r(50, 78, 36, 22), p(68, 110), ['look']),
  hs('utility.machine', 'utility', r(140, 58, 40, 42), p(160, 110), ['look', 'use']),
  hs('utility.shelf', 'utility', r(220, 30, 50, 40), p(245, 108), ['look', 'take']),
  hs('utility.flours', 'utility', r(220, 72, 50, 28), p(245, 110), ['look', 'take']),
  hs('utility.broom', 'utility', r(274, 40, 22, 60), p(285, 108), ['look']),
  hs('garage.pole', 'garage', r(60, 24, 22, 76), p(71, 108), ['look', 'take']),
  hs('garage.crate', 'garage', r(90, 70, 40, 30), p(110, 108), ['look']),
  hs('garage.bike', 'garage', r(136, 60, 38, 40), p(155, 108), ['look', 'use']),
  hs('garage.paint', 'garage', r(186, 24, 40, 30), p(206, 108), ['look']),
  hs('garage.bench', 'garage', r(180, 62, 58, 38), p(209, 108), ['look', 'take']),
  hs('garage.breaker', 'garage', r(240, 30, 24, 30), p(252, 108), ['look', 'use']),
  hs('garage.drawer', 'garage', r(242, 70, 24, 24), p(254, 108), ['look']),
  hs('cellar.rack', 'cellar', r(30, 40, 60, 60), p(60, 108), ['look', 'take']),
  hs('cellar.barrel', 'cellar', r(96, 70, 30, 30), p(111, 108), ['look']),
  hs('cellar.hatch', 'cellar', r(130, 10, 40, 40), p(150, 108), ['look', 'use'], (s) => !has(s, 'hatch_open')),
  hs('cellar.bottles', 'cellar', r(190, 50, 40, 50), p(210, 108), ['look']),
  hs('cellar.cobweb', 'cellar', r(250, 20, 30, 24), p(265, 108), ['look']),
  // The attic is cluttered with junk.
  hs('attic.horse', 'attic', r(8, 70, 28, 30), p(22, 110), ['look', 'use']),
  hs('attic.boxes', 'attic', r(40, 60, 60, 40), p(70, 108), ['look']),
  hs('attic.chairs', 'attic', r(104, 56, 30, 44), p(119, 108), ['look']),
  hs('attic.suitcase', 'attic', r(136, 80, 40, 22), p(156, 110), ['look']),
  hs('attic.window', 'attic', r(150, 20, 30, 30), p(165, 108), ['look']),
  hs('attic.lamp', 'attic', r(186, 30, 24, 36), p(198, 108), ['look', 'use']),
  hs('attic.trunk', 'attic', r(190, 74, 40, 26), p(210, 110), ['look', 'use']),
  hs('attic.stain', 'attic', r(240, 30, 40, 70), p(260, 108), ['look', 'use'], (s) => !has(s, 'door_revealed')),
  hs('attic.door', 'attic', r(240, 30, 40, 70), p(260, 108), ['look', 'use'], (s) => has(s, 'door_revealed') && !has(s, 'secret_open')),
  hs('attic.dummy', 'attic', r(284, 40, 30, 60), p(299, 110), ['look']),
  hs('laundry.machine', 'laundry', r(50, 50, 40, 50), p(70, 108), ['look']),
  hs('laundry.mixer', 'laundry', r(100, 64, 30, 30), p(115, 110), ['look', 'use']),
  hs('laundry.notebook', 'laundry', r(150, 66, 30, 22), p(165, 110), ['look', 'use']),
  hs('laundry.cake', 'laundry', r(200, 62, 30, 30), p(215, 110), ['look']),
  hs('laundry.form', 'laundry', r(250, 40, 30, 30), p(265, 108), ['look']),
  // Upstairs.
  hs('landing.lamp', 'landing', r(110, 6, 24, 24), p(125, 108), ['look', 'use']),
  hs('landing.picture', 'landing', r(200, 6, 30, 24), p(215, 108), ['look']),
  door('landing.julienDoor', 'landing', landingDoor(1), landingAt(1), 'julien'),
  door('landing.theoDoor', 'landing', landingDoor(3), landingAt(3), 'theo'),
  door('landing.florentDoor', 'landing', landingDoor(4), landingAt(4), 'florent'),
  door('landing.parentsDoor', 'landing', landingDoor(5), landingAt(5), 'parents'),
  hs('wc1.towel', 'wc1', r(60, 50, 26, 40), p(73, 108), ['look']),
  hs('wc1.freshener', 'wc1', r(110, 60, 22, 30), p(121, 108), ['look', 'use']),
  hs('wc1.toilet', 'wc1', r(140, 60, 30, 40), p(155, 110), ['look', 'use']),
  hs('wc1.comics', 'wc1', r(190, 70, 24, 24), p(202, 110), ['look']),
  hs('wc1.plant', 'wc1', r(240, 50, 24, 50), p(252, 108), ['look']),
  hs('julien.poster', 'julien', r(70, 24, 40, 40), p(90, 108), ['look']),
  hs('julien.radio', 'julien', r(110, 74, 26, 22), p(123, 110), ['look', 'use']),
  hs('julien.trophy', 'julien', r(150, 44, 26, 40), p(163, 108), ['look', 'take']),
  hs('julien.medals', 'julien', r(200, 30, 50, 30), p(225, 108), ['look']),
  hs('julien.bed', 'julien', r(240, 70, 70, 30), p(270, 110), ['look']),
  hs('bathroom.sink', 'bathroom', r(50, 56, 40, 44), p(70, 108), ['look', 'use']),
  hs('bathroom.cabinet', 'bathroom', r(96, 26, 30, 30), p(111, 108), ['look']),
  hs('bathroom.scale', 'bathroom', r(100, 78, 26, 22), p(113, 110), ['look', 'use']),
  hs('bathroom.bath', 'bathroom', r(140, 64, 90, 36), p(185, 110), ['look']),
  hs('bathroom.duck', 'bathroom', r(240, 72, 22, 22), p(251, 110), ['look', 'use']),
  hs('theo.poster', 'theo', r(60, 24, 40, 40), p(80, 108), ['look']),
  hs('theo.lamp', 'theo', r(110, 40, 24, 30), p(122, 108), ['look', 'use']),
  hs('theo.cube', 'theo', r(160, 70, 24, 22), p(172, 110), ['look', 'use']),
  hs('theo.desk', 'theo', r(196, 66, 50, 34), p(221, 110), ['look']),
  hs('theo.cubes', 'theo', r(220, 30, 60, 30), p(250, 108), ['look']),
  hs('florent.nerf', 'florent', r(60, 30, 50, 40), p(85, 108), ['look', 'use']),
  hs('florent.bed', 'florent', r(110, 74, 50, 26), p(135, 110), ['look']),
  hs('florent.poster', 'florent', r(124, 20, 30, 30), p(139, 108), ['look']),
  hs('florent.kit', 'florent', r(170, 70, 30, 24), p(185, 110), ['look', 'take']),
  hs('florent.console', 'florent', r(230, 50, 50, 40), p(255, 108), ['look', 'use']),
  hs('parents.bed', 'parents', r(40, 64, 80, 36), p(80, 110), ['look']),
  hs('parents.painting', 'parents', r(140, 26, 36, 30), p(158, 108), ['look'], (s) => !has(s, 'safe_found')),
  hs('parents.safe', 'parents', r(140, 26, 36, 30), p(158, 108), ['look', 'use'], (s) => has(s, 'safe_found')),
  hs('parents.wardrobe', 'parents', r(184, 26, 30, 70), p(199, 108), ['look']),
  hs('parents.mirror', 'parents', r(222, 24, 36, 30), p(240, 108), ['look']),
  hs('parents.sink', 'parents', r(220, 56, 40, 44), p(240, 110), ['look', 'use']),
  hs('parents.shower', 'parents', r(270, 24, 44, 76), p(290, 110), ['look', 'use']),
];

export const EXITS: readonly ExitDef[] = [
  ex('front.toHall', 'front', r(146, 40, 28, 60), p(160, 108), 'hall', p(160, 114), 'down', (s) => has(s, 'door_unlocked')),
  ex('front.toFootball', 'front', LEFT, AT_LEFT, 'football', IN_RIGHT, 'left', gatesOpen),
  ex('front.toPool', 'front', RIGHT, AT_RIGHT, 'pool', IN_LEFT, 'right', gatesOpen),
  ex('football.toFront', 'football', RIGHT, AT_RIGHT, 'front', IN_LEFT, 'right', gatesOpen),
  ex('football.toPool', 'football', r(146, 30, 28, 70), p(160, 108), 'pool', p(111, 114), 'down'),
  ex('football.toGarden', 'football', LEFT, AT_LEFT, 'garden', IN_RIGHT, 'left'),
  ex('pool.toFront', 'pool', LEFT, AT_LEFT, 'front', IN_RIGHT, 'left', gatesOpen),
  ex('pool.toFootball', 'pool', r(98, 30, 26, 70), p(111, 108), 'football', p(160, 114), 'down'),
  ex('pool.toLiving', 'pool', r(40, 30, 46, 70), p(63, 108), 'living', p(155, 114), 'down', (s) => has(s, 'bay_open')),
  ex('garden.toFootball', 'garden', RIGHT, AT_RIGHT, 'football', IN_LEFT, 'right'),
  ex('hall.toFront', 'hall', r(146, 30, 28, 70), p(160, 108), 'front', p(160, 114), 'down'),
  ex('hall.toLiving', 'hall', LEFT, AT_LEFT, 'living', IN_RIGHT, 'left'),
  ex('hall.toCorridor', 'hall', RIGHT, AT_RIGHT, 'corridor0', IN_LEFT, 'right'),
  ex('hall.stairs', 'hall', r(220, 24, 50, 76), p(245, 108), 'landing', IN_LEFT, 'right'),
  ex('living.toHall', 'living', RIGHT, AT_RIGHT, 'hall', IN_LEFT, 'right'),
  ex('living.toMusic', 'living', LEFT, AT_LEFT, 'music', IN_RIGHT, 'left'),
  ex('living.toPool', 'living', r(130, 26, 50, 74), p(155, 108), 'pool', p(63, 114), 'down', (s) => has(s, 'bay_open')),
  ex('music.toLiving', 'music', RIGHT, AT_RIGHT, 'living', IN_LEFT, 'right'),
  ex('music.toKitchen', 'music', LEFT, AT_LEFT, 'kitchen', IN_RIGHT, 'left'),
  ex('kitchen.toMusic', 'kitchen', RIGHT, AT_RIGHT, 'music', IN_LEFT, 'right'),
  ex('corridor0.toHall', 'corridor0', LEFT, AT_LEFT, 'hall', IN_RIGHT, 'left'),
  ex('corridor0.toWc', 'corridor0', corridorDoor(0), corridorAt(0), 'wc0', IN_LEFT, 'right'),
  ex('corridor0.toUtility', 'corridor0', corridorDoor(2), corridorAt(2), 'utility', IN_LEFT, 'right'),
  ex('corridor0.toGarage', 'corridor0', r(246, 30, 40, 70), p(266, 108), 'garage', p(280, 114), 'left'),
  ex('wc0.toCorridor', 'wc0', LEFT, AT_LEFT, 'corridor0', down(corridorAt(0)), 'down'),
  ex('office.toCorridor', 'office', LEFT, AT_LEFT, 'corridor0', down(corridorAt(1)), 'down'),
  ex('utility.toCorridor', 'utility', LEFT, AT_LEFT, 'corridor0', down(corridorAt(2)), 'down'),
  ex('garage.toCorridor', 'garage', r(274, 24, 40, 76), p(294, 108), 'corridor0', p(266, 114), 'down'),
  ex('garage.toAttic', 'garage', r(20, 10, 30, 90), p(35, 108), 'attic', p(160, 114), 'up'),
  ex('garage.toCellar', 'garage', r(120, 118, 44, 24), p(142, 114), 'cellar', p(150, 114), 'down'),
  // The hatch is stuck from below until the iron bar unblocks it (E15).
  ex('cellar.toGarage', 'cellar', r(130, 10, 40, 40), p(150, 108), 'garage', p(142, 112), 'down', (s) => has(s, 'hatch_open')),
  ex('attic.toGarage', 'attic', r(140, 124, 40, 22), p(160, 118), 'garage', p(35, 114), 'down'),
  ex('attic.toLaundry', 'attic', r(240, 30, 40, 70), p(260, 108), 'laundry', IN_LEFT, 'right', (s) => has(s, 'secret_open')),
  ex('laundry.toAttic', 'laundry', LEFT, AT_LEFT, 'attic', p(260, 114), 'down'),
  ex('landing.toHall', 'landing', r(4, 30, 34, 70), p(21, 108), 'hall', p(245, 114), 'down'),
  ex('landing.toWc', 'landing', landingDoor(0), landingAt(0), 'wc1', IN_LEFT, 'right'),
  ex('landing.toBathroom', 'landing', landingDoor(2), landingAt(2), 'bathroom', IN_LEFT, 'right'),
  ex('wc1.toLanding', 'wc1', LEFT, AT_LEFT, 'landing', down(landingAt(0)), 'down'),
  ex('julien.toLanding', 'julien', LEFT, AT_LEFT, 'landing', down(landingAt(1)), 'down'),
  ex('bathroom.toLanding', 'bathroom', LEFT, AT_LEFT, 'landing', down(landingAt(2)), 'down'),
  ex('theo.toLanding', 'theo', LEFT, AT_LEFT, 'landing', down(landingAt(3)), 'down'),
  ex('florent.toLanding', 'florent', LEFT, AT_LEFT, 'landing', down(landingAt(4)), 'down'),
  ex('parents.toLanding', 'parents', LEFT, AT_LEFT, 'landing', down(landingAt(5)), 'down'),
];

// Where the hero lands after a capture.
export const CELLAR_SPAWN: Point = { x: 150, y: 120 };

// The occupant guarding a place in this state, or null when the place is free.
export function occupant(room: GuardedRoom, chars: CharacterStates): CharacterId | null {
  switch (room) {
    case 'office':
      return chars.dad === 'at_desk' || chars.dad === 'answering' ? 'dad' : null;
    case 'front':
      return chars.dad === 'outside' ? 'dad' : null;
    case 'kitchen':
      return chars.dad === 'cooking' ? 'dad' : null;
    case 'garden':
      return chars.mom === 'gardening' ? 'mom' : null;
    case 'parents':
      return chars.mom === 'folding' ? 'mom' : null;
    case 'julien':
      return chars.julien === 'in_room' ? 'julien' : null;
    case 'florent':
      return chars.florent === 'in_room' ? 'florent' : null;
    case 'theo':
      return chars.theo === 'in_room' ? 'theo' : null;
  }
}

export const GUARDED: readonly GuardedRoom[] = ['office', 'front', 'kitchen', 'parents', 'garden', 'julien', 'florent', 'theo'];

export function isGuardedRoom(place: PlaceId): place is GuardedRoom {
  return (GUARDED as readonly PlaceId[]).includes(place);
}

export interface CharacterPlacement {
  id: CharacterId;
  place: PlaceId;
  // Feet position (bottom centre) of the sprite.
  pos: Point;
  rect: Rect;
  at: Point;
  face: Facing;
  // Drawn in their activity pose (drumming, playing chess, cooking...).
  busy: boolean;
}

function person(id: CharacterId, place: PlaceId, x: number, y: number, busy: boolean, side: 'left' | 'right' = 'left'): CharacterPlacement {
  const dx = side === 'left' ? -26 : 26;
  return { id, place, pos: p(x, y), rect: r(x - 12, y - 48, 24, 48), at: p(x + dx, y + 2), face: side === 'left' ? 'right' : 'left', busy };
}

export function characterPlacement(id: CharacterId, s: GameState): CharacterPlacement | null {
  if (s.flags.ending) return null;
  const st = s.chars;
  switch (id) {
    case 'dad':
      if (st.dad === 'at_desk' || st.dad === 'answering') return person('dad', 'office', 210, 112, true);
      if (st.dad === 'outside') return person('dad', 'front', 210, 116, false);
      return st.dad === 'cooking' ? person('dad', 'kitchen', 236, 112, true) : null;
    case 'mom':
      return st.mom === 'folding' ? person('mom', 'parents', 130, 112, true) : person('mom', 'garden', 130, 114, true, 'right');
    case 'julien':
      return st.julien === 'in_room' ? person('julien', 'julien', 120, 112, false, 'right') : person('julien', 'football', 170, 114, true);
    case 'florent':
      return st.florent === 'in_room' ? person('florent', 'florent', 130, 112, false, 'right') : person('florent', 'music', 143, 112, true);
    case 'theo':
      return st.theo === 'in_room' ? person('theo', 'theo', 130, 112, false, 'right') : person('theo', 'living', 200, 112, true);
  }
}

export function charactersIn(s: GameState): CharacterPlacement[] {
  return CHARACTERS.map((c) => characterPlacement(c, s)).filter((c): c is CharacterPlacement => c !== null && c.place === s.place);
}

// Every tappable thing of the current place: static hotspots (doors get "talk" while occupied), then characters.
export function hotspotsIn(s: GameState): HotspotDef[] {
  const statics = HOTSPOTS.filter((h) => h.place === s.place && (!h.visible || h.visible(s))).map((h) =>
    h.door && occupant(h.door, s.chars) ? { ...h, verbs: [...h.verbs, 'talk' as Verb] } : h,
  );
  // Papa and Maman catch the hero instead of talking: only the boys can be talked to.
  const people = charactersIn(s).map<HotspotDef>((c) => ({
    id: c.id,
    place: c.place,
    rect: c.rect,
    at: c.at,
    face: c.face,
    verbs: c.id === 'dad' || c.id === 'mom' ? ['look'] : ['look', 'talk'],
    character: c.id,
  }));
  return [...statics, ...people];
}

export function exitsIn(s: GameState): ExitDef[] {
  return EXITS.filter((e) => e.place === s.place && (!e.visible || e.visible(s)));
}

export function findHotspot(s: GameState, id: string): HotspotDef | undefined {
  return hotspotsIn(s).find((h) => h.id === id);
}

export function findExit(s: GameState, id: string): ExitDef | undefined {
  return exitsIn(s).find((e) => e.id === id);
}

// Screen mapping: the 320x180 scene is scaled to fit the screen and centred (letterbox).
export interface SceneTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function sceneTransform(screenW: number, screenH: number): SceneTransform {
  const scale = Math.min(screenW / SCENE_W, screenH / SCENE_H);
  return { scale, offsetX: (screenW - SCENE_W * scale) / 2, offsetY: (screenH - SCENE_H * scale) / 2 };
}

export function toScreenRect(t: SceneTransform, rect: Rect): Rect {
  return { x: t.offsetX + rect.x * t.scale, y: t.offsetY + rect.y * t.scale, w: rect.w * t.scale, h: rect.h * t.scale };
}

export function toLogical(t: SceneTransform, x: number, y: number): Point {
  return { x: (x - t.offsetX) / t.scale, y: (y - t.offsetY) / t.scale };
}

// Inventory band: slot i of the 30 px band below the room; the notebook and menu buttons take the right end.
export const SLOT_SIZE = 24;
export const SLOT_GAP = 4;
export const SLOTS = 9;
export function slotRect(i: number): Rect {
  return r(6 + i * (SLOT_SIZE + SLOT_GAP), ROOM_H + 3, SLOT_SIZE, SLOT_SIZE);
}
export const NOTEBOOK_BUTTON: Rect = r(264, ROOM_H + 3, 24, 24);
export const MENU_BUTTON: Rect = r(292, ROOM_H + 3, 24, 24);

// The items shown on an inventory page. When more items are held than slots fit, the last slot turns the page.
export function inventoryPage(inventory: readonly ItemId[], page: number): { items: ItemId[]; pages: number; page: number } {
  if (inventory.length <= SLOTS) return { items: [...inventory], pages: 1, page: 0 };
  const per = SLOTS - 1;
  const pages = Math.ceil(inventory.length / per);
  const current = ((page % pages) + pages) % pages;
  return { items: inventory.slice(current * per, current * per + per), pages, page: current };
}

function p(x: number, y: number): Point {
  return { x, y };
}

function r(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

function down(at: Point): Point {
  return p(at.x, at.y + 6);
}

function gatesClosed(s: GameState): boolean {
  return !has(s, 'gates_open');
}

function gatesOpen(s: GameState): boolean {
  return has(s, 'gates_open');
}

function hs(id: string, place: PlaceId, rect: Rect, at: Point, verbs: Verb[], visible?: (s: GameState) => boolean): HotspotDef {
  return { id, place, rect, at, face: 'up', verbs, visible };
}

function door(id: string, place: PlaceId, rect: Rect, at: Point, room: DoorRoom): HotspotDef {
  return { id, place, rect, at, face: 'up', verbs: ['look', 'use'], door: room };
}

function ex(id: string, place: PlaceId, rect: Rect, at: Point, to: PlaceId, spawn: Point, spawnFace: Facing, visible?: (s: GameState) => boolean): ExitDef {
  return { id, place, rect, at, face: 'up', to, spawn, spawnFace, visible };
}
