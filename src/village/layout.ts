import { TILE, VX, VY, village, type Point } from "./grid";

export { TILE, VX, VY, village, type Point };
import { AREAS, styleAt, type Rect } from "./areas";
import { forestGrowth, groundStyle, isBackRange, mountainGrowth, riverTiles, villageGrowth } from "./terrain";

type PlaceKind = "school" | "cabin" | "observatory" | "library" | "house" | "garden" | "lair" | "hall";
export type Lair = "quarry" | "marsh" | "ruins";
export type Place = {
  id: string;
  name: string;
  kind: PlaceKind;
  world: string;
  region?: string;
  lair?: string; // which lair art: the village ones follow LAIRS by region
  x: number;
  y: number;
  w: number;
  h: number;
  door: Point;
  route: "hv" | "vh"; // street first then up/down, or down first then along
};
export type VillageMap = { w: number; h: number; tiles: string[] };

export const MAP_W = 96;
export const MAP_H = 86; // rows 64 and on are World 4's shore
export const STREET_Y = VY + 18;
// The bridge columns: the river runs straight where the roads cross it (see riverCenterPx in terrain.ts).
export const RIVER_X = [VX + 41, VX + 42];
const PLAZA_CENTER = village(28, 18);
export const PLAZA = { ...village(26, 17), w: 5, h: 3, center: PLAZA_CENTER };
export const LAIRS: Record<string, Lair> = { a: "quarry", b: "marsh", c: "ruins" };

// Where "Show me" points the map after a level-up.
export const SPOTS: Record<string, Point> = {
  lanterns: village(14, 17),
  lou: PLAZA_CENTER,
  stall: village(34, 15),
  flowers: PLAZA_CENTER,
  fountain: PLAZA_CENTER,
  ducks: village(41, 9),
  windmill: village(16, 4),
  bunting: PLAZA_CENTER,
  mika: PLAZA_CENTER,
  brook: { x: 25, y: 40 },
  fireflies: { x: 14, y: 40 },
  deer: { x: 27, y: 38 },
  wren: { x: 36, y: 50 },
  wheat: { x: 61, y: 31 },
  porch: { x: 51, y: 57 },
  goats: { x: 28, y: 11 },
  refuge: { x: 59, y: 11 },
  "rope-bridge": { x: 81, y: 11 },
  balloon: { x: 63, y: 22 },
};

// Village places in village tiles, shifted into world tiles below.
const VILLAGE_PLACES: Omit<Place, "world">[] = [
  {
    id: "school",
    name: "School",
    kind: "school",
    x: 24,
    y: 6,
    w: 8,
    h: 6,
    door: { x: 28, y: 12 },
    route: "hv",
  },
  {
    id: "library",
    name: "Library",
    kind: "library",
    x: 8,
    y: 12,
    w: 7,
    h: 6,
    door: { x: 11, y: 18 },
    route: "hv",
  },
  {
    id: "house",
    name: "Your house",
    kind: "house",
    x: 10,
    y: 24,
    w: 6,
    h: 5,
    door: { x: 13, y: 29 },
    route: "vh",
  },
  {
    id: "garden",
    name: "Garden",
    kind: "garden",
    x: 31,
    y: 23,
    w: 8,
    h: 7,
    door: { x: 35, y: 22 },
    route: "hv",
  },
  {
    id: "quarry",
    name: "The quarry",
    kind: "lair",
    region: "a",
    x: 2,
    y: 2,
    w: 6,
    h: 6,
    door: { x: 5, y: 8 },
    route: "hv",
  },
  {
    id: "marsh",
    name: "The marsh",
    kind: "lair",
    region: "b",
    x: 46,
    y: 27,
    w: 8,
    h: 6,
    door: { x: 50, y: 26 },
    route: "hv",
  },
  {
    id: "ruins",
    name: "The ruins",
    kind: "lair",
    region: "c",
    x: 46,
    y: 2,
    w: 7,
    h: 6,
    door: { x: 49, y: 8 },
    route: "hv",
  },
];
export const PLACES: Place[] = [
  ...VILLAGE_PLACES.map((p) => ({
    ...p,
    world: "w1",
    x: p.x + VX,
    y: p.y + VY,
    door: village(p.door.x, p.door.y),
  })),
  ...AREAS.flatMap((a) => a.places),
];

const WALKABLE = new Set(["=", "#", "P"]);

// The lair a region's boss lives in, and how to name it in a sentence ("the quarry", "the hollow oak").
export function lairOf(world: string, region: string): Place | undefined {
  return PLACES.find((p) => p.kind === "lair" && p.world === world && p.region === region);
}
export function lairName(world: string, region: string): string {
  return (lairOf(world, region)?.name ?? "The ruins").replace(/^The /, "").toLowerCase();
}

