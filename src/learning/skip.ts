import { regularLessons } from "../content/lessons";
import type { Boss, Bundle } from "../content/types";
import { openWorlds } from "../worlds/registry";
import { bossOpen } from "./access";
import { bossState } from "./boss";
import { seedPlant } from "./plants";
import { lessonTasks } from "./progress";
import type { Day, Progress } from "./types";
import { XP } from "./xp";

// The last region in the world's own order, and the boss that guards it. Never a hard-coded id: a world
// gets its skip as soon as its world.toml and its final region's boss exist.
export function finalBoss(bundle: Bundle, worldId: string): Boss | undefined {
  const world = bundle.worlds.find((w) => w.id === worldId);
  const region = world ? Object.keys(world.regions).at(-1) : undefined;
  return region ? bundle.bosses.find((b) => b.world === worldId && b.region === region) : undefined;
}

// A skip is for the final boss of an open world, once, and only while it is still asleep.
export function canSkip(bundle: Bundle, progress: Progress, boss: Boss): boolean {
  return (
    finalBoss(bundle, boss.world)?.id === boss.id &&
    openWorlds(bundle, progress).includes(boss.world) &&
    !bossOpen(bundle, progress, boss) &&
    !bossState(progress, boss.id).wonAt &&
    !progress.worldsSkipped[boss.world]
  );
}

// Marks a whole world as done the way a clean run would: every task, lesson and boss, its XP and its
// seeds. Work already done keeps its own XP, and hard mode is never touched.
export function applySkip(bundle: Bundle, progress: Progress, worldId: string, at: Day): Progress {
  const lessons = regularLessons(bundle.lessons).filter((l) => l.world === worldId); // the tour lesson is not the world's content
  const bosses = bundle.bosses.filter((b) => b.world === worldId);
  let xp = progress.xp;

  const tasks = { ...progress.tasks };
  for (const task of lessons.flatMap(lessonTasks)) {
    if (tasks[task.id]?.passedAt) continue;
    xp += XP.taskClean;
    tasks[task.id] = { passedAt: at, hintsUsed: 0, checks: 0, xpEarned: XP.taskClean };
  }

  const plants = { ...progress.plants };
  const nextLessons = { ...progress.lessons };
  for (const lesson of lessons) {
    if (nextLessons[lesson.id]) continue;
    xp += XP.lesson;
    nextLessons[lesson.id] = { passedAt: at };
    for (const concept of lesson.concepts) plants[concept] ??= seedPlant(at);
  }

  const nextBosses = { ...progress.bosses };
  for (const boss of bosses) {
    const before = bossState(progress, boss.id);
    const missing = boss.stages.map((s) => s.id).filter((id) => !before.stagesPassed.includes(id));
    // A rematch cleared the stages but already paid for them: fill the bar without paying again.
    if (!before.wonAt) xp += missing.length * XP.bossStage + XP.bossWin;
    nextBosses[boss.id] = {
      ...before,
      stagesPassed: [...before.stagesPassed, ...missing],
      wonAt: before.wonAt ?? at,
    };
  }

  return {
    ...progress,
    xp,
    tasks,
    lessons: nextLessons,
    plants,
    bosses: nextBosses,
    worldsSkipped: { ...progress.worldsSkipped, [worldId]: at },
  };
}
