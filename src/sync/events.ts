import { bundle } from "../content/bundle";
import { today } from "../learning/dates";
import { emptyProgress, type Day, type Progress } from "../learning/types";
import { WORLDS } from "../worlds/registry";

export type SyncEvent =
  | { kind: "task_passed"; id: string; at: Day; hints: number; code: string }
  | { kind: "lesson_passed"; id: string; at: Day }
  | { kind: "boss_stage_passed"; id: string; at: Day }
  | { kind: "boss_won"; id: string; at: Day }
  | { kind: "boss_hard_won"; id: string; at: Day };

export const MAX_CODE_CHARS = 6000;
const KINDS: ReadonlySet<string> = new Set([
  "task_passed",
  "lesson_passed",
  "boss_stage_passed",
  "boss_won",
  "boss_hard_won",
]);

export function diffEvents(before: Progress, after: Progress): SyncEvent[] {
  const events: SyncEvent[] = [];
  for (const [id, t] of Object.entries(after.tasks)) {
    if (t.passedAt && !before.tasks[id]?.passedAt)
      events.push({
        kind: "task_passed",
        id,
        at: t.passedAt,
        hints: t.hintsUsed,
        code: (after.drafts[id] ?? "").slice(0, MAX_CODE_CHARS),
      });
  }
  for (const [id, l] of Object.entries(after.lessons)) {
    if (!before.lessons[id]) events.push({ kind: "lesson_passed", id, at: l.passedAt });
  }
  for (const [id, b] of Object.entries(after.bosses)) {
    const old = before.bosses[id];
    // a stage has no date of its own: it takes the win date, or the day it is first seen
    const at = b.wonAt ?? b.hardWonAt ?? today();
    for (const stage of b.stagesPassed) {
      if (!old?.stagesPassed.includes(stage))
        events.push({ kind: "boss_stage_passed", id: `${id}/${stage}`, at });
    }
    if (b.wonAt && !old?.wonAt) events.push({ kind: "boss_won", id, at: b.wonAt });
    if (b.hardWonAt && !old?.hardWonAt) events.push({ kind: "boss_hard_won", id, at: b.hardWonAt });
  }
  return events;
}

// A backfill reads like a playthrough: the lessons of a world, its bosses, then the next world. Without
// this, the plausibility replay rejects world 2 and 3 events that arrive before the win that opens them.
function inPlayOrder(events: SyncEvent[]): SyncEvent[] {
  const rank = new Map<string, number>();
  let n = 0;
  for (const world of WORLDS) {
    for (const lesson of bundle.lessons) {
      if (lesson.world !== world.id) continue;
      for (const block of lesson.blocks)
        if (block.type === "task") rank.set(`task_passed:${block.task.id}`, n++);
      rank.set(`lesson_passed:${lesson.id}`, n++);
    }
    for (const boss of bundle.bosses) {
      if (boss.world !== world.id) continue;
      for (const stage of boss.stages) rank.set(`boss_stage_passed:${boss.id}/${stage.id}`, n++);
      rank.set(`boss_won:${boss.id}`, n++);
      rank.set(`boss_hard_won:${boss.id}`, n++);
    }
  }
  // ids the bundle no longer knows keep their relative order at the end
  return [...events].sort(
    (a, b) => (rank.get(`${a.kind}:${a.id}`) ?? n) - (rank.get(`${b.kind}:${b.id}`) ?? n),
  );
}

export function eventsFromProgress(p: Progress): SyncEvent[] {
  return inPlayOrder(diffEvents(emptyProgress(), p));
}

export function isSyncEvent(value: unknown): value is SyncEvent {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.kind !== "string" || !KINDS.has(v.kind)) return false;
  if (typeof v.id !== "string" || v.id.length === 0 || v.id.length > 120) return false;
  if (typeof v.at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.at)) return false;
  if (v.kind !== "task_passed") return true;
  return (
    typeof v.hints === "number" &&
    Number.isInteger(v.hints) &&
    v.hints >= 0 &&
    typeof v.code === "string" &&
    v.code.length <= MAX_CODE_CHARS
  );
}
