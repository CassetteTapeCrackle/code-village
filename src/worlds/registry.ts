import { bundle } from "../content/bundle";
import type { Bundle, World } from "../content/types";
import { trophiesWon } from "../learning/house";
import type { Progress } from "../learning/types";

// Every world, in order, from the content (content/<world>/world.toml).
export const WORLDS: World[] = bundle.worlds;

export const worldById = (id: string): World | undefined => WORLDS.find((w) => w.id === id);

export function worldOpen(world: World, trophies: string[]): boolean {
  return !world.key || trophies.includes(world.key.trophyId);
}

// Opened worlds the learner has not had a banner for yet. No record yet counts as having seen World 1 only.
export function unseenOpened(open: string[], seen: string[] | null): string[] {
  const known = seen ?? ["w1"];
  return open.filter((id) => !known.includes(id));
}

// Banners seen for worlds that are closed again (progress reset or an older backup) are forgotten.
export function forgetClosed(seen: string[], open: string[]): string[] {
  return seen.filter((id) => open.includes(id));
}

export function openWorlds(bundle: Bundle, p: Progress): string[] {
  const trophies = trophiesWon(bundle, p).map((t) => t.id);
  return WORLDS.filter((w) => worldOpen(w, trophies)).map((w) => w.id);
}
