import { px } from "../../art/draw";
import { groundShadow, oval, paintAt, painter } from "../../art/paint";
import { hash01 } from "../noise";
import type { MapColors } from "../../art/palette";
import { TILE, VX, village } from "../grid";
import { PLACES, PLAZA, STREET_Y } from "../layout";
import type { Feature } from "../scenery";

// Land kept free for the stall and the windmill.
const STALL = { ...village(32, 14), w: 4, h: 3 };
const WINDMILL = { ...village(14, 1), w: 4, h: 7 };

// A sagging string of triangle flags between two points at the same height.
function bunting(
  ctx: CanvasRenderingContext2D,
  s: Record<string, string>,
  x0: number,
  y0: number,
  width: number,
): void {
  const colors = [s.r, s.a, s.l, s.b];
  const sag = (x: number): number => Math.round(3 * Math.sin((Math.PI * x) / width));
  for (let x = 0; x <= width; x++) px(ctx, s.k, x0 + x, y0 + sag(x));
  for (let i = 0, x = 3; x < width - 3; x += 6, i++) {
    const y = y0 + sag(x) + 1;
    px(ctx, colors[i % 4], x0 + x - 2, y, 5, 1);
    px(ctx, colors[i % 4], x0 + x - 1, y + 1, 3, 1);
    px(ctx, colors[i % 4], x0 + x, y + 2, 1, 2);
  }
}

// A market stall: a striped awning with a scalloped edge on two posts, a plank counter with little crates of goods.
function drawStall(
  ctx: CanvasRenderingContext2D,
  c: MapColors,
  s: Record<string, string>,
  stx: number,
  sty: number,
): void {
  paintAt(ctx, stx - 2, sty - 1, 38, 25, (p) => {
    for (let y = sty + 19; y < sty + 21; y++)
      for (let x = stx + 3; x < stx + 33; x++) if ((x + y) % 2 === 0 || y === sty + 19) p.shade(x, y, 0.22);
    for (const x of [stx + 2, stx + 27]) {
      p.vline(x, sty + 4, sty + 18, s.o);
      p.vline(x + 1, sty + 4, sty + 18, s.k);
    }
    for (let y = sty + 11; y < sty + 19; y++) {
      for (let x = stx + 1; x < stx + 30; x++)
        p.put(
          x,
          y,
          y === sty + 11 || y === sty + 18 || x === stx + 1 || x === stx + 29
            ? s.k
            : y === sty + 12
              ? s.h
              : Math.floor(x / 4) % 2
                ? s.d
                : s.o,
        );
    }
    [s.r, s.a, s.c, c.hedge, s.p].forEach((col, i) => {
      const gx = stx + 3 + i * 5;
      p.fill(gx, sty + 9, 4, 2, col);
      p.put(gx, sty + 8, col);
      p.put(gx + 2, sty + 8, col);
      p.hline(gx, gx + 3, sty + 10, s.k);
    });
    for (let y = sty; y < sty + 7; y++) {
      const inset = Math.floor((sty + 7 - y) / 3);
      for (let x = stx - 1 + inset; x < stx + 32 - inset; x++) {
        const stripe = Math.floor((x - stx) / 4) % 2;
        p.put(x, y, y === sty ? s.k : y < sty + 5 ? (stripe ? s.r : s.W) : stripe ? s.R : c.stone);
      }
    }
    for (let x = stx - 1; x < stx + 32; x++) {
      const scallop = (x - stx + 8) % 4 === 1 || (x - stx + 8) % 4 === 2;
      if (scallop) {
        p.put(x, sty + 7, Math.floor((x - stx) / 4) % 2 ? s.R : c.stone);
        p.put(x, sty + 8, s.k);
      } else p.put(x, sty + 7, s.k);
    }
  });
}

// A windmill on the hill: a tapered white tower lit from the left, a stone plinth, a red cap, lattice sails.
function drawWindmill(
  ctx: CanvasRenderingContext2D,
  c: MapColors,
  s: Record<string, string>,
  x0: number,
  y0: number,
): void {
  const cx = x0 + 16;
  const p = painter(ctx, cx - 30, y0 - 14, 60, 72);
  groundShadow(p, cx - 12, y0 + 20, 26, 34);
  for (let y = y0 + 18; y < y0 + 51; y++) {
    const hw = 6 + ((y - (y0 + 18)) * 6) / 33;
    const left = Math.floor(cx - hw);
    const right = Math.floor(cx + hw);
    for (let x = left; x <= right; x++) {
      const t = (x + 0.5 - cx) / hw;
      let col = x === left || x === right ? s.k : t < -0.25 ? s.W : t < 0.35 ? s.w : t < 0.75 ? c.stone : s.s;
      if ((y - y0) % 7 === 0 && col !== s.k) col = col === s.W || col === s.w ? c.stone : s.s;
      p.put(x, y, col);
    }
  }
  for (let y = y0 + 50; y < y0 + 55; y++) {
    for (let x = cx - 14; x <= cx + 14; x++)
      p.put(
        x,
        y,
        y === y0 + 50 || y === y0 + 54 || Math.abs(x - cx) === 14
          ? s.k
          : (Math.floor(x / 3) + y) % 3
            ? c.stone
            : s.S,
      );
  }
  for (let y = y0 + 42; y < y0 + 51; y++) {
    for (let x = cx - 3; x <= cx + 3; x++) {
      if (y === y0 + 42 && Math.abs(x - cx) === 3) continue;
      p.put(x, y, Math.abs(x - cx) === 3 || y === y0 + 42 ? s.k : x % 2 ? s.d : s.o);
    }
  }
  for (const wy of [y0 + 26, y0 + 35]) {
    p.fill(cx - 2, wy, 4, 4, s.k);
    p.fill(cx - 1, wy + 1, 2, 2, c.windowGlow);
  }
  for (let y = y0 + 9; y < y0 + 20; y++) {
    const hw = 3 + (y - (y0 + 9)) * 0.8;
    const left = Math.floor(cx - hw);
    const right = Math.floor(cx + hw);
    for (let x = left; x <= right; x++)
      p.put(
        x,
        y,
        x === left || x === right || y === y0 + 9 || y === y0 + 19 ? s.k : x + 0.5 < cx ? s.r : s.R,
      );
  }
  p.vline(cx, y0 + 6, y0 + 9, s.k);
  // the sails turn with the wind on the dynamic layer (critters.ts)
  p.flush();
}

