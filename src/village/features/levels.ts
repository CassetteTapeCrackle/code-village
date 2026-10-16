import { stamp } from "../../art/draw";
import { paintAt, smallHouse } from "../../art/paint";
import { CHAIR, DEER, DRYRACK, FAWN, GOAT, HAY, RABBIT } from "../../art/scenes";
import { TILE } from "../grid";
import type { Rect } from "../areas";
import type { Feature } from "../scenery";
import { riverCenterPx, riverHalfPx } from "../terrain";
import { pond } from "./water";

// What levels 7 to 11 add to the map (world-pass mockup section 6), ported from the mockup's items.py.
const level = (n: number) => ({ kind: "level", level: n }) as const;

// The brook runs from the cliff through the glade, under the forest road and into its own pond (tiles).
const BROOK: readonly [number, number][] = [
  [33.5, 18.6],
  [31.5, 25],
  [30.2, 31.6],
  [29.5, 36.5],
  [26.5, 42],
  [25.5, 46.5],
  [21.5, 51],
  [17.5, 54.2],
];
export function brookPoints(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 1; i < BROOK.length; i++) {
    const [ax, ay] = BROOK[i - 1];
    const [bx, by] = BROOK[i];
    const n = Math.floor(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * TILE);
    for (let k = 0; k < n; k++) {
      const y = (ay + ((by - ay) * k) / n) * TILE;
      points.push({
        x: Math.floor((ax + ((bx - ax) * k) / n) * TILE + 3 * Math.sin(y / 9)),
        y: Math.floor(y),
      });
    }
  }
  return points;
}
const ROAD_ROW = 46;
const brookLand = (): Rect[] => {
  const tiles = new Set<string>();
  for (const p of brookPoints()) {
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    if (ty === ROAD_ROW) continue;
    for (const dx of [-1, 0, 1]) tiles.add(`${tx + dx},${ty}`);
  }
  return [...tiles].map((k) => {
    const [x, y] = k.split(",").map(Number);
    return { x, y, w: 1, h: 1 };
  });
};

