import type { MapColors } from "../../art/palette";
import { oval, paintAt, smallHouse, type Paint } from "../../art/paint";
import { SHORE_WALK_ROW, shoreLine } from "../areas";
import { TILE } from "../grid";
import { PLACES } from "../layout";
import { hash01 } from "../noise";
import type { Feature } from "../scenery";
import { riverCenterPx, riverHalfPx } from "../terrain";

// placeholder levels: World 4's cap and progression arrive with its course (owner confirms these numbers)
export const SHORE_LEVELS = {
  huts: 12,
  jetty: 13,
  bunting: 14,
  beach: 15,
  cart: 16,
  swimmers: 17,
  kite: 18,
  lanterns: 19,
} as const;

const shoreYPx = (x: number): number => shoreLine(x / TILE) * TILE;

// The walkway row in pixels, and where the boardwalk stops at the river's west bank (the footbridge spans it).
const WALK_PX = SHORE_WALK_ROW * TILE;
const westBank = riverCenterPx(WALK_PX) - riverHalfPx(WALK_PX);
const eastBank = riverCenterPx(WALK_PX) + riverHalfPx(WALK_PX);

// The plank steps from the boardwalk down to the tide pools and the wreck, one flight per door.
const WALK_SPURS = ["tide-pools", "wreck"].map((id) => {
  const door = PLACES.find((p) => p.id === id)!.door;
  return { x: door.x * TILE + TILE / 2, bottom: door.y * TILE + 1 };
});

const always = { kind: "always" } as const;
const atLevel = (n: number) => ({ kind: "level", level: n }) as const;

// ---------- helpers ported from the mockup (shore-proposals.ts MIX), with palette keys for every colour ----------

function shadowBox(p: Paint, x: number, y: number, w: number, h: number): void {
  for (let yy = y + 2; yy < y + h + 3; yy++)
    for (let xx = x + 2; xx < x + w + 3; xx++) if (xx >= x + w || yy >= y + h) p.shade(xx, yy, 0.22);
}

function boardwalkH(
  p: Paint,
  s: Record<string, string>,
  x0: number,
  x1: number,
  y: number,
  rails = false,
): void {
  shadowBox(p, x0, y, x1 - x0, 7);
  for (let x = x0; x < x1; x++) {
    for (let j = 0; j < 7; j++)
      p.put(x, y + j, j === 0 || j === 6 ? s.k : x % 4 === 0 ? s.d : j === 1 ? s.plankLight : s.h);
    if (rails && x % 10 === 0) {
      p.put(x, y - 1, s.k);
      p.put(x, y - 2, s.k);
      p.put(x, y + 7, s.k);
      p.put(x, y + 8, s.k);
    }
  }
  if (rails)
    for (let x = x0; x < x1; x++) {
      p.put(x, y - 3, s.d);
      p.put(x, y + 9, s.d);
    }
}

// The footbridge at the walkway row: a short wooden span over the river, humped a little, with rails on
// both sides and piles down into the water.
function footbridge(p: Paint, s: Record<string, string>, x0: number, x1: number, y: number): void {
  const w = Math.max(1, x1 - x0);
  const hump = (x: number): number => Math.round(2 * Math.sin((Math.PI * (x - x0)) / w));
  for (let x = x0; x < x1; x++) {
    const top = y - hump(x);
    const h = y + 6 - top;
    for (let j = 0; j <= h; j++)
      p.put(x, top + j, j === 0 || j === h ? s.k : x % 3 === 0 ? s.d : j === 1 ? s.plankLight : s.h);
    p.put(x, top - 3, s.d); // far handrail
    p.put(x, y + 9, s.d); // near handrail
  }
  for (let x = x0 + 2; x < x1; x += 5) {
    const top = y - hump(x);
    p.fill(x, top - 2, 1, 2, s.k);
    p.fill(x, y + 7, 1, 2, s.k);
    p.put(x, y + 10, s.o);
    p.put(x, y + 11, s.o); // a pile in the shallows
  }
}

