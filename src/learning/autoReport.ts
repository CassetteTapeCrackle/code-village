import type { CheckResult } from "../runner/protocol";

// Code that passes every hidden case but fails a visible test points at a wrong test, not a wrong answer.
// Without hidden cases nothing vouches for the code, so a task that declares none is never reported.
export function shouldAutoReport(result: CheckResult): boolean {
  if (result.error !== null) return false;
  const hidden = result.results.filter((r) => r.hidden);
  const visibleFailed = result.results.some((r) => !r.hidden && !r.passed);
  return hidden.length > 0 && hidden.every((r) => r.passed) && visibleFailed;
}

export function autoReportMessage(result: CheckResult): string {
  const failed = result.results.find((r) => !r.hidden && !r.passed);
  return failed ? `${failed.name}: ${failed.message}` : "";
}

const reported = new Set<string>();

// At most once per item per page session: a reload starts a new session.
export function claimAutoReport(item: string): boolean {
  if (reported.has(item)) return false;
  reported.add(item);
  return true;
}
