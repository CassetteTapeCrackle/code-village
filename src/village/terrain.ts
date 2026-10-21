import { AREAS, inRect } from "./areas";
import { fbm, hash01, ridged, valueNoise } from "./noise";

// The mountains' shape (tiles unless a name ends in Px). See the world-pass mockup's mock2.py.

// Where the back range meets the slope.
export const snowLine = (x: number): number => 6.5 + 2.5 * valueNoise(x / 9, 3.3, 11);
// The cliff between bare rock and the green below.
export const rockLine = (x: number): number => 15.5 + 3 * valueNoise(x / 7, 9.1, 12);
export const cliffRow = (tx: number): number => Math.floor(rockLine(tx + 0.5));
export const isBackRange = (tx: number, ty: number): boolean => ty < Math.ceil(snowLine(tx));

// The near range's summits: centre tile, height in pixels, half width in tiles. The tallest is the peak lair's.
const PEAKS: readonly [number, number, number][] = [
  [1, 34, 7],
  [10, 26, 6],
  [19, 44, 8],
  [27, 32, 6],
  [33, 26, 5],
  [47, 40, 8],
  [56, 30, 6],
  [63, 26, 5],
  [82, 36, 7],
  [89.5, 56, 9],
];
export function nearRangeHeightPx(x: number): number {
  const tx = x / 8;
  let h = 0;
  for (const [cx, ht, wd] of PEAKS) {
    const d = Math.abs(tx - cx) / wd;
    const jag = 1 + 0.22 * (ridged(x / 13, cx, 61) - 0.5) + 0.1 * (valueNoise(x / 4, cx, 62) - 0.5);
    h = Math.max(h, ht * Math.max(0, 1 - d) ** 1.15 * jag);
  }
  return h + 6 * ridged(x / 37, 0, 63);
}
// The uneven line where the near range sits in the slope.
export const rangeFootPx = (x: number): number => snowLine(x / 8) * 8 + 2 + 6 * valueNoise(x / 7, 0, 85);
export const farRangeTopPx = (x: number): number =>
  3 + 16 * valueNoise(x / 52, 1, 71) + 8 * ridged(x / 19, 2, 72);

// What grows on a mountain tile: pine stands on the slope and the meadow, a few rocks.
export function mountainGrowth(tx: number, ty: number): "pine" | "rock" | null {
  const r = hash01(tx, ty, 200);
  if (ty + 0.5 < rockLine(tx + 0.5)) {
    if (fbm(tx / 4, ty / 4, 13) > 0.64 && r < 0.6) return "pine";
    return r < 0.06 ? "rock" : null;
  }
  if (fbm(tx / 4, ty / 4, 13) > 0.66 && r < 0.5) return "pine";
  return r < 0.02 ? "rock" : null;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

// Tiles inside the forest (negative outside), on a wandering edge. The forest climbs north as wooded foothills
// up to the cliff, so no open plain sits between it and the mountains. x and y may be fractional.
export function forestDepth(x: number, y: number): number {
  const east = 40 + 7 * clamp01((31 - y) / 6);
  const d = y < 28 ? Math.min(east - x, y - (rockLine(x) - 0.5)) : east - x;
  return d + (fbm(x / 4, y / 4, 3) - 0.5) * 7;
}

export type GroundStyle = "rock" | "forest" | "edge" | "meadow" | "village" | "sand" | "wet" | "sea";
// The one answer to what kind of ground a point is, for scatter and paint. Areas with their own ground answer
// first (see Area.ground).
export function groundStyle(x: number, y: number): GroundStyle {
  const own = AREAS.find((a) => a.ground && inRect(a.rect, x, y));
  if (own?.ground) return own.ground(x, y);
  if (y < 28 && y < rockLine(x)) return "rock";
  const d = forestDepth(x, y);
  if (d > 0) return "forest";
  if (d > -3) return "edge";
  return y < 28 ? "meadow" : "village";
}

export type TreeKind = "oak" | "pine" | "fir" | "birch" | "bush" | "rock";
// Which tree stands on a forest or edge tile: conifers in the foothills, a mix deeper in.
export function treeKind(tx: number, ty: number): TreeKind {
  const q = hash01(tx, ty, 300);
  const style = groundStyle(tx + 0.5, ty + 0.5);
  if (style === "edge") return hash01(tx, ty, 303) < 0.5 ? "oak" : ty >= 28 ? "birch" : "pine";
  if (ty < 30) return q < 0.45 ? "pine" : q < 0.85 ? "fir" : q < 0.93 ? "birch" : "rock";
  return q < 0.35 ? "oak" : q < 0.6 ? "pine" : q < 0.8 ? "fir" : q < 0.92 ? "birch" : "bush";
}

// Whether a forest or edge tile grows a tree, undergrowth or nothing.
export function forestGrowth(tx: number, ty: number): "tree" | "undergrowth" | null {
  const style = groundStyle(tx + 0.5, ty + 0.5);
  const r = hash01(tx, ty, 200);
  if (style === "edge") return r < 0.3 ? "tree" : null;
  const dens = fbm(tx / 5, ty / 5, 1);
  let p = dens < 0.33 ? 0.08 : dens > 0.6 ? 0.85 : 0.45;
  if (ty < 30) p = Math.max(p, 0.55); // the foothills stay wooded
  if (r < p) return "tree";
  return hash01(tx, ty, 301) < 0.25 ? "undergrowth" : null;
}

// The river: a gentle bend that fades to nothing at each bridge row, and one wide reed pool (pixels).
const BRIDGE_ROWS = [14, 46];
export const RIVER_TOP_ROW = 8;
export function riverCenterPx(yPx: number): number {
  const yt = yPx / 8 - 0.5;
  const w = clamp01((Math.min(...BRIDGE_ROWS.map((b) => Math.abs(yt - b))) - 1.2) / 3);
  const bend = (1.6 * Math.sin(yt / 6.5) + 0.9 * Math.sin(yt / 2.7 + 1)) * w;
  return (81 + Math.max(-1, Math.min(2, bend))) * 8 + 8;
}
export const riverHalfPx = (yPx: number): number => 8 + 9 * clamp01(1 - Math.abs(yPx / 8 - 38.5) / 2.6);
// The water tiles of a row (none above the waterfall).
export function riverTiles(ty: number): number[] {
  if (ty < RIVER_TOP_ROW) return [];
  const c = riverCenterPx(ty * 8 + 4);
  const half = riverHalfPx(ty * 8 + 4);
  const xs: number[] = [];
  for (let x = 76; x < 88; x++) if (Math.abs(x * 8 + 4 - c) < half + 3) xs.push(x);
  return xs;
}

// Village trees gather in copses at field edges, with a few lone ones (and more along the map's edge).
export function villageGrowth(tx: number, ty: number, mapW: number, mapH: number): "oak" | "bush" | null {
  const r = hash01(tx, ty, 200);
  const edge = tx < 2 || tx >= mapW - 2 || ty >= mapH - 2;
  const copse = fbm(tx / 4 + 40, ty / 4, 17) > 0.67;
  if (!((copse && r < 0.7) || (edge && r < 0.3) || r < 0.015)) return null;
  return hash01(tx, ty, 304) < 0.65 ? "oak" : "bush";
}
