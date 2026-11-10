import data from "./bundle.json";
import type { Boss, Bundle, Lesson } from "./types";

export const bundle = data as Bundle;
export const lessonById = (id: string): Lesson | undefined => bundle.lessons.find((l) => l.id === id);
export const bossById = (id: string): Boss | undefined => bundle.bosses.find((b) => b.id === id);

// Names are lower case because they usually sit mid-sentence; ids stay the key everywhere.
export function conceptName(bundle: Bundle, id: string): string {
  return bundle.concepts[id] ?? id;
}

export function capitalise(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
