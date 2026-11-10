export type Decor = { level: number; id: string; name: string };

// What each level adds to the village (spec 2.5: cosmetic only, never content).
export const DECOR: Decor[] = [
  { level: 2, id: "lanterns", name: "Lanterns along the main street" },
  { level: 2, id: "lou", name: "Lou the baker moves in" },
  { level: 3, id: "stall", name: "A market stall in the square" },
  { level: 3, id: "flowers", name: "Flower beds around the square" },
  { level: 4, id: "fountain", name: "A fountain in the square" },
  { level: 4, id: "ducks", name: "Ducks on the river" },
  { level: 5, id: "windmill", name: "A windmill on the hill" },
  { level: 6, id: "bunting", name: "Festival bunting over the square" },
  { level: 6, id: "mika", name: "Mika moves in" },
  // the forest, where the learner is at levels 7 to 9, then the mountains
  { level: 7, id: "brook", name: "A brook through the forest" },
  { level: 7, id: "fireflies", name: "Fireflies over the forest at night" },
  { level: 8, id: "deer", name: "Deer and rabbits in the forest glades" },
  { level: 8, id: "wren", name: "Wren the forager moves in" },
  { level: 9, id: "wheat", name: "A wheat field by the windmill" },
  { level: 9, id: "porch", name: "A porch on your house" },
  { level: 10, id: "goats", name: "Goats on the mountain crags" },
  { level: 10, id: "refuge", name: "A refuge hut on the mountain road" },
  { level: 11, id: "rope-bridge", name: "A rope bridge over the gorge" },
  { level: 11, id: "balloon", name: "A hot air balloon over the valley" },
];

export function decorFor(level: number): string[] {
  return DECOR.filter((d) => d.level <= level).map((d) => d.id);
}

export function nextDecor(level: number): Decor | null {
  return DECOR.find((d) => d.level > level) ?? null;
}

// What became new between the last level the learner saw and now.
export function newSince(seenLevel: number, level: number): Decor[] {
  return DECOR.filter((d) => d.level > seenLevel && d.level <= level);
}

export function villagersFor(level: number): string[] {
  const ids = decorFor(level);
  return [
    "Ines",
    "Sam",
    ...(ids.includes("lou") ? ["Lou"] : []),
    ...(ids.includes("mika") ? ["Mika"] : []),
    ...(ids.includes("wren") ? ["Wren"] : []),
  ];
}

// Everyone wandering the map: the level's villagers, the rangers of open worlds, the teacher, and Juniper.
export function villagerNames(level: number, open: string[]): string[] {
  return [
    ...villagersFor(level),
    ...(open.includes("w2") ? ["Noa"] : []),
    ...(open.includes("w3") ? ["Alex"] : []),
    ...(open.includes("w4") ? ["Bram"] : []),
    "Juniper",
  ];
}
