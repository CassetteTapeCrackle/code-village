import { capturing, touch } from "./standing";

export type Grid = readonly string[];

// While a standing object is captured, report a rectangle in canvas pixels (through the canvas transform).
function report(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  if (!capturing()) return;
  const m = ctx.getTransform();
  touch(x + m.e, y + m.f, w, h);
}

export function stamp(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  colors: Record<string, string>,
  x: number,
  y: number,
  flip = false,
  scale = 1,
): void {
  const width = grid[0]?.length ?? 0;
  report(ctx, x, y, width * scale, grid.length * scale);
  grid.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const ch = row[dx];
      if (ch === ".") continue;
      ctx.fillStyle = colors[ch];
      ctx.fillRect(x + (flip ? width - 1 - dx : dx) * scale, y + dy * scale, scale, scale);
    }
  });
}

export function px(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w = 1, h = 1): void {
  report(ctx, x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
