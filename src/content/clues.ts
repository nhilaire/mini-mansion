// PRD "Clues (no hint system)": the in-world clues of each puzzle step (line keys of the story content). A test checks
// that each key exists in every language and that, along the walkthrough, at least one clue of each puzzle can be
// heard or read before the puzzle is solved.
export const CLUES: Record<number, readonly string[]> = {
  1: ['front.doormat.look'],
  2: ['julien.door', 'pool.ball.look', 'line.poleShort', 'garage.crate.look'],
  3: ['music.drums.look', 'florent.door', 'dining.basket.look'],
  4: ['living.chess.lookMissing', 'theo.door', 'julien.trophy.look'],
  5: ['theo.cube.look', 'living.bookshelf.look'],
  6: ['living.chess.lookProblem'],
  7: ['office.computer.look'],
  8: ['parents.shower.look', 'florent.kit.look', 'garage.bench.look'],
  9: ['line.theoMono3', 'parents.mirror.look'],
  10: ['line.theoMono2', 'parents.painting.look'],
  11: ['attic.stain.look'],
  12: ['line.doorLocked', 'item.oldkey.look'],
  13: ['laundry.notebook.look', 'item.note.look'],
  14: ['pool.cover.lookOpen', 'pool.pump.look', 'julien.a.pool1', 'julien.a.pool2'],
  15: ['cellar.shutter.look', 'cellar.rack.look'],
  16: ['dad.door'],
  17: ['mom.door', 'utility.machine.look'],
};
