import { px, stamp, type Grid } from "../art/draw";
import type { DrawEnv } from "./features/env";
import { FEATURES, FLAT_FEATURES, FLAT_PLACES, unlocked, type Feature } from "./scenery";
import { beginCapture, covering, drawPiece, endCapture, pieces, type Piece } from "../art/standing";
import { drawBuildingShadows, drawTreeShadows } from "./shadows";
import {
  drawBackRange,
  drawCliff,
  drawForestGround,
  drawMountainGround,
  drawPaths,
  drawRiver,
  drawSeasonGround,
  drawVillageGround,
} from "./terrainPaint";
import { groundStyle, riverCenterPx, treeKind, villageGrowth } from "./terrain";
import { hash01 } from "./noise";
import { BALLOON } from "../art/scenes";
import { drawLife, type Life } from "./critters";
import { leafColours, snowCapped, type Season } from "./weather";
import { drawMine, drawObservatory, drawPeak, drawRidge, summit } from "./features/mountainPlaces";
import { drawCabin, drawDen, drawHollowOak, drawMaze } from "./features/forestPlaces";
import { drawGardenPlace, drawMarsh, drawQuarry, drawRuins, polishHouse } from "./features/villagePlaces";
import { MAP_COLORS, SPRITE_COLORS, TINTS, type MapColors } from "../art/palette";
import {
  BIRD,
  BIRD_FLAP,
  BUSH,
  CAT,
  CHICKEN,
  CHICKEN_PECK,
  DUCK,
  FERN,
  FROG,
  MUSHROOM,
  PINE,
  WATERING_CAN,
  observatory,
  MOCHI,
  VILLAGER,
  ICONS,
  PLANT_TOPS,
  ROCK,
  TREE,
  ZZZ,
  building,
} from "../art/sprites";
import type { Palette, TimeOfDay } from "./clock";
import type { Activity } from "./routines";
import { duneLine, styleAt } from "./areas";
import { MAP_H, MAP_W, PLACES, TILE, VX, VY, village, type Place, type VillageMap } from "./layout";
import { overlap, type ViewRect } from "./view";

type PlantStage = keyof typeof PLANT_TOPS;
export type Plot = { concept: string; stage: PlantStage | null };
export type LairState = "asleep" | "awake" | "cleared" | "scenery";
export type StaticScene = {
  palette: Palette;
  level: number;
  found: string[];
  plots: Plot[];
  lairs: Record<string, LairState>;
  season: Season;
};

const BUILDING_SPRITES: Record<string, (p: Place) => Grid> = {
  school: (p) => building({ w: p.w * TILE, h: p.h * TILE, roof: "r", icon: ICONS.slate }),
  library: (p) => building({ w: p.w * TILE, h: p.h * TILE, roof: "z", icon: ICONS.book }),
  house: (p) => building({ w: p.w * TILE, h: p.h * TILE, roof: "j", icon: ICONS.heart }),
  cabin: (p) => building({ w: p.w * TILE, h: p.h * TILE, roof: "d", wall: "h", icon: ICONS.sprout }),
  observatory: (p) => observatory(p.w * TILE, p.h * TILE),
  hall: (p) => building({ w: p.w * TILE, h: p.h * TILE, roof: "z", wall: "w", icon: ICONS.book }), // placeholder
};

