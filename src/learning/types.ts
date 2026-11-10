export type Day = string;
export type TaskProgress = { passedAt: Day | null; hintsUsed: number; checks: number; xpEarned: number };
export type PlantStage = 0 | 1 | 2 | 3;
export type Plant = { stage: PlantStage; due: Day };
export type BossProgress = {
  stagesPassed: string[];
  wonAt: Day | null;
  hardWonAt: Day | null;
  hardChecks: number;
};
export type Progress = {
  version: 1;
  xp: number;
  tasks: Record<string, TaskProgress>;
  lessons: Record<string, { passedAt: Day }>;
  plants: Record<string, Plant>;
  drafts: Record<string, string>;
  reviewLast: Record<string, string>;
  bosses: Record<string, BossProgress>;
  worldsSkipped: Record<string, Day>;
};

// New fields get an empty default here, so older version-1 saves load without a migration.
export function emptyProgress(): Progress {
  return {
    version: 1,
    xp: 0,
    tasks: {},
    lessons: {},
    plants: {},
    drafts: {},
    reviewLast: {},
    bosses: {},
    worldsSkipped: {},
  };
}
