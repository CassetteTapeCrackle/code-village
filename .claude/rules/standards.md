# Working standards

These are the owner's rules. Hooks in `.claude/hooks/` enforce the mechanical ones; a hook denial means
stop and fix, never work around it.

## Prose without dashes
- No em dash or en dash anywhere a person reads it: replies, commit messages, PR text, issue text, docs,
  comments, learner-facing copy. Code and data that require the character are the only exception.
- Do not swap the dash for a comma and keep the same sentence shape. Split into two sentences, use a colon
  when the second half delivers what the first promises, use parentheses for a real aside, or cut the aside.
- A standalone label is not a sentence: `Name - role` keeps a plain hyphen.

## Plans are plans
- Do only the Session you were given in `docs/test-framework/PLAN.md`. Do not start the next Session.
- When the plan and the code disagree, or a step is impossible as written, record it in `PROGRESS.md` under
  Open with the reason, pick the smallest choice that keeps the spec's intent, and say so. Never silently
  change the design.

## Never merge
- Never merge into `dev` or `main`, never push to them, never force-push, never delete a branch, never
  merge a pull request. The owner merges. Work only on your session's branch.

## Commits in a cloud session
- Commit every sub-step that passes its own check, so an interrupted session loses little. Small commits
  with plain messages that say what changed and why.
- Push at every task boundary and before the session ends.
- Never commit a secret, a `.env` file, or generated output listed in `.gitignore`.

## Tests run in the VM and on CI
- Before each commit: the quick gate (`pnpm lint`, `pnpm typecheck`, `pnpm test:py`, plus the files' own
  tests). Before each push: the full unit suites (`pnpm test`, `pnpm test:worker`).
- Playwright runs on GitHub CI only. Read results with `gh api` (REST); `gh pr` and `gh issue` do not work in
  cloud sessions.
- A failing test is reported with its output. Never claim a pass you did not see.

## Smallest complete change
- Solve the whole task with the least new code. Reuse what the codebase has before writing anything new.
- No abstraction, option, wrapper or "for later" code nobody asked for. Finish every caller, test and fixture
  your change touches.
- New non-trivial logic leaves at least one test. A known limit gets a comment:
  `shortcut: <the limit>, <when to upgrade>`.
- Never cut validation at trust boundaries, error handling that prevents data loss, security, or
  accessibility.

## Clean code
- Use the `clean-code-core` skill always, with `clean-code-ts` for TypeScript and Svelte and
  `clean-code-python` for Python. Use `test-quality` when writing tests and `self-review` before calling a
  task done.
- Greppable distinctive names, one responsibility per unit, early returns, explicit types at boundaries.
- TypeScript: strict, no `any`, named exports, ESLint and Prettier fixed, never disabled.
- Python: type hints everywhere, mypy strict, ruff clean.

## Comments
- Comment only the why the code cannot show, in one line. No comments that restate the code, no commented
  out code, no `TODO` without a reason and a place it is tracked.
