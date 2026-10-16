import type { Bundle } from "../content/types";
import { trophiesWon } from "../learning/house";
import type { Progress } from "../learning/types";

// Every world, in order. A world opens when the learner owns its key trophy (the previous world's last boss).
export type World = {
  id: string;
  name: string;
  area: string;
  building: { name: string; placeId: string };
  key: { bossId: string; trophyId: string; trophyName: string; opens: string } | null;
};

export const WORLDS: World[] = [
  {
    id: "w1",
    name: "The Village",
    area: "village",
    building: { name: "School", placeId: "school" },
    key: null,
  },
  {
    id: "w2",
    name: "The Forest",
    area: "forest",
    building: { name: "Ranger's cabin", placeId: "cabin" },
    key: {
      bossId: "lost-satchel",
      trophyId: "ruin-lantern",
      trophyName: "Ruin Lantern",
      opens: "lights the forest path",
    },
  },
  {
    id: "w3",
    name: "The Mountains",
    area: "mountains",
    building: { name: "Observatory", placeId: "observatory" },
    key: {
      bossId: "ranger-registry",
      trophyId: "ranger-badge",
      trophyName: "Ranger's Badge",
      opens: "gets you over the rockslide",
    },
  },
];

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