function drawTile(
  ctx: CanvasRenderingContext2D,
  map: VillageMap,
  tx: number,
  ty: number,
  palette: Palette,
): void {
  const c = MAP_COLORS[palette];
  const s = SPRITE_COLORS[palette];
  const t = map.tiles[ty][tx];
  const ox = tx * TILE;
  const oy = ty * TILE;
  const at = (x: number, y: number): string => map.tiles[y]?.[x] ?? ".";
  const style = styleAt(tx, ty);
  const meadow = style === "mountains" && ty >= 17; // the lower slopes are still green
  const shore = style === "shore";
  const lawn = shore && ty + 1 < duneLine(tx) - 0.8; // whole tiles of grass above the dune line
  const [g1, g2, g3] =
    style === "forest"
      ? [c.forest, c.forest2, c.forest3]
      : style === "mountains" && !meadow
        ? [c.rock, c.rock2, c.rock3]
        : shore && !lawn
          ? [c.sand, c.sand2, c.sand3]
          : [c.grass, c.grass2, c.grass3];
  const beach = shore && at(tx, ty - 1) !== "~"; // the first row of sea breaks on the sand
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const gx = ox + x;
      const gy = oy + y;
      let color = g1;
      if (t === "~" && shore && groundStyle(tx + 0.5, ty + 0.5) === "sea") {
        const foam = beach && y < 2 + ((gx >> 2) % 2);
        color = foam ? c.foam : (gx * 3 + gy * 5) % 13 === 0 ? c.water2 : gy % 16 > 9 ? c.sea2 : c.sea;
      } else if (
        shore &&
        !lawn &&
        ".T*D".includes(t) &&
        gy / TILE < duneLine(gx / TILE) + (hash01(gx, gy, 92) - 0.5) * 0.5
      )
        color = (gx * 7 + gy * 3) % 11 === 0 ? c.grass2 : c.grass; // the lawn's ragged last pixels
      else if (t === "~" && shore)
        color = g1; // sand under the river: its own painter draws the water
      else if (t === "~") color = (gx + gy * 2) % 7 === 0 ? c.water2 : c.water;
      else if (t === "#") color = y === 0 || y === TILE - 1 ? s.k : gx % 3 === 0 ? c.bridge2 : c.bridge;
      else if (t === "P") color = gx % 4 === 0 || gy % 4 === 0 ? c.path2 : c.plaza;
      else if (t === "=" || t === "G") {
        const edge =
          (x === 0 && !"=P#".includes(at(tx - 1, ty))) ||
          (x === TILE - 1 && !"=P#".includes(at(tx + 1, ty))) ||
          (y === 0 && !"=P#".includes(at(tx, ty - 1))) ||
          (y === TILE - 1 && !"=P#".includes(at(tx, ty + 1)));
        color = edge || (gx * 5 + gy * 3) % 13 === 0 ? c.path2 : c.path;
      } else if ((gx * 7 + gy * 3) % 11 === 0) color = g2;
      else if ((gx * 5 + gy * 9) % 17 === 0) color = g3;
      else if (
        style === "mountains" &&
        ty < 9 &&
        Math.hypot(gx - (Math.floor(gx / 24) * 24 + 12), (gy - (Math.floor(gy / 16) * 16 + 8)) * 1.5) <
          5 + ((Math.floor(gx / 24) * 7 + Math.floor(gy / 16) * 3) % 4)
      )
        color = c.snow; // snow drifts up high
      px(ctx, color, gx, gy);
    }
  }
  if (t === "*" && style === "forest") {
    stamp(ctx, (tx + ty) % 3 === 0 ? MUSHROOM : FERN, s, ox + 1, oy + 3);
    return;
  }
  if (t === "*" && shore) {
    // a shell: a pale curl with a pink lip
    px(ctx, s.w, ox + 3, oy + 4, 2, 1);
    px(ctx, s.p, ox + 2, oy + 5, 3, 1);
    return;
  }
  if (t === "*" && style === "mountains") {
    px(ctx, c.snow, ox + 2, oy + 4, 3, 2);
    px(ctx, s.S, ox + 5, oy + 5, 2, 1);
    return;
  }
  if (t === "*") {
    px(ctx, s.p, ox + 2, oy + 3);
    px(ctx, s.a, ox + 5, oy + 5);
    px(ctx, s.W, ox + 4, oy + 2);
  }
}

function drawGarden(
  ctx: CanvasRenderingContext2D,
  place: Place,
  plots: Plot[],
  palette: Palette,
  season: Season,
): void {
  drawGardenPlace(ctx, { c: MAP_COLORS[palette], s: SPRITE_COLORS[palette] }, place, plots, season);
}

function drawLair(
  ctx: CanvasRenderingContext2D,
  place: Place,
  state: LairState,
  palette: Palette,
  season: Season,
): void {
  const s = SPRITE_COLORS[palette];
  const c = MAP_COLORS[palette];
  const lair = place.lair ?? place.id;
  if (["oak", "maze", "den", "mine", "ridge", "peak"].includes(lair)) {
    drawWildLair(ctx, place, lair, state, palette, season);
    return;
  }
  if (lair === "quarry") drawQuarry(ctx, { c, s }, place, state);
  else if (lair === "marsh") drawMarsh(ctx, { c, s }, place, state);
  else drawRuins(ctx, { c, s }, place, state);
  if (state === "asleep") stamp(ctx, ZZZ, s, (place.x + place.w / 2) * TILE - 3, place.y * TILE + 4);
}

// A beaten lair turns into a nicer place: a stone garden, a clear pond with a jetty, a restored shrine.

// The forest and mountain lairs (scenery until their world's bosses arrive).
function drawWildLair(
  ctx: CanvasRenderingContext2D,
  place: Place,
  lair: string,
  state: LairState,
  palette: Palette,
  season: Season,
): void {
  const s = SPRITE_COLORS[palette];
  const c = MAP_COLORS[palette];
  const colors = { c, s };
  // the lairs sit in the land (no backdrop); the peak's summit is part of the back range
  if (lair === "oak") drawHollowOak(ctx, colors, place, state, season);
  else if (lair === "maze") drawMaze(ctx, colors, place, state);
  else if (lair === "den") drawDen(ctx, colors, place, state);
  else if (lair === "mine") drawMine(ctx, colors, place, state);
  else if (lair === "ridge") drawRidge(ctx, colors, place, state);
  else if (lair === "peak") drawPeak(ctx, colors, state);
  if (state !== "asleep") return;
  const at = lair === "peak" ? summit() : { x: (place.x + place.w / 2) * TILE, y: place.y * TILE + 4 };
  stamp(ctx, ZZZ, s, at.x - 3, lair === "peak" ? at.y + 2 : at.y);
}