// A few plank steps from the boardwalk down onto the sand.
function walkSteps(p: Paint, s: Record<string, string>, cx: number, top: number, bottom: number): void {
  const n = 4;
  const h = Math.ceil((bottom - top + 1) / n);
  for (let i = 0; i < n; i++) {
    const y = top + i * h;
    const w = 7 + i;
    for (let j = 0; j < h; j++)
      for (let x = cx - w; x <= cx + w; x++)
        p.put(x, y + j, j === 0 ? s.plankLight : j === h - 1 ? s.k : x % 4 === 0 ? s.d : s.h);
  }
}

function jettyV(p: Paint, s: Record<string, string>, x: number, y0: number, y1: number, w = 9): void {
  for (let y = y0; y < y1; y++) for (let i = w; i < w + 3; i++) p.shade(x + i, y + 2, 0.3);
  for (let y = y0; y < y1; y++)
    for (let i = 0; i < w; i++)
      p.put(x + i, y, i === 0 || i === w - 1 ? s.k : y % 4 === 0 ? s.d : i === 1 ? s.plankLight : s.h);
  for (let y = y0 + 6; y < y1; y += 12)
    for (const side of [-2, w]) {
      p.fill(x + side, y, 2, 3, s.k);
      p.put(x + side + (side < 0 ? 1 : 0), y + 1, s.H);
    }
}

function bigBoat(p: Paint, s: Record<string, string>, x: number, y: number, state: "broken" | "fixed"): void {
  // seen from above, bow pointing down to the sea: 14 wide, 26 long
  const L = 26;
  for (let j = 0; j < L; j++) {
    const t = j / (L - 1);
    const half =
      t < 0.55 ? 7 : Math.max(1, Math.round(7 * Math.sqrt(Math.max(0, 1 - ((t - 0.55) / 0.45) ** 2))));
    for (let i = -7; i < 7; i++) {
      const a = Math.abs(i + 0.5);
      if (a > half) continue;
      const X_ = x + 7 + i;
      const Y_ = y + j;
      if (a > half - 1 || j === 0) p.put(X_, Y_, s.k);
      else if (a > half - 2) p.put(X_, Y_, state === "fixed" ? s.W : s.plankLight);
      else if (j === 8 || j === 16) p.put(X_, Y_, s.h);
      else p.put(X_, Y_, state === "fixed" ? (i % 3 ? s.b : s.B) : i % 3 ? s.o : s.H);
    }
  }
  for (let j = 0; j < L; j++) {
    p.shade(x + 15, y + j + 2, 0.25);
    p.shade(x + 16, y + j + 2, 0.2);
  }
  if (state === "broken") {
    for (const [i, j] of [
      [4, 5],
      [5, 5],
      [4, 6],
      [9, 13],
      [9, 14],
      [10, 13],
      [6, 20],
    ] as const)
      p.put(x + i, y + j, s.k);
    for (let i = 0; i < 12; i++) {
      p.put(x + 1 + i, y + 10 + i / 3, s.k);
      p.put(x + 1 + i, y + 9 + i / 3, s.plankLight);
    }
  } else {
    p.fill(x + 6, y + 4, 2, 2, s.k); // the mast seen from above
  }
}

function slipway(p: Paint, s: Record<string, string>, x: number, y0: number, y1: number): void {
  for (let y = y0; y < y1; y++)
    for (let i = -1; i < 19; i++) {
      p.put(x + i, y, i === -1 || i === 18 ? s.k : y % 4 === 0 ? s.d : s.h);
      if (y > shoreYPx(x + 9)) p.shade(x + i, y, 0.35);
    }
}

function beachHut(
  p: Paint,
  s: Record<string, string>,
  x: number,
  y: number,
  col: string,
  col2: string,
): void {
  shadowBox(p, x, y, 14, 19);
  for (let j = 0; j < 7; j++)
    for (let i = 6 - j; i <= 7 + j; i++)
      p.put(x + i, y + j, i === 6 - j || i === 7 + j || j === 0 ? s.k : j % 2 ? s.W : s.cream);
  p.fill(x, y + 7, 14, 1, s.k);
  for (let j = 8; j < 19; j++)
    for (let i = 0; i < 14; i++)
      p.put(x + i, y + j, i === 0 || i === 13 || j === 18 ? s.k : Math.floor(i / 2) % 2 ? s.W : col);
  p.fill(x + 5, y + 11, 4, 7, s.k);
  p.fill(x + 6, y + 12, 2, 6, col2);
  p.fill(x + 4, y + 19, 6, 1, s.h);
}

