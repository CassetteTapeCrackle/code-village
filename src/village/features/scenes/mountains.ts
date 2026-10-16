import { px, stamp } from "../../../art/draw";
import { paintAt } from "../../../art/paint";
import { GAUGE, SCREEN, SIEVE, SLUICE, STAR_STONE, SUNDIAL, WHEEL } from "../../../art/scenes";
import { TILE } from "../../grid";
import type { Feature } from "../../scenery";
import { riverCenterPx, riverHalfPx } from "../../terrain";
import { onTile, scene } from "./common";

const STARS: readonly [number, number][] = [
  [62.6, 10.2],
  [64, 9.8],
  [65.4, 10.1],
  [66.6, 10.7],
  [66.8, 11.8],
  [68.3, 12],
  [68.2, 10.9],
];

export const MOUNTAIN_SCENES: Feature[] = [
  scene(
    "sundial",
    "brass-pointer",
    { x: 66, y: 13 },
    "a sundial on the observatory terrace",
    [{ x: 66, y: 12, w: 2, h: 2 }],
    ({ ctx, s }) => {
      onTile(ctx, s, SUNDIAL, 66, 13, 4, -2);
      paintAt(ctx, 66 * TILE + 9, 13 * TILE - 8, 5, 3, (p) => {
        p.put(66 * TILE + 10, 13 * TILE - 7, s.S);
        p.put(66 * TILE + 11, 13 * TILE - 7, s.S);
        p.put(66 * TILE + 12, 13 * TILE - 6, s.S); // the pointer's shadow
      });
    },
  ),
  scene(
    "waterwheel",
    "spring-coil",
    { x: 79, y: 9 },
    "a waterwheel turning under the waterfall",
    [{ x: 79, y: 8, w: 1, h: 2 }],
    ({ ctx, s }) => {
      const y = 9 * TILE + 4;
      stamp(ctx, WHEEL, s, Math.floor(riverCenterPx(y) - riverHalfPx(y)) - 6, 9 * TILE - 1);
    },
  ),
  scene(
    "terraces",
    "survey-ledger",
    { x: 55, y: 21 },
    "terraced fields cut into the slope",
    [{ x: 49, y: 18, w: 12, h: 6 }],
    ({ ctx, c, s }) =>
      paintAt(ctx, 50 * TILE - 2, 19 * TILE - 4, 84, 42, (p) => {
        const [x0, x1, y0] = [50 * TILE, 60 * TILE, 19 * TILE + 2];
        for (let band = 0; band < 5; band++) {
          const top = y0 + band * 7;
          for (let x = x0 + band * 2; x < x1 - band * 3; x++) {
            const wob = Math.floor(2.5 * Math.sin(x / 17 + band * 0.4));
            for (let y = top + wob; y < top + 5 + wob; y++)
              p.put(
                x,
                y,
                (y - top - wob) % 2 ? c.hedge : (Math.floor(x / 3) + band) % 2 ? c.hedge2 : c.grass3,
              );
            p.put(x, top + 5 + wob, c.stone);
            p.put(x, top + 6 + wob, x % 2 ? c.stone2 : s.k);
          }
          for (const x of [x0 + band * 2, x1 - band * 3 - 1])
            p.put(x, top - 2 + Math.floor(2.5 * Math.sin(x / 17 + band * 0.4)), s.r); // survey stakes
        }
      }),
  ),
  scene(
    "weather-vane",
    "weather-vane",
    { x: 67, y: 9 },
    "a weather vane on the dome, and a little weather station",
    [{ x: 67, y: 8, w: 2, h: 2 }],
    ({ ctx, s }) => {
      // the vane itself turns with the wind on the dynamic layer (critters.ts)
      onTile(ctx, s, SCREEN, 67, 9, 0, 2);
      onTile(ctx, s, GAUGE, 68, 9, 1, 2);
    },
  ),
  scene(
    "gold-panning",
    "sorting-sieve",
    { x: 86, y: 19 },
    "a gold panner's sluice on the stream",
    [{ x: 85, y: 18, w: 2, h: 3 }],
    ({ ctx, s }) => {
      const y = 19 * TILE + 4;
      const bank = Math.floor(riverCenterPx(y) + riverHalfPx(y));
      stamp(ctx, SLUICE, s, bank - 1, 19 * TILE - 2);
      stamp(ctx, SIEVE, s, bank + 9, 20 * TILE + 3);
      paintAt(ctx, bank - 1, 20 * TILE + 3, 3, 4, (p) => {
        p.put(bank + 1, 20 * TILE + 4, s.a);
        p.put(bank, 20 * TILE + 5, s.y); // a glint of gold
      });
    },
  ),
  scene(
    "star-stones",
    "star-map",
    { x: 64, y: 11 },
    "star stones laid out as a constellation",
    [{ x: 61, y: 10, w: 8, h: 3 }],
    ({ ctx, c, s, palette }) => {
      paintAt(ctx, 61 * TILE, 9 * TILE, 8 * TILE, 4 * TILE, (p) => {
        for (let i = 1; i < STARS.length; i++) {
          const [ax, ay] = STARS[i - 1].map((v) => v * TILE);
          const [bx, by] = STARS[i].map((v) => v * TILE);
          const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
          for (let k = 0; k <= n; k += 2)
            p.put(
              Math.round(ax + 2 + ((bx - ax) * k) / n),
              Math.round(ay + 1 + ((by - ay) * k) / n),
              c.stone2,
            );
        }
      });
      const night = palette === "night";
      for (const [sx, sy] of STARS) {
        const x = Math.floor(sx * TILE);
        const y = Math.floor(sy * TILE);
        stamp(ctx, STAR_STONE, night ? { ...s, W: c.firefly } : s, x, y); // at night the stones glow
        if (night)
          for (const [dx, dy] of [
            [1, -2],
            [2, -2],
            [-2, 1],
            [5, 1],
            [1, 4],
            [2, 4],
          ])
            px(ctx, c.firefly, x + dx, y + dy, 1, 1); // a small twinkle
      }
    },
  ),
];
