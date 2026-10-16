import type { Lesson, Task } from "../content/types";
import { seedPlant } from "./plants";
import type { Day, Progress, TaskProgress } from "./types";
import { XP, taskXp } from "./xp";

const blank: TaskProgress = { passedAt: null, hintsUsed: 0, checks: 0, xpEarned: 0 };

export function taskState(p: Progress, taskId: string): TaskProgress {
  return p.tasks[taskId] ?? blank;
}

function withTask(p: Progress, taskId: string, change: Partial<TaskProgress>): Progress {
  return { ...p, tasks: { ...p.tasks, [taskId]: { ...taskState(p, taskId), ...change } } };
}

export function lessonTasks(lesson: Lesson): Task[] {
  return lesson.blocks.flatMap((b) => (b.type === "task" ? [b.task] : []));
}

export function useHint(p: Progress, taskId: string): Progress {
  return withTask(p, taskId, { hintsUsed: taskState(p, taskId).hintsUsed + 1 });
}

export function recordCheck(p: Progress, taskId: string): Progress {
  return withTask(p, taskId, { checks: taskState(p, taskId).checks + 1 });
}

export function saveDraft(p: Progress, taskId: string, code: string): Progress {
  return { ...p, drafts: { ...p.drafts, [taskId]: code } };
}

export function passTask(p: Progress, lesson: Lesson, taskId: string, day: Day): Progress {
  if (taskState(p, taskId).passedAt) return p;
  const earned = taskXp(taskState(p, taskId).hintsUsed);
  let next = withTask({ ...p, xp: p.xp + earned }, taskId, { passedAt: day, xpEarned: earned });
  const allPassed = lessonTasks(lesson).every((t) => taskState(next, t.id).passedAt);
  if (allPassed && !next.lessons[lesson.id]) {
    const plants = { ...next.plants };
    for (const concept of lesson.concepts) plants[concept] ??= seedPlant(day);
    next = {
      ...next,
      xp: next.xp + XP.lesson,
      lessons: { ...next.lessons, [lesson.id]: { passedAt: day } },
      plants,
    };
  }
  return next;
}
