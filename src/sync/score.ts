import { regularLessons } from "../content/lessons";
import type { Bundle } from "../content/types";
import { lessonTasks } from "../learning/progress";
import { XP, levelFor, taskXp } from "../learning/xp";
import type { SyncEvent } from "./events";

export type Score = {
  xp: number;
  level: number;
  lessons: number;
  bossesWon: number;
  hardWins: number;
  furthestWorld: string | null;
  trophies: string[];
};

export function scoreFromEvents(bundle: Bundle, events: SyncEvent[]): Score {
  let xp = 0;
  let lessons = 0;
  let bossesWon = 0;
  let hardWins = 0;
  const passedTasks = new Set<string>();
  const passedLessons = new Set<string>();
  const passedStages = new Set<string>();
  const wonBosses = new Set<string>();
  const skipped = new Set<string>();
  const trophies: string[] = [];
  // What each event id belongs to, so a skip's payment is never paid again by a later event.
  const worldOf = new Map<string, string>();
  // the tour lesson is not a world's content: a skip neither pays for it nor swallows it later
  for (const lesson of regularLessons(bundle.lessons)) {
    worldOf.set(`lesson:${lesson.id}`, lesson.world);
    for (const task of lessonTasks(lesson)) worldOf.set(`task:${task.id}`, lesson.world);
  }
  for (const boss of bundle.bosses) {
    worldOf.set(`boss:${boss.id}`, boss.world);
    for (const stage of boss.stages) worldOf.set(`stage:${boss.id}/${stage.id}`, boss.world);
  }
  const skippedAlready = (key: string): boolean => {
    const world = worldOf.get(key);
    return world !== undefined && skipped.has(world);
  };
  // A skip pays for what the earlier events did not: the same clean run, never twice, and no hard win.
  const paySkip = (worldId: string): void => {
    const worldLessons = regularLessons(bundle.lessons).filter((l) => l.world === worldId);
    for (const task of worldLessons.flatMap(lessonTasks)) {
      if (passedTasks.has(task.id)) continue;
      xp += XP.taskClean;
      passedTasks.add(task.id);
    }
    for (const lesson of worldLessons) {
      if (passedLessons.has(lesson.id)) continue;
      xp += XP.lesson;
      lessons += 1;
      passedLessons.add(lesson.id);
    }
    for (const boss of bundle.bosses.filter((b) => b.world === worldId)) {
      for (const stage of boss.stages) {
        const key = `${boss.id}/${stage.id}`;
        if (passedStages.has(key)) continue;
        xp += XP.bossStage;
        passedStages.add(key);
      }
      if (wonBosses.has(boss.id)) continue;
      xp += XP.bossWin;
      bossesWon += 1;
      wonBosses.add(boss.id);
      trophies.push(boss.trophy.name);
    }
  };
  for (const e of events) {
    if (e.kind === "task_passed") {
      if (skippedAlready(`task:${e.id}`)) continue;
      xp += e.hints === 0 ? XP.taskClean : taskXp(e.hints);
      passedTasks.add(e.id);
    } else if (e.kind === "lesson_passed") {
      if (skippedAlready(`lesson:${e.id}`)) continue;
      xp += XP.lesson;
      lessons += 1;
      passedLessons.add(e.id);
    } else if (e.kind === "boss_stage_passed") {
      if (skippedAlready(`stage:${e.id}`)) continue;
      xp += XP.bossStage;
      passedStages.add(e.id);
    } else if (e.kind === "boss_won") {
      if (skippedAlready(`boss:${e.id}`)) continue;
      xp += XP.bossWin;
      bossesWon += 1;
      wonBosses.add(e.id);
      const boss = bundle.bosses.find((b) => b.id === e.id);
      if (boss) trophies.push(boss.trophy.name);
    } else if (e.kind === "boss_hard_won") {
      xp += XP.hardWin;
      hardWins += 1;
      const boss = bundle.bosses.find((b) => b.id === e.id);
      if (boss) trophies.push(boss.hardTrophy.name);
    } else {
      skipped.add(e.id);
      paySkip(e.id);
    }
  }
  let furthestWorld: string | null = null;
  for (const lesson of bundle.lessons) {
    if (passedLessons.has(lesson.id)) furthestWorld = lesson.world;
  }
  return { xp, level: levelFor(xp), lessons, bossesWon, hardWins, furthestWorld, trophies };
}
