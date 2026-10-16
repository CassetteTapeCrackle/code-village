<script lang="ts">
  import { untrack } from "svelte";
  import { busyLabel } from "../runner/activity.svelte";
  import { getRunner } from "../runner/shared";
  import { TIMEOUT_MESSAGE } from "../runner/client";
  import LazyCodeEditor from "./LazyCodeEditor.svelte";
  import LoadFailed from "./LoadFailed.svelte";

  let { code, output }: { code: string; output: string } = $props();
  let current = $state(untrack(() => code.trimEnd())); // the starting code; edits live here
  let shown = $state(untrack(() => output));
  let error: string | null = $state(null);
  let unavailable: string | null = $state(null);
  let running = $state(false);

  async function run(): Promise<void> {
    running = true;
    const outcome = await getRunner().run(current);
    running = false;
    unavailable = outcome.kind === "unavailable" ? outcome.message : null;
    if (outcome.kind === "ok") {
      shown = outcome.result.stdout;
      error = outcome.result.error;
    } else if (outcome.kind === "timeout") error = TIMEOUT_MESSAGE;
  }
</script>

<div class="example px">
  <LazyCodeEditor value={code.trimEnd()} label="Example code, editable" onchange={(c) => (current = c)} />
  <div class="foot">
    <pre class="out" aria-live="polite">{shown}{#if error}<span class="err">{error}</span>{/if}</pre>
    <button type="button" onclick={run} disabled={running}>{running ? busyLabel() : "Run"}</button>
  </div>
  {#if unavailable}<LoadFailed message={unavailable} />{/if}
</div>

<style>
  .example {
    margin: 20px 0;
    background: var(--paper-2);
    box-shadow: inset 0 0 0 3px var(--outline);
    padding: 3px;
  }
  .example :global(.editor) {
    --editor-min: 0;
  }
  .foot {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 8px 12px 10px;
    border-top: 2px dashed var(--paper-line);
  }
  .out {
    flex: 1;
    margin: 0;
    padding-top: 6px;
    min-height: 1.6em;
    color: var(--good);
    font-family: var(--font-mono);
    font-size: 14px;
    white-space: pre-wrap;
  }
  .err {
    color: var(--bad);
  }
</style>
