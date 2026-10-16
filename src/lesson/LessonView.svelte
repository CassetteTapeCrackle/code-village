<script lang="ts">
  import Screen from "../ui/Screen.svelte";
  import { onMount, untrack } from "svelte";
  import type { Lesson } from "../content/types";
  import { lessonTasks } from "../learning/progress";
  import { teacherFor, teacherLine, type TaskEvent } from "../learning/school";
  import { game } from "../store/progress.svelte";
  import Dialog from "../ui/Dialog.svelte";
  import ExampleBlock from "./ExampleBlock.svelte";
  import PredictBlock from "./PredictBlock.svelte";
  import SeedToast from "./SeedToast.svelte";
  import TaskPanel from "./TaskPanel.svelte";
  import TextBlock from "./TextBlock.svelte";
  import { alignToRuling } from "./ruling";

  let { lesson }: { lesson: Lesson } = $props();
  const tasks = $derived(lessonTasks(lesson));
  const isPassed = (id: string): boolean => Boolean(game.progress.tasks[id]?.passedAt);
  const nPassed = $derived(tasks.filter((t) => isPassed(t.id)).length);
  // The toast celebrates a pass that happens during this visit, not one from before.
  const passedOnArrival = untrack(() => Boolean(game.progress.lessons[lesson.id]));
  const justPassed = $derived(!passedOnArrival && Boolean(game.progress.lessons[lesson.id]));

  // Wide screens get the desk: notebook on the left, the selected task on a slate on the right.
  let wide = $state(false);
  onMount(() => {
    const query = matchMedia("(min-width: 1000px)");
    const sync = (): void => {
      wide = query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  });

  const firstOpen = (): string => (tasks.find((t) => !isPassed(t.id)) ?? tasks[0]).id;
  let selected = $state(firstOpen());
  const current = $derived(tasks.find((t) => t.id === selected) ?? tasks[0]);
  const nextOpen = $derived(tasks.find((t) => t.id !== selected && !isPassed(t.id)) ?? null);

  let event: TaskEvent = $state("start");
  function pick(id: string): void {
    selected = id;
    event = "start";
  }
  const line = $derived(teacherLine(lesson, nPassed, tasks.length, event, nextOpen?.title ?? null));
</script>

{#snippet notebook()}
  <div class="notebook" use:alignToRuling={28}>
    <div class="rings" aria-hidden="true">
      {#each [1, 2, 3, 4, 5, 6] as ring (ring)}<i></i>{/each}
    </div>
    {#each lesson.blocks as block, i (i)}
      {#if block.type === "text"}<TextBlock markdown={block.markdown} />
      {:else if block.type === "example"}<ExampleBlock code={block.code} output={block.output} />
      {:else if block.type === "predict"}<PredictBlock code={block.code} output={block.output} />
      {:else if wide}
        <button
          type="button"
          class="pin"
          class:on={block.task.id === selected}
          aria-label="Open task: {block.task.title}"
          aria-pressed={block.task.id === selected}
          onclick={() => pick(block.task.id)}
        >
          <span class="pin-mark">{isPassed(block.task.id) ? "✓" : "→"}</span>
          <span>Task: {block.task.title}</span>
          <span class="pin-where">{block.task.id === selected ? "on the slate" : "open"}</span>
        </button>
      {:else}
        <TaskPanel {lesson} task={block.task} variant="slate" onresult={(e) => (event = e)} />
      {/if}
    {/each}
    {#if justPassed && !wide}<SeedToast concepts={lesson.concepts} />{/if}
  </div>
  <aside class="remember paper px">
    <h2>Remember</h2>
    <ul>
      {#each lesson.remember as r (r)}<li>{r}</li>{/each}
    </ul>
  </aside>
{/snippet}

<Screen title={lesson.title} here="school" wide>
  {#snippet badges()}
    <span class="tag {nPassed === tasks.length ? 'good' : ''}">{nPassed} of {tasks.length} tasks passed</span>
    {#if game.progress.lessons[lesson.id]}<span class="tag good">{lesson.loot.name} found</span>{/if}
  {/snippet}

  {#if wide}
    <!-- an open book: the notebook on the left page, the slate on the right, each page scrolling on its own -->
    <div class="book">
      <div class="page left">{@render notebook()}</div>
      <div class="spine" aria-hidden="true"></div>
      <div class="page right">
        <Dialog who={teacherFor(lesson.world).name} portrait={teacherFor(lesson.world).portrait} {line} />
        <div class="task-tabs" role="group" aria-label="Tasks">
          {#each tasks as t, i (t.id)}
            <button
              type="button"
              class="task-tab px"
              aria-pressed={t.id === selected}
              aria-label="Task {i + 1}: {t.title}{isPassed(t.id) ? ', passed' : ''}"
              onclick={() => pick(t.id)}
            >
              {#if isPassed(t.id)}<span class="tick" aria-hidden="true">✓</span>{/if}{i + 1}
            </button>
          {/each}
        </div>
        {#key current.id}
          <TaskPanel {lesson} task={current} variant="slate" onresult={(e) => (event = e)} />
        {/key}
        {#if isPassed(current.id) && nextOpen}
          <button type="button" class="primary next" onclick={() => pick(nextOpen.id)}
            >Next task: {nextOpen.title}</button
          >
        {/if}
        {#if justPassed}<SeedToast concepts={lesson.concepts} />{/if}
      </div>
    </div>
  {:else}
    <Dialog who={teacherFor(lesson.world).name} portrait={teacherFor(lesson.world).portrait} {line} />
    {@render notebook()}
  {/if}
</Screen>

<style>
  /* the open book fills the board; each page scrolls on its own */
  .book {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) 14px minmax(0, 1fr);
    height: 100%;
    margin: -18px;
  }
  .page {
    min-height: 0;
    overflow-y: auto;
    padding: 18px;
    scrollbar-width: thin;
    scrollbar-color: var(--wood-2) transparent;
  }
  .page.right {
    background: color-mix(in srgb, var(--paper-2) 60%, var(--bg));
  }
  .page.right :global(.dialog) {
    margin-top: 0;
  }
  .spine {
    background: linear-gradient(90deg, var(--paper-line), var(--paper-2) 45%, var(--paper-line));
    box-shadow:
      inset 2px 0 0 var(--outline),
      inset -2px 0 0 var(--outline);
  }
  .task-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
  }
  .task-tab {
    --c: 2px;
    min-height: 34px;
    min-width: 44px;
    padding: 0 10px 2px;
    font-size: 15px;
  }
  .task-tab[aria-pressed="true"] {
    color: var(--ink-dark);
    background: var(--butter);
  }
  .tick {
    color: var(--good);
    margin-right: 4px;
  }
  .task-tab[aria-pressed="true"] .tick {
    color: var(--ink-dark);
  }
  .notebook {
    position: relative;
    padding: 22px 22px 22px 48px;
    line-height: 28px;
    color: var(--text);
    background-color: var(--paper);
    /* Each rule sits 3 px under a line's baseline (20 px down a 28 px line; 21 px for 19 px headings); the first line starts at the top padding. */
    background-image: repeating-linear-gradient(
      transparent 0 23px,
      var(--paper-line) 23px 24px,
      transparent 24px 28px
    );
    background-position-y: 22px;
    box-shadow: inset 0 0 0 4px var(--outline);
  }
  .notebook::before {
    content: "";
    position: absolute;
    left: 32px;
    top: 4px;
    bottom: 4px;
    width: 3px;
    background: var(--coral);
    opacity: 0.7;
  }
  .rings {
    position: absolute;
    left: 9px;
    top: 22px;
    bottom: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .rings i {
    width: 12px;
    height: 12px;
    background: var(--bg);
    box-shadow: inset 0 0 0 3px var(--outline);
  }
  .pin {
    width: 100%;
    justify-content: flex-start;
    margin: 4px 0 28px;
    background: var(--paper-2);
    text-align: left;
  }
  .pin.on {
    background: var(--butter);
    color: var(--ink-dark);
  }
  .pin-mark {
    font-size: 18px;
  }
  .pin-where {
    margin-left: auto;
    font-size: 14px;
    opacity: 0.8;
  }
  .next {
    width: 100%;
    margin-top: -8px;
  }
  .remember {
    margin-top: 28px;
    padding: 16px 20px 18px;
  }
  .remember h2 {
    margin: 0 0 4px;
    font-size: 22px;
  }
</style>