// A closed area under thick cloud, with slow drifting puffs on top.
type TileRect = { x: number; y: number; w: number; h: number };
const FOG_BAND = 14; // the fog thins out over this many pixels toward open land
const FOG_FADE = 36;
const FOG_MAX_RAD = 17; // 7 + the largest (i * 7) % 11
// The still half of a fog area: the solid middle and the dithered band, as ready-to-replay rects, and
// `outside` sampled once per pixel over the area and every pixel a cloud can reach. Both depend only on the
// shape, the areas beside it and the palette, never on time, so a paint is a replay plus the drifting puffs.
type FogStatic = { runs: number[]; table: Uint8Array; tw: number; ox0: number; oy0: number };
const fogStatic = new Map<string, FogStatic>();
// The puffs that reach each row of a cloud of a given radius, as [ox * rad, half], so a paint skips the
// square roots and the reach test.
const puffRows = new Map<number, ([number, number][] | null)[]>();
function puffsFor(rad: number): ([number, number][] | null)[] {
  const hit = puffRows.get(rad);
  if (hit) return hit;
  const puffs = [
    [-1.1, 0.25, 0.7],
    [0, 0, 1],
    [1.05, 0.2, 0.75],
    [0.45, -0.45, 0.6],
    [-0.5, -0.35, 0.55],
  ];
  const rows: ([number, number][] | null)[] = [];
  for (let dy = -rad; dy <= rad; dy++) {
    let list: [number, number][] | null = null;
    for (const [ox, oy, k] of puffs) {
      const pr = rad * k;
      const py = dy - oy * rad;
      if (Math.abs(py) > pr) continue;
      (list ??= []).push([ox * rad, Math.sqrt(pr * pr - py * py)]);
    }
    rows.push(list);
  }
  puffRows.set(rad, rows);
  return rows;
}
// The cloud banks of one fog area, back to front. In light mode each centre snaps to a whole map pixel, so
// the fog changes a few times a second instead of drifting by a fraction of a pixel on every paint.
export function fogClouds(
  x0: number,
  y0: number,
  w: number,
  h: number,
  t: number,
  light = false,
): { rad: number; cx: number; cy: number }[] {
  const count = Math.max(6, Math.round((w * h) / 1800));
  const span = w + FOG_FADE * 2;
  return Array.from({ length: count }, (_, i) => {
    const cx = x0 - FOG_FADE + ((i * 131 + t * (2 + (i % 3))) % span);
    return {
      rad: 7 + ((i * 7) % 11),
      cx: light ? Math.round(cx) : cx,
      cy: y0 + 6 + ((i * 89 + (i % 5) * 13) % Math.max(1, h - 12)),
    };
  }).sort((a, b) => a.cy - b.cy);
}
export function drawFog(
  ctx: CanvasRenderingContext2D,
  c: Record<string, string>,
  r: TileRect,
  t: number,
  others: TileRect[],
  view?: ViewRect,
  light = false,
): void {
  const x0 = r.x * TILE;
  const y0 = r.y * TILE;
  const w = r.w * TILE;
  const h = r.h * TILE;
  // Each side thins out toward open land, and stays solid at the map's edge or where another fogged area continues.
  const fogAt = (tx: number, ty: number): boolean =>
    others.some((o) => tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h);
  const solid = (tx: number, ty: number): boolean =>
    tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H || fogAt(tx, ty);
  const outside = (px0: number, py0: number): number => {
    const tx = Math.floor(px0 / TILE);
    const ty = Math.floor(py0 / TILE);
    if (solid(tx, ty) || (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h)) return 0;
    const dx = Math.max(x0 - px0, px0 - (x0 + w - 1), 0);
    const dy = Math.max(y0 - py0, py0 - (y0 + h - 1), 0);
    return Math.max(dx, dy);
  };
  const key = `${r.x},${r.y},${r.w},${r.h}|${others
    .map((o) => `${o.x},${o.y},${o.w},${o.h}`)
    .join(";")}|${c.fog}`;
  let stat = fogStatic.get(key);
  if (!stat) {
    const BAND = FOG_BAND;
    const noise = (x: number, y: number): number => {
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return n - Math.floor(n);
    };
    const depth = (x: number, y: number): number => {
      const tx = r.x + Math.floor(x / TILE);
      const ty = r.y + Math.floor(y / TILE);
      return Math.min(
        solid(r.x - 1, ty) ? BAND : x,
        solid(tx, r.y - 1) ? BAND : y,
        solid(r.x + r.w, ty) ? BAND : w - 1 - x,
        solid(tx, r.y + r.h) ? BAND : h - 1 - y,
      );
    };
    // The band around the inside of the rect, dithered in 2 x 2 blocks. Neighbouring blocks of one run
    // become one rect: same colour, same alpha, and the blocks never overlap.
    const runs: number[] = [x0 + BAND, y0 + BAND, w - 2 * BAND, h - 2 * BAND];
    const blocked = (x: number, y: number): boolean => {
      const d = depth(x, y);
      return d >= BAND || noise(x, y) < d / BAND;
    };
    const bandRow = (y: number, from: number, to: number): void => {
      for (let x = from; x < to;) {
        if (!blocked(x, y)) {
          x += 2;
          continue;
        }
        let end = x + 2;
        while (end < to && blocked(end, y)) end += 2;
        runs.push(x0 + x, y0 + y, end - x, 2);
        x = end;
      }
    };
    for (let y = 0; y < h; y += 2) {
      if (y < BAND || y >= h - BAND) {
        bandRow(y, 0, w);
        continue;
      }
      bandRow(y, 0, BAND);
      bandRow(y, w - BAND, w);
    }
    // The clouds reach at most FOG_MAX_RAD beyond their centre, which itself stays inside the rect plus one
    // FADE: a margin of FADE + 2 * FOG_MAX_RAD holds every pixel they touch, so the lookups below are in range.
    const MARGIN = FOG_FADE + 2 * FOG_MAX_RAD;
    const ox0 = x0 - MARGIN;
    const oy0 = y0 - MARGIN;
    const tw = w + 2 * MARGIN;
    const th = h + 2 * MARGIN;
    const table = new Uint8Array(tw * th);
    for (let row = 0; row < th; row++) {
      const py = oy0 + row;
      const base = row * tw;
      for (let col = 0; col < tw; col++) {
        const d = outside(ox0 + col, py);
        table[base + col] = d < FOG_FADE ? d : FOG_FADE;
      }
    }
    if (fogStatic.size > 8) fogStatic.clear();
    stat = { runs, table, tw, ox0, oy0 };
    fogStatic.set(key, stat);
  }
  ctx.fillStyle = c.fog;
  for (let i = 0; i < stat.runs.length; i += 4)
    ctx.fillRect(stat.runs[i], stat.runs[i + 1], stat.runs[i + 2], stat.runs[i + 3]);
  // Cloud banks drifting slowly east: puffy tops, a shaded underside. Over open land they fade out instead of stopping.
  const alphaAt = (d: number): number => (d === 0 ? 1 : Math.ceil((1 - d / FOG_FADE) * 4) / 5); // four steps of fading, pixel-art style
  // back to front, so a lower cloud's light top overlaps the shaded underside of the one behind it
  for (const { rad, cx, cy } of fogClouds(x0, y0, w, h, t, light)) {
    const rows = puffsFor(rad);
    for (let dy = -rad; dy <= rad; dy += 1) {
      const list = rows[dy + rad];
      if (!list) continue;
      const y = Math.round(cy + dy);
      if (view && (y < view.y || y >= view.y + view.h)) continue; // a cloud row above or below the view
      let left = Infinity;
      let right = -Infinity;
      for (const [a, half] of list) {
        left = Math.min(left, cx + a - half);
        right = Math.max(right, cx + a + half);
      }
      if (view && (right < view.x || left >= view.x + view.w)) continue; // a cloud clear of the view
      ctx.fillStyle = dy > rad * 0.35 ? c.fog3 : c.fog2;
      // One rect per run of equal alpha (the fade only steps near the area's edge), so the still middle
      // of a cloud is a single fillRect instead of one 2 x 1 rect every two pixels.
      const row = (y - stat.oy0) * stat.tw - stat.ox0;
      for (let x = Math.round(left) & ~1; x < right;) {
        const d = stat.table[row + x];
        if (d >= FOG_FADE) {
          x += 2;
          continue;
        }
        const alpha = alphaAt(d);
        let end = x + 2;
        while (end < right) {
          const next = stat.table[row + end];
          if (next >= FOG_FADE || alphaAt(next) !== alpha) break;
          end += 2;
        }
        ctx.globalAlpha = alpha;
        ctx.fillRect(x, y, end - x, 1);
        x = end;
      }
    }
  }
  ctx.globalAlpha = 1;
}

