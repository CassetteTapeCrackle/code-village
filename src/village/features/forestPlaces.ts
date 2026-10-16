import type { MapColors } from "../../art/palette";
import { blobMask, groundShadow, maskFrom, painter, renderMask, type Paint } from "../../art/paint";
import { TILE } from "../grid";
import type { Place } from "../layout";
import { fbm, hash01 } from "../noise";
import type { LairState } from "../render";
import { leafColours, type Season } from "../weather";

// The ranger's cabin and the forest lairs, ported from the world-pass mockup (buildings.py). Light from the upper left.
type Colors = { c: MapColors; s: Record<string, string> };

export function drawCabin(
  ctx: CanvasRenderingContext2D,
  { c, s }: Colors,
  place: Place,
  season = "summer",
): void {
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  const p = painter(ctx, x0 - 2, y0 - 22, 64, 76);
  groundShadow(p, x0 + 2, y0 + 4, 52, 44);
  for (let y = y0 - 4; y < y0 + 10; y++) {
    for (let x = x0 + 40; x < x0 + 47; x++)
      p.put(
        x,
        y,
        x === x0 + 40 || x === x0 + 46 || y === y0 - 4
          ? s.k
          : (Math.floor(x / 3) + Math.floor(y / 2)) % 3
            ? c.stone
            : s.S,
      );
  }
  for (let y = y0 + 2; y < y0 + 22; y++) {
    const r = y - (y0 + 2);
    const inset = Math.max(0, 6 - r);
    for (let x = x0 + inset; x < x0 + 56 - inset; x++) {
      if (x === x0 + inset || x === x0 + 55 - inset || r === 0 || y === y0 + 21) {
        p.put(x, y, s.k);
        continue;
      }
      let col = r % 3 === 2 ? s.H : s.o;
      if ((x + Math.floor(r / 3) * 3) % 7 === 0 && r % 3 !== 2) col = s.H;
      if (r === 1) col = s.d;
      if (fbm(x / 6, y / 4, 101) > 0.64 && r > 2) col = (x + y) % 3 ? c.hedge2 : c.hedge; // moss
      if (season === "winter" && r < 4) col = (x + y) % 4 ? c.snow : c.stone; // snow on the roof
      p.put(x, y, col);
    }
  }
  const wt = y0 + 22;
  const wb = y0 + 43;
  for (let y = wt; y < wb; y++) {
    const r = (y - wt) % 4;
    for (let x = x0 + 4; x < x0 + 52; x++) p.put(x, y, y === wt ? s.o : r === 0 ? s.c : r < 3 ? s.C : s.o);
  }
  for (const side of [x0 + 2, x0 + 50]) {
    for (let ly = wt; ly < wb - 1; ly += 4) {
      for (const [dx, dy] of [
        [1, 0],
        [2, 0],
        [0, 1],
        [3, 1],
        [0, 2],
        [3, 2],
        [1, 3],
        [2, 3],
      ])
        p.put(side + dx, ly + dy, s.k);
      for (const [dx, dy] of [
        [1, 1],
        [2, 1],
        [1, 2],
        [2, 2],
      ])
        p.put(side + dx, ly + dy, dx === 1 && dy === 1 ? s.c : s.h);
    }
  }
  p.hline(x0 + 4, x0 + 51, wt, s.k);
  for (const wx of [x0 + 9, x0 + 38]) {
    p.fill(wx, y0 + 26, 9, 8, s.k);
    p.fill(wx + 1, y0 + 27, 7, 6, c.windowGlow);
    p.put(wx + 1, y0 + 27, s.W);
    p.put(wx + 2, y0 + 27, s.W);
    p.put(wx + 1, y0 + 28, s.W);
    p.vline(wx + 4, y0 + 27, y0 + 32, s.k);
    p.hline(wx + 1, wx + 7, y0 + 29, s.k);
    p.fill(wx - 1, y0 + 34, 11, 3, s.k);
    p.hline(wx, wx + 8, y0 + 35, s.d);
    for (let i = 0; i < 9; i += 2) {
      p.put(wx + i, y0 + 33, i % 4 ? s.r : s.p);
      p.put(wx + i + 1, y0 + 33, c.hedge);
    }
  }
  p.fill(x0 + 23, y0 + 28, 10, 15, s.k);
  for (let x = x0 + 24; x < x0 + 32; x++)
    for (let y = y0 + 29; y < y0 + 43; y++) p.put(x, y, (x - x0) % 3 ? s.d : s.o);
  p.put(x0 + 30, y0 + 36, s.a);
  p.put(x0 + 35, y0 + 28, s.k);
  p.put(x0 + 35, y0 + 29, s.y);
  p.put(x0 + 35, y0 + 30, s.a);
  p.put(x0 + 35, y0 + 31, s.k);
  for (let x = x0 + 2; x < x0 + 54; x++) {
    for (let y = wb; y < wb + 4; y++)
      p.put(
        x,
        y,
        y === wb + 3 || x === x0 + 2 || x === x0 + 53
          ? s.k
          : (Math.floor(x / 4) + Math.floor((y - wb) / 2)) % 2
            ? c.stone
            : c.stone2,
      );
  }
  p.fill(x0 + 22, wb + 3, 12, 2, c.stone2);
  p.hline(x0 + 22, x0 + 33, wb + 5, s.k);
  p.flush();
}

