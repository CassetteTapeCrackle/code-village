<script lang="ts">
  import { stamp } from "../art/draw";
  import { MAP_COLORS, SPRITE_COLORS } from "../art/palette";
  import { scaleFor } from "../art/scale";
  import { FLOWER_BED, REEDS, ROCK, STONE_BLOCK } from "../art/sprites";
  import { clock } from "../village/clock-state.svelte";

  // A boss's lair: the creature while it is awake, flowers once it is beaten.
  let { lair, cleared }: { lair: string; cleared: boolean } = $props();
  const forest = $derived(lair === "oak" || lair === "maze" || lair === "den");
  const mountain = $derived(lair === "mine" || lair === "ridge" || lair === "peak");
  const W = 160;
  const H = 72;
  let width = $state(0);
  const scale = $derived(scaleFor(width, W, 2, 4));
  let canvas: HTMLCanvasElement;

  function draw(ctx: CanvasRenderingContext2D): void {
    const s = SPRITE_COLORS[clock.palette];
    const c = MAP_COLORS[clock.palette];
    const night = clock.palette === "night";
    const fill = (color: string, x: number, y: number, w = 1, h = 1): void => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    fill(c.stripSky, 0, 0, W, 30);
    if (night)
      for (const [x, y] of [
        [10, 6],
        [44, 12],
        [120, 4],
        [150, 14],
      ])
        fill(s.y, x, y);
    const ground = forest ? [c.forest, c.forest3] : mountain ? [c.rock, c.rock3] : [c.grass, c.grass2];
    for (let y = 30; y < H; y++)
      for (let x = 0; x < W; x++) fill((x * 7 + y * 3) % 11 === 0 ? ground[1] : ground[0], x, y);
    if (lair === "mine") {
      // a rock face with a timbered mine entrance
      fill(s.S, 0, 8, W, 26);
      for (let x = 0; x < W; x += 7) fill(s.s, x, 10 + (x % 3) * 5, 4, 2);
      fill(s.o, 14, 12, 30, 4);
      fill(s.o, 14, 12, 4, 26);
      fill(s.o, 40, 12, 4, 26);
      fill(s.k, 18, 16, 22, 22);
      for (let x = 20; x < 60; x += 5) fill(s.o, x, 62, 3, 2); // rails
      fill(s.S, 18, 60, 44, 1);
      fill(s.S, 18, 64, 44, 1);
    }
    if (lair === "ridge") {
      // rocky slopes and the wind streaming over them
      for (let y = 0; y < 30; y++)
        for (let x = 0; x < W; x++) if (y > 30 - (x % 80) / 3) fill((x + y) % 5 === 0 ? s.S : s.s, x, y);
      for (const [x, y] of [
        [10, 12],
        [52, 6],
        [120, 16],
        [96, 40],
        [20, 44],
      ])
        fill(s.W, x, y, 14, 1);
    }
    if (lair === "peak") {
      // the summit against the sky, snow on top
      for (let y = 4; y < 34; y++) {
        const half = Math.floor((y - 4) * 2.4);
        for (let x = -half; x <= half; x++) fill(y < 14 ? c.snow : (x + y) % 5 === 0 ? s.S : s.s, 80 + x, y);
      }
    }
    if (lair === "oak") {
      // the great oak's trunk and canopy across the back
      fill(s.k, 8, 10, 22, 50);
      fill(s.o, 10, 10, 18, 50);
      for (let x = 0; x < W; x++) fill(x % 5 === 0 ? s.L : s.J, x, 0, 1, 14 + (x % 7));
    }
    if (lair === "maze")
      for (const x of [0, 30, 120, 146]) {
        fill(s.k, x, 26, 14, 40);
        fill(s.J, x + 1, 27, 12, 38);
        fill(s.p, x + 4, 34, 2, 2);
      }
    if (lair === "den") {
      for (let y = 30; y < 62; y++)
        for (let x = 20; x < 140; x++)
          if ((x - 80) ** 2 / 3600 + (y - 62) ** 2 / 900 < 1)
            fill((x + y) % 7 === 0 ? c.soil2 : c.soil, x, y);
    }
    if (lair === "quarry") {
      for (let y = 34; y < H; y++)
        for (let x = 10; x < 150; x++)
          if ((x - 80) ** 2 / 4900 + (y - 60) ** 2 / 500 < 1)
            fill((x * 3 + y * 5) % 7 === 0 ? s.S : s.s, x, y);
      for (const [x, y] of [
        [16, 40],
        [40, 56],
        [116, 52],
        [138, 40],
      ])
        stamp(ctx, ROCK, s, x, y, false, 2);
    }
    if (lair === "marsh" && !cleared) {
      for (let y = 40; y < 64; y++)
        for (let x = 22; x < 138; x++)
          if ((x - 80) ** 2 / 3400 + (y - 52) ** 2 / 150 < 1)
            fill((x + y * 2) % 6 === 0 ? c.water2 : c.water, x, y);
    }
    if (lair === "marsh")
      for (const [x, y] of [
        [12, 36],
        [40, 34],
        [112, 36],
        [140, 40],
        [70, 58],
      ])
        stamp(ctx, REEDS, s, x, y);
    if (lair === "ruins")
      for (const [x, y] of [
        [8, 46],
        [22, 54],
        [118, 50],
        [136, 44],
        [146, 56],
      ])
        stamp(ctx, STONE_BLOCK, s, x, y, false, 2);
    if (cleared) {
      if (lair === "mine") {
        // lit: lanterns either side of the entrance and a cart on the track
        for (const x of [8, 46]) {
          fill(s.k, x, 18, 5, 7);
          fill(s.y, x + 1, 19, 3, 5);
        }
        fill(s.k, 24, 52, 18, 9);
        fill(s.C, 25, 53, 16, 6);
        fill(s.a, 27, 51, 4, 2);
        fill(s.k, 26, 61, 4, 3);
        fill(s.k, 36, 61, 4, 3);
      }
      if (lair === "ridge") {
        // a lookout: a wooden deck with a telescope on its tripod
        fill(s.k, 56, 44, 48, 4);
        fill(s.d, 57, 45, 46, 2);
        for (const x of [60, 98]) fill(s.k, x, 48, 2, 12);
        for (let i = 0; i < 14; i++) fill(i < 2 ? s.k : s.a, 70 + i, 36 - Math.floor(i / 2), 4, 3);
        fill(s.k, 74, 38, 2, 6);
        fill(s.k, 70, 43, 2, 2);
        fill(s.k, 78, 43, 2, 2);
      }
      if (lair === "peak") {
        // a summit flag and a cairn of stacked stones
        fill(s.k, 80, 0, 1, 10);
        fill(s.r, 81, 0, 8, 5);
        for (const [x, y, w] of [
          [66, 58, 18],
          [69, 52, 12],
          [72, 47, 6],
        ]) {
          fill(s.k, x, y, w, 6);
          fill(s.s, x + 1, y + 1, w - 2, 4);
        }
      }
      for (const [x, y] of [
        [30, 48],
        [64, 58],
        [100, 46],
        [120, 60],
      ])
        stamp(ctx, FLOWER_BED, s, x, y);
      if (!night) {
        fill(s.y, 128, 6, 8, 8);
        fill(s.W, 130, 8, 4, 4);
      }
      return;
    }
    if (lair === "quarry") {
      // the Guessing Stone: a carved boulder with a question mark and glowing eyes
      fill(s.k, 62, 22, 36, 34);
      fill(s.s, 64, 24, 32, 30);
      fill(s.S, 64, 46, 32, 8);
      for (const [x, y] of [
        [76, 30],
        [78, 28],
        [80, 28],
        [82, 28],
        [84, 30],
        [84, 32],
        [82, 34],
        [80, 36],
        [80, 38],
        [80, 42],
      ])
        fill(s.k, x, y, 2, 2);
      fill(s.y, 70, 32, 3, 3);
      fill(s.y, 88, 32, 3, 3);
    }
    if (lair === "marsh") {
      // the Gradebook: a soggy ledger rising from the water
      fill(s.k, 66, 30, 28, 24);
      fill(s.z, 68, 32, 24, 20);
      fill(s.w, 70, 34, 9, 16);
      fill(s.w, 81, 34, 9, 16);
      for (let y = 36; y < 50; y += 3) {
        fill(s.s, 71, y, 7, 1);
        fill(s.s, 82, y, 7, 1);
      }
      fill(s.y, 73, 38, 2, 2);
      fill(s.y, 85, 38, 2, 2);
    }
    if (lair === "oak") {
      // the storehouse squirrel: a big brown squirrel clutching an acorn
      fill(s.k, 62, 30, 26, 26);
      fill(s.C, 64, 32, 22, 22);
      fill(s.k, 88, 18, 14, 34);
      fill(s.c, 90, 20, 10, 30); // the tail
      fill(s.y, 68, 38, 3, 3);
      fill(s.y, 78, 38, 3, 3);
      fill(s.k, 70, 48, 10, 8);
      fill(s.o, 71, 49, 8, 6); // the acorn
    }
    if (lair === "maze") {
      // the songbird: a round blue bird with notes floating up
      fill(s.k, 64, 28, 30, 28);
      fill(s.b, 66, 30, 26, 24);
      fill(s.a, 92, 38, 6, 4); // beak
      fill(s.y, 82, 34, 3, 3);
      for (const [x, y] of [
        [100, 20],
        [108, 14],
        [116, 22],
      ]) {
        fill(s.k, x, y, 2, 6);
        fill(s.k, x - 2, y + 5, 3, 2);
      }
    }
    if (lair === "den") {
      // the registry: an enormous ledger with paw prints, watching from the den
      fill(s.k, 58, 24, 44, 30);
      fill(s.o, 60, 26, 40, 26);
      fill(s.w, 62, 28, 17, 22);
      fill(s.w, 81, 28, 17, 22);
      for (const [x, y] of [
        [66, 34],
        [72, 40],
        [86, 36],
        [92, 42],
      ])
        fill(s.k, x, y, 3, 3);
      fill(s.y, 70, 30, 2, 2);
      fill(s.y, 88, 30, 2, 2);
    }
    if (lair === "mine") {
      // the Sales Report: a mine cart heaped with receipts, two eyes peering over the top
      fill(s.k, 64, 30, 40, 26);
      fill(s.C, 66, 32, 36, 18);
      for (const [x, y] of [
        [68, 22],
        [78, 20],
        [88, 23],
        [74, 26],
      ]) {
        fill(s.k, x, y, 10, 10);
        fill(s.w, x + 1, y + 1, 8, 8);
        fill(s.s, x + 2, y + 3, 6, 1);
      }
      fill(s.y, 76, 38, 3, 3);
      fill(s.y, 90, 38, 3, 3);
      fill(s.k, 68, 56, 6, 5);
      fill(s.k, 94, 56, 6, 5);
    }
    if (lair === "ridge") {
      // the Data Summary: a storm cloud raining a bar chart
      for (const [x, w] of [
        [62, 18],
        [80, 20],
      ]) {
        fill(s.k, x, 8, w, 8);
        fill(s.s, x + 2, 10, w - 4, 6);
      }
      fill(s.k, 56, 14, 52, 22);
      fill(s.s, 58, 16, 48, 18);
      fill(s.s, 64, 14, 14, 2);
      fill(s.s, 82, 14, 16, 2); // the puffs flow into the body
      fill(s.W, 62, 16, 20, 6);
      fill(s.y, 70, 24, 3, 3);
      fill(s.y, 90, 24, 3, 3);
      for (const [x, h] of [
        [62, 10],
        [72, 18],
        [82, 8],
        [92, 14],
      ]) {
        fill(s.k, x, 60 - h, 8, h);
        fill(s.b, x + 1, 61 - h, 6, h - 1);
      }
    }
    if (lair === "peak") {
      // the Star Classifier: a constellation that has come down to the summit
      const stars = [
        [60, 30],
        [74, 20],
        [90, 26],
        [100, 40],
        [84, 48],
        [66, 46],
      ];
      for (let i = 0; i < stars.length; i++) {
        const [x1, y1] = stars[i];
        const [x2, y2] = stars[(i + 1) % stars.length];
        for (let t = 0; t <= 1; t += 0.05)
          fill(s.i, Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t));
      }
      for (const [x, y] of stars) {
        fill(s.y, x - 1, y - 1, 3, 3);
        fill(s.W, x, y - 3, 1, 7);
        fill(s.W, x - 3, y, 7, 1);
      }
      fill(s.y, 76, 32, 3, 3);
      fill(s.y, 86, 32, 3, 3);
    }
    if (lair === "ruins") {
      // a ruin guardian: eyes glowing in a broken archway
      fill(s.k, 58, 14, 44, 46);
      fill(s.s, 60, 16, 40, 44);
      fill(s.k, 68, 26, 24, 34);
      fill(s.S, 60, 16, 40, 4);
      fill(s.y, 73, 36, 3, 3);
      fill(s.y, 84, 36, 3, 3);
    }
  }

  $effect(() => {
    void cleared;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (ctx) draw(ctx);
  });
</script>

<div class="lair" bind:clientWidth={width}>
  <canvas bind:this={canvas} style="width: {W * scale}px; height: {H * scale}px" aria-hidden="true"></canvas>
</div>

<style>
  .lair {
    width: 100%;
    display: grid;
    justify-items: center;
    overflow: hidden;
  }
  canvas {
    display: block;
    image-rendering: pixelated;
  }
</style>
