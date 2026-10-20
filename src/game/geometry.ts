// Walkable areas and pathfinding. A room's floor is a simple polygon (concave allowed, no holes).
// A path goes straight when the segment stays inside; otherwise it follows a visibility graph over the polygon's
// reflex (inward) corners, searched with A*.
import { Point } from './types';

export type Polygon = readonly Point[];

const EPS = 1e-6;

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function orient(a: Point, b: Point, c: Point): number {
  const v = cross(sub(b, a), sub(c, a));
  return Math.abs(v) < EPS ? 0 : Math.sign(v);
}

function closestOnSegment(p: Point, a: Point, b: Point): Point {
  const ab = sub(b, a);
  const len2 = ab.x * ab.x + ab.y * ab.y;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / len2));
  return { x: a.x + ab.x * t, y: a.y + ab.y * t };
}

function onBoundary(p: Point, poly: Polygon): boolean {
  for (let i = 0; i < poly.length; i++) {
    const q = closestOnSegment(p, poly[i], poly[(i + 1) % poly.length]);
    if (distance(p, q) < 1e-4) return true;
  }
  return false;
}

// Inside or on the boundary.
export function pointInPolygon(p: Point, poly: Polygon): boolean {
  if (onBoundary(p, poly)) return true;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// True when the two segments cross at a single point strictly inside both (touching or overlapping does not count).
function properlyIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

// The segment a-b stays in the walkable area (boundary included).
export function segmentInside(a: Point, b: Point, poly: Polygon): boolean {
  if (!pointInPolygon(a, poly) || !pointInPolygon(b, poly)) return false;
  for (let i = 0; i < poly.length; i++) {
    if (properlyIntersect(a, b, poly[i], poly[(i + 1) % poly.length])) return false;
  }
  // Samples catch segments that leave through a corner (no proper crossing).
  for (const t of [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) {
    if (!pointInPolygon({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, poly)) return false;
  }
  return true;
}

// The point itself when walkable, else the closest point of the area's boundary.
export function nearestWalkable(p: Point, poly: Polygon): Point {
  if (pointInPolygon(p, poly)) return { x: p.x, y: p.y };
  let best = poly[0];
  let bestD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const q = closestOnSegment(p, poly[i], poly[(i + 1) % poly.length]);
    const d = distance(p, q);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return { x: best.x, y: best.y };
}

function signedArea(poly: Polygon): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) s += cross(poly[i], poly[(i + 1) % poly.length]);
  return s / 2;
}

// Corners where the area turns inward: the only places a shortest path bends.
export function reflexVertices(poly: Polygon): Point[] {
  const ccw = signedArea(poly) > 0;
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const prev = poly[(i + poly.length - 1) % poly.length];
    const cur = poly[i];
    const next = poly[(i + 1) % poly.length];
    const turn = cross(sub(cur, prev), sub(next, cur));
    if (ccw ? turn < -EPS : turn > EPS) out.push(cur);
  }
  return out;
}

// Shortest path from `from` to `to` (moved to the nearest walkable point). Returns the waypoints after the start,
// ending with the destination. Empty when already there.
export function findPath(from: Point, to: Point, poly: Polygon): Point[] {
  const start = nearestWalkable(from, poly);
  const goal = nearestWalkable(to, poly);
  if (distance(start, goal) < 0.5) return [];
  if (segmentInside(start, goal, poly)) return [goal];

  const nodes = [start, goal, ...reflexVertices(poly)];
  const n = nodes.length;
  const g = new Array<number>(n).fill(Infinity);
  const prev = new Array<number>(n).fill(-1);
  const open = new Set<number>([0]);
  const closed = new Set<number>();
  g[0] = 0;
  const visible = (i: number, j: number) => segmentInside(nodes[i], nodes[j], poly);
  while (open.size) {
    let cur = -1;
    let best = Infinity;
    for (const i of open) {
      const f = g[i] + distance(nodes[i], goal);
      if (f < best) {
        best = f;
        cur = i;
      }
    }
    if (cur === 1) break;
    open.delete(cur);
    closed.add(cur);
    for (let j = 0; j < n; j++) {
      if (j === cur || closed.has(j) || !visible(cur, j)) continue;
      const cost = g[cur] + distance(nodes[cur], nodes[j]);
      if (cost < g[j]) {
        g[j] = cost;
        prev[j] = cur;
        open.add(j);
      }
    }
  }
  if (prev[1] === -1) return [goal]; // unreachable cannot happen in a simple polygon; walk straight as a fallback
  const path: Point[] = [];
  for (let i = 1; i !== 0; i = prev[i]) path.unshift({ x: nodes[i].x, y: nodes[i].y });
  return path;
}

export function pathLength(from: Point, path: readonly Point[]): number {
  let len = 0;
  let p = from;
  for (const q of path) {
    len += distance(p, q);
    p = q;
  }
  return len;
}
