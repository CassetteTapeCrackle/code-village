import { px, stamp, type Grid } from "../art/draw";
import type { MapColors } from "../art/palette";
import { hash01 } from "./noise";
import { shoreLine } from "./areas";
import type { Life } from "./critters";
import { TILE, type Point } from "./grid";
import { BIRD_SCARE_TILES, nextFlight } from "./render";
import { SHORE_LEVELS } from "./features/shore";
import { inSeason } from "./features/shoreLife";

// The shore's moving life, drawn every frame on the dynamic layer next to the village's (critters.ts).
// Positions are the mockup's (shore-proposals.ts MIX).

// ---------- the mockup's small new sprites, in the shared palette letters ----------
const GULL: Grid = ["....kk.", "...kWek", "kk.kWWy", "kSkWWk.", ".kSSWk.", "..kkk..", "..y.y.."];
const GULL_FLY: Grid = ["k.....k", "WW...WW", ".WWkWW.", "...k..."];
const CRAB: Grid = ["r.....r", ".r.e.r.", "..rrr..", ".rrrrr.", "r.r.r.r"];
const STARFISH: Grid = ["..t..", ".tTt.", "ttTtt", ".t.t.", "t...t"];
const RING: Grid = [".kkkk.", "krWWrk", "kW..Wk", "kr..rk", "kWrrWk", ".kkkk."];
const BATHER: Grid = [".kk.", "kHHk", "kuuk", ".kk."];
const KITE: Grid = ["..k..", ".kRk.", "kRWRk", ".kRk.", "..k.."];

const GULL_SPOTS: readonly [number, number][] = [
  [18, 74],
  [50, 73],
  [84.4, 75],
  [45.4, 74.6],
];
const FLY_SPOTS: readonly [number, number][] = [
  [60, 62],
  [64, 60.6],
];
const CRAB_SPOTS: readonly [number, number][] = [
  [22, 76.6],
  [61, 77.8],
];
const STARFISH_SPOTS: readonly [number, number][] = [
  [5.6, 79.6],
  [9.6, 80.2],
];
const BATHERS: readonly [number, number][] = [
  [41, 79.5],
  [25, 79.8],
];
const RING_SPOT = { x: 36, y: 79.2 };
const KITE_SPOT = { x: 20, y: 60.5 };
const KITE_ANCHOR = { x: 24.3, y: 68.4 };

export type ShoreLife = Life & { level: number; mochi: Point };

// One gull either hops on the ground or follows the village birds' take-off path for `flight` seconds.
export function gullAt(
  i: number,
  t: number,
  mochi: Point,
  flight = 0,
): { x: number; y: number; flip: boolean; gone: boolean } {
  const [tx, ty] = GULL_SPOTS[i];
  const baseFlip = tx > 40;
  const x = Math.round(tx * TILE);
  const y = Math.round(ty * TILE);
  const near = Math.hypot(mochi.x - tx, mochi.y - ty) < BIRD_SCARE_TILES;
  const f = flight || (near ? 1 : 0);
  if (f > 2.5) return { x, y, flip: baseFlip, gone: true };
  if (f > 0) return { x: x + Math.round(f * 40), y: y - Math.round(f * 30), flip: false, gone: false };
  const hop = Math.floor(t * 2 + i * 1.7) % 6 === 0 ? -1 : 0;
  const facing = Math.sin(t / 3 + i) < 0;
  return { x: x + Math.round(Math.sin(t / 3 + i) * 2), y: y + hop, flip: baseFlip !== facing, gone: false };
}

// A crab scuttles a few pixels sideways on the wet sand.
export function crabAt(i: number, t: number): { x: number; y: number; flip: boolean } {
  const [tx, ty] = CRAB_SPOTS[i];
  const wobble = Math.sin(t * 1.4 + i * 2.1);
  return { x: Math.round(tx * TILE + wobble * 3), y: Math.round(ty * TILE), flip: wobble < 0 };
}