const level = (n: number) => ({ kind: "level", level: n }) as const;
const plazaX = PLAZA.x * TILE;
const plazaY = PLAZA.y * TILE;

// What levels add to the map, drawn in this order (spec 2.5: cosmetic only).
export const LEVEL_DECOR: Feature[] = [
  {
    id: "flowers",
    land: [],
    unlock: level(3),
    draw: ({ ctx, c, s }) => {
      // round flower beds at the plaza's four corners
      for (const [x, y] of [
        [518, 357],
        [578, 357],
        [518, 389],
        [578, 389],
      ]) {
        paintAt(ctx, x - 9, y - 5, 18, 10, (p) =>
          oval(
            p,
            x,
            y,
            7,
            3,
            (px, py) =>
              hash01(px, py, 182) < 0.35
                ? [s.p, s.a, s.r, s.W][Math.floor(hash01(px, py, 181) * 4)]
                : hash01(px, py, 183) < 0.6
                  ? c.hedge
                  : c.hedge2,
            c.stone2,
          ),
        );
      }
    },
  },
  {
    id: "fountain",
    land: [],
    unlock: level(4),
    draw: ({ ctx, c, s }) => {
      // a round stone fountain with a little jet
      const fx = PLAZA.center.x * TILE + 4;
      const fy = PLAZA.center.y * TILE + 4;
      paintAt(ctx, fx - 12, fy - 11, 25, 20, (p) => {
        oval(p, fx, fy + 2, 10, 4.5, (_x, y) => (y < fy ? s.W : c.stone), s.k);
        oval(p, fx, fy + 1.5, 8, 3, (x, y) => ((x + y) % 4 === 0 ? c.water2 : c.water));
        p.vline(fx, fy - 5, fy + 1, c.stone);
        p.vline(fx + 1, fy - 5, fy + 1, c.stone2);
        oval(p, fx + 0.5, fy - 5, 3, 1.2, () => c.stone, s.k);
        [
          [-1, -8],
          [0, -9],
          [1, -9],
          [2, -8],
          [-2, -6],
          [3, -6],
          [-3, -3],
          [4, -3],
        ].forEach(([dx, dy], i) => p.put(fx + dx, fy + dy, i % 2 ? s.W : c.water2));
      });
    },
  },
  {
    id: "stall",
    land: [STALL],
    unlock: level(3),
    draw: ({ ctx, c, s }) => drawStall(ctx, c, s, STALL.x * TILE + 1, STALL.y * TILE - 2),
  },
  {
    id: "windmill",
    land: [WINDMILL],
    unlock: level(5),
    draw: ({ ctx, c, s }) => drawWindmill(ctx, c, s, WINDMILL.x * TILE, WINDMILL.y * TILE),
  },
  {
    id: "lanterns",
    land: [],
    unlock: level(2),
    draw: ({ ctx, s, c, palette, map }) => {
      for (let tx = VX + 3; tx < VX + 55; tx += 5) {
        for (const ty of [STREET_Y - 1, STREET_Y + 1]) {
          if (map.tiles[ty][tx] !== "." || (ty > STREET_Y && tx % 2 === 0)) continue;
          const lx = tx * TILE + 1;
          const ly = ty * TILE + TILE - 11;
          if (palette === "night") {
            for (let dy = -7; dy <= 7; dy++)
              for (let dx = -7; dx <= 7; dx++)
                if (dx * dx + dy * dy <= 45) px(ctx, c.glow, lx + 2 + dx, ly + 2 + dy);
          }
          paintAt(ctx, lx - 1, ly - 2, 7, 15, (p) => {
            // an iron post with a glass lamp
            p.vline(lx + 2, ly + 4, ly + 10, s.k);
            p.put(lx + 1, ly + 10, s.k);
            p.put(lx + 3, ly + 10, s.k);
            p.hline(lx, lx + 4, ly + 11, s.k);
            p.put(lx + 2, ly - 1, s.k);
            p.hline(lx + 1, lx + 3, ly, s.k);
            for (let y = ly + 1; y < ly + 4; y++) {
              p.put(lx, y, s.k);
              p.put(lx + 4, y, s.k);
              p.put(lx + 1, y, s.y);
              p.put(lx + 2, y, y === ly + 1 ? s.W : s.y);
              p.put(lx + 3, y, s.a);
            }
            p.hline(lx, lx + 4, ly + 4, s.k);
          });
        }
      }
    },
  },
  {
    id: "bunting",
    land: [],
    unlock: level(6),
    draw: ({ ctx, s }) => {
      const school = PLACES.find((p) => p.kind === "school")!;
      bunting(ctx, s, school.x * TILE + 1, (school.y + school.h) * TILE - 22, school.w * TILE - 2);
      bunting(ctx, s, plazaX - 4, plazaY - 7, PLAZA.w * TILE + 8);
    },
  },
];
