import type { Bundle } from "../content/types";
import { lootFound, trophiesWon } from "../learning/house";
import type { Progress } from "../learning/types";
import { levelFor } from "../learning/xp";

// What a change of progress is worth celebrating: XP gained, and a ribbon for each find and new level.
export type Toast = { kind: "loot" | "trophy" | "level"; text: string; item: string | null };
export type Moments = { xp: number; toasts: Toast[] };

// More news than this at once is a loaded save or a cheat, not something earned just now.
const MAX_NEWS = 3;

export function momentsBetween(bundle: Bundle, before: Progress, after: Progress): Moments {
  const had = new Set([...lootFound(bundle, before), ...trophiesWon(bundle, before)].map((f) => f.id));
  const toasts: Toast[] = [
    ...lootFound(bundle, after)
      .filter((f) => !had.has(f.id))
      .map((f): Toast => ({ kind: "loot", text: `Found: ${f.name}`, item: f.id })),
    ...trophiesWon(bundle, after)
      .filter((f) => !had.has(f.id))
      .map((f): Toast => ({ kind: "trophy", text: `Won: ${f.name}`, item: f.id })),
  ];
  const level = levelFor(after.xp);
  if (level > levelFor(before.xp))
    toasts.push({ kind: "level", text: `Level ${level}! Something new waits in the village.`, item: null });
  if (toasts.length > MAX_NEWS) return { xp: 0, toasts: [] };
  return { xp: Math.max(0, after.xp - before.xp), toasts };
}
