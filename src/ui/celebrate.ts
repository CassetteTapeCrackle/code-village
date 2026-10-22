import type { Bundle } from "../content/types";
import { lootFound, trophiesWon } from "../learning/house";
import type { Progress } from "../learning/types";

// What a change of progress is worth celebrating: XP gained, and a ribbon for each find.
export type Toast = { kind: "loot" | "trophy"; text: string; item: string | null };
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
  if (toasts.length > MAX_NEWS) return { xp: 0, toasts: [] };
  return { xp: Math.max(0, after.xp - before.xp), toasts };
}

// One line for a level toast: three names at most, then a count of the rest.
export function levelSummary(names: readonly string[]): string {
  const shown = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${shown} and ${names.length - 3} more` : shown;
}

// Ms. Juniper's line for a skipped world, used by the one "World cleared" moment.
export function clearedLine(bundle: Bundle, worldId: string): string {
  const name = bundle.worlds.find((w) => w.id === worldId)?.name ?? "this world";
  return `You tested out of ${name.toLowerCase()}. Every lesson here counts as done and every boss is beaten. Hard mode is still yours to win.`;
}
