import type { Boss } from "../content/types";
import type { BossProgress, Day, Progress } from "./types";
import { XP } from "./xp";

const untouched: BossProgress = { stagesPassed: [], wonAt: null, hardWonAt: null, hardChecks: 0 };

export function bossState(p: Progress, bossId: string): BossProgress {
  return p.bosses[bossId] ?? untouched;
}

function withBoss(p: Progress, bossId: string, change: Partial<BossProgress>): Progress {
  return { ...p, bosses: { ...p.bosses, [bossId]: { ...bossState(p, bossId), ...change } } };
}

export function bossHp(boss: Boss, state: BossProgress): { left: number; total: number } {
  const total = boss.stages.reduce((sum, s) => sum + s.hp, 0);
  const beaten = boss.stages
    .filter((s) => state.stagesPassed.includes(s.id))
    .reduce((sum, s) => sum + s.hp, 0);
  return { left: total - beaten, total };
}

export function passStages(p: Progress, boss: Boss, stageIds: string[], day: Day): Progress {
  const before = bossState(p, boss.id);
  const newlyBeaten = stageIds.filter(
    (id) => boss.stages.some((s) => s.id === id) && !before.stagesPassed.includes(id),
  );
  if (newlyBeaten.length === 0) return p;
  const stagesPassed = [...before.stagesPassed, ...newlyBeaten];
  const won = !before.wonAt && boss.stages.every((s) => stagesPassed.includes(s.id));
  // A rematch after the win is study only: it pays no XP.
  const xp = before.wonAt ? p.xp : p.xp + newlyBeaten.length * XP.bossStage + (won ? XP.bossWin : 0);
  return withBoss({ ...p, xp }, boss.id, { stagesPassed, wonAt: won ? day : before.wonAt });
}

// Refills a beaten boss's HP to fight it again for practice. The win, the trophies and the cleared lair stay,
// and the saved code goes back to the starter so the stages are solved afresh.
export function rematchBoss(p: Progress, boss: Boss): Progress {
  if (!bossState(p, boss.id).wonAt) return p;
  const drafts = Object.fromEntries(Object.entries(p.drafts).filter(([key]) => key !== `boss:${boss.id}`));
  return withBoss({ ...p, drafts }, boss.id, { stagesPassed: [] });
}

export function hardChecksLeft(boss: Boss, state: BossProgress): number {
  return Math.max(0, boss.hardChecks - state.hardChecks);
}

export function recordHardCheck(p: Progress, boss: Boss): Progress {
  return withBoss(p, boss.id, { hardChecks: bossState(p, boss.id).hardChecks + 1 });
}

// The limit is per attempt: a solo learner may always try again, but each try has to count.
export function newHardAttempt(p: Progress, boss: Boss): Progress {
  return withBoss(p, boss.id, { hardChecks: 0 });
}

export function winHard(p: Progress, boss: Boss, day: Day): Progress {
  if (bossState(p, boss.id).hardWonAt) return p;
  return withBoss({ ...p, xp: p.xp + XP.hardWin }, boss.id, { hardWonAt: day });
}
