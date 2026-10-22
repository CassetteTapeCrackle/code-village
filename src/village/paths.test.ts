import { expect, test } from "vitest";
import type { Rect } from "./areas";
import { mochiCanStand, type VillageMap } from "./layout";
import { findWalk } from "./paths";

const mapOf = (rows: string[]): VillageMap => ({ w: rows[0].length, h: rows.length, tiles: rows });
const last = (path: { x: number; y: number }[]): { x: number; y: number } => path[path.length - 1];

test("Mochi stands on paths, grass and flowers, and nowhere a closed area keeps fogged", () => {
  const map = mapOf([".*=#P", "~BTRD", "MG.*."]);
  for (const [x, y] of [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [2, 2],
    [3, 2],
  ])
    expect(mochiCanStand(map, x, y, []), `${x},${y}`).toBe(true);
  for (const [x, y] of [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
    [0, 2],
    [1, 2],
  ])
    expect(mochiCanStand(map, x, y, []), `${x},${y}`).toBe(false);
  expect(mochiCanStand(map, 0, 0, [{ x: 0, y: 0, w: 1, h: 1 }])).toBe(false);
  expect(mochiCanStand(map, -1, 0, [])).toBe(false);
});

test("walks across grass to the clicked tile", () => {
  const map = mapOf([".....", ".....", "....."]);
  const path = findWalk(map, { x: 0, y: 1 }, { x: 3, y: 1 }, []);
  expect(path).not.toBeNull();
  expect(path![0]).toEqual({ x: 0, y: 1 });
  expect(last(path!)).toEqual({ x: 3, y: 1 });
});

test("goes around a pool and a building", () => {
  const map = mapOf(["..~..", "..B..", "....."]);
  const path = findWalk(map, { x: 0, y: 1 }, { x: 4, y: 1 }, []);
  expect(path).not.toBeNull();
  expect(last(path!)).toEqual({ x: 4, y: 1 });
  expect(path!.some((p) => map.tiles[p.y][p.x] === "~" || map.tiles[p.y][p.x] === "B")).toBe(false);
});

test("prefers the path when it is barely longer", () => {
  // across the grass: 7 steps at 1.5; the lane below: 9 steps, nearly all at 1
  const map = mapOf(["...........", "===========", "..........."]);
  const path = findWalk(map, { x: 0, y: 0 }, { x: 7, y: 0 }, []);
  expect(path).not.toBeNull();
  expect(last(path!)).toEqual({ x: 7, y: 0 });
  expect(path!.some((p) => p.y === 1)).toBe(true);
});

test("cuts across the grass when the path is much longer", () => {
  const map = mapOf(["...........", "=..........", "...........", "==========="]);
  const path = findWalk(map, { x: 0, y: 0 }, { x: 7, y: 0 }, []);
  expect(path).not.toBeNull();
  expect(path!.every((p) => p.y === 0)).toBe(true);
  expect(last(path!)).toEqual({ x: 7, y: 0 });
});

test("a click on water stops on the nearest bank", () => {
  const map = mapOf(["...~~", "...~~", "......"]);
  const path = findWalk(map, { x: 0, y: 0 }, { x: 4, y: 0 }, []);
  expect(path).not.toBeNull();
  expect(last(path!)).toEqual({ x: 2, y: 0 });
  expect(path!.some((p) => map.tiles[p.y][p.x] === "~")).toBe(false);
});

test("a click in a closed area stops outside it, and no step enters it", () => {
  const closed: Rect[] = [{ x: 3, y: 1, w: 3, h: 3 }];
  const map = mapOf(["......", "......", "......", "......", "......"]);
  const path = findWalk(map, { x: 0, y: 2 }, { x: 4, y: 2 }, closed);
  expect(path).not.toBeNull();
  expect(last(path!)).toEqual({ x: 2, y: 2 });
  expect(path!.some((p) => p.x >= 3 && p.y >= 1 && p.y <= 3)).toBe(false);
});

test("returns null when Mochi is boxed in", () => {
  const map = mapOf(["~~~~~", "~.~.~", "~~~~~"]);
  expect(findWalk(map, { x: 1, y: 1 }, { x: 3, y: 1 }, [])).toBeNull();
});
