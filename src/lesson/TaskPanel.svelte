<script lang="ts">
  import type { Lesson, Task } from "../content/types";
  import { today } from "../learning/dates";
  import { passTask, recordCheck, taskState, useHint } from "../learning/progress";
  import type { TaskEvent } from "../learning/school";
  import { taskXp } from "../learning/xp";
  import { passedAll, type Outcome } from "../runner/client";
  import type { CheckResult } from "../runner/protocol";
  import { getRunner } from "../runner/shared";
  import { moment } from "../ui/moments.svelte";
  import { game, update } from "../store/progress.svelte";
  import { setSnapshot } from "../store/sync.svelte";
  import { TOUR_TASK_ID } from "../tour/tour";
  import { tourEvent } from "../tour/tour.svelte";
  import type { Snapshot } from "../tutor/packet";
  import AskPanel from "./AskPanel.svelte";
  import CodePanel from "./CodePanel.svelte";
  import TestResults from "./TestResults.svelte";

  type Props = {
    lesson: Lesson;
    task: Task;
    variant?: "paper" | "slate";
    onresult?: (event: TaskEvent) => void;
  };
  let { lesson, task, variant = "paper", onresult }: Props = $props();
  const mine = $derived(taskState(game.progress, task.id));
  let checked: Outcome<CheckResult> | null = $state(null);

  function resultOf(outcome: Outcome<CheckResult> | null): CheckResult | null {
    return outcome && outcome.kind === "ok" ? outcome.result : null;
  }

  // what "Copy for my agent" sends: the saved draft and the last Check's results for this task
  const copySnapshot = $derived<Snapshot>({
    taskId: task.id,
    code: game.progress.drafts[task.id] ?? task.starter,
    check: resultOf(checked),
    checks: mine.checks,
    hints: mine.hintsUsed,
  });

  async function check(code: string): Promise<void> {
    update((p) => recordCheck(p, task.id));
    checked = await getRunner().check(code, task.tests);
    setSnapshot({
      taskId: task.id,
      code,
      check: checked.kind === "ok" ? checked.result : null,
      checks: mine.checks,
      hints: mine.hintsUsed,
    });
    const passed = passedAll(checked);
    if (passed) update((p) => passTask(p, lesson, task.id, today()));
    if (passed && task.id === TOUR_TASK_ID) tourEvent("check");
    onresult?.(passed ? "pass" : checked.kind === "ok" && !checked.result.error ? "fail" : "error");
    moment(passed ? "pass" : "fail");
  }

  function hint(): void {
    if (mine.hintsUsed < task.hints.length) update((p) => useHint(p, task.id));
  }
</script>

<CodePanel
  id={task.id}
  title={task.title}
  prompt={task.prompt}
  starter={task.starter}
  draftKey={task.id}
  passed={Boolean(mine.passedAt)}
  oncheck={check}
  {variant}
>
  {#if mine.hintsUsed < task.hints.length && !mine.passedAt}
    <button type="button" class="hint-button" onclick={hint}
      >Hint ({mine.hintsUsed}/{task.hints.length})</button
    >
  {/if}
  {#each task.hints.slice(0, mine.hintsUsed) as h, i (i)}
    <p class="hint">Hint {i + 1}: {h}</p>
  {/each}
  <TestResults outcome={checked} />
  {#if mine.passedAt}
    <p class="done">Passed. +{mine.xpEarned} XP</p>
  {:else if mine.hintsUsed > 0}
    <p class="worth">Worth {taskXp(mine.hintsUsed)} XP now</p>
  {/if}
  <AskPanel {lesson} {task} snapshot={copySnapshot} />
</CodePanel>

<style>
  .hint-button {
    margin-top: 8px;
  }
  .hint {
    margin: 8px 0 0;
    color: var(--soft);
  }
  .done {
    color: var(--good);
    font-weight: 700;
  }
  .worth {
    color: var(--dim);
    font-size: 14px;
  }
</style>