// What blocks a closed road: two fallen logs, or a heap of rocks.
function drawGate(
  ctx: CanvasRenderingContext2D,
  s: Record<string, string>,
  x: number,
  y: number,
  kind: "logs" | "rocks",
): void {
  if (kind === "logs") {
    for (const [dx, dy] of [
      [-3, -1],
      [-1, 4],
    ]) {
      px(ctx, s.k, x + dx, y + dy, 13, 5);
      px(ctx, s.o, x + dx + 1, y + dy + 1, 11, 3);
      px(ctx, s.d, x + dx + 1, y + dy + 1, 11, 1);
      px(ctx, s.h, x + dx + 10, y + dy + 1, 2, 3);
    }
    return;
  }
  for (const [dx, dy] of [
    [-4, 1],
    [2, -2],
    [3, 3],
    [-1, -4],
  ])
    stamp(ctx, ROCK, s, x + dx, y + dy);
}

// Your yard (laundry, vegetables, chickens) stays clear of trees.
const inYard = (tx: number, ty: number): boolean =>
  tx >= VX + 4 && tx <= VX + 12 && ty >= VY + 23 && ty <= VY + 33;

// Spring blossom on a tree's canopy: a few pink and white flowers.
function blossom(
  ctx: CanvasRenderingContext2D,
  s: Record<string, string>,
  x: number,
  y: number,
  tx: number,
  ty: number,
): void {
  for (let i = 0; i < 4; i++)
    px(
      ctx,
      i % 2 ? s.W : s.p,
      x + 2 + Math.floor(hash01(tx, ty, 700 + i) * 7),
      y + 1 + Math.floor(hash01(tx, ty, 710 + i) * 5),
    );
}

// The terrain: the tiles and everything painted from the palette and the season alone. It has its own
// layer, so a scene change that leaves it alone (a Check planting or looting) only redraws what sits on top.
export function drawTerrain(
  ctx: CanvasRenderingContext2D,
  map: VillageMap,
  palette: Palette,
  season: Season,
): void {
  const s = SPRITE_COLORS[palette];
  const c = MAP_COLORS[palette];
  for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) drawTile(ctx, map, tx, ty, palette);
  drawMountainGround(ctx, map, { c, s });
  drawForestGround(ctx, map, { c, s });
  drawVillageGround(ctx, map, { c, s }, palette === "night");
  drawSeasonGround(ctx, map, { c, s }, season, palette === "night");
  drawRiver(ctx, map, { c, s }, palette === "night");
  drawPaths(ctx, map, { c, s });
  drawBackRange(ctx, map, { c, s });
  drawCliff(ctx, map, { c, s });
  drawBuildingShadows(ctx, map);
}

