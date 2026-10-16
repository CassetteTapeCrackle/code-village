import { runnerActivity } from "./activity.svelte";
import { createRunner, type Runner } from "./client";

// One Python for the whole app, started on first use so it loads while the learner reads.
let runner: Runner | null = null;
export function getRunner(): Runner {
  runner ??= createRunner({ onLoading: (packages) => (runnerActivity.loading = packages) });
  return runner;
}
