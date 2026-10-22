import { describe, expect, test } from "vitest";
import { bundle } from "./bundle";
import type { Exercise } from "./types";

const tasks = bundle.lessons.flatMap((lesson) =>
  lesson.blocks.flatMap((block) => (block.type === "task" ? [block.task] : [])),
);
const exercises: Exercise[] = tasks.flatMap((task) => [task, ...task.variants]);

describe("content bundle", () => {
  test("every task and variant carries a boolean strict flag", () => {
    expect(exercises.length).toBeGreaterThan(0);
    expect(exercises.every((exercise) => typeof exercise.strict === "boolean")).toBe(true);
  });

  test("only tasks that teach exact formatting are strict", () => {
    expect(
      exercises
        .filter((exercise) => exercise.strict)
        .map((exercise) => exercise.id)
        .sort(),
    ).toEqual([
      "comprehensions-shout-all",
      "dataclasses-sapling",
      "dunders-badge",
      "dunders-feather",
      "dunders-mushroom",
      "dunders-sign",
      "io-minutes",
      "io-receipt",
      "strings-shout",
      "strings-whisper",
    ]);
  });
});
