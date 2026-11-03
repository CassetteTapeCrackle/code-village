# Progress: Track B (branch `report-button`)

Newest entries at the top of each section.

## Done
- B.2 (2026-11-03): `src/ui/ReportButton.svelte` on every task panel (through `CodePanel`'s `reportItem`)
  and in every lesson footer, the exact notice line under the task editor, the footer line
  `Written for Python 3.12 and newer.`, `sendReport()` in `src/net/api.ts`. Tests: `ReportButton.test.ts`,
  `LessonView.test.ts`, two in `TaskPanel.test.ts`, one in `api.test.ts`.
- B.1 (2026-11-03): `POST /api/report`, migration `0003_reports.sql`, `worker/src/github.ts`, new limits,
  `Deps.openIssue`. 14 tests in `worker/test/report.test.ts`, including every name the plan lists.

## Decisions
- `report_issues` has a `day` column the plan does not list: the daily issue cap needs to count issues
  opened today, and a column is the smallest way.
- Item ids are checked against the bundle (lessons, tasks, variants, bosses, stages), so an issue title can
  never carry arbitrary text. Unknown items get 400.
- Learner code and message go in the issue body inside a fence longer than any backtick run they contain,
  so a report cannot mention people or render links.
- A failed GitHub call stores the report and links nothing, so the next duplicate tries again.
- The notice line and the report button show only where a caller passes `reportItem` (task panels today).
  Boss stages, exams and reviews also use `CodePanel`, but B.3 sends automatic reports from tasks only, and
  the notice must not promise something that does not happen there.
- `sendReport` adds `__BUILD_ID__` itself, so B.3 cannot forget it and Svelte files need no global.
- `MAX_REPORT_MESSAGE_CHARS` sits beside `MAX_CODE_CHARS` in `src/sync/events.ts`: the worker already imports
  that file, and `src/net/api.ts` uses `__BUILD_ID__`, which the worker build does not define.
- `worker-configuration.d.ts` got the `GITHUB_ISSUES_TOKEN: string` line by hand. Running `wrangler types` here
  dropped `TURNSTILE_SECRET` and `IP_SALT`, because the owner's `.dev.vars` is not in the container. The
  header hash is now stale; the owner can regenerate locally.

## Open
- Push and pull request blocked: this container has no `origin` remote, and `gh api` answers 403 "GitHub access
  to this repository is not enabled for this session". Commits `ac7b853` (B.1) and `f7b44cd` (B.2) exist only
  in this container. CI has not run.
- Dedupe is by item and code hash, as the spec says. A second report with the same code but a new message
  (common for lesson reports, which send empty code) only raises the count; its message stays in D1, not on
  the issue. Upgrade: comment the new message on the existing issue.
- `src/village/terrainCache.test.ts` fails in this container (`object.stream is not a function`, jsdom without
  `Blob.stream`) with and without this branch's changes. Not caused here; CI may differ.
- `worker/test/tsconfig.json` already had about 100 lines of type errors (test deps missing `waitUntil`); no
  script runs it. The new `openIssue` field adds to the same errors.
- The owner sets `GITHUB_ISSUES_TOKEN` with wrangler before deploying. Until then reports are stored only.

## Next
- Review of the B.1 and B.2 diff by a fresh subagent, then push once GitHub access works.
- B.3 waits until Session 2 lands on `test-framework`.
