import { expect, test } from "vitest";
import { buildMap } from "./layout";
import { featureLand } from "./scenery";
import { groundStyle } from "./terrain";
import { bloomSpots, leafColours, seasonFor, snowCapped, windAt } from "./weather";

test("the season follows the month", () => {
  const at = (m: number): string => seasonFor(new Date(2026, m, 15));
  expect([0, 1, 2, 4, 5, 7, 8, 10, 11].map(at)).toEqual([
    "winter",
    "winter",
    "spring",
    "spring",
    "summer",
    "summer",
    "autumn",
    "autumn",
    "winter",
  ]);
});

test("the wind stays gentle and changes its mind now and then", () => {
  const dirs = new Set<number>();
  for (let t = 0; t < 600; t += 5) {
    const w = windAt(t);
    expect(w.strength).toBeGreaterThanOrEqual(0.3);
    expect(w.strength).toBeLessThanOrEqual(1);
    dirs.add(w.dir);
  }
  expect(dirs.size).toBe(2);
});

test("only a concept in full bloom spills flowers, beside the paths of its own world", () => {
  const map = buildMap(["w1", "w2", "w3"], featureLand());
  const lessons = [{ world: "w2", region: "a", concepts: ["objects"] }];
  expect(bloomSpots([{ concept: "objects", stage: "flowering" }], lessons, map)).toEqual([]);
  const spots = bloomSpots([{ concept: "objects", stage: "tree" }], lessons, map);
  expect(spots).toHaveLength(6);
  for (const s of spots)
    expect(["forest", "edge"]).toContain(groundStyle(Math.floor(s.x / 8) + 0.5, Math.floor(s.y / 8) + 0.5));
});

test("a canopy's shade turns with its leaves, so no big tree is half green in autumn or winter", () => {
  const s = { C: "orange", a: "gold", d: "brown", o: "bark" };
  const c = { snow: "snow", stone: "stone" };
  expect(leafColours("autumn", s, c).N).toBe("brown");
  expect(leafColours("winter", s, c).N).toBe("bark");
  expect(leafColours("summer", s, c).N).toBeUndefined(); // the sprite's own green shade stays
});

test("a winter tree has snow on the top of its canopy and bare twigs below, and keeps its outline and trunk", () => {
  const tree = [".kkk.", "kLlLk", "kLLLk", "kLLLk", "kLLLk", ".kok."];
  const winter = snowCapped(tree);
  expect(winter[1]).toBe("klllk"); // snow
  expect(winter[4]).toMatch(/^k[LN]{3}k$/); // twigs
  expect(winter.map((row) => row.replace(/[lLN]/g, "x"))).toEqual(
    tree.map((row) => row.replace(/[lL]/g, "x")),
  );
  expect(snowCapped(tree)).toBe(winter); // made once
});
