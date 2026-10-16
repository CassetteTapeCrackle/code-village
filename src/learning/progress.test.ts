import { expect, test } from "vitest";
import type { Lesson } from "../content/types";
import { emptyProgress } from "./types";
import { passTask, recordCheck, saveDraft, taskState, useHint } from "./progress";

const task = (id: string) => ({
  type: "task" as const,
  task: {
    id,
    concept: "lists",
    kind: "write" as const,
    title: id,
    prompt: "",
    hints: ["h1", "h2"],
    gotcha: false,
    starter: "",
    tests: "",
    variants: [],
  },
});
const lesson: Lesson = {
  id: "lists",
  title: "Lists",
  world: "w1",
  region: "b",
  order: 6,
  concepts: ["lists"],
  remember: [],
  loot: { id: "slot-tray", name: "Slot Tray" },
  blocks: [{ type: "text", markdown: "x" }, task("t1"), task("t2")],
};

test("passing a task gives its XP once", () => {
  let p = passTask(emptyProgress(), lesson, "t1", "2026-10-12");
  expect(p.xp).toBe(15);
  expect(taskState(p, "t1")).toMatchObject({ passedAt: "2026-10-12", xpEarned: 15 });
  p = passTask(p, lesson, "t1", "2026-10-13");
  expect(p.xp).toBe(15);
  expect(taskState(p, "t1").passedAt).toBe("2026-10-12");
});

test("hints lower the task's XP; checks are counted", () => {
  let p = useHint(useHint(emptyProgress(), "t1"), "t1");
  p = recordCheck(recordCheck(p, "t1"), "t1");
  p = passTask(p, lesson, "t1", "2026-10-12");
  expect(taskState(p, "t1")).toMatchObject({ hintsUsed: 2, checks: 2, xpEarned: 8 });
});

test("the logic only counts hints; the UI stops offering them at hints.length", () => {
  const p = useHint(useHint(useHint(emptyProgress(), "t1"), "t1"), "t1");
  expect(taskState(p, "t1").hintsUsed).toBe(3); // the UI stops at hints.length; logic only counts
});

test("the last task passes the lesson: +20 XP and a seed per concept, once", () => {
  let p = passTask(emptyProgress(), lesson, "t1", "2026-10-12");
  expect(p.lessons.lists).toBeUndefined();
  p = passTask(p, lesson, "t2", "2026-10-12");
  expect(p.lessons.lists).toEqual({ passedAt: "2026-10-12" });
  expect(p.xp).toBe(15 + 15 + 20);
  expect(p.plants.lists).toEqual({ stage: 0, due: "2026-10-13" });
});

test("an existing plant is not reset when a lesson is passed again", () => {
  const start = { ...emptyProgress(), plants: { lists: { stage: 2 as const, due: "2026-10-20" } } };
  const p = passTask(passTask(start, lesson, "t1", "2026-10-12"), lesson, "t2", "2026-10-12");
  expect(p.plants.lists).toEqual({ stage: 2, due: "2026-10-20" });
});

test("drafts are saved per task", () => {
  expect(saveDraft(emptyProgress(), "t1", "print(1)").drafts).toEqual({ t1: "print(1)" });
});
