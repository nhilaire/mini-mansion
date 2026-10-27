// T-88 (AC-73): Florent's console, level 99 of the broken circuit game, and his Nerf kit locked until it is beaten.
import { BATTERY_ROW, BULB_ROW, COLS, connected, ends, isBoard, lit, paths, ROWS, SOLUTION_BOARD, START_BOARD, taps, TILES, turn } from '../game/circuit';
import { interact, newGame } from '../game/rules';
import { deserialize, serialize } from '../game/save';
import { Beat, CharacterStates, GameState, Input } from '../game/types';
import { line } from '../content/index';
import { fr as frStrings } from '../i18n/fr';

const chars = (patch: Partial<CharacterStates>): CharacterStates => ({ ...newGame().chars, ...patch });
const room = (extra: Partial<GameState> = {}): GameState => ({ ...newGame(), place: 'florent', flags: { door_unlocked: true }, chars: chars({ florent: 'drumming' }), ...extra });
const said = (key: string): Beat => ({ type: 'say', speaker: 'hero', key } as Beat);
const verb = (v: 'look' | 'use' | 'take', target: string): Input => ({ kind: 'verb', verb: v, target });
const circuit = (board: readonly number[]): Input => ({ kind: 'circuit', board: [...board] });

describe("the level (Florent's console, AC-73)", () => {
  it('is a 7x5 board, not connected at the start', () => {
    expect([COLS, ROWS]).toEqual([7, 5]);
    expect(TILES).toHaveLength(35);
    expect(connected(START_BOARD)).toBe(false);
  });

  it('has a single path of tiles from the battery to the bulb, which needs between 12 and 30 quarter turns', () => {
    expect(paths(10)).toHaveLength(1);
    const turns = taps(START_BOARD, SOLUTION_BOARD).length;
    expect(turns).toBeGreaterThanOrEqual(12);
    expect(turns).toBeLessThanOrEqual(30);
    expect(connected(SOLUTION_BOARD)).toBe(true);
  });

  it('a tap turns a tile a quarter turn clockwise; fixed and burnt tiles never turn', () => {
    const free = TILES.findIndex((t) => !t.fixed && t.kind !== 'O');
    expect(turn(START_BOARD, free)[free]).toBe((START_BOARD[free] + 1) % 4);
    expect(ends('L', 1)).toBe(ends('L', 0) << 1);
    for (const [i, t] of TILES.entries()) if (t.fixed || t.kind === 'O') expect(turn(START_BOARD, i)).toEqual(START_BOARD);
    expect(TILES.filter((t) => t.fixed).length).toBeGreaterThan(0);
  });

  it('the lit tiles are exactly those the current reaches from the battery', () => {
    const on = lit(SOLUTION_BOARD);
    expect(on.has(BATTERY_ROW * COLS)).toBe(true);
    expect(on.has(BULB_ROW * COLS + COLS - 1)).toBe(true);
    expect(on.size).toBeGreaterThanOrEqual(paths(1)[0].length);
    expect(lit(START_BOARD).size).toBeLessThan(on.size);
    // Reference: grow the set until no tile joins, a tile joining a lit neighbour when both open towards each other.
    const reference = (board: readonly number[]) => {
      const open = (i: number, d: number) => (ends(TILES[i].kind, board[i]) & d) !== 0;
      const set = new Set<number>(open(BATTERY_ROW * COLS, 8) ? [BATTERY_ROW * COLS] : []);
      for (let grew = true; grew; ) {
        grew = false;
        for (let i = 0; i < TILES.length; i++) {
          if (set.has(i)) continue;
          const x = i % COLS;
          const joins =
            (x > 0 && set.has(i - 1) && open(i, 8) && open(i - 1, 2)) ||
            (x < COLS - 1 && set.has(i + 1) && open(i, 2) && open(i + 1, 8)) ||
            (i >= COLS && set.has(i - COLS) && open(i, 1) && open(i - COLS, 4)) ||
            (i + COLS < TILES.length && set.has(i + COLS) && open(i, 4) && open(i + COLS, 1));
          if (joins) {
            set.add(i);
            grew = true;
          }
        }
      }
      return set;
    };
    const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b);
    // Every board on the way from the start to the solution, then pseudo-random boards.
    const boards: number[][] = [[...START_BOARD]];
    for (const i of taps(START_BOARD, SOLUTION_BOARD)) boards.push([...turn(boards[boards.length - 1], i)]);
    let seed = 1;
    const rand = () => (seed = (seed * 16807) % 2147483647) % 4;
    for (let n = 0; n < 200; n++) boards.push(TILES.map((t) => (t.fixed ? t.start : rand())));
    for (const b of boards) expect(sorted(lit(b))).toEqual(sorted(reference(b)));
    // On the solved board, some pipe tiles off the current stay dark.
    expect(TILES.some((t, i) => t.kind !== 'O' && !on.has(i))).toBe(true);
  });
});

describe('the console in the game (AC-73)', () => {
  it('its post-it says what beating level 99 gives; using it opens the game', () => {
    expect(interact(room(), verb('look', 'florent.console')).beats).toEqual([said('florent.console.look')]);
    expect(line(frStrings, 'florent.console.look')).toMatch(/Celui qui bat le niveau 99 a le droit de piocher dans mon kit Nerf/);
    expect(interact(room(), verb('use', 'florent.console')).beats).toEqual([{ type: 'circuit' }]);
  });

  it('the Nerf kit is locked before E31', () => {
    const o = interact(room(), verb('take', 'florent.kit'));
    expect(o.beats).toEqual([said('line.kitLocked')]);
    expect(o.state.inventory).toEqual([]);
    expect(interact(room(), verb('look', 'florent.kit')).beats).toEqual([said('florent.kit.lookLocked')]);
  });

  it('an unsolved board is kept (closing the game), and survives a save', () => {
    const board = turn(START_BOARD, TILES.findIndex((t) => !t.fixed && t.kind !== 'O'));
    const o = interact(room(), circuit(board));
    expect(o.accepted).toBe(true);
    expect(o.state.circuit).toEqual(board);
    expect(o.state.solved).not.toContain(31);
    expect(deserialize(serialize(o.state)).circuit).toEqual(board);
  });

  it('a board that changes a fixed tile, or a wrong size, is refused', () => {
    const fixed = TILES.findIndex((t) => t.fixed);
    expect(isBoard(START_BOARD.map((v, i) => (i === fixed ? (v + 1) % 4 : v)))).toBe(false);
    expect(interact(room(), circuit(START_BOARD.slice(1))).accepted).toBe(false);
  });

  it('lighting the bulb solves E31 once and opens the kit', () => {
    const o = interact(room(), circuit(SOLUTION_BOARD));
    expect(o.events).toEqual([{ type: 'puzzle', puzzle: 31 }]);
    expect(o.beats).toContainEqual(said('line.kitOpen'));
    expect(interact(o.state, circuit(SOLUTION_BOARD)).accepted).toBe(false);
    expect(interact(o.state, verb('use', 'florent.console')).beats).toEqual([said('console.done')]);
    const kit = interact(o.state, verb('take', 'florent.kit'));
    expect(kit.state.inventory).toEqual(['oring', 'patches']);
  });

  it('the game is played in Florent\'s room only', () => {
    expect(interact({ ...room(), place: 'landing' }, circuit(SOLUTION_BOARD)).accepted).toBe(false);
  });
});
