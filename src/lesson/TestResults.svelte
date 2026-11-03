<script lang="ts">
  import type { Outcome } from "../runner/client";
  import { TIMEOUT_MESSAGE } from "../runner/client";
  import type { CheckResult } from "../runner/protocol";
  import LoadFailed from "./LoadFailed.svelte";

  let { outcome }: { outcome: Outcome<CheckResult> | null } = $props();
  const all = $derived(outcome?.kind === "ok" ? outcome.result.results : []);
  const results = $derived(all.filter((r) => !r.hidden));
  // the hidden cases come back as one result, shown on its own line under the counted tests
  const hidden = $derived(all.find((r) => r.hidden));
  const nPassed = $derived(results.filter((r) => r.passed).length);
</script>

<div class="results" aria-live="polite">
  {#if outcome?.kind === "timeout"}
    <p class="bad">{TIMEOUT_MESSAGE}</p>
  {:else if outcome?.kind === "unavailable"}
    <LoadFailed message={outcome.message} />
  {:else if outcome?.kind === "ok" && outcome.result.error}
    <pre class="bad">{outcome.result.error}</pre>
  {:else if outcome?.kind === "ok"}
    <p class:good={nPassed === results.length}>{nPassed} of {results.length} tests passed</p>
    <ul>
      {#each results as r (r.name)}
        <li class:good={r.passed}>
          <span class="stamp px {r.passed ? 'ok' : 'no'}" aria-hidden="true">{r.passed ? "✓" : "✗"}</span>
          {r.name}{#if !r.passed}: <span class="msg">{r.message}</span>{/if}
        </li>
      {/each}
    </ul>
    {#if hidden}
      <p class="hidden-case" class:good={hidden.passed}>
        <span class="stamp px {hidden.passed ? 'ok' : 'no'}" aria-hidden="true"
          >{hidden.passed ? "✓" : "✗"}</span
        >
        {#if hidden.passed}Also passed {hidden.name}{:else}<span class="msg">{hidden.message}</span>{/if}
      </p>
    {/if}
  {/if}
</div>

<style>
  .results {
    margin-top: 10px;
    font-size: 15px;
  }
  .good {
    color: var(--good);
  }
  .bad,
  li:not(.good),
  .hidden-case:not(.good) {
    color: var(--bad);
  }
  pre {
    white-space: pre-wrap;
    font-family: var(--font-mono);
    font-size: 14px;
    margin: 0;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 6px 0 0;
    display: grid;
    gap: 6px;
  }
  li,
  .hidden-case {
    display: flex;
    gap: 8px;
    align-items: baseline;
    flex-wrap: wrap;
  }
  .hidden-case {
    margin: 6px 0 0;
  }
  .msg {
    font-family: var(--font-mono);
    font-size: 14px;
  }
</style>
