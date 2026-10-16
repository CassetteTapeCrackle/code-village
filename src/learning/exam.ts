import type { Bundle, Exercise } from "../content/types";
import { conceptPool } from "./review";
import type { Progress } from "./types";
import { XP } from "./xp";

export type RecapLesson = { lessonId: string; title: string; remember: string[] };
export type ConceptScore = { concept: string; passed: boolean; lessonId: string | undefined };

export function worlds(bundle: Bundle): string[] {
  return [...new Set(bundle.lessons.map((l) => l.world))];
}

export function recap(bundle: Bundle, world: string): RecapLesson[] {
  return bundle.lessons
    .filter((l) => l.world === world)
    .map((l) => ({ lessonId: l.id, title: l.title, remember: l.remember }));
}

function examConcepts(bundle: Bundle, chosen: string[]): string[] {
  return [...new Set(bundle.lessons.filter((l) => chosen.includes(l.world)).flatMap((l) => l.concepts))];
}

// One exercise per concept, preferring one the learner did not just review, in a shuffled order.
export function buildExam(
  bundle: Bundle,
  p: Progress,
  chosen: string[],
  random: () => number = Math.random,
): Exercise[] {
  const picks = examConcepts(bundle, chosen).flatMap((concept) => {
    const pool = conceptPool(bundle, concept);
    const fresh = pool.filter((e) => e.id !== p.reviewLast[concept]);
    const from = fresh.length > 0 ? fresh : pool;
    return from.length > 0 ? [from[Math.floor(random() * from.length)]] : [];
  });
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks;
}

export function examResult(bundle: Bundle, exam: Exercise[], passedIds: ReadonlySet<string>): ConceptScore[] {
  return exam.map((e) => ({
    concept: e.concept,
    passed: passedIds.has(e.id),
    lessonId: bundle.lessons.find((l) => l.concepts.includes(e.concept))?.id,
  }));
}

export function finishExam(p: Progress): Progress {
  return { ...p, xp: p.xp + XP.mockExam };
}

export function formatLeft(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
