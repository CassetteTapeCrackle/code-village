<script lang="ts">
  import Screen from "../ui/Screen.svelte";
  import { ICONS } from "../art/sprites";
  import { bundle } from "../content/bundle";
  import { regionName } from "../content/regions";
  import { bossOpen } from "../learning/access";
  import { bossState } from "../learning/boss";
  import { lessonTasks } from "../learning/progress";
  import { regionToOpen, teacherFor, teacherGreeting } from "../learning/school";
  import { game } from "../store/progress.svelte";
  import { lairName } from "../village/layout";
  import Dialog from "../ui/Dialog.svelte";
  import SpriteCanvas from "../ui/SpriteCanvas.svelte";
  import Blocked from "../ui/Blocked.svelte";
  import { WORLDS, openWorlds, worldById } from "../worlds/registry";

  // One lessons board for every world: the schoolhouse (World 1), the ranger's cabin, the observatory.
  // The teacher speaks, one card says what to do now, and each region is a fold of one-line lesson rows.
  let { world = "w1" }: { world?: string } = $props();
  const open = $derived(openWorlds(bundle, game.progress));
  const here = $derived(worldById(world));
  const regionKey = (x: { world: string; region: string }): string => `${x.world}/${x.region}`;
  const regions = $derived([...new Set(bundle.lessons.filter((l) => l.world === world).map(regionKey))]);
  const greeting = $derived(teacherGreeting(bundle, game.progress, world));
  const hrefFor = (id: string): string => (id === "w1" ? "#/school" : `#/school/${id}`);
  const next = $derived(
    greeting.lessonId ? bundle.lessons.find((l) => l.id === greeting.lessonId) : undefined,
  );
  const nextLeft = $derived(
    next ? lessonTasks(next).filter((t) => !game.progress.tasks[t.id]?.passedAt).length : 0,
  );
  // Only one region starts unfolded: where you are now. The others are one line each until opened.
  // svelte-ignore state_referenced_locally (the board remounts per world, so reading it once is right)
  let unfolded: string | null = $state(regionToOpen(bundle, game.progress, world));
</script>

{#if !here || !open.includes(world)}
  <Blocked {world} />
{:else}
  <Screen title={here.building.name} here="school">
    {#if open.length > 1}
      <nav class="worlds" aria-label="Worlds">
        {#each WORLDS.filter((w) => open.includes(w.id)) as w (w.id)}
          <a
            class="tag"
            class:good={w.id === world}
            href={hrefFor(w.id)}
            aria-current={w.id === world ? "page" : undefined}>{w.building.name}</a
          >
        {/each}
      </nav>
    {/if}
    {#if regions.length > 0}
      <Dialog who={teacherFor(world).name} portrait={teacherFor(world).portrait} line={greeting.line} />
      {#if next}
        <a class="lead px" href="#/lesson/{next.id}">
          <SpriteCanvas grid={ICONS.book} scale={5} />
          <span
            ><small>{nextLeft < lessonTasks(next).length ? "Continue" : "Up next"}</small><b>{next.title}</b>
            · {nextLeft}
            {nextLeft === 1 ? "task" : "tasks"} left</span
          >
          <span class="arrow" aria-hidden="true">&gt;</span>
        </a>
      {/if}
    {:else}
      <div class="soon paper px">
        <h2>Lessons arrive soon</h2>
        <p>
          The {here.building.name.toLowerCase()} is open, but its lessons are still being written. Come back after
          the next update.
        </p>
      </div>
    {/if}
    <div class="regions">
      {#each regions as key (key)}
        {@const [world, region] = key.split("/")}
        {@const lessons = bundle.lessons.filter((l) => regionKey(l) === key)}
        {@const passed = lessons.filter((l) => game.progress.lessons[l.id]).length}
        {@const bosses = bundle.bosses.filter((b) => regionKey(b) === key)}
        {@const awake = bosses.some(
          (b) => bossOpen(bundle, game.progress, b) && !bossState(game.progress, b.id).wonAt,
        )}
        {@const beaten = bosses.length > 0 && bosses.every((b) => bossState(game.progress, b.id).wonAt)}
        <section aria-labelledby="r-{region}">
          <h2 class="fold-h">
            <button
              type="button"
              class="fold"
              id="r-{region}"
              aria-expanded={unfolded === region}
              onclick={() => (unfolded = unfolded === region ? null : region)}
            >
              {regionName(world, region)}
              <span class="meta"
                >{passed} of {lessons.length}{#if beaten}<span class="tag good">beaten</span
                  >{:else if awake}<span class="tag warn">awake</span>{/if}</span
              >
            </button>
          </h2>
          {#if unfolded === region}
            <ul class="rows">
              {#each lessons as l (l.id)}
                {@const tasks = lessonTasks(l)}
                {@const done = tasks.filter((t) => game.progress.tasks[t.id]?.passedAt).length}
                {@const state = game.progress.lessons[l.id]
                  ? "done"
                  : l.id === greeting.lessonId
                    ? "now"
                    : ""}
                <li>
                  <a class="row {state} px" href="#/lesson/{l.id}">
                    <span class="n">{String(l.order).padStart(2, "0")}</span>
                    <span class="name"
                      >{l.title}{#if state === "now"}<small>you are here</small>{/if}</span
                    >
                    <span class="pips" aria-label="{done} of {tasks.length} tasks passed"
                      >{#each tasks as t (t.id)}<i class:on={game.progress.tasks[t.id]?.passedAt}
                        ></i>{/each}</span
                    >
                  </a>
                </li>
              {/each}
              {#each bosses as b (b.id)}
                {@const isOpen = bossOpen(bundle, game.progress, b)}
                {@const won = bossState(game.progress, b.id).wonAt}
                <li>
                  {#if isOpen}
                    <a class="gate px" class:awake={!won} href="#/boss/{b.id}">
                      <SpriteCanvas grid={ICONS.star} scale={3} />
                      <span
                        ><b>{b.title}</b><small
                          >the {lairName(b.world, b.region)} · {won
                            ? "beaten"
                            : `awake: ${b.stages.length} stages`}</small
                        ></span
                      >
                      <span class="tag {won ? 'good' : 'warn'}">{won ? "beaten" : "face it"}</span>
                    </a>
                  {:else}
                    <div class="gate px">
                      <SpriteCanvas grid={ICONS.star} scale={3} />
                      <span
                        ><b>{b.title}</b><small
                          >the {lairName(b.world, b.region)} · wakes when all {lessons.length} pass</small
                        ></span
                      >
                      <span class="tag sleep">asleep</span>
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      {/each}
    </div>
  </Screen>
{/if}

<style>
  .worlds {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }
  .worlds a {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    text-decoration: none;
    color: var(--text);
  }
  .soon {
    padding: 16px 20px;
  }
  .soon h2 {
    margin: 0 0 6px;
    font-size: 22px;
  }
  .soon p {
    margin: 0;
  }
  .regions {
    margin-top: 18px;
  }
  .fold-h {
    margin: 0;
    font-size: inherit;
  }
</style>
