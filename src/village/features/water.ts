import type { MapColors } from "../../art/palette";
import { pixelBuffer } from "../../art/pixels";
import { hash01, valueNoise } from "../noise";

export type PondShape = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  seed: number;
  lily?: boolean;
  rim: "sand" | "rock";
  night?: boolean;
};

// A pond with a wobbly shore, deeper water in the middle and, if asked, lily pads (pixels).
export function pond(
  ctx: CanvasRenderingContext2D,
  c: MapColors,
  s: Record<string, string>,
  p: PondShape,
): void {
  const x0 = Math.floor(p.cx - p.rx * 1.4) - 1;
  const y0 = Math.floor(p.cy - p.ry * 1.4) - 1;
  const w = Math.ceil(p.rx * 2.8) + 3;
  const h = Math.ceil(p.ry * 2.8) + 3;
  const buf = pixelBuffer(ctx, x0, y0, w, h);
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const a = Math.atan2((y - p.cy) / p.ry, (x - p.cx) / p.rx);
      const k =
        1 +
        0.16 * (valueNoise(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5, p.seed) - 0.5) * 2 +
        0.06 * Math.sin(3 * a + p.seed);
      const e = Math.hypot((x + 0.5 - p.cx) / p.rx, (y + 0.5 - p.cy) / p.ry) / k;
      if (e > 1.13) continue;
      let col: string;
      if (e > 1) col = p.rim === "sand" ? ((x + y) % 3 ? c.path2 : c.stone2) : e > 1.07 ? s.k : c.rock2;
      else if (e > 0.93) col = y < p.cy ? c.water2 : c.water;
      else if (e < 0.55 && (x + y) % 2) col = s["1"];
      else col = (x * 3 + y * 7) % 23 === 0 ? c.water2 : c.water;
      buf.set(x, y, col);
    }
  }
  if (p.night) {
    // stars reflected in still water
    for (let i = 0; i < 4; i++) {
      const a = hash01(i, p.seed, 3) * Math.PI * 2;
      const r = hash01(i, p.seed, 4) * 0.7;
      buf.set(
        Math.floor(p.cx + Math.cos(a) * p.rx * r),
        Math.floor(p.cy + Math.sin(a) * p.ry * r),
        i % 2 ? s.y : s.W,
      );
    }
  }
  if (p.lily) {
    for (let i = 0; i < 5; i++) {
      const a = hash01(i, p.seed, 1) * Math.PI * 2;
      const r = 0.35 + hash01(i, p.seed, 2) * 0.4;
      const lx = Math.floor(p.cx + Math.cos(a) * p.rx * r);
      const ly = Math.floor(p.cy + Math.sin(a) * p.ry * r);
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [1, 1],
        [-1, 1],
      ])
        buf.set(lx + dx, ly + dy, c.hedge);
      if (i % 2 === 0) buf.set(lx, ly, s.p);
    }
  }
  buf.flush();
}
