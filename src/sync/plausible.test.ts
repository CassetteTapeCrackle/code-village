import { expect, test } from "vitest";
import { bundle as village } from "../content/bundle";
import { lessonTasks } from "../learning/progress";
import { applySkip } from "../learning/skip";
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
const skipped = (id: string): SyncEvent => ({ kind: "world_skipped", id, at: "2026-10-10" });

test("a lesson passed before its tasks is rejected", () => {
  expect(replay(bundle, [], [lesson("vars")])).toEqual([
    { event: lesson("vars"), ok: false, reason: "tasks not passed" },
  ]);
});

test("a non-final boss stage before its region's lessons is rejected", () => {
  const early = { ...bundle.bosses[0], id: "ledger", region: "a" };
  const withEarly = { ...bundle, bosses: [...bundle.bosses, early] };
  expect(replay(withEarly, [], [stage("ledger/parse")])).toEqual([
    { event: stage("ledger/parse"), ok: false, reason: "boss not open" },
  ]);
});

test("the final boss's stages are accepted while its region sleeps, for the skip", () => {
  expect(replay(bundle, [], [stage("gradebook/parse")])).toEqual([
    { event: stage("gradebook/parse"), ok: true },
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
  const p = progressFromEvents(bundle, [task("vars-1", 1), lesson("vars"), stage("gradebook/parse")]);
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

const finalStages = [stage("gradebook/parse"), stage("gradebook/average"), stage("gradebook/ranking")];

test("a skip is accepted once the final boss's stages are passed", () => {
  expect(replay(bundle, [], [...finalStages, skipped("w1")]).every((v) => v.ok)).toBe(true);
});

test("a skip without every final boss stage is rejected", () => {
  expect(replay(bundle, [], [skipped("w1")])).toEqual([
    { event: skipped("w1"), ok: false, reason: "final boss stages missing" },
  ]);
  const partial = replay(bundle, [], [stage("gradebook/parse"), skipped("w1")]);
  expect(partial[1].ok ? null : partial[1].reason).toBe("final boss stages missing");
});

test("a skip of a world whose road is still blocked is rejected", () => {
  expect(replay(village, [], [skipped("w2")])).toEqual([
    { event: skipped("w2"), ok: false, reason: "world not open" },
  ]);
});

test("a second skip of the same world is rejected", () => {
  const verdicts = replay(bundle, [], [...finalStages, skipped("w1"), skipped("w1")]);
  expect(verdicts.map((v) => v.ok)).toEqual([true, true, true, true, false]);
  const last = verdicts[4];
  expect(last.ok ? null : last.reason).toBe("world already skipped");
  expect(replay(bundle, [skipped("w1")], [skipped("w1")])).toEqual([
    { event: skipped("w1"), ok: false, reason: "world already skipped" },
  ]);
});

test("the next world's skip works the same", () => {
  const one = applySkip(village, emptyProgress(), "w1", "2026-10-10");
  const both = applySkip(village, one, "w2", "2026-10-10");
  const verdicts = replay(village, [], eventsFromProgress(both));
  expect(verdicts.filter((v) => !v.ok)).toEqual([]);
  expect(verdicts.some((v) => v.ok && v.event.kind === "world_skipped" && v.event.id === "w2")).toBe(true);
});
