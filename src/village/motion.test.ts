import { expect, test } from "vitest";
import { actorAt, actorAtPoint, stepActor, tileOf } from "./motion";

test("an actor walks its path at its speed, faces where it goes, and reports arrival once", () => {
  const a = actorAt({ x: 5, y: 5 }, 2);
  a.path = [
    { x: 4, y: 5 },
    { x: 3, y: 5 },
    { x: 3, y: 6 },
  ];
  expect(stepActor(a, 0.25)).toBe(false);
  expect([a.x, a.y, a.facing, a.moving]).toEqual([4.5, 5, -1, true]);
  expect(stepActor(a, 1)).toBe(false);
  expect(tileOf(a)).toEqual({ x: 3, y: 6 });
  expect(stepActor(a, 0.5)).toBe(true);
  expect(a.moving).toBe(false);
  expect(stepActor(a, 1)).toBe(false);
});

test("a click finds the actor whose sprite it lands on", () => {
  const actors = [actorAt({ x: 3, y: 3 }, 1), actorAt({ x: 10, y: 3 }, 1)];
  expect(actorAtPoint(actors, 10.2, 2.1)).toBe(1);
  expect(actorAtPoint(actors, 3, 3.5)).toBe(0);
  expect(actorAtPoint(actors, 6, 3)).toBe(-1);
  expect(actorAtPoint(actors, 3, 0.5)).toBe(-1);
});
