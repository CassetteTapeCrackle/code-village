// Seeded noise for the map's shapes: the same seed always draws the same land.
// The hash matches the world-pass mockup's, so both draw the same shapes.

export function hash01(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
}

// Smooth noise between lattice points, in [0, 1].
export function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash01(xi, yi, seed);
  const b = hash01(xi + 1, yi, seed);
  const c = hash01(xi, yi + 1, seed);
  const d = hash01(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Two octaves: broad shapes with a little detail.
export function fbm(x: number, y: number, seed: number): number {
  return 0.65 * valueNoise(x, y, seed) + 0.35 * valueNoise(x * 2.1, y * 2.1, seed + 7);
}

// Sharp crests where the noise crosses its middle: ridges, spurs, jagged edges.
export function ridged(x: number, y: number, seed: number): number {
  return 1 - Math.abs(2 * valueNoise(x, y, seed) - 1);
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
// The ordered-dither threshold for a pixel, in (0, 1).
export function bayer(x: number, y: number): number {
  return (BAYER[y & 3][x & 3] + 0.5) / 16;
}
