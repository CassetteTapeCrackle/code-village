import { VX, village, type Point } from "./grid";
import type { Place } from "./layout";

export type Rect = { x: number; y: number; w: number; h: number };
export type AreaStyle = "village" | "forest" | "mountains";
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
  hint: string; // shown when hovering the blocked road
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
    hint: "Fallen logs block the forest path. It is too dark beyond them. A light might help...",
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
    hint: "A rockslide blocks the mountain path. You would need a way to climb over it...",
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
];

const inRect = (r: Rect, x: number, y: number): boolean =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

function areaAt(x: number, y: number): Area | undefined {
  return AREAS.find((a) => inRect(a.rect, x, y));
}

export function styleAt(x: number, y: number): AreaStyle {
  return areaAt(x, y)?.style ?? "village";
}
