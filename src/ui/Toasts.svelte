<script lang="ts">
  import { untrack } from "svelte";
  import { ICONS } from "../art/sprites";
  import { TROPHY_SPRITES } from "../art/trophies";
  import { bundle } from "../content/bundle";
  import type { Progress } from "../learning/types";
  import { game } from "../store/progress.svelte";
  import { ITEM_SPRITES } from "../village/destinies";
  import { SPOTS } from "../village/layout";
  import SpriteCanvas from "./SpriteCanvas.svelte";
  import { levelSummary, momentsBetween, type Toast } from "./celebrate";
  import { clearLevelToast, moments } from "./moments.svelte";
  import { showOnMap } from "./showme.svelte";

  // Moments, wherever they happen: a ribbon for each find, and "+15 XP" floating up by the level.
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
    t.kind === "trophy"
      ? (TROPHY_SPRITES[t.item ?? ""] ?? ICONS.star)
      : (ITEM_SPRITES[t.item ?? ""] ?? ICONS.sprout);

  // The level toast rises when the map is back in view, then leaves on its own, on Escape or on its close button.
  $effect(() => {
    if (!moments.level) return;
    const timer = setTimeout(clearLevelToast, 8000);
    return () => clearTimeout(timer);
  });
  $effect(() => {
    if (!moments.level) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") clearLevelToast();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function showLevel(): void {
    const news = moments.level;
    if (!news) return;
    const spots = news.items.flatMap((item) => (SPOTS[item.id] ? [SPOTS[item.id]] : []));
    clearLevelToast();
    const [first] = spots;
    if (!first) return;
    showOnMap(
      first,
      `New at level ${news.level}: ${news.items.map((item) => item.name).join(", ")}`,
      "",
      "",
      spots,
    );
  }
</script>

<div class="toasts" role="status">
  {#each shown as t (t.key)}
    <p class="toast {t.kind}"><SpriteCanvas grid={icon(t)} scale={t.kind === "trophy" ? 2 : 3} /> {t.text}</p>
  {/each}
</div>
{#each floats as f (f.key)}<span class="xp-float" aria-hidden="true">+{f.xp} XP</span>{/each}
{#if moments.level}
  <div class="level-toast" role="status">
    <div class="level-live">
      <p class="level-title">Level {moments.level.level}</p>
      <p class="level-summary">{levelSummary(moments.level.items.map((item) => item.name))}</p>
    </div>
    <button type="button" class="primary" onclick={showLevel}>Show me</button>
    <button type="button" class="level-close" aria-label="Close" onclick={clearLevelToast}>×</button>
  </div>
{/if}

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
  .level-toast {
    position: absolute;
    z-index: 30;
    left: 12px;
    right: 12px;
    bottom: 14px;
    width: fit-content;
    max-width: min(560px, calc(100% - 24px));
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px 12px 16px;
    color: var(--ink-light);
    background: var(--coral-2);
    box-shadow:
      inset 0 0 0 3px var(--outline),
      inset 0 -6px 0 3px rgb(0 0 0 / 0.18),
      0 4px 0 rgb(0 0 0 / 0.25);
  }
  .level-live {
    min-width: 0;
  }
  .level-title {
    margin: 0;
    font: 700 18px var(--font-pixel);
    text-shadow: 2px 2px 0 rgb(0 0 0 / 0.25);
  }
  .level-summary {
    margin: 2px 0 0;
    font: 600 13px/1.35 var(--font-pixel);
  }
  .level-toast button {
    flex: none;
    min-height: 34px;
    padding: 0 12px 3px;
    font-size: 13px;
  }
  .level-close {
    width: 34px;
    padding: 0 0 3px;
    color: var(--ink-light);
    background: transparent;
    box-shadow: inset 0 0 0 3px rgb(255 255 255 / 0.35);
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
    .level-toast {
      gap: 8px;
      padding: 8px 8px 10px 12px;
    }
    .level-title {
      font-size: 16px;
    }
    .level-summary {
      font-size: 12px;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .toast {
      animation: toast-in 260ms ease-out both;
    }
    .level-toast {
      animation: rise-in 320ms ease-out both;
    }
    @keyframes rise-in {
      from {
        translate: 0 16px;
        opacity: 0;
      }
      to {
        translate: 0 0;
        opacity: 1;
      }
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
