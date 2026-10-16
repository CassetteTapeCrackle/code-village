<script lang="ts">
  import { integerScale } from "../art/scale";
  import { clock } from "../village/clock-state.svelte";
  import { drawHouseRoom, ROOM_H, ROOM_W } from "./houseRoom";

  // The house's room: loot and trophies are the ids found, in the order they were won (the shelf shows the newest).
  let { loot = [], trophies = [] }: { loot?: string[]; trophies?: string[] } = $props();

  let canvas: HTMLCanvasElement;
  let width = $state(0);
  const scale = $derived(integerScale(width, ROOM_W, 4));
  const W = $derived(width ? Math.max(ROOM_W, Math.floor(width / scale)) : ROOM_W);

  $effect(() => {
    // size and draw together: changing a canvas's width wipes what was drawn on it
    canvas.width = W;
    canvas.height = ROOM_H;
    const ctx = canvas.getContext("2d");
    if (ctx) drawHouseRoom(ctx, clock.palette, W, new Set(loot), trophies);
  });
</script>

<div class="room" bind:clientWidth={width}>
  <canvas bind:this={canvas} style="width: {W * scale}px; height: {ROOM_H * scale}px" aria-hidden="true"
  ></canvas>
</div>

<style>
  .room {
    margin-bottom: 14px;
  }
  canvas {
    display: block;
    image-rendering: pixelated;
    box-shadow: inset 0 0 0 3px var(--outline);
  }
</style>
