<script lang="ts">
  import { stamp } from "../art/draw";
  import { FLOWERS, MAP_COLORS, SPRITE_COLORS } from "../art/palette";
  import { scaleFor } from "../art/scale";
  import { BENCH, BIG_PLANTS, MOCHI, SHED, WATERING_CAN, WELL } from "../art/sprites";
  import { regionName } from "../content/regions";
  import { bedStatus, type Bed } from "../learning/garden";
  import { clock } from "../village/clock-state.svelte";

  // A walled garden: one raised bed per concept, a row per region.
  let {
    beds,
    selected,
    onselect,
  }: { beds: Bed[]; selected: string | null; onselect: (concept: string) => void } = $props();

  const W = 340;
  // one row of beds per region, World 1's first, then each later world's
  const rowKey = (b: { world: string; region: string }): string => `${b.world}/${b.region}`;
  const regions = $derived([...new Set(beds.map(rowKey))]);
  const H = $derived(56 + regions.length * 50 + 14);
  const placed = $derived(
    beds.map((bed) => {
      const row = regions.indexOf(rowKey(bed));
      const col = beds.filter((b) => rowKey(b) === rowKey(bed)).indexOf(bed);
      return { bed, x: 74 + col * 50, y: 56 + row * 50 + 22 };
    }),
  );

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
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        fill((x * 7 + y * 3) % 11 === 0 ? c.grass2 : (x * 5 + y * 9) % 17 === 0 ? c.grass3 : c.grass, x, y);
    // stepping-stone paths: a spine from the gate, and a lane under each row
    const flag = (x: number, y: number): void => {
      fill(c.stone2, x, y + 1, 6, 4);
      fill(c.stone, x, y, 6, 4);
    };
    for (let y = 40; y < H - 10; y += 7) flag(56, y);
    regions.forEach((_, i) => {
      for (let x = 66; x < 318; x += 8) flag(x, 56 + i * 50 + 47);
    });
    // a hedge all round, with a gate in the bottom
    const bush = (x: number, y: number): void => {
      fill(c.hedge3, x, y + 2, 10, 8);
      fill(c.hedge, x + 1, y, 8, 9);
      fill(c.hedge2, x + 2, y + 1, 4, 3);
    };
    for (let x = 0; x < W; x += 8) {
      bush(x, -2);
      if (x < 150 || x > 196) bush(x, H - 9);
    }
    for (let y = 6; y < H - 8; y += 8) {
      bush(-3, y);
      bush(W - 7, y);
    }
    stamp(ctx, SHED, s, 10, 8, false, 2);
    stamp(ctx, WELL, s, 296, 10, false, 2);
    stamp(ctx, BENCH, s, 262, H - 26, false, 2);
    stamp(ctx, MOCHI, s, 268, H - 42, false, 2);
    // little z's over the napping Mochi
    for (const [zx, zy] of [
      [296, H - 48],
      [302, H - 54],
    ]) {
      fill(s.k, zx, zy, 4, 1);
      fill(s.k, zx + 2, zy + 1);
      fill(s.k, zx + 1, zy + 2);
      fill(s.k, zx, zy + 3, 4, 1);
    }
    for (const { bed, x: bx, y: by } of placed) {
      const wilting = bed.stage === "wilting";
      fill(s.k, bx - 1, by - 1, 42, 24);
      fill(c.bedWood, bx, by, 40, 22);
      fill(c.bedWood2, bx, by, 40, 3);
      for (let y = 4; y < 19; y++) {
        for (let x = 3; x < 37; x++) {
          const soil = wilting
            ? (x + y) % 4 === 0
              ? c.dry2
              : c.dry
            : (x + y) % 5 === 0
              ? c.soil2
              : (x * 3 + y) % 11 === 0
                ? c.soil3
                : c.soil;
          fill(soil, bx + x, by + y);
        }
      }
      if (wilting)
        for (const [x, y] of [
          [10, 8],
          [11, 9],
          [12, 9],
          [25, 12],
          [26, 13],
          [27, 13],
          [28, 14],
        ])
          fill(s.k, bx + x, by + y);
      if (bed.concept === selected) {
        fill(s.a, bx - 3, by - 3, 46, 2);
        fill(s.a, bx - 3, by + 23, 46, 2);
        fill(s.a, bx - 3, by - 3, 2, 28);
        fill(s.a, bx + 41, by - 3, 2, 28);
      }
      if (bed.stage) {
        const colors: Record<string, string> = { ...s, f: FLOWERS[bed.region] ?? s.p };
        BIG_PLANTS[bed.stage].forEach((row, dy) =>
          [...row].forEach((ch, dx) => {
            if (ch !== ".") fill(colors[ch], bx + 9 + dx * 2, by - 14 + dy * 2, 2, 2);
          }),
        );
      }
      if (bed.due) {
        stamp(ctx, WATERING_CAN, s, bx + 32, by - 14);
        fill(s.i, bx + 30, by - 7, 1, 2);
        fill(s.i, bx + 28, by - 5, 1, 2);
      }
    }
    if (night) {
      for (const [x, y] of [
        [110, 40],
        [210, 30],
        [250, 92],
        [150, 140],
        [40, 120],
        [320, 150],
        [190, H - 24],
      ]) {
        fill(c.fireflyGlow, x - 1, y - 1, 3, 3);
        fill(c.firefly, x, y);
      }
    } else {
      for (const [x, y, col] of [
        [128, 36, s.p],
        [236, 84, s.z],
      ] as const) {
        fill(col, x, y, 2, 2);
        fill(col, x + 3, y, 2, 2);
        fill(s.k, x + 2, y, 1, 3);
      }
    }
  }

  $effect(() => {
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (ctx) draw(ctx);
  });
