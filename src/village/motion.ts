import type { Point } from "./layout";

export type Actor = { x: number; y: number; path: Point[]; speed: number; facing: 1 | -1; moving: boolean };

export function actorAt(p: Point, speed: number): Actor {
  return { x: p.x, y: p.y, path: [], speed, facing: 1, moving: false };
}

// Moves an actor along its path by dt seconds; returns true on the step it arrives.
export function stepActor(a: Actor, dt: number): boolean {
  let budget = a.speed * dt;
  const hadPath = a.path.length > 0;
  while (budget > 0 && a.path.length > 0) {
    const next = a.path[0];
    const dx = next.x - a.x;
    const dy = next.y - a.y;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dx !== 0) a.facing = dx > 0 ? 1 : -1;
    if (dist <= budget) {
      a.x = next.x;
      a.y = next.y;
      a.path.shift();
      budget -= dist;
    } else {
      a.x += Math.sign(dx) * Math.min(Math.abs(dx), budget);
      a.y += Math.sign(dy) * Math.min(Math.abs(dy), Math.max(0, budget - Math.abs(dx)));
      budget = 0;
    }
  }
  a.moving = a.path.length > 0;
  return hadPath && a.path.length === 0;
}

export function tileOf(a: Actor): Point {
  return { x: Math.round(a.x), y: Math.round(a.y) };
}

// Which actor a click lands on: within half a tile sideways, and up to 1.5 tiles above its feet (its sprite).
export function actorAtPoint(actors: Actor[], x: number, y: number): number {
  return actors.findIndex((a) => Math.abs(a.x - x) <= 0.6 && y <= a.y + 0.6 && y >= a.y - 1.5);
}
