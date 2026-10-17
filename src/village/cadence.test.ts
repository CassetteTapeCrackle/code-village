import { expect, test } from "vitest";
import { AMBIENT_FPS, ambientEvery, nextFrameMs } from "./cadence";

test("an ambient paint lands every other frame at 60 Hz and every fourth at 120 Hz", () => {
  expect(ambientEvery(1000 / 60)).toBe(2);
  expect(ambientEvery(1000 / 120)).toBe(4);
});

test("a 90 Hz screen paints every third frame and a 30 Hz one every frame", () => {
  expect(ambientEvery(1000 / 90)).toBe(3);
  expect(ambientEvery(1000 / 30)).toBe(1);
});

test("an uncapped or very fast display still paints at about the ambient rate", () => {
  expect(ambientEvery(1000 / 240)).toBe(8);
  expect(ambientEvery(1000 / 144)).toBe(5);
  for (const hz of [60, 90, 120, 144, 240]) {
    const paints = 1000 / ambientEvery(1000 / hz) / (1000 / hz);
    expect(paints).toBeGreaterThanOrEqual(AMBIENT_FPS - 5);
    expect(paints).toBeLessThanOrEqual(AMBIENT_FPS + 5);
  }
});

test("an unknown frame length paints every frame rather than stalling", () => {
  expect(ambientEvery(0)).toBe(1);
  expect(ambientEvery(-16)).toBe(1);
});

test("the display estimate starts at the first delta and then follows it", () => {
  expect(nextFrameMs(0, 16.7)).toBe(16.7);
  expect(nextFrameMs(16.7, 8.3)).toBeCloseTo(15.86, 2);
  expect(nextFrameMs(16.7, 0)).toBe(16.7);
});

test("a pause does not drag the display estimate down", () => {
  expect(nextFrameMs(16.7, 500)).toBe(16.7);
  expect(nextFrameMs(16.7, -4)).toBe(16.7);
});
