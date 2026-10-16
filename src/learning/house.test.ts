import { expect, test } from "vitest";
import { collection, lootFound, trophiesWon } from "./house";
import { testBundle } from "./test-bundle";
import { emptyProgress, type BossProgress } from "./types";

const D = "2026-10-12";
const won = (hard: boolean): BossProgress => ({
  stagesPassed: [],
  wonAt: D,
  hardWonAt: hard ? D : null,
  hardChecks: 0,
});

test("loot comes from passed lessons; trophies from beaten bosses; unknown bosses are ignored", () => {
  const p = {
    ...emptyProgress(),
    lessons: { lists: { passedAt: D } },
    bosses: { gradebook: won(false), gone: won(true) },
  };
  expect(lootFound(testBundle(), p)).toEqual([{ id: "lists-loot", name: "lists loot" }]);
  expect(trophiesWon(testBundle(), p).map((t) => t.id)).toEqual(["gradebook-trophy"]);
  const hard = { ...p, bosses: { gradebook: won(true) } };
  expect(trophiesWon(testBundle(), hard).map((t) => t.id)).toEqual(["gradebook-trophy", "gradebook-gold"]);
});

test("the collection lists every item in the world, marking what has been found", () => {
  const p = { ...emptyProgress(), lessons: { lists: { passedAt: D } }, bosses: { gradebook: won(false) } };
  const slots = collection(testBundle(), p);
  expect(slots.map((s) => s.id)).toEqual([
    "vars-loot",
    "loops-loot",
    "lists-loot",
    "gradebook-trophy",
    "gradebook-gold",
  ]);
  expect(slots.filter((s) => s.found).map((s) => s.id)).toEqual(["lists-loot", "gradebook-trophy"]);
});
