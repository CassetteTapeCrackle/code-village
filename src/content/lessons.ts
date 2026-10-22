import type { Bundle, Lesson } from "./types";

// The tour lesson teaches, but it stays out of every lesson count, region total and boss gate.
export function regularLessons(lessons: readonly Lesson[]): Lesson[] {
  return lessons.filter((l) => !l.tour);
}

export function tourLesson(bundle: Bundle): Lesson | undefined {
  return bundle.lessons.find((l) => l.tour);
}
