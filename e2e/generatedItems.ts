import { existsSync, readFileSync } from "node:fs";

// What the generated specs cover: .vet-cache/e2e-items.json (pnpm content --items-out) filtered by VET_ITEMS, a comma
// separated list of `all`, `sample` (the first task of every lesson and the first boss), `none` or item ids.
export const ITEMS_FILE = ".vet-cache/e2e-items.json";

export type TaskItem = {
  id: string;
  lesson: string;
  title: string;
  solution: string;
  starter: string;
  wrong: string | null;
  hiddenMutant: string | null;
};
export type BossItem = { id: string; title: string; solution: string; lessons: string[] };
type Items = { tasks: TaskItem[]; bosses: BossItem[] };

function read(): Items {
  return existsSync(ITEMS_FILE)
    ? (JSON.parse(readFileSync(ITEMS_FILE, "utf8")) as Items)
    : { tasks: [], bosses: [] };
}

export function chosen(spec = process.env.VET_ITEMS ?? "sample"): Items {
  const items = read();
  const tokens = new Set(
    spec
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  );
  if (tokens.has("all")) return items;
  const firstOfEachLesson = new Map<string, TaskItem>();
  for (const task of items.tasks)
    if (!firstOfEachLesson.has(task.lesson)) firstOfEachLesson.set(task.lesson, task);
  const sample = tokens.has("sample");
  return {
    tasks: items.tasks.filter((t) => tokens.has(t.id) || (sample && firstOfEachLesson.get(t.lesson) === t)),
    bosses: items.bosses.filter((b, at) => tokens.has(b.id) || (sample && at === 0)),
  };
}

export function lessons(tasks: TaskItem[]): [string, TaskItem[]][] {
  const byLesson = new Map<string, TaskItem[]>();
  for (const task of tasks) byLesson.set(task.lesson, [...(byLesson.get(task.lesson) ?? []), task]);
  return [...byLesson];
}

export const code = (path: string): string => readFileSync(path, "utf8");
