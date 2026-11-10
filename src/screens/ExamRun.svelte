<script lang="ts">
  import { untrack } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { bundle, conceptName } from "../content/bundle";
  import type { Exercise } from "../content/types";
  import { examResult, finishExam, formatLeft } from "../learning/exam";
  import { XP } from "../learning/xp";
  import CodePanel from "../lesson/CodePanel.svelte";
  import TestResults from "../lesson/TestResults.svelte";
  import { passedAll, type Outcome } from "../runner/client";
  import type { CheckResult } from "../runner/protocol";
  import { getRunner } from "../runner/shared";
  import { update } from "../store/progress.svelte";

  let { exam, minutes, onend }: { exam: Exercise[]; minutes: number; onend: () => void } = $props();
  const passed = new SvelteSet<string>();
  let outcomes: Record<string, Outcome<CheckResult>> = $state({});
  let finished = $state(false);
  const deadline = untrack(() => (minutes > 0 ? Date.now() + minutes * 60_000 : null));
  let now = $state(Date.now());
  const scores = $derived(examResult(bundle, exam, passed));

  $effect(() => {
    if (deadline === null || finished) return;
    const tick = setInterval(() => {
      now = Date.now();
      if (now >= deadline) finish();
    }, 1000);
    return () => clearInterval(tick);
  });

  async function check(e: Exercise, code: string): Promise<void> {
    const o = await getRunner().check(code, e);
    outcomes[e.id] = o;
    if (passedAll(o)) passed.add(e.id);
    else passed.delete(e.id);
  }

  function finish(): void {
    if (finished) return;
    finished = true;
    update(finishExam);
  }
</script>

{#if finished}
  <h2>Result: {scores.filter((s) => s.passed).length} of {scores.length} concepts solid</h2>
  <ul class="scores">
    {#each scores as s (s.concept)}
      <li class:good={s.passed}>
        {conceptName(bundle, s.concept)}: {s.passed ? "solid" : "needs work"}{#if !s.passed && s.lessonId}
          · <a href="#/lesson/{s.lessonId}">back to the lesson</a>{/if}
      </li>
    {/each}
  </ul>
  <p>+{XP.mockExam} XP</p>
  <button type="button" onclick={onend}>Back to the library</button>
{:else}
  {#if deadline !== null}
    <p class="timer" role="timer" aria-live="off">Time left: {formatLeft(deadline - now)}</p>
  {/if}
  {#each exam as e, i (e.id)}
    <CodePanel
      id="exam-{e.id}"
      title="{i + 1}. {e.title}"
      prompt={e.prompt}
      starter={e.starter}
      oncheck={(code) => check(e, code)}
    >
      <TestResults outcome={outcomes[e.id] ?? null} />
    </CodePanel>
  {/each}
  <button type="button" class="primary" onclick={finish}>Finish the exam</button>
{/if}

<style>
  .timer {
    position: sticky;
    top: 0;
    padding: 8px 0;
    background: var(--bg);
    font-weight: 700;
  }
  .scores li {
    color: var(--bad);
  }
  .scores li.good {
    color: var(--good);
  }
</style>
