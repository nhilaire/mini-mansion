// The hero walking along a path: position, facing and walk frame at a given elapsed time (pure, time is an input).
import { distance } from './geometry';
import { Facing, Point } from './types';

export const WALK_SPEED = 60; // logical px per second
export const WALK_FPS = 8;
export const WALK_FRAMES = 4;

export interface WalkPose {
  pos: Point;
  facing: Facing;
  // 0-3 while walking, -1 when standing.
  frame: number;
  done: boolean;
}

export function facingOf(from: Point, to: Point, fallback: Facing): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

export function walkDurationMs(from: Point, path: readonly Point[], speed = WALK_SPEED): number {
  let len = 0;
  let p = from;
  for (const q of path) {
    len += distance(p, q);
    p = q;
  }
  return (len / speed) * 1000;
}

export function walkFrame(elapsedMs: number): number {
  return Math.floor((elapsedMs * WALK_FPS) / 1000) % WALK_FRAMES;
}

export function poseAt(from: Point, path: readonly Point[], elapsedMs: number, startFacing: Facing, speed = WALK_SPEED): WalkPose {
  let remaining = Math.max(0, (elapsedMs / 1000) * speed);
  let p = from;
  let facing = startFacing;
  for (const q of path) {
    const seg = distance(p, q);
    facing = facingOf(p, q, facing);
    if (remaining < seg) {
      const t = remaining / seg;
      return { pos: { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }, facing, frame: walkFrame(elapsedMs), done: false };
    }
    remaining -= seg;
    p = q;
  }
  return { pos: { x: p.x, y: p.y }, facing, frame: -1, done: true };
}
