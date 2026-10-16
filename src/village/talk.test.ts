import { expect, test } from "vitest";
import { testBundle } from "../learning/test-bundle";
import { emptyProgress, type Progress } from "../learning/types";
import { DECOR, decorFor, newSince, nextDecor, villagersFor } from "./decor";
import { SPOTS } from "./layout";
import { nudgeFor, talkContext } from "./talk";

const bundle = testBundle();
const D = "2026-10-12";
const quiet = { wilting: [], due: 0, openBoss: null, nextLesson: null };

test("a nudge names the most urgent thing first, and nothing when all is well", () => {
  const all = { wilting: ["lists"], due: 3, openBoss: "marsh" as const, nextLesson: "Loops" };
  expect(nudgeFor(all)).toMatch(/lists plant looks thirsty/);
  expect(nudgeFor({ ...all, wilting: [] })).toBe("3 plants are ready for review in the garden.");
  expect(nudgeFor({ ...all, wilting: [], due: 1 })).toBe("1 plant is ready for review in the garden.");
  expect(nudgeFor({ ...quiet, openBoss: "marsh" })).toMatch(/stirs in the marsh/);
  expect(nudgeFor({ ...quiet, nextLesson: "Loops" })).toBeNull();
});

test("the context reads the garden, the bosses and the next lesson, ignoring unknown concepts", () => {
  const p: Progress = {
    ...emptyProgress(),
    lessons: { lists: { passedAt: D } },
    plants: { lists: { stage: 1, due: "2026-10-01" }, gone: { stage: 0, due: "2026-10-01" } },
  };
  expect(talkContext(bundle, p, D)).toEqual({
    wilting: ["lists"],
    due: 1,
    openBoss: "marsh",
    nextLesson: "vars",
  });
  const won = { ...p, bosses: { gradebook: { stagesPassed: [], wonAt: D, hardWonAt: null, hardChecks: 0 } } };
  expect(talkContext(bundle, won, D).openBoss).toBeNull();
});

test("each level adds something visible, and new villagers move in", () => {
  expect(decorFor(1)).toEqual([]);
  expect(decorFor(3)).toEqual(["lanterns", "lou", "stall", "flowers"]);
  expect(decorFor(11)).toEqual(DECOR.map((d) => d.id));
  expect(nextDecor(1)?.id).toBe("lanterns");
  expect(nextDecor(11)).toBeNull(); // level 11 is the last reward for now
  expect(villagersFor(1)).toEqual(["Ines", "Sam"]);
  expect(villagersFor(6)).toEqual(["Ines", "Sam", "Lou", "Mika"]);
});

test("a level-up lists only what is new since the level last seen", () => {
  expect(newSince(2, 4).map((d) => d.id)).toEqual(["stall", "flowers", "fountain", "ducks"]);
  expect(newSince(4, 4)).toEqual([]);
});

test("every decoration has a spot for Show me, and level 7 comes after level 6", () => {
  for (const d of DECOR) expect(SPOTS[d.id], d.id).toBeDefined();
  expect(nextDecor(6)?.level).toBe(7);
  expect(villagersFor(8)).toContain("Wren");
});
