<script lang="ts">
  import ExampleBlock from "./ExampleBlock.svelte";

  let { code, output }: { code: string; output: string } = $props();
  let guess = $state("");
  let verdict: "right" | "wrong" | null = $state(null);
  const id = `predict-${Math.random().toString(36).slice(2)}`;

  function check(): void {
    // compare line by line, ignoring spaces at the ends of lines
    const tidy = (text: string): string =>
      text
        .trim()
        .split("\n")
        .map((l) => l.trimEnd())
        .join("\n");
    verdict = tidy(guess) === tidy(output) ? "right" : "wrong";
  }
</script>

<div class="predict">
  <pre>{code}</pre>
  <label for={id}>What does this print?</label>
  <textarea {id} rows="2" bind:value={guess}></textarea>
  <button type="button" onclick={check}>Check my guess</button>
  <p aria-live="polite">
    {#if verdict === "right"}Right.{:else if verdict === "wrong"}Not quite. It prints: <code
        >{output.trim()}</code
      >{/if}
  </p>
  {#if verdict}
    <p class="try">Now run it yourself, and change it to see what happens:</p>
    <ExampleBlock {code} output="" />
  {/if}
</div>

<style>
  .predict {
    margin: 20px 0;
    padding: 3px 3px 14px;
    background: var(--paper-2);
    box-shadow: inset 0 0 0 3px var(--outline);
  }
  .predict > :not(pre) {
    margin-left: 12px;
    margin-right: 12px;
  }
  .try {
    margin-bottom: 0;
    font-weight: 700;
  }
  pre {
    margin: 0 0 10px;
    padding: 10px 12px;
    background: var(--well);
    border-bottom: 2px dashed var(--paper-line);
    font-family: var(--font-mono);
    font-size: 14px;
  }
  label {
    display: block;
    font-weight: 700;
  }
  textarea {
    width: calc(100% - 24px);
    margin: 6px 0;
    box-shadow: inset 0 0 0 2px var(--paper-line);
    background: var(--well);
    color: var(--text);
    border: 0;
    font-family: var(--font-mono);
    font-size: 14px;
    padding: 8px;
  }
</style>
