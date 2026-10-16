import { describe, expect, it, test } from "vitest";
import { DECOR } from "./decor";
import { SCENE_FEATURES } from "./destinies";
import { buildMap, PLACES, walkable } from "./layout";
import { brookPoints } from "./features/levels";
import { FEATURES, FLAT_FEATURES, FLAT_PLACES, featureLand, unlocked, type Feature } from "./scenery";

const byId = (id: string): Feature => {
  const f = FEATURES.find((x) => x.id === id);
  if (!f) throw new Error(`no feature ${id}`);
  return f;
};

describe("the feature catalog", () => {
  it("gives every feature its own id", () => {
    const ids = FEATURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a feature for every scene destiny, unlocked by that item, with a tile to name it", () => {
    for (const id of SCENE_FEATURES) {
      // the orchard's wall is always there; the Key Ring opens its gate
      if (id !== "orchard") expect(byId(id).unlock.kind, id).toBe("item");
      expect(byId(id).at, id).toBeDefined();
      expect(byId(id).label, id).toBeTruthy();
    }
  });

  it("draws every level decoration that lives on the static map, at its level", () => {
    for (const id of ["lanterns", "stall", "flowers", "fountain", "windmill", "bunting"]) {
      expect(byId(id).unlock, id).toEqual({ kind: "level", level: DECOR.find((d) => d.id === id)?.level });
    }
  });

  it("unlocks by level, by item, or always", () => {
    const none = new Set<string>();
    expect(unlocked(byId("stall"), 2, none)).toBe(false);
    expect(unlocked(byId("stall"), 3, none)).toBe(true);
    expect(unlocked(byId("swing"), 11, none)).toBe(false);
    expect(unlocked(byId("swing"), 1, new Set(["knotted-rope"]))).toBe(true);
    expect(unlocked(byId("big-tree"), 1, none)).toBe(true);
  });
});

describe("reserved land", () => {
  it("keeps every feature's land free of trees, paths, water and buildings at any level", () => {
    const map = buildMap(["w1", "w2", "w3"], featureLand());
    for (const r of featureLand()) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++)
          expect(["D", "=", "B", "#", "P"], `${x},${y}`).toContain(map.tiles[y][x]);
      }
    }
    const withLand = FEATURES.filter((f) => f.land.length > 0).map((f) => f.id);
    expect(withLand).toEqual(
      expect.arrayContaining([
        "tarn",
        "ancient-oaks",
        "orchard",
        "stall",
        "windmill",
        "notice-board",
        "well",
        "big-tree",
        "forest-woodpile",
        "mushroom-ring",
      ]),
    );
  });

  it("draws the forest's things after the trees", () => {
    expect(FEATURES.filter((f) => f.afterTrees).map((f) => f.id)).toEqual([
      "ancient-oaks",
      "forest-woodpile",
      "stumps",
      "birdhouse",
      "mushroom-ring",
    ]);
  });
});

test("the orchard's land is kept whole for its wall and trees", () => {
  const map = buildMap(["w1", "w2", "w3"], featureLand());
  for (let y = 29; y < 34; y++) for (let x = 71; x < 77; x++) expect(map.tiles[y][x], `${x},${y}`).toBe("D");
});

test("no scene's hover tile is a path, a building or water", () => {
  const map = buildMap(["w1", "w2", "w3"], featureLand());
  for (const id of SCENE_FEATURES) {
    const at = byId(id).at!;
    // the desk and the roof telescope are drawn on their buildings, so their tile may be one
    const forbidden = id === "ink-desk" || id === "roof-telescope" ? "=#PG~" : "=#PGB~";
    expect(forbidden, id).not.toContain(map.tiles[at.y][at.x]);
  }
});

test("the brook only crosses the forest road, never a door, a building or another path", () => {
  const map = buildMap(["w1", "w2", "w3"], featureLand());
  for (const p of brookPoints()) {
    const ty = Math.floor(p.y / 8);
    const t = map.tiles[ty][Math.floor(p.x / 8)];
    if (ty !== 46) expect("=#PGB", `${p.x},${p.y}`).not.toContain(t);
  }
});

test("every flat id names a real feature or place, so a renamed one cannot slip back to standing", () => {
  const ids = new Set(FEATURES.map((f) => f.id));
  expect([...FLAT_FEATURES].filter((id) => !ids.has(id))).toEqual([]);
  expect([...FLAT_PLACES].filter((id) => !PLACES.some((p) => p.id === id))).toEqual([]);
});

test("no standing place has a walkable tile inside it, so one feet line per place is enough", () => {
  const map = buildMap(["w1", "w2", "w3"], featureLand());
  const inside = PLACES.filter((p) => !FLAT_PLACES.has(p.id)).flatMap((p) =>
    Array.from({ length: p.w * p.h }, (_, i) => ({
      id: p.id,
      x: p.x + (i % p.w),
      y: p.y + Math.floor(i / p.w),
    })),
  );
  expect(inside.filter((t) => walkable(map, t.x, t.y)).map((t) => `${t.id} ${t.x},${t.y}`)).toEqual([]);
});
