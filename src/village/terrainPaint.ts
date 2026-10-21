import type { MapColors } from "../art/palette";
import { pixelBuffer } from "../art/pixels";
import { shoreLine } from "./areas";
import { TILE } from "./grid";
import type { VillageMap } from "./layout";
import { bayer, fbm, hash01, ridged, valueNoise } from "./noise";
import { stamp } from "../art/draw";
import { FERN, MUSHROOM, REEDS } from "../art/sprites";
import { pathMask } from "./ribbons";
import type { GroundStyle } from "./terrain";
import {
  farRangeTopPx,
  forestDepth,
  groundStyle,
  nearRangeHeightPx,
  RIVER_TOP_ROW,
  rangeFootPx,
  riverCenterPx,
  riverHalfPx,
  rockLine,
  snowLine,
} from "./terrain";

// The mountains drawn pixel by pixel, ported from the world-pass mockup (mock2.py). Light comes from the west.
type Colors = { c: MapColors; s: Record<string, string> };
const MOUNTAIN_ROWS = 28;
const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v));
const relief = (gx: number, gy: number): number =>
  fbm(gx / 26, gy / 18, 41) + 0.35 * ridged(gx / 9, gy / 14, 43);

// Patches of lighter and darker grass, blended by ordered dither (shared with the village and forest ground).
function grassTone(gx: number, gy: number, base: readonly [string, string, string]): string {
  const n = fbm(gx / 40, gy / 40, 5) + (bayer(gx, gy) - 0.5) * 0.12;
  let col = base[0];
  if (n < 0.38) col = (gx + gy) % 3 ? base[1] : base[0];
  else if (n > 0.66) col = (gx * 3 + gy) % 4 ? base[2] : base[0];
  if ((gx * 7 + gy * 3) % 11 === 0) col = base[1];
  else if ((gx * 5 + gy * 9) % 17 === 0) col = base[2];
  return col;
}

// The slope: relief-shaded rock with solid snow thinning downhill, scree under the cliff, a meadow below.
export function drawMountainGround(ctx: CanvasRenderingContext2D, map: VillageMap, { c, s }: Colors): void {
  const w = map.w * TILE;
  const h = MOUNTAIN_ROWS * TILE;
  const buf = pixelBuffer(ctx, 0, 0, w, h);
  const tones = [s.S, c.rock2, c.rock, c.rock3];
  const grass = [c.grass, c.grass2, c.grass3] as const;
  for (let gy = 0; gy < h; gy++) {
    const ty = gy / TILE;
    for (let gx = 0; gx < w; gx++) {
      if ("=#PG".includes(map.tiles[Math.floor(ty)][Math.floor(gx / TILE)])) continue;
      const tx = gx / TILE;
      const b = bayer(gx, gy);
      let col: string;
      if (ty < rockLine(tx)) {
        const light =
          (relief(gx + 2, gy) - relief(gx - 2, gy)) * 9 + (relief(gx, gy - 2) - relief(gx, gy + 2)) * 4;
        const t = Math.floor(clamp(2 + light + (b - 0.5) * 0.45, 0, 3.99));
        col = t > 0 ? tones[t] : c.rock2;
        const snowy = clamp((snowLine(tx) + 1 - ty) / 1.6) + (fbm(gx / 16, gy / 11, 21) - 0.5) * 0.7;
        if (snowy > 0.5) col = light > -0.15 ? c.snow : c.stone;
      } else {
        col = grassTone(gx, gy, grass);
        const scree = clamp(1 - (ty - rockLine(tx)) / 1.3) * 0.8;
        if (scree > b && (gx * 5 + gy * 3) % 3) col = (gx + gy) % 4 ? c.rock : c.rock2;
      }
      buf.set(gx, gy, col);
    }
  }
  // alpine flowers on the meadow, snow tufts on the rock
  for (let ty = 0; ty < MOUNTAIN_ROWS; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      if (map.tiles[ty][tx] !== "*") continue;
      const ox = tx * TILE;
      const oy = ty * TILE;
      if (ty + 0.5 < rockLine(tx + 0.5)) {
        for (let i = 0; i < 3; i++) buf.set(ox + 2 + i, oy + 4, c.snow);
        buf.set(ox + 5, oy + 5, s.S);
      } else {
        buf.set(ox + 2, oy + 3, s.p);
        buf.set(ox + 5, oy + 5, s.a);
        buf.set(ox + 4, oy + 2, s.W);
      }
    }
  }
  buf.flush();
}

