import type { Rect } from "./areas";
import type { DrawEnv } from "./features/env";
import { FOREST_FEATURES } from "./features/forest";
import { FOREST_LIFE } from "./features/forestLife";
import { ITEM_SCENES } from "./features/itemScenes";
import { LEVEL_DECOR } from "./features/levelDecor";
import { LEVEL_REWARDS } from "./features/levels";
import { MOUNTAIN_FEATURES } from "./features/mountains";
import { SHORE_FEATURES } from "./features/shore";
import { SHORE_LIFE } from "./features/shoreLife";
import { HEDGEROWS, VILLAGE_LIFE } from "./features/villageLife";
import { FOREST_SCENES } from "./features/scenes/forest";
import { MOUNTAIN_SCENES } from "./features/scenes/mountains";
import { VILLAGE_SCENES } from "./features/scenes/village";
import type { Point } from "./grid";

// Things that lie on the ground, so a walker beside them is never drawn behind them (everything else stands).
export const FLAT_FEATURES: ReadonlySet<string> = new Set([
  "tarn",
  "gorge",
  "waterfall",
  "forest-trails",
  "flowers",
  "brook",
  "wheat",
  "garden-bloom",
  "lily-pads",
  "hopscotch",
  "stepping-stones",
  "reflecting-pond",
  "terraces",
  "gold-panning",
  "rowboat",
  "mushroom-ring",
  "boardwalk",
  "footbridge",
  "lighthouse-path",
  "quay",
  "long-jetty",
  "second-jetty",
  "slipway",
  "broken-boat",
  "shore-bunting",
  "towels",
  "sandcastles",
  "rowboats",
]);
export const FLAT_PLACES: ReadonlySet<string> = new Set(["marsh", "den", "quarry"]);

type Unlock = { kind: "always" } | { kind: "level"; level: number } | { kind: "item"; item: string };
// One thing on the map: the land it keeps free of trees (world tiles), when it appears, and how it is drawn.
// `at` is the tile the map's hover names, for scenes an item brings.
export type Feature = {
  id: string;
  land: Rect[];
  unlock: Unlock;
  draw: (env: DrawEnv) => void;
  afterTrees?: boolean;
  at?: Point;
  // what an item's scene became, for the New on the map banner ("a swing on the big old tree")
  label?: string;
};

// Drawn in this order: the mountains' water, level decor, village life, item scenes, then (after the trees) the forest's things.
export const FEATURES: Feature[] = [
  ...MOUNTAIN_FEATURES,
  ...FOREST_FEATURES,
  HEDGEROWS,
  ...LEVEL_DECOR,
  ...LEVEL_REWARDS,
  ...SHORE_FEATURES,
  ...SHORE_LIFE,
  ...VILLAGE_LIFE,
  ...VILLAGE_SCENES,
  ...FOREST_SCENES,
  ...MOUNTAIN_SCENES,
  ...ITEM_SCENES,
  ...FOREST_LIFE,
];

export function unlocked(f: Feature, level: number, found: ReadonlySet<string>): boolean {
  if (f.unlock.kind === "level") return level >= f.unlock.level;
  if (f.unlock.kind === "item") return found.has(f.unlock.item);
  return true;
}

// Land is kept whatever the level, so a tree never has to vanish when a decoration arrives.
export function featureLand(): Rect[] {
  return FEATURES.flatMap((f) => f.land);
}
