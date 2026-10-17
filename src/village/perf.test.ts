import { expect, test } from "vitest";
import { paintRate, perfEnabled } from "./perf";

test("the overlay is asked for by ?perf=1 only", () => {
  expect(perfEnabled("?perf=1")).toBe(true);
  expect(perfEnabled("?a=1&perf=1")).toBe(true);
  expect(perfEnabled("?perf=0")).toBe(false);
  expect(perfEnabled("?perf=yes")).toBe(false);
  expect(perfEnabled("")).toBe(false);
});

test("the paint rate is measured from the paints in the last second", () => {
  expect(paintRate([], 5000)).toBe(0);
  expect(paintRate([2000], 5000)).toBe(0);
  expect(paintRate([4000, 4500, 5000], 5000)).toBe(2);
  expect(paintRate([3999, 4000, 4500, 5000], 5000)).toBe(2);
  expect(paintRate([1000, 2000], 5000)).toBe(0);
});

test("a steady cadence reads as its true rate, not one more", () => {
  const at = (hz: number) => Array.from({ length: hz }, (_, i) => 5000 - (hz - 1 - i) * (1000 / hz));
  expect(paintRate(at(30), 5000)).toBe(30);
  expect(paintRate(at(60), 5000)).toBe(60);
});