function quay(p: Paint, c: MapColors, s: Record<string, string>, x0: number, x1: number): void {
  // a stone quay along the waterline: top walk, then a block wall dropping into the water
  for (let x = x0; x < x1; x++) {
    const top = Math.round(shoreYPx(x)) - 10;
    for (let y = top; y < top + 8; y++)
      p.put(x, y, y === top ? s.k : (Math.floor(x / 6) + Math.floor(y / 3)) % 2 ? c.stone : s.stoneLight);
    for (let y = top + 8; y < top + 16; y++)
      p.put(
        x,
        y,
        y === top + 8 ? s.k : Math.floor((x + (Math.floor(y / 4) % 2) * 3) / 6) % 2 ? c.stone2 : s.S,
      );
    p.put(x, top + 16, x % 3 ? c.crest : s.W);
  }
  for (let x = x0 + 4; x < x1; x += 14) {
    const top = Math.round(shoreYPx(x)) - 10;
    p.fill(x, top + 2, 3, 3, s.k);
    p.put(x + 1, top + 3, s.S);
  }
}

function dirtPath(p: Paint, c: MapColors, pts: [number, number][], half = 3): void {
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[k + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1;
    for (let t = 0; t < n; t++) {
      const cx = x0 + ((x1 - x0) * t) / Math.max(1, n - 1);
      const cy = y0 + ((y1 - y0) * t) / Math.max(1, n - 1);
      for (let dy = -half - 1; dy <= half + 1; dy++)
        for (let dx = -half - 1; dx <= half + 1; dx++) {
          const d = Math.hypot(dx, dy);
          if (d <= half - 0.4)
            p.put(
              cx + dx,
              cy + dy,
              hash01(Math.round(cx + dx), Math.round(cy + dy), 3) < 0.12 ? c.wet : c.path2,
            );
          else if (d <= half + 0.6 && !p.is(cx + dx, cy + dy, c.path2)) p.put(cx + dx, cy + dy, c.dry);
        }
    }
  }
}

// Stepping stones up a rocky slope: flat slabs, alternating tones, so a climb reads as steps.
function steppingStones(p: Paint, c: MapColors, s: Record<string, string>, pts: [number, number][]): void {
  let n = 0;
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[k + 1];
    const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6));
    for (let i = k === 0 ? 0 : 1; i <= steps; i++) {
      const cx = Math.round(x0 + ((x1 - x0) * i) / steps);
      const cy = Math.round(y0 + ((y1 - y0) * i) / steps);
      const wide = n++ % 2 === 0;
      oval(p, cx, cy, wide ? 5 : 4, wide ? 2.5 : 2, () => (wide ? c.stone : c.stone2), s.k);
      p.shade(cx + 2, cy + 3, 0.18);
    }
  }
}

function netRack(p: Paint, s: Record<string, string>, x: number, y: number): void {
  for (const px of [0, 18]) {
    for (let j = 0; j < 14; j++) {
      p.put(x + px, y + j, s.k);
      p.put(x + px + 1, y + j, s.H);
    }
    p.shade(x + px + 2, y + 13, 0.25);
  }
  for (let i = 0; i < 20; i++) {
    p.put(x + i, y, s.k);
    p.put(x + i, y + 1, s.d);
  }
  for (let i = 2; i < 18; i++) {
    const sag = Math.round(3 * Math.sin(((i - 2) / 16) * Math.PI));
    for (let j = 2; j < 10 + sag; j++)
      if ((i + j) % 3 === 0 || (i - j + 30) % 3 === 0) p.put(x + i, y + j, s.net);
    if (i % 4 === 2) p.put(x + i, y + 2, s.r);
  }
}

