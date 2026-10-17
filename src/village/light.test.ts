import { expect, test } from "vitest";
import { PAINT_BUDGET_MS, SAMPLE_COUNT, WINDOW_COUNT, lightOverride, shouldGoLight } from "./light";

const paints = (ms: number, count = SAMPLE_COUNT * WINDOW_COUNT): number[] => Array(count).fill(ms);
const windows = (ms: number[]): number[] => ms.flatMap((x) => Array(SAMPLE_COUNT).fill(x));

test("a machine at or under the paint budget stays in normal mode", () => {
  expect(shouldGoLight(paints(PAINT_BUDGET_MS - 1))).toBe(false);
  expect(shouldGoLight(paints(PAINT_BUDGET_MS))).toBe(false); // the boundary itself is not over
});

test("a machine over the paint budget for three windows in a row goes light", () => {
  expect(shouldGoLight(paints(PAINT_BUDGET_MS + 1))).toBe(true);
});

test("one slow window among fast ones is not enough", () => {
  expect(shouldGoLight(windows([PAINT_BUDGET_MS + 10, PAINT_BUDGET_MS - 4, PAINT_BUDGET_MS - 4]))).toBe(
    false,
  );
  expect(shouldGoLight(windows([PAINT_BUDGET_MS - 4, PAINT_BUDGET_MS + 10, PAINT_BUDGET_MS - 4]))).toBe(
    false,
  );
  expect(shouldGoLight(windows([PAINT_BUDGET_MS - 4, PAINT_BUDGET_MS - 4, PAINT_BUDGET_MS + 10]))).toBe(
    false,
  );
});

test("a sustained slow stretch still goes light when the windows are uneven", () => {
  expect(shouldGoLight(windows([PAINT_BUDGET_MS + 1, PAINT_BUDGET_MS + 20, PAINT_BUDGET_MS + 1]))).toBe(true);
});

test("too few paints to judge stays in normal mode, however slow they were", () => {
  expect(shouldGoLight(paints(50, SAMPLE_COUNT * WINDOW_COUNT - 1))).toBe(false);
});

test("only the last three windows are judged", () => {
  expect(shouldGoLight([...paints(50), ...paints(1)])).toBe(false);
  expect(shouldGoLight([...paints(1), ...paints(50)])).toBe(true);
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
