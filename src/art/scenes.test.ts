import { expect, test } from "vitest";
import { SPRITE_COLORS } from "./palette";
import * as SCENES from "./scenes";

test("every scene sprite is rectangular and every pixel has a colour by day and by night", () => {
  for (const [name, grid] of Object.entries(SCENES)) {
    expect(new Set(grid.map((r) => r.length)).size, name).toBe(1);
    for (const palette of [SPRITE_COLORS.day, SPRITE_COLORS.night]) {
      expect(
        [...new Set(grid.join(""))].filter((ch) => ch !== "." && !palette[ch]),
        name,
      ).toEqual([]);
    }
  }
});
