import { touch } from "./standing";

// A pixel buffer over part of a canvas, for painters that set every pixel (terrain, ranges, cliffs).
// One getImageData and one putImageData instead of a fillRect per pixel.
export type PixelBuffer = {
  set(x: number, y: number, color: string): void;
  is(x: number, y: number, color: string): boolean;
  shade(x: number, y: number, amount: number): void;
  lighten(x: number, y: number, amount: number): void;
  flush(): void;
};

// Shadows darken toward the palette's shadow tone (rgba(38, 48, 31)).
const SHADOW = [38, 48, 31];

const parsed = new Map<string, [number, number, number]>();
function rgb(color: string): [number, number, number] {
  let v = parsed.get(color);
  if (!v) {
    const n = Number.parseInt(color.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    parsed.set(color, v);
  }
  return v;
}

export function pixelBuffer(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): PixelBuffer {
  // a region on whole pixels: a fractional corner would put every write on a fractional index
  const x0 = Math.floor(rx);
  const y0 = Math.floor(ry);
  const w = Math.ceil(rx + rw) - x0;
  const h = Math.ceil(ry + rh) - y0;
  const image = ctx.getImageData(x0, y0, w, h);
  const data = image.data;
  return {
    set(x, y, color) {
      const lx = x - x0;
      const ly = y - y0;
      if (lx < 0 || ly < 0 || lx >= w || ly >= h) return;
      touch(x, y); // getImageData ignores the canvas transform, so these are canvas pixels already
      const [r, g, b] = rgb(color);
      const i = (ly * w + lx) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    },
    is(x, y, color) {
      const lx = x - x0;
      const ly = y - y0;
      if (lx < 0 || ly < 0 || lx >= w || ly >= h) return false;
      const [r, g, b] = rgb(color);
      const i = (ly * w + lx) * 4;
      return data[i] === r && data[i + 1] === g && data[i + 2] === b;
    },
    lighten(x, y, amount) {
      const lx = x - x0;
      const ly = y - y0;
      if (lx < 0 || ly < 0 || lx >= w || ly >= h) return;
      const i = (ly * w + lx) * 4;
      for (let k = 0; k < 3; k++)
        data[i + k] = Math.min(255, Math.round(data[i + k] + (255 - data[i + k]) * amount));
    },
    shade(x, y, amount) {
      const lx = x - x0;
      const ly = y - y0;
      if (lx < 0 || ly < 0 || lx >= w || ly >= h) return;
      const i = (ly * w + lx) * 4;
      for (let k = 0; k < 3; k++) data[i + k] = Math.round(data[i + k] * (1 - amount) + SHADOW[k] * amount);
    },
    flush() {
      ctx.putImageData(image, x0, y0);
    },
  };
}
