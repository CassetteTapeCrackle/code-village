import { FLOWERS } from "../art/palette";
import { TILE } from "./grid";
import type { VillageMap } from "./layout";
import { hash01, valueNoise } from "./noise";
import { groundStyle } from "./terrain";

export type Season = "spring" | "summer" | "autumn" | "winter";

// The season by the real date (Northern Hemisphere months).
export function seasonFor(date: Date): Season {
  const m = date.getMonth();
  return m >= 2 && m <= 4 ? "spring" : m >= 5 && m <= 7 ? "summer" : m >= 8 && m <= 10 ? "autumn" : "winter";
}

// One wind for the whole map: which way it blows and how hard, changing slowly (t in seconds).
export function windAt(t: number): { dir: 1 | -1; strength: number } {
  const n = valueNoise(t / 90, 0, 501);
  return { dir: n < 0.5 ? -1 : 1, strength: 0.3 + 0.7 * Math.abs(n - 0.5) * 2 };
}

type BloomPlot = { concept: string; stage: string | null };
type BloomLesson = { world: string; region: string; concepts: readonly string[] };

const AREA_OF: Record<string, readonly string[]> = {
  w1: ["village"],
  w2: ["forest", "edge"],
  w3: ["meadow", "rock"],
};
const seedOf = (text: string): number => [...text].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);

// Wildflowers spill from the garden: a concept whose plant is in full bloom (the tree stage) puts six flowers in
// its region's colour on grass beside the paths of its own world.
export function bloomSpots(
  plots: readonly BloomPlot[],
  lessons: readonly BloomLesson[],
  map: VillageMap,
): { x: number; y: number; colour: string }[] {
  const spots: { x: number; y: number; colour: string }[] = [];
  for (const plot of plots) {
    if (plot.stage !== "tree") continue;
    const lesson = lessons.find((l) => l.concepts.includes(plot.concept));
    if (!lesson) continue;
    const styles = AREA_OF[lesson.world] ?? [];
    const seed = seedOf(plot.concept);
    const tiles: [number, number][] = [];
    for (let ty = 1; ty < map.h - 1; ty++) {
      for (let tx = 1; tx < map.w - 1; tx++) {
        if (map.tiles[ty][tx] !== "." || !styles.includes(groundStyle(tx + 0.5, ty + 0.5))) continue;
        if (
          [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
          ].some(([dx, dy]) => map.tiles[ty + dy][tx + dx] === "=")
        )
          tiles.push([tx, ty]);
      }
    }
    tiles.sort((a, b) => hash01(a[0], a[1], seed) - hash01(b[0], b[1], seed));
    for (const [tx, ty] of tiles.slice(0, 6)) {
      spots.push({
        x: tx * TILE + 1 + Math.floor(hash01(tx, ty, seed + 1) * 6),
        y: ty * TILE + 1 + Math.floor(hash01(tx, ty, seed + 2) * 6),
        colour: FLOWERS[lesson.region] ?? FLOWERS.a,
      });
    }
  }
  return spots;
}

// Leaf colours for oaks, birches and bushes by season (pines keep theirs, with snow on the tips in winter).
// `N` is the canopy's shade, for the big trees that have one.
export function leafColours(
  season: Season,
  s: Record<string, string>,
  c: { snow: string; stone: string },
): Record<string, string> {
  if (season === "autumn") return { L: s.C, l: s.a, N: s.d };
  if (season === "winter") return { L: s.d, l: c.snow, N: s.o }; // bare branches, snow on the lit edges
  return {};
}

// A leafy sprite in winter: snow lying on the top of the canopy, bare twigs (two browns, dithered) below it.
// Use with leafColours("winter"): `l` is the snow, `L` and `N` the twigs.
const capped = new Map<readonly string[], readonly string[]>();
export function snowCapped(grid: readonly string[]): readonly string[] {
  const hit = capped.get(grid);
  if (hit) return hit;
  const leafy = grid.map((row) => /[Ll]/.test(row));
  const first = leafy.indexOf(true);
  const last = leafy.lastIndexOf(true);
  const line = first + Math.max(1, Math.round((last - first + 1) * 0.4));
  const out = grid.map((row, y) =>
    [...row]
      .map((ch, x) => (ch !== "L" && ch !== "l" ? ch : y < line ? "l" : (x + y) % 2 ? "L" : "N"))
      .join(""),
  );
  capped.set(grid, out);
  return out;
}
