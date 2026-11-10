import { expect, test } from "vitest";
import { MAP_COLORS } from "./palette";

test("every map colour exists by day and by night", () => {
  expect(Object.keys(MAP_COLORS.night).sort()).toEqual(Object.keys(MAP_COLORS.day).sort());
});
