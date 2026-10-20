// Théo's chess problem (PRD "Chess problem"): a small legal-move generator (no castling, no en passant: neither can
// occur in the problem), the guided mate-in-2 session and the proof that the solution is unique.
// Squares are "a1".."h8"; a move is "c4g8". White pieces are uppercase (KQRBNP), black ones lowercase.

export type Color = 'w' | 'b';
export type Board = Readonly<Record<string, string>>;

export const PROBLEM: Board = {
  g1: 'K',
  c4: 'Q',
  h6: 'N',
  f2: 'P',
  g2: 'P',
  h2: 'P',
  h8: 'k',
  d8: 'r',
  g7: 'p',
  h7: 'p',
};

export const SOLUTION_MOVES = ['c4g8', 'h6f7'] as const;
export const BLACK_REPLY = 'd8g8';

const FILES = 'abcdefgh';

export function square(file: number, rank: number): string | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${rank + 1}`;
}

export function coords(sq: string): [number, number] {
  return [FILES.indexOf(sq[0]), Number(sq[1]) - 1];
}

export const colorOf = (piece: string): Color => (piece === piece.toUpperCase() ? 'w' : 'b');

const KNIGHT = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];
const KING = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];
const ROOK = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const BISHOP = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

// Squares a piece attacks (pawns: diagonals only), ignoring whose turn it is.
function attacks(board: Board, from: string): string[] {
  const piece = board[from];
  const [f, r] = coords(from);
  const kind = piece.toLowerCase();
  const out: string[] = [];
  const steps = (dirs: number[][]) => {
    for (const [df, dr] of dirs) {
      const s = square(f + df, r + dr);
      if (s) out.push(s);
    }
  };
  const rays = (dirs: number[][]) => {
    for (const [df, dr] of dirs) {
      for (let i = 1; i < 8; i++) {
        const s = square(f + df * i, r + dr * i);
        if (!s) break;
        out.push(s);
        if (board[s]) break;
      }
    }
  };
  if (kind === 'n') steps(KNIGHT);
  else if (kind === 'k') steps(KING);
  else if (kind === 'r') rays(ROOK);
  else if (kind === 'b') rays(BISHOP);
  else if (kind === 'q') rays([...ROOK, ...BISHOP]);
  else if (kind === 'p') {
    const dir = colorOf(piece) === 'w' ? 1 : -1;
    steps([
      [1, dir],
      [-1, dir],
    ]);
  }
  return out;
}

export function isAttacked(board: Board, sq: string, by: Color): boolean {
  return Object.keys(board).some((from) => colorOf(board[from]) === by && attacks(board, from).includes(sq));
}

export function inCheck(board: Board, color: Color): boolean {
  const king = Object.keys(board).find((s) => board[s] === (color === 'w' ? 'K' : 'k'));
  return king !== undefined && isAttacked(board, king, color === 'w' ? 'b' : 'w');
}

export function applyMove(board: Board, move: string): Board {
  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  const next: Record<string, string> = { ...board };
  let piece = next[from];
  delete next[from];
  // Promotion to a queen (not needed by the problem, kept for a correct generator).
  if (piece === 'P' && to[1] === '8') piece = 'Q';
  if (piece === 'p' && to[1] === '1') piece = 'q';
  next[to] = piece;
  return next;
}

function pseudoMoves(board: Board, color: Color): string[] {
  const out: string[] = [];
  for (const from of Object.keys(board)) {
    const piece = board[from];
    if (colorOf(piece) !== color) continue;
    if (piece.toLowerCase() === 'p') {
      const [f, r] = coords(from);
      const dir = color === 'w' ? 1 : -1;
      const one = square(f, r + dir);
      if (one && !board[one]) {
        out.push(from + one);
        const start = color === 'w' ? 1 : 6;
        const two = square(f, r + 2 * dir);
        if (r === start && two && !board[two]) out.push(from + two);
      }
      for (const to of attacks(board, from)) if (board[to] && colorOf(board[to]) !== color) out.push(from + to);
      continue;
    }
    for (const to of attacks(board, from)) if (!board[to] || colorOf(board[to]) !== color) out.push(from + to);
  }
  return out;
}

export function legalMoves(board: Board, color: Color): string[] {
  return pseudoMoves(board, color).filter((m) => !inCheck(applyMove(board, m), color));
}

export function legalFrom(board: Board, from: string): string[] {
  const piece = board[from];
  if (!piece) return [];
  return legalMoves(board, colorOf(piece))
    .filter((m) => m.startsWith(from))
    .map((m) => m.slice(2, 4));
}

export function isMate(board: Board, color: Color): boolean {
  return inCheck(board, color) && legalMoves(board, color).length === 0;
}

// White's first moves that force mate in exactly 2 (every black reply allows a mating move).
export function mateInTwoKeys(board: Board): string[] {
  return legalMoves(board, 'w').filter((m) => {
    const after = applyMove(board, m);
    const replies = legalMoves(after, 'b');
    if (replies.length === 0) return false; // mate or stalemate in 1 is not a mate in 2
    return replies.every((reply) => mateInOne(applyMove(after, reply)).length > 0);
  });
}

export function mateInOne(board: Board): string[] {
  return legalMoves(board, 'w').filter((m) => isMate(applyMove(board, m), 'b'));
}

// The guided session played in the chess overlay: white moves are checked against the reference solution.
export interface ChessSession {
  board: Board;
  // Number of white moves played correctly so far (0, 1, 2 = solved).
  step: number;
  moves: string[];
}

export function newSession(): ChessSession {
  return { board: PROBLEM, step: 0, moves: [] };
}

export type ChessResult = { kind: 'illegal' } | { kind: 'wrong' } | { kind: 'progress'; session: ChessSession; reply: string } | { kind: 'solved'; session: ChessSession };

export function playWhite(session: ChessSession, move: string): ChessResult {
  if (session.step >= 2) return { kind: 'illegal' };
  if (!legalMoves(session.board, 'w').includes(move)) return { kind: 'illegal' };
  if (move !== SOLUTION_MOVES[session.step]) return { kind: 'wrong' };
  const moved = applyMove(session.board, move);
  const moves = [...session.moves, move];
  if (session.step === 0) {
    // Black's only legal reply (the rook takes the queen).
    const reply = legalMoves(moved, 'b')[0];
    return { kind: 'progress', session: { board: applyMove(moved, reply), step: 1, moves }, reply };
  }
  return { kind: 'solved', session: { board: moved, step: 2, moves } };
}

export function isSolution(moves: readonly string[]): boolean {
  return moves.length === SOLUTION_MOVES.length && moves.every((m, i) => m === SOLUTION_MOVES[i]);
}

// The computer code: files as numbers (a=1 ... h=8) and ranks of the destination squares of the solution.
export function codeFromSolution(): string {
  return SOLUTION_MOVES.map((m) => {
    const [f, r] = coords(m.slice(2, 4));
    return `${f + 1}${r + 1}`;
  }).join('');
}
