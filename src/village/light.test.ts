import { expect, test } from "vitest";
import { PAINT_BUDGET_MS, SAMPLE_COUNT, lightOverride, shouldGoLight } from "./light";

const paints = (ms: number, count = SAMPLE_COUNT): number[] => Array(count).fill(ms);

test("a machine at or under the paint budget stays in normal mode", () => {
  expect(shouldGoLight(paints(PAINT_BUDGET_MS - 1))).toBe(false);
  expect(shouldGoLight(paints(PAINT_BUDGET_MS))).toBe(false); // the boundary itself is not over
});

test("a machine over the paint budget goes light", () => {
  expect(shouldGoLight(paints(PAINT_BUDGET_MS + 1))).toBe(true);
});

test("too few paints to judge stays in normal mode, however slow they were", () => {
  expect(shouldGoLight(paints(50, SAMPLE_COUNT - 1))).toBe(false);
});

test("once light, a fast patch does not switch it back", () => {
  expect(shouldGoLight(paints(1), true)).toBe(true);
});

test("the dev override reads ?light=1 and ?light=0, and nothing else", () => {
  expect(lightOverride("?light=1")).toBe(true);
  expect(lightOverride("?foo=1&light=0")).toBe(false);
  expect(lightOverride("?light=yes")).toBeNull();
  expect(lightOverride("")).toBeNull();
});