// Each gull's own flight clock, like the village birds' in Village.svelte: 0 on the ground, then seconds
// since it took off. `still` holds them all on the ground so the pose never moves.
const gullFlights = GULL_SPOTS.map(() => 0);
let lastT: number | null = null;

export function drawShoreLife(
  ctx: CanvasRenderingContext2D,
  s: Record<string, string>,
  c: MapColors,
  life: ShoreLife,
): void {
  const t = life.still ? 0 : life.t;
  const dt = life.still || lastT === null || t < lastT ? 0 : Math.min(0.25, t - lastT);
  GULL_SPOTS.forEach(([tx, ty], i) => {
    const near = Math.hypot(life.mochi.x - tx, life.mochi.y - ty) < BIRD_SCARE_TILES;
    gullFlights[i] = life.still ? 0 : nextFlight(gullFlights[i], near, dt);
  });
  lastT = life.still ? null : t;

  for (let i = 0; i < GULL_SPOTS.length; i++) {
    const g = gullAt(i, t, life.mochi, gullFlights[i]);
    if (!g.gone) stamp(ctx, GULL, s, g.x, g.y, g.flip);
  }

  // two gulls circling over the harbour
  for (let i = 0; i < FLY_SPOTS.length; i++) {
    const [tx, ty] = FLY_SPOTS[i];
    const a = t * 0.35 + i * 2.5;
    stamp(
      ctx,
      GULL_FLY,
      s,
      Math.round(tx * TILE + Math.cos(a) * 10),
      Math.round(ty * TILE + Math.sin(a) * 6),
      Math.cos(a) < 0,
    );
  }

  for (let i = 0; i < CRAB_SPOTS.length; i++) {
    const crab = crabAt(i, t);
    stamp(ctx, CRAB, s, crab.x, crab.y, crab.flip);
  }

  // starfish lie still in the tide-pool shallows
  for (const [tx, ty] of STARFISH_SPOTS)
    stamp(ctx, STARFISH, s, Math.round(tx * TILE), Math.round(ty * TILE));

  if (life.level >= SHORE_LEVELS.swimmers && inSeason("swimmers", life.season)) {
    const bob = Math.round(Math.sin(t * 1.6));
    for (const [tx, ty] of BATHERS) stamp(ctx, BATHER, s, Math.round(tx * TILE), Math.round(ty * TILE) + bob);
    stamp(ctx, RING, s, Math.round(RING_SPOT.x * TILE), Math.round(RING_SPOT.y * TILE) + bob);
  }

  if (life.level >= SHORE_LEVELS.kite && inSeason("kite", life.season)) drawKite(ctx, s, t);

  // at night a few stars glint on the sea, sparse and slow
  if (life.palette === "night") {
    for (let i = 0; i < 10; i++) {
      if (!life.still && Math.sin(t * 0.7 + i * 2.1) < 0.2) continue;
      const tx = 6 + hash01(i, 1, 910) * 86;
      const ty = shoreLine(tx) + 1 + hash01(i, 2, 910) * 4;
      px(ctx, i % 3 === 0 ? c.crest : s.W, Math.round(tx * TILE), Math.round(ty * TILE));
    }
  }
}

// The kite sways on its string over the dunes.
function drawKite(ctx: CanvasRenderingContext2D, s: Record<string, string>, t: number): void {
  const kx = Math.round(KITE_SPOT.x * TILE + Math.sin(t * 0.9) * 2);
  const ky = Math.round(KITE_SPOT.y * TILE + Math.sin(t * 1.7));
  stamp(ctx, KITE, s, kx, ky);
  const ax = KITE_ANCHOR.x * TILE;
  const ay = KITE_ANCHOR.y * TILE;
  for (let i = 0; i <= 70; i++) {
    const f = i / 70;
    const sx = kx + 2 + (ax - (kx + 2)) * f;
    const sy = ky + 5 + (ay - (ky + 5)) * f;
    px(ctx, s.S, Math.round(sx), Math.round(sy + Math.sin(i / 6 + t * 1.4) * 2 * f));
  }
}
