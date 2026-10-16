import { expect, test } from "vitest";
import { MAP_H, MAP_W, TILE } from "./layout";
import { VIEW_MARGIN, coveredRect, covers, overlap } from "./view";

const W = MAP_W * TILE;
const H = MAP_H * TILE;

test("the covered rect is the view in map pixels, grown by the margin", () => {
  expect(coveredRect(600, 300, 300, 240, 3)).toEqual({
    x: 200 - VIEW_MARGIN,
    y: 100 - VIEW_MARGIN,
    w: 100 + 2 * VIEW_MARGIN,
    h: 80 + 2 * VIEW_MARGIN,
  });
});

test("it shrinks to the map at both edges", () => {
  expect(coveredRect(0, 0, 300, 240, 3)).toEqual({
    x: 0,
    y: 0,
    w: 100 + 2 * VIEW_MARGIN,
    h: 80 + 2 * VIEW_MARGIN,
  });
  const far = coveredRect(W * 4, H * 4, 300, 240, 3);
  expect(far.x + far.w).toBeLessThanOrEqual(W);
  expect(far.y + far.h).toBeLessThanOrEqual(H);
  expect(far.x).toBeGreaterThanOrEqual(0);
  expect(far.y).toBeGreaterThanOrEqual(0);
});

test("a small scroll stays covered, a long one does not", () => {
  const painted = coveredRect(600, 300, 300, 240, 3);
  const moved = coveredRect(600 + 30, 300 + 30, 300, 240, 3, 0);
  expect(covers(painted, moved)).toBe(true);
  const jumped = coveredRect(600 + 400, 300, 300, 240, 3, 0);
  expect(covers(painted, jumped)).toBe(false);
});

test("overlap is false only when the rects are clear of each other", () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  expect(overlap(a, { x: 9, y: 9, w: 10, h: 10 })).toBe(true);
  expect(overlap(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  expect(overlap(a, { x: 0, y: -10, w: 10, h: 10 })).toBe(false);
});