// Paints the scene over the terrain: the places, the features and the trees. With a `scratch` canvas of the
// map's size, each standing thing (a tree, a place, a feature that is not flat) is also captured as pieces a
// walker can pass behind; those are returned.
export function drawScene(
  ctx: CanvasRenderingContext2D,
  map: VillageMap,
  scene: StaticScene,
  scratch?: CanvasRenderingContext2D,
): Piece[] {
  const { palette } = scene;
  const standing: Piece[] = [];
  const stand = (draw: (g: CanvasRenderingContext2D) => void): void => {
    draw(ctx);
    if (!scratch) return;
    beginCapture();
    draw(scratch);
    const box = endCapture();
    if (!box) return;
    const x = Math.max(0, box.x);
    const y = Math.max(0, box.y);
    const w = Math.min(scratch.canvas.width, box.x + box.w) - x;
    const h = Math.min(scratch.canvas.height, box.y + box.h) - y;
    if (w <= 0 || h <= 0) return;
    standing.push(...pieces(scratch.getImageData(x, y, w, h).data, w, h, x, y));
    scratch.clearRect(x, y, w, h);
  };
  const s = SPRITE_COLORS[palette];
  const c = MAP_COLORS[palette];
  for (const place of PLACES) {
    const draw = (g: CanvasRenderingContext2D): void => {
      if (place.kind === "garden") drawGarden(g, place, scene.plots, palette, scene.season);
      else if (place.kind === "lair")
        drawLair(g, place, scene.lairs[place.id] ?? "scenery", palette, scene.season);
      else if (place.kind === "observatory") drawObservatory(g, { c, s }, place);
      else if (place.kind === "cabin") drawCabin(g, { c, s }, place, scene.season);
      else {
        stamp(
          g,
          BUILDING_SPRITES[place.kind](place),
          palette === "night" ? { ...s, i: c.windowGlow } : s,
          place.x * TILE,
          place.y * TILE,
        ); // lit windows at night
        polishHouse(g, map, { c, s }, place, scene.season);
      }
    };
    if (FLAT_PLACES.has(place.id)) draw(ctx);
    else stand(draw);
  }
  const found = new Set(scene.found);
  const env: DrawEnv = { ctx, s, c, palette, map, found, season: scene.season, plots: scene.plots };
  const shown = FEATURES.filter((f) => unlocked(f, scene.level, found));
  const drawFeature = (f: Feature): void =>
    FLAT_FEATURES.has(f.id) ? f.draw(env) : stand((g) => f.draw({ ...env, ctx: g }));
  for (const f of shown.filter((f) => !f.afterTrees)) drawFeature(f);
  drawTreeShadows(ctx, map);
  const leaves = { ...s, ...leafColours(scene.season, s, c) };
  const leafy = (grid: Grid): Grid => (scene.season === "winter" ? snowCapped(grid) : grid);
  // Trees last and top to bottom, so lower trees overlap the ones behind them.
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const tile = map.tiles[ty][tx];
      if ((tile !== "T" && tile !== "R") || inYard(tx, ty)) continue;
      const ground = groundStyle(tx + 0.5, ty + 0.5);
      if (tile === "T" && ground === "village") {
        const vx = tx * TILE - 2 + Math.floor(hash01(tx, ty, 9) * 3) - 1;
        const oak = villageGrowth(tx, ty, map.w, map.h) !== "bush";
        stand((g) => {
          stamp(g, leafy(oak ? TREE : BUSH), leaves, vx, ty * TILE - 3);
          if (oak && scene.season === "spring") blossom(g, s, vx, ty * TILE - 3, tx, ty);
        });
        continue;
      }
      if (tile === "T" && (ground === "forest" || ground === "edge")) {
        // forest trees by kind, nudged a little so they stop standing in rows (the tile does not move)
        const kind = treeKind(tx, ty);
        const x = tx * TILE - 2 + Math.floor(hash01(tx, ty, 9) * 7) - 3;
        const y = ty * TILE - 3 + Math.floor(hash01(tx, ty, 10) * 5) - 2;
        stand((g) => {
          if (kind === "rock") stamp(g, ROCK, { ...s, S: c.hedge3 }, x + 2, y + 6);
          else if (kind === "bush") stamp(g, leafy(BUSH), leaves, x + 2, y + 5);
          else if (kind === "pine" || kind === "fir")
            stamp(
              g,
              PINE,
              {
                ...(kind === "fir" ? { ...s, L: c.hedge3, l: c.hedge } : s),
                ...(scene.season === "winter" ? { l: c.snow } : {}),
              },
              x + 1,
              y + 1,
            );
          else {
            stamp(
              g,
              leafy(TREE),
              kind === "birch"
                ? { ...s, o: s.W, L: c.grass3, l: c.grass, ...leafColours(scene.season, s, c) }
                : leaves,
              x,
              y,
            );
            if (kind === "oak" && scene.season === "spring") blossom(g, s, x, y, tx, ty);
          }
        });
        continue;
      }
      const style = styleAt(tx, ty);
      const grid =
        tile === "R"
          ? ROCK
          : style === "forest"
            ? (tx + ty) % 3 === 0
              ? TREE
              : PINE
            : style === "mountains"
              ? PINE
              : (tx + ty) % 4 === 0
                ? BUSH
                : TREE;
      stand((g) => stamp(g, grid, s, tx * TILE - 2, ty * TILE - 3));
    }
  }
  for (const f of shown.filter((f) => f.afterTrees)) drawFeature(f);
  return standing;
}