// Bunting hung along the boardwalk rail: a thin string with a small triangle pennant every nine pixels.
function shoreBunting(p: Paint, s: Record<string, string>, x0: number, x1: number, y: number): void {
  const flags = [s.r, s.b, s.a, s.g];
  const stringY = (x: number): number => y + Math.round(2 * Math.sin(((x - x0) / 9) * Math.PI) ** 2);
  for (let x = x0; x < x1; x++) p.put(x, stringY(x), s.k);
  for (let k = 0, x = x0 + 2; x + 1 < x1; x += 9, k++) {
    const fy = stringY(x);
    const col = flags[k % 4];
    // a three wide, three tall pennant hanging off the string, tapering to its point
    p.put(x - 1, fy + 1, col);
    p.put(x, fy + 1, col);
    p.put(x + 1, fy + 1, col);
    p.put(x, fy + 2, col);
    p.put(x + 1, fy + 2, col);
    p.put(x + 1, fy + 3, col);
  }
}

// The six beach hut stripe pairs, in mockup order.
const hutCols = (s: Record<string, string>): [string, string][] => [
  [s.p, s.pink2],
  [s.g, s.green2],
  [s.y, s.gold2],
  [s.purple, s.purple2],
  [s.skyBlue, s.skyBlue2],
  [s.r, s.T],
];

// ---------- the features ----------

