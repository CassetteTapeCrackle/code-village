import type { Grid } from "../art/draw";

// Each lesson item's own sprite, shown in the house collection, on the wall shelf and in the item's scene.
export const ITEM_SPRITES: Record<string, Grid> = {
  "pebble-counter": ["kkkkkkk", "kroaobk", "koaorok", "kboroak", "kkkkkkk"],
  "tin-whistle": ["......k", ".....kS", "....kSk", "...kSk.", "..kSk..", ".kSk...", "kSk...."],
  "brass-compass": [".kkkkk.", "kaWWWak", "kaWrWak", "kaWkWak", "kaWbWak", "kaWWWak", ".kkkkk."],
  "knotted-rope": [".kkkk..", "khhhhk.", "khkkhk.", "khhhhkk", ".kkhhhk", "...kkk."],
  "ink-pot": ["..kk...", ".kWWk..", "kknnkk.", "knnnnk.", "knbnnk.", "kkkkkk."],
  "slot-tray": ["kkkkkkk", "kakrkbk", "kakrkbk", "kkkkkkk"],
  "slate-grid": ["kkkkkkk", "knWnWnk", "kWWWWWk", "knWnWnk", "kWWWWWk", "knWnWnk", "kkkkkkk"],
  "key-ring": [".kkk...", "ka.ak..", ".kkkk..", "..kak..", "..kakk.", "..kaak.", "...kk.."],
  "weaving-loom": ["kkkkkkk", "korbrok", "kbrbrbk", "korbrok", "kkkkkkk", "k.....k"],
  "recipe-card": ["kkkkkkk", "kWWWWrk", "kWkkkWk", "kWWWWWk", "kWkkWWk", "kkkkkkk"],
  "magnifying-glass": [".kkk...", "kiiik..", "kiWik..", "kiiik..", ".kkkok.", "....kok", ".....kk"],
  "nesting-dolls": ["....k..", "..kkrk.", ".krkrrk", "krrkrrk", "krrkrrk", "kkkkkkk"],
  // World 2, the forest
  "acorn-badge": [".kkkkk.", "kaaaaak", "kaoooak", "kaCCCak", "kaaCaak", ".kkkkk."],
  "whittled-spoon": ["..kkk..", ".khhhk.", ".khhhk.", "..kkk..", "...k...", "...h...", "...k..."],
  "twin-pinecones": [".k...k.", "kok.kok", "kCk.kCk", "kok.kok", ".k...k."],
  "shared-lantern-hook": ["kkkkkkk", "...k...", "..kak..", ".kyyyk.", ".kyyyk.", "..kkk.."],
  "bark-ledger": ["kkkkkkk", "koWWWok", "koWkWok", "koWWWok", "kkkkkkk"],
  "carved-nameplate": ["kkkkkkk", "khkhkhk", "khhhhhk", "kkkkkkk"],
  "ranked-feathers": ["..r.a.b", ".rr.aab", "r.a.b..", "k.k.k.."],
  "seed-packet": ["kkkkkk.", "kWWWWk.", "kWlLWk.", "kWLlWk.", "kWWWWk.", "kkkkkk."],
  "family-tree-sketch": ["kkkkkkk", "kWWlWWk", "kWlLlWk", "kWWoWWk", "kkkkkkk"],
  toolbelt: ["kkkkkkk", "kokSkok", "kkkkkkk"],
  "rangers-whistle": ["..kkkkk", ".kSSSSk", "kSSkSSk", ".kkkkk."],
  // World 3, the mountains
  "brass-pointer": ["...k...", "..kak..", ".kaaak.", "...a...", "...a...", "..kkk.."],
  "spring-coil": ["kSSSSSk", ".kSSSk.", "kSSSSSk", ".kSSSk.", "kSSSSSk"],
  "field-logbook": ["kkkkkkk", "kJWWWWk", "kJWkkWk", "kJWWWWk", "kJWkkWk", "kkkkkkk"],
  "survey-ledger": ["kkkkkkk", "khWWWhk", "khWbWhk", "khWbWhk", "kkkkkkk"],
  "abacus-beads": ["kkkkkkk", "krr.r.k", "k.bb.bk", "kaa.a.k", "kkkkkkk"],
  "weather-vane": ["..kak..", ".kaaak.", "...k...", "kkkkkkk", "...k...", "...k..."],
  "sorting-sieve": [".kkkkk.", "kSkSkSk", "kkSkSkk", "kSkSkSk", ".kkkkk."],
  "star-map": ["kkkkkkk", "kZyZZZk", "kZZZyZk", "kyZZZZk", "kZZyZZk", "kkkkkkk"],
  "telescope-lens": [".kkk...", "kiiik..", "kiWik..", "kiiik..", ".kkka..", "....aa."],
  "summit-pennant": ["k......", "krr....", "krrrr..", "krr....", "k......", "k......"],
};

// Where each found item goes: into the house, or into the world as a scene (a feature in scenery.ts).
// Twenty five items change the world; the other eight live in the house.
export type Destiny = { kind: "house" } | { kind: "scene"; feature: string };

const SCENES: Record<string, string> = {
  "tin-whistle": "kennel",
  "brass-compass": "compass-arrows",
  "knotted-rope": "swing",
  "ink-pot": "ink-desk",
  "slate-grid": "hopscotch",
  "key-ring": "orchard",
  "recipe-card": "bread-oven",
  "magnifying-glass": "bug-hotel",
  "twin-pinecones": "reflecting-pond",
  "shared-lantern-hook": "lantern-line",
  "bark-ledger": "trailhead",
  "carved-nameplate": "name-signs",
  "ranked-feathers": "birdhouses",
  "seed-packet": "seedlings",
  "family-tree-sketch": "young-oak",
  toolbelt: "workbench",
  "rangers-whistle": "lookout-tower",
  "brass-pointer": "sundial",
  "spring-coil": "waterwheel",
  "survey-ledger": "terraces",
  "weather-vane": "weather-vane",
  "sorting-sieve": "gold-panning",
  "star-map": "star-stones",
  "telescope-lens": "roof-telescope",
  "summit-pennant": "pennant",
};

export const DESTINIES: Record<string, Destiny> = Object.fromEntries(
  Object.keys(ITEM_SPRITES).map((id): [string, Destiny] => [
    id,
    SCENES[id] ? { kind: "scene", feature: SCENES[id] } : { kind: "house" },
  ]),
);

export const SCENE_FEATURES: string[] = Object.values(SCENES);

export type NewScene = { feature: string; name: string; label: string; at: { x: number; y: number } };

// The scenes found items brought that the player has not seen on the map yet. `seen` is null on a first visit,
// which answers null too: everything already there counts as seen, so an old save gets no flood of banners.
export function newScenes(
  lessons: readonly { loot: { id: string; name: string } }[],
  found: readonly string[],
  seen: readonly string[] | null,
  features: readonly { id: string; at?: { x: number; y: number }; label?: string }[],
): NewScene[] | null {
  if (seen === null) return null;
  return found.flatMap((id) => {
    const destiny = DESTINIES[id];
    if (destiny?.kind !== "scene" || seen.includes(destiny.feature)) return [];
    const feature = features.find((f) => f.id === destiny.feature);
    const name = lessons.find((l) => l.loot.id === id)?.loot.name;
    return feature?.at && feature.label && name
      ? [{ feature: destiny.feature, name, label: feature.label, at: feature.at }]
      : [];
  });
}
