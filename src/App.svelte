<script lang="ts">
  import CheatView from "./dev/CheatView.svelte";
  import { cheatBuild, cheatsEnabled } from "./dev/flag";
  import { bossById, bundle, lessonById } from "./content/bundle";
  import LessonView from "./lesson/LessonView.svelte";
  import { board } from "./ui/board.svelte";
  import Blocked from "./ui/Blocked.svelte";
  import { focusFor } from "./ui/focus";
  import Hud from "./ui/Hud.svelte";
  import Toasts from "./ui/Toasts.svelte";
  import ConflictDialog from "./ui/ConflictDialog.svelte";
  import { openWorlds } from "./worlds/registry";
  import { parseRoute } from "./route";
  import BossView from "./screens/BossView.svelte";
  import GardenView from "./screens/GardenView.svelte";
  import HouseView from "./screens/HouseView.svelte";
  import LibraryView from "./screens/LibraryView.svelte";
  import SandboxView from "./screens/SandboxView.svelte";
  import SchoolView from "./screens/SchoolView.svelte";
  import BoardView from "./screens/BoardView.svelte";
  import { levelFor } from "./learning/xp";
  import { canSkip } from "./learning/skip";
  import { game } from "./store/progress.svelte";
  import { liftedFog, tickClock } from "./village/clock-state.svelte";
  import Village from "./village/Village.svelte";
  import { getRunner } from "./runner/shared";
  import { onIdle } from "./ui/idle";
  import TourOverlay from "./tour/TourOverlay.svelte";

  tickClock();
  $effect(() => {
    const id = setInterval(() => tickClock(), 60_000);
    return () => clearInterval(id);
  });

  let hash = $state(location.hash);
  $effect(() => {
    const onHash = (): void => {
      hash = location.hash;
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  });
  const route = $derived(parseRoute(hash));
  const lesson = $derived(route.name === "lesson" ? lessonById(route.id) : undefined);
  const boss = $derived(route.name === "boss" ? bossById(route.id) : undefined);
  // The skip route only counts for a sleeping final boss of an open world that has not been skipped yet.
  const skipFight = $derived(
    Boolean(boss && route.name === "boss" && route.skip && canSkip(bundle, game.progress, boss)),
  );
  // A lesson, a boss or the sandbox is where Python runs: warm the runner while the page is idle, so the first
  // Check does not wait for Pyodide to download. The map and the other boards never run code, so they do not.
  $effect(() => {
    if (route.name !== "lesson" && route.name !== "boss" && route.name !== "sandbox") return;
    onIdle(getRunner, 2000);
  });
  const open = $derived(openWorlds(bundle, game.progress));
  // A lesson or boss of a world whose road is still blocked shows the blocked page instead.
  const blockedWorld = $derived(
    lesson && !open.includes(lesson.world)
      ? lesson.world
      : boss && !open.includes(boss.world)
        ? boss.world
        : null,
  );

  // The village stays under every page: a board opens beside the page's building, and closing it returns to the map.
  const focus = $derived(focusFor(route, bundle));
  const covered = $derived(route.name !== "home");
  // the cheat screen lifting the fog over a world with no content also rebuilds the map
  const villageKey = $derived(`${open.join(",")}|${levelFor(game.progress.xp)}|${liftedFog.on}`);
  $effect(() => {
    board.back = focus.back;
    board.backLabel = focus.backLabel;
  });
  $effect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // a pop-up handles its own Escape first (ui/modal.ts)
      if (e.key !== "Escape" || e.defaultPrevented || !covered) return;
      if (e.target instanceof Element && e.target.closest("input, textarea, select, .cm-editor")) return;
      location.hash = focus.back;
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });
</script>

<div class="app">
  {#if !game.persistent}
    <p class="notice" role="status">
      Your browser is not keeping data here, so progress will be lost when you close this page.
    </p>
  {/if}
  <Hud {route} />
  {#if cheatBuild()}
    <p class="cheat-tag" aria-hidden="true">Cheat build</p>
  {/if}
  <main class="stage">
    <!-- the village reads its worlds and villagers when it mounts, so it remounts when a world opens or the level changes -->
    {#key villageKey}<Village focus={focus.place} {covered} />{/key}
    {#if covered}
      <div class="boards">
        {#if blockedWorld}
          <Blocked world={blockedWorld} />
        {:else if lesson}
          {#key lesson.id}<LessonView {lesson} />{/key}
        {:else if boss}
          {#key boss.id}<BossView {boss} skip={skipFight} />{/key}
        {:else if route.name === "cheat" && cheatsEnabled()}
          <CheatView />
        {:else if route.name === "school"}
          {#key route.world}<SchoolView world={route.world ?? "w1"} />{/key}
        {:else if route.name === "garden"}
          <GardenView />
        {:else if route.name === "library"}
          <LibraryView />
        {:else if route.name === "house"}
          <HouseView />
        {:else if route.name === "sandbox"}
          <SandboxView />
        {:else if route.name === "board"}
          <BoardView />
        {/if}
      </div>
    {/if}
    <Toasts />
    <ConflictDialog />
  </main>
  <TourOverlay />
</div>

<style>
  .app {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-columns: minmax(0, 1fr);
    height: 100dvh;
    overflow-x: clip;
  }
  .notice {
    margin: 0;
    padding: 8px 16px;
    background: var(--bad);
    color: var(--bg);
  }
  .cheat-tag {
    position: fixed;
    z-index: 20;
    right: 8px;
    bottom: 8px;
    margin: 0;
    padding: 3px 8px 5px;
    font: 700 11px var(--font-pixel);
    color: var(--ink-dark);
    background: var(--butter);
    box-shadow: inset 0 0 0 2px var(--outline);
    pointer-events: none;
  }
  .stage {
    position: relative;
    min-height: 0;
    overflow: hidden;
  }
  .boards {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;
  }
  @media (max-width: 760px) {
    .stage {
      margin-bottom: 62px;
    } /* the places plank sits at the thumb */
  }
</style>
