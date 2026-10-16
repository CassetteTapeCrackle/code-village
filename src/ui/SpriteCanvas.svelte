<script lang="ts">
  import { stamp, type Grid } from "../art/draw";
  import { SPRITE_COLORS } from "../art/palette";
  import { clock } from "../village/clock-state.svelte";

  // Draws one sprite grid crisply at a whole-number scale, in the current palette.
  let {
    grid,
    scale = 3,
    colors = {},
    label = "",
  }: { grid: Grid; scale?: number; colors?: Record<string, string>; label?: string } = $props();
  let canvas: HTMLCanvasElement;

  $effect(() => {
    if (!canvas) return;
    canvas.width = grid[0].length;
    canvas.height = grid.length;
    const ctx = canvas.getContext("2d");
    if (ctx) stamp(ctx, grid, { ...SPRITE_COLORS[clock.palette], ...colors }, 0, 0);
  });
</script>

<canvas
  bind:this={canvas}
  style="width: {grid[0].length * scale}px; height: {grid.length * scale}px"
  role={label ? "img" : undefined}
  aria-label={label || undefined}
  aria-hidden={label ? undefined : "true"}
></canvas>

<style>
  canvas {
    display: block;
    image-rendering: pixelated;
    flex: none;
  }
</style>
