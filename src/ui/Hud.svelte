<script lang="ts">
  import { ICONS, MOCHI } from "../art/sprites";
  import type { Grid } from "../art/draw";
  import { bundle } from "../content/bundle";
  import { today } from "../learning/dates";
  import { dueReviews } from "../learning/review";
  import { MAX_LEVEL, levelFor, xpForLevel } from "../learning/xp";
  import type { Route } from "../route";
  import { game } from "../store/progress.svelte";
  import { openWorlds } from "../worlds/registry";
  import { moments, setSound } from "./moments.svelte";
  import SpriteCanvas from "./SpriteCanvas.svelte";
  import TodayCard from "./TodayCard.svelte";
  import { cheatsEnabled } from "../dev/flag";

  // The plank: the one navigation. Seven places (keys 1 to 7), today's to-dos, sound, level and XP.
  let { route }: { route: Route } = $props();

  const HOME_ICON: Grid = ["...k...", "..kRk..", ".kRRRk.", "kRRRRRk", ".kwwwk.", ".kwkwk.", ".kkkkk."];
  const SHELF_ICON: Grid = ["kkkkkkk", "krkbkak", "krkbkak", "krkbkak", "kkkkkkk"];
  const BOARD_ICON: Grid = ["kkkkkkk", "kwwwwwk", "kwssswk", "kwwwwwk", "kwsswwk", "kwwwwwk", "kkkkkkk"];
  const SPEAKER: Grid = ["...k....", "..kWk...", "kkWWk.W.", "kWWWk..W", "kkWWk.W.", "..kWk...", "...k...."];
  const MUTE: Grid = ["...k....", "..kWk...", "kkWWkr.r", "kWWWk.r.", "kkWWkr.r", "..kWk...", "...k...."];
  const SCROLL: Grid = ["kkkkkk.", "kwwwwwk", ".kwkkwk", ".kwwwwk", ".kwkkwk", ".kwwwwk", "..kkkkk"];

  // The Lessons place opens the newest world whose road is open.
  const newest = $derived(openWorlds(bundle, game.progress).at(-1) ?? "w1");
  const due = $derived(dueReviews(bundle, game.progress, today()).length);
  const PLACES: { id: string; name: string; icon: Grid; href: () => string }[] = [
    { id: "home", name: "Village", icon: HOME_ICON, href: () => "#/" },
    {
      id: "school",
      name: "School",
      icon: ICONS.book,
      href: () => (newest === "w1" ? "#/school" : `#/school/${newest}`),
    },
    { id: "garden", name: "Garden", icon: ICONS.sprout, href: () => "#/garden" },
    { id: "library", name: "Library", icon: SHELF_ICON, href: () => "#/library" },
    { id: "house", name: "House", icon: ICONS.heart, href: () => "#/house" },
    { id: "sandbox", name: "Sandbox", icon: ICONS.slate, href: () => "#/sandbox" },
    { id: "board", name: "Board", icon: BOARD_ICON, href: () => "#/board" },
  ];
  const here = $derived(route.name === "lesson" ? "school" : route.name);

  // Mochi hops each time something is passed (the cheer count goes up).
  let hopping = $state(false);
  let lastCheer = moments.cheer;
  $effect(() => {
    if (moments.cheer === lastCheer) return;
    lastCheer = moments.cheer;
    hopping = true;
    const done = setTimeout(() => (hopping = false), 900);
    return () => clearTimeout(done);
  });

  const level = $derived(levelFor(game.progress.xp));
  const from = $derived(xpForLevel(level));
  const to = $derived(xpForLevel(level + 1));
  // the level is capped (src/learning/xp.ts): at the top the bar turns gold and says MAX
  const maxed = $derived(level === MAX_LEVEL);
  const share = $derived(maxed ? 100 : Math.round((100 * (game.progress.xp - from)) / (to - from)));

  // Today hangs from the plank as a scroll; on the map it is pinned there instead.
  let todayOpen = $state(false);
  $effect(() => {
    void route;
    todayOpen = false;
  });

  // Number keys open the six places, unless the learner is typing.
  $effect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        e.target instanceof Element &&
        e.target.closest("input, textarea, select, [contenteditable], .cm-editor")
      )
        return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > PLACES.length) return;
      location.hash = PLACES[n - 1].href();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });
