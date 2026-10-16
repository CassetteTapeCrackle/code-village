import type { MapColors } from "../../art/palette";
import { stamp } from "../../art/draw";
import { blobMask, painter, renderMask, roundedBand, type Paint } from "../../art/paint";
import { pixelBuffer } from "../../art/pixels";
import { BUSH, PLANT_TOPS, REEDS, ROCK, STONE_BLOCK, STUMP, TREE } from "../../art/sprites";
import { hash01, valueNoise } from "../noise";
import type { LairState, Plot } from "../render";
import { pond } from "./water";
import { TILE } from "../grid";
import type { Place, VillageMap } from "../layout";
import { snowAt } from "../terrainPaint";
import type { Season } from "../weather";

// The village's buildings and lairs, ported from the world-pass mockup (props.py and buildings.py).
type Colors = { c: MapColors; s: Record<string, string> };

// Depth for the three village houses without changing their style: the right wall and the roof's far slope turn
// from the light, a shadow sits under the eaves, the ridge catches the light, the chimney smokes, and a doorstep
// with flowers along the front.
export function polishHouse(
  ctx: CanvasRenderingContext2D,
  map: VillageMap,
  { c, s }: Colors,
  place: Place,
  season = "summer",
): void {
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  const w = place.w * TILE;
  const h = place.h * TILE;
  const buf = pixelBuffer(ctx, x0 - 2, y0 - 20, w + 12, h + 24);
  const darkRun = (y: number): number => {
    let n = 0;
    for (let x = x0; x < x0 + w; x++) if (buf.is(x, y, s.k)) n++;
    return n;
  };
  let eave = -1;
  for (let y = y0 + Math.floor(h / 4); y < y0 + Math.floor((h * 2) / 3); y++)
    if (darkRun(y) > w * 0.7) eave = y;
  let top = y0;
  for (let y = y0; y < y0 + h; y++) {
    if (darkRun(y) > w * 0.5) {
      top = y;
      break;
    }
  }
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (buf.is(x, y, s.k)) continue;
      const glass = buf.is(x, y, c.windowGlow) || buf.is(x, y, s.i) || buf.is(x, y, s.W);
      if (eave >= 0 && y > eave && glass) continue;
      if (eave >= 0 && y > eave && x > x0 + w - 7) buf.shade(x, y, 0.13);
      if (eave >= 0 && (y === eave + 1 || y === eave + 2)) buf.shade(x, y, y === eave + 1 ? 0.2 : 0.1);
      if (eave >= 0 && y > top && y < eave && x > x0 + w * 0.62) buf.shade(x, y, 0.1);
      if (y === top + 1) buf.lighten(x, y, 0.22);
      if (season === "winter" && (y === top + 1 || y === top + 2))
        buf.set(x, y, (x + y) % 4 ? c.snow : c.stone); // snow on the roof
    }
  }
  const door = place.door.x * TILE + 4;
  for (let x = door - 5; x < door + 5; x++) {
    buf.set(x, y0 + h, c.stone);
    buf.set(x, y0 + h + 1, c.stone2);
    buf.set(x, y0 + h + 2, s.k);
  }
  const flowers = [s.p, s.a, s.r, s.W];
  for (let x = x0 + 3; x < x0 + w - 3; x += 3) {
    if (Math.abs(x - door) < 8 || "=P#".includes(map.tiles[place.y + place.h][Math.floor(x / TILE)]))
      continue;
    buf.set(x, y0 + h, c.hedge);
    buf.set(x + 1, y0 + h, c.hedge2);
    buf.set(x, y0 + h - 1, flowers[Math.floor(x / 3) % 4]);
  }
  buf.flush();
}

// ---------- the village lairs: rough while their boss is about, friendly once beaten ----------

const eyes = (p: Paint, s: Record<string, string>, x: number, y: number): void => {
  p.fill(x - 4, y - 2, 10, 5, s.k);
  p.fill(x - 2, y, 2, 2, s.y);
  p.fill(x + 2, y, 2, 2, s.y);
};

