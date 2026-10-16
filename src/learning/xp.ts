export const XP = {
  taskClean: 15,
  lesson: 20,
  review: 5,
  bossStage: 40,
  bossWin: 100,
  hardWin: 150,
  mockExam: 10,
} as const;

export function taskXp(hintsUsed: number): number {
  return hintsUsed === 0 ? XP.taskClean : Math.max(4, 12 - 2 * hintsUsed);
}

// Levels stop here for now: the map has nothing new to unlock past it (see src/village/features/levels.ts).
export const MAX_LEVEL = 11;

export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFor(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}