// Little birds that hop about on the paths and fly off when Mochi comes near (world tiles).
export const BIRD_SPOTS = [village(17, 18), village(37, 19), village(28, 21), { x: 20, y: 47 }];
export const BIRD_SCARE_TILES = 2.5;
const BIRD_GONE_S = 8; // how long a bird stays away before it comes back

// One bird's flight clock: it takes off when Mochi is near, and lands again a while later once Mochi has moved on.
export function nextFlight(flight: number, mochiNear: boolean, dt: number): number {
  if (flight === 0) return mochiNear ? dt || 0.001 : 0;
  const next = flight + dt;
  return next > BIRD_GONE_S && !mochiNear ? 0 : next;
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  s: Record<string, string>,
  bird: DynamicScene["birds"][number],
  i: number,
  t: number,
): void {
  const x = bird.x * TILE + 2;
  const y = bird.y * TILE + 2;
  if (bird.flight === 0) {
    const hop = Math.floor(t * 2 + i * 1.7) % 6 === 0 ? -1 : 0;
    stamp(ctx, BIRD, s, x + Math.round(Math.sin(t / 3 + i) * 2), y + hop, Math.sin(t / 3 + i) < 0);
    return;
  }
  if (bird.flight > 2.5) return; // off out of sight
  const flap = Math.floor(t * 10) % 2 === 0;
  stamp(ctx, flap ? BIRD_FLAP : BIRD, s, x + Math.round(bird.flight * 40), y - Math.round(bird.flight * 30));
}

type Walker = {
  x: number;
  y: number;
  facing: 1 | -1;
  moving: boolean;
  clothes?: string;
  activity?: Activity | null;
};
export type DynamicScene = {
  palette: Palette;
  time: TimeOfDay;
  t: number; // seconds since the loop started, for animation phases
  mochi: Walker;
  napping: boolean;
  villagers: Walker[];
  rain: boolean;
  ducks: boolean;
  fogged: { x: number; y: number; w: number; h: number }[]; // closed areas, in tiles
  gates: { x: number; y: number; kind: "logs" | "rocks" }[]; // drawn over the fog, so the block stays visible
  still: boolean; // reduced motion: the fog does not drift
  light: boolean; // light mode: the fog clouds snap to whole pixels
  birds: { x: number; y: number; flight: number }[]; // world tiles; flight is seconds since it flew off (0: on the ground)
  sparkles: { x: number; y: number }[]; // world tiles: new scenes twinkle for a moment after Show me
  fireflies: boolean; // level 7: they come out over the forest at night
  balloon: boolean; // level 11: a hot air balloon drifts over the valley
  life: Life; // smoke, wind, animals and paw prints
  standing: readonly Piece[]; // what drawStatic captured, redrawn over a walker who stands behind it
  view?: ViewRect; // the part of the map being painted: actors and clouds clear of it are skipped
};

function drawWalker(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  colors: Record<string, string>,
  w: Walker,
  t: number,
  shadow: string,
): void {
  const bob = w.moving && Math.floor(t * 8) % 2 === 0 ? -1 : 0;
  const x = Math.round(w.x * TILE + TILE / 2 - grid[0].length / 2);
  const y = Math.round(w.y * TILE + TILE - grid.length) - 1;
  px(ctx, shadow, x + 1, y + grid.length - 1, grid[0].length - 2, 2);
  stamp(ctx, grid, colors, x, y + bob, w.facing < 0);
}

// What a villager holds or shows while doing their job, drawn on top of their sprite at (x, y).
function drawActivity(ctx: CanvasRenderingContext2D, s: Record<string, string>, w: Walker, t: number): void {
  const x = Math.round(w.x * TILE);
  const y = Math.round(w.y * TILE + TILE - VILLAGER.length) - 1;
  const f = w.facing;
  const hand = f > 0 ? x + 7 : x;
  switch (w.activity) {
    case "sweep": {
      const swing = Math.round(Math.sin(t * 6) * 2);
      for (let i = 0; i < 7; i++) px(ctx, s.o, hand + Math.round((i * f) / 2), y + 4 + i);
      px(ctx, s.k, hand + 3 * f - 2 + swing, y + 11, 5, 2);
      px(ctx, s.h, hand + 3 * f - 1 + swing, y + 11, 3, 1);
      break;
    }
    case "fish": {
      for (let i = 0; i < 7; i++) px(ctx, s.o, hand + i * f, y + 7 - i);
      const tipX = hand + 7 * f;
      const bob = Math.round(Math.sin(t * 2.5));
      px(ctx, s.W, tipX, y + 1, 1, 12 + bob);
      px(ctx, s.r, tipX - 1, y + 13 + bob, 3, 2);
      if (Math.floor(t) % 9 === 0) px(ctx, s.W, tipX - 3, y + 16, 7, 1); // a ripple now and then
      break;
    }
    case "water": {
      stamp(ctx, WATERING_CAN, s, f > 0 ? hand : hand - 6, y + 5, f < 0);
      const spout = f > 0 ? hand + 7 : hand - 7;
      for (let i = 0; i < 3; i++) px(ctx, s.b, spout + (i % 2) * f, y + 8 + ((t * 10 + i * 3) % 7));
      break;
    }
    case "read": {
      px(ctx, s.k, x + 1, y + 6, 6, 4);
      px(ctx, s.W, x + 2, y + 7, 2, 2);
      px(ctx, s.W, x + 4, y + 7, 2, 2);
      if (Math.floor(t / 4) % 2) px(ctx, s.b, x + 4, y + 7, 2, 2); // turning a page
      break;
    }
    case "chat": {
      px(ctx, s.k, x + 1, y - 8, 9, 6);
      px(ctx, s.W, x + 2, y - 7, 7, 4);
      px(ctx, s.W, x + 3, y - 2, 2, 1);
      for (let i = 0; i < 3; i++) if (Math.floor(t * 2) % 4 > i) px(ctx, s.k, x + 3 + i * 2, y - 5);
      break;
    }
    case "carry": {
      px(ctx, s.k, x, y - 5, 8, 6);
      px(ctx, s.d, x + 1, y - 4, 6, 4);
      px(ctx, s.o, x + 1, y - 2, 6, 1);
      break;
    }
  }
}

