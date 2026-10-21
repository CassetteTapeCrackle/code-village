import { VX, village, type Point } from "./grid";
import type { Place } from "./layout";
import { valueNoise } from "./noise";
import type { GroundStyle } from "./terrain";

export type Rect = { x: number; y: number; w: number; h: number };
export type AreaStyle = "village" | "forest" | "mountains" | "shore";
// One area per world. Coordinates are world tiles; the village area matches VX, VY in layout.ts.
export type Area = {
  id: string;
  world: string;
  rect: Rect;
  style: AreaStyle;
  hub: Point; // where the area's own paths start
  road: Point[]; // corner points of the road from the village into the hub, walked in order
  gate: Point; // the blocked tile on that road while the world is closed
  gateSprite: "logs" | "rocks";
  // A newer area owns its ground: terrain.ts asks it first for points inside its rect. The forest and the
  // mountains have none: terrain.ts blends them on purpose.
  ground?: (x: number, y: number) => GroundStyle;
  places: Place[];
};

export const AREAS: Area[] = [
  {
    id: "forest",
    world: "w2",
    rect: { x: 0, y: 28, w: VX, h: 36 },
    style: "forest",
    hub: { x: 20, y: 46 },
    road: [village(11, 18), { x: 20, y: 46 }], // the main street, on west past the library
    gate: village(-1, 18),
    gateSprite: "logs",
    places: [
      {
        id: "cabin",
        name: "Ranger's cabin",
        kind: "cabin",
        world: "w2",
        x: 14,
        y: 38,
        w: 7,
        h: 6,
        door: { x: 17, y: 44 },
        route: "hv",
      },
      {
        id: "oak",
        name: "The hollow oak",
        kind: "lair",
        lair: "oak",
        world: "w2",
        region: "a",
        x: 4,
        y: 32,
        w: 7,
        h: 6,
        door: { x: 7, y: 38 },
        route: "hv",
      },
      {
        id: "maze",
        name: "The bramble maze",
        kind: "lair",
        lair: "maze",
        world: "w2",
        region: "b",
        x: 24,
        y: 52,
        w: 9,
        h: 7,
        door: { x: 28, y: 51 },
        route: "hv",
      },
      {
        id: "den",
        name: "The old den",
        kind: "lair",
        lair: "den",
        world: "w2",
        region: "c",
        x: 4,
        y: 54,
        w: 7,
        h: 6,
        door: { x: 7, y: 53 },
        route: "hv",
      },
    ],
  },
  {
    id: "mountains",
    world: "w3",
    rect: { x: 0, y: 0, w: 96, h: 28 },
    style: "mountains",
    hub: { x: 78, y: 14 },
    road: [village(38, 18), village(38, -14)], // north from the street, east of the stall
    gate: village(38, -1),
    gateSprite: "rocks",
    places: [
      {
        id: "observatory",
        name: "Observatory",
        kind: "observatory",
        world: "w3",
        x: 70,
        y: 5,
        w: 8,
        h: 7,
        door: { x: 74, y: 12 },
        route: "hv",
      },
      {
        id: "mine",
        name: "The old mine",
        kind: "lair",
        lair: "mine",
        world: "w3",
        region: "a",
        x: 8,
        y: 6,
        w: 8,
        h: 7,
        door: { x: 11, y: 13 },
        route: "hv",
      },
      {
        id: "ridge",
        name: "The windy ridge",
        kind: "lair",
        lair: "ridge",
        world: "w3",
        region: "b",
        x: 36,
        y: 3,
        w: 9,
        h: 7,
        door: { x: 40, y: 10 },
        route: "hv",
      },
      {
        id: "peak",
        name: "The peak",
        kind: "lair",
        lair: "peak",
        world: "w3",
        region: "c",
        x: 86,
        y: 2,
        w: 8,
        h: 8,
        door: { x: 89, y: 10 },
        route: "hv",
      },
    ],
  },
  // World 4's shore, south of the village. Placeholder art until its own look is designed: the places use the
  // generic hall and ruins, and the river runs on into the sea.
  {
    id: "shore",
    world: "w4",
    rect: { x: 0, y: 64, w: 96, h: 22 },
    style: "shore",
    hub: { x: 68, y: 70 },
    road: [
      { x: 68, y: 57 },
      { x: 68, y: 70 },
    ], // on south from the plaza's lane
    gate: { x: 68, y: 64 },
    gateSprite: "logs",
    ground: (x, y) => (y >= seaLine(x) ? "sea" : y < duneLine(x) ? "village" : "sand"),
    places: [
      {
        id: "harbour",
        name: "Harbour",
        kind: "hall",
        world: "w4",
        x: 71,
        y: 66,
        w: 7,
        h: 6,
        door: { x: 74, y: 72 },
        route: "vh",
      },
      {
        id: "tide-pools",
        name: "The tide pools",
        kind: "lair",
        lair: "ruins",
        world: "w4",
        region: "a",
        x: 20,
        y: 70,
        w: 8,
        h: 6,
        door: { x: 24, y: 76 },
        route: "vh",
      },
      {
        id: "wreck",
        name: "The wreck",
        kind: "lair",
        lair: "ruins",
        world: "w4",
        region: "b",
        x: 40,
        y: 70,
        w: 8,
        h: 6,
        door: { x: 44, y: 76 },
        route: "vh",
      },
      {
        id: "lighthouse",
        name: "The lighthouse",
        kind: "lair",
        lair: "ruins",
        world: "w4",
        region: "c",
        x: 86,
        y: 68,
        w: 8,
        h: 8,
        door: { x: 90, y: 76 },
        route: "vh",
      },
    ],
  },
];

export const inRect = (r: Rect, x: number, y: number): boolean =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

function areaAt(x: number, y: number): Area | undefined {
  return AREAS.find((a) => inRect(a.rect, x, y));
}

export function styleAt(x: number, y: number): AreaStyle {
  return areaAt(x, y)?.style ?? "village";
}

// Where the village lawn gives way to sand (tiles): a wavy line just inside the shore.
export const duneLine = (x: number): number => 65.6 + 2.6 * valueNoise(x / 3.5, 7.7, 91);
// Where the beach meets the sea (tiles): a gently wavy line near the map's bottom.
export const seaLine = (x: number): number => 79.5 + 1.6 * valueNoise(x / 6, 4.2, 90);
