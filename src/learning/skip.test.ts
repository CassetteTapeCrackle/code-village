import { expect, test } from "vitest";
import { bundle as village } from "../content/bundle";
import type { Bundle } from "../content/types";
import { eventsFromProgress } from "../sync/events";
import { scoreFromEvents } from "../sync/score";
import { openWorlds } from "../worlds/registry";
import { bossState, passStages } from "./boss";
import { hardOpen } from "./access";
import { lessonTasks, passTask, useHint } from "./progress";
import { applySkip, canSkip, finalBoss } from "./skip";
import { testBundle } from "./test-bundle";
import { emptyProgress } from "./types";
import { XP } from "./xp";

const D = "2026-10-10";

test("the final boss is the last region's boss, never a hard-coded id", () => {
  expect(finalBoss(testBundle(), "w1")?.id).toBe("gradebook");
  expect(village.worlds.map((w) => finalBoss(village, w.id)?.id)).toEqual([
    "lost-satchel",
    "ranger-registry",
    "star-classifier",
  ]);
});

test("a world that arrives later gets a skip with no code change", () => {
  const bundle = testBundle();
  const w4 = { ...bundle.worlds[0], id: "w4", order: 4, regions: { a: "A", b: "B" } };
  const lateBoss = { ...bundle.bosses[0], id: "late-boss", world: "w4", region: "b" };
  const wide = { ...bundle, worlds: [...bundle.worlds, w4], bosses: [...bundle.bosses, lateBoss] };
  expect(finalBoss(wide, "w4")?.id).toBe("late-boss");
});

test("only the final boss of an open world offers a skip, once", () => {
  const bundle = testBundle();
  const final = finalBoss(bundle, "w1")!;
  expect(canSkip(bundle, emptyProgress(), final)).toBe(true);
  expect(canSkip(bundle, emptyProgress(), { ...final, id: "early", region: "a" })).toBe(false);
  expect(canSkip(village, emptyProgress(), finalBoss(village, "w2")!)).toBe(false);
  expect(canSkip(bundle, applySkip(bundle, emptyProgress(), "w1", D), final)).toBe(false);
  const awake = { ...emptyProgress(), lessons: { lists: { passedAt: D } } };
  expect(canSkip(bundle, awake, final)).toBe(false);
  const won = {
    ...emptyProgress(),
    bosses: { gradebook: { stagesPassed: [], wonAt: D, hardWonAt: null, hardChecks: 0 } },
  };
  expect(canSkip(bundle, won, final)).toBe(false);
});

function worldXp(bundle: Bundle): number {
  const tasks = bundle.lessons.flatMap(lessonTasks).length * XP.taskClean;
  const lessons = bundle.lessons.length * XP.lesson;
  const stages = bundle.bosses.flatMap((b) => b.stages).length * XP.bossStage;
  return tasks + lessons + stages + bundle.bosses.length * XP.bossWin;
}

test("a skip marks every task, lesson and boss of the world done, without hard wins", () => {
  const bundle = testBundle();
  const p = applySkip(bundle, emptyProgress(), "w1", D);
  for (const lesson of bundle.lessons) {
    expect(p.lessons[lesson.id]).toEqual({ passedAt: D });
    for (const task of lessonTasks(lesson))
      expect(p.tasks[task.id]).toEqual({
        passedAt: D,
        hintsUsed: 0,
        checks: 0,
        xpEarned: XP.taskClean,
      });
  }
  for (const boss of bundle.bosses)
    expect(bossState(p, boss.id)).toEqual({
      stagesPassed: boss.stages.map((s) => s.id),
      wonAt: D,
      hardWonAt: null,
      hardChecks: 0,
    });
  expect(p.worldsSkipped).toEqual({ w1: D });
  expect(p.xp).toBe(worldXp(bundle));
});

test("a skip pays only for the work not already done", () => {
  const bundle = testBundle();
  const vars = bundle.lessons.find((l) => l.id === "vars")!;
  let before = useHint(useHint(emptyProgress(), "vars-1"), "vars-1");
  before = passTask(before, vars, "vars-1", "2026-10-01");
  const p = applySkip(bundle, before, "w1", D);
  expect(p.xp).toBe(before.xp + worldXp(bundle) - XP.taskClean);
  expect(p.tasks["vars-1"]).toMatchObject({ passedAt: "2026-10-01", hintsUsed: 2 });
});

test("a half-fought final boss is not paid twice", () => {
  const bundle = testBundle();
  const final = finalBoss(bundle, "w1")!;
  const before = passStages(emptyProgress(), final, [final.stages[0].id], D);
  expect(applySkip(bundle, before, "w1", D).xp).toBe(worldXp(bundle));
});

test("the next world's skip works the same, with no code change", () => {
  const one = applySkip(village, emptyProgress(), "w1", D);
  const both = applySkip(village, one, "w2", D);
  for (const lesson of village.lessons.filter((l) => l.world === "w2"))
    expect(both.lessons[lesson.id]).toEqual({ passedAt: D });
  for (const boss of village.bosses.filter((b) => b.world === "w2"))
    expect(bossState(both, boss.id).wonAt).toBe(D);
  expect(openWorlds(village, both)).toContain("w3");
  expect(both.worldsSkipped).toEqual({ w1: D, w2: D });
  expect(Object.values(both.bosses).every((b) => b.hardWonAt === null)).toBe(true);
  expect(village.bosses.filter((b) => b.world !== "w3").every((boss) => hardOpen(both, boss))).toBe(true);
});

test("the client's XP and the server's score agree on a skip", () => {
  const p = applySkip(village, emptyProgress(), "w1", D);
  expect(scoreFromEvents(village, eventsFromProgress(p)).xp).toBe(p.xp);
});
