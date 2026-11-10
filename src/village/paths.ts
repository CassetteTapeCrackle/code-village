import type { Rect } from "./areas";
import { mochiCanStand, walkable, type Point, type VillageMap } from "./layout";

// Breadth-first search over walkable tiles; the route includes both ends.
export function findPath(map: VillageMap, from: Point, to: Point): Point[] | null {
  if (!walkable(map, from.x, from.y) || !walkable(map, to.x, to.y)) return null;
  const key = (p: Point): number => p.y * map.w + p.x;
  const cameFrom = new Map<number, Point | null>([[key(from), null]]);
  const queue: Point[] = [from];
  while (queue.length > 0) {
    const here = queue.shift()!;
    if (here.x === to.x && here.y === to.y) {
      const path: Point[] = [];
      for (let p: Point | null = here; p; p = cameFrom.get(key(p)) ?? null) path.unshift(p);
      return path;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = { x: here.x + dx, y: here.y + dy };
      if (!walkable(map, next.x, next.y) || cameFrom.has(key(next))) continue;
      cameFrom.set(key(next), here);
      queue.push(next);
    }
  }
  return null;
}

const STEP = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
const PATH_COST = 1;
const GROUND_COST = 1.5; // grass is slower than a path, so a walk keeps to the road when it is barely longer

// Dijkstra over every tile Mochi can stand on. A click on a tile he cannot stand on (water, a building,
// a tree, fog) ends on the reachable tile nearest the click; null when the only one is where he stands.
export function findWalk(map: VillageMap, from: Point, to: Point, closed: readonly Rect[]): Point[] | null {
  if (!mochiCanStand(map, from.x, from.y, closed)) return null;
  const w = map.w;
  const start = from.y * w + from.x;
  const goal = to.x >= 0 && to.x < w && to.y >= 0 && to.y < map.h ? to.y * w + to.x : -1;

  const dist = new Float64Array(map.w * map.h).fill(Infinity);
  const prev = new Int32Array(map.w * map.h).fill(-1);
  const heapIndex: number[] = [];
  const heapCost: number[] = [];
  let poppedCost = 0;

  function push(index: number, cost: number): void {
    let i = heapIndex.length;
    heapIndex.push(index);
    heapCost.push(cost);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heapCost[parent] <= cost) break;
      heapIndex[i] = heapIndex[parent];
      heapCost[i] = heapCost[parent];
      i = parent;
    }
    heapIndex[i] = index;
    heapCost[i] = cost;
  }

  function pop(): number {
    const top = heapIndex[0];
    const topCost = heapCost[0];
    const lastIndex = heapIndex.pop()!;
    const lastCost = heapCost.pop()!;
    poppedCost = topCost;
    const n = heapIndex.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        if (left >= n) break;
        const right = left + 1;
        const child = right < n && heapCost[right] < heapCost[left] ? right : left;
        if (heapCost[child] >= lastCost) break;
        heapIndex[i] = heapIndex[child];
        heapCost[i] = heapCost[child];
        i = child;
      }
      heapIndex[i] = lastIndex;
      heapCost[i] = lastCost;
    }
    return top;
  }

  function pathTo(end: number): Point[] {
    const path: Point[] = [];
    for (let i = end; i !== -1; i = prev[i]) path.push({ x: i % w, y: Math.floor(i / w) });
    return path.reverse();
  }

  dist[start] = 0;
  push(start, 0);
  let best = start;
  let bestDistance = Infinity;
  while (heapIndex.length > 0) {
    const here = pop();
    if (poppedCost > dist[here]) continue; // a stale heap entry for a tile already reached more cheaply
    if (here === goal) return pathTo(here);
    const x = here % w;
    const y = Math.floor(here / w);
    const away = (x - to.x) ** 2 + (y - to.y) ** 2;
    // first tile wins a tie, so the nearest spot is also the shortest walk
    if (away < bestDistance) {
      bestDistance = away;
      best = here;
    }
    for (const [dx, dy] of STEP) {
      const nx = x + dx;
      const ny = y + dy;
      if (!mochiCanStand(map, nx, ny, closed)) continue;
      const next = ny * w + nx;
      const cost = dist[here] + (walkable(map, nx, ny) ? PATH_COST : GROUND_COST);
      if (cost >= dist[next]) continue;
      dist[next] = cost;
      prev[next] = here;
      push(next, cost);
    }
  }
  return best === start ? null : pathTo(best);
}
