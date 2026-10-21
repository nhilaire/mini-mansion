// PRD "Clues (no hint system)": the in-world clues of each puzzle step (line keys of the story content). A test checks
// that each key exists in every language and that, along the walkthrough, at least one clue of each puzzle can be
// heard or read before the puzzle is solved.
export const CLUES: Record<number, readonly string[]> = {
  1: ['front.doormat.look'],
  2: ['julien.door', 'pool.ball.look', 'line.poleShort', 'football.bench.look'],
  3: ['music.drums.look', 'florent.door', 'music.basket.look'],
  4: ['living.chess.lookMissing', 'theo.door', 'julien.trophy.look'],
  5: ['theo.cube.look', 'theo.cube.use', 'living.bookshelf.look'],
  6: ['living.chess.lookProblem'],
  7: ['office.computer.look'],
  8: ['parents.shower.look', 'florent.kit.look', 'line.showerLoose', 'garage.bench.look'],
  9: ['parents.shower.lookRepaired', 'parents.mirror.look'],
  10: ['parents.painting.look'],
  11: ['attic.stain.look', 'line.theoMono2', 'garage.paint.look'],
  12: ['line.doorLocked', 'attic.door.look', 'item.oldkey.look'],
  13: ['laundry.notebook.look', 'item.note.look'],
  14: ['pool.cover.lookOpen', 'pool.pump.look', 'julien.a.pool1', 'julien.a.pool2'],
  15: ['cellar.hatch.look', 'cellar.rack.look'],
  16: ['dad.door', 'front.bell.look'],
  17: ['mom.door', 'utility.machine.look', 'garage.breaker.look'],
  18: ['front.gateLeft.look', 'hall.shoes.look'],
  19: ['kitchen.bowl.look', 'kitchen.fridge.look', 'utility.flours.look', 'kitchen.robot.look'],
};
