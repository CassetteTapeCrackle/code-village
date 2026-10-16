import { pixelBuffer } from "../art/pixels";
import { TILE, VX, VY } from "./grid";
import { PLACES, type VillageMap } from "./layout";

// Soft shadows to the lower right, dithered and blended toward the palette's shadow tone.
const inYard = (tx: number, ty: number): boolean =>
  tx >= VX + 4 && tx <= VX + 12 && ty >= VY + 23 && ty <= VY + 33;
const ANCIENT_OAKS: readonly [number, number][] = [
  [26, 31],
  [6, 47],
  [33, 61],
  [12, 23],
];

export function drawTreeShadows(ctx: CanvasRenderingContext2D, map: VillageMap): void {
  const buf = pixelBuffer(ctx, 0, 0, map.w * TILE, map.h * TILE);
  const ellipse = (cx: number, cy: number, rw: number): void => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -rw; dx <= rw; dx++)
        if ((dx / rw) ** 2 + (dy / 1.6) ** 2 <= 1 && (dx + dy) % 2 === 0) buf.shade(cx + dx, cy + dy, 0.25);
    }
  };
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++)
      if (map.tiles[ty][tx] === "T" && !inYard(tx, ty)) ellipse(tx * TILE + 4, ty * TILE + 7, 4);
  }
  for (const [tx, ty] of ANCIENT_OAKS) ellipse(tx * TILE + 4, ty * TILE + 7, 8);
  buf.flush();
}

const SHADOWED = new Set(["school", "library", "house", "cabin", "observatory"]);
export function drawBuildingShadows(ctx: CanvasRenderingContext2D, map: VillageMap): void {
  const buf = pixelBuffer(ctx, 0, 0, map.w * TILE, map.h * TILE);
  for (const p of PLACES) {
    if (!SHADOWED.has(p.kind)) continue;
    const x0 = p.x * TILE;
    const y0 = p.y * TILE;
    const w = p.w * TILE;
    const h = p.h * TILE;
    for (let y = y0 + 10; y < y0 + h + 4; y++) {
      for (let x = x0 + 3; x < x0 + w + 4; x++) {
        if ((x >= x0 + w || y >= y0 + h) && ((x + y) % 2 === 0 || (x < x0 + w + 2 && y < y0 + h + 2)))
          buf.shade(x, y, 0.2);
      }
    }
  }
  buf.flush();
}
