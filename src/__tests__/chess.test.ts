// T-07: Théo's chess problem (AC-26) - legal moves, the guided mate in 2, the uniqueness proof and the code.
import {
  applyMove,
  BLACK_REPLY,
  codeFromSolution,
  inCheck,
  isMate,
  isSolution,
  legalFrom,
  legalMoves,
  mateInOne,
  mateInTwoKeys,
  newSession,
  playWhite,
  PROBLEM,
  SOLUTION_MOVES,
} from '../game/chess';
import { CODES } from '../game/rules';

describe('the position', () => {
  it('is legal: nobody in check, white to move', () => {
    expect(inCheck(PROBLEM, 'w')).toBe(false);
    expect(inCheck(PROBLEM, 'b')).toBe(false);
  });

  it('has no mate in 1', () => {
    expect(mateInOne(PROBLEM)).toEqual([]);
  });

  it('Qg8+ is the only first move that mates in 2 (the generator explores every white move and black reply)', () => {
    expect(mateInTwoKeys(PROBLEM)).toEqual(['c4g8']);
  });

  it('after Qg8+ the rook must take, and Nf7 is the only mating reply (smothered mate)', () => {
    const afterQ = applyMove(PROBLEM, 'c4g8');
    expect(inCheck(afterQ, 'b')).toBe(true);
    expect(legalMoves(afterQ, 'b')).toEqual([BLACK_REPLY]);
    const afterR = applyMove(afterQ, BLACK_REPLY);
    expect(mateInOne(afterR)).toEqual(['h6f7']);
    expect(isMate(applyMove(afterR, 'h6f7'), 'b')).toBe(true);
  });
});

describe('legal moves', () => {
  it('a knight jumps, a queen slides until blocked, a king never steps into check', () => {
    expect(legalFrom(PROBLEM, 'h6').sort()).toEqual(['f5', 'f7', 'g4', 'g8']);
    expect(legalFrom(PROBLEM, 'c4')).toContain('g8');
    expect(legalFrom(PROBLEM, 'c4')).not.toContain('h1');
    for (const to of legalFrom(PROBLEM, 'g1')) expect(inCheck(applyMove(PROBLEM, `g1${to}`), 'w')).toBe(false);
    expect(legalFrom(PROBLEM, 'f2').sort()).toEqual(['f3', 'f4']);
    expect(legalFrom(PROBLEM, 'e4')).toEqual([]);
  });
});

describe('the guided session', () => {
  it('tells illegal moves apart from legal but wrong ones', () => {
    expect(playWhite(newSession(), 'c4c8').kind).toBe('wrong');
    expect(playWhite(newSession(), 'h6h8').kind).toBe('illegal');
    expect(playWhite(newSession(), 'a1a2').kind).toBe('illegal');
  });

  it('any first move other than Qg8+ is wrong; Qg8+ is answered by Rxg8', () => {
    for (const m of legalMoves(PROBLEM, 'w')) {
      if (m === 'c4g8') continue;
      expect([m, playWhite(newSession(), m).kind]).toEqual([m, 'wrong']);
    }
    const first = playWhite(newSession(), 'c4g8');
    expect(first.kind).toBe('progress');
    if (first.kind !== 'progress') return;
    expect(first.reply).toBe('d8g8');
    expect(first.session.board.g8).toBe('r');
    for (const m of legalMoves(first.session.board, 'w')) {
      if (m === 'h6f7') continue;
      expect([m, playWhite(first.session, m).kind]).toEqual([m, 'wrong']);
    }
    const mate = playWhite(first.session, 'h6f7');
    expect(mate.kind).toBe('solved');
    if (mate.kind === 'solved') expect(isSolution(mate.session.moves)).toBe(true);
  });

  it('the destination squares give the computer code: g8 f7 -> 7 8 6 7', () => {
    expect([...SOLUTION_MOVES]).toEqual(['c4g8', 'h6f7']);
    expect(codeFromSolution()).toBe('7867');
    expect(CODES.computer).toBe(codeFromSolution());
  });
});