// The back range: a pale far range against the sky, then a near range with summits, spurs and snowy gullies.
export function drawBackRange(ctx: CanvasRenderingContext2D, map: VillageMap, { c, s }: Colors): void {
  const w = map.w * TILE;
  const buf = pixelBuffer(ctx, 0, 0, w, MOUNTAIN_ROWS * TILE);
  const tones = [s.S, c.rock2, c.rock, c.rock3];
  for (let x = 0; x < w; x++) {
    const foot = rangeFootPx(x);
    const nh = nearRangeHeightPx(x);
    const top = foot - nh;
    const slope = (nearRangeHeightPx(x + 3) - nearRangeHeightPx(x - 3)) / 6; // > 0: a west flank, facing the light
    const ft = farRangeTopPx(x);
    const farLight = (farRangeTopPx(x + 3) - farRangeTopPx(x - 3)) / 6;
    for (let y = 0; y <= Math.floor(foot); y++) {
      const b = bayer(x, y);
      if (y < top) {
        if (y < ft) {
          buf.set(x, y, y < ft - 1 ? c.stripSky : c.stone2);
          continue;
        }
        const depth = (y - ft) / Math.max(1, top - ft);
        const shade = clamp(-farLight * 1.5 + (valueNoise(x / 9, y / 9, 73) - 0.5) * 0.6 + 0.3);
        let col = shade < 0.55 ? c.snow : c.stone;
        if (depth > 0.55 + 0.3 * valueNoise(x / 15, 3, 74)) col = shade > 0.5 ? c.stone2 : c.stone;
        buf.set(x, y, col);
        continue;
      }
      const d = y - top;
      const spur = ridged(x / 6 + y / 22, y / 30, 64);
      const light =
        slope * 1.6 +
        (ridged((x + 1) / 6 + y / 22, y / 30, 64) - ridged((x - 1) / 6 + y / 22, y / 30, 64)) * 2.4;
      const snowDepth = nh * (0.42 + 0.25 * valueNoise(x / 23, 5, 65)) * (0.55 + 0.9 * (1 - spur));
      let col: string;
      if (d < 1) col = s.k;
      else if (d < snowDepth) col = light + (b - 0.5) * 0.2 > -0.1 ? c.snow : c.stone;
      else {
        const t = Math.floor(clamp(2 + light * 1.4 + (b - 0.5) * 0.3, 0, 3.99));
        col = tones[t];
        if ((y + Math.floor(5 * valueNoise(x / 21, 7, 66))) % 7 === 0 && t < 3 && x % 2) col = c.rock2; // strata
      }
      buf.set(x, y, col);
    }
    buf.set(x, Math.floor(foot) + 1, x % 3 ? s.S : c.rock2);
  }
  buf.flush();
}

