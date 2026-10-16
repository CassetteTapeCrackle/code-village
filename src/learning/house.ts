import type { Bundle } from "../content/types";
import type { Progress } from "./types";

export type Found = { id: string; name: string };

export function lootFound(bundle: Bundle, p: Progress): Found[] {
  return bundle.lessons.filter((l) => p.lessons[l.id]).map((l) => l.loot);
}

export function trophiesWon(bundle: Bundle, p: Progress): Found[] {
  return bundle.bosses.flatMap((b) => [
    ...(p.bosses[b.id]?.wonAt ? [b.trophy] : []),
    ...(p.bosses[b.id]?.hardWonAt ? [b.hardTrophy] : []),
  ]);
}

export type Slot = { id: string; name: string; kind: "loot" | "trophy"; found: boolean };

// Every item the world can give, found or not, so empty slots hint at what is still out there.
export function collection(bundle: Bundle, p: Progress): Slot[] {
  const loot = bundle.lessons.map((l): Slot => ({
    ...l.loot,
    kind: "loot",
    found: Boolean(p.lessons[l.id]),
  }));
  const trophies = bundle.bosses.flatMap((b): Slot[] => [
    { ...b.trophy, kind: "trophy", found: Boolean(p.bosses[b.id]?.wonAt) },
    { ...b.hardTrophy, kind: "trophy", found: Boolean(p.bosses[b.id]?.hardWonAt) },
  ]);
  return [...loot, ...trophies];
}
