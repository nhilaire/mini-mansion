// Core types of the adventure engine. Pure data: no React, no clock, no player text (line keys only).

export type PlaceId =
  | 'front'
  | 'football'
  | 'pool'
  | 'garden'
  | 'hall'
  | 'living'
  | 'music'
  | 'kitchen'
  | 'corridor0'
  | 'wc0'
  | 'office'
  | 'utility'
  | 'garage'
  | 'cellar'
  | 'attic'
  | 'laundry'
  | 'landing'
  | 'wc1'
  | 'julien'
  | 'bathroom'
  | 'theo'
  | 'florent'
  | 'parents';

export type ItemId =
  | 'key'
  | 'gatekey'
  | 'pole'
  | 'extension'
  | 'longpole'
  | 'sticks'
  | 'queen'
  | 'booklet'
  | 'oring'
  | 'wrench'
  | 'pliers'
  | 'detergent'
  | 'thinner'
  | 'oldkey'
  | 'photo'
  | 'scrap'
  | 'note'
  | 'bar'
  | 'ricemilk'
  | 'chestnut'
  | 'riceflour'
  // Act II.
  | 'patches'
  | 'hairdryer'
  | 'sardines'
  | 'tonka'
  | 'pump'
  | 'keyring'
  | 'scrap2'
  | 'scrap3'
  | 'hat';

export type CharacterId = 'dad' | 'mom' | 'julien' | 'florent' | 'theo';

// Who says a line: the hero (Sam), the narrator (cutscene descriptions) or an inhabitant.
// The delivery driver only speaks in the delivery scene.
export type Speaker = 'hero' | 'narrator' | 'driver' | CharacterId;

export type Verb = 'look' | 'take' | 'listen' | 'use';

export type Facing = 'left' | 'right' | 'up' | 'down';

// Character states (PRD "Character states"): changed by story events and by the timers.
// Papa's doorbell phases: answering (still at his desk), outside (in front of the house), returning (on his way);
// cooking the dough (90 s); at the garage fuse box after a power cut (60 s).
export type DadState = 'at_desk' | 'answering' | 'outside' | 'returning' | 'cooking' | 'fuses';

export interface CharacterStates {
  dad: DadState;
  mom: 'folding' | 'gardening' | 'changing';
  julien: 'in_room' | 'football';
  florent: 'in_room' | 'drumming' | 'riding';
  theo: 'in_room' | 'chess';
}

export type Flag =
  | 'key_taken'
  | 'gatekey_taken'
  | 'gates_open'
  | 'door_unlocked'
  | 'pole_taken'
  | 'extension_taken'
  | 'ball_freed'
  | 'sticks_taken'
  | 'queen_taken'
  | 'queen_placed'
  | 'booklet_taken'
  | 'cube_solved'
  | 'theo_back'
  | 'chess_solved'
  | 'computer_read'
  | 'detergent_taken'
  | 'power_on'
  | 'machine_running'
  | 'machine_done'
  | 'oring_taken'
  | 'oring_fitted'
  | 'wrench_taken'
  | 'wrench_used'
  | 'shower_repaired'
  | 'mirror_code'
  | 'safe_found'
  | 'safe_open'
  | 'pliers_taken'
  | 'plug_fixed'
  | 'cover_open'
  | 'pool_drained'
  | 'thinner_taken'
  | 'door_revealed'
  | 'lab_code'
  | 'lab_lock'
  | 'secret_open'
  | 'bar_taken'
  | 'hatch_open'
  | 'bay_open'
  | 'milk_taken'
  | 'flours_taken'
  | 'milk_in'
  | 'chestnut_in'
  | 'riceflour_in'
  | 'dough_mixed'
  | 'wc_wet'
  | 'fridge_open'
  // Act II.
  | 'dad_wary'
  | 'delivered'
  | 'sardines_taken'
  | 'hairdryer_taken'
  | 'patches_taken'
  | 'cat_fed'
  | 'parcel_taken'
  | 'keyring_taken'
  | 'patches_in'
  | 'pump_in'
  | 'bike_fixed'
  | 'ink_revealed'
  | 'bottles_done'
  | 'fuses_cut'
  | 'drawer_open'
  | 'trunk_open'
  | 'frag1_in'
  | 'frag2_in'
  | 'frag3_in'
  | 'finale'
  | 'tonka_in'
  | 'hat_given'
  | 'tonka_given'
  | 'ending';

export type NoteId = 'n01' | 'n02' | 'n03' | 'n04' | 'n05' | 'n06' | 'n07' | 'n08' | 'n09' | 'n10' | 'n11' | 'n12' | 'n13' | 'n14' | 'n15' | 'n16';

// Cutscenes that play once (PRD "Cutscenes"; CUT02, CUT14 and CUT18 play each time and are not recorded).
export type CutId = 'cut01' | 'cut04' | 'cut05' | 'cut06' | 'cut07' | 'cut08' | 'cut09' | 'cut10' | 'cut11' | 'cut12' | 'cut13' | 'cut15' | 'cut16' | 'cut17';

// Keypads: the father's computer, the safe of the parents' bedroom and the lab door in the attic.
export type KeypadId = 'computer' | 'safe' | 'lab';

