import { expect, test } from "vitest";
import { testBundle } from "../learning/test-bundle";
import { XP, levelFor, taskXp } from "../learning/xp";
import type { SyncEvent } from "./events";
import { scoreFromEvents } from "./score";

const bundle = testBundle();

const task = (id: string, hints = 0): SyncEvent => ({
  kind: "task_passed",
  id,
  at: "2026-10-10",
  hints,
  code: "",
});
const lesson = (id: string): SyncEvent => ({ kind: "lesson_passed", id, at: "2026-10-10" });
const stage = (id: string): SyncEvent => ({ kind: "boss_stage_passed", id, at: "2026-10-10" });
const won = (id: string): SyncEvent => ({ kind: "boss_won", id, at: "2026-10-10" });
const hard = (id: string): SyncEvent => ({ kind: "boss_hard_won", id, at: "2026-10-10" });

test("XP follows the game's award rules", () => {
  const score = scoreFromEvents(bundle, [
    task("vars-1", 0),
    task("vars-2", 2),
    lesson("vars"),
    stage("gradebook/parse"),
    won("gradebook"),
    hard("gradebook"),
  ]);
  expect(score.xp).toBe(XP.taskClean + taskXp(2) + XP.lesson + XP.bossStage + XP.bossWin + XP.hardWin);
  expect(score.level).toBe(levelFor(score.xp));
  expect(score.lessons).toBe(1);
  expect(score.bossesWon).toBe(1);
  expect(score.hardWins).toBe(1);
});

test("trophies name both wins", () => {
  expect(scoreFromEvents(bundle, [won("gradebook"), hard("gradebook")]).trophies).toEqual(["Trophy", "Gold"]);
});

test("furthest world follows the bundle lesson order", () => {
  expect(scoreFromEvents(bundle, []).furthestWorld).toBe(null);
  expect(scoreFromEvents(bundle, [lesson("vars")]).furthestWorld).toBe("w1");
  const wide = {
    ...bundle,
    lessons: [...bundle.lessons, { ...bundle.lessons[0], id: "peaks", world: "w2" }],
  };
  expect(scoreFromEvents(wide, [lesson("vars"), lesson("peaks")]).furthestWorld).toBe("w2");
});
