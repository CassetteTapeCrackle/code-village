import { describe, expect, it, test } from "vitest";
import { bossState } from "../learning/boss";
import { testBundle } from "../learning/test-bundle";
import { emptyProgress } from "../learning/types";
import { levelFor } from "../learning/xp";
import {
  missingArt,
  TOP_LEVEL,
  beatBosses,
  finishEverything,
  openWorld,
  passLessons,
  plantsDue,
  reachLevel,
} from "./cheats";
import { bundle as realBundle } from "../content/bundle";
import { openWorlds } from "../worlds/registry";

const bundle = testBundle();
const D = "2026-10-13";

test("passing lessons goes through the real rules: XP, lessons and seeds", () => {
  const p = passLessons(bundle, emptyProgress(), D, (l) => l.region === "b");
  expect(Object.keys(p.lessons)).toEqual(["lists"]);
  expect(p.plants.lists).toEqual({ stage: 0, due: "2026-10-14" });
  expect(p.xp).toBe(15 + 15 + 20);
  expect(Object.keys(passLessons(bundle, emptyProgress(), D).lessons)).toHaveLength(3);
});

test("beating bosses wins them, and hard mode too when asked", () => {
  const p = beatBosses(bundle, emptyProgress(), D, true);
  expect(bossState(p, "gradebook")).toMatchObject({ wonAt: D, hardWonAt: D });
});

test("plants can be made due or wilting, and a level reached", () => {
  const p = plantsDue(passLessons(bundle, emptyProgress(), D), D, 3);
  expect(Object.values(p.plants).every((plant) => plant.due === "2026-10-10")).toBe(true);
  expect(levelFor(reachLevel(emptyProgress(), 5).xp)).toBe(5);
});

test("opening a world beats the boss that holds its key, and nothing else", () => {
  const p = openWorld(realBundle, emptyProgress(), D, "w2")!;
  expect(openWorlds(realBundle, p)).toContain("w2");
  expect(Object.keys(p.bosses)).toEqual(["lost-satchel"]);
  expect(openWorld(realBundle, emptyProgress(), D, "w1")).toBeNull(); // the first world has no key
});

test("finishing everything passes every lesson, beats every boss on hard mode and reaches the top level", () => {
  const p = finishEverything(realBundle, emptyProgress(), D);
  expect(Object.keys(p.lessons).length).toBe(realBundle.lessons.length);
  expect(realBundle.bosses.every((b) => p.bosses[b.id]?.hardWonAt)).toBe(true);
  expect(levelFor(p.xp)).toBeGreaterThanOrEqual(TOP_LEVEL);
});

describe("missing art", () => {
  it("is empty for the shipped worlds", () => {
    expect(missingArt(realBundle)).toEqual([]);
  });

  it("lists a new world's undrawn trophies, items and teacher portrait", () => {
    const b = testBundle();
    b.worlds[0].teacher.portrait = "owl";
    expect(missingArt(b)).toEqual([
      "trophy gradebook-trophy",
      "trophy gradebook-gold",
      "item vars-loot",
      "item loops-loot",
      "item lists-loot",
      "portrait owl",
    ]);
  });
});
