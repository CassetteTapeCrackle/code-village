import { expect, test } from "vitest";
import { isRainyDay, paletteFor, timeOfDay } from "./clock";
import { addDays } from "../learning/dates";

const at = (h: number, m = 0): Date => new Date(2026, 9, 13, h, m);

test("parts of the day by the local clock, edges included", () => {
  expect(
    [at(4, 59), at(5), at(6, 59), at(7), at(17, 59), at(18), at(19, 59), at(20), at(0)].map(timeOfDay),
  ).toEqual(["night", "dawn", "dawn", "day", "day", "dusk", "dusk", "night", "night"]);
});

test("the night palette covers the night only; dawn and dusk stay on the day palette", () => {
  expect((["dawn", "day", "dusk", "night"] as const).map(paletteFor)).toEqual(["day", "day", "day", "night"]);
});

test("rain is decided by the date, about one day in five", () => {
  expect(isRainyDay("2026-10-13")).toBe(isRainyDay("2026-10-13"));
  const days = Array.from({ length: 365 }, (_, i) => addDays("2026-01-01", i));
  const rainy = days.filter(isRainyDay).length;
  expect(rainy).toBeGreaterThan(50);
  expect(rainy).toBeLessThan(100);
});
