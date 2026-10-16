import { expect, test } from "vitest";
import { drawFog, fogClouds } from "./render";

// The fog is now painted in runs (one fillRect per run of equal colour and alpha) instead of one 2 x 1
// rect every two pixels. This fake records the last write to each pixel (colour plus alpha) instead of
// rasterising: two painters that write the same pixel set in the same order land on the same cells.
class Surface {
  width: number;
  height: number;
  cells = new Map<number, string>();
  constructor(width = 0, height = 0) {
    this.width = width;
    this.height = height;
  }
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
  private ctx = {
    fillStyle: "#000000",
    globalAlpha: 1,
    fillRect: (x: number, y: number, w: number, h: number): void => {
      const cell = `${this.ctx.fillStyle}@${this.ctx.globalAlpha}`;
      for (let yy = y; yy < y + h; yy++)
        for (let xx = x; xx < x + w; xx++) this.cells.set(yy * this.width + xx, cell);
    },
  } as unknown as CanvasRenderingContext2D;
}

type Rect = { x: number; y: number; w: number; h: number };
const COLORS = {
  fog: "rgba(236, 239, 226, 0.95)",
  fog2: "rgba(252, 252, 246, 0.96)",
  fog3: "rgba(214, 221, 204, 0.96)",
};
const AREA: Rect = { x: 4, y: 3, w: 20, h: 12 };
const OTHER: Rect = { x: 4, y: 15, w: 20, h: 9 };

