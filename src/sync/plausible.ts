import type { Bundle, Lesson } from "../content/types";
import { bossOpen } from "../learning/access";
import { lessonTasks } from "../learning/progress";
import { emptyProgress, type BossProgress, type Progress } from "../learning/types";
import { openWorlds } from "../worlds/registry";
import type { SyncEvent } from "./events";

export type Verdict = { event: SyncEvent; ok: true } | { event: SyncEvent; ok: false; reason: string };

function bossProgress(): BossProgress {
  return { stagesPassed: [], wonAt: null, hardWonAt: null, hardChecks: 0 };
}

export function progressFromEvents(events: SyncEvent[]): Progress {
  const p = emptyProgress();
  for (const e of events) {
    if (e.kind === "task_passed") {
      p.tasks[e.id] = { passedAt: e.at, hintsUsed: e.hints, checks: 0, xpEarned: 0 };
    } else if (e.kind === "lesson_passed") {
      p.lessons[e.id] = { passedAt: e.at };
    } else if (e.kind === "boss_stage_passed") {
      const slash = e.id.indexOf("/");
      const bossId = slash === -1 ? "" : e.id.slice(0, slash);
      const stageId = slash === -1 ? "" : e.id.slice(slash + 1);
      (p.bosses[bossId] ??= bossProgress()).stagesPassed.push(stageId);
    } else if (e.kind === "boss_won") {
      (p.bosses[e.id] ??= bossProgress()).wonAt = e.at;
    } else {
      (p.bosses[e.id] ??= bossProgress()).hardWonAt = e.at;
    }
  }
  return p;
}

function reject(
  bundle: Bundle,
  progress: Progress,
  e: SyncEvent,
  taskLesson: Map<string, Lesson>,
): string | null {
  if (e.kind === "task_passed") {
    const lesson = taskLesson.get(e.id);
    if (!lesson) return "unknown task";
    if (!openWorlds(bundle, progress).includes(lesson.world)) return "world not open";
    return null;
  }
  if (e.kind === "lesson_passed") {
    const lesson = bundle.lessons.find((l) => l.id === e.id);
    if (!lesson) return "unknown lesson";
    if (!openWorlds(bundle, progress).includes(lesson.world)) return "world not open";
    if (lessonTasks(lesson).some((t) => !progress.tasks[t.id]?.passedAt)) return "tasks not passed";
    return null;
  }
  if (e.kind === "boss_stage_passed") {
    const slash = e.id.indexOf("/");
    const bossId = slash === -1 ? "" : e.id.slice(0, slash);
    const stageId = slash === -1 ? "" : e.id.slice(slash + 1);
    const boss = bundle.bosses.find((b) => b.id === bossId);
    if (!boss) return "unknown boss";
    if (!boss.stages.some((s) => s.id === stageId)) return "unknown stage";
    if (!bossOpen(bundle, progress, boss)) return "boss not open";
    return null;
  }
  if (e.kind === "boss_won") {
    const boss = bundle.bosses.find((b) => b.id === e.id);
    if (!boss) return "unknown boss";
    const passed = progress.bosses[boss.id]?.stagesPassed ?? [];
    if (!boss.stages.every((s) => passed.includes(s.id))) return "stages missing";
    return null;
  }
  const boss = bundle.bosses.find((b) => b.id === e.id);
  if (!boss) return "unknown boss";
  if (!progress.bosses[boss.id]?.wonAt) return "not won yet";
  return null;
}

export function replay(bundle: Bundle, accepted: SyncEvent[], incoming: SyncEvent[]): Verdict[] {
  const running = [...accepted];
  const seen = new Set(accepted.map((e) => `${e.kind}:${e.id}`));
  const taskLesson = new Map<string, Lesson>();
  for (const lesson of bundle.lessons) {
    for (const t of lessonTasks(lesson)) {
      if (!taskLesson.has(t.id)) taskLesson.set(t.id, lesson);
    }
  }
  const verdicts: Verdict[] = [];
  for (const e of incoming) {
    const key = `${e.kind}:${e.id}`;
    if (seen.has(key)) {
      // resending is harmless: the database ignores the duplicate and so do we
      verdicts.push({ event: e, ok: true });
      continue;
    }
    const reason = reject(bundle, progressFromEvents(running), e, taskLesson);
    if (reason) {
      verdicts.push({ event: e, ok: false, reason });
    } else {
      running.push(e);
      seen.add(key);
      verdicts.push({ event: e, ok: true });
    }
  }
  return verdicts;
}
