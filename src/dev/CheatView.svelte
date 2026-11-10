<script lang="ts">
  import Screen from "../ui/Screen.svelte";
  import { bundle } from "../content/bundle";
  import { regionName } from "../content/regions";
  import { regularLessons } from "../content/lessons";
  import { restartTour } from "../tour/tour.svelte";
  import { today } from "../learning/dates";
  import { emptyProgress } from "../learning/types";
  import { levelFor } from "../learning/xp";
  import { game, update } from "../store/progress.svelte";
  import {
    clock,
    forceSeason,
    forceShoreStage,
    liftFog,
    liftedFog,
    previewBeach,
    previewBeachLevel,
    forceTime,
    forcedSeason,
    forcedShoreStage,
  } from "../village/clock-state.svelte";
  import { DECOR } from "../village/decor";
  import { SHORE_LEVELS } from "../village/features/shore";
  import { WORLDS, openWorlds } from "../worlds/registry";
  import {
    TOP_LEVEL,
    beatBosses,
    finishEverything,
    missingArt,
    openWorld,
    passLessons,
    plantsDue,
    reachLevel,
    resetWorld,
  } from "./cheats";

  const day = today();
  const counted = regularLessons(bundle.lessons);
  // every world with content, each with its regions and bosses, in order
  const worlds = WORLDS.filter((w) => counted.some((l) => l.world === w.id)).map((w) => ({
    ...w,
    regions: [...new Set(counted.filter((l) => l.world === w.id).map((l) => l.region))],
    bosses: bundle.bosses.filter((b) => b.world === w.id),
  }));
  const levels = [...new Set(DECOR.map((d) => d.level))];
  const missing = missingArt(bundle);
  const open = $derived(openWorlds(bundle, game.progress));
  let done = $state("");
  let confirmReset = $state(false);

  function run(label: string, change: Parameters<typeof update>[0]): void {
    update(change);
    done = label;
  }
</script>

