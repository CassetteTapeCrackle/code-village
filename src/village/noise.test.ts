import { expect, test } from "vitest";
import { bayer, fbm, hash01, ridged, valueNoise } from "./noise";

test("noise is deterministic, bounded and smooth", () => {
  expect(hash01(3, 4, 5)).toBe(hash01(3, 4, 5));
  expect(hash01(3, 4, 5)).not.toBe(hash01(4, 3, 5));
  for (let i = 0; i < 200; i++) {
    const x = i * 0.37;
    const y = i * 0.11;
    for (const f of [valueNoise, fbm, ridged]) {
      const v = f(x, y, 9);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(Math.abs(valueNoise(x + 0.01, y, 9) - valueNoise(x, y, 9))).toBeLessThan(0.05);
  }
  expect(new Set([0, 1, 2, 3].flatMap((y) => [0, 1, 2, 3].map((x) => bayer(x, y)))).size).toBe(16);
});

test("the hash agrees with the mockup's", () => {
  // values printed by the world-pass mockup's mock2.py rnd()
  expect(hash01(3, 4, 5)).toBeCloseTo(0.5985523703504708, 9);
});
