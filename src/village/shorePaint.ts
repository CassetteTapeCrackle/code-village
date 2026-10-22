import type { MapColors } from "../art/palette";
import { pixelBuffer } from "../art/pixels";
import { AREAS, duneLine, shoreLine } from "./areas";
import { TILE } from "./grid";
import type { VillageMap } from "./layout";
import { bayer, fbm, hash01, valueNoise } from "./noise";

type Colors = { c: MapColors; s: Record<string, string> };
type MapKey = keyof MapColors;

// The shore area's own rect and ground (see areas.ts). drawShore paints the sea, wet sand and dry sand
// inside it and leaves the lawn above the dune line to drawVillageGround.
const SHORE = AREAS.find((a) => a.style === "shore")!;

// The sea's colour at a pixel, ported from the mockup's water branch (shoremock.py): five depths
// ordered-dithered together, wave crests, sun sparkles and breaking foam along the waterline.
export function waterKey(gx: number, gy: number): MapKey {
  const x = gx / 8;
  const y = gy / 8;
  const d = y - shoreLine(x); // tiles below the waterline (> 0 is sea)
  const depth = d + 0.6 * (fbm(x / 3, y / 3, 50) - 0.5);
  const bands: readonly [number, MapKey][] = [
    [0.7, "shallow"],
    [1.4, "shallow2"],
    [2.6, "sea"],
    [4.2, "deep"],
    [99, "deeper"],
  ];
  let col: MapKey = bands[bands.length - 1][1];
  for (let i = 0; i < bands.length; i++) {
    const [lim, name] = bands[i];
    if (depth >= lim) continue;
    const prev = i ? bands[i - 1][0] : 0;
    const t = lim < 99 ? (depth - prev) / (lim - prev) : 0;
    col = name;
    if (i + 1 < bands.length && t > 0.7 && bayer(gx, gy) < (t - 0.7) / 0.3) col = bands[i + 1][1];
    break;
  }
  const wave = (gy + 3 * Math.sin(gx / 11 + gy / 17)) % 14;
  if (depth > 1.6 && wave < 1 && hash01(Math.floor(gx / 3), gy, 51) < 0.55) col = "crest";
  if (depth > 2.4 && hash01(gx, gy, 52) < 0.0035) col = "sparkle";
  if (d < 0.28 + 0.12 * Math.sin(gx / 3.3) && hash01(Math.floor(gx / 2), gy, 53) < 0.9) col = "foam";
  return col;
}

// The sand's colour at a pixel: a wet band with ripple lines just above the water, then dry sand in
// three tones with the odd grain. The wet band matches the shore area's "wet" ground.
export function sandKey(gx: number, gy: number): MapKey {
  const x = gx / 8;
  const y = gy / 8;
  const d = y - shoreLine(x);
  if (d > -1.2 + 0.25 * valueNoise(x * 2, 1, 60)) {
    let col: MapKey = fbm(x / 2, y / 2, 61) > 0.45 ? "wet" : "wet2";
    if ((gy + Math.round(2 * Math.sin(gx / 5))) % 5 === 0 && hash01(Math.floor(gx / 2), gy, 62) < 0.7)
      col = "ripple";
    return col;
  }
  const n = fbm(gx / 16, gy / 16, 80);
  let col: MapKey = n > 0.68 ? "sand3" : n < 0.3 ? "sand2" : "sand";
  if (hash01(gx, gy, 81) < 0.05) col = "grain";
  return col;
}

