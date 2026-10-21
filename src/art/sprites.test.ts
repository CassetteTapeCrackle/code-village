import { expect, test } from "vitest";
import type { Grid } from "./draw";
import { SPRITE_COLORS } from "./palette";
import { FIGURES } from "./figures";
import * as sprites from "./sprites";

const grids: [string, Grid][] = [
  ...Object.entries(sprites).filter((e): e is [string, Grid] => Array.isArray(e[1])),
  ...Object.entries(sprites.PLANT_TOPS).map(([k, g]): [string, Grid] => [`plant ${k}`, g]),
  ...Object.entries(sprites.ICONS).map(([k, g]): [string, Grid] => [`icon ${k}`, g]),
  ...Object.entries(sprites.BIG_PLANTS).map(([k, g]): [string, Grid] => [`big plant ${k}`, g]),
  ["school", sprites.building({ w: 32, h: 26, roof: "r", icon: sprites.ICONS.slate })],
  ["house", sprites.building({ w: 22, h: 20, roof: "j", icon: sprites.ICONS.heart })],
  ["small", sprites.building({ w: 12, h: 10, roof: "z" })],
];

test.each(grids)("%s is rectangular and every pixel has a colour by day and by night", (_, grid) => {
  expect(grid.length).toBeGreaterThan(0);
  expect(new Set(grid.map((row) => row.length)).size).toBe(1);
  // "f" is the flower colour, chosen per region when the garden draws; "N" is a canopy's shade, chosen by season
  const missing = [...new Set(grid.join(""))].filter(
    (ch) => !".fN".includes(ch) && !(ch in SPRITE_COLORS.day && ch in SPRITE_COLORS.night),
  );
  expect(missing).toEqual([]);
});

test("both palettes define the same characters", () => {
  expect(Object.keys(SPRITE_COLORS.night).sort()).toEqual(Object.keys(SPRITE_COLORS.day).sort());
});

test("teacher portraits are the teachers' own figures", () => {
  expect(sprites.PORTRAITS.teacher).toBe(FIGURES.Juniper);
  expect(sprites.PORTRAITS.ranger).toBe(FIGURES.Noa);
  expect(sprites.PORTRAITS.stargazer).toBe(FIGURES.Alex);
  expect(sprites.PORTRAITS.bram).toBe(FIGURES.Bram);
});
