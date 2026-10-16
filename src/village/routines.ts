import { village, type Point } from "./layout";

export type Activity = "sweep" | "fish" | "water" | "read" | "chat" | "carry";
// One stop in a villager's day: walk to `spot`, face that way, and do `activity` there for about `seconds`.
// "carry" is shown on the walk there (a crate overhead) and ends with setting it down.
export type Job = { activity: Activity; spot: Point; facing: 1 | -1; seconds: number; when?: string }; // when: a lair id that must be cleared first

const SCHOOL_STEP: Point = village(28, 12);
const BRIDGE: Point = village(41, 18);
const GARDEN_GATE: Point = village(35, 22);
const LIBRARY_STEP: Point = village(11, 18);
const HOUSE_STEP: Point = village(13, 29);
const SQUARE_WEST: Point = village(27, 18);
const SQUARE_EAST: Point = village(29, 18);
const POND_JETTY: Point = village(50, 26); // the marsh, once it is a pond
const SHRINE_STEP: Point = village(49, 8); // the ruins, once restored
// the forest (world tiles)
const CABIN_STEP: Point = { x: 17, y: 44 };
const FOREST_HUB: Point = { x: 20, y: 46 };
const OAK_STEP: Point = { x: 7, y: 38 };
const MAZE_GATE: Point = { x: 28, y: 51 };
const DEN_STEP: Point = { x: 7, y: 53 };
// the mountains (world tiles)
const OBSERVATORY_STEP: Point = { x: 74, y: 13 };
const MOUNTAIN_HUB: Point = { x: 78, y: 14 };
const MINE_STEP: Point = { x: 11, y: 14 };
const RIDGE_STEP: Point = { x: 40, y: 11 };
const PEAK_STEP: Point = { x: 89, y: 11 };

export const ROUTINES: Record<string, Job[]> = {
  // Wren the forager, from level 8: her hut is by the bramble maze
  Wren: [
    { activity: "carry", spot: MAZE_GATE, facing: 1, seconds: 6 },
    { activity: "water", spot: DEN_STEP, facing: 1, seconds: 9 },
    { activity: "read", spot: FOREST_HUB, facing: -1, seconds: 8 },
  ],
  Ines: [
    { activity: "sweep", spot: SCHOOL_STEP, facing: 1, seconds: 9 },
    { activity: "chat", spot: SQUARE_EAST, facing: -1, seconds: 6 },
    { activity: "water", spot: GARDEN_GATE, facing: 1, seconds: 8 },
    { activity: "read", spot: SQUARE_WEST, facing: 1, seconds: 10 },
    { activity: "read", spot: SHRINE_STEP, facing: 1, seconds: 12, when: "ruins" },
  ],
  Sam: [
    { activity: "fish", spot: BRIDGE, facing: 1, seconds: 14 },
    { activity: "carry", spot: LIBRARY_STEP, facing: -1, seconds: 3 },
    { activity: "chat", spot: SQUARE_WEST, facing: 1, seconds: 6 },
    { activity: "carry", spot: HOUSE_STEP, facing: 1, seconds: 3 },
    { activity: "fish", spot: POND_JETTY, facing: 1, seconds: 14, when: "marsh" },
  ],
  Lou: [
    { activity: "carry", spot: SQUARE_EAST, facing: 1, seconds: 4 },
    { activity: "sweep", spot: SQUARE_WEST, facing: -1, seconds: 8 },
    { activity: "chat", spot: SCHOOL_STEP, facing: 1, seconds: 6 },
  ],
  Noa: [
    { activity: "sweep", spot: CABIN_STEP, facing: 1, seconds: 8 },
    { activity: "read", spot: OAK_STEP, facing: 1, seconds: 10 },
    { activity: "water", spot: MAZE_GATE, facing: -1, seconds: 8 },
    { activity: "carry", spot: DEN_STEP, facing: 1, seconds: 4 },
    { activity: "chat", spot: FOREST_HUB, facing: 1, seconds: 6 },
  ],
  Alex: [
    { activity: "read", spot: OBSERVATORY_STEP, facing: 1, seconds: 12 },
    { activity: "carry", spot: MOUNTAIN_HUB, facing: -1, seconds: 4 },
    { activity: "read", spot: RIDGE_STEP, facing: 1, seconds: 10 },
    { activity: "chat", spot: MOUNTAIN_HUB, facing: 1, seconds: 6 },
    { activity: "read", spot: PEAK_STEP, facing: -1, seconds: 12, when: "peak" },
    { activity: "carry", spot: MINE_STEP, facing: 1, seconds: 4, when: "mine" },
  ],
  Mika: [
    { activity: "water", spot: GARDEN_GATE, facing: -1, seconds: 8 },
    { activity: "fish", spot: BRIDGE, facing: -1, seconds: 12 },
    { activity: "read", spot: LIBRARY_STEP, facing: 1, seconds: 10 },
  ],
};

// Where each spot is, in words, for the villager list ("Ines, sweeping at the schoolhouse step").
const SPOT_WORDS: [Point, string][] = [
  [SCHOOL_STEP, "at the schoolhouse step"],
  [BRIDGE, "on the bridge"],
  [GARDEN_GATE, "at the garden gate"],
  [LIBRARY_STEP, "by the library"],
  [HOUSE_STEP, "by your house"],
  [SQUARE_WEST, "on the square"],
  [SQUARE_EAST, "on the square"],
  [POND_JETTY, "at the pond"],
  [SHRINE_STEP, "at the shrine"],
  [CABIN_STEP, "at the cabin step"],
  [FOREST_HUB, "on the forest path"],
  [OAK_STEP, "by the hollow oak"],
  [MAZE_GATE, "at the bramble maze"],
  [DEN_STEP, "by the old den"],
  [OBSERVATORY_STEP, "at the observatory"],
  [MOUNTAIN_HUB, "on the mountain path"],
  [MINE_STEP, "by the old mine"],
  [RIDGE_STEP, "on the windy ridge"],
  [PEAK_STEP, "at the peak"],
];
const VERBS: Record<Activity, string> = {
  sweep: "sweeping",
  fish: "fishing",
  water: "watering the flowers",
  read: "reading",
  chat: "chatting",
  carry: "carrying a crate",
};

export function describeJob(job: Job, working: boolean): string {
  const where =
    SPOT_WORDS.find(([p]) => p.x === job.spot.x && p.y === job.spot.y)?.[1] ?? "around the village";
  const to = where.replace(/^(at|on|by) /, "");
  if (!working) return job.activity === "carry" ? `carrying a crate to ${to}` : `walking to ${to}`;
  return `${VERBS[job.activity]} ${where}`;
}

export function routineFor(name: string): Job[] {
  return ROUTINES[name] ?? ROUTINES.Ines;
}

// A villager's day, with visits to the places only a beaten lair opens up.
export function jobsFor(name: string, cleared: string[]): Job[] {
  return routineFor(name).filter((job) => !job.when || cleared.includes(job.when));
}