// Chickens by your house, butterflies over the flowers and the garden, birds crossing, a frog on a lily pad,
// and a fish jumping in the river.
function drawCritters(ctx: CanvasRenderingContext2D, s: Record<string, string>, t: number): void {
  const frogHop = t % 5 < 0.3 ? -2 : 0; // every few seconds, a little jump
  stamp(ctx, FROG, s, riverCenterPx(117 + VY * TILE) - VX * TILE - 2, 117 + frogHop); // on a lily pad mid-river
  [
    [52, 246, 0],
    [70, 252, 1.7],
    [84, 244, 3.1],
  ].forEach(([cx, cy, phase]) => {
    const wander = Math.round(Math.sin(t / 2 + phase) * 6);
    const pecking = Math.floor(t * 1.5 + phase) % 3 === 0;
    stamp(ctx, pecking ? CHICKEN_PECK : CHICKEN, s, cx + wander, cy, Math.cos(t / 2 + phase) < 0);
  });
  [
    [150, 40, s.p],
    [230, 210, s.a],
    [100, 170, s.b],
    [360, 150, s.p],
    [272, 200, s.W],
    [296, 222, s.a],
  ].forEach(([bx, by, color], i) => {
    const x = Math.round((bx as number) + Math.sin(t * 0.7 + i) * 14 + Math.sin(t * 2.3 + i) * 3);
    const y = Math.round((by as number) + Math.cos(t * 0.9 + i * 2) * 8);
    const open = Math.floor(t * 8 + i) % 2 === 0;
    px(ctx, color as string, x - (open ? 2 : 1), y, open ? 2 : 1, 2);
    px(ctx, color as string, x + 1, y, open ? 2 : 1, 2);
    px(ctx, s.k, x, y, 1, 2);
  });
  const lap = t % 30; // a small flock crosses every half minute
  if (lap < 12) {
    const fx = Math.round(-20 + lap * 42);
    for (const [dx, dy] of [
      [0, 0],
      [-7, 4],
      [-6, -5],
    ]) {
      const up = Math.floor(t * 6 + dx) % 2 === 0;
      px(ctx, s.k, fx + dx, 30 + dy + Math.round(Math.sin(lap) * 4), 1, 1);
      px(ctx, s.k, fx + dx - 2, 30 + dy - (up ? 1 : 0) + Math.round(Math.sin(lap) * 4), 2, 1);
      px(ctx, s.k, fx + dx + 1, 30 + dy - (up ? 1 : 0) + Math.round(Math.sin(lap) * 4), 2, 1);
    }
  }
  const jump = t % 7; // a fish leaps from the river every few seconds
  if (jump < 0.8) {
    const fy = 90 + (Math.floor(t / 7) % 3) * 70;
    const arc = Math.round(Math.sin((jump / 0.8) * Math.PI) * 5);
    const fx = riverCenterPx(fy + VY * TILE) - VX * TILE - 4; // village pixels, in the river
    px(ctx, s.z, fx + Math.round(jump * 8), fy - arc, 3, 2);
    px(ctx, s.W, fx - 1, fy + 2, 2, 1);
    px(ctx, s.W, fx + 7, fy + 2, 2, 1);
  }
}

function drawMochi(
  ctx: CanvasRenderingContext2D,
  s: Record<string, string>,
  c: MapColors,
  scene: DynamicScene,
): void {
  drawWalker(ctx, MOCHI, s, scene.mochi, scene.t, c.shadow);
  if (scene.napping) {
    // little z's drifting up from a sleeping Mochi
    const mx = Math.round(scene.mochi.x * TILE + TILE / 2 + 4);
    const my = Math.round(scene.mochi.y * TILE - MOCHI.length);
    for (let i = 0; i < 2; i++) {
      const rise = (scene.t * 3 + i * 4) % 8;
      px(ctx, s.k, mx + i * 3, my - rise, 2, 1);
      px(ctx, s.k, mx + i * 3 + 1, my - rise + 1, 1, 1);
      px(ctx, s.k, mx + i * 3, my - rise + 2, 2, 1);
    }
  }
}