const eyes = (p: Paint, s: Record<string, string>, x: number, y: number): void => {
  p.put(x - 1, y, s.a);
  p.put(x + 2, y, s.a);
};

// The hollow oak: a great tree with a dark hollow; once beaten, a treehouse in its canopy.
export function drawHollowOak(
  ctx: CanvasRenderingContext2D,
  { c, s }: Colors,
  place: Place,
  state: LairState,
  season: Season,
): void {
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  const cx = x0 + 28;
  const p = painter(ctx, cx - 34, y0 - 8, 68, 58);
  for (let y = y0 + 22; y < y0 + 48; y++) {
    const spread = 6 + Math.max(0, y - (y0 + 41)) * 1.6;
    for (let x = Math.floor(cx - spread); x <= Math.floor(cx + spread); x++) {
      const t = (x - cx) / spread;
      p.put(x, y, Math.abs(t) > 0.85 ? s.k : t < -0.35 ? s.d : (x * 3 + y) % 7 === 0 ? s.H : s.o);
    }
  }
  p.fill(cx - 3, y0 + 34, 6, 8, s.k);
  p.fill(cx - 2, y0 + 35, 4, 6, s.n);
  if (state === "awake") eyes(p, s, cx - 1, y0 + 37);
  const canopy = blobMask(62, 36, [
    [30, 18, 15],
    [14, 20, 11],
    [46, 20, 11],
    [22, 9, 10],
    [38, 9, 10],
    [30, 5, 9],
    [8, 26, 7],
    [52, 26, 7],
  ]);
  const leaf = { ...s, ...leafColours(season, s, c) };
  const dark = leaf.N ?? c.hedge3;
  renderMask(p, canopy, cx - 31, y0 - 6, { body: leaf.L, light: leaf.l, dark, outline: s.k }, (x, y, col) => {
    if (col === s.k || col === dark) return col;
    if (season === "winter" && y < y0 + 8 + fbm(x / 5, 0, 122) * 4) return leaf.l; // snow lying on the top of the canopy
    const n = fbm(x / 4, y / 4, 121);
    return n < 0.3 ? dark : n > 0.68 ? leaf.l : col === leaf.l ? col : leaf.L;
  });
  if (state === "cleared") {
    const hx = cx - 11;
    const hy = y0 + 4;
    for (let y = hy; y < hy + 8; y++) {
      const half = 4 + (y - hy) * 1.6;
      for (let x = Math.floor(cx - half); x <= Math.floor(cx + half); x++)
        p.put(
          x,
          y,
          x === Math.floor(cx - half) || x === Math.floor(cx + half) || y === hy ? s.k : x < cx ? s.r : s.R,
        );
    }
    for (let y = hy + 8; y < hy + 17; y++)
      for (let x = hx + 2; x < hx + 21; x++)
        p.put(x, y, x === hx + 2 || x === hx + 20 ? s.k : x % 3 ? s.h : s.d);
    p.fill(hx + 5, hy + 10, 5, 4, s.k);
    p.fill(hx + 6, hy + 11, 3, 2, c.windowGlow);
    p.fill(hx + 13, hy + 10, 5, 7, s.k);
    p.fill(hx + 14, hy + 11, 3, 6, s.o);
    for (let x = hx - 3; x < hx + 26; x++) {
      p.put(x, hy + 17, s.k);
      p.put(x, hy + 18, x % 3 ? s.o : s.d);
      p.put(x, hy + 19, s.k);
    }
    for (let y = hy + 20; y < y0 + 48; y++) {
      p.put(cx + 8, y, s.k);
      p.put(cx + 12, y, s.k);
      if (y % 3 === 0) p.hline(cx + 9, cx + 11, y, s.d);
    }
  }
  p.flush();
}

const MAZE = ["####.####", "#.......#", "#.###.#.#", "#.#...#.#", "#.#.###.#", "#...#...#", "#########"];
const hedgeCells = MAZE.flatMap((row, cy) =>
  [...row].flatMap((ch, cx) => (ch === "#" ? [[cx, cy] as const] : [])),
);
const isHedge = (cx: number, cy: number): boolean => MAZE[cy]?.[cx] === "#";
function nearHedgeLine(x: number, y: number): boolean {
  for (const [cx, cy] of hedgeCells) {
    const ax = cx * 8 + 5;
    const ay = cy * 8 + 5;
    if (Math.hypot(x - ax, y - ay) < 3.4) return true;
    for (const [nx, ny] of [
      [cx + 1, cy],
      [cx, cy + 1],
    ]) {
      if (!isHedge(nx, ny)) continue;
      const bx = nx * 8 + 5;
      const by = ny * 8 + 5;
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / 64));
      if (Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))) < 3.4) return true;
    }
  }
  return false;
}
const MAZE_MASK = maskFrom(74, 58, nearHedgeLine);

