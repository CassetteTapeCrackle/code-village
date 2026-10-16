import { expect, test } from "vitest";
import {
  REVIEW_SESSION_SIZE,
  conceptPool,
  dueReviews,
  finishReview,
  nextExercise,
  reviewVerdict,
} from "./review";
import { lesson, task, testBundle } from "./test-bundle";
import { emptyProgress, type Progress } from "./types";

const bundle = testBundle();
const D = "2026-10-12";
const ids = (xs: { id: string }[]): string[] => xs.map((x) => x.id);

test("a concept's pool is its tasks and their variants, in lesson order", () => {
  expect(ids(conceptPool(bundle, "lists"))).toEqual(["lists-1", "lists-1b", "lists-1c", "lists-2"]);
});

test("the next exercise is never the last one used, and wraps around", () => {
  const pool = conceptPool(bundle, "lists");
  expect(nextExercise(pool, undefined)?.id).toBe("lists-1");
  expect(nextExercise(pool, "lists-1")?.id).toBe("lists-1b");
  expect(nextExercise(pool, "lists-2")?.id).toBe("lists-1");
  expect(nextExercise([], undefined)).toBeUndefined();
});

test("due reviews: most overdue first, not-yet-due and unknown concepts left out", () => {
  const p: Progress = {
    ...emptyProgress(),
    plants: {
      lists: { stage: 1, due: "2026-10-10" },
      vars: { stage: 0, due: "2026-10-05" },
      loops: { stage: 2, due: "2026-10-20" },
      gone: { stage: 0, due: "2026-10-01" },
    },
    reviewLast: { lists: "lists-1" },
  };
  const due = dueReviews(bundle, p, D);
  expect(due.map((r) => r.concept)).toEqual(["vars", "lists"]);
  expect(due[1].exercise.id).toBe("lists-1b");
});

test("a session holds at most 8 reviews", () => {
  const big = {
    ...bundle,
    lessons: Array.from({ length: 12 }, (_, i) => lesson(`l${i}`, "a", [`c${i}`], [task(`t${i}`, `c${i}`)])),
  };
  const plants = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [`c${i}`, { stage: 0 as const, due: "2026-10-01" }]),
  );
  expect(dueReviews(big, { ...emptyProgress(), plants }, D)).toHaveLength(REVIEW_SESSION_SIZE);
});

test("a review gets 3 Checks before it counts as failed", () => {
  expect([
    reviewVerdict(1, false),
    reviewVerdict(2, false),
    reviewVerdict(3, false),
    reviewVerdict(3, true),
  ]).toEqual(["again", "again", "failed", "passed"]);
});

test("finishing a review grows or shrinks the plant, pays 5 XP on a pass, remembers the exercise", () => {
  const p: Progress = { ...emptyProgress(), plants: { lists: { stage: 1, due: D } } };
  const won = finishReview(p, "lists", "lists-1b", true, D);
  expect(won.plants.lists).toEqual({ stage: 2, due: "2026-10-19" });
  expect(won.xp).toBe(5);
  expect(won.reviewLast.lists).toBe("lists-1b");
  const lost = finishReview(p, "lists", "lists-1b", false, D);
  expect(lost.plants.lists).toEqual({ stage: 0, due: "2026-10-13" });
  expect(lost.xp).toBe(0);
  expect(finishReview(p, "gone", "x", true, D)).toBe(p);
});