// The painter as it was before the runs were merged: one 2 x 1 rect per step.
function referenceFog(
  ctx: CanvasRenderingContext2D,
  c: Record<string, string>,
  r: Rect,
  t: number,
  others: Rect[],
): void {
  const TILE = 8;
  const MAP_W = 96;
  const MAP_H = 64;
  const x0 = r.x * TILE;
  const y0 = r.y * TILE;
  const w = r.w * TILE;
  const h = r.h * TILE;
  const BAND = 14;
  const fogAt = (tx: number, ty: number): boolean =>
    others.some((o) => tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h);
  const solid = (tx: number, ty: number): boolean =>
    tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H || fogAt(tx, ty);
  const noise = (x: number, y: number): number => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  };
  const depth = (x: number, y: number): number => {
    const tx = r.x + Math.floor(x / TILE);
    const ty = r.y + Math.floor(y / TILE);
    return Math.min(
      solid(r.x - 1, ty) ? BAND : x,
      solid(tx, r.y - 1) ? BAND : y,
      solid(r.x + r.w, ty) ? BAND : w - 1 - x,
      solid(tx, r.y + r.h) ? BAND : h - 1 - y,
    );
  };
  ctx.fillStyle = c.fog;
  ctx.fillRect(x0 + BAND, y0 + BAND, w - 2 * BAND, h - 2 * BAND);
  const block = (x: number, y: number): void => {
    const d = depth(x, y);
    if (d >= BAND || noise(x, y) < d / BAND) ctx.fillRect(x0 + x, y0 + y, 2, 2);
  };
  for (let y = 0; y < h; y += 2) {
    if (y < BAND || y >= h - BAND) {
      for (let x = 0; x < w; x += 2) block(x, y);
      continue;
    }
    for (let x = 0; x < BAND; x += 2) block(x, y);
    for (let x = w - BAND; x < w; x += 2) block(x, y);
  }
  const FADE = 36;
  const outside = (px0: number, py0: number): number => {
    const tx = Math.floor(px0 / TILE);
    const ty = Math.floor(py0 / TILE);
    if (solid(tx, ty) || (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h)) return 0;
    const dx = Math.max(x0 - px0, px0 - (x0 + w - 1), 0);
    const dy = Math.max(y0 - py0, py0 - (y0 + h - 1), 0);
    return Math.max(dx, dy);
  };
  const count = Math.max(6, Math.round((w * h) / 1800));
  const span = w + FADE * 2;
  const clouds = Array.from({ length: count }, (_, i) => ({
    rad: 7 + ((i * 7) % 11),
    cx: x0 - FADE + ((i * 131 + t * (2 + (i % 3))) % span),
    cy: y0 + 6 + ((i * 89 + (i % 5) * 13) % Math.max(1, h - 12)),
  })).sort((a, b) => a.cy - b.cy);
  for (const { rad, cx, cy } of clouds) {
    const puffs = [
      [-1.1, 0.25, 0.7],
      [0, 0, 1],
      [1.05, 0.2, 0.75],
      [0.45, -0.45, 0.6],
      [-0.5, -0.35, 0.55],
    ];
    for (let dy = -rad; dy <= rad; dy += 1) {
      let left = Infinity;
      let right = -Infinity;
      for (const [ox, oy, k] of puffs) {
        const pr = rad * k;
        const py = dy - oy * rad;
        if (Math.abs(py) > pr) continue;
        const half = Math.sqrt(pr * pr - py * py);
        left = Math.min(left, cx + ox * rad - half);
        right = Math.max(right, cx + ox * rad + half);
      }
      const y = Math.round(cy + dy);
      if (left > right) continue;
      ctx.fillStyle = dy > rad * 0.35 ? c.fog3 : c.fog2;
      for (let x = Math.round(left) & ~1; x < right; x += 2) {
        const d = outside(x, y);
        if (d >= FADE) continue;
        ctx.globalAlpha = d === 0 ? 1 : Math.ceil((1 - d / FADE) * 4) / 5;
        ctx.fillRect(x, y, 2, 1);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function paint(painter: (ctx: CanvasRenderingContext2D, t: number) => void, t: number): Map<number, string> {
  const target = new Surface(96 * 8, 64 * 8);
  painter(target.getContext(), t);
  return target.cells;
}

// The merged runs must be invisible: the same pixels, colour for colour, as the per-step painter.
for (const t of [0, 0.37, 1.5, 7.25, 41.6, 300]) {
  test(`the fog painted in runs matches the per-step painter at t=${t}`, () => {
    const runs = paint((ctx, time) => drawFog(ctx, COLORS, AREA, time, [OTHER]), t);
    const reference = paint((ctx, time) => referenceFog(ctx, COLORS, AREA, time, [OTHER]), t);
    expect(runs.size).toBeGreaterThan(0);
    expect(runs).toEqual(reference);
  });
}

// In light mode each cloud centre is a whole map pixel; in normal mode it is left where the drift put it.
test("light mode snaps the fog clouds to whole map pixels", () => {
  for (const t of [0.2, 1.35, 7.9, 41.6]) {
    for (const cloud of fogClouds(0, 0, 160, 96, t, true)) expect(Number.isInteger(cloud.cx)).toBe(true);
  }
});

test("normal mode leaves the cloud positions exactly where the drift put them", () => {
  const normal = fogClouds(0, 0, 160, 96, 1.35, false);
  const light = fogClouds(0, 0, 160, 96, 1.35, true);
  // the drift sits between pixels at this t, so snapping must actually move it
  expect(normal.some((cloud) => !Number.isInteger(cloud.cx))).toBe(true);
  expect(light.map((cloud) => cloud.cx)).toEqual(normal.map((cloud) => Math.round(cloud.cx)));
});

// The still half is cached on the area, the areas beside it and the palette. A second, different area must
// not reuse the first one's cache (a wrong key shows up as fog in the wrong shape, or in the old colour).
const NIGHT = { ...COLORS, fog: "rgba(26, 38, 48, 0.95)" };
const CASES: { name: string; r: Rect; others: Rect[]; colours: Record<string, string> }[] = [
  { name: "a different area", r: { x: 40, y: 0, w: 16, h: 20 }, others: [AREA], colours: COLORS },
  { name: "the first area in the night palette", r: AREA, others: [OTHER], colours: NIGHT },
  { name: "an area with no neighbours", r: { x: 60, y: 40, w: 12, h: 8 }, others: [], colours: COLORS },
];
for (const { name, r, others, colours } of CASES) {
  test(`the fog matches the per-step painter for ${name}`, () => {
    const runs = paint((ctx, t) => drawFog(ctx, colours, r, t, others), 1.5);
    const reference = paint((ctx, t) => referenceFog(ctx, colours, r, t, others), 1.5);
    expect(runs.size).toBeGreaterThan(0);
    expect(runs).toEqual(reference);
  });
}
