import { stamp, type Grid } from "../../../art/draw";
import { TILE } from "../../grid";
import type { Feature } from "../../scenery";

const found = (item: string) => ({ kind: "item", item }) as const;

// Stamps a grid with its bottom-left corner on a tile, nudged by (dx, dy) pixels.
export function onTile(
  ctx: CanvasRenderingContext2D,
  s: Record<string, string>,
  grid: Grid,
  tx: number,
  ty: number,
  dx = 0,
  dy = 0,
): void {
  stamp(ctx, grid, s, tx * TILE + dx, ty * TILE + TILE - grid.length + dy);
}

// A scene an item brings: shown once the item is found, named on hover at `at`, described by `label`.
export const scene = (
  id: string,
  item: string,
  at: { x: number; y: number },
  label: string,
  land: Feature["land"],
  draw: Feature["draw"],
): Feature => ({
  id,
  land,
  unlock: found(item),
  at,
  label,
  draw,
});
