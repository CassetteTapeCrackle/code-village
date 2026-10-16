import { expect, test } from "vitest";
import { bundle as village } from "../content/bundle";
import { lessonTasks } from "../learning/progress";
import { emptyProgress, type Progress } from "../learning/types";
import { testBundle } from "../learning/test-bundle";
import { eventsFromProgress, type SyncEvent } from "./events";
import { progressFromEvents, replay } from "./plausible";

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

test("a lesson passed before its tasks is rejected", () => {
  expect(replay(bundle, [], [lesson("vars")])).toEqual([
    { event: lesson("vars"), ok: false, reason: "tasks not passed" },
  ]);
});

test("a boss stage before its region's lessons is rejected", () => {
  expect(replay(bundle, [], [stage("gradebook/parse")])).toEqual([
    { event: stage("gradebook/parse"), ok: false, reason: "boss not open" },
  ]);
});

test("a boss won without all stages is rejected", () => {
  const verdicts = replay(
    bundle,
    [],
    [task("lists-1"), task("lists-2"), lesson("lists"), stage("gradebook/parse"), won("gradebook")],
  );
  expect(verdicts.map((v) => v.ok)).toEqual([true, true, true, true, false]);
  const last = verdicts[4];
  expect(last.ok ? null : last.reason).toBe("stages missing");
});

test("a hard win before the win is rejected", () => {
  expect(replay(bundle, [], [hard("gradebook")])).toEqual([
    { event: hard("gradebook"), ok: false, reason: "not won yet" },
  ]);
});

test("an unknown task id is rejected", () => {
  expect(replay(bundle, [], [task("nope")])).toEqual([
    { event: task("nope"), ok: false, reason: "unknown task" },
  ]);
});

test("a correct run is fully accepted", () => {
  const events = [
    task("vars-1"),
    task("vars-2"),
    lesson("vars"),
    task("loops-1"),
    lesson("loops"),
    task("lists-1", 2),
    task("lists-2"),
    lesson("lists"),
    stage("gradebook/parse"),
    stage("gradebook/average"),
    stage("gradebook/ranking"),
    won("gradebook"),
    hard("gradebook"),
  ];
  expect(replay(bundle, [], events).every((v) => v.ok)).toBe(true);
});

test("a duplicate of an accepted event is accepted", () => {
  expect(replay(bundle, [task("vars-1")], [task("vars-1")])).toEqual([{ event: task("vars-1"), ok: true }]);
});

test("progressFromEvents rebuilds tasks, lessons and boss stages", () => {
  const p = progressFromEvents([task("vars-1", 1), lesson("vars"), stage("gradebook/parse")]);
  expect(p.tasks["vars-1"]).toEqual({ passedAt: "2026-10-10", hintsUsed: 1, checks: 0, xpEarned: 0 });
  expect(p.lessons["vars"]).toEqual({ passedAt: "2026-10-10" });
  expect(p.bosses["gradebook"]?.stagesPassed).toEqual(["parse"]);
});

function fullProgress(): Progress {
  const p = emptyProgress();
  for (const l of village.lessons) {
    for (const t of lessonTasks(l))
      p.tasks[t.id] = { passedAt: "2026-10-15", hintsUsed: 0, checks: 0, xpEarned: 0 };
    p.lessons[l.id] = { passedAt: "2026-10-15" };
  }
  for (const b of village.bosses) {
    p.bosses[b.id] = {
      stagesPassed: b.stages.map((s) => s.id),
      wonAt: "2026-10-15",
      hardWonAt: "2026-10-15",
      hardChecks: 3,
    };
  }
  return p;
}

test("a full progress backfilled the way the browser sends it is fully accepted", () => {
  const verdicts = replay(village, [], eventsFromProgress(fullProgress()));
  const rejected = verdicts
    .filter((v) => !v.ok)
    .map((v) => (v.ok ? "" : `${v.event.kind}:${v.event.id} ${v.reason}`));
  expect(rejected).toEqual([]);
  expect(verdicts).toHaveLength(180);
});
