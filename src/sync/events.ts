import { bundle } from "../content/bundle";
import { today } from "../learning/dates";
import { lessonTasks } from "../learning/progress";
import { finalBoss } from "../learning/skip";
import { emptyProgress, type Day, type Progress } from "../learning/types";
import { WORLDS } from "../worlds/registry";

export type SyncEvent =
  | { kind: "task_passed"; id: string; at: Day; hints: number; code: string }
  | { kind: "lesson_passed"; id: string; at: Day }
  | { kind: "boss_stage_passed"; id: string; at: Day }
  | { kind: "boss_won"; id: string; at: Day }
  | { kind: "boss_hard_won"; id: string; at: Day }
  | { kind: "world_skipped"; id: string; at: Day };

export const MAX_CODE_CHARS = 6000;
const KINDS: ReadonlySet<string> = new Set([
  "task_passed",
  "lesson_passed",
  "boss_stage_passed",
  "boss_won",
  "boss_hard_won",
  "world_skipped",
]);

// The world each task and lesson belongs to, for sorting a skip's work out of the other events.
function worldsOfWork(): { task: Map<string, string>; lesson: Map<string, string> } {
  const task = new Map<string, string>();
  const lesson = new Map<string, string>();
  for (const l of bundle.lessons) {
    lesson.set(l.id, l.world);
    for (const t of lessonTasks(l)) task.set(t.id, l.world);
  }
  return { task, lesson };
}

export function diffEvents(before: Progress, after: Progress): SyncEvent[] {
  const events: SyncEvent[] = [];
  const skippedWorlds = after.worldsSkipped ?? {};
  const newlySkipped = new Set(
    Object.keys(skippedWorlds).filter((world) => !(before.worldsSkipped ?? {})[world]),
  );
  const where = newlySkipped.size > 0 ? worldsOfWork() : null;
  const skipped = (world: string | undefined): boolean => world !== undefined && newlySkipped.has(world);
  for (const [id, t] of Object.entries(after.tasks)) {
    if (t.passedAt && !before.tasks[id]?.passedAt) {
      // A skip already pays for its world through world_skipped. Only a task with real work behind it
      // (a draft or hints) keeps its own event, so the server still sees its code and hint count.
      const world = where?.task.get(id);
      if (skipped(world) && t.hintsUsed === 0 && !(after.drafts[id] ?? "")) continue;
      events.push({
        kind: "task_passed",
        id,
        at: t.passedAt,
        hints: t.hintsUsed,
        code: (after.drafts[id] ?? "").slice(0, MAX_CODE_CHARS),
      });
    }
  }
  for (const [id, l] of Object.entries(after.lessons)) {
    if (before.lessons[id]) continue;
    const world = where?.lesson.get(id);
    if (skipped(world)) continue;
    events.push({ kind: "lesson_passed", id, at: l.passedAt });
  }
  for (const [id, b] of Object.entries(after.bosses)) {
    const old = before.bosses[id];
    // a stage has no date of its own: it takes the win date, or the day it is first seen
    const at = b.wonAt ?? b.hardWonAt ?? today();
    const boss = bundle.bosses.find((x) => x.id === id);
    const fromSkip = skipped(boss?.world);
    // The skip's own fight needs the final boss's stages as evidence; the rest of the world comes from
    // world_skipped, and a forged boss win must never ride along with a skip.
    if (!fromSkip || (boss && finalBoss(bundle, boss.world)?.id === boss.id)) {
      for (const stage of b.stagesPassed) {
        if (!old?.stagesPassed.includes(stage))
          events.push({ kind: "boss_stage_passed", id: `${id}/${stage}`, at });
      }
    }
    if (b.wonAt && !old?.wonAt && !fromSkip) events.push({ kind: "boss_won", id, at: b.wonAt });
    if (b.hardWonAt && !old?.hardWonAt) events.push({ kind: "boss_hard_won", id, at: b.hardWonAt });
  }
  for (const [id, at] of Object.entries(skippedWorlds)) {
    if (!(before.worldsSkipped ?? {})[id]) events.push({ kind: "world_skipped", id, at });
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
    }
    // A skip is a win: hard mode events for the world come after it.
    rank.set(`world_skipped:${world.id}`, n++);
    for (const boss of bundle.bosses) {
      if (boss.world !== world.id) continue;
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
