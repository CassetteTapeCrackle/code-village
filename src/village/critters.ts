import { px } from "../art/draw";
import type { MapColors } from "../art/palette";
import { TILE } from "./grid";
import { fbm, hash01 } from "./noise";
import { nearRangeHeightPx, rangeFootPx } from "./terrain";
import type { Season } from "./weather";

// The map's moving life and its one wind (world-pass mockup sections 7 and 11). Everything here is redrawn
// every frame on the dynamic layer; with reduced motion (`still`) things hold one pose.
export type Life = {
  t: number;
  still: boolean;
  palette: "day" | "night";
  season: Season;
  wind: { dir: 1 | -1; strength: number };
  windmill: boolean; // level 5
  vane: boolean; // the Weather Vane's scene
  wheat: boolean; // level 9
  prints: readonly { x: number; y: number; age: number }[]; // pixels, seconds
};

// Every chimney's top, for its smoke: school, library, your house, the ranger's cabin.
const CHIMNEYS: readonly [number, number][] = [
  [565, 269],
  [429, 321],
  [437, 418],
  [155, 300],
];
const WINDMILL_HUB = { x: 448, y: 247 };
const SUMMITS = [19, 47, 89.5].map((tx) => tx * TILE);

export function drawLife(
  ctx: CanvasRenderingContext2D,
  s: Record<string, string>,
  c: MapColors,
  life: Life,
): void {
  const t = life.still ? 0 : life.t;
  const { dir, strength } = life.wind;
  const night = life.palette === "night";

  // chimney smoke, leaning with the wind
  for (const [x, y] of CHIMNEYS) {
    for (let i = 0; i < 3; i++) {
      const rise = (t * 6 + i * 6) % 18;
      px(
        ctx,
        i % 2 ? s.W : c.stone,
        Math.round(x + dir * (rise / 3) * strength + Math.sin(rise / 3)),
        Math.round(y - rise),
        2,
        2,
      );
    }
  }

  // the windmill's sails turn in quarter steps with the wind's strength
  if (life.windmill) {
    const diagonal = Math.floor(t * strength * 1.5) % 2 === 0;
    const arms: [number, number][] = diagonal
      ? [
          [1, 1],
          [-1, 1],
          [-1, -1],
          [1, -1],
        ]
      : [
          [1, 0],
          [0, 1],
          [-1, 0],
          [0, -1],
        ];
    const reach = diagonal ? 24 : 30;
    for (const [sx, sy] of arms) {
      for (let d = 2; d < reach; d++) {
        px(ctx, s.o, WINDMILL_HUB.x + d * sx, WINDMILL_HUB.y + d * sy);
        px(ctx, s.k, WINDMILL_HUB.x + d * sx - sy, WINDMILL_HUB.y + d * sy + sx);
      }
      for (let d = Math.floor(reach * 0.3); d < reach; d++) {
        for (let w = 1; w < 6; w++) {
          const col =
            w === 5 || d === Math.floor(reach * 0.3) || d === reach - 1
              ? s.k
              : d % 4 === 0
                ? s.o
                : night
                  ? c.fence
                  : s.w; // the sail cloth dims at night
          px(ctx, col, WINDMILL_HUB.x + d * sx + w * sy, WINDMILL_HUB.y + d * sy - w * sx);
          if (diagonal && w < 5)
            px(ctx, col, WINDMILL_HUB.x + d * sx + w * sy, WINDMILL_HUB.y + d * sy - w * sx + 1);
        }
      }
    }
    px(ctx, s.k, WINDMILL_HUB.x - 1, WINDMILL_HUB.y - 1, 3, 3);
    px(ctx, s.a, WINDMILL_HUB.x, WINDMILL_HUB.y);
  }

  // the weather vane on the dome points where the wind blows
  if (life.vane) {
    const vx = 74 * TILE;
    const vy = 5 * TILE - 5;
    px(ctx, s.k, vx, vy + 2, 1, 4);
    px(ctx, s.k, vx - 3, vy + 2, 7, 1);
    px(ctx, s.a, vx + dir * 3, vy + 1, 1, 3);
    px(ctx, s.a, vx + dir * 2, vy, 1, 1);
    px(ctx, s.a, vx + dir * 2, vy + 4, 1, 1);
  }

  // the laundry swings on its line
  const clothes: [string, number, number][] = [
    [s.r, 7, 5],
    [s.W, 6, 6],
    [s.b, 5, 4],
    [s.p, 5, 5],
  ];
  clothes.forEach(([col, w, h], i) => {
    const cx = 362 + 6 + i * 8;
    const sway = Math.round(Math.sin(t * 2 + i) * strength) * dir;
    const top = 421 + Math.floor(2.5 * Math.sin((Math.PI * (cx - 362)) / 34));
    px(ctx, s.k, cx - 3 + sway, top, w, 1);
    px(ctx, col, cx - 3 + sway, top + 1, w, h - 1);
    px(ctx, s.k, cx - 3 + sway, top + h, w, 1);
    px(ctx, s.h, cx - 2, top - 1, 1, 1);
    px(ctx, s.h, cx + 1, top - 1, 1, 1);
  });

  // a lighter band of wind running across the wheat
  if (life.wheat) {
    const [fcx, fcy, frx, fry] = [61 * TILE, 31.2 * TILE, 22, 11];
    const band =
      fcx -
      frx +
      ((((t * 12 * strength) % (frx * 2 + 20)) * (dir > 0 ? 1 : -1) + (dir > 0 ? 0 : frx * 2 + 20)) %
        (frx * 2 + 20));
    for (let y = Math.floor(fcy - fry); y <= fcy + fry; y++) {
      for (let x = Math.floor(band - 3); x <= band + 3; x++) {
        if (((x - fcx) / frx) ** 2 + ((y - fcy) / fry) ** 2 < 0.8 && (x + y) % 2 === 0)
          px(ctx, night ? s.C : s.y, x, y);
      }
    }
  }

  // a cat asleep on the library roof, its tail flicking now and then
  const catX = 52 * TILE;
  const catY = 40 * TILE + 3;
  px(ctx, s.k, catX, catY, 6, 3);
  px(ctx, s.C, catX + 1, catY + 1, 4, 1);
  px(ctx, s.k, catX + 5, catY - 1, 2, 2);
  px(ctx, s.C, catX - 1 - (Math.floor(t / 2.5) % 2), catY + 2, 2, 1);

  // squirrels running up and down two forest trunks
  for (const [tx, ty, phase] of [
    [18, 36, 0],
    [30, 44, 3],
  ]) {
    const climb = Math.round(Math.abs(Math.sin((t + phase) / 2)) * 6);
    const x = tx * TILE + 3;
    const y = ty * TILE + 4 - climb;
    px(ctx, s.C, x, y, 2, 2);
    px(ctx, s.c, x - 1, y + 1, 1, 2);
  }

  // an owl on the ancient oak, out at night, blinking
  if (night) {
    const ox = 26 * TILE + 2;
    const oy = 31 * TILE - 8;
    px(ctx, s.k, ox, oy, 4, 5);
    px(ctx, s.o, ox + 1, oy + 1, 2, 3);
    if (Math.floor(t * 1.3) % 6 !== 0) {
      px(ctx, s.y, ox + 1, oy + 1, 1, 1);
      px(ctx, s.y, ox + 2, oy + 1, 1, 1);
    }
  }

  // leaves drifting down in the glades (more of them in autumn)
  const leaves = life.season === "autumn" ? 10 : 5;
  let placed = 0;
  for (let i = 0; i < 80 && placed < leaves; i++) {
    const tx = 4 + Math.floor(hash01(i, 1, 801) * 34);
    const ty = 30 + Math.floor(hash01(i, 2, 801) * 30);
    if (fbm(tx / 5, ty / 5, 1) >= 0.33) continue;
    placed++;
    const fall = (t * 5 + hash01(i, 3, 801) * 24) % 24;
    px(
      ctx,
      life.season === "autumn" ? (i % 2 ? s.C : s.a) : s.L,
      Math.round(tx * TILE + Math.sin((t + i) * 1.5) * 3),
      Math.round(ty * TILE - 12 + fall),
      1,
      1,
    );
  }

  // an eagle circling the peak
  const a = t * 0.6;
  const ex = Math.round(88 * TILE + Math.cos(a) * 20);
  const ey = Math.round(4 * TILE + 8 + Math.sin(a) * 8);
  px(ctx, s.k, ex, ey, 1, 1);
  px(ctx, s.k, ex - 2, ey - 1, 2, 1);
  px(ctx, s.k, ex + 1, ey - 1, 2, 1);

  // marmots popping out beside rocks on the high meadow
  for (const [tx, ty, phase] of [
    [48, 20, 0],
    [70, 22, 4.5],
  ]) {
    if ((t + phase) % 9 >= 2) continue;
    const x = tx * TILE + 2;
    const y = ty * TILE + 3;
    px(ctx, s.k, x, y, 4, 4);
    px(ctx, s.C, x + 1, y + 1, 2, 3);
    px(ctx, s.k, x + 1, y + 1, 1, 1);
  }

  // snow blowing off the summits, with the wind
  for (const sx of SUMMITS) {
    const top = rangeFootPx(sx) - nearRangeHeightPx(sx);
    for (let i = 0; i < 6; i++) {
      const drift = (t * 10 * strength + i * 7) % 30;
      px(ctx, s.W, Math.round(sx + dir * drift), Math.round(top + 2 + (i % 3) + Math.sin(t + i) * 1.5), 1, 1);
    }
  }

  // foam churning at the foot of the waterfall
  const foot = rangeFootPx(81 * TILE + 8) + 4;
  for (let i = 0; i < 6; i++)
    px(
      ctx,
      s.W,
      81 * TILE + 2 + Math.floor(hash01(i, Math.floor(t * 4), 802) * 12),
      Math.round(foot + hash01(i, Math.floor(t * 4), 803) * 4),
      1,
      1,
    );

  // paw prints behind Mochi on snow and sand, fading
  for (const p of life.prints) {
    if (p.age > 6 || (p.age > 3 && (p.x + p.y) % 2 === 0)) continue;
    px(ctx, c.stone2, p.x, p.y, 1, 1);
    px(ctx, c.stone2, p.x + 2, p.y + 1, 1, 1);
  }
}
