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
const skipped = (id: string): SyncEvent => ({ kind: "world_skipped", id, at: "2026-10-10" });
const stages = ["gradebook/parse", "gradebook/average", "gradebook/ranking"].map(stage);

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

const cleanRun = [
  task("vars-1"),
  task("vars-2"),
  lesson("vars"),
  task("loops-1"),
  lesson("loops"),
  task("lists-1"),
  task("lists-2"),
  lesson("lists"),
  ...stages,
  won("gradebook"),
];

test("a skip scores the same as a clean run of the world", () => {
  expect(scoreFromEvents(bundle, [...stages, skipped("w1")])).toEqual(scoreFromEvents(bundle, cleanRun));
});

test("a skip pays only for the work not already done", () => {
  const half = scoreFromEvents(bundle, [task("vars-1", 2), lesson("vars"), ...stages, skipped("w1")]);
  const clean = scoreFromEvents(bundle, cleanRun);
  expect(half.xp).toBe(clean.xp - XP.taskClean + taskXp(2));
  expect(half.lessons).toBe(clean.lessons);
  expect(half.bossesWon).toBe(clean.bossesWon);
});

test("a skip never counts as a hard win, and hard mode still pays after it", () => {
  const skip = scoreFromEvents(bundle, [...stages, skipped("w1")]);
  expect(skip.hardWins).toBe(0);
  expect(skip.trophies).toEqual(["Trophy"]);
  expect(skip.xp).toBe(
    scoreFromEvents(bundle, [...stages, skipped("w1"), hard("gradebook")]).xp - XP.hardWin,
  );
});

test("work events that arrive after their world's skip pay nothing extra", () => {
  const skip = scoreFromEvents(bundle, [...stages, skipped("w1")]);
  const late = scoreFromEvents(bundle, [...stages, skipped("w1"), task("vars-1"), lesson("vars")]);
  expect(late.xp).toBe(skip.xp);
  expect(late.lessons).toBe(skip.lessons);
});
