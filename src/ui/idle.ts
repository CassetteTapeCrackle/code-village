// Runs a task when the browser has nothing better to do, with a deadline so it always runs. requestIdleCallback
// is missing in Safari before 16.4 and in jsdom, where the deadline is the only schedule there is.
export function onIdle(task: () => void, timeoutMs = 2000): void {
  if (typeof requestIdleCallback === "function") requestIdleCallback(task, { timeout: timeoutMs });
  else setTimeout(task, timeoutMs);
}
