// Debug shortcuts for the cheat screen. Each one goes through the real learning rules,
// so XP, loot, plants and trophies come out exactly as if the work had been done.
import type { Boss, Bundle, Lesson } from "../content/types";
import { PORTRAITS } from "../art/sprites";
import { TROPHY_SPRITES } from "../art/trophies";
import { DECOR } from "../village/decor";
import { ITEM_SPRITES } from "../village/destinies";
import { worldById } from "../worlds/registry";
import { passStages, winHard } from "../learning/boss";
import { addDays } from "../learning/dates";
import { lessonTasks, passTask } from "../learning/progress";
import type { Day, Progress } from "../learning/types";
import { xpForLevel } from "../learning/xp";

export function passLessons(
  bundle: Bundle,
  p: Progress,
  day: Day,
  which: (l: Lesson) => boolean = () => true,
): Progress {
  let next = p;
  for (const lesson of bundle.lessons.filter(which)) {
    for (const task of lessonTasks(lesson)) next = passTask(next, lesson, task.id, day);
  }
  return next;
}

export function beatBosses(
  bundle: Bundle,
  p: Progress,
  day: Day,
  hard = false,
  which: (b: Boss) => boolean = () => true,
): Progress {
  let next = p;
  for (const boss of bundle.bosses.filter(which)) {
    next = passStages(
      next,
      boss,
      boss.stages.map((s) => s.id),
      day,
    );
    if (hard) next = winHard(next, boss, day);
  }
  return next;
}

// Every plant overdue by `daysLate` (2 or more shows wilting).
export function plantsDue(p: Progress, day: Day, daysLate: number): Progress {
  const plants = Object.fromEntries(
    Object.entries(p.plants).map(([c, plant]) => [c, { ...plant, due: addDays(day, -daysLate) }]),
  );
  return { ...p, plants };
}

export function reachLevel(p: Progress, level: number): Progress {
  return { ...p, xp: Math.max(p.xp, xpForLevel(level)) };
}

// The highest level that still changes the village.
export const TOP_LEVEL = Math.max(...DECOR.map((d) => d.level));

// Opens a world the honest way: beats the boss whose trophy is its key (null when that boss is not written yet).
export function openWorld(bundle: Bundle, p: Progress, day: Day, worldId: string): Progress | null {
  const key = worldById(worldId)?.key;
  if (!key || !bundle.bosses.some((b) => b.id === key.bossId)) return null;
  return beatBosses(bundle, p, day, false, (b) => b.id === key.bossId);
}

// Every lesson passed, every boss beaten on hard mode, and the village at its top level.
export function finishEverything(bundle: Bundle, p: Progress, day: Day): Progress {
  return reachLevel(beatBosses(bundle, passLessons(bundle, p, day), day, true), TOP_LEVEL);
}

// What a world's content names but nobody has drawn yet: it shows placeholder art (star, sprout, traveller).
export function missingArt(b: Bundle): string[] {
  const trophies = b.bosses
    .flatMap((x) => [x.trophy.id, x.hardTrophy.id])
    .filter((id) => !TROPHY_SPRITES[id]);
  const items = b.lessons.map((l) => l.loot.id).filter((id) => !ITEM_SPRITES[id]);
  const portraits = b.worlds.map((w) => w.teacher.portrait).filter((id) => !PORTRAITS[id]);
  return [
    ...trophies.map((id) => `trophy ${id}`),
    ...items.map((id) => `item ${id}`),
    ...portraits.map((id) => `portrait ${id}`),
  ];
}
