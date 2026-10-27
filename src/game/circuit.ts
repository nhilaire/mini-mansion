// Florent's console: the "broken circuit" game of level 99 (PRD "Florent's console", E31). Pure: a 7x5 board of tiles
// that turn a quarter turn clockwise per tap; the current flows from the battery (left of row BATTERY_ROW) through the
// connected tiles; the level is won when it reaches the bulb (right of row BULB_ROW).

export const COLS = 7;
export const ROWS = 5;
export const BATTERY_ROW = 2;
export const BULB_ROW = 1;

// Directions as bits; a tile is the set of its pipe ends.
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
const DIRS = [N, E, S, W] as const;
const STEP: Record<number, [number, number]> = { [N]: [0, -1], [E]: [1, 0], [S]: [0, 1], [W]: [-1, 0] };
const OPPOSITE: Record<number, number> = { [N]: S, [E]: W, [S]: N, [W]: E };

// I: straight, L: corner, T: three ends, O: a burnt cell (no pipe). Their ends when not turned.
export type TileKind = 'I' | 'L' | 'T' | 'O';
const BASE: Record<TileKind, number> = { I: N | S, L: N | E, T: N | E | S, O: 0 };

export interface Tile {
  kind: TileKind;
  // Quarter turns at the start of the level.
  start: number;
  // A fixed tile (a rivet is drawn on it) never turns.
  fixed: boolean;
}

// The level, row by row: kind, starting quarter turns, '*' when fixed. Found by a search for a single path of tiles
// from the battery to the bulb that needs 18 quarter turns (checked by circuit.test.ts).
const LEVEL = [
  'O2 T3 I2 L0 O1 L2 O2',
  'T2 L3 L3 I0 L1* I3 I2',
  'I1* I2 L0 I0* L1 T2 O3',
  'L0 O3 L0 L3 I0 L3 O1',
  'T3 T3 L1 I1 L0 L0 O3',
];

export const TILES: readonly Tile[] = LEVEL.flatMap((row) =>
  row.split(' ').map((code) => ({ kind: code[0] as TileKind, start: Number(code[1]), fixed: code.endsWith('*') })),
);

// A board is the quarter turns (0-3) of every tile, row by row.
export type Board = readonly number[];

export const START_BOARD: Board = TILES.map((t) => t.start);

// The ends of a tile turned `turns` quarter turns clockwise.
export function ends(kind: TileKind, turns: number): number {
  let m = BASE[kind];
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}

const at = (x: number, y: number) => y * COLS + x;
const endsAt = (board: Board, i: number) => ends(TILES[i].kind, board[i]);

// A board this level can show: one value 0-3 per tile, the fixed tiles as they started.
export function isBoard(board: unknown): board is Board {
  return (
    Array.isArray(board) &&
    board.length === TILES.length &&
    board.every((v, i) => Number.isInteger(v) && v >= 0 && v <= 3 && (!TILES[i].fixed || v === TILES[i].start))
  );
}

// The board after a tap on tile `i`: a quarter turn clockwise, except fixed and burnt tiles.
export function turn(board: Board, i: number): Board {
  if (TILES[i].fixed || TILES[i].kind === 'O') return board;
  return board.map((v, j) => (j === i ? (v + 1) % 4 : v));
}

// The tiles the current reaches from the battery.
export function lit(board: Board): Set<number> {
  const on = new Set<number>();
  const first = at(0, BATTERY_ROW);
  if (!(endsAt(board, first) & W)) return on;
  on.add(first);
  const queue = [first];
  while (queue.length) {
    const i = queue.shift()!;
    const x = i % COLS;
    const y = Math.floor(i / COLS);
    for (const d of DIRS) {
      if (!(endsAt(board, i) & d)) continue;
      const [dx, dy] = STEP[d];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const j = at(nx, ny);
      if (on.has(j) || !(endsAt(board, j) & OPPOSITE[d])) continue;
      on.add(j);
      queue.push(j);
    }
  }
  return on;
}

// The bulb lights when the current reaches the last tile of its row and that tile opens to the right.
export function connected(board: Board): boolean {
  const last = at(COLS - 1, BULB_ROW);
  return lit(board).has(last) && (endsAt(board, last) & E) !== 0;
}

// Whether a tile of this kind, turned or as fixed, can join the two sides `a` and `b`.
export function canJoin(tile: Tile, a: number, b: number): boolean {
  const options = tile.fixed ? [tile.start] : [0, 1, 2, 3];
  return options.some((r) => (ends(tile.kind, r) & (a | b)) === (a | b));
}

// Every path of tiles that can link the battery to the bulb, as tile indices (used by the tests and SOLUTION_BOARD).
export function paths(limit = 10): number[][] {
  const found: number[][] = [];
  const route: number[] = [];
  const seen = new Set<number>();
  const walk = (x: number, y: number, from: number) => {
    if (found.length >= limit) return;
    const i = at(x, y);
    route.push(i);
    seen.add(i);
    for (const d of DIRS) {
      if (d === from || !canJoin(TILES[i], from, d)) continue;
      if (x === COLS - 1 && y === BULB_ROW && d === E) {
        found.push([...route]);
        continue;
      }
      const [dx, dy] = STEP[d];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || seen.has(at(nx, ny))) continue;
      walk(nx, ny, OPPOSITE[d]);
    }
    route.pop();
    seen.delete(i);
  };
  walk(0, BATTERY_ROW, W);
  return found;
}

// The board solved with the fewest quarter turns: each tile of the path turned to the nearest orientation that joins
// its two neighbours on the path, the others left as they start.
function solve(): Board {
  const path = paths(1)[0];
  const board = [...START_BOARD];
  path.forEach((i, k) => {
    const side = (j: number) => {
      const dx = (j % COLS) - (i % COLS);
      const dy = Math.floor(j / COLS) - Math.floor(i / COLS);
      return dx === 1 ? E : dx === -1 ? W : dy === 1 ? S : N;
    };
    const a = k === 0 ? W : side(path[k - 1]);
    const b = k === path.length - 1 ? E : side(path[k + 1]);
    const need = a | b;
    const tile = TILES[i];
    let best = tile.start;
    for (let t = 0; t < 4; t++) {
      const r = (tile.start + t) % 4;
      if ((ends(tile.kind, r) & need) === need && !tile.fixed) {
        best = r;
        break;
      }
    }
    board[i] = best;
  });
  return board;
}

export const SOLUTION_BOARD: Board = solve();

// The quarter turns from one board to another (taps, tile by tile).
export function taps(from: Board, to: Board): number[] {
  return to.flatMap((v, i) => Array<number>((v - from[i] + 4) % 4).fill(i));
}
