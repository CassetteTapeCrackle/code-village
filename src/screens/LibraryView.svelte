<script lang="ts">
  import Screen from "../ui/Screen.svelte";
  import { bundle } from "../content/bundle";
  import type { Exercise } from "../content/types";
  import { buildExam, recap, worlds } from "../learning/exam";
  import { worldById } from "../worlds/registry";
  import { game } from "../store/progress.svelte";
  import ExamRun from "./ExamRun.svelte";

  // The library: the mock exam first (it is the thing to do here), then the recap, one fold per lesson,
  // with a search that opens the folds it matches and marks the words.
  const allWorlds = worlds(bundle);
  const nameOf = (id: string): string => worldById(id)?.name ?? id;
  let chosen: string[] = $state([...allWorlds]);
  let minutes = $state(0);
  let recapWorld = $state(allWorlds[0] ?? "");
  let exam: Exercise[] | null = $state(null);
  let query = $state("");
  let opened: string[] = $state([]);
  const TIMERS = [
    { value: 0, label: "No timer" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "60 minutes" },
  ];

  const needle = $derived(query.trim().toLowerCase());
  const pages = $derived(
    recap(bundle, recapWorld)
      .map((r) => ({
        ...r,
        lines:
          needle && !r.title.toLowerCase().includes(needle)
            ? r.remember.filter((l) => l.toLowerCase().includes(needle))
            : r.remember,
      }))
      .filter((r) => r.lines.length > 0),
  );
  // a line split around each match, so the matches can be marked without building HTML
  function pieces(line: string): { text: string; hit: boolean }[] {
    if (!needle) return [{ text: line, hit: false }];
    const out: { text: string; hit: boolean }[] = [];
    let at = 0;
    for (
      let i = line.toLowerCase().indexOf(needle);
      i >= 0;
      i = line.toLowerCase().indexOf(needle, i + needle.length)
    ) {
      if (i > at) out.push({ text: line.slice(at, i), hit: false });
      out.push({ text: line.slice(i, i + needle.length), hit: true });
      at = i + needle.length;
    }
    if (at < line.length) out.push({ text: line.slice(at), hit: false });
    return out;
  }
  const toggle = (id: string): void => {
    opened = opened.includes(id) ? opened.filter((o) => o !== id) : [...opened, id];
  };
</script>

<Screen title="Library" here="library">
  {#if exam}
    <ExamRun {exam} {minutes} onend={() => (exam = null)} />
  {:else}
    <section class="exam paper px" aria-labelledby="exam-heading">
      <div class="h">
        <h2 id="exam-heading">Mock exam</h2>
        <span class="meta">one exercise per concept, mixed order</span>
      </div>
      <fieldset>
        <legend>Worlds</legend>
        <div class="toggles">
          {#each allWorlds as w (w)}<label class="toggle px"
              ><input class="sr-only" type="checkbox" value={w} bind:group={chosen} /> {nameOf(w)}</label
            >{/each}
        </div>
      </fieldset>
      <fieldset>
        <legend>Timer</legend>
        <div class="toggles">
          {#each TIMERS as t (t.value)}<label class="toggle px"
              ><input class="sr-only" type="radio" name="timer" value={t.value} bind:group={minutes} />
              {t.label}</label
            >{/each}
        </div>
      </fieldset>
      <div class="go">
        <button
          type="button"
          class="primary"
          disabled={chosen.length === 0}
          onclick={() => (exam = buildExam(bundle, game.progress, chosen))}>Start the mock exam</button
        >
        <span class="meta">A little XP. It never changes your plants.</span>
      </div>
    </section>

    <section class="recap" aria-labelledby="recap-heading">
      <div class="h">
        <h2 id="recap-heading">Recap</h2>
        <span class="meta">what each lesson asked you to remember</span>
      </div>
      {#if allWorlds.length > 1}
        <fieldset>
          <legend class="sr-only">World</legend>
          <div class="toggles">
            {#each allWorlds as w (w)}<label class="toggle px"
                ><input class="sr-only" type="radio" name="recap-world" value={w} bind:group={recapWorld} />
                {nameOf(w)}</label
              >{/each}
          </div>
        </fieldset>
      {/if}
      <label class="search px"
        ><span class="sr-only">Search the recap</span><input
          type="search"
          bind:value={query}
          placeholder="Search: slice, None, loop..."
        /></label
      >
      {#each pages as r (r.lessonId)}
        {@const open = needle !== "" || opened.includes(r.lessonId)}
        <button type="button" class="fold" aria-expanded={open} onclick={() => toggle(r.lessonId)}>
          {r.title} <span class="meta">{r.lines.length} {r.lines.length === 1 ? "line" : "lines"}</span>
        </button>
        {#if open}
          <div class="page">
            <h3><a href="#/lesson/{r.lessonId}">Open the lesson</a></h3>
            <ul>
              {#each r.lines as line (line)}<li>
                  {#each pieces(line) as p, i (i)}{#if p.hit}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}
                </li>{/each}
            </ul>
          </div>
        {/if}
      {:else}
        <p class="meta none">Nothing matches "{query}".</p>
      {/each}
    </section>
  {/if}
</Screen>

<style>
  .exam {
    padding: 16px 20px 20px;
  }
  .recap {
    margin-top: 22px;
  }
  .h {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
    margin-bottom: 12px;
  }
  h2 {
    margin: 0;
    font-size: 22px;
  }
  .meta {
    color: var(--dim);
    font-size: 14px;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0 0 12px;
  }
  legend {
    padding: 0;
    margin-bottom: 6px;
    font: 600 12px var(--font-pixel);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .toggle {
    --c: 2px;
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 12px 2px;
    font: 600 14px var(--font-pixel);
    background: var(--paper);
    box-shadow: inset 0 0 0 2px var(--outline);
    cursor: pointer;
  }
  .toggle:has(input:checked) {
    color: var(--ink-dark);
    background: var(--matcha);
  }
  .toggle:has(input:focus-visible) {
    outline: 3px solid var(--link);
    outline-offset: 2px;
  }
  .go {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    align-items: center;
    margin-top: 4px;
  }
  .search {
    --c: 3px;
    display: flex;
    margin-bottom: 8px;
    background: var(--paper-2);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .search:focus-within {
    box-shadow:
      inset 0 0 0 2px var(--outline),
      inset 0 0 0 4px var(--butter);
  }
  .search input {
    flex: 1;
    min-height: 40px;
    padding: 0 12px;
    border: 0;
    outline: none;
    font: 15px var(--font-pixel);
    color: var(--text);
    background: transparent;
  }
  .none {
    padding: 12px 0;
  }
  mark {
    color: var(--ink-dark);
    background: var(--butter);
  }
  .page {
    margin: 0 0 12px;
    padding: 10px 14px 10px 30px;
    line-height: 28px;
    background-color: var(--paper);
    /* Each rule sits 3 px under a line's baseline (20 px down a 28 px line; 21 px for 19 px headings); the first line starts at the top padding. */
    background-image: repeating-linear-gradient(
      transparent 0 23px,
      var(--paper-line) 23px 24px,
      transparent 24px 28px
    );
    background-position-y: 10px;
    border-left: 3px solid var(--coral);
    box-shadow: inset 0 0 0 2px var(--paper-line);
  }
  .page h3 {
    margin: 0;
    font-size: 15px;
    line-height: 28px;
  }
  /* 32 px to tap, but laid out as one 28 px line so the ruling below stays in step. */
  .page h3 a {
    display: inline-block;
    min-height: 32px;
    padding-top: 2px;
    margin: -2px 0;
  }
  .page ul {
    margin: 0;
    padding-left: 18px;
  }
</style>
