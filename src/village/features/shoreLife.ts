import { px, stamp, type Grid } from "../../art/draw";
import { paintAt, type Paint } from "../../art/paint";
import { HANDCART, LANTERN, ROWBOAT } from "../../art/sprites";
import type { MapColors } from "../../art/palette";
import { shoreLine } from "../areas";
import { TILE } from "../grid";
import type { Feature } from "../scenery";
import type { Season } from "../weather";
import { SHORE_LEVELS } from "./shore";

// Beach life that stays put: towels, parasols, the cart, sandcastles, rowboats and the quay lanterns.
// Positions are the mockup's (shore-proposals.ts MIX), in world tiles.

// Nothing but the sandcastles, the boats and the lanterns stays out in winter: the beach empties.
const SUMMER_ONLY: ReadonlySet<string> = new Set([
  "towels",
  "parasols",
  "ice-cream-cart",
  "swimmers",
  "kite",
]);

export function inSeason(id: string, season: Season): boolean {
  return season !== "winter" || !SUMMER_ONLY.has(id);
}

const atLevel = (level: number) => ({ kind: "level", level }) as const;

// ---------- the mockup's small new sprites, in the shared palette letters ----------
const CASTLE: Grid = [
  "k.k...k.k",
  "kxk.r.kxk",
  "kxk.k.kxk",
  "kxxkkkxxk",
  "kxxxxxxxk",
  "kxxkkkxxk",
  "kxxk.kxxk",
  "kkkkkkkkk",
];
const BUCKET: Grid = ["k...k", ".kkk.", "kbbbk", "kbbbk", ".kkk."];

// ---------- painted pieces (shore-proposals.ts) ----------

function towel(p: Paint, x: number, y: number, a: string, b: string): void {
  for (let j = 0; j < 12; j++)
    for (let i = 0; i < 7; i++)
      p.put(x + i, y + j, j === 0 || j === 11 ? (i % 2 ? b : a) : Math.floor(j / 2) % 2 ? a : b);
  for (let j = 1; j < 13; j++) p.shade(x + 7, y + j, 0.15);
}

// A striped parasol seen from above: eight wedges, a dark rim and its shadow to the lower right.
function parasol(p: Paint, cx: number, cy: number, a: string, b: string, k: string, r = 7): void {
  for (let yy = -r; yy <= r; yy++)
    for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) p.shade(cx + xx + 4, cy + yy + 5, 0.2);
  for (let yy = -r; yy <= r; yy++)
    for (let xx = -r; xx <= r; xx++) {
      const d = xx * xx + yy * yy;
      if (d > r * r) continue;
      if (d > (r - 1) * (r - 1)) {
        p.put(cx + xx, cy + yy, k);
        continue;
      }
      const seg = Math.floor(((Math.atan2(yy, xx) + Math.PI) / (2 * Math.PI)) * 8) % 2;
      p.put(cx + xx, cy + yy, seg ? a : b);
    }
  p.put(cx, cy, k);
}

// Towels laid out on the sand, two colours each.
const TOWELS: readonly [number, number, string, string][] = [
  [28, 73.2, "r", "W"],
  [30.4, 73.6, "b", "W"],
  [36.2, 72.8, "y", "r"],
  [38.4, 73.4, "g", "W"],
  [53, 72.8, "purple", "W"],
  [54.4, 73.2, "r", "y"],
];

// The three striped parasols, centre in world tiles.
const PARASOLS: readonly [number, number, string, string, number?][] = [
  [29.8, 72.3, "r", "W"],
  [37.8, 72.2, "b", "W"],
  [53.6, 71.8, "y", "W", 8],
];

// Rowboats moored off the jetties: x, y, flipped.
const ROWBOATS: readonly [number, number, boolean][] = [
  [76.4, 79.6, false],
  [62.4, 80.5, true],
  [70.2, 81.3, false],
];

const LANTERNS_X = [57, 63, 69, 75];

export const SHORE_LIFE: Feature[] = [
  {
    id: "towels",
    land: [],
    unlock: atLevel(SHORE_LEVELS.beach),
    draw: ({ ctx, s, season }) => {
      if (!inSeason("towels", season)) return;
      paintAt(ctx, 26 * TILE, 70 * TILE, 30 * TILE, 5 * TILE, (p) => {
        for (const [tx, ty, a, b] of TOWELS)
          towel(p, Math.round(tx * TILE), Math.round(ty * TILE), s[a], s[b]);
      });
    },
  },
  {
    id: "parasols",
    land: [],
    unlock: atLevel(SHORE_LEVELS.beach),
    draw: ({ ctx, s, season }) => {
      if (!inSeason("parasols", season)) return;
      paintAt(ctx, 28 * TILE, 70 * TILE, 28 * TILE, 4 * TILE, (p) => {
        for (const [tx, ty, a, b, r] of PARASOLS)
          parasol(p, Math.round(tx * TILE), Math.round(ty * TILE), s[a], s[b], s.k, r ?? 7);
      });
    },
  },
  {
    id: "ice-cream-cart",
    land: [],
    unlock: atLevel(SHORE_LEVELS.cart),
    draw: ({ ctx, s, season }) => {
      if (!inSeason("ice-cream-cart", season)) return;
      stamp(ctx, HANDCART, s, Math.round(50.8 * TILE), Math.round(72.2 * TILE));
      paintAt(ctx, 50 * TILE, 70 * TILE, 5 * TILE, 4 * TILE, (p) =>
        parasol(p, Math.round(51.8 * TILE), Math.round(71.6 * TILE), s.r, s.W, s.k, 5),
      );
    },
  },
  {
    id: "sandcastles",
    land: [],
    unlock: { kind: "always" },
    draw: ({ ctx, s }) => {
      for (const [tx, ty] of [
        [33.5, 75.2],
        [40.6, 75.4],
      ])
        stamp(ctx, CASTLE, { ...s, x: s.plankLight }, Math.round(tx * TILE), Math.round(ty * TILE));
      stamp(ctx, BUCKET, s, Math.round(35.2 * TILE), Math.round(76 * TILE));
    },
  },
  {
    id: "rowboats",
    land: [],
    unlock: atLevel(SHORE_LEVELS.jetty),
    draw: ({ ctx, s }) => {
      for (const [tx, ty, flip] of ROWBOATS)
        stamp(ctx, ROWBOAT, s, Math.round(tx * TILE), Math.round(ty * TILE), flip);
    },
  },
  {
    id: "quay-lanterns",
    land: [],
    unlock: atLevel(SHORE_LEVELS.lanterns),
    draw: ({ ctx, c, s, palette }) => {
      for (const tx of LANTERNS_X) {
        const lx = tx * TILE;
        // the quay's drawn top edge follows shoreLine (quay in shore.ts): its paved walk is the eight rows
        // from there, so the post's foot (the last of its eleven rows) lands on the stones
        const top = Math.round(shoreLine((lx + 2) / TILE) * TILE) - 10;
        const ly = top - 3;
        if (palette === "night") glow(ctx, c, lx + 2, ly + 2);
        stamp(ctx, LANTERN, s, lx, ly);
      }
    },
  },
];

// The same soft round glow the village lanterns use (levelDecor.ts).
function glow(ctx: CanvasRenderingContext2D, c: MapColors, cx: number, cy: number): void {
  for (let dy = -7; dy <= 7; dy++)
    for (let dx = -7; dx <= 7; dx++) if (dx * dx + dy * dy <= 45) px(ctx, c.glow, cx + dx, cy + dy);
}
