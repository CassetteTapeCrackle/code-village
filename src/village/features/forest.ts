import { stamp } from "../../art/draw";
import { OLD_OAK } from "../../art/sprites";
import { TILE } from "../grid";
import type { Feature } from "../scenery";
import { leafColours, snowCapped } from "../weather";

const always = { kind: "always" } as const;
// Four ancient oaks, one of them in the foothills; each keeps a little land around its trunk.
const OAKS: readonly [number, number][] = [
  [26, 31],
  [6, 47],
  [33, 61],
  [12, 23],
];
// Dirt trails people walk between the cabin, the glades and the lairs (drawn only, not walkable).
const TRAILS: readonly [number, number][][] = [
  [
    [17, 37],
    [17, 33],
    [27, 33],
    [30, 36],
  ],
  [
    [24, 47],
    [32, 47],
    [32, 41],
  ],
  [
    [8, 46],
    [8, 50],
    [14, 52],
  ],
  [
    [20, 30],
    [24, 24],
    [31, 21],
  ],
];

export const FOREST_FEATURES: Feature[] = [
  {
    id: "forest-trails",
    land: [],
    unlock: always,
    draw: ({ ctx, c, map }) => {
      for (const line of TRAILS) {
        for (let i = 1; i < line.length; i++) {
          const [ax, ay] = line[i - 1];
          const [bx, by] = line[i];
          const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * TILE;
          for (let k = 0; k <= n; k++) {
            const fx = ax * TILE + 4 + Math.floor(((bx - ax) * TILE * k) / n);
            const fy = ay * TILE + 4 + Math.floor(((by - ay) * TILE * k) / n);
            if (!".*".includes(map.tiles[Math.floor(fy / TILE)][Math.floor(fx / TILE)]) || k % 6 >= 4)
              continue;
            ctx.fillStyle = c.dry;
            ctx.fillRect(fx, fy, 1, 1);
            ctx.fillStyle = c.dry2;
            ctx.fillRect(fx + 1, fy + 1, 1, 1);
          }
        }
      }
    },
  },
  {
    id: "ancient-oaks",
    land: OAKS.map(([x, y]) => ({ x: x - 1, y: y - 1, w: 3, h: 2 })),
    unlock: always,
    afterTrees: true,
    draw: ({ ctx, c, s, season }) => {
      for (const [x, y] of OAKS)
        stamp(
          ctx,
          season === "winter" ? snowCapped(OLD_OAK) : OLD_OAK,
          { ...s, N: s.n, ...leafColours(season, s, c) },
          x * TILE - 4,
          y * TILE - 9,
        );
    },
  },
];