// The cliff: rock faces of different widths, heights and tilts, lit left and shaded right, with cracks between
// them, a joined jagged top and boulders at the foot. Where a path climbs it, carved steps instead.
export function drawCliff(ctx: CanvasRenderingContext2D, map: VillageMap, { c, s }: Colors): void {
  const w = map.w * TILE;
  const buf = pixelBuffer(ctx, 0, 0, w, MOUNTAIN_ROWS * TILE);
  const blocked = (x: number, y: number): boolean =>
    "=#GB~".includes(map.tiles[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] ?? ".");
  let prevTop: number | null = null;
  let prevX = -2;
  for (let f0 = 0; f0 < w;) {
    const fw = 4 + Math.floor(hash01(f0, 0, 86) * 8);
    const fh = 5 + Math.floor(hash01(f0, 1, 86) * 9) + Math.floor(6 * valueNoise(f0 / 40, 0, 87));
    const tilt = (hash01(f0, 2, 86) - 0.5) * 8;
    for (let x = f0; x < Math.min(w, f0 + fw); x++) {
      const base = Math.floor(rockLine(x / TILE) * TILE) + 4;
      if (blocked(x, base - 2) || blocked(x, base - 12)) continue;
      const t = (x - f0) / Math.max(1, fw - 1);
      const top = base - fh - Math.floor(tilt * t) - Math.floor(hash01(x, 3, 86) * 2);
      buf.set(x, top - 1, s.k);
      if (prevTop !== null && prevX === x - 1) {
        for (let y = Math.min(prevTop, top) - 1; y < Math.max(prevTop, top) - 1; y++)
          buf.set(top < prevTop ? x : x - 1, y, s.k);
      }
      prevTop = top;
      prevX = x;
      for (let y = top; y < base; y++) {
        const k = y - top;
        let col: string;
        if (k < 1) col = c.rock3;
        else if (x === f0 && k > 2 && hash01(x, y, 88) < 0.8)
          col = k > fh * 0.3 ? s.S : c.rock2; // a crack between faces
        else if (t < 0.4) col = k < 3 || (k < fh * 0.6 && t < 0.2) ? c.rock3 : c.rock;
        else if (t < 0.8) col = (y + Math.floor(3 * valueNoise(x / 9, 0, 89))) % 5 ? c.rock : c.rock2;
        else col = k < fh - 3 ? c.rock2 : s.S;
        buf.set(x, y, col);
      }
      buf.set(x, base, s.k);
      if (x % 2) buf.set(x, base + 1, s.S);
    }
    f0 += fw;
  }
  for (let i = 0; i < Math.floor(w / 5); i++) {
    const x = Math.floor(hash01(i, 5, 90) * w);
    const base = Math.floor(rockLine(x / TILE) * TILE) + 5;
    if (
      blocked(x, base) ||
      map.tiles[Math.floor(base / TILE)][Math.floor(x / TILE)] === "~" ||
      hash01(i, 6, 90) > 0.6
    )
      continue;
    const bw = 2 + Math.floor(hash01(i, 7, 90) * 3);
    for (let dx = 0; dx < bw; dx++) {
      buf.set(x + dx, base + 1, s.k);
      buf.set(x + dx, base, dx < bw / 2 ? c.rock3 : c.rock2);
      buf.set(x + dx, base - 1, s.k);
    }
    buf.set(x - 1, base, s.k);
    buf.set(x + bw, base, s.k);
  }
  // carved steps where a path crosses the cliff
  for (let tx = 0; tx < map.w; tx++) {
    const ty = Math.floor(rockLine(tx + 0.5));
    if (!"=#G".includes(map.tiles[ty][tx])) continue;
    for (const k of [1, 4]) {
      for (let x = tx * TILE + 1; x < tx * TILE + 7; x++) {
        buf.set(x, ty * TILE + k, c.stone2);
        buf.set(x, ty * TILE + k + 1, c.path2);
        buf.set(x, ty * TILE + k + 2, c.path);
      }
    }
  }
  buf.flush();
}

