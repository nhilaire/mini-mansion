// Core types of the adventure engine. Pure data: no React, no clock, no player text (line keys only).

export type PlaceId =
  | 'front'
  | 'football'
  | 'pool'
  | 'garden'
  | 'hall'
  | 'living'
  | 'music'
  | 'dining'
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
  | 'bar';

export type CharacterId = 'dad' | 'mom' | 'julien' | 'florent' | 'theo';

// Who says a line: the hero (Sam), the narrator (cutscene descriptions) or an inhabitant.
export type Speaker = 'hero' | 'narrator' | CharacterId;

export type Verb = 'look' | 'take' | 'talk' | 'use';

export type Facing = 'left' | 'right' | 'up' | 'down';

// Character states (PRD "Character states"): changed only by story events, never by a timer.
export interface CharacterStates {
  dad: 'at_desk' | 'cooking';
  mom: 'folding' | 'gardening';
  julien: 'in_room' | 'football';
  florent: 'in_room' | 'drumming';
  theo: 'in_room' | 'chess';
}

export type Flag =
  | 'key_taken'
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
  | 'secret_open'
  | 'bar_taken'
  | 'shutter_open'
  | 'trap_locked'
  | 'bay_open'
  | 'ending';

export type NoteId = 'n01' | 'n02' | 'n03' | 'n04' | 'n05' | 'n06' | 'n07' | 'n08' | 'n09' | 'n10' | 'n11' | 'n12';

// Cutscenes that play once (PRD "Cutscenes").
export type CutId = 'cut01' | 'cut02' | 'cut04' | 'cut05' | 'cut06' | 'cut07' | 'cut08' | 'cut09' | 'cut10' | 'cut11';

// Keypads: the father's computer and the safe of the parents' bedroom.
export type KeypadId = 'computer' | 'safe';

// The rooms that can be guarded by their occupant (telemetry `capture.room`).
export type GuardedRoom = 'office' | 'parents' | 'julien' | 'florent' | 'theo';

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

export interface GameState {
  v: 1;
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
  // Puzzles solved (E01-E17 as 1-17), in order.
  solved: number[];
  captures: number;
  // Dialogue options already chosen (greyed but readable).
  seen: string[];
  tutorial: TutorialStep;
  playMs: number;
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
  | 'note';

// What the UI plays, in order, after an interaction.
export type Beat =
  | { type: 'say'; speaker: Speaker; key: string }
  | { type: 'dialogue'; character: CharacterId }
  | { type: 'keypad'; keypad: KeypadId }
  | { type: 'chess' }
  | { type: 'documents' }
  | { type: 'note'; note: NoteId }
  | { type: 'room'; place: PlaceId }
  | { type: 'capture' }
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
  | { kind: 'dialogue'; character: CharacterId; option: string }
  | { kind: 'keypad'; keypad: KeypadId; code: string }
  // The moves played on Théo's chess problem, as "e2e4" squares (white moves only).
  | { kind: 'chess'; moves: string[] };

export interface Outcome {
  state: GameState;
  beats: Beat[];
  events: GameEvent[];
  // False when the input was not valid in this state (unknown target, absent character...): nothing changed.
  accepted: boolean;
}