export const LEVEL_REWARDS: Feature[] = [
  {
    id: "brook",
    land: [...brookLand(), { x: 13, y: 53, w: 6, h: 4 }],
    unlock: level(7),
    draw: ({ ctx, c, s, map, found, palette }) => {
      const crossing: number[] = [];
      paintAt(ctx, 0, 0, 40 * TILE, 64 * TILE, (p) => {
        for (const pt of brookPoints()) {
          const t = map.tiles[Math.floor(pt.y / TILE)][Math.floor(pt.x / TILE)];
          if ("=P#".includes(t)) {
            crossing.push(pt.x);
            continue;
          }
          for (let d = -4; d <= 4; d++) {
            const col =
              Math.abs(d) < 2
                ? c.water
                : Math.abs(d) === 2
                  ? (pt.y + d) % 3 === 0
                    ? c.water2
                    : c.water
                  : Math.abs(d) === 3
                    ? c.stone2
                    : null;
            if (col) p.put(pt.x + d, pt.y, col);
          }
        }
        // it spills over the cliff
        for (let y = Math.floor(18.6 * TILE) - 7; y <= Math.floor(18.6 * TILE); y++)
          for (let x = Math.floor(33.5 * TILE) - 2; x < Math.floor(33.5 * TILE) + 2; x++)
            p.put(x, y, (x + y) % 3 ? c.water2 : c.snow);
        // the Toolbelt's plank rails where the brook passes under the road
        if (crossing.length > 0 && found.has("toolbelt")) {
          const bx = Math.floor(crossing.reduce((a, b) => a + b, 0) / crossing.length);
          for (const y of [ROAD_ROW * TILE - 1, (ROAD_ROW + 1) * TILE]) {
            for (let x = bx - 6; x <= bx + 6; x++)
              p.put(x, y, x === bx - 6 || x === bx + 6 || y < ROAD_ROW * TILE ? s.k : s.d);
            for (let x = bx - 6; x <= bx + 6; x += 3) p.put(x, y < ROAD_ROW * TILE ? y - 1 : y + 1, s.o);
          }
        }
      });
      pond(ctx, c, s, {
        cx: 15.6 * TILE,
        cy: 55.2 * TILE,
        rx: 2.4 * TILE,
        ry: 1.4 * TILE,
        seed: 15,
        lily: true,
        rim: "sand",
        night: palette === "night",
      });
    },
  },
  {
    id: "deer",
    land: [{ x: 25, y: 37, w: 5, h: 4 }],
    unlock: level(8),
    draw: ({ ctx, s }) => {
      stamp(ctx, DEER, s, 26 * TILE, 38 * TILE);
      stamp(ctx, FAWN, s, 27 * TILE + 4, 38 * TILE + 4);
      stamp(ctx, RABBIT, s, 25 * TILE, 40 * TILE + 2);
      stamp(ctx, RABBIT, s, 29 * TILE, 39 * TILE + 4);
    },
  },
  {
    id: "wren",
    land: [{ x: 34, y: 49, w: 5, h: 4 }],
    unlock: level(8),
    draw: ({ ctx, c, s }) => {
      paintAt(ctx, 34 * TILE - 2, 48 * TILE, 40, 34, (p) =>
        smallHouse(p, { c, s }, 35 * TILE - 4, 49 * TILE + 2, 26, 22, "thatch", "wood", false),
      );
      stamp(ctx, DRYRACK, s, 38 * TILE + 2, 51 * TILE + 2);
    },
  },
  {
    id: "wheat",
    land: [{ x: 57, y: 29, w: 9, h: 5 }],
    unlock: level(9),
    draw: ({ ctx, s, map, palette }) => {
      // the gold dims to brown at night
      const g = palette === "night" ? { C: s.o, a: s.C, y: s.C } : { C: s.C, a: s.a, y: s.y };
      const [fcx, fcy, frx, fry] = [61 * TILE, 31.2 * TILE, 22, 11];
      paintAt(ctx, fcx - frx - 3, fcy - fry - 4, frx * 2 + 6, fry * 2 + 8, (p) => {
        for (let y = Math.floor(fcy - fry - 2); y <= fcy + fry + 2; y++) {
          for (let x = Math.floor(fcx - frx - 2); x <= fcx + frx + 2; x++) {
            const a = Math.atan2(y - fcy, x - fcx);
            const e =
              Math.hypot((x - fcx) / frx, (y - fcy) / fry) /
              (1 + 0.1 * Math.sin(3 * a + 1) + 0.06 * Math.sin(5 * a));
            if (e > 1 || !".D".includes(map.tiles[Math.floor(y / TILE)][Math.floor(x / TILE)])) continue;
            const r3 = (y + Math.floor(3 * Math.sin(x / 14))) % 3;
            const lit = (x - fcx) / frx + (y - fcy) / fry;
            p.put(
              x,
              y,
              e > 0.9
                ? g.C
                : r3 === 0
                  ? g.C
                  : (x * 5 + y * 3) % 9 === 0 || (lit < -0.6 && r3 === 1)
                    ? g.y
                    : g.a,
            );
            if (e > 0.86 && y < fcy && x % 2 === 0) {
              p.put(x, y - 1, g.a);
              p.put(x, y - 2, x % 4 === 0 ? g.y : g.a); // stalks along the top edge
            }
          }
        }
      });
      stamp(ctx, HAY, { ...s, a: g.a, y: g.y }, 57 * TILE + 6, 32 * TILE + 4);
      stamp(ctx, HAY, { ...s, a: g.a, y: g.y }, 64 * TILE, 31 * TILE + 2);
    },
  },
  {
    id: "porch",
    land: [],
    unlock: level(9),
    draw: ({ ctx, s }) => {
      paintAt(ctx, 50 * TILE, 57 * TILE - 7, 6 * TILE, 10, (p) => {
        for (let x = 50 * TILE + 4; x < 56 * TILE - 4; x++) {
          if (x >= 52 * TILE + 6 && x <= 53 * TILE + 6) continue;
          p.put(x, 57 * TILE - 1, s.k);
          p.put(x, 57 * TILE, x % 3 ? s.h : s.d);
          p.put(x, 57 * TILE + 1, s.k);
        }
      });
      stamp(ctx, CHAIR, s, 51 * TILE, 57 * TILE - 6);
    },
  },
  {
    id: "goats",
    land: [],
    unlock: level(10),
    draw: ({ ctx, s }) => {
      for (const [x, y] of [
        [27 * TILE, 10 * TILE + 3],
        [30 * TILE + 3, 11 * TILE + 5],
        [46 * TILE, 11 * TILE],
      ])
        stamp(ctx, GOAT, s, x, y);
    },
  },
  {
    id: "refuge",
    land: [{ x: 58, y: 10, w: 4, h: 3 }],
    unlock: level(10),
    draw: ({ ctx, c, s }) =>
      paintAt(ctx, 58 * TILE - 2, 9 * TILE - 4, 36, 34, (p) =>
        smallHouse(p, { c, s }, 58 * TILE + 2, 10 * TILE + 1, 26, 22, "red", "stone", true),
      ),
  },
  {
    id: "rope-bridge",
    land: [],
    unlock: level(11),
    draw: ({ ctx, s }) => {
      const by = 11 * TILE + 4;
      const x0 = Math.floor(riverCenterPx(by) - riverHalfPx(by) - 8);
      const x1 = Math.floor(riverCenterPx(by) + riverHalfPx(by) + 8);
      paintAt(ctx, x0 - 2, by - 6, x1 - x0 + 12, 12, (p) => {
        for (let x = x0; x < x1; x++) {
          const sag = Math.floor(2 * Math.sin((Math.PI * (x - x0)) / (x1 - x0)));
          p.put(x, by - 3 + sag, s.k);
          p.put(x, by + sag, x % 2 ? s.h : s.d);
          p.put(x, by + 1 + sag, s.k);
          if (x % 4 === 0) {
            p.put(x, by - 2 + sag, s.k);
            p.put(x, by - 1 + sag, s.k);
          }
        }
        for (const [dx, row] of [
          [0, "kkkkk"],
          [1, "khhhk"],
          [2, "k...k"],
        ] as const)
          [...row].forEach((ch, i) => ch !== "." && p.put(x1 + 2 + i, by - 2 + dx, ch === "k" ? s.k : s.h)); // a lookout bench
      });
    },
  },
];