// Sequence pads: Papa's four bottles in the cellar, the colour padlock of the attic trunk.
export type PadId = 'bottles' | 'trunk';

// The places that can be guarded by their occupant (telemetry `capture.room`), and those entered through a door.
export type GuardedRoom = 'office' | 'front' | 'kitchen' | 'parents' | 'garden' | 'julien' | 'florent' | 'theo' | 'garage';
export type DoorRoom = 'office' | 'parents' | 'julien' | 'florent' | 'theo';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Tutorial step: 0 walk, 1 verbs, 2 inventory (shown once an item is held), 3 done.
export type TutorialStep = 0 | 1 | 2 | 3;

// Running timers, as deadlines on the timer clock (ms); null when not running.
// dad: doorbell phases, cooking, fuse box; dough: until Papa comes to cook; mom: changing after the hose; delivery:
// until the parcel is delivered.
export interface Timers {
  dad: number | null;
  dough: number | null;
  mom: number | null;
  delivery: number | null;
}

export interface GameState {
  v: 3;
  place: PlaceId;
  pos: Point;
  facing: Facing;
  inventory: ItemId[];
  flags: Partial<Record<Flag, true>>;
  chars: CharacterStates;
  // Notebook entries in the order they were learnt, and the ones not read yet.
  notes: NoteId[];
  unread: NoteId[];
  cuts: CutId[];
  // Puzzles solved (E01-E30 as 1-30), in order.
  solved: number[];
  captures: number;
  tutorial: TutorialStep;
  playMs: number;
  // The timer clock: advances with play time (30 times faster in the testing fast mode).
  clock: number;
  timers: Timers;
  finished: boolean;
  // Rotation index of the generic "wrong combination" lines.
  wrongIdx: number;
}

export type SfxName =
  | 'take'
  | 'door'
  | 'wrong'
  | 'solved'
  | 'bell'
  | 'drums'
  | 'machine'
  | 'ding'
  | 'water'
  | 'pump'
  | 'beep'
  | 'secret'
  | 'capture'
  | 'note'
  | 'breaker'
  | 'spray'
  | 'robot'
  | 'gag'
  | 'van'
  | 'cat'
  | 'bikebell'
  | 'fuse'
  | 'padlock'
  | 'bottle'
  | 'applause';

// Outside views: the front door (doorbell), the kitchen (dough), the delivery, the garden (parcel, hose), Florent riding
// away, the power cut (dark house); the hose view is the garden with Maman soaked.
export type ViewId = 'door' | 'kitchen' | 'delivery' | 'garden' | 'hose' | 'ride' | 'dark';

// What the UI plays, in order, after an interaction.
export type Beat =
  | { type: 'say'; speaker: Speaker; key: string }
  | { type: 'keypad'; keypad: KeypadId }
  | { type: 'pad'; pad: PadId }
  | { type: 'chess' }
  | { type: 'documents' }
  | { type: 'note'; note: NoteId }
  // A place change; pos/facing are given when it is not the saved place (Sam steps into a room before a capture).
  | { type: 'room'; place: PlaceId; pos?: Point; facing?: Facing }
  // Sam steps aside (an inhabitant arrives where Sam stands).
  | { type: 'step'; pos: Point; facing: Facing }
  | { type: 'capture' }
  // A view of another place without control (PRD outside views).
  | { type: 'view'; view: ViewId }
  // Cinematic mode: while on, lines cannot be skipped by a tap and play their full time.
  | { type: 'cinematic'; on: boolean }
  // A pause in a scene (ms of real time).
  | { type: 'wait'; ms: number }
  // An inhabitant shown next to Sam for a scene (the adult taking Sam to the cellar), or nobody.
  | { type: 'captor'; character: CharacterId | null }
  // The inhabitants gathered around Sam for the final scene, in the order they arrived.
  | { type: 'cast'; characters: CharacterId[] }
  | { type: 'sfx'; sfx: SfxName }
  | { type: 'ending' };

// Facts for telemetry (the UI adds duration_s from the play time).
export type GameEvent =
  | { type: 'puzzle'; puzzle: number }
  | { type: 'capture'; room: GuardedRoom; count: number }
  | { type: 'complete'; captures: number };

export type Input =
  | { kind: 'verb'; verb: Verb; target: string }
  // Use an inventory item on a hotspot, a character (give) or another item (combine, target `item:<id>`).
  | { kind: 'item'; item: ItemId; target: string }
  | { kind: 'lookItem'; item: ItemId }
  | { kind: 'exit'; exit: string }
  | { kind: 'keypad'; keypad: KeypadId; code: string }
  // The buttons tapped on a sequence pad, in order (bottle vintages or colours).
  | { kind: 'pad'; pad: PadId; code: string[] }
  // The moves played on Théo's chess problem, as "e2e4" squares (white moves only).
  | { kind: 'chess'; moves: string[] }
  // Play time passing: advances the timer clock and resolves the timers that end.
  | { kind: 'tick'; ms: number }
  // Waiting until the next timer ends (tests and the solver).
  | { kind: 'wait' };

export interface Outcome {
  state: GameState;
  beats: Beat[];
  events: GameEvent[];
  // False when the input was not valid in this state (unknown target, absent character...): nothing changed.
  accepted: boolean;
}
