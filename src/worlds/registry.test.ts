import { describe, expect, it } from "vitest";
import { bundle } from "../content/bundle";
import { emptyProgress } from "../learning/types";
import { AREAS } from "../village/areas";
import { buildMap, walkable } from "../village/layout";
import { findPath } from "../village/paths";
import { PLACES, PLAZA } from "../village/layout";
import { WORLDS, openWorlds, worldOpen } from "./registry";

describe("worlds", () => {
  it("opens World 1 from the start and World 2 only with the Ruin Lantern", () => {
    const w2 = WORLDS.find((w) => w.id === "w2")!;
    expect(worldOpen(WORLDS[0], [])).toBe(true);
    expect(worldOpen(w2, ["quarry-key"])).toBe(false);
    expect(worldOpen(w2, ["ruin-lantern"])).toBe(true);
    expect(openWorlds(bundle, emptyProgress())).toEqual(["w1"]);
  });

  it("names a real trophy for every key whose boss is already written", () => {
    for (const w of WORLDS) {
      const boss = w.key && bundle.bosses.find((b) => b.id === w.key!.bossId);
      if (boss) expect(boss.trophy.id).toBe(w.key!.trophyId);
    }
  });

  it("puts every world's building on the map", () => {
    const places = [...PLACES, ...AREAS.flatMap((a) => a.places)];
    for (const w of WORLDS)
      expect(places.some((p) => p.id === w.building.placeId && p.world === w.id)).toBe(true);
  });

  it("gives every world after the first an area", () => {
    for (const w of WORLDS.slice(1))
      expect(AREAS.some((a) => a.id === w.area && a.world === w.id)).toBe(true);
  });
});

describe("blocked roads", () => {
  const doors = AREAS.flatMap((a) => a.places.map((p) => ({ world: a.world, id: p.id, door: p.door })));

  it.each(doors)("$id cannot be reached while $world is closed", ({ door }) => {
    expect(findPath(buildMap(["w1"]), PLAZA.center, door)).toBeNull();
  });

  it.each(doors)("$id can be reached once $world is open", ({ door }) => {
    expect(findPath(buildMap(["w1", "w2", "w3", "w4"]), PLAZA.center, door)).not.toBeNull();
  });

  it("keeps a gate tile on each closed road and opens it with the world", () => {
    for (const a of AREAS) {
      expect(walkable(buildMap(["w1"]), a.gate.x, a.gate.y)).toBe(false);
      expect(walkable(buildMap(["w1", a.world]), a.gate.x, a.gate.y)).toBe(true);
    }
  });

  it("keeps areas inside the map and apart from each other", () => {
    const map = buildMap();
    for (const a of AREAS) {
      expect(a.rect.x + a.rect.w).toBeLessThanOrEqual(map.w);
      expect(a.rect.y + a.rect.h).toBeLessThanOrEqual(map.h);
      for (const b of AREAS)
        if (a !== b)
          expect(
            a.rect.x + a.rect.w <= b.rect.x ||
              b.rect.x + b.rect.w <= a.rect.x ||
              a.rect.y + a.rect.h <= b.rect.y ||
              b.rect.y + b.rect.h <= a.rect.y,
          ).toBe(true);
    }
  });
});
