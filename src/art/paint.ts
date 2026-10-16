import { pixelBuffer } from "./pixels";

// Pixel painting over a canvas region, ported from the world pass mockup's helpers.
export type Paint = {
  put(x: number, y: number, color: string): void;
  fill(x: number, y: number, w: number, h: number, color: string): void;
  hline(x0: number, x1: number, y: number, color: string): void;
  vline(x: number, y0: number, y1: number, color: string): void;
  shade(x: number, y: number, amount: number): void;
  is(x: number, y: number, color: string): boolean;
  flush(): void;
};

export function painter(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number): Paint {
  const buf = pixelBuffer(ctx, x0, y0, w, h);
  const put = (x: number, y: number, color: string): void => buf.set(Math.floor(x), Math.floor(y), color);
  return {
    put,
    fill: (x, y, fw, fh, color) => {
      for (let yy = y; yy < y + fh; yy++) for (let xx = x; xx < x + fw; xx++) put(xx, yy, color);
    },
    hline: (a, b, y, color) => {
      for (let x = a; x <= b; x++) put(x, y, color);
    },
    vline: (x, a, b, color) => {
      for (let y = a; y <= b; y++) put(x, y, color);
    },
    shade: (x, y, amount) => buf.shade(Math.floor(x), Math.floor(y), amount),
    is: (x, y, color) => buf.is(Math.floor(x), Math.floor(y), color),
    flush: () => buf.flush(),
  };
}

export type Mask = { w: number; h: number; on: (x: number, y: number) => boolean };

// A shape made of overlapping circles: [centre x, centre y, radius] in the mask's own pixels.
export function blobMask(
  w: number,
  h: number,
  circles: readonly [number, number, number][],
  cutBelow = h,
): Mask {
  const bits = new Uint8Array(w * h);
  for (let y = 0; y < Math.min(h, cutBelow); y++) {
    for (let x = 0; x < w; x++)
      if (circles.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r)) bits[y * w + x] = 1;
  }
  return { w, h, on: (x, y) => x >= 0 && y >= 0 && x < w && y < h && bits[y * w + x] === 1 };
}

// A shape given by a test on its own pixels.
export function maskFrom(w: number, h: number, test: (x: number, y: number) => boolean): Mask {
  const bits = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (test(x, y)) bits[y * w + x] = 1;
  return { w, h, on: (x, y) => x >= 0 && y >= 0 && x < w && y < h && bits[y * w + x] === 1 };
}

// A soft shadow to the right of and below a footprint.
export function groundShadow(p: Paint, x0: number, y0: number, w: number, h: number, depth = 4): void {
  for (let y = y0 + 10; y < y0 + h + depth; y++) {
    for (let x = x0 + 3; x < x0 + w + depth; x++) {
      if ((x >= x0 + w || y >= y0 + h) && ((x + y) % 2 === 0 || (x < x0 + w + 2 && y < y0 + h + 2)))
        p.shade(x, y, 0.2);
    }
  }
}

// Draws a mask as a lit shape: a dark outline, light on top edges, shadow on bottom edges.
export function renderMask(
  p: Paint,
  m: Mask,
  ox: number,
  oy: number,
  tones: { body: string; light: string; dark: string; outline: string },
  texture?: (x: number, y: number, color: string) => string,
): void {
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (!m.on(x, y)) continue;
      const inner = m.on(x - 1, y) && m.on(x + 1, y) && m.on(x, y - 1) && m.on(x, y + 1);
      if (!inner) {
        p.put(ox + x, oy + y, tones.outline);
        continue;
      }
      const up = !m.on(x, Math.max(0, y - 2)) || !m.on(x, y - 1);
      const down = !m.on(x, y + 2);
      const color = up && !down ? tones.light : down ? tones.dark : tones.body;
      p.put(ox + x, oy + y, texture ? texture(ox + x, oy + y, color) : color);
    }
  }
}