// The bramble maze: thorny rounded hedges; once beaten, a flower maze with gravel walks and a birdbath.
export function drawMaze(
  ctx: CanvasRenderingContext2D,
  { c, s }: Colors,
  place: Place,
  state: LairState,
): void {
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  const p = painter(ctx, x0, y0, 76, 60);
  const cleared = state === "cleared";
  for (let y = y0 + 2; y < y0 + 56; y++)
    for (let x = x0 + 2; x < x0 + 70; x++)
      p.put(x, y, hash01(x, y, 141) > 0.06 ? (cleared ? c.path : c.soil) : c.stone2);
  for (let y = 0; y < MAZE_MASK.h; y++)
    for (let x = 0; x < MAZE_MASK.w; x++) if (MAZE_MASK.on(x, y)) p.shade(x0 + x + 2, y0 + y + 2, 0.2);
  renderMask(
    p,
    MAZE_MASK,
    x0,
    y0,
    { body: cleared ? c.hedge : s.J, light: cleared ? c.hedge2 : c.hedge, dark: c.hedge3, outline: s.k },
    (x, y, col) => {
      if (col === s.k || hash01(x, y, 143) >= 0.06) return col;
      return cleared ? (hash01(x, y, 142) < 0.5 ? s.p : s.a) : s.p; // flowers, or thorn tips
    },
  );
  if (cleared) {
    const bx = x0 + 37;
    const by = y0 + 29;
    p.fill(bx - 3, by - 1, 7, 2, s.k);
    p.hline(bx - 2, bx + 2, by - 1, c.water2);
    p.vline(bx, by + 1, by + 3, s.s);
    p.hline(bx - 1, bx + 1, by + 4, s.k);
  }
  p.flush();
}

// The old den: a dark earth mound with its burrow in a clearing; once beaten, a picnic.
export function drawDen(
  ctx: CanvasRenderingContext2D,
  { c, s }: Colors,
  place: Place,
  state: LairState,
): void {
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  const cx = x0 + 28;
  const cy = y0 + 24;
  const p = painter(ctx, x0 - 4, y0, 64, 50);
  if (state !== "cleared") {
    for (let y = 0; y < 26; y++) {
      for (let x = -20; x <= 20; x++)
        if ((x / 20) ** 2 + ((y - 26) / 22) ** 2 <= 1)
          p.put(cx + x, cy - 14 + y, (x + y) % 7 === 0 ? c.soil2 : y < 4 ? c.soil2 : c.soil);
    }
    p.fill(cx - 6, cy + 2, 12, 10, s.k);
    p.fill(cx - 4, cy, 8, 2, s.k);
    if (state === "awake") eyes(p, s, cx - 1, cy + 5);
    p.flush();
    return;
  }
  for (let y = cy - 6; y < cy + 6; y++) {
    for (let x = cx - 11; x < cx + 9; x++)
      p.put(x, y, (Math.floor((x - cx) / 3) + Math.floor((y - cy) / 3)) % 2 ? s.W : s.r);
    p.shade(cx + 9, y + 1, 0.22);
    p.shade(cx + 10, y + 1, 0.22);
  }
  for (let x = cx - 10; x < cx + 10; x++) p.shade(x, cy + 6, 0.22);
  for (let y = cy - 7; y < cy - 1; y++)
    for (let x = cx + 12; x < cx + 19; x++)
      p.put(
        x,
        y,
        y === cy - 7 || y === cy - 2 || x === cx + 12 || x === cx + 18 ? s.k : (x + y) % 2 ? s.h : s.d,
      );
  for (let i = 0; i < 5; i++) p.put(cx + 13 + i, cy - 9 + Math.floor(Math.abs(i - 2) / 2), s.k);
  for (const [lx, ly] of [
    [x0 + 6, y0 + 14],
    [x0 + 40, y0 + 36],
  ]) {
    p.fill(lx, ly, 11, 4, s.o);
    p.hline(lx, lx + 10, ly, s.k);
    p.hline(lx, lx + 10, ly + 3, s.k);
    p.hline(lx, lx + 10, ly + 1, s.d);
    p.fill(lx + 10, ly, 3, 4, s.c);
    p.put(lx + 11, ly + 1, s.o);
    p.vline(lx + 12, ly, ly + 3, s.k);
  }
  const fx = x0 + 18;
  const fy = y0 + 38;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    p.put(Math.floor(fx + Math.cos(a) * 5), Math.floor(fy + Math.sin(a) * 3), i % 2 ? s.S : s.s);
  }
  p.hline(fx - 3, fx + 3, fy + 1, s.H);
  p.put(fx - 1, fy, s.r);
  p.put(fx, fy, s.a);
  p.put(fx + 1, fy, s.r);
  p.put(fx, fy - 1, s.y);
  p.put(fx, fy - 2, s.a);
  p.flush();
}