</script>

<div class="viewport" bind:clientWidth={width}>
  <div class="scene" style="width: {W * scale}px; height: {H * scale}px">
    <canvas bind:this={canvas} style="width: {W * scale}px; height: {H * scale}px" aria-hidden="true"
    ></canvas>
    {#each regions as region, i (region)}
      <span
        class="regionsign"
        aria-hidden="true"
        style="left: {14 * scale}px; top: {(56 + i * 50 + 30) * scale}px"
        >{regionName(region.split("/")[0], region.split("/")[1])}</span
      >
    {/each}
    {#each placed as { bed, x, y } (bed.concept)}
      <button
        type="button"
        class="bed"
        aria-pressed={bed.concept === selected}
        aria-label="{bed.concept}: {bedStatus(bed)}"
        style="left: {(x - 3) * scale}px; top: {(y - 16) * scale}px; width: {46 * scale}px; height: {47 *
          scale}px"
        onclick={() => onselect(bed.concept)}
      >
        <span
          class="sign"
          class:due={bed.due && bed.stage !== "wilting"}
          class:wilt={bed.stage === "wilting"}
          title={bed.concept}>{bed.concept}</span
        >
      </button>
    {/each}
  </div>
</div>

<style>
  .viewport {
    overflow-x: auto;
    box-shadow: inset 0 0 0 4px var(--outline);
    background: var(--grass);
  }
  .scene {
    position: relative;
    margin: 0 auto;
  }
  canvas {
    display: block;
    image-rendering: pixelated;
  }
  .regionsign {
    position: absolute;
    transform: translateY(-50%);
    max-width: 100px;
    padding: 5px 9px 7px;
    font: 700 14px/1.1 var(--font-pixel);
    color: var(--chalk);
    background: var(--wood-2);
    box-shadow:
      inset 0 0 0 3px var(--outline),
      inset 0 -4px 0 3px var(--wood-3);
  }
  .bed {
    position: absolute;
    display: block;
    min-height: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
    clip-path: none;
  }
  .bed:hover {
    filter: none;
  }
  .bed:active:not(:disabled) {
    padding: 0;
    box-shadow: none;
  }
  .bed:focus-visible {
    outline: 3px solid var(--link);
    outline-offset: 0;
  }
  .sign {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translate(-50%, 50%);
    padding: 1px 7px 3px;
    font: 600 13px var(--font-pixel);
    white-space: nowrap;
    max-width: calc(100% + 8px); /* a long concept name ends in "..." instead of covering the next bed */
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--chalk);
    background: var(--wood);
    box-shadow:
      inset 0 0 0 2px var(--outline),
      inset 0 -3px 0 2px var(--wood-3);
  }
  .sign.due {
    color: var(--ink-dark);
    background: var(--butter);
  }
  .sign.wilt {
    color: var(--ink-dark);
    background: var(--coral);
  }
</style>