// The forest's floor: forest greens dithered into the grass along the wandering edge, sunny glades, scree under
// the cliff in the foothills, and ferns or mushrooms where the map put undergrowth.
export function drawForestGround(ctx: CanvasRenderingContext2D, map: VillageMap, { c, s }: Colors): void {
  const w = map.w * TILE;
  const h = map.h * TILE;
  const buf = pixelBuffer(ctx, 0, 0, w, h);
  const forest = [c.forest, c.forest2, c.forest3] as const;
  const grass = [c.grass, c.grass2, c.grass3] as const;
  const wooded: [number, number][] = [];
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const style = groundStyle(tx + 0.5, ty + 0.5);
      if ((style === "forest" || style === "edge") && !"=#PGM".includes(map.tiles[ty][tx]))
        wooded.push([tx, ty]);
    }
  }
  for (const [tx, ty] of wooded) {
    const glade = fbm(tx / 5, ty / 5, 1) < 0.33;
    for (let gy = ty * TILE; gy < (ty + 1) * TILE; gy++) {
      for (let gx = tx * TILE; gx < (tx + 1) * TILE; gx++) {
        const b = bayer(gx, gy);
        const inForest = clamp(forestDepth(gx / TILE, gy / TILE) / 3) > b;
        let col = grassTone(gx, gy, inForest ? forest : grass);
        if (inForest && glade && (gx * 3 + gy * 5) % 9 === 0) col = c.grass3; // a sunny glade
        const fromCliff = gy / TILE - rockLine(gx / TILE);
        if (
          gy < MOUNTAIN_ROWS * TILE &&
          fromCliff < 1.3 &&
          clamp(1 - fromCliff / 1.3) * 0.8 > b &&
          (gx * 5 + gy * 3) % 3
        )
          col = (gx + gy) % 4 ? c.rock : c.rock2;
        buf.set(gx, gy, col);
      }
    }
  }
  buf.flush();
  for (const [tx, ty] of wooded) {
    if (map.tiles[ty][tx] === "*")
      stamp(ctx, hash01(tx, ty, 302) < 0.88 ? FERN : MUSHROOM, s, tx * TILE + 1, ty * TILE + 3);
  }
}

const PATH_OR_BUILDING = "=#PGB";

// The river, pixel by pixel: water with a little sparkle, foam under the waterfall, sandy banks with stones,
// and reeds along the lower banks (the gorge walls up in the mountains are a feature).
export function drawRiver(
  ctx: CanvasRenderingContext2D,
  map: VillageMap,
  { c, s }: Colors,
  night = false,
): void {
  const w = map.w * TILE;
  const h = map.h * TILE;
  const buf = pixelBuffer(ctx, 0, 0, w, h);
  const reeds: [number, number][] = [];
  const tileAt = (x: number, y: number): string =>
    map.tiles[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] ?? ".";
  for (let y = RIVER_TOP_ROW * TILE; y < h; y++) {
    const centre = riverCenterPx(y);
    if (y / TILE >= shoreLine(centre / TILE) + 0.5) break; // the river runs into the sea
    const half = riverHalfPx(y);
    const gorge = y / TILE < rockLine(81) + 0.6;
    for (let x = Math.floor(centre - half - 8); x < Math.ceil(centre + half + 8); x++) {
      if (PATH_OR_BUILDING.includes(tileAt(x, y))) continue;
      const d = Math.abs(x + 0.5 - centre);
      if (d < half) {
        let col = (x + y * 2) % 7 === 0 ? c.water2 : c.water;
        if (y < (RIVER_TOP_ROW + 1) * TILE) col = (x * 3 + y * 5) % 4 ? c.snow : c.water2; // foam under the fall
        buf.set(x, y, col);
        continue;
      }
      if (gorge) continue;
      const k = Math.floor(d - half);
      if (k === 0) buf.set(x, y, y % 3 ? c.path2 : c.stone2);
      else if (k === 1 && hash01(x, y, 3) < 0.3) buf.set(x, y, c.stone);
    }
    if (!gorge && y % TILE === 0 && y > 160 && hash01(y, 9, 2) < 0.3) {
      const rx = Math.floor(centre + half + 1);
      if (tileAt(rx, y) === ".") reeds.push([rx, y]);
    }
  }
  if (night) {
    // stars reflected in the still reed pool
    for (let i = 0; i < 5; i++) {
      const y = Math.floor((36.5 + hash01(i, 1, 620) * 3.5) * TILE);
      buf.set(
        Math.floor(riverCenterPx(y) + (hash01(i, 2, 620) - 0.5) * riverHalfPx(y)),
        y,
        i % 2 ? s.y : s.W,
      );
    }
  }
  buf.flush();
  for (const [x, y] of reeds) stamp(ctx, REEDS, s, x, y);
}