// The boulders, as tile centre and radius in pixels, generated once from the mockup's two clusters
// (shoremock.py): 46 under the headland and 12 on the tide pool point, each clamped into the map.
export const SHORE_ROCKS: readonly [number, number, number][] = [
  [93.61, 82.77, 6.26],
  [89.37, 81.07, 8.55],
  [89.31, 82.77, 7.79],
  [86.09, 81.25, 6.97],
  [89.15, 81.54, 9.38],
  [92.35, 82.22, 10.82],
  [94.57, 84.6, 11.2],
  [89.86, 83, 8.87],
  [88, 79.88, 10.85],
  [93.02, 84.78, 9.7],
  [85.68, 77.22, 8.22],
  [88.28, 80.58, 7.73],
  [93.51, 84.73, 10.15],
  [93.1, 85.04, 7.66],
  [94.93, 82.37, 8.55],
  [91.02, 84.94, 8.41],
  [95.23, 81.55, 6.15],
  [93.47, 80.75, 6.87],
  [90.18, 84.83, 9.31],
  [94.23, 84.83, 9.32],
  [90.38, 80.72, 6.1],
  [87.79, 83.5, 10.77],
  [90.27, 83.8, 7.3],
  [88.29, 81.45, 9.97],
  [91.57, 84.99, 8.05],
  [90.83, 84.74, 8.16],
  [94.26, 84.84, 9.23],
  [89.01, 85.27, 5.81],
  [94.65, 84.66, 10.71],
  [89.32, 82.77, 10.63],
  [88.01, 82.42, 9],
  [89.18, 84.51, 11.87],
  [86.33, 82.23, 6.83],
  [89.01, 85.28, 5.75],
  [87.37, 84.99, 7.61],
  [85.52, 74.02, 8.03],
  [85.72, 74.57, 7.25],
  [94.28, 81.49, 8.79],
  [92.62, 82.61, 9.74],
  [90.46, 80.25, 5.22],
  [92.75, 80.1, 5.36],
  [94.72, 85.33, 5.33],
  [86.07, 81.55, 7.48],
  [86.85, 79.94, 5.77],
  [91.21, 85.03, 7.7],
  [90.79, 85.04, 7.64],
  [4.4, 79.71, 7.07],
  [6.09, 80.61, 6.95],
  [9.7, 80.95, 3.95],
  [5.39, 79.78, 5.85],
  [4.23, 78.5, 4.86],
  [12.18, 80.24, 6.35],
  [8.84, 81.91, 4.19],
  [6.67, 81.5, 4.49],
  [8.8, 82.04, 3.99],
  [7.39, 82.47, 5.84],
  [6.9, 81.43, 4.19],
  [10.84, 78.78, 5.54],
];

// Whether the shore ground paints a tile: only paths, bridges, the plaza and gates are left to their own
// painters. A place (B) is painted as if it were not there, so a lair standing in the sea sits in water.
export const shoreGroundPainted = (tile: string): boolean => !"=#PG".includes(tile);

// Rock outcrops where nothing is scattered: the headland east of x 85 and the tide pool point west of x 8.
const rocky = (x: number, y: number): boolean =>
  (x > 85 && y > shoreLine(x) - 5 && fbm(x / 2.5, y / 2.5, 40) > 0.42) ||
  (Math.abs(x - 8) < 5 && Math.abs(y - (shoreLine(x) - 0.3)) < 1.6 && fbm(x / 1.8, y / 1.8, 41) > 0.5);

// A boulder from the mockup's boulder(): a soft shadow lower right, an outline, three tones lit from
// the top left, and a few dark specks.
function boulder(
  buf: ReturnType<typeof pixelBuffer>,
  cx: number,
  cy: number,
  r: number,
  { c, s }: Colors,
): void {
  const rx = r;
  const ry = r * 0.75;
  for (let y = Math.floor(cy - ry) - 1; y < Math.floor(cy + ry) + 4; y++)
    for (let x = Math.floor(cx - rx) - 1; x < Math.floor(cx + rx) + 4; x++)
      if (((x - cx - 2) / rx) ** 2 + ((y - cy - 2) / ry) ** 2 <= 1) buf.shade(x, y, 0.2);
  for (let y = Math.floor(cy - ry) - 1; y < Math.floor(cy + ry) + 2; y++)
    for (let x = Math.floor(cx - rx) - 1; x < Math.floor(cx + rx) + 2; x++) {
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (e > 1) continue;
      if (e > 0.78) {
        buf.set(x, y, s.k);
        continue;
      }
      const light = (-0.6 * (x - cx)) / rx + (-0.8 * (y - cy)) / ry;
      let col = light > 0.45 ? c.rock3 : light < -0.35 ? c.rock2 : c.rock;
      if (hash01(x, y, 120) < 0.05) col = c.rock2;
      buf.set(x, y, col);
    }
}

