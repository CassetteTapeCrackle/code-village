import { describe, expect, it, test } from "vitest";
import { buildMap, PLACES, walkable } from "./layout";
import { featureLand } from "./scenery";
import {
  cliffRow,
  forestDepth,
  groundStyle,
  isBackRange,
  nearRangeHeightPx,
  rockLine,
  snowLine,
} from "./terrain";

const map = buildMap(["w1", "w2", "w3"], featureLand());

test("the lines stay in their bands", () => {
  for (let x = 0; x < 96; x++) {
    expect(snowLine(x)).toBeGreaterThanOrEqual(6.5);
    expect(snowLine(x)).toBeLessThanOrEqual(9);
    expect(rockLine(x)).toBeGreaterThan(snowLine(x) + 5);
    expect(rockLine(x)).toBeLessThan(19);
  }
});

test("the back range is solid: nothing walks or grows on it, and no door sits in it", () => {
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 96; x++) {
      if (map.tiles[y][x] === "M") {
        expect(isBackRange(x, y)).toBe(true);
        expect(walkable(map, x, y)).toBe(false);
      }
      if (isBackRange(x, y)) expect("TR").not.toContain(map.tiles[y][x]);
    }
  }
  for (const p of PLACES) expect(isBackRange(p.door.x, p.door.y), p.id).toBe(false);
});

test("every path crossing the cliff stays walkable", () => {
  for (let x = 0; x < 96; x++) {
    if ("=#".includes(map.tiles[cliffRow(x)][x])) expect(walkable(map, x, cliffRow(x))).toBe(true);
  }
});

test("the near range is tallest at the peak lair", () => {
  let best = 0;
  for (let x = 0; x < 768; x++) if (nearRangeHeightPx(x) > nearRangeHeightPx(best)) best = x;
  expect(Math.abs(best / 8 - 89.5)).toBeLessThan(2);
  for (let x = 0; x < 768; x += 7) expect(nearRangeHeightPx(x)).toBeGreaterThan(0);
});

test("the forest reaches north into the foothills and stops before the village", () => {
  expect(forestDepth(10, 45)).toBeGreaterThan(0);
  expect(forestDepth(20, 22)).toBeGreaterThan(0);
  expect(forestDepth(70, 45)).toBeLessThan(0);
  expect(forestDepth(60, 22)).toBeLessThan(0);
  expect(groundStyle(5, 2)).toBe("rock");
});

test("no tree or rock grows next to a path, a door or a building", () => {
  for (let y = 1; y < 63; y++) {
    for (let x = 1; x < 95; x++) {
      if (!"TR".includes(map.tiles[y][x])) continue;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          expect("=#PGB~", `${x},${y}`).not.toContain(map.tiles[y + dy][x + dx]);
    }
  }
});

describe("the shore", () => {
  it("answers its own ground: lawn at the top, then sand, then sea", () => {
    for (const x of [5.5, 48.5, 90.5]) {
      expect(groundStyle(x, 64.5)).toBe("village");
      expect(groundStyle(x, 74.5)).toBe("sand");
      expect(groundStyle(x, 84.5)).toBe("sea");
    }
  });
  it("leaves the forest and the village above it as they were", () => {
    expect(groundStyle(5.5, 50.5)).toBe("forest");
    expect(groundStyle(60.5, 50.5)).toBe("village");
  });
});