</script>

<header class="plank">
  <a class="brand" href="#/"
    ><span class="mochi" class:hopping><SpriteCanvas grid={MOCHI} scale={3} /></span><span class="name"
      >Code Village</span
    ></a
  >
  <nav class="places" aria-label="Main">
    {#each PLACES as p, i (p.id)}
      <a href={p.href()} aria-current={p.id === here ? "page" : undefined} aria-keyshortcuts={String(i + 1)}>
        <span class="num" aria-hidden="true">{i + 1}</span>
        <SpriteCanvas grid={p.icon} scale={3} />
        <span class="label">{p.name}</span>
        {#if p.id === "garden" && due > 0}<span class="count" aria-label="{due} to water">{due}</span>{/if}
      </a>
    {/each}
  </nav>
  <div class="right">
    {#if cheatsEnabled()}<a class="cheat" href="#/cheat">cheat</a>{/if}
    {#if route.name !== "home"}
      <button
        type="button"
        class="today-btn"
        aria-expanded={todayOpen}
        onclick={() => (todayOpen = !todayOpen)}
      >
        <SpriteCanvas grid={SCROLL} scale={3} /><span class="label">Today</span>
      </button>
    {/if}
    <button
      type="button"
      class="icon"
      aria-pressed={moments.sound}
      aria-label="Sound"
      onclick={() => setSound(!moments.sound)}
    >
      <SpriteCanvas grid={moments.sound ? SPEAKER : MUTE} scale={3} />
    </button>
    <div class="level" aria-hidden="true">{level}</div>
    <div class="xp" data-tour="xp">
      {#if maxed}
        <div class="bar maxed" role="img" aria-label="Max level reached">
          <i style="width: 100%"></i><b class="max">MAX</b>
        </div>
        <small>Level {level} · {game.progress.xp} XP</small>
      {:else}
        <div
          class="bar"
          role="progressbar"
          aria-label="XP towards level {level + 1}"
          aria-valuemin={from}
          aria-valuemax={to}
          aria-valuenow={game.progress.xp}
        >
          <i style="width: {share}%"></i>
        </div>
        <small>Level {level} · {game.progress.xp} / {to} XP</small>
      {/if}
    </div>
  </div>
  {#if todayOpen}
    <div class="scroll">
      <TodayCard />
    </div>
  {/if}
</header>

<style>
  .plank {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: stretch;
    gap: 0 8px;
    min-height: 58px;
    padding: 0 10px;
    color: var(--chalk);
    background: var(--wood);
    background-image: repeating-linear-gradient(90deg, transparent 0 118px, rgb(0 0 0 / 0.08) 118px 120px);
    box-shadow:
      inset 0 4px 0 var(--wood-hi),
      inset 0 -5px 0 var(--wood-3),
      0 3px 0 var(--outline);
  }
  a {
    color: inherit;
    text-decoration: none;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px 4px 4px;
    font: 700 18px var(--font-pixel);
    white-space: nowrap;
  }
  .places {
    display: flex;
    align-items: flex-end;
    gap: 2px;
  }
  .places a {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 13px 4px;
    font: 700 14px var(--font-pixel);
    opacity: 0.88;
    clip-path: polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%, 0 3px);
  }
  .places a:hover {
    opacity: 1;
    background: rgb(0 0 0 / 0.1);
  }
  .places a[aria-current="page"] {
    opacity: 1;
    color: var(--text);
    background: var(--paper);
    box-shadow:
      inset 0 3px 0 var(--butter),
      inset 0 0 0 2px var(--outline);
  }
  .places a:focus-visible,
  .brand:focus-visible,
  button:focus-visible,
  .cheat:focus-visible {
    outline: 3px solid var(--butter);
    outline-offset: -3px;
  }
  .num {
    position: absolute;
    left: 4px;
    top: 2px;
    font-size: 9px;
    opacity: 0.55;
  }
  .count {
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    display: inline-grid;
    place-items: center;
    font: 700 11px var(--font-pixel);
    color: var(--ink-dark);
    background: var(--coral);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 4px;
  }
  .cheat {
    font: 600 13px var(--font-pixel);
    color: var(--butter);
  }
  .today-btn,
  .icon {
    --c: 3px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 0 10px 2px;
    font: 700 14px var(--font-pixel);
    color: var(--chalk);
    background: var(--wood-3);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .icon {
    width: 36px;
    padding: 0;
    justify-content: center;
  }
  .today-btn[aria-expanded="true"] {
    color: var(--text);
    background: var(--paper);
  }
  .level {
    --c: 3px;
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    font: 700 18px var(--font-pixel);
    color: var(--ink-dark);
    background: var(--butter);
    box-shadow:
      inset 0 0 0 3px var(--outline),
      inset 0 -5px 0 3px var(--butter-2);
  }
  .bar {
    --c: 2px;
    position: relative;
    width: 132px;
    height: 14px;
    background: var(--wood-3);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .bar i {
    position: absolute;
    inset: 2px auto 2px 2px;
    max-width: calc(100% - 4px);
    background: repeating-linear-gradient(90deg, var(--matcha) 0 6px, var(--matcha-2) 6px 8px);
  }
  .bar.maxed i {
    background: repeating-linear-gradient(90deg, var(--butter) 0 6px, var(--butter-2) 6px 8px);
  }
  .max {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font: 700 10px/1 var(--font-pixel);
    letter-spacing: 2px;
    color: var(--ink-dark);
  }
  @media (prefers-reduced-motion: no-preference) {
    .bar i {
      transition: width 640ms steps(8, end);
    } /* fills in chunks */
  }
  small {
    display: block;
    margin-top: 2px;
    font: 500 11px var(--font-pixel);
    opacity: 0.9;
    white-space: nowrap;
  }
  .scroll {
    position: absolute;
    z-index: 11;
    top: calc(100% - 4px);
    right: 200px;
    width: 320px;
    padding-top: 8px;
  }
  .scroll::before {
    content: "";
    position: absolute;
    left: -8px;
    right: -8px;
    top: 2px;
    height: 10px;
    background: var(--wood-3);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .mochi {
    display: inline-block;
  }
  @media (prefers-reduced-motion: no-preference) {
    .mochi.hopping {
      animation: hop 300ms steps(3) 3;
    }
    @keyframes hop {
      50% {
        transform: translateY(-8px);
      }
    }
    .scroll {
      animation: unroll 280ms steps(1, end) both;
    }
    @keyframes unroll {
      0% {
        clip-path: inset(0 0 85% 0);
      }
      25% {
        clip-path: inset(0 0 60% 0);
      }
      50% {
        clip-path: inset(0 0 30% 0);
      }
      75% {
        clip-path: inset(0 0 8% 0);
      }
      100% {
        clip-path: inset(0);
      }
    }
  }
  @media (max-width: 1320px) {
    .brand .name {
      display: none;
    }
    .places a {
      padding: 0 10px 4px;
    }
  }
  @media (max-width: 1180px) {
    .places .label,
    .today-btn .label {
      display: none;
    }
  }
  @media (max-width: 860px) {
    .xp {
      display: none;
    }
  }
  /* Phones: the places move to a plank at the thumb */
  @media (max-width: 760px) {
    .places {
      position: fixed;
      z-index: 12;
      left: 0;
      right: 0;
      bottom: 0;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0;
      align-items: stretch;
      height: 62px;
      background: var(--wood);
      box-shadow:
        inset 0 3px 0 var(--outline),
        inset 0 6px 0 var(--wood-hi);
    }
    .places a {
      flex-direction: column;
      justify-content: center;
      gap: 3px;
      height: auto;
      padding: 6px 0 4px;
      font-size: 10px;
      clip-path: none;
    }
    .places .label {
      display: inline;
    }
    .places a[aria-current="page"] {
      box-shadow:
        inset 0 3px 0 var(--outline),
        inset 0 6px 0 var(--butter);
    }
    .num {
      display: none;
    }
    .count {
      position: absolute;
      top: 6px;
      right: 6px;
      min-width: 15px;
      height: 15px;
      font-size: 9px;
    }
    .scroll {
      left: 8px;
      right: 8px;
      width: auto;
    }
  }
</style>