// The quarry: a rubble pit, or once beaten a raked stone garden with mossy stones, shrubs and a red maple.
export function drawQuarry(
  ctx: CanvasRenderingContext2D,
  { c, s }: Colors,
  place: Place,
  state: LairState,
): void {
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  const cx = x0 + 24;
  const cy = y0 + 22;
  const p = painter(ctx, x0 - 2, y0 - 4, 52, 56);
  const cleared = state === "cleared";
  const stones: [number, number, number][] = [
    [cx - 6, cy - 1, 5],
    [cx + 7, cy + 4, 3],
    [cx + 3, cy - 7, 2],
  ];
  for (let y = y0; y < y0 + 46; y++) {
    for (let x = x0; x < x0 + 48; x++) {
      const a = Math.atan2(y - cy, x - cx);
      const e = Math.hypot((x - cx) / 17, (y - cy) / 12) / (1 + 0.07 * Math.sin(3 * a + 2));
      if (e > 1.12) continue;
      if (e > 1) {
        p.put(x, y, e > 1.09 ? s.k : c.stone2);
        continue;
      }
      if (!cleared) {
        p.put(x, y, valueNoise(x / 3, y / 3, 152) > 0.6 ? s.S : (x * 3 + y * 5) % 7 === 0 ? s.S : s.s);
        continue;
      }
      const d = Math.min(...stones.map(([sx, sy, sr]) => Math.hypot(x - sx, (y - sy) * 1.3) - sr));
      p.put(x, y, d > 0 && Math.floor(d) % 3 === 0 ? c.stone2 : (x * 3 + y) % 11 === 0 ? s.W : c.stone);
    }
  }
  if (cleared) {
    for (const [sx, sy, sr] of stones) {
      const m = blobMask(sr * 2 + 3, sr * 2 + 2, [
        [sr + 1, sr + 1, sr],
        [sr + 2, sr + 1, sr - 1],
      ]);
      renderMask(
        p,
        m,
        sx - sr - 1,
        sy - sr - 1,
        { body: c.rock, light: c.rock3, dark: c.rock2, outline: s.k },
        (x, y, col) => (col === c.rock3 && hash01(x, y, 151) < 0.5 ? c.hedge2 : col),
      );
    }
    for (const [dx, dy] of [
      [0, 0],
      [2, 5],
      [0, 10],
    ]) {
      for (const [ex, ey] of [
        [0, 0],
        [1, 0],
        [2, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
        [0, 2],
        [1, 2],
        [2, 2],
      ])
        p.put(x0 + 22 + dx + ex, y0 + 36 + dy + ey, ey === 2 ? c.stone2 : c.stone);
    }
  } else if (state === "awake") eyes(p, s, cx, cy);
  p.flush();
  if (cleared) {
    for (const [bx, by] of [
      [x0 + 3, y0 + 16],
      [x0 + 38, y0 + 30],
      [x0 + 8, y0 + 32],
    ])
      stamp(ctx, BUSH, s, bx, by);
    stamp(ctx, TREE, { ...s, L: s.R, l: s.r }, x0 + 33, y0 - 2);
  } else
    for (const [dx, dy] of [
      [6, 8],
      [30, 6],
      [34, 26],
      [12, 30],
    ])
      stamp(ctx, ROCK, s, x0 + dx, y0 + dy);
}

// The marsh: a murky pond with dead stumps, or once beaten a clear lily pond with reeds, a jetty and a boat.
export function drawMarsh(
  ctx: CanvasRenderingContext2D,
  { c, s }: Colors,
  place: Place,
  state: LairState,
): void {
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  const cx = x0 + 32;
  const cy = y0 + 26;
  const cleared = state === "cleared";
  const jx = place.door.x * TILE + TILE / 2; // the jetty continues the path that comes down to the door
  pond(ctx, c, s, { cx, cy, rx: 28, ry: 17, seed: 13, lily: cleared, rim: "sand" });
  const p = painter(ctx, x0 - 4, y0 - 4, 72, 56);
  if (!cleared) {
    for (let y = y0; y < y0 + 48; y++) {
      for (let x = x0; x < x0 + 64; x++)
        if ([c.water, c.water2, s["1"]].some((col) => p.is(x, y, col))) p.shade(x, y, 0.35); // murky water
    }
    if (state === "awake") eyes(p, s, cx, cy);
  } else {
    for (let y = y0 - 1; y < y0 + 17; y++)
      for (let x = jx - 3; x <= jx + 3; x++) p.put(x, y, Math.abs(x - jx) === 3 ? s.k : y % 3 ? s.d : s.o);
    for (const y of [y0 + 6, y0 + 15]) {
      for (const x of [jx - 4, jx + 4]) {
        p.put(x, y, s.k);
        p.put(x, y + 1, s.o);
      }
    }
  }
  p.flush();
  for (const [rx, ry] of [
    [x0 + 2, y0 + 20],
    [x0 + 6, y0 + 30],
    [x0 + 56, y0 + 18],
    [x0 + 54, y0 + 32],
  ])
    stamp(ctx, REEDS, s, rx, ry);
  if (cleared) stamp(ctx, [".kkkkkkkkk.", "kdddddddddk", "koooHoooHok", ".kkkkkkkkk."], s, jx + 5, y0 + 13);
  else
    for (const [sx, sy] of [
      [x0 + 12, y0 + 10],
      [x0 + 46, y0 + 34],
    ])
      stamp(ctx, STUMP, s, sx, sy);
}

// The ruins: broken columns and fallen blocks, or once beaten a little temple on steps.
export function drawRuins(
  ctx: CanvasRenderingContext2D,
  { c, s }: Colors,
  place: Place,
  state: LairState,
): void {
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  const p = painter(ctx, x0 - 2, y0 - 2, 62, 52);
  const cleared = state === "cleared";
  const column = (cx: number, top: number): void => {
    for (let y = top; y < y0 + 35; y++) {
      for (let x = cx; x < cx + 6; x++)
        p.put(
          x,
          y,
          x === cx || x === cx + 5
            ? s.k
            : x === cx + 1
              ? s.W
              : x === cx + 2
                ? s.w
                : x === cx + 3
                  ? c.stone
                  : s.s,
        );
    }
    p.hline(cx - 1, cx + 6, top, s.k);
    p.hline(cx - 1, cx + 6, y0 + 35, s.k);
    p.fill(cx - 1, y0 + 36, 8, 1, c.stone);
  };
  if (cleared) {
    p.fill(x0 + 10, y0 + 16, 36, 20, s.S);
    p.hline(x0 + 10, x0 + 45, y0 + 16, s.k);
    p.hline(x0 + 10, x0 + 45, y0 + 17, s.H);
    p.fill(x0 + 25, y0 + 26, 6, 9, c.stone2);
    p.put(x0 + 27, y0 + 24, s.y);
    p.put(x0 + 28, y0 + 24, s.a);
    p.put(x0 + 27, y0 + 25, s.a);
    p.put(x0 + 28, y0 + 25, s.r);
    for (const cx of [x0 + 8, x0 + 19, x0 + 32, x0 + 43]) {
      column(cx, y0 + 18);
      p.fill(cx - 1, y0 + 15, 8, 3, c.stone);
      p.hline(cx - 1, cx + 6, y0 + 15, s.k);
      p.hline(cx - 1, cx + 6, y0 + 17, s.k);
    }
    for (let y = y0 + 10; y < y0 + 15; y++) {
      for (let x = x0 + 4; x < x0 + 52; x++)
        p.put(
          x,
          y,
          y === y0 + 10 || y === y0 + 14 || x === x0 + 4 || x === x0 + 51
            ? s.k
            : y === y0 + 11
              ? s.W
              : Math.floor(x / 3) % 2
                ? c.stone
                : c.stone2,
        );
    }
    for (let y = y0 + 1; y < y0 + 10; y++) {
      const half = ((y - (y0 + 1)) * 24) / 9;
      const left = Math.floor(x0 + 28 - half);
      const right = Math.floor(x0 + 28 + half);
      for (let x = left; x <= right; x++)
        p.put(
          x,
          y,
          x === left || x === right || y === y0 + 1
            ? s.k
            : Math.abs(x - (x0 + 28)) < half - 3 && y > y0 + 4
              ? c.stone2
              : c.stone,
        );
    }
    p.put(x0 + 28, y0 + 7, s.a);
    p.put(x0 + 27, y0 + 7, s.a);
  } else {
    column(x0 + 8, y0 + 28);
    column(x0 + 43, y0 + 24);
    if (state === "awake") eyes(p, s, x0 + 28, y0 + 26);
  }
  for (const [sx, sw, sy] of [
    [x0 + 5, 46, y0 + 37],
    [x0 + 2, 52, y0 + 41],
  ]) {
    for (let y = sy; y < sy + 4; y++) {
      for (let x = sx; x < sx + sw; x++)
        p.put(
          x,
          y,
          y === sy + 3 || x === sx || x === sx + sw - 1
            ? s.k
            : y === sy
              ? s.W
              : (Math.floor(x / 5) + y) % 2
                ? c.stone
                : c.stone2,
        );
    }
  }
  if (cleared) {
    for (let y = y0 + 12; y < y0 + 38; y += 2) {
      p.put(x0 + 8 + (Math.floor(y / 2) % 2), y, c.hedge);
      p.put(x0 + 9, y + 1, c.hedge2);
    }
    for (const fx of [x0 + 4, x0 + 50]) {
      p.fill(fx, y0 + 35, 3, 2, s.R);
      p.put(fx, y0 + 34, s.p);
      p.put(fx + 2, y0 + 34, s.a);
      p.put(fx + 1, y0 + 33, c.hedge);
    }
  }
  p.flush();
  if (!cleared)
    for (const [dx, dy] of [
      [20, 30],
      [30, 33],
      [16, 6],
    ])
      stamp(ctx, STONE_BLOCK, s, x0 + dx, y0 + dy);
}

// The garden: a rounded picket fence with its gate under the door, a gravel walk, six raised beds that show each
// concept's plant (left column top to bottom, then right), a scarecrow and a watering can.
export function drawGardenPlace(
  ctx: CanvasRenderingContext2D,
  { c, s }: Colors,
  place: Place,
  plots: readonly Plot[],
  season: Season,
): void {
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  const gx0 = x0 + 2;
  const gy0 = y0 + 2;
  const gw = 60;
  const gh = 52;
  const p = painter(ctx, x0 - 2, y0 - 6, 70, 66);
  // lawn and shadow follow the fence's rounded corners, so no square corner pokes out
  const lawn = new Set<string>();
  roundedBand(gx0, gy0, gw, gh, 5, (x, y) => {
    lawn.add(`${x},${y}`);
    p.put(x, y, (season === "winter" && snowAt(x, y, c)) || ((x * 7 + y * 3) % 11 ? c.grass : c.grass2));
  });
  roundedBand(gx0 + 2, gy0 + 2, gw, gh, 5, (x, y) => {
    if (!lawn.has(`${x},${y}`)) p.shade(x, y, 0.2);
  });
  for (let y = gy0 + 1; y < gy0 + gh - 1; y++)
    for (let x = x0 + 33; x < x0 + 40; x++) p.put(x, y, hash01(x, y, 161) > 0.08 ? c.path : c.stone2);
  const beds = [
    [x0 + 8, y0 + 7],
    [x0 + 8, y0 + 22],
    [x0 + 8, y0 + 37],
    [x0 + 43, y0 + 7],
    [x0 + 43, y0 + 22],
    [x0 + 43, y0 + 37],
  ];
  for (const [bx, by] of beds) {
    for (let y = by; y < by + 11; y++) {
      for (let x = bx; x < bx + 18; x++)
        p.put(
          x,
          y,
          x === bx || x === bx + 17 || y === by || y === by + 10
            ? s.k
            : y === by + 1 || x === bx + 1
              ? s.d
              : (x + y) % 3
                ? c.soil
                : c.soil2,
        );
    }
  }
  roundedBand(gx0, gy0, gw, gh, 5, (x, y, band) => {
    if (band > 2 || (x >= x0 + 32 && x <= x0 + 40 && y < gy0 + 5)) return;
    p.put(
      x,
      y,
      band === 0 ? s.k : band === 1 ? ((x + y) % 3 ? s.W : c.stone) : (x + y) % 3 === 0 ? s.k : c.stone,
    );
  });
  for (const gx of [x0 + 31, x0 + 41]) {
    p.vline(gx, gy0 - 3, gy0 + 3, s.k);
    p.put(gx, gy0 - 4, s.W);
  }
  const sx = x0 + 29;
  const sy = y0 + 44;
  p.vline(sx, sy - 9, sy + 2, s.o);
  p.hline(sx - 4, sx + 4, sy - 6, s.o);
  p.fill(sx - 1, sy - 12, 3, 3, s.h);
  p.hline(sx - 2, sx + 2, sy - 12, s.R);
  p.fill(sx - 2, sy - 5, 5, 4, s.b);
  p.flush();
  stamp(ctx, ["..kkk...", ".k...k..", "kssssk.k", "kWssssk.", "kssssk..", ".kkkk..."], s, x0 + 32, y0 + 16); // a watering can on the path
  plots.slice(0, 6).forEach((plot, i) => {
    if (!plot.stage) return;
    const [bx, by] = beds[i];
    for (const dx of [2, 9]) stamp(ctx, PLANT_TOPS[plot.stage], s, bx + dx, by + 3);
  });
}
