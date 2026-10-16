import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import palette from "./palette.json";
import { renderPaletteCss } from "./palette-css";

test("palette.css is exactly what palette.json generates (run pnpm palette after editing the JSON)", () => {
  expect(readFileSync("src/styles/palette.css", "utf8")).toBe(renderPaletteCss(palette));
});

test("day and night define the same colours", () => {
  for (const part of ["ui", "sprite", "map"] as const) {
    expect(Object.keys(palette.night[part]).sort(), part).toEqual(Object.keys(palette.day[part]).sort());
  }
});