// The shore's water, wet sand and dry sand, then dunes, a rope fence, shells, boulders and tide pools,
// painted once into the cached terrain layer. Paths, the plaza and gates are left to their own painters.
export function drawShore(ctx: CanvasRenderingContext2D, map: VillageMap, colors: Colors): void {
  const { c, s } = colors;
  const r = SHORE.rect;
  const buf = pixelBuffer(ctx, r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
  const ground = SHORE.ground!;
  for (let ty = r.y; ty < r.y + r.h; ty++) {
    for (let tx = r.x; tx < r.x + r.w; tx++) {
      if (!shoreGroundPainted(map.tiles[ty][tx])) continue;
      for (let gy = ty * TILE; gy < (ty + 1) * TILE; gy++) {
        for (let gx = tx * TILE; gx < (tx + 1) * TILE; gx++) {
          const g = ground(gx / TILE, gy / TILE);
          if (g === "sea") buf.set(gx, gy, c[waterKey(gx, gy)]);
          else if (g === "wet" || g === "sand") buf.set(gx, gy, c[sandKey(gx, gy)]);
        }
      }
    }
  }
  // grass tufts along the dune line
  for (let tx = 0; tx < map.w; tx++) {
    for (let k = 0; k < 3; k++) {
      if (hash01(tx, k, 90) >= 0.6) continue;
      const x = tx * TILE + Math.floor(hash01(tx, k, 91) * 7);
      const y = Math.floor((duneLine(tx + 0.5) + 0.4 + hash01(tx, k, 92) * 1.4) * TILE);
      for (let i = 0; i < 3 + Math.floor(hash01(tx, k, 93) * 3); i++)
        buf.set(x + (i % 2) * (k % 2 ? 1 : -1) * (i >> 1), y - i, i % 2 ? c.dune : c.dune2);
    }
  }
  // a sagging rope fence between x 14 and 34
  for (let tx = 14; tx < 34; tx += 2) {
    const y = Math.floor((duneLine(tx) + 1.6) * TILE);
    for (let i = 0; i < 5; i++) buf.set(tx * TILE + 3, y - i, s.o);
    buf.set(tx * TILE + 3, y - 5, s.k);
    if (tx < 32)
      for (let i = 0; i < 16; i++) buf.set(tx * TILE + 3 + i, y - 3 + (i > 4 && i < 12 ? 1 : 0), s.h);
  }
  // shells, pebbles and seaweed, hash-scattered across the sand and wet band
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(hash01(i, 1, 100) * (map.w * TILE));
    const y = 58 * TILE + Math.floor(hash01(i, 2, 100) * (28 * TILE)); // the mockup's rows 58..86
    const gyTile = y / TILE;
    const d = gyTile - shoreLine(x / TILE);
    if (gyTile < duneLine(x / TILE) + 0.6 || d > -0.2 || rocky(x / TILE, gyTile)) continue;
    const rr = hash01(i, 3, 100);
    if (d > -1.3 && rr < 0.4) {
      for (let j = 0; j < 4; j++) buf.set(x + j, y + (j % 2), c.seaweed);
    } else if (rr < 0.65) {
      buf.set(x, y, s.W);
      buf.set(x + 1, y, s.p);
    } else buf.set(x, y, s.S);
  }
  // boulders back to front, then little pools between the western rocks
  for (const [rx, ry, rr] of [...SHORE_ROCKS].sort((a, b) => a[1] - b[1]))
    boulder(buf, rx * TILE, ry * TILE, rr, colors);
  for (let i = 0; i < 5; i++) {
    const x = Math.floor((5 + hash01(i, 4, 112) * 7) * TILE);
    const y = Math.floor((shoreLine(x / TILE) - 0.6) * TILE + hash01(i, 5, 112) * 6);
    for (let dy = 0; dy < 3; dy++)
      for (let dx = 0; dx < 6 - 2 * (dy === 2 ? 1 : 0); dx++)
        buf.set(x + dx + (dy === 2 ? 1 : 0), y + dy, dy === 0 ? c.crest : c.shallow2);
  }
  buf.flush();
}
