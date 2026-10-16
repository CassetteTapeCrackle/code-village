<script lang="ts">
  import LazyCodeEditor from "../lesson/LazyCodeEditor.svelte";
  import LoadFailed from "../lesson/LoadFailed.svelte";
  import { TIMEOUT_MESSAGE } from "../runner/client";
  import { busyLabel } from "../runner/activity.svelte";
  import { getRunner } from "../runner/shared";
  import Screen from "../ui/Screen.svelte";

  // A free notepad: write any Python, give input() some lines, and run it. The draft stays in this browser.
  const KEY = "code-village/sandbox";
  const START = 'name = input("Your name? ")\nprint(f"Hello, {name}!")\n';
  const read = (): string => {
    try {
      return localStorage.getItem(KEY) ?? START;
    } catch {
      return START;
    }
  };
  let code = $state(read());
  let inputs = $state("Mochi");
  let output = $state("");
  let error: string | null = $state(null);
  let unavailable: string | null = $state(null);
  let running = $state(false);
  let version = $state(0); // bumps to remount the editor after Clear

  function save(next: string): void {
    code = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // storage blocked: the draft just is not kept
    }
  }

  async function run(): Promise<void> {
    running = true;
    const outcome = await getRunner().run(code, inputs.split("\n"));
    running = false;
    unavailable = outcome.kind === "unavailable" ? outcome.message : null;
    if (outcome.kind === "ok") {
      output = outcome.result.stdout;
      error = outcome.result.error;
    } else if (outcome.kind === "timeout") {
      output = "";
      error = TIMEOUT_MESSAGE;
    }
  }

  function clear(): void {
    save("");
    output = "";
    error = null;
    version++;
  }
</script>

<Screen title="Sandbox" here="sandbox" wide>
  <p class="lede">A blank notepad for trying anything. Nothing here is graded.</p>
  <div class="desk">
    <div class="pad slatebox px">
      {#key version}<LazyCodeEditor value={code} label="Sandbox code" onchange={save} />{/key}
      <div class="row">
        <button type="button" class="primary" onclick={run} disabled={running}
          >{running ? busyLabel() : "Run"}</button
        >
        <button type="button" onclick={clear}>Clear</button>
      </div>
    </div>
    <div class="side">
      <label class="paper px">
        <span>Input lines (one per line, for <code>input()</code>)</span>
        <textarea rows="4" bind:value={inputs}></textarea>
      </label>
      <section class="paper px" aria-labelledby="out-h">
        <h2 id="out-h">Output</h2>
        <pre aria-live="polite">{output}{#if error}<span class="err">{error}</span>{/if}</pre>
      </section>
      {#if unavailable}<LoadFailed message={unavailable} />{/if}
    </div>
  </div>
</Screen>

<style>
  .lede {
    margin: 0 0 14px;
    color: var(--soft);
  }
  .desk {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 860px) {
    .desk {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .pad {
    padding: 12px;
  }
  .pad :global(.editor) {
    --editor-min: 380px;
  }
  .row {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }
  .side {
    display: grid;
    gap: 14px;
  }
  label.paper,
  section.paper {
    display: grid;
    gap: 6px;
    padding: 12px 14px;
  }
  label span {
    font: 600 15px var(--font-pixel);
  }
  textarea {
    width: 100%;
    padding: 8px 10px;
    border: 0;
    outline: none;
    resize: vertical;
    background: var(--paper-2);
    color: var(--text);
    box-shadow: inset 0 0 0 2px var(--outline);
    font-family: var(--font-mono);
    font-size: 14px;
  }
  textarea:focus-visible {
    box-shadow:
      inset 0 0 0 2px var(--outline),
      inset 0 0 0 4px var(--butter);
  }
  h2 {
    margin: 0;
    font-size: 18px;
  }
  pre {
    margin: 0;
    min-height: 8em;
    padding: 10px 12px;
    color: var(--code-text);
    background: var(--code-well);
    box-shadow: inset 0 0 0 2px var(--outline);
    font-family: var(--font-mono);
    font-size: 14px;
    white-space: pre-wrap;
  }
  .err {
    color: var(--slate-bad);
  }
</style>
