// The largest whole-number zoom that fits, so every art pixel covers the same number of screen pixels (spec 5.4).
export function integerScale(available: number, base: number, max = 8): number {
  return Math.max(1, Math.min(max, Math.floor(available / base)));
}

// A whole-number zoom between min and max; below min the picture scrolls instead of shrinking.
export function scaleFor(available: number, base: number, min: number, max: number): number {
  return Math.max(min, integerScale(available, base, max));
}
