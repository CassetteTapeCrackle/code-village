import { expect, test } from "vitest";
import { AREAS, inRect } from "../areas";
import { buildMap } from "../layout";
import { FLAT_FEATURES, featureLand } from "../scenery";
import { SHORE_FEATURES, SHORE_LEVELS } from "./shore";

const START = [
  "boardwalk",
  "footbridge",
  "lighthouse-path",
  "quay",
  "long-jetty",
  "slipway",
  "broken-boat",
  "bram-hut",
  "net-rack",
  "beach-huts",
];

test("the start set is there from the start, the rest arrives with levels", () => {
  const byId = new Map(SHORE_FEATURES.map((f) => [f.id, f]));
  for (const id of START) expect(byId.get(id)?.unlock, id).toEqual({ kind: "always" });
  expect(byId.get("beach-huts-more")?.unlock).toEqual({ kind: "level", level: SHORE_LEVELS.huts });
  expect(byId.get("second-jetty")?.unlock).toEqual({ kind: "level", level: SHORE_LEVELS.jetty });
  expect(byId.get("shore-bunting")?.unlock).toEqual({ kind: "level", level: SHORE_LEVELS.bunting });
});

test("shore structures stay on the shore and standing ones keep off the paths", () => {
  const shore = AREAS.find((a) => a.id === "shore")!.rect;
  const map = buildMap(["w1", "w2", "w3", "w4"], featureLand());
  for (const f of SHORE_FEATURES)
    for (const r of f.land) {
      expect(inRect(shore, r.x, r.y) && inRect(shore, r.x + r.w - 1, r.y + r.h - 1), f.id).toBe(true);
      if (FLAT_FEATURES.has(f.id)) continue;
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++)
          expect("=#B".includes(map.tiles[y][x]), `${f.id} ${x},${y}`).toBe(false);
    }
});

test("walkers are never hidden by what lies on the ground", () => {
  for (const id of [
    "boardwalk",
    "footbridge",
    "lighthouse-path",
    "quay",
    "long-jetty",
    "second-jetty",
    "slipway",
    "broken-boat",
    "shore-bunting",
  ])
    expect(FLAT_FEATURES.has(id), id).toBe(true);
});
