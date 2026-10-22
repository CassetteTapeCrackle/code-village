import { expect, test } from "vitest";
import { MAP_COLORS, SPRITE_COLORS } from "../../art/palette";
import type { DrawEnv } from "../features/env";
import { SHORE_WALK_ROW } from "../areas";
import { PLACES, type VillageMap } from "../layout";
import { TILE } from "../grid";
import type { Season } from "../weather";
import { crabAt, drawShoreLife, gullAt, type ShoreLife } from "../shoreCritters";
import { inSeason, SHORE_LIFE } from "./shoreLife";
import { SHORE_LEVELS } from "./shore";

// Records every write instead of rasterising: a feature that draws nothing leaves the list empty.
function recording(): { ctx: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = [];
  const ctx = {
    fillStyle: "",
    getImageData: (x: number, y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData: () => calls.push("flush"),
    fillRect: (x: number, y: number, w: number, h: number) =>
      calls.push(`${x},${y},${w},${h},${ctx.fillStyle}`),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const env = (season: Season, ctx: CanvasRenderingContext2D): DrawEnv => ({
  ctx,
  s: SPRITE_COLORS.day,
  c: MAP_COLORS.day,
  palette: "day",
  map: { tiles: [] } as unknown as VillageMap,
  found: new Set(),
  lairs: {},
  season,
  plots: [],
});

const life = (t: number, still: boolean): ShoreLife => ({
  t,
  still,
  palette: "day",
  season: "summer",
  wind: { dir: 1, strength: 1 },
  windmill: false,
  vane: false,
  wheat: false,
  prints: [],
  level: SHORE_LEVELS.lanterns,
  mochi: { x: 30, y: 70 },
});

const byId = new Map(SHORE_LIFE.map((f) => [f.id, f]));

test("beach life unlocks with the shore's one level table", () => {
  expect(byId.get("towels")?.unlock).toEqual({ kind: "level", level: SHORE_LEVELS.beach });
  expect(byId.get("parasols")?.unlock).toEqual({ kind: "level", level: SHORE_LEVELS.beach });
  expect(byId.get("ice-cream-cart")?.unlock).toEqual({ kind: "level", level: SHORE_LEVELS.cart });
  expect(byId.get("sandcastles")?.unlock).toEqual({ kind: "always" });
  expect(byId.get("rowboats")?.unlock).toEqual({ kind: "level", level: SHORE_LEVELS.jetty });
  expect(byId.get("quay-lanterns")?.unlock).toEqual({ kind: "level", level: SHORE_LEVELS.lanterns });
});

test("the beach is full in summer and empties in winter", () => {
  for (const id of ["towels", "parasols", "ice-cream-cart", "swimmers", "kite"]) {
    expect(inSeason(id, "summer"), id).toBe(true);
    expect(inSeason(id, "winter"), id).toBe(false);
  }
  for (const id of ["sandcastles", "rowboats", "gulls"]) expect(inSeason(id, "winter"), id).toBe(true);
});

test("a winter DrawEnv draws nothing for the summer-only ids", () => {
  for (const id of ["towels", "parasols", "ice-cream-cart"]) {
    const winter = recording();
    byId.get(id)!.draw(env("winter", winter.ctx));
    expect(winter.calls, id).toHaveLength(0);

    const summer = recording();
    byId.get(id)!.draw(env("summer", summer.ctx));
    expect(summer.calls.length, id).toBeGreaterThan(0);
  }
});

test("reduced motion holds the moving shore in one pose", () => {
  const first = recording();
  drawShoreLife(first.ctx, SPRITE_COLORS.day, MAP_COLORS.day, life(1, true));
  const later = recording();
  drawShoreLife(later.ctx, SPRITE_COLORS.day, MAP_COLORS.day, life(7, true));
  expect(first.calls).toEqual(later.calls);
  expect(first.calls.length).toBeGreaterThan(0);
});

test("crabs stay a few pixels either side of their spot", () => {
  for (const t of [0, 1, 2.5, 9]) expect(Math.abs(crabAt(0, t).x - 22 * TILE)).toBeLessThanOrEqual(3);
});

test("a gull flies off when Mochi is near and sits when he is away", () => {
  const spot = { x: 18, y: 74 };
  expect(gullAt(0, 0, { x: spot.x + 20, y: spot.y }).gone).toBe(false);
  const scared = gullAt(0, 0, { x: spot.x + 0.5, y: spot.y });
  expect(scared.gone).toBe(false);
  expect(scared.x).toBeGreaterThan(spot.x * TILE + 10);
});

type Box = { x: number; y: number; w: number; h: number };

const CANVAS = { w: 1024, h: 800 };

// A canvas that keeps its pixels, so a scattered feature (the towels) is measured by what it paints.
function pixelRecording(): { ctx: CanvasRenderingContext2D; paintsIn: (box: Box) => boolean } {
  const data = new Uint8ClampedArray(CANVAS.w * CANVAS.h * 4);
  const ctx = {
    fillStyle: "",
    getImageData: (x: number, y: number, w: number, h: number) => {
      const image = { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
      for (let j = 0; j < h; j++) {
        const from = ((y + j) * CANVAS.w + x) * 4;
        image.data.set(data.subarray(from, from + w * 4), j * w * 4);
      }
      return image;
    },
    putImageData: (
      image: { width: number; height: number; data: Uint8ClampedArray },
      x: number,
      y: number,
    ) => {
      for (let j = 0; j < image.height; j++) {
        const from = ((y + j) * CANVAS.w + x) * 4;
        data.set(image.data.subarray(j * image.width * 4, (j + 1) * image.width * 4), from);
      }
    },
    fillRect: (x: number, y: number, w: number, h: number) => {
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) data[((y + j) * CANVAS.w + x + i) * 4 + 3] = 255;
    },
  } as unknown as CanvasRenderingContext2D;
  const paintsIn = (b: Box): boolean => {
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) {
        const i = (y * CANVAS.w + x) * 4;
        if (data[i] | data[i + 1] | data[i + 2] | data[i + 3]) return true;
      }
    return false;
  };
  return { ctx, paintsIn };
}

// The wreck's place rect and the plank steps down to its door (walkSteps in shore.ts), in canvas pixels.
const wreck = PLACES.find((p) => p.id === "wreck")!;
const wreckRect: Box = {
  x: wreck.x * TILE,
  y: wreck.y * TILE,
  w: wreck.w * TILE,
  h: wreck.h * TILE,
};
const stepsTop = SHORE_WALK_ROW * TILE + 7;
const stepsRow = Math.ceil((wreck.door.y * TILE + 1 - stepsTop + 1) / 4);
const wreckSteps: Box = {
  x: wreck.door.x * TILE + TILE / 2 - 10,
  y: stepsTop,
  w: 21,
  h: 4 * stepsRow,
};

test("no beach life overlaps the wreck or the steps down to it", () => {
  for (const f of SHORE_LIFE) {
    const { ctx, paintsIn } = pixelRecording();
    f.draw(env("summer", ctx));
    expect(paintsIn(wreckRect), f.id).toBe(false);
    expect(paintsIn(wreckSteps), f.id).toBe(false);
  }
});
