import { expect, test } from "vitest";
import { MAX_LEVEL, levelFor, taskXp, xpForLevel } from "./xp";

test("task XP: 15 clean, 10 with one hint, minus 2 per extra hint, never below 4", () => {
  expect([0, 1, 2, 3, 4, 9].map(taskXp)).toEqual([15, 10, 8, 6, 4, 4]);
});

test("level n needs 50 * n * (n - 1) XP", () => {
  expect([xpForLevel(1), xpForLevel(2), xpForLevel(3), xpForLevel(4)]).toEqual([0, 100, 300, 600]);
  expect([levelFor(0), levelFor(99), levelFor(100), levelFor(299), levelFor(600)]).toEqual([1, 1, 2, 2, 4]);
});

test("levels stop at the max however much XP piles up", () => {
  expect(levelFor(xpForLevel(MAX_LEVEL) - 1)).toBe(MAX_LEVEL - 1);
  expect([levelFor(xpForLevel(MAX_LEVEL)), levelFor(1_000_000)]).toEqual([MAX_LEVEL, MAX_LEVEL]);
});
