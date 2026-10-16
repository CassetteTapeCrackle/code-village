import type { Bundle } from "../content/types";
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
  const passedLessons = new Set<string>();
  const trophies: string[] = [];
  for (const e of events) {
    if (e.kind === "task_passed") {
      xp += e.hints === 0 ? XP.taskClean : taskXp(e.hints);
    } else if (e.kind === "lesson_passed") {
      xp += XP.lesson;
      lessons += 1;
      passedLessons.add(e.id);
    } else if (e.kind === "boss_stage_passed") {
      xp += XP.bossStage;
    } else if (e.kind === "boss_won") {
      xp += XP.bossWin;
      bossesWon += 1;
      const boss = bundle.bosses.find((b) => b.id === e.id);
      if (boss) trophies.push(boss.trophy.name);
    } else {
      xp += XP.hardWin;
      hardWins += 1;
      const boss = bundle.bosses.find((b) => b.id === e.id);
      if (boss) trophies.push(boss.hardTrophy.name);
    }
  }
  let furthestWorld: string | null = null;
  for (const lesson of bundle.lessons) {
    if (passedLessons.has(lesson.id)) furthestWorld = lesson.world;
  }
  return { xp, level: levelFor(xp), lessons, bossesWon, hardWins, furthestWorld, trophies };
}
