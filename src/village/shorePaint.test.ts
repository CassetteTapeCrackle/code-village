import { describe, expect, it } from "vitest";
import { shoreLine } from "./areas";
import { TILE } from "./grid";
import { buildMap, PLACES } from "./layout";
import { sandKey, SHORE_ROCKS, shoreGroundPainted, waterKey } from "./shorePaint";
import { groundStyle } from "./terrain";

describe("shore water", () => {
  it("deepens away from the beach", () => {
    const x = 30 * 8 + 4;
    const at = (tiles: number) => waterKey(x, Math.round((shoreLine(30.5) + tiles) * 8));
    expect(["foam", "shallow"]).toContain(at(0.1));
    expect(["deep", "deeper", "crest", "sparkle"]).toContain(at(5.5));
  });
  it("uses at least four water colours across the sea", () => {
    const keys = new Set<string>();
    for (let gy = 79 * 8; gy < 86 * 8; gy++) keys.add(waterKey(240, gy));
    expect(keys.size).toBeGreaterThanOrEqual(4);
  });
});

describe("shore sand", () => {
  it("is wet near the water and dry above", () => {
    const x = 30.5;
    expect(["wet", "wet2", "ripple", "seaweed"]).toContain(
      sandKey(x * 8, Math.round((shoreLine(x) - 0.4) * 8)),
    );
    expect(["sand", "sand2", "sand3", "grain"]).toContain(sandKey(x * 8, Math.round((shoreLine(x) - 4) * 8)));
  });
});

describe("shore ground under places", () => {
  it("follows the ground style under a place, so a lair in the sea is not a sand box", () => {
    const map = buildMap(["w1", "w2", "w3", "w4"]);
    const wreck = PLACES.find((p) => p.id === "wreck")!;
    let seaTiles = 0;
    for (let y = wreck.y; y < wreck.y + wreck.h; y++)
      for (let x = wreck.x; x < wreck.x + wreck.w; x++) {
        if (groundStyle(x + 0.5, y + 0.5) !== "sea") continue;
        seaTiles++;
        expect(map.tiles[y][x]).toBe("B");
        expect(shoreGroundPainted(map.tiles[y][x]), `${x},${y}`).toBe(true);
        expect(waterKey(x * TILE + 4, y * TILE + 4)).toMatch(
          /^(foam|shallow|shallow2|sea|deep|deeper|crest|sparkle)$/,
        );
      }
    expect(seaTiles).toBeGreaterThan(0);
  });
  it("leaves the paths, the plaza, the bridges and the gates to their own painters", () => {
    for (const tile of ["=", "#", "P", "G"]) expect(shoreGroundPainted(tile), tile).toBe(false);
  });
});

describe("shore boulders", () => {
  it("keeps every boulder on the map and near the water", () => {
    for (const [x, y, r] of SHORE_ROCKS) {
      expect(x * 8 - r).toBeGreaterThanOrEqual(0);
      expect(x * 8 + r).toBeLessThanOrEqual(96 * 8);
      expect(y * 8 + r).toBeLessThanOrEqual(86 * 8);
      expect(Math.abs(y - shoreLine(x))).toBeLessThan(6);
    }
  });
  it("puts boulders on the tide pool point and on the headland", () => {
    expect(SHORE_ROCKS.some(([x]) => x < 14)).toBe(true);
    expect(SHORE_ROCKS.filter(([x]) => x > 84).length).toBeGreaterThanOrEqual(20);
  });
});
