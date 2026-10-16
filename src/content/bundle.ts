import data from "./bundle.json";
import type { Boss, Bundle, Lesson } from "./types";

export const bundle = data as Bundle;
export const lessonById = (id: string): Lesson | undefined => bundle.lessons.find((l) => l.id === id);
export const bossById = (id: string): Boss | undefined => bundle.bosses.find((b) => b.id === id);
