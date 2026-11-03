# Progress: Track B (branch `report-button`)

Newest entries at the top of each section.

## Done
- B.3 (2026-11-03, done locally by the supervisor): merged `test-framework` (at `c98cc48`) into
  `report-button` with the owner's go. `src/learning/autoReport.ts`: `shouldAutoReport` is true when every
  hidden result passed and a visible test failed, false without hidden results, on an error, or on a full
  pass; `claimAutoReport` allows one report per item per page session; the message is the first failing
  visible test's name and message. `TaskPanel` sends `{kind: "auto", item, code, message}` through
  `sendReport` after Check. Tests: `src/learning/autoReport.test.ts` (6) and one in `TaskPanel.test.ts`
  (reported once, second Check sends nothing). The merge needed `cases: []` in the `LessonView.test.ts`
  task, since Session 2 made `cases` required.
- Review (2026-11-03): a fresh reviewer subagent read the B.1 and B.2 diff against the standards and the
  spec and found no must-fix defects. Fixed in `5a67f7e`: focus on open, cancel and send; a status line that
  stays mounted; Cancel disabled while sending; a retry for a Turnstile load failure; copy that asks for no
  personal details and does not mention code on lesson reports; a raw body cap with room for JSON escaping.
  New tests pin the retry token, focus, the next day cap reset and Turnstile failures sparing IP slots.
- B.2 (2026-11-03): `src/ui/ReportButton.svelte` on every task panel (through `CodePanel`'s `reportItem`)
  and in every lesson footer, the exact notice line under the task editor, the footer line
  `Written for Python 3.12 and newer.`, `sendReport()` in `src/net/api.ts`. Tests: `ReportButton.test.ts`,
  `LessonView.test.ts`, two in `TaskPanel.test.ts`, one in `api.test.ts`.
- B.1 (2026-11-03): `POST /api/report`, migration `0003_reports.sql`, `worker/src/github.ts`, new limits,
  `Deps.openIssue`. 14 tests in `worker/test/report.test.ts`, including every name the plan lists.

## Decisions
- Review nit 9 not taken: `LIMITS.maxReportMessageChars` stays, so every worker limit reads from `LIMITS`.
- `worker/vitest.config.ts` binds a fake `GITHUB_ISSUES_TOKEN`, so tests open issues by default; the no token
  test overrides it with an empty string.
- The lesson footer test renders the narrow layout only; the wide layout renders the same `notebook` snippet.
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
- Push and pull request blocked. The session started from an uploaded bundle with no remote. After
  `git remote add origin`, the push gets 403 from the git proxy ("not in this session's authorized repository
  set"), and the REST call for the pull request gets 403 too. Every Track B commit exists only in this
  container, and CI has not run. The supervisor said not to retry; waiting for instructions.
- Dedupe is by item and code hash, as the spec says. A second report with the same code but a new message
  (common for lesson reports, which send empty code) only raises the count; its message stays in D1, not on
  the issue. Upgrade: comment the new message on the existing issue.
- `src/village/terrainCache.test.ts` fails in this container (`object.stream is not a function`, jsdom without
  `Blob.stream`) with and without this branch's changes. Not caused here; CI may differ.
- `worker/test/tsconfig.json` already had about 100 lines of type errors (test deps missing `waitUntil`); no
  script runs it. The new `openIssue` field adds to the same errors.
- The owner sets `GITHUB_ISSUES_TOKEN` with wrangler before deploying. Until then reports are stored only.

## Next
- Push and open the draft pull request once the repo is in the session's sources.
- B.3 waits until Session 2 lands on `test-framework`.
