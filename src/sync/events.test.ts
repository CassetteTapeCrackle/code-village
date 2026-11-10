import { expect, test } from "vitest";
import { bundle } from "../content/bundle";
import { applySkip, finalBoss } from "../learning/skip";
import { emptyProgress, type Progress } from "../learning/types";
import { diffEvents, eventsFromProgress, isSyncEvent, MAX_CODE_CHARS } from "./events";

function played(): Progress {
  const p = emptyProgress();
  p.tasks["t1"] = { passedAt: "2026-10-01", hintsUsed: 1, checks: 3, xpEarned: 10 };
  p.tasks["t2"] = { passedAt: null, hintsUsed: 0, checks: 1, xpEarned: 0 };
  p.drafts["t1"] = "def f():\n    return 1\n";
  p.lessons["l1"] = { passedAt: "2026-10-01" };
  p.bosses["b1"] = { stagesPassed: ["s1", "s2"], wonAt: "2026-10-02", hardWonAt: null, hardChecks: 0 };
  return p;
}

test("a full offline progress becomes one event per milestone", () => {
  expect(eventsFromProgress(played())).toEqual([
    { kind: "task_passed", id: "t1", at: "2026-10-01", hints: 1, code: "def f():\n    return 1\n" },
    { kind: "lesson_passed", id: "l1", at: "2026-10-01" },
    { kind: "boss_stage_passed", id: "b1/s1", at: "2026-10-02" },
    { kind: "boss_stage_passed", id: "b1/s2", at: "2026-10-02" },
    { kind: "boss_won", id: "b1", at: "2026-10-02" },
  ]);
});

test("only what changed between two progresses is sent", () => {
  const before = played();
  const after = structuredClone(before);
  after.tasks["t2"] = { passedAt: "2026-10-03", hintsUsed: 0, checks: 2, xpEarned: 15 };
  after.bosses["b1"] = { ...after.bosses["b1"], hardWonAt: "2026-10-03" };
  expect(diffEvents(before, after).map((e) => `${e.kind}:${e.id}`)).toEqual([
    "task_passed:t2",
    "boss_hard_won:b1",
  ]);
});

test("nothing changed, nothing sent", () => {
  expect(diffEvents(played(), played())).toEqual([]);
});

test("code longer than the cap is cut", () => {
  const p = played();
  p.drafts["t1"] = "x".repeat(MAX_CODE_CHARS + 50);
  const [first] = eventsFromProgress(p);
  expect(first.kind === "task_passed" && first.code.length).toBe(MAX_CODE_CHARS);
});

test("isSyncEvent refuses junk", () => {
  expect(isSyncEvent({ kind: "lesson_passed", id: "l1", at: "2026-10-01" })).toBe(true);
  expect(isSyncEvent({ kind: "lesson_passed", id: 3, at: "2026-10-01" })).toBe(false);
  expect(isSyncEvent({ kind: "xp_granted", id: "x", at: "2026-10-01" })).toBe(false);
  expect(isSyncEvent({ kind: "task_passed", id: "t", at: "2026-10-01", hints: -1, code: "" })).toBe(false);
  expect(isSyncEvent({ kind: "world_skipped", id: "w1", at: "2026-10-01" })).toBe(true);
  expect(isSyncEvent(null)).toBe(false);
});

test("a skip sends its final boss's stages and one world_skipped, not one event per task", () => {
  const after = applySkip(bundle, emptyProgress(), "w1", "2026-10-10");
  const final = finalBoss(bundle, "w1")!;
  expect(diffEvents(emptyProgress(), after)).toEqual([
    ...final.stages.map((stage) => ({
      kind: "boss_stage_passed",
      id: `${final.id}/${stage.id}`,
      at: "2026-10-10",
    })),
    { kind: "world_skipped", id: "w1", at: "2026-10-10" },
  ]);
});
