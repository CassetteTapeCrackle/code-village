import { pixelBuffer } from "../../art/pixels";
import { TILE } from "../grid";
import { hash01, valueNoise } from "../noise";
import type { Feature } from "../scenery";
import { rangeFootPx, riverCenterPx, riverHalfPx, rockLine } from "../terrain";
import { pond } from "./water";

// The river leaves the back range as a waterfall at these columns and cuts a gorge down to the cliff.
const RIVER_X0 = 81 * TILE;
const RIVER_X1 = 83 * TILE;
const RIVER_TOP = 8 * TILE;
const TARN = { x: 53, y: 10.5, rx: 3.2, ry: 1.4 };
const always = { kind: "always" } as const;

export const MOUNTAIN_FEATURES: Feature[] = [
  {
    id: "tarn",
    land: [{ x: 49, y: 9, w: 8, h: 3 }],
    unlock: always,
    draw: ({ ctx, c, s, palette }) =>
      pond(ctx, c, s, {
        cx: TARN.x * TILE,
        cy: TARN.y * TILE,
        rx: TARN.rx * TILE,
        ry: TARN.ry * TILE,
        seed: 7,
        rim: "rock",
        night: palette === "night",
      }),
  },
  {
    id: "gorge",
    land: [],
    unlock: always,
    draw: ({ ctx, c, s, map }) => {
      const bottom = Math.floor((rockLine(81) + 0.6) * TILE);
      const buf = pixelBuffer(ctx, RIVER_X0 - 24, RIVER_TOP, RIVER_X1 - RIVER_X0 + 48, bottom - RIVER_TOP);
      for (let y = RIVER_TOP; y < bottom; y++) {
        const row = map.tiles[Math.floor(y / TILE)];
        if (row[80] === "=" || row[83] === "=" || row[81] === "#") continue; // the bridge row keeps its road
        const centre = riverCenterPx(y);
        const half = riverHalfPx(y);
        for (const side of [-1, 1]) {
          const edge = Math.floor(side < 0 ? centre - half - 1 : centre + half);
          const wd = 2 + Math.floor(4 * valueNoise(y / 5, side, 84));
          for (let k = 0; k <= wd + 1; k++) {
            const col =
              k === 0 || k === wd + 1
                ? s.k
                : k === 1
                  ? s.S
                  : k < wd
                    ? side > 0
                      ? c.rock3
                      : c.rock2
                    : c.rock3;
            buf.set(edge + side * k, y, col);
          }
        }
      }
      buf.flush();
    },
  },
  {
    id: "waterfall",
    land: [],
    unlock: always,
    draw: ({ ctx, c, s }) => {
      // it lands on the river's head, centred and as wide as the river there, so it covers the foam band
      const foot = rangeFootPx(RIVER_X0 + 8);
      const top = Math.floor(foot - 14);
      const bottom = Math.max(Math.floor(foot) + 4, RIVER_TOP + TILE);
      const cx = riverCenterPx(bottom);
      const spread = riverHalfPx(bottom) - 3;
      const buf = pixelBuffer(ctx, cx - 20, top - 2, 40, bottom - top + 12);
      for (let y = top; y < bottom; y++) {
        const hw = 3 + (spread * (y - top)) / Math.max(1, bottom - top);
        for (let x = Math.floor(cx - hw); x <= Math.floor(cx + hw); x++) {
          buf.set(
            x,
            y,
            (x * 5 + Math.floor(y / 2)) % 7 === 0 ? s.W : (x + Math.floor(y / 3)) % 3 ? c.water2 : c.water,
          );
        }
        buf.set(Math.floor(cx - hw) - 1, y, s.k);
        buf.set(Math.floor(cx + hw) + 1, y, s.k);
      }
      for (let i = 0; i < 14; i++) {
        const a = hash01(i, 3, 5) * Math.PI;
        const r = 4 + hash01(i, 4, 5) * 7;
        buf.set(Math.floor(cx + Math.cos(a) * r), Math.floor(bottom + Math.sin(a) * r * 0.5), s.W);
      }
      buf.flush();
    },
  },
];
