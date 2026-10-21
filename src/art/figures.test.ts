import { expect, test } from "vitest";
import { SPRITE_COLORS } from "./palette";
import { FIGURES } from "./figures";

test("every figure is 10 wide and 14 tall", () => {
  for (const [name, g] of Object.entries(FIGURES)) {
    expect(g, name).toHaveLength(14);
    expect(
      g.every((row) => row.length === 10),
      name,
    ).toBe(true);
  }
});

test("every pixel has a colour by day and by night", () => {
  for (const palette of [SPRITE_COLORS.day, SPRITE_COLORS.night])
    for (const g of Object.values(FIGURES))
      for (const ch of g.join("").replaceAll(".", "")) expect(palette[ch], ch).toBeDefined();
});

test("no two figures look the same", () => {
  expect(new Set(Object.values(FIGURES).map((g) => g.join())).size).toBe(Object.keys(FIGURES).length);
});
