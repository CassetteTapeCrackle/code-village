export type Exercise = {
  id: string;
  concept: string;
  title: string;
  prompt: string;
  starter: string;
  tests: string;
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

export type Bundle = { version: 2; python: string; lessons: Lesson[]; bosses: Boss[] };
