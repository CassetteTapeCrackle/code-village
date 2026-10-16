import { walkable, type Point, type VillageMap } from "./layout";

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
