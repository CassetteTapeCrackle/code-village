import { oval, paintAt, roundedBand, type Paint } from "../../art/paint";
import { stamp } from "../../art/draw";
import { TREE } from "../../art/sprites";
import { TILE, village } from "../grid";
import { fbm, hash01 } from "../noise";
import type { Feature } from "../scenery";
import { riverCenterPx, riverHalfPx } from "../terrain";
import { bloomSpots, leafColours, snowCapped } from "../weather";
import { snowAt } from "../terrainPaint";
import { bundle } from "../../content/bundle";

// Everyday things around the village, there from the first day (world pixels), in drawing order.
// Ported from the world-pass mockup (props.py); light comes from the upper left.
const always = { kind: "always" } as const;
const life = (id: string, land: Feature["land"], draw: Feature["draw"]): Feature => ({
  id,
  land,
  unlock: always,
  draw,
});
const dither = (p: Paint, x0: number, y0: number, w: number, h = 2): void => {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) if ((x + y) % 2 === 0 || y === y0) p.shade(x, y, 0.22);
};

// The orchard north-east of the school: a stone wall with rounded corners round three apple trees; its gate
// is padlocked until the Key Ring is found.
const ORCHARD = { x: 71 * TILE + 1, y: 29 * TILE + 3, w: 6 * TILE - 2, h: 5 * TILE - 5 };

// Broken runs of rounded bushes along the main street, drawn before the lanterns.
export const HEDGEROWS: Feature = life("hedgerows", [], ({ ctx, c, s, map }) => {
  for (const ty of [45, 47]) {
    let run: number[] = [];
    for (let tx = 41; tx <= 95; tx++) {
      const near = (chars: string): boolean =>
        [-1, 0, 1].some((dy) =>
          [-1, 0, 1].some((dx) => chars.includes(map.tiles[ty + dy]?.[tx + dx] ?? ".")),
        );
      const free = tx < 95 && map.tiles[ty][tx] === "." && fbm(tx / 4, ty, 55) > 0.5 && !near("BD");
      if (free) {
        run.push(tx);
        continue;
      }
      if (run.length >= 2) {
        const x0 = run[0] * TILE;
        const w = run.length * TILE;
        const top = ty * TILE - (ty === 45 ? 3 : 0);
        paintAt(ctx, x0 - 2, top - 2, w + 6, 16, (p) => {
          for (let cx = 3; cx < w - 3;) {
            const r = 2.6 + hash01(cx, ty, 58) * 2.4;
            if (hash01(cx, ty, 60) > 0.18) {
              const bx = x0 + cx + r * 0.6;
              const by = top + 7 - r * 0.5 + hash01(cx, ty, 57) * 1.5;
              for (let y = Math.floor(by - r); y <= by + r; y++)
                for (let x = Math.floor(bx - r); x <= bx + r; x++)
                  if ((x - bx) ** 2 + (y - by) ** 2 <= r * r) p.shade(x + 2, y + 2, 0.2);
              oval(
                p,
                bx,
                by,
                r,
                r,
                (x, y) =>
                  y < by - r / 2
                    ? c.hedge2
                    : y > by + r / 2
                      ? c.hedge3
                      : hash01(x, y, 59) < 0.03
                        ? s.p
                        : c.hedge,
                s.k,
              );
            }
            cx += Math.floor(r * 1.5) + 1;
          }
        });
      }
      run = [];
    }
  }
});

