import { expect, test } from "vitest";
import { SPRITE_COLORS } from "../art/palette";
import { MOCHI } from "../art/sprites";
import { SPLASH_MOCHI_PLACEHOLDER, injectSplashMochi, mochiSvg } from "./mochi-svg";

test("one rect per Mochi pixel, coloured from the day palette", () => {
  const svg = mochiSvg();
  const pixels = MOCHI.join("").replaceAll(".", "").length;
  expect(svg.match(/<rect /g)).toHaveLength(pixels);
  expect(svg).toContain('viewBox="0 0 12 10"');
  expect(svg).toContain('shape-rendering="crispEdges"');
  expect(svg).toContain(`x="3" y="3" width="1" height="1" fill="${SPRITE_COLORS.day.W}"`);
});

test("the two eye pixels can blink", () => {
  const eyes = [...mochiSvg().matchAll(/<rect class="splash-eye" x="(\d+)" y="(\d+)"/g)].map(
    (m) => `${m[1]},${m[2]}`,
  );
  expect(eyes).toEqual(["4,5", "8,5"]);
});

test("injectSplashMochi swaps the placeholder for the SVG", () => {
  expect(injectSplashMochi(`<div>${SPLASH_MOCHI_PLACEHOLDER}</div>`)).toBe(`<div>${mochiSvg()}</div>`);
});

test("a page without the placeholder fails the build", () => {
  expect(() => injectSplashMochi("<div></div>")).toThrow(SPLASH_MOCHI_PLACEHOLDER);
});
