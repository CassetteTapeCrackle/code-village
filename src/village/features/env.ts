import type { MapColors } from "../../art/palette";
import type { Palette } from "../clock";
import { TILE, VX, VY } from "../grid";
import type { VillageMap } from "../layout";
import type { Season } from "../weather";

// `found` lists the items found so far, for features that change with one (the orchard gate opens with the Key Ring).
export type DrawEnv = {
  ctx: CanvasRenderingContext2D;
  s: Record<string, string>;
  c: MapColors;
  palette: Palette;
  map: VillageMap;
  found: ReadonlySet<string>;
  season: Season;
  plots: readonly { concept: string; stage: string | null }[];
};

// Village props are drawn in village pixels (0, 0 is the village's top-left corner).
export function inVillage(ctx: CanvasRenderingContext2D, draw: () => void): void {
  ctx.save();
  ctx.translate(VX * TILE, VY * TILE);
  draw();
  ctx.restore();
}