// The village's grass: soft patches, wildflower meadows, tufts and pebbles along the paths.
export function drawVillageGround(
  ctx: CanvasRenderingContext2D,
  map: VillageMap,
  { c, s }: Colors,
  night = false,
): void {
  const w = map.w * TILE;
  const h = map.h * TILE;
  const buf = pixelBuffer(ctx, 0, 0, w, h);
  const grass = [c.grass, c.grass2, c.grass3] as const;
  const flowers = night ? [s.p, c.grass3, s.r, c.grass2] : [s.p, s.a, s.W, s.r]; // at night most of them close
  for (let ty = MOUNTAIN_ROWS; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const t = map.tiles[ty][tx];
      if ("=#PG".includes(t) || groundStyle(tx + 0.5, ty + 0.5) !== "village") continue;
      for (let gy = ty * TILE; gy < (ty + 1) * TILE; gy++)
        for (let gx = tx * TILE; gx < (tx + 1) * TILE; gx++) buf.set(gx, gy, grassTone(gx, gy, grass));
      const ox = tx * TILE;
      const oy = ty * TILE;
      if (fbm(tx / 6, ty / 6, 31) > 0.66 || t === "*") {
        for (let k = 0; k < 3; k++) {
          if (hash01(tx, ty, 40 + k) < 0.55)
            buf.set(
              ox + Math.floor(hash01(tx, ty, 50 + k) * 7),
              oy + Math.floor(hash01(tx, ty, 60 + k) * 7),
              flowers[Math.floor(hash01(tx, ty, 70 + k) * 4)],
            );
        }
      }
      const byPath = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([dx, dy]) => "=P".includes(map.tiles[ty + dy]?.[tx + dx] ?? "."));
      if (byPath && t === ".") {
        if (hash01(tx, ty, 100) < 0.5) buf.set(ox + Math.floor(hash01(tx, ty, 110) * 7), oy + 7, c.stone2);
        if (hash01(tx, ty, 101) < 0.5) buf.set(ox + Math.floor(hash01(tx, ty, 111) * 7), oy + 1, c.hedge3);
      }
    }
  }
  buf.flush();
}

