<script lang="ts">
  import { today } from "../learning/dates";
  import { STAGE_NAMES } from "../learning/plants";
  import { REVIEW_MAX_CHECKS, finishReview, reviewVerdict, type ReviewItem } from "../learning/review";
  import { XP } from "../learning/xp";
  import CodePanel from "../lesson/CodePanel.svelte";
  import TestResults from "../lesson/TestResults.svelte";
  import { passedAll, type Outcome } from "../runner/client";
  import type { CheckResult } from "../runner/protocol";
  import { getRunner } from "../runner/shared";
  import { moment } from "../ui/moments.svelte";
  import { game, update } from "../store/progress.svelte";

  let { items, onend }: { items: ReviewItem[]; onend: () => void } = $props();
  let index = $state(0);
  let checks = $state(0);
  let checked: Outcome<CheckResult> | null = $state(null);
  let verdict: "passed" | "failed" | null = $state(null);
  const item = $derived(items[index]);

  async function check(code: string): Promise<void> {
    checked = await getRunner().check(code, item.exercise.tests, item.exercise.strict);
    if (checked.kind === "unavailable") return; // Python not loading is not the learner's miss
    checks += 1;
    const v = reviewVerdict(checks, passedAll(checked));
    if (v !== "again") settle(v === "passed");
  }

  function settle(passed: boolean): void {
    const { concept, exercise } = item;
    verdict = passed ? "passed" : "failed";
    moment(passed ? "pass" : "fail");
    update((p) => finishReview(p, concept, exercise.id, passed, today()));
  }

  function next(): void {
    if (index + 1 >= items.length) return onend();
    index += 1;
    checks = 0;
    checked = null;
    verdict = null;
  }
</script>

<p class="count">Review {index + 1} of {items.length} · {item.concept}</p>
{#key index}
  <CodePanel
    id="review-{index}"
    title={item.exercise.title}
    prompt={item.exercise.prompt}
    starter={item.exercise.starter}
    checkDisabled={verdict !== null}
    checkLabel="Check ({REVIEW_MAX_CHECKS - checks} left)"
    oncheck={check}
  >
    <TestResults outcome={checked} />
    {#if verdict === "passed"}
      <p class="good">
        Well remembered. Your {item.concept} plant is now a {STAGE_NAMES[
          game.progress.plants[item.concept].stage
        ]}. +{XP.review} XP
      </p>
    {:else if verdict === "failed"}
      <p class="bad">This one slipped. The {item.concept} plant shrank a little and comes back tomorrow.</p>
    {:else}
      <button type="button" onclick={() => settle(false)}>I don't remember this</button>
    {/if}
    {#if verdict}
      <button type="button" class="primary" onclick={next}
        >{index + 1 < items.length ? "Next" : "Finish"}</button
      >
    {/if}
  </CodePanel>
{/key}

<style>
  .count {
    color: var(--soft);
  }
  .good {
    color: var(--good);
    font-weight: 700;
  }
  .bad {
    color: var(--bad);
  }
</style>
