<script lang="ts">
  import { stamp } from "../art/draw";
  import { SPRITE_COLORS } from "../art/palette";
  import { PLANT_TOPS, POT } from "../art/sprites";
  import { onMount } from "svelte";
  import { article } from "../learning/school";
  import { clock } from "../village/clock-state.svelte";

  let { concepts }: { concepts: string[] } = $props();
  let canvas: HTMLCanvasElement;

  // The seed flies from this message to the Garden counter in the HUD, which then gives a little pulse.
  onMount(() => {
    if (typeof matchMedia !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => {
      const target = document.querySelector(".hud .due");
      if (!target || !canvas) return;
      const from = canvas.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const seed = new Image();
      seed.src = canvas.toDataURL();
      seed.alt = "";
      Object.assign(seed.style, {
        position: "fixed",
        left: `${from.left}px`,
        top: `${from.top}px`,
        width: `${from.width}px`,
        imageRendering: "pixelated",
        zIndex: "30",
        pointerEvents: "none",
      });
      document.body.append(seed);
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const flight = seed.animate(
        [
          { transform: "translate(0, 0) scale(1)" },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 120}px) scale(1.4)` },
          { transform: `translate(${dx}px, ${dy}px) scale(0.6)`, opacity: 0.4 },
        ],
        { duration: 1100, easing: "ease-in-out" },
      );
      flight.onfinish = () => {
        seed.remove();
        target.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], {
          duration: 450,
        });
      };
    }, 120);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    const ctx = canvas?.getContext("2d");
    if (ctx) stamp(ctx, [...PLANT_TOPS.seed, ...POT], SPRITE_COLORS[clock.palette], 0, 0);
  });
</script>

<div class="toast" role="status">
  <canvas bind:this={canvas} width="7" height="9" aria-hidden="true"></canvas>
  <div>
    {#each concepts as c (c)}<p>{article(c)} {c} seed was planted in the garden.</p>{/each}
    <a href="#/garden">See the garden</a>
  </div>
</div>

<style>
  a {
    font-weight: 700;
    text-decoration: none;
  }
  .toast {
    display: flex;
    gap: 12px;
    align-items: center;
    margin: 16px 0;
    padding: 10px 14px;
    background: var(--panel);
    box-shadow:
      inset 4px 0 0 var(--good),
      var(--frame);
  }
  canvas {
    width: 28px;
    height: 36px;
    image-rendering: pixelated;
    flex: none;
  }
  p {
    margin: 0;
    font-weight: 700;
    color: var(--good);
  }
  @media (prefers-reduced-motion: no-preference) {
    .toast {
      animation: pop 400ms ease-out;
    }
  }
  @keyframes pop {
    from {
      transform: scale(0.94);
      opacity: 0;
    }
  }
</style>