// The paths as ribbons: worn edges, cart ruts on the main roads, pebbles, a round cobbled plaza, plank bridges.
export function drawPaths(ctx: CanvasRenderingContext2D, map: VillageMap, { c, s }: Colors): void {
  const m = pathMask(map);
  const buf = pixelBuffer(ctx, 0, 0, m.width, m.height);
  const on = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < m.width && y < m.height && m.inside[y * m.width + x] === 1;
  const building = (x: number, y: number): boolean =>
    map.tiles[Math.floor(y / TILE)][Math.floor(x / TILE)] === "B";
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      const i = y * m.width + x;
      if (building(x, y)) continue;
      if (!m.inside[i]) {
        if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) {
          const r = hash01(x, y, 98);
          if (r < 0.1) buf.set(x, y, c.hedge3);
          else if (r < 0.14) buf.set(x, y, c.stone);
        }
        continue;
      }
      let col: string;
      if (m.plaza[i]) {
        const r = Math.hypot(x + 0.5 - (68 * TILE + 4), (y + 0.5 - (46 * TILE + 4)) * 1.25);
        const shift = (Math.floor(y / 3) % 2) * 2;
        const grout = (x + shift) % 4 === 0 || y % 3 === 0;
        col =
          r > 19.5
            ? c.stone2
            : grout
              ? c.path2
              : hash01(Math.floor((x + shift) / 4), Math.floor(y / 3), 94) < 0.5
                ? c.stone
                : c.plaza;
      } else if (!(on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1))) {
        col = hash01(x, y, 95) > 0.12 ? c.path2 : c.grass2;
      } else {
        col = c.path;
        if (m.main[i] && Math.abs(m.dist[i] - 1.9) < 0.55 && (x + y) % 3)
          col = c.path2; // cart ruts
        else if (hash01(x, y, 96) < 0.035) col = c.stone2;
        else if (hash01(x, y, 97) < 0.03) col = c.path2;
      }
      buf.set(x, y, col);
    }
  }
  // plank bridges with rails where the roads cross the river
  for (const by of [14, 46]) {
    const xs = [...map.tiles[by]].flatMap((t, x) => (t === "#" ? [x] : []));
    if (xs.length === 0) continue;
    const x0 = xs[0] * TILE - 4;
    const x1 = xs[xs.length - 1] * TILE + 12;
    const top = by * TILE - 1;
    const bot = by * TILE + 8;
    for (let x = x0; x < x1; x++) {
      for (let y = top + 1; y < bot; y++)
        buf.set(x, y, (x - x0) % 4 === 3 && y % 2 ? s.k : (x - x0) % 4 < 2 ? s.d : s.o);
      buf.set(x, top, s.k);
      buf.set(x, bot, s.k);
      buf.set(x, bot + 1, x % 2 ? c.water2 : c.water);
      buf.set(x, top - 3, s.k);
    }
    for (let x = x0; x < x1; x += 5) {
      buf.set(x, top - 2, s.o);
      buf.set(x, top - 1, s.o);
      buf.set(x, bot + 1, s.k);
      buf.set(x, bot + 2, s.o);
    }
  }
  buf.flush();
}

// Snow lies in soft drifts: solid where it is deep, thinning by dither at the edges, grass showing between.
// The snow colour at a pixel, or null where the grass shows. Lawns drawn by places and features use it too.
export function snowAt(gx: number, gy: number, c: { snow: string; stone: string }): string | null {
  const depth = fbm(gx / 14, gy / 10, 602) + (bayer(gx, gy) - 0.5) * 0.12;
  if (depth <= 0.36) return null;
  return depth > 0.62 && (gx * 3 + gy) % 11 === 0 ? c.stone : c.snow;
}

// Where a season lays nothing: bare rock and open water (and the wet sand between them) stay bare.
export function seasonSkips(ground: GroundStyle): boolean {
  return ground === "rock" || ground === "sea" || ground === "wet";
}

// The season on the ground: fallen leaves in autumn, snow lying on the grass and the forest floor in winter.
export function drawSeasonGround(
  ctx: CanvasRenderingContext2D,
  map: VillageMap,
  { c, s }: Colors,
  season: string,
  night = false,
): void {
  if (season !== "autumn" && season !== "winter") return;
  const buf = pixelBuffer(ctx, 0, 0, map.w * TILE, map.h * TILE);
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const ground = groundStyle(tx + 0.5, ty + 0.5);
      if ("=#PGM".includes(map.tiles[ty][tx]) || seasonSkips(ground)) continue;
      for (let gy = ty * TILE; gy < (ty + 1) * TILE; gy++) {
        for (let gx = tx * TILE; gx < (tx + 1) * TILE; gx++) {
          const r = hash01(gx, gy, 601);
          if (season === "autumn" && r < 0.025) buf.set(gx, gy, r < 0.012 ? s.C : night ? s.o : s.a);
          if (season !== "winter") continue;
          const snow = snowAt(gx, gy, c);
          if (snow) buf.set(gx, gy, snow);
        }
      }
    }
  }
  buf.flush();
}
