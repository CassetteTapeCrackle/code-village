<script lang="ts">
  import { untrack } from "svelte";
  import { ICONS, MOCHI } from "../art/sprites";
  import { TROPHY_SPRITES } from "../art/trophies";
  import { bundle } from "../content/bundle";
  import type { Progress } from "../learning/types";
  import { game } from "../store/progress.svelte";
  import { ITEM_SPRITES } from "../village/destinies";
  import SpriteCanvas from "./SpriteCanvas.svelte";
  import { momentsBetween, type Toast } from "./celebrate";

  // Moments, wherever they happen: a ribbon for each find and new level, and "+15 XP" floating up by the level.
  let before: Progress = untrack(() => $state.snapshot(game.progress) as Progress);
  let shown: (Toast & { key: number })[] = $state([]);
  let floats: { key: number; xp: number }[] = $state([]);
  let counter = 0;

  $effect(() => {
    const after = $state.snapshot(game.progress) as Progress;
    const { xp, toasts } = momentsBetween(bundle, before, after);
    before = after;
    if (xp > 0) {
      const key = counter++;
      floats = [...floats, { key, xp }];
      setTimeout(() => (floats = floats.filter((f) => f.key !== key)), 1100);
    }
    for (const t of toasts) {
      const key = counter++;
      shown = [...shown.slice(-2), { ...t, key }];
      setTimeout(() => (shown = shown.filter((s) => s.key !== key)), 3600);
    }
  });

  const icon = (t: Toast) =>
    t.kind === "level"
      ? MOCHI
      : t.kind === "trophy"
        ? (TROPHY_SPRITES[t.item ?? ""] ?? ICONS.star)
        : (ITEM_SPRITES[t.item ?? ""] ?? ICONS.sprout);
</script>

<div class="toasts" role="status">
  {#each shown as t (t.key)}
    <p class="toast {t.kind}"><SpriteCanvas grid={icon(t)} scale={t.kind === "trophy" ? 2 : 3} /> {t.text}</p>
  {/each}
</div>
{#each floats as f (f.key)}<span class="xp-float" aria-hidden="true">+{f.xp} XP</span>{/each}

<style>
  .toasts {
    position: absolute;
    z-index: 30;
    left: 50%;
    top: 12px;
    translate: -50% 0;
    display: grid;
    gap: 8px;
    justify-items: center;
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding: 9px 30px 11px;
    font: 700 16px var(--font-pixel);
    white-space: nowrap;
    color: var(--ink-light);
    background: var(--matcha-2);
    clip-path: polygon(0 0, 100% 0, calc(100% - 12px) 50%, 100% 100%, 0 100%, 12px 50%);
    text-shadow: 2px 2px 0 rgb(0 0 0 / 0.25);
  }
  .toast.loot,
  .toast.trophy {
    color: var(--ink-dark);
    background: var(--butter);
    text-shadow: none;
  }
  .toast.level {
    background: var(--coral-2);
    font-size: 18px;
  }
  .xp-float {
    position: absolute;
    z-index: 31;
    right: 150px;
    top: 6px;
    font: 700 18px var(--font-pixel);
    color: var(--butter);
    text-shadow: 2px 2px 0 var(--outline);
    pointer-events: none;
  }
  @media (max-width: 860px) {
    .xp-float {
      right: 24px;
    }
    .toast {
      padding: 8px 22px 10px;
      font-size: 14px;
      white-space: normal;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .toast {
      animation: toast-in 260ms ease-out both;
    }
    @keyframes toast-in {
      from {
        translate: 0 -16px;
        opacity: 0;
      }
      to {
        translate: 0 0;
        opacity: 1;
      }
    }
    .xp-float {
      animation: float-up 1000ms steps(6, end) both;
    }
    @keyframes float-up {
      from {
        translate: 0 26px;
        opacity: 1;
      }
      70% {
        opacity: 1;
      }
      to {
        translate: 0 -6px;
        opacity: 0;
      }
    }
  }
</style>
