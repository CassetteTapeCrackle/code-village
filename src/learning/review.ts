import type { Bundle, Exercise } from "../content/types";
import { isDue, reviewFailed, reviewPassed } from "./plants";
import type { Day, Plant, Progress } from "./types";
import { XP } from "./xp";

export const REVIEW_SESSION_SIZE = 8;
export const REVIEW_MAX_CHECKS = 3;
export type ReviewItem = { concept: string; exercise: Exercise; plant: Plant };
export type ReviewVerdict = "passed" | "failed" | "again";

export function conceptPool(bundle: Bundle, concept: string): Exercise[] {
  return bundle.lessons
    .flatMap((l) => l.blocks)
    .flatMap((b) => (b.type === "task" && b.task.concept === concept ? [b.task, ...b.task.variants] : []));
}

// The exercise after the last one used, so a review never repeats itself back to back.
export function nextExercise(pool: Exercise[], lastId: string | undefined): Exercise | undefined {
  if (pool.length === 0) return undefined;
  const last = pool.findIndex((e) => e.id === lastId);
  return pool[(last + 1) % pool.length];
}

export function dueReviews(bundle: Bundle, p: Progress, day: Day): ReviewItem[] {
  return Object.entries(p.plants)
    .filter(([, plant]) => isDue(plant, day))
    .sort(([a, pa], [b, pb]) => pa.due.localeCompare(pb.due) || a.localeCompare(b))
    .flatMap(([concept, plant]) => {
      const exercise = nextExercise(conceptPool(bundle, concept), p.reviewLast[concept]);
      return exercise ? [{ concept, exercise, plant }] : []; // a concept no longer in the content is skipped
    })
    .slice(0, REVIEW_SESSION_SIZE);
}

export function reviewVerdict(checksUsed: number, allPassed: boolean): ReviewVerdict {
  if (allPassed) return "passed";
  return checksUsed >= REVIEW_MAX_CHECKS ? "failed" : "again";
}

export function finishReview(
  p: Progress,
  concept: string,
  exerciseId: string,
  passed: boolean,
  day: Day,
): Progress {
  const plant = p.plants[concept];
  if (!plant) return p;
  return {
    ...p,
    xp: p.xp + (passed ? XP.review : 0),
    plants: { ...p.plants, [concept]: passed ? reviewPassed(plant, day) : reviewFailed(plant, day) },
    reviewLast: { ...p.reviewLast, [concept]: exerciseId },
  };
}