export const VILLAGE_LIFE: Feature[] = [
  // wildflowers that spill from the garden's full blooms onto the paths of their own world
  life("garden-bloom", [], ({ ctx, c, map, plots }) =>
    paintAt(ctx, 0, 0, map.w * TILE, map.h * TILE, (p) => {
      for (const spot of bloomSpots(plots, bundle.lessons, map)) {
        p.put(spot.x, spot.y, spot.colour);
        p.put(spot.x + 1, spot.y, spot.colour);
        p.put(spot.x, spot.y + 1, c.hedge);
      }
    }),
  ),
  {
    ...life("orchard", [{ x: 71, y: 29, w: 6, h: 5 }], ({ ctx, c, s, found, season }) => {
      const { x: ox, y: oy, w: ow, h: oh } = ORCHARD;
      const open = found.has("key-ring");
      const gateX = ox + Math.floor(ow / 2) - 5;
      paintAt(ctx, ox - 2, oy - 2, ow + 8, oh + 8, (p) => {
        for (let y = oy + 10; y < oy + oh + 3; y++)
          for (let x = ox + 3; x < ox + ow + 3; x++)
            if ((x >= ox + ow || y >= oy + oh) && ((x + y) % 2 === 0 || x < ox + ow + 2)) p.shade(x, y, 0.2);
        roundedBand(ox, oy, ow, oh, 6, (x, y, band) => {
          if (band === 4 || band === 3)
            p.put(
              x,
              y,
              (season === "winter" && snowAt(x, y, c)) || ((x * 3 + y) % 7 === 0 ? c.grass2 : c.grass),
            );
        });
      });
      for (let i = 0; i < 3; i++)
        stamp(
          ctx,
          season === "winter" ? snowCapped(TREE) : TREE,
          { ...s, ...leafColours(season, s, c), ...(season === "winter" ? {} : { l: s.r }) },
          ox + 5 + i * 13,
          oy + 2 + (i % 2) * 6,
        );
      paintAt(ctx, ox - 2, oy - 2, ow + 8, oh + 8, (p) => {
        roundedBand(ox, oy, ow, oh, 6, (x, y, band) => {
          if (band > 2 || (x >= gateX && x < gateX + 10 && y > oy + oh - 6)) return;
          p.put(x, y, band === 1 ? ((Math.floor(x / 3) + Math.floor(y / 2)) % 4 ? c.stone : c.stone2) : s.k);
        });
        for (let x = gateX; x < gateX + 10; x++) {
          for (let y = oy + oh - 5; y < oy + oh; y++) {
            if (open) p.put(x, y, x === gateX || x === gateX + 9 ? s.k : c.grass2);
            else
              p.put(
                x,
                y,
                y === oy + oh - 5 || y === oy + oh - 1 || x === gateX || x === gateX + 9 || x % 2 ? s.k : s.d,
              );
          }
        }
        p.vline(gateX - 1, oy + oh - 8, oy + oh - 1, s.k);
        p.vline(gateX + 10, oy + oh - 8, oy + oh - 1, s.k);
        if (!open) {
          p.put(gateX + 4, oy + oh - 4, s.a);
          p.put(gateX + 5, oy + oh - 4, s.a);
          p.put(gateX + 4, oy + oh - 3, s.a);
          p.put(gateX + 5, oy + oh - 3, s.k); // the padlock
        }
      });
    }),
    at: { x: 74, y: 33 },
    label: "the walled orchard, its gate open",
  },
  life("laundry", [], ({ ctx, s }) => {
    const [lx0, lx1, ly] = [362, 396, 420];
    const sag = (x: number): number => Math.floor(2.5 * Math.sin((Math.PI * (x - lx0)) / (lx1 - lx0)));
    paintAt(ctx, lx0 - 2, ly - 4, 40, 22, (p) => {
      for (const x of [lx0, lx1]) {
        p.vline(x, ly - 2, ly + 14, s.o);
        p.vline(x + 1, ly - 2, ly + 14, s.k);
        p.put(x, ly - 3, s.k);
        p.put(x + 1, ly - 3, s.k);
      }
      for (let x = lx0 + 2; x < lx1; x++) p.put(x, ly + sag(x), s.k);
      // the clothes swing with the wind on the dynamic layer (critters.ts)
    });
  }),
  life("vegetables", [], ({ ctx, c, s }) => {
    const [vx, vy, vw, vh] = [362, 438, 30, 16];
    paintAt(ctx, vx - 1, vy - 1, vw + 4, vh + 4, (p) => {
      dither(p, vx + 2, vy + vh, vw);
      roundedBand(vx, vy, vw, vh, 3, (x, y, band) =>
        p.put(x, y, band === 0 || band === 2 ? s.k : band === 1 ? s.d : (x + y) % 3 ? c.soil : c.soil2),
      );
      for (let i = 0; i < 5; i++)
        oval(p, vx + 5 + i * 5, vy + 5, 2, 1.6, (_x, y) => (y < vy + 5 ? s.l : c.hedge), s.k); // cabbages
      for (let i = 0; i < 6; i++) {
        const x = vx + 4 + i * 4;
        p.put(x, vy + 9, c.hedge2);
        p.put(x + 1, vy + 8, c.hedge);
        p.put(x, vy + 10, s.c); // carrot tops
      }
      for (let i = 0; i < 3; i++) {
        const x = vx + 6 + i * 9;
        p.vline(x, vy + 8, vy + 13, s.o);
        p.put(x - 1, vy + 10, s.r);
        p.put(x + 1, vy + 12, s.r);
        p.put(x + 1, vy + 9, c.hedge); // tomato canes
      }
    });
  }),
  life("woodpile", [{ ...village(16, 25), w: 2, h: 4 }], ({ ctx, s }) => {
    const [wx, wy] = [450, 452];
    paintAt(ctx, wx - 1, wy - 10, 28, 18, (p) => {
      [4, 3, 2].forEach((n, row) => {
        for (let i = 0; i < n; i++) {
          const x = wx + i * 4 + row * 2;
          const y = wy - row * 4;
          for (const [ex, ey] of [
            [1, 0],
            [2, 0],
            [0, 1],
            [3, 1],
            [0, 2],
            [3, 2],
            [1, 3],
            [2, 3],
          ])
            p.put(x + ex, y + ey, s.k);
          p.put(x + 1, y + 1, s.c);
          p.put(x + 2, y + 1, s.h);
          p.put(x + 1, y + 2, s.h);
          p.put(x + 2, y + 2, s.o);
        }
      });
      dither(p, wx + 1, wy + 4, 18);
      p.fill(wx + 19, wy, 5, 4, s.o);
      p.hline(wx + 19, wx + 23, wy, s.c);
      p.hline(wx + 19, wx + 23, wy + 4, s.k);
      p.vline(wx + 18, wy, wy + 3, s.k);
      p.vline(wx + 24, wy, wy + 3, s.k);
      p.put(wx + 22, wy - 1, s.s);
      p.put(wx + 23, wy - 1, s.s);
      p.put(wx + 21, wy - 2, s.o);
      p.put(wx + 20, wy - 3, s.o); // the axe in the chopping block
    });
  }),
  life("mailbox", [{ ...village(10, 29), w: 2, h: 2 }], ({ ctx, s }) => {
    const [mx, my] = [401, 455];
    paintAt(ctx, mx - 1, my - 4, 12, 18, (p) => {
      p.vline(mx + 3, my + 5, my + 13, s.o);
      p.vline(mx + 4, my + 5, my + 13, s.k);
      for (let y = my; y < my + 6; y++) {
        for (let x = mx; x < mx + 8; x++) {
          if (y === my && (x === mx || x === mx + 7)) continue;
          p.put(
            x,
            y,
            y === my || y === my + 5 || x === mx || x === mx + 7
              ? s.k
              : y === my + 1 && x < mx + 4
                ? s.W
                : s.b,
          );
        }
      }
      p.vline(mx + 8, my - 3, my + 1, s.k);
      p.put(mx + 9, my - 3, s.r);
      p.put(mx + 9, my - 2, s.r);
    });
  }),
  life("barrels", [{ ...village(15, 15), w: 2, h: 3 }], ({ ctx, s }) => {
    paintAt(ctx, 438, 350, 20, 22, (p) => {
      for (const [bx, by] of [
        [441, 352],
        [447, 358],
      ]) {
        for (let y = 0; y < 7; y++) {
          const w = y >= 1 && y <= 5 ? 6 : 4;
          const l = (6 - w) / 2;
          for (let x = l; x < l + w; x++)
            p.put(
              bx + x,
              by + y,
              x === l || x === l + w - 1 || y === 0 || y === 6
                ? s.k
                : y === 2 || y === 4
                  ? s.S
                  : x === 1
                    ? s.c
                    : x < 4
                      ? s.d
                      : s.o,
            );
        }
      }
      for (let y = 0; y < 7; y++)
        for (let x = 0; x < 7; x++)
          p.put(
            440 + x,
            360 + y,
            x === 0 || x === 6 || y === 0 || y === 6 || x === y ? s.k : y < 3 ? s.h : s.d,
          );
      dither(p, 441, 367, 14);
    });
  }),
  life("flagpole", [{ ...village(22, 7), w: 1, h: 5 }], ({ ctx, c, s }) => {
    const [fx, fy] = [501, 280];
    paintAt(ctx, fx - 4, fy - 2, 18, 46, (p) => {
      p.vline(fx, fy + 2, fy + 39, s.S);
      p.vline(fx + 1, fy + 2, fy + 39, s.k);
      p.vline(fx - 1, fy + 2, fy + 39, s.W);
      oval(p, fx, fy + 1, 1.6, 1.6, () => s.a, s.k);
      for (let x = 0; x < 9; x++) {
        const wave = Math.floor(1.5 * Math.sin(x / 2.2));
        for (let y = 0; y < 8; y++)
          p.put(
            fx + 2 + x,
            fy + 3 + y + wave,
            y === 0 || y === 7 || x === 8 ? s.k : x % 4 !== 3 ? (y < 4 ? s.r : s.a) : y < 4 ? s.R : s.c,
          );
      }
      p.fill(fx - 3, fy + 39, 7, 2, c.stone);
      p.hline(fx - 3, fx + 3, fy + 41, s.k);
    });
  }),
  life("bench", [{ ...village(32, 10), w: 3, h: 2 }], ({ ctx, s }) => {
    const [bx, by] = [580, 309];
    paintAt(ctx, bx - 1, by - 1, 24, 16, (p) => {
      for (let x = bx; x < bx + 18; x++) {
        p.put(x, by, s.k);
        p.put(x, by + 1, s.d);
        p.put(x, by + 2, s.k);
        p.put(x, by + 4, s.k);
        p.put(x, by + 5, s.h);
        p.put(x, by + 6, s.d);
        p.put(x, by + 7, s.k);
      }
      for (const lx of [bx + 1, bx + 15]) {
        p.vline(lx, by + 1, by + 10, s.k);
        p.vline(lx + 1, by + 8, by + 10, s.o);
      }
      dither(p, bx + 2, by + 11, 18);
    });
  }),
  life("notice-board", [{ ...village(24, 15), w: 4, h: 3 }], ({ ctx, s }) => {
    const [nx, ny] = [518, 342];
    paintAt(ctx, nx - 2, ny - 1, 26, 30, (p) => {
      for (const x of [nx + 2, nx + 17]) {
        p.vline(x, ny + 8, ny + 23, s.o);
        p.vline(x + 1, ny + 8, ny + 23, s.k);
      }
      for (let y = ny; y < ny + 5; y++) {
        const half = 6 + (y - ny) * 1.6;
        const l = Math.floor(nx + 10 - half);
        const r = Math.floor(nx + 10 + half);
        for (let x = l; x <= r; x++)
          p.put(x, y, y === ny || y === ny + 4 || x === l || x === r ? s.k : x > nx + 10 ? s.R : s.r);
      }
      for (let y = ny + 5; y < ny + 16; y++)
        for (let x = nx; x < nx + 21; x++)
          p.put(x, y, x === nx || x === nx + 20 || y === ny + 15 ? s.k : (x + y) % 5 ? s.h : s.d);
      for (const [px, py, w] of [
        [nx + 2, ny + 6, 6],
        [nx + 10, ny + 7, 7],
        [nx + 4, ny + 11, 5],
        [nx + 12, ny + 11, 6],
      ]) {
        p.fill(px, py, w, 4, s.W);
        for (let k = 1; k < w - 1; k += 2) p.put(px + k, py + 2, s.S);
        p.put(px + Math.floor(w / 2), py, s.r);
      }
      dither(p, nx + 3, ny + 24, 18);
    });
  }),
  life("signpost", [{ ...village(35, 18), w: 3, h: 3 }], ({ ctx, s }) => {
    const [sx, sy] = [610, 356];
    paintAt(ctx, sx - 16, sy - 2, 34, 38, (p) => {
      p.vline(sx, sy, sy + 30, s.o);
      p.vline(sx + 1, sy, sy + 30, s.k);
      p.put(sx, sy - 1, s.k);
      arrow(p, s, sx - 13, sy + 2, 14, true, s.h);
      arrow(p, s, sx + 2, sy + 7, 13, false, s.h);
      dither(p, sx - 2, sy + 31, 6);
    });
  }),
  life("well", [{ ...village(25, 22), w: 3, h: 2 }], ({ ctx, c, s }) => {
    const [wx, wy] = [532, 404];
    paintAt(ctx, wx - 10, wy - 13, 22, 28, (p) => {
      oval(p, wx, wy + 7, 7, 3.5, (x, y) => ((Math.floor(x / 2) + y) % 3 ? c.stone : s.S), s.k);
      oval(p, wx, wy + 5, 5.5, 2.2, () => c.stone2, s.k);
      oval(p, wx, wy + 5, 4, 1.4, () => s.n);
      for (const x of [wx - 7, wx + 6]) {
        p.vline(x, wy - 7, wy + 5, s.o);
        p.vline(x + 1, wy - 7, wy + 5, s.k);
      }
      for (let y = wy - 11; y < wy - 6; y++) {
        const half = 3 + (y - (wy - 11)) * 1.5;
        const l = Math.floor(wx - half);
        const r = Math.floor(wx + half);
        for (let x = l; x <= r; x++)
          p.put(x, y, y === wy - 11 || y === wy - 7 || x === l || x === r ? s.k : x < wx ? s.r : s.R);
      }
      p.hline(wx - 6, wx + 6, wy - 5, s.o);
      p.vline(wx, wy - 5, wy + 1, s.h);
      p.fill(wx - 1, wy + 1, 3, 3, s.S);
      p.hline(wx - 1, wx + 1, wy + 1, s.k);
      dither(p, wx - 5, wy + 11, 14);
    });
  }),
  life("handcart", [{ ...village(20, 19), w: 2, h: 1 }], ({ ctx, s }) => {
    const [hx, hy] = [480, 376];
    paintAt(ctx, hx - 1, hy - 3, 24, 16, (p) => {
      for (let x = hx; x < hx + 14; x++)
        for (let y = hy; y < hy + 5; y++)
          p.put(x, y, y === hy || y === hy + 4 || x === hx || x === hx + 13 ? s.k : y === hy + 1 ? s.d : s.o);
      [s.r, s.a, s.L, s.c, s.r, s.a].forEach((col, i) => {
        p.put(hx + 2 + i * 2, hy - 1, col);
        p.put(hx + 3 + i * 2, hy - 1, col);
        p.put(hx + 2 + i * 2, hy - 2, i % 2 ? col : s.k);
      });
      for (let i = 0; i < 6; i++) p.put(hx + 14 + i, hy + 1 + Math.floor(i / 3), s.k);
      oval(p, hx + 5, hy + 7, 3, 3, (x, y) => ((x + y) % 2 ? s.o : s.h), s.k);
      p.put(hx + 5, hy + 7, s.k);
      dither(p, hx + 1, hy + 10, 18);
    });
  }),
  life("stepping-stones", [{ ...village(6, 19), w: 1, h: 4 }], ({ ctx, c, s }) => {
    paintAt(ctx, 46 * TILE - 1, 47 * TILE, 12, 34, (p) => {
      for (let ty = 47; ty < 51; ty++) {
        const sx = 46 * TILE + 1 + (ty % 2) * 2;
        const sy = ty * TILE + 2;
        for (const [ex, ey] of [
          [1, 0],
          [2, 0],
          [3, 0],
          [0, 1],
          [1, 1],
          [2, 1],
          [3, 1],
          [4, 1],
          [1, 2],
          [2, 2],
          [3, 2],
        ])
          p.put(sx + ex, sy + ey, ey === 2 ? c.stone2 : ex === 1 && ey === 0 ? s.W : c.stone);
        for (let ex = 1; ex < 4; ex++) p.put(sx + ex, sy + 3, s.k);
      }
    });
  }),
  life("yard-fence", [], ({ ctx, c, s }) => {
    const [fx0, fy0, fy1, fx1] = [354, 410, 474, 400];
    paintAt(ctx, fx0 - 1, fy0 - 5, fx1 - fx0 + 6, fy1 - fy0 + 10, (p) => {
      const picket = (x: number, y: number): void => {
        p.put(x, y - 4, s.k);
        p.put(x + 1, y - 4, s.k);
        p.vline(x, y - 3, y + 1, s.W);
        p.vline(x + 1, y - 3, y + 1, c.stone);
        p.put(x, y + 2, s.k);
        p.put(x + 1, y + 2, s.k);
      };
      for (let y = fy0; y < fy1 - 4; y += 4) picket(fx0, y);
      for (let x = fx0 + 4; x < fx1; x += 4) picket(x, fy1);
      for (let i = 0; i < 3; i++) picket(fx0 + 1 + i, fy1 - 3 + i); // the curved corner
      p.vline(fx0 + 2, fy0, fy1 - 4, s.h);
      p.hline(fx0 + 4, fx1, fy1 - 1, s.h);
    });
  }),
  life("rowboat", [], ({ ctx, s }) => {
    const by = 458;
    const bx = Math.floor(riverCenterPx(by) + riverHalfPx(by)) - 15;
    stamp(
      ctx,
      [".kkkkkkkkkkk.", "kdddddddddddk", "kooHoooHoooHk", ".kooooooooook", "..kkkkkkkkk.."],
      s,
      bx,
      by,
    );
    paintAt(ctx, bx + 12, by - 2, 6, 4, (p) => {
      p.put(bx + 13, by + 1, s.h);
      p.put(bx + 14, by, s.h);
      p.put(bx + 15, by - 1, s.h); // the mooring rope
    });
  }),
  life("lily-pads", [], ({ ctx, c, s }) => {
    for (const [row, off] of [
      [30, -3],
      [41, 5],
      [52, 2],
      [58, -2],
    ] as const) {
      const y = row * TILE + 3;
      const x = Math.floor(riverCenterPx(y)) + off;
      paintAt(ctx, x - 2, y - 2, 6, 5, (p) => {
        for (const [dx, dy] of [
          [0, 0],
          [1, 0],
          [-1, 0],
          [0, 1],
          [1, 1],
          [-1, 1],
        ])
          p.put(x + dx, y + dy, c.hedge);
        if (row % 2 === 0) p.put(x, y, s.p);
      });
    }
  }),
];

export function arrow(
  p: Paint,
  s: Record<string, string>,
  x0: number,
  y0: number,
  w: number,
  left: boolean,
  col: string,
): void {
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < w; x++) {
      const tip = left ? x < 2 : x > w - 3;
      if (tip && (y === 0 || y === 4)) continue;
      const edge = y === 0 || y === 4 || x === 0 || x === w - 1;
      p.put(x0 + x, y0 + y, edge ? s.k : col);
    }
  }
  for (let k = 3; k < w - 3; k += 2) p.put(x0 + k, y0 + 2, s.o); // carved letters
}
