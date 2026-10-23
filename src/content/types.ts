export type Exercise = {
  id: string;
  concept: string;
  title: string;
  prompt: string;
  starter: string;
  tests: string;
  // The task teaches exact output formatting, so checks compare text exactly instead of forgiving case, spacing and punctuation.
  strict?: boolean;
};

export type Task = Exercise & {
  kind: "write" | "fix" | "complete";
  hints: string[];
  gotcha: boolean;
  variants: Exercise[];
};

type Block =
  | { type: "text"; markdown: string }
  | { type: "example"; code: string; output: string }
  | { type: "predict"; code: string; output: string }
  | { type: "task"; task: Task };

export type Lesson = {
  id: string;
  title: string;
  world: string;
  region: string;
  order: number;
  // The first-visit tour lesson: it teaches, but it never counts towards a region or a boss.
  tour?: boolean;
  concepts: string[];
  remember: string[];
  loot: { id: string; name: string };
  blocks: Block[];
};

type Stage = { id: string; title: string; prompt: string; hp: number; tests: string };

export type Boss = {
  id: string;
  title: string;
  world: string;
  region: string;
  intro: string;
  starter: string;
  hardTests: string;
  hardChecks: number;
  trophy: { id: string; name: string };
  hardTrophy: { id: string; name: string };
  stages: Stage[];
};

// A world's words and wiring, from content/<world>/world.toml. Its look lives in code (src/village/areas.ts).
// It opens when the learner owns its key trophy (an earlier world's boss); the first world has no key.
export type World = {
  id: string;
  order: number;
  name: string;
  area: string;
  regions: Record<string, string>;
  building: { name: string; placeId: string };
  teacher: { name: string; portrait: string };
  key: { bossId: string; trophyId: string; trophyName: string; opens: string; gateHint: string } | null;
};

export type Bundle = {
  version: 3;
  python: string;
  concepts: Record<string, string>;
  worlds: World[];
  lessons: Lesson[];
  bosses: Boss[];
};