// The pixels of a rounded rectangle ring three pixels thick: band 0 is the outer edge, 1 and 2 the middle,
// 3 the inner edge; inside pixels are band 4 (walls, fences).
export function roundedBand(
  x0: number,
  y0: number,
  w: number,
  h: number,
  r: number,
  visit: (x: number, y: number, band: number) => void,
): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dx = Math.max(x0 + r - x, 0, x - (x0 + w - 1 - r));
      const dy = Math.max(y0 + r - y, 0, y - (y0 + h - 1 - r));
      const d = dx && dy ? r - Math.hypot(dx, dy) : Math.min(x - x0, x0 + w - 1 - x, y - y0, y0 + h - 1 - y);
      if (d < 0) continue;
      visit(x, y, d < 0.9 ? 0 : d < 3 ? 1 : d < 3.9 ? 2 : d < 4.9 ? 3 : 4);
    }
  }
}

// A filled oval; `colour` picks each pixel's colour, `rim` (if given) paints the outer ring.
export function oval(
  p: Paint,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  colour: (x: number, y: number) => string,
  rim?: string,
): void {
  for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) {
    for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) {
      const e = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (e <= 1) p.put(x, y, rim && e > 0.7 ? rim : colour(x, y));
    }
  }
}

// Paint into a small region and flush it.
export function paintAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  draw: (p: Paint) => void,
): void {
  const p = painter(ctx, x, y, w, h);
  draw(p);
  p.flush();
}

// A small house: a thatched or tiled roof, wooden or stone walls, a door, a window and maybe a smoking chimney.
export function smallHouse(
  p: Paint,
  { c, s }: { c: Record<string, string>; s: Record<string, string> },
  x0: number,
  y0: number,
  w: number,
  h: number,
  roof: "thatch" | "red",
  wall: "wood" | "stone",
  chimney: boolean,
): void {
  const rh = Math.floor(h * 0.48);
  groundShadow(p, x0 + 1, y0 + 3, w - 1, h - 2, 3);
  if (chimney) {
    for (let y = y0 - 2; y < y0 + 5; y++)
      for (let x = x0 + w - 8; x < x0 + w - 4; x++)
        p.put(x, y, x === x0 + w - 8 || x === x0 + w - 5 || y === y0 - 2 ? s.k : s.s);
    for (const [dx, dy] of [
      [0, -4],
      [1, -5],
      [2, -7],
      [3, -8],
      [2, -9],
    ])
      p.put(x0 + w - 6 + dx, y0 + dy, dy % 2 ? s.W : c.stone);
  }
  for (let y = y0; y < y0 + rh; y++) {
    const r = y - y0;
    const inset = roof === "thatch" ? Math.max(0, rh - 2 - r) : Math.max(0, 4 - r);
    for (let x = x0 + inset; x < x0 + w - inset; x++) {
      if (x === x0 + inset || x === x0 + w - 1 - inset || r === 0 || y === y0 + rh - 1) {
        p.put(x, y, s.k);
        continue;
      }
      if (roof === "thatch") p.put(x, y, (x * 2 + r * 3) % 7 === 0 ? s.C : (x + r) % 3 ? s.x : s.h);
      else p.put(x, y, r % 3 === 2 || (x + Math.floor(r / 3) * 3) % 6 === 0 ? s.R : s.r);
    }
  }
  for (let y = y0 + rh; y < y0 + h - 1; y++) {
    for (let x = x0 + 2; x < x0 + w - 2; x++) {
      const edge = x === x0 + 2 || x === x0 + w - 3;
      if (wall === "stone")
        p.put(
          x,
          y,
          edge ? s.k : (y - y0) % 4 === 0 || (x + Math.floor((y - y0) / 4) * 3) % 6 === 0 ? s.S : c.stone,
        );
      else p.put(x, y, edge ? s.k : (x - x0) % 3 === 0 ? s.o : s.d);
    }
  }
  p.hline(x0 + 2, x0 + w - 3, y0 + rh, s.k);
  p.hline(x0 + 1, x0 + w - 2, y0 + h - 1, s.k);
  const dx = x0 + Math.floor(w / 2) - 3;
  p.fill(dx, y0 + rh + 2, 6, h - rh - 3, s.k);
  p.fill(dx + 1, y0 + rh + 3, 4, h - rh - 4, s.o);
  p.put(dx + 4, y0 + rh + 6, s.a);
  p.fill(x0 + 5, y0 + rh + 2, 5, 4, s.k);
  p.fill(x0 + 6, y0 + rh + 3, 3, 2, c.windowGlow);
  p.put(x0 + 6, y0 + rh + 3, s.W);
}