export function drawDynamic(ctx: CanvasRenderingContext2D, scene: DynamicScene): void {
  const s = SPRITE_COLORS[scene.palette];
  const c = MAP_COLORS[scene.palette];
  drawLife(ctx, s, MAP_COLORS[scene.palette], scene.life);
  const house = PLACES.find((p) => p.kind === "house")!;
  const catX = (house.x + house.w) * TILE + 16;
  const catY = (house.y + house.h) * TILE - 8;
  stamp(ctx, CAT, s, catX, catY, Math.floor(scene.t / 3) % 2 === 0);
  if (scene.ducks) {
    // two ducks paddling up and down the river
    for (const [base, phase] of [
      [7, 0],
      [27, 2.5],
    ]) {
      const y = Math.round((VY + base + Math.sin(scene.t / 3 + phase) * 3) * TILE);
      stamp(ctx, DUCK, s, riverCenterPx(y) - 4 + (phase ? 2 : 0), y, Math.cos(scene.t / 3 + phase) < 0);
    }
  }
  ctx.save();
  ctx.translate(VX * TILE, VY * TILE); // critters live in village pixels
  drawCritters(ctx, s, scene.t);
  ctx.restore();
  scene.birds.forEach((bird, i) => drawBird(ctx, s, bird, i, scene.t));
  // walkers from the back to the front; after each, whatever stands in front of it is drawn again over it
  const walkers = [
    ...scene.villagers.map((v) => ({ w: v, grid: VILLAGER })),
    { w: scene.mochi, grid: MOCHI },
  ].sort((a, b) => a.w.y - b.w.y);
  for (const { w, grid } of walkers) {
    const feet = Math.round(w.y * TILE + TILE) - 2;
    const box = {
      x: Math.round(w.x * TILE) - 6,
      y: feet - grid.length - 8,
      w: TILE + 12,
      h: grid.length + 10,
    }; // with room for held things
    if (scene.view && !overlap(box, scene.view)) continue; // a walker clear of the view
    if (grid === MOCHI) drawMochi(ctx, s, c, scene);
    else {
      drawWalker(ctx, VILLAGER, { ...s, "1": w.clothes ?? s["1"] }, w, scene.t, c.shadow);
      if (w.activity) drawActivity(ctx, s, w, scene.t);
    }
    for (const piece of covering(scene.standing, box, feet)) drawPiece(ctx, piece);
  }
  if (scene.rain) {
    ctx.fillStyle = c.rain;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    for (let i = 0; i < 90; i++) {
      const x = (i * 97 + scene.t * 40) % w;
      const y = (i * 53 + scene.t * 160) % h;
      ctx.fillRect(Math.floor(x), Math.floor(y), 1, 3);
    }
  }
  for (const r of scene.fogged)
    drawFog(
      ctx,
      MAP_COLORS[scene.palette],
      r,
      scene.still ? 0 : scene.t,
      scene.fogged.filter((o) => o !== r),
      scene.view,
      scene.light,
    );
  for (const g of scene.gates) drawGate(ctx, s, g.x * TILE, g.y * TILE, g.kind);
  const tint = TINTS[scene.time];
  if (tint) {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  // fireflies over the forest at night (level 7)
  if (scene.fireflies && scene.palette === "night") {
    const c = MAP_COLORS[scene.palette];
    for (let i = 0; i < 24; i++) {
      const fx =
        4 * TILE + hash01(i, 1, 401) * 32 * TILE + (scene.still ? 0 : Math.sin(scene.t * 0.8 + i) * 3);
      const fy =
        30 * TILE + hash01(i, 2, 401) * 30 * TILE + (scene.still ? 0 : Math.cos(scene.t * 0.6 + i * 2) * 2);
      if (!scene.still && Math.sin(scene.t * 2 + i * 1.7) < -0.3) continue; // they blink
      px(ctx, c.fireflyGlow, Math.round(fx) - 1, Math.round(fy) - 1, 3, 3);
      px(ctx, c.firefly, Math.round(fx), Math.round(fy));
    }
  }
  // a hot air balloon drifting across the valley once every four minutes (level 11), its shadow on the ground
  if (scene.balloon) {
    const width = ctx.canvas.width;
    const bx = scene.still ? 63 * TILE : Math.round(((scene.t * (width + 40)) / 240) % (width + 40)) - 20;
    const by = 20 * TILE + Math.round(scene.still ? 0 : Math.sin(scene.t / 3) * 2);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 12; x++)
        if (((x - 6) / 6) ** 2 + ((y - 2) / 2) ** 2 <= 1 && (x + y) % 2)
          px(ctx, MAP_COLORS[scene.palette].hedge3, bx + 14 + x, by + 38 + y);
    stamp(ctx, BALLOON, s, bx, by);
  }
  // new scenes twinkle: four points circling the tile (one still ring with reduced motion)
  for (const sp of scene.sparkles) {
    const cx = sp.x * TILE + 4;
    const cy = sp.y * TILE + 4;
    for (let k = 0; k < 4; k++) {
      const a = (scene.still ? 0 : scene.t * 3) + (k * Math.PI) / 2;
      const r = scene.still ? 6 : 5 + Math.sin(scene.t * 6 + k) * 2;
      px(ctx, k % 2 ? s.y : s.W, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 2, 2);
    }
  }
}
