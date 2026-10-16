import { MAP_H, MAP_W, TILE } from "./layout";

export type ViewRect = { x: number; y: number; w: number; h: number };
// Map pixels of room around the view for the sprites that overhang its edge (a tall tree, a building, a bird).
export const VIEW_MARGIN = 64;

// The part of the map a paint has to cover: the viewport scrolled into map pixels and grown by the margin.
// Pure, so the numbers can be tested without a browser.
export function coveredRect(
  scrollLeft: number,
  scrollTop: number,
  clientWidth: number,
  clientHeight: number,
  scale: number,
  margin = VIEW_MARGIN,
): ViewRect {
  const x = Math.max(0, Math.min(MAP_W * TILE, Math.floor(scrollLeft / scale) - margin));
  const y = Math.max(0, Math.min(MAP_H * TILE, Math.floor(scrollTop / scale) - margin));
  const w = Math.max(0, Math.min(MAP_W * TILE - x, Math.ceil(clientWidth / scale) + 2 * margin));
  const h = Math.max(0, Math.min(MAP_H * TILE - y, Math.ceil(clientHeight / scale) + 2 * margin));
  return { x, y, w, h };
}

// True when everything the inner rect covers is already inside the outer one.
export function covers(outer: ViewRect, inner: ViewRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

// True when the two rects share at least one pixel.
export function overlap(a: ViewRect, b: ViewRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
