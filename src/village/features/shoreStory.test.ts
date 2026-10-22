import { expect, test } from "vitest";
import { MAP_COLORS, SPRITE_COLORS } from "../../art/palette";
import { PLACES, buildMap } from "../layout";
import type { LairState } from "../render";
import { FLAT_FEATURES, featureLand } from "../scenery";
import type { DrawEnv } from "./env";
import { SHORE_FEATURES } from "./shore";
import { SHORE_LAIRS } from "./shoreLairs";
import { boatStage, drawShoreStory, sailAt, shoreStoryLairs } from "./shoreStory";

const CLEARED: LairState = "cleared";

function cleared(...ids: string[]): Record<string, LairState> {
  return Object.fromEntries(ids.map((id) => [id, CLEARED]));
}

test("the boat is repaired one lair at a time, in region order", () => {
  expect(boatStage({})).toBe(0);
  expect(boatStage(cleared("tide-pools"))).toBe(1);
  expect(boatStage(cleared("tide-pools", "wreck"))).toBe(2);
  expect(boatStage(cleared("tide-pools", "wreck", "lighthouse"))).toBe(3);
  // a later lair only counts when the earlier ones are cleared too
  expect(boatStage(cleared("wreck", "lighthouse"))).toBe(0);
  expect(boatStage(cleared("tide-pools", "lighthouse"))).toBe(1);
});

test("the cheat preview maps a stage to the first cleared lairs and the rest asleep", () => {
  expect(shoreStoryLairs(0)).toEqual({ "tide-pools": "asleep", wreck: "asleep", lighthouse: "asleep" });
  expect(shoreStoryLairs(2)).toEqual({ "tide-pools": "cleared", wreck: "cleared", lighthouse: "asleep" });
  expect(shoreStoryLairs(3)).toEqual({
    "tide-pools": "cleared",
    wreck: "cleared",
    lighthouse: "cleared",
  });
  expect(shoreStoryLairs(9)["lighthouse"]).toBe("cleared"); // clamped
});

test("reduced motion holds the sailing boat in one place", () => {
  expect(sailAt(4, true)).toEqual(sailAt(40, true));
  expect(sailAt(0, false).x).not.toBe(sailAt(30, false).x);
  expect(sailAt(0, false).east).toBe(true);
  expect(sailAt(60, false).east).toBe(false);
});

function fakeCtx(): CanvasRenderingContext2D {
  return {
    canvas: { width: 768, height: 688 },
    fillStyle: "",
    getTransform: () => ({ e: 0, f: 0 }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData: () => {},
    fillRect: () => {},
  } as unknown as CanvasRenderingContext2D;
}

const shoreLairs = PLACES.filter((p) => p.kind === "lair" && p.world === "w4");
const LABEL: Record<string, keyof typeof SHORE_LAIRS> = {
  "tide-pools": "pools",
  wreck: "wreck",
  lighthouse: "lighthouse",
};

test("every shore lair draws for every state", () => {
  const states: LairState[] = ["asleep", "awake", "cleared", "scenery"];
  for (const place of shoreLairs)
    for (const state of states)
      expect(
        () =>
          SHORE_LAIRS[LABEL[place.id]](fakeCtx(), { c: MAP_COLORS.day, s: SPRITE_COLORS.day }, place, state),
        `${place.id} ${state}`,
      ).not.toThrow();
});

function boatEnv(lairs: Record<string, LairState>, season: DrawEnv["season"]): DrawEnv {
  return {
    ctx: fakeCtx(),
    s: SPRITE_COLORS.day,
    c: MAP_COLORS.day,
    palette: "day",
    map: buildMap(["w1", "w2", "w3", "w4"], featureLand()),
    found: new Set(),
    season,
    plots: [],
    lairs,
  };
}

test("the boat feature draws at every stage and in winter, and is flat on the ground", () => {
  const boat = SHORE_FEATURES.find((f) => f.id === "boat")!;
  expect(FLAT_FEATURES.has(boat.id)).toBe(true);
  for (const stage of [0, 1, 2, 3])
    for (const season of ["summer", "winter"] as const) {
      const lairs = shoreStoryLairs(stage);
      expect(() => boat.draw(boatEnv(lairs, season)), `stage ${stage} ${season}`).not.toThrow();
    }
});

test("the story layer draws the sailing boat and the night beam", () => {
  const all = shoreStoryLairs(3);
  expect(() =>
    drawShoreStory(fakeCtx(), SPRITE_COLORS.day, MAP_COLORS.day, {
      lairs: all,
      palette: "day",
      t: 12,
      still: false,
    }),
  ).not.toThrow();
  expect(() =>
    drawShoreStory(fakeCtx(), SPRITE_COLORS.night, MAP_COLORS.night, {
      lairs: all,
      palette: "night",
      t: 0,
      still: true,
    }),
  ).not.toThrow();
  // the story layer is quiet before the last boss falls
  expect(() =>
    drawShoreStory(fakeCtx(), SPRITE_COLORS.day, MAP_COLORS.day, {
      lairs: {},
      palette: "day",
      t: 12,
      still: false,
    }),
  ).not.toThrow();
});
