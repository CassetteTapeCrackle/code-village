import { readFileSync } from "node:fs";
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

test("the two eye pixels are black and can blink", () => {
  const eyes = [
    ...mochiSvg().matchAll(
      /<rect class="splash-eye" x="(\d+)" y="(\d+)" width="1" height="1" fill="([^"]+)"/g,
    ),
  ].map((m) => `${m[1]},${m[2]},${m[3]}`);
  const eye = SPRITE_COLORS.day.e;
  expect(eyes).toEqual([`4,5,${eye}`, `8,5,${eye}`]);
});

test("the blink takes its colours from the palette, not from the stylesheet", () => {
  expect(mochiSvg()).toContain(
    `style="--splash-eye:${SPRITE_COLORS.day.e};--splash-lid:${SPRITE_COLORS.day.g}"`,
  );
  const blink =
    readFileSync("src/splash/splash.css", "utf8").match(/@keyframes splash-blink \{[^@]*/)?.[0] ?? "";
  expect(blink).toContain("var(--splash-lid)");
  expect(blink).toContain("var(--splash-eye)");
  expect(blink).not.toMatch(/#[0-9a-f]{6}/i);
});

test("injectSplashMochi swaps the placeholder for the SVG", () => {
  expect(injectSplashMochi(`<div>${SPLASH_MOCHI_PLACEHOLDER}</div>`)).toBe(`<div>${mochiSvg()}</div>`);
});

test("a page without the placeholder fails the build", () => {
  expect(() => injectSplashMochi("<div></div>")).toThrow(SPLASH_MOCHI_PLACEHOLDER);
});
