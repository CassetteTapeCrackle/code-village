import { px } from "../../art/draw";
import type { MapColors } from "../../art/palette";
import { shoreLine } from "../areas";
import type { Palette } from "../clock";
import { TILE } from "../grid";
import { MAP_H, MAP_W, PLACES } from "../layout";
import type { LairState } from "../render";

// The shore's three lairs in story order: the tide pools (region a), the wreck (b), the lighthouse (c).
export const SHORE_STORY_LAIRS = ["tide-pools", "wreck", "lighthouse"] as const;

export type BoatStage = 0 | 1 | 2 | 3;

// The boat is repaired one piece per boss, and a later repair only counts when the earlier ones are done too.
export function boatStage(lairs: Record<string, LairState>): BoatStage {
  let stage = 0;
  for (const id of SHORE_STORY_LAIRS) {
    if (lairs[id] !== "cleared") break;
    stage += 1;
  }
  return stage as BoatStage;
}

// The cheat screen previews a stage: the first n lairs cleared, the rest asleep, so the boat and lairs agree.
export function shoreStoryLairs(stage: number): Record<string, LairState> {
  const n = Math.max(0, Math.min(SHORE_STORY_LAIRS.length, Math.floor(stage)));
  return Object.fromEntries(
    SHORE_STORY_LAIRS.map((id, i): [string, LairState] => [id, i < n ? "cleared" : "asleep"]),
  );
}

const SAIL_FROM = 26 * TILE;
const SAIL_TO = 52 * TILE;
const SAIL_SECONDS = 90; // one drift east and back

// Where the boat is on the water (map pixels) and which way she is heading. With reduced motion she holds mid-way.
export function sailAt(t: number, still: boolean): { x: number; east: boolean } {
  if (still) return { x: (SAIL_FROM + SAIL_TO) / 2, east: true };
  const u = ((t < 0 ? 0 : t) / SAIL_SECONDS) % 1;
  const east = u < 0.5;
  return { x: Math.round(SAIL_FROM + (SAIL_TO - SAIL_FROM) * (east ? u * 2 : 2 - u * 2)), east };
}

// The painted boat at stage 3, seen from above with her bow to the east: blue and white hull, sail, pennant, wake.
function drawStoryBoat(
  ctx: CanvasRenderingContext2D,
  s: Record<string, string>,
  c: MapColors,
  t: number,
  still: boolean,
): void {
  const { x: bx, east } = sailAt(t, still);
  const bob = still ? 0 : Math.round(Math.sin(t / 2.2));
  const y = Math.round(shoreLine(bx / TILE) * TILE) + 16 + bob;
  const at = (dx: number, dy: number): [number, number] => [east ? bx + dx : bx - dx, y + dy];
  // hull: a pointed bow, striped blue and white, a white rail
  for (let dx = -11; dx <= 12; dx++) {
    const bow = dx > 8 ? (12 - dx) / 4 : 1;
    const half = Math.max(0, Math.round(5 * bow));
    for (let dy = -half; dy <= half; dy++) {
      const [col, row] = at(dx, dy);
      const edge = Math.abs(dy) === half;
      const colour =
        edge || dx === -11 || half === 0 ? s.k : Math.abs(dy) === half - 1 || dx % 4 === 0 ? s.W : s.b;
      px(ctx, colour, col, row);
    }
  }
  // the sail, a white triangle leaning out from the mast
  for (let i = 0; i < 7; i++)
    for (let dy = -i; dy <= i; dy++) {
      const [col, row] = at(-1 + i, dy);
      px(ctx, Math.abs(dy) === i ? s.V : s.W, col, row);
    }
  // the mast, and a red pennant streaming behind
  const [mx, my] = at(0, 0);
  px(ctx, s.k, mx, my, 2, 2);
  const flap = still ? 0 : Math.round(Math.sin(t * 4));
  for (let i = 1; i <= 4; i++) {
    const [col, row] = at(-i, -1 + flap * (i % 2));
    px(ctx, s.r, col, row);
  }
  // her wake: foam astern, spreading in a V
  for (let i = 0; i < 9; i++) {
    const [col, row] = at(-13 - i, Math.round(i / 4) * (i % 2 ? 1 : -1));
    px(ctx, c.foam, col, row);
  }
}