<Screen title="Cheat mode" wide>
  <p class="warn">
    For testing only: this screen is in development builds, and in a production build made with
    <code>VITE_CHEAT=1</code>.
  </p>
  <p>
    Level {levelFor(game.progress.xp)} · {game.progress.xp} XP ·
    {Object.keys(game.progress.lessons).filter((id) => counted.some((l) => l.id === id)).length} of
    {counted.length} lessons passed · open: {WORLDS.filter((w) => open.includes(w.id))
      .map((w) => w.name)
      .join(", ")}
  </p>

  <section aria-labelledby="tour-h">
    <h2 id="tour-h">Tour</h2>
    <div class="row">
      <button type="button" onclick={restartTour}>Restart the tour</button>
    </div>
  </section>

  <section aria-labelledby="all-h">
    <h2 id="all-h">Everything</h2>
    <div class="row">
      <button
        type="button"
        class="primary"
        onclick={() =>
          run("Everything done: every lesson, every boss on hard mode, top level.", (p) =>
            finishEverything(bundle, p, day),
          )}>Finish everything</button
      >
      <button type="button" onclick={() => run("All lessons passed.", (p) => passLessons(bundle, p, day))}
        >Pass every lesson</button
      >
      <button type="button" onclick={() => run("Every boss beaten.", (p) => beatBosses(bundle, p, day))}
        >Beat every boss</button
      >
      <button
        type="button"
        onclick={() => run("Every boss beaten, hard mode too.", (p) => beatBosses(bundle, p, day, true))}
        >Beat every boss on hard mode</button
      >
    </div>
  </section>

  <section aria-labelledby="worlds-h">
    <h2 id="worlds-h">Roads</h2>
    <div class="row">
      {#each WORLDS.filter((w) => w.key) as w (w.id)}
        {@const ready = bundle.bosses.some((b) => b.id === w.key?.bossId)}
        <button
          type="button"
          disabled={!ready || open.includes(w.id)}
          onclick={() => run(`${w.name} is open.`, (p) => openWorld(bundle, p, day, w.id) ?? p)}
        >
          Open {w.name.replace("The ", "the ")}{ready
            ? ""
            : " (its key boss is not written yet)"}{open.includes(w.id) ? " (open)" : ""}
        </button>
      {/each}
    </div>
  </section>

  {#each worlds as w (w.id)}
    <section aria-labelledby="world-{w.id}">
      <h2 id="world-{w.id}">{w.name}</h2>
      <div class="row">
        <button
          type="button"
          class="primary"
          onclick={() =>
            run(`${w.name}: every lesson passed.`, (p) =>
              passLessons(bundle, p, day, (l) => l.world === w.id),
            )}>Pass all its lessons</button
        >
        <button
          type="button"
          onclick={() =>
            run(`${w.name}: reset, ready to test out again.`, (p) => resetWorld(bundle, p, w.id))}
          >Reset this world</button
        >
        {#each w.regions as r (r)}
          <button
            type="button"
            onclick={() =>
              run(`${regionName(w.id, r)} passed.`, (p) =>
                passLessons(bundle, p, day, (l) => l.world === w.id && l.region === r),
              )}
          >
            Pass {regionName(w.id, r)}
          </button>
        {/each}
      </div>
      {#if w.bosses.length > 0}
        <div class="row">
          {#each w.bosses as b (b.id)}
            <button
              type="button"
              onclick={() =>
                run(`${b.title} beaten.`, (p) => beatBosses(bundle, p, day, false, (x) => x.id === b.id))}
              >Beat {b.title}</button
            >
            <button
              type="button"
              onclick={() =>
                run(`${b.title} beaten on hard mode.`, (p) =>
                  beatBosses(bundle, p, day, true, (x) => x.id === b.id),
                )}>Hard mode too</button
            >
          {/each}
        </div>
      {/if}
    </section>
  {/each}

  <section aria-labelledby="garden-h">
    <h2 id="garden-h">Garden</h2>
    <div class="row">
      <button type="button" onclick={() => run("Every plant is due today.", (p) => plantsDue(p, day, 0))}
        >Make every plant due</button
      >
      <button type="button" onclick={() => run("Every plant is wilting.", (p) => plantsDue(p, day, 3))}
        >Make every plant wilt</button
      >
    </div>
  </section>

  <section aria-labelledby="level-h">
    <h2 id="level-h">Level (village decorations)</h2>
    <div class="row">
      {#each levels as level (level)}
        <button
          type="button"
          class:primary={level === TOP_LEVEL}
          onclick={() => run(`Level ${level} reached.`, (p) => reachLevel(p, level))}
        >
          Reach level {level}{level === TOP_LEVEL ? " (top)" : ""}
        </button>
      {/each}
    </div>
  </section>

  <section aria-labelledby="time-h">
    <h2 id="time-h">Time of day (now: {clock.time}{clock.forced ? ", forced" : ""})</h2>
    <div class="row">
      {#each ["dawn", "day", "dusk", "night"] as const as t (t)}
        <button type="button" aria-pressed={clock.forced === t} onclick={() => forceTime(t)}>{t}</button>
      {/each}
      <button type="button" onclick={() => forceTime(null)}>Follow the real clock</button>
    </div>
    <div class="row">
      {#each ["spring", "summer", "autumn", "winter"] as const as season (season)}
        <button
          type="button"
          aria-pressed={forcedSeason.season === season}
          onclick={() => forceSeason(season)}>{season}</button
        >
      {/each}
      <button type="button" onclick={() => forceSeason(null)}>Follow the real date</button>
    </div>
  </section>

  <section aria-labelledby="shore-h">
    <h2 id="shore-h">Shore story (now: {forcedShoreStage.stage ?? "from the bosses"})</h2>
    <p>World 4 has no bosses yet: force a stage to preview the boat, the lairs and the lighthouse beam.</p>
    <div class="row">
      {#each [0, 1, 2, 3] as stage (stage)}
        <button
          type="button"
          aria-pressed={forcedShoreStage.stage === stage}
          onclick={() => forceShoreStage(stage)}>Stage {stage}</button
        >
      {/each}
      <button type="button" onclick={() => forceShoreStage(null)}>Follow the bosses</button>
    </div>
    <p>The beach grows with levels above today's cap. Preview each step (your real level stays the same):</p>
    <div class="row">
      {#each Object.entries(SHORE_LEVELS).sort((a, b) => a[1] - b[1]) as [what, level] (what)}
        <button
          type="button"
          aria-pressed={previewBeach.level === level}
          onclick={() => previewBeachLevel(level)}>{level}: {what}</button
        >
      {/each}
      <button type="button" onclick={() => previewBeachLevel(null)}>Real level</button>
    </div>
    <p>The shore stays under fog until World 4 has content. Lift it to walk there.</p>
    <div class="row">
      <button type="button" aria-pressed={liftedFog.on} onclick={() => liftFog(!liftedFog.on)}
        >{liftedFog.on ? "Bring the fog back" : "Lift the fog over the shore"}</button
      >
    </div>
  </section>

  <section aria-labelledby="art-h">
    <h2 id="art-h">Still on placeholder art</h2>
    {#if missing.length === 0}
      <p>Every trophy, item and teacher has its own sprite.</p>
    {:else}
      <p>These show a star, a sprout or a hooded traveller until someone draws them:</p>
      <ul>
        {#each missing as m (m)}<li>{m}</li>{/each}
      </ul>
    {/if}
  </section>

  <section aria-labelledby="reset-h">
    <h2 id="reset-h">Start over</h2>
    {#if confirmReset}
      <p>This wipes all progress in this browser.</p>
      <div class="row">
        <button
          type="button"
          class="primary"
          onclick={() => {
            run("Progress reset.", () => emptyProgress());
            confirmReset = false;
          }}>Yes, reset everything</button
        >
        <button type="button" onclick={() => (confirmReset = false)}>Cancel</button>
      </div>
    {:else}
      <button type="button" onclick={() => (confirmReset = true)}>Reset all progress</button>
    {/if}
  </section>

  <p class="done" aria-live="polite">{done}</p>
</Screen>

<style>
  section {
    margin-top: 16px;
    padding: 12px 16px;
    background: var(--panel);
    box-shadow: var(--frame);
  }
  h2 {
    margin: 0 0 10px;
    font-size: 18px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .row + .row {
    margin-top: 8px;
  }
  .warn {
    color: var(--bad);
  }
  .done {
    color: var(--good);
    font-weight: 700;
    min-height: 1.6em;
  }
  button[aria-pressed="true"] {
    background: var(--btn);
    color: var(--btn-ink);
  }
</style>
