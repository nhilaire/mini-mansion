// T-02: engine core (pathfinding, walking, tutorial, play time, ending time parts).
import { findPath, pathLength, pointInPolygon, Polygon, segmentInside } from '../game/geometry';
import { addPlayTime, advanceTutorial, durationSeconds, playTimeParts, tutorialBubble, tutorialDone } from '../game/progress';
import { newGame } from '../game/rules';
import { facingOf, poseAt, WALK_FPS, WALK_FRAMES, WALK_SPEED, walkDurationMs, walkFrame } from '../game/walker';
import { FLOORS, PLACES } from '../game/world';

const U_SHAPE: Polygon = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 60, y: 100 },
  { x: 60, y: 30 },
  { x: 40, y: 30 },
  { x: 40, y: 100 },
  { x: 0, y: 100 },
];

describe('pathfinding (AC-13)', () => {
  it('goes straight when the segment stays inside', () => {
    expect(findPath({ x: 10, y: 120 }, { x: 300, y: 130 }, FLOORS.hall)).toEqual([{ x: 300, y: 130 }]);
  });

  it('bends around a notch and stays inside the area', () => {
    const from = { x: 20, y: 90 };
    const path = findPath(from, { x: 80, y: 90 }, U_SHAPE);
    expect(path.length).toBeGreaterThan(1);
    let p = from;
    for (const q of path) {
      expect(segmentInside(p, q, U_SHAPE)).toBe(true);
      p = q;
    }
    expect(path[path.length - 1]).toEqual({ x: 80, y: 90 });
  });

  it('ends at the nearest walkable point when the tap is outside', () => {
    const path = findPath({ x: 160, y: 120 }, { x: 160, y: 40 }, FLOORS.living);
    const end = path[path.length - 1];
    expect(pointInPolygon(end, FLOORS.living)).toBe(true);
    expect(end.y).toBeCloseTo(104, 0);
  });

  it('every place has a walkable floor containing the start position area', () => {
    for (const place of PLACES) expect(pointInPolygon({ x: 160, y: 124 }, FLOORS[place])).toBe(true);
  });
});

describe('walking (AC-13, AC-14)', () => {
  it('moves at 60 px/s along the path', () => {
    const from = { x: 0, y: 120 };
    const path = [{ x: 120, y: 120 }];
    expect(WALK_SPEED).toBe(60);
    expect(walkDurationMs(from, path)).toBe(2000);
    expect(poseAt(from, path, 1000, 'right').pos).toEqual({ x: 60, y: 120 });
    expect(pathLength(from, path)).toBe(120);
  });

  it('4 frames at 8 fps, idle frame when stopped', () => {
    expect([WALK_FRAMES, WALK_FPS]).toEqual([4, 8]);
    expect([0, 125, 250, 375, 500].map(walkFrame)).toEqual([0, 1, 2, 3, 0]);
    const from = { x: 0, y: 120 };
    const end = poseAt(from, [{ x: 30, y: 120 }], 5000, 'right');
    expect(end.frame).toBe(-1);
    expect(end.done).toBe(true);
  });

  it('faces the direction of travel; left is its own facing (drawn mirrored)', () => {
    expect(facingOf({ x: 50, y: 0 }, { x: 10, y: 2 }, 'down')).toBe('left');
    expect(facingOf({ x: 0, y: 0 }, { x: 10, y: 2 }, 'down')).toBe('right');
    expect(facingOf({ x: 0, y: 50 }, { x: 2, y: 10 }, 'down')).toBe('up');
    expect(facingOf({ x: 0, y: 0 }, { x: 0, y: 0 }, 'down')).toBe('down');
  });
});

describe('tutorial (AC-12)', () => {
  it('walk, then verbs, then inventory once an item is held, each once', () => {
    let s = newGame();
    expect(tutorialBubble(s)).toBe('walk');
    expect(advanceTutorial(s, 'verbUsed')).toBe(s);
    s = advanceTutorial(s, 'walked');
    expect(tutorialBubble(s)).toBe('verbs');
    s = advanceTutorial(s, 'verbUsed');
    expect(tutorialBubble(s)).toBeNull();
    expect(advanceTutorial(s, 'itemSelected')).toBe(s);
    s = { ...s, inventory: ['key'] };
    expect(tutorialBubble(s)).toBe('inventory');
    s = advanceTutorial(s, 'itemSelected');
    expect(tutorialDone(s)).toBe(true);
    expect(tutorialBubble(s)).toBeNull();
    expect(advanceTutorial(s, 'walked')).toBe(s);
  });
});

describe('play time (AC-38, AC-40)', () => {
  it('advances only while active and not finished', () => {
    const s = newGame();
    expect(addPlayTime(s, 1000, false)).toBe(s);
    expect(addPlayTime(s, 1500, true).playMs).toBe(1500);
    expect(addPlayTime({ ...s, finished: true }, 1000, true).playMs).toBe(0);
    expect(durationSeconds({ ...s, playMs: 61999 })).toBe(61);
  });

  it('whole minutes rounded down, minutes on 2 digits, hours without padding', () => {
    expect([0, 59, 300, 3599, 11520].map((sec) => playTimeParts(sec * 1000))).toEqual([
      { h: 0, mm: '00' },
      { h: 0, mm: '00' },
      { h: 0, mm: '05' },
      { h: 0, mm: '59' },
      { h: 3, mm: '12' },
    ]);
  });
});
