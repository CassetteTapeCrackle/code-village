<script lang="ts">
  import { quietRunNote } from "./quietRun";
  import { untrack } from "svelte";
  import type { Snippet } from "svelte";
  import { saveDraft } from "../learning/progress";
  import { TIMEOUT_MESSAGE } from "../runner/client";
  import type { RunResult } from "../runner/protocol";
  import { busyLabel } from "../runner/activity.svelte";
  import { getRunner } from "../runner/shared";
  import { game, update } from "../store/progress.svelte";
  import { TOUR_TASK_ID } from "../tour/tour";
  import { tourEvent } from "../tour/tour.svelte";
  import LazyCodeEditor from "./LazyCodeEditor.svelte";
  import Markdown from "./Markdown.svelte";
  import LoadFailed from "./LoadFailed.svelte";
  import ReportButton from "../ui/ReportButton.svelte";

  type Props = {
    id: string;
    title: string;
    prompt: string;
    starter: string;
    draftKey?: string; // without one, the code is not saved: reviews and exams start fresh
    passed?: boolean;
    checkDisabled?: boolean;
    checkLabel?: string;
    oncheck: (code: string) => Promise<void>;
    children?: Snippet;
    variant?: "paper" | "slate";
    reportItem?: string; // with one, the panel offers Report a problem and says what Check may send
  };
  let {
    id,
    title,
    prompt,
    starter,
    draftKey,
    passed = false,
    checkDisabled = false,
    checkLabel = "Check",
    oncheck,
    children,
    variant = "paper",
    reportItem,
  }: Props = $props();
  let code = $state(untrack(() => (draftKey ? game.progress.drafts[draftKey] : undefined) ?? starter));
  let busy = $state(false);
  let ran: RunResult | null = $state(null);
  let inputs = $state("");
  const asksInput = $derived(code.includes("input("));
  let unavailable: string | null = $state(null);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  function edit(next: string): void {
    code = next;
    if (!draftKey) return;
    const key = draftKey;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => update((p) => saveDraft(p, key, code)), 500);
  }

  async function run(): Promise<void> {
    busy = true;
    const o = await getRunner().run(code, inputs === "" ? [] : inputs.split("\n"));
    busy = false;
    unavailable = o.kind === "unavailable" ? o.message : null;
    ran = o.kind === "ok" ? o.result : o.kind === "timeout" ? { stdout: "", error: TIMEOUT_MESSAGE } : null;
    if (id === TOUR_TASK_ID) tourEvent("run");
  }

  async function check(): Promise<void> {
    busy = true;
    try {
      await oncheck(code);
    } finally {
      busy = false;
    }
  }
</script>

<section class="panel px {variant}" class:passed aria-labelledby="h-{id}">
  <h2 id="h-{id}">{title}</h2>
  <div class="prompt"><Markdown text={prompt} /></div>
  <LazyCodeEditor value={code} label="Your code for {title}" onchange={edit} />
  {#if reportItem}
    <p class="sends">
      If Check looks wrong, we send your code anonymously so we can fix it and improve the site.
    </p>
  {/if}
  {#if asksInput}
    <label class="inputs">
      <span>Input lines for Run (one per line, for <code>input()</code>)</span>
      <textarea rows="2" bind:value={inputs}></textarea>
    </label>
  {/if}
  <div class="actions">
    <button type="button" data-tour="run" onclick={run} disabled={busy}>Run</button>
    <button type="button" class="primary" data-tour="check" onclick={check} disabled={busy || checkDisabled}
      >{busy ? busyLabel() : checkLabel}</button
    >
  </div>
  {#if unavailable}<LoadFailed message={unavailable} />{/if}
  {#if ran}
    <pre class="out" aria-live="polite">{ran.stdout}{#if ran.error}<span class="err">{ran.error}</span
        >{:else if ran.stdout === ""}<span class="quiet">{quietRunNote(code)}</span>{/if}</pre>
  {/if}
  {@render children?.()}
  {#if reportItem}<ReportButton item={reportItem} {code} />{/if}
</section>

<style>
  .panel {
    margin: 24px 0;
    padding: 18px 20px 20px;
  }
  .panel.paper {
    color: var(--text);
    background: var(--paper);
    box-shadow:
      inset 0 0 0 4px var(--outline),
      inset 0 -4px 0 4px var(--paper-line);
  }
  .panel.paper.passed {
    box-shadow:
      inset 0 0 0 4px var(--outline),
      inset 8px 0 0 4px var(--matcha);
  }
  /* The slate: a chalkboard in a wooden frame, dark in both palettes, so it borrows night-style code colours. */
  .panel.slate {
    --text: var(--chalk);
    --soft: var(--chalk);
    --dim: var(--slate-dim);
    --well: var(--code-well);
    --line: var(--slate-2);
    --panel-2: var(--slate-2);
    --good: var(--slate-good);
    --bad: var(--slate-bad);
    --link: var(--butter);
    --code-kw: var(--slate-kw);
    --code-fn: var(--slate-fn);
    --code-str: var(--slate-str);
    --code-num: var(--slate-num);
    --code-comment: var(--slate-comment);
    color: var(--chalk);
    background: var(--slate);
    padding: 22px 24px 24px;
    box-shadow:
      inset 0 0 0 4px var(--outline),
      inset 0 0 0 10px var(--wood),
      inset 0 0 0 12px var(--outline);
  }
  .panel.slate.passed {
    box-shadow:
      inset 0 0 0 4px var(--outline),
      inset 0 0 0 10px var(--matcha-2),
      inset 0 0 0 12px var(--outline);
  }
  .panel.slate h2 {
    color: var(--butter);
  }
  /* paper buttons keep dark ink on the dark slate */
  .panel.slate :global(button:not(.primary)) {
    color: var(--ink-dark);
    background: var(--slate-button);
  }
  h2 {
    margin: 0 0 6px;
    font-size: 21px;
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    flex-wrap: wrap;
  }
  .inputs {
    display: grid;
    gap: 4px;
    margin-top: 8px;
  }
  .inputs span {
    font: 600 15px var(--font-pixel);
  }
  .inputs textarea {
    padding: 8px 10px;
    border: 0;
    outline: none;
    resize: vertical;
    background: var(--well);
    color: var(--text);
    box-shadow: inset 0 0 0 2px var(--outline);
    font-family: var(--font-mono);
    font-size: 14px;
  }
  .inputs textarea:focus-visible {
    box-shadow:
      inset 0 0 0 2px var(--outline),
      inset 0 0 0 4px var(--butter);
  }
  .out {
    margin: 8px 0 0;
    padding: 10px;
    background: var(--panel-2);
    font-family: var(--font-mono);
    font-size: 14px;
    white-space: pre-wrap;
  }
  .sends {
    margin: 4px 0 0;
    color: var(--dim);
    font-size: 13px;
  }
  .quiet {
    white-space: normal;
    opacity: 0.8;
  }
  .err {
    color: var(--bad);
  }
</style>
