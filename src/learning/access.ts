import type { Boss, Bundle } from "../content/types";
import { regularLessons } from "../content/lessons";
import type { Progress } from "./types";

function regionLessonIds(bundle: Bundle, world: string, region: string): string[] {
  return regularLessons(bundle.lessons)
    .filter((l) => l.world === world && l.region === region)
    .map((l) => l.id);
}

export function bossOpen(bundle: Bundle, p: Progress, boss: Boss): boolean {
  return regionLessonIds(bundle, boss.world, boss.region).every((id) => p.lessons[id]);
}

export function hardOpen(p: Progress, boss: Boss): boolean {
  return Boolean(p.bosses[boss.id]?.wonAt);
}