export function walkable(map: VillageMap, x: number, y: number): boolean {
  return y >= 0 && y < map.h && x >= 0 && x < map.w && WALKABLE.has(map.tiles[y][x]);
}

export function inside(place: Place, x: number, y: number): boolean {
  return x >= place.x && x < place.x + place.w && y >= place.y && y < place.y + place.h;
}

function tileHash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

const run = (from: number, to: number): number[] => {
  const step = to >= from ? 1 : -1;
  return Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from + i * step);
};

// Straight runs between corner points, inclusive.
function polyline(points: Point[]): Point[] {
  return points.slice(1).flatMap((to, i) => {
    const from = points[i];
    return from.x === to.x
      ? run(from.y, to.y).map((y) => ({ x: from.x, y }))
      : run(from.x, to.x).map((x) => ({ x, y: from.y }));
  });
}

// Street from the plaza (or an area's hub) to each door, an L shape in the order the place asks for.
function route(place: Place): Point[] {
  const { x: cx, y: cy } = AREAS.find((a) => a.world === place.world)?.hub ?? PLAZA.center;
  const { x: dx, y: dy } = place.door;
  if (place.route === "hv")
    return [...run(cx, dx).map((x) => ({ x, y: cy })), ...run(cy, dy).map((y) => ({ x: dx, y }))];
  return [...run(cy, dy).map((y) => ({ x: cx, y })), ...run(cx, dx).map((x) => ({ x, y: dy }))];
}

// `open` lists the open worlds: a closed world's road keeps its gate tile (G), which nobody walks through.
// `reserved` is the land the map's features keep free of trees (see featureLand in scenery.ts).
export function buildMap(open: string[] = ["w1"], reserved: readonly Rect[] = []): VillageMap {
  const grid = Array.from({ length: MAP_H }, () => Array<string>(MAP_W).fill("."));
  for (let y = 0; y < MAP_H; y++) for (const x of riverTiles(y)) grid[y][x] = "~";
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) if (groundStyle(x + 0.5, y + 0.5) === "sea") grid[y][x] = "~";
  for (const place of PLACES) {
    for (let y = place.y; y < place.y + place.h; y++)
      for (let x = place.x; x < place.x + place.w; x++) grid[y][x] = "B";
  }
  const pave = ({ x, y }: Point): void => {
    grid[y][x] = grid[y][x] === "~" || grid[y][x] === "#" ? "#" : "=";
  };
  for (const place of PLACES) route(place).forEach(pave);
  for (const area of AREAS) {
    polyline(area.road).forEach(pave);
    if (!open.includes(area.world)) grid[area.gate.y][area.gate.x] = "G";
  }
  for (let y = PLAZA.y; y < PLAZA.y + PLAZA.h; y++)
    for (let x = PLAZA.x; x < PLAZA.x + PLAZA.w; x++) grid[y][x] = "P";
  for (const r of reserved)
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) if (grid[y][x] === ".") grid[y][x] = "D";
  // Scatter trees and flowers on open grass, thicker at the edges, never next to a path or a building.
  const busy = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const t = grid[y + dy]?.[x + dx];
        if (t !== undefined && t !== "." && t !== "T" && t !== "R" && t !== "*") return true; // paths, buildings, water and reserved land
      }
    }
    return false;
  };
  // The back range is solid rock and snow: nobody walks there and nothing grows.
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) if (grid[y][x] === "." && isBackRange(x, y)) grid[y][x] = "M";
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (grid[y][x] !== "." || busy(x, y)) continue;
      const ground = groundStyle(x + 0.5, y + 0.5);
      if (ground === "forest" || ground === "edge") {
        const growth = forestGrowth(x, y);
        if (growth) grid[y][x] = growth === "tree" ? "T" : "*";
        continue;
      }
      if (styleAt(x, y) === "mountains") {
        const growth = mountainGrowth(x, y);
        if (growth)
          grid[y][x] = growth === "pine" ? "T" : "R"; // R: a rock
        else if (tileHash(x, y) % 17 === 1) grid[y][x] = "*";
        continue;
      }
      if (ground === "sand" || ground === "wet") {
        if (tileHash(x, y) % 23 === 1) grid[y][x] = "*"; // a shell
        continue;
      }
      if (ground === "village") {
        if (villageGrowth(x, y, MAP_W, MAP_H)) grid[y][x] = "T";
        continue;
      }
      const edge = x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2;
      const h = tileHash(x, y);
      const every = edge ? 3 : { village: 13, forest: 4, mountains: 9, shore: 13 }[styleAt(x, y)]; // the forest grows thick
      if (h % every === 0) grid[y][x] = "T";
      else if (h % 17 === 1) grid[y][x] = "*";
    }
  }
  return { w: MAP_W, h: MAP_H, tiles: grid.map((row) => row.join("")) };
}