export const SHORE_FEATURES: Feature[] = [
  {
    id: "boardwalk",
    land: [],
    unlock: always,
    draw: ({ ctx, s }) =>
      paintAt(ctx, 7 * TILE - 2, WALK_PX - 4, westBank - 7 * TILE + 4, 38, (p) => {
        boardwalkH(p, s, 7 * TILE, westBank, WALK_PX, true);
        for (const spur of WALK_SPURS) walkSteps(p, s, spur.x, WALK_PX + 7, spur.bottom);
      }),
  },
  {
    id: "footbridge",
    land: [],
    unlock: always,
    draw: ({ ctx, s }) =>
      paintAt(ctx, westBank - 3, WALK_PX - 7, eastBank - westBank + 6, 21, (p) =>
        footbridge(p, s, Math.floor(westBank) - 1, Math.ceil(eastBank) + 1, WALK_PX),
      ),
  },
  {
    id: "lighthouse-path",
    land: [],
    unlock: always,
    draw: ({ ctx, c, s }) => {
      const door = PLACES.find((p) => p.id === "lighthouse")!.door;
      const dx = door.x * TILE + TILE / 2;
      const dy = door.y * TILE + TILE / 2;
      const foot = { x: Math.ceil(eastBank) + 1, y: WALK_PX + 4 };
      // the walk ends at the door where the headland starts; stepping stones climb down from it to the tower
      const climb = { x: 87.4 * TILE, y: 74.2 * TILE };
      const base = { x: 89.8 * TILE, y: 78.8 * TILE };
      paintAt(ctx, foot.x - 8, foot.y - 8, base.x - foot.x + 20, base.y - foot.y + 22, (p) => {
        dirtPath(
          p,
          c,
          [
            [foot.x, foot.y],
            [dx, foot.y],
            [dx, dy],
            [climb.x, climb.y],
          ],
          3,
        );
        steppingStones(p, c, s, [
          [climb.x - 2, climb.y + 2],
          [base.x - 2, base.y - 2],
        ]);
      });
    },
  },
  {
    id: "quay",
    land: [],
    unlock: always,
    draw: ({ ctx, c, s }) =>
      paintAt(ctx, 54 * TILE, 77 * TILE, 26 * TILE, 6 * TILE, (p) => quay(p, c, s, 55 * TILE, 79.5 * TILE)),
  },
  {
    id: "long-jetty",
    land: [],
    unlock: always,
    draw: ({ ctx, s }) => {
      const jx = Math.round(73.4 * TILE);
      const y0 = Math.round(shoreYPx(jx + 4) - 4);
      const y1 = Math.round(shoreYPx(jx + 4) + 44);
      paintAt(ctx, jx - 4, y0 - 4, 20, y1 - y0 + 8, (p) => jettyV(p, s, jx, y0, y1));
    },
  },
  {
    id: "second-jetty",
    land: [],
    unlock: atLevel(SHORE_LEVELS.jetty),
    draw: ({ ctx, s }) => {
      const jx = Math.round(59.6 * TILE);
      const y0 = Math.round(shoreYPx(jx + 4) - 4);
      const y1 = Math.round(shoreYPx(jx + 4) + 30);
      paintAt(ctx, jx - 4, y0 - 4, 20, y1 - y0 + 8, (p) => jettyV(p, s, jx, y0, y1));
    },
  },
  {
    id: "slipway",
    land: [],
    unlock: always,
    draw: ({ ctx, s }) => {
      const sx = Math.round(64.2 * TILE);
      const y0 = Math.round(72.4 * TILE);
      const y1 = Math.round(shoreYPx(sx + TILE) + 8);
      paintAt(ctx, sx - 2, y0 - 2, 24, y1 - y0 + 4, (p) => slipway(p, s, sx, y0, y1));
    },
  },
  {
    id: "broken-boat",
    land: [],
    unlock: always,
    draw: ({ ctx, s }) => {
      const bx = Math.round(64.4 * TILE);
      const by = Math.round(72.9 * TILE);
      paintAt(ctx, bx - 4, by - 2, 24, 30, (p) => bigBoat(p, s, bx, by, "broken"));
      // the pot of tar by the ramp, stage 1 of the boat repair
      const tx = Math.round(63.2 * TILE);
      const ty = Math.round(71.4 * TILE);
      paintAt(ctx, tx - 5, ty - 6, 15, 14, (p) => {
        p.fill(tx - 3, ty - 1, 7, 5, s.k);
        p.fill(tx - 2, ty, 5, 3, s.N);
        p.put(tx - 1, ty + 1, s.W);
        p.vline(tx + 2, ty - 4, ty - 1, s.o);
        p.put(tx + 3, ty - 4, s.o);
      });
    },
  },
  {
    id: "bram-hut",
    land: [{ x: 56, y: 64, w: 5, h: 4 }],
    unlock: always,
    draw: ({ ctx, c, s }) =>
      paintAt(ctx, 450, 504, 34, 40, (p) =>
        smallHouse(
          p,
          { c, s },
          Math.round(56.5 * TILE),
          Math.round(64.4 * TILE),
          26,
          21,
          "red",
          "wood",
          true,
        ),
      ),
  },
  {
    id: "net-rack",
    land: [{ x: 52, y: 66, w: 4, h: 3 }],
    unlock: always,
    draw: ({ ctx, s }) =>
      paintAt(ctx, 419, 532, 26, 20, (p) => netRack(p, s, Math.round(52.6 * TILE), Math.round(66.8 * TILE))),
  },
  {
    id: "beach-huts",
    land: [{ x: 9, y: 66, w: 6, h: 3 }],
    unlock: always,
    draw: ({ ctx, s }) =>
      paintAt(ctx, 78, 529, 50, 26, (p) => {
        for (const i of [0, 1])
          beachHut(p, s, Math.round((10 + i * 3.1) * TILE), Math.round(66.4 * TILE), ...hutCols(s)[i]);
      }),
  },
  {
    id: "beach-huts-more",
    land: [{ x: 15, y: 66, w: 13, h: 3 }],
    unlock: atLevel(SHORE_LEVELS.huts),
    draw: ({ ctx, s }) =>
      paintAt(ctx, 126, 529, 96, 26, (p) => {
        for (const i of [2, 3, 4, 5])
          beachHut(p, s, Math.round((10 + i * 3.1) * TILE), Math.round(66.4 * TILE), ...hutCols(s)[i]);
      }),
  },
  {
    id: "shore-bunting",
    land: [],
    unlock: atLevel(SHORE_LEVELS.bunting),
    draw: ({ ctx, s }) =>
      paintAt(ctx, 8 * TILE - 4, 68 * TILE, 73 * TILE, 12, (p) =>
        shoreBunting(p, s, 8 * TILE, 80 * TILE, Math.round(68.7 * TILE)),
      ),
  },
];