// Canvas angles run clockwise from east, so PI / 2 is due south: the lit lamp sweeps the sea that is actually inside
// the map, south-east through south to south-west of the headland. The beam is clipped to the water, so it never
// lights the sand, the rocks or the village.
const BEAM_MID = Math.PI / 2 + 0.18;
const BEAM_SWING = 0.56;
export const BEAM_ARC = { from: BEAM_MID - BEAM_SWING, to: BEAM_MID + BEAM_SWING } as const;
const BEAM_SWEEP_SECONDS = 34; // one slow pass out and back
const BEAM_HALF_ANGLE = 0.075; // thin at the lamp, widening with distance
const BEAM_REACH = 260;
const BEAM_ALPHA = 0.85; // of the palette glow's own 0.28, so the light stays faint
const LAMP_HALO = 14;

export function beamAngle(t: number, still: boolean): number {
  if (still) return BEAM_MID;
  return BEAM_MID + Math.sin((t / BEAM_SWEEP_SECONDS) * Math.PI * 2) * BEAM_SWING;
}

// Everything below the shoreline is sea; the beam may only light that.
function clipToSea(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(0, MAP_H * TILE);
  for (let x = 0; x <= MAP_W; x += 1) ctx.lineTo(x * TILE, shoreLine(x) * TILE);
  ctx.lineTo(MAP_W * TILE, MAP_H * TILE);
  ctx.closePath();
  ctx.clip();
}

// A radial fade of the palette's glow: brightest at the lamp, gone by `reach`. "transparent" carries the glow's
// own alpha down to nothing without introducing a colour of its own.
function glowFade(
  ctx: CanvasRenderingContext2D,
  c: MapColors,
  x: number,
  y: number,
  reach: number,
): CanvasGradient {
  const gradient = ctx.createRadialGradient(x, y, 2, x, y, reach);
  gradient.addColorStop(0, c.glow);
  gradient.addColorStop(1, "transparent");
  return gradient;
}

// The lit lighthouse's beam: a soft wedge over the sea, held still with reduced motion, and a small halo on the lamp.
export function drawBeam(ctx: CanvasRenderingContext2D, c: MapColors, t: number, still: boolean): void {
  const place = PLACES.find((p) => p.id === "lighthouse");
  if (!place) return;
  const lx = place.x * TILE + (place.w * TILE) / 2;
  const ly = place.y * TILE + 16; // the lamp room's middle
  const angle = beamAngle(t, still);
  ctx.save();
  ctx.globalAlpha = BEAM_ALPHA;
  ctx.fillStyle = glowFade(ctx, c, lx, ly, BEAM_REACH);
  clipToSea(ctx);
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.arc(lx, ly, BEAM_REACH, angle - BEAM_HALF_ANGLE, angle + BEAM_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // the lamp itself stays a small, soft glow above the tower
  ctx.save();
  ctx.fillStyle = glowFade(ctx, c, lx, ly, LAMP_HALO);
  ctx.beginPath();
  ctx.arc(lx, ly, LAMP_HALO, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export type ShoreStory = {
  lairs: Record<string, LairState>;
  palette: Palette;
  t: number;
  still: boolean;
};

// The story on the moving layer: the boat sailing once she is repaired, and the lighthouse beam at night.
export function drawShoreStory(
  ctx: CanvasRenderingContext2D,
  s: Record<string, string>,
  c: MapColors,
  story: ShoreStory,
): void {
  const still = story.still;
  const t = still ? 0 : story.t;
  // the beam lies under the boat, so she sails through the light instead of being washed over by it
  if (story.palette === "night" && story.lairs["lighthouse"] === "cleared") drawBeam(ctx, c, t, still);
  if (boatStage(story.lairs) === 3) {
    drawStoryBoat(ctx, s, c, t, still);
  }
}
