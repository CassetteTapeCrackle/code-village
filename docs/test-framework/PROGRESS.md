# Progress

Each session reads this first and updates it last. Newest entries at the top of each section.

## Done
- Session 0 (2026-11-03, local): project rules, skills and hooks committed; `test-framework` and
  `report-button` branches created from it; spec and plan copied here.

## Decisions
- Session 0: `CLAUDE.md`, `AGENTS.md` and `docs/test-framework/` are force-added and `.git/info/exclude` is
  left alone, so the owner's other checkouts do not suddenly show them as untracked.
- Session 0: the repo guard (`.claude/hooks/guard.sh`) enforces the merge and push rules only in the cloud
  (`CLAUDE_CODE_REMOTE=true`, or no owner guard at `~/.claude/bin/guard.sh`). Locally the owner's own guard
  does the same job and keeps its "merge" override. The dash rule runs everywhere.
- Session 0: `pnpm install` and `pnpm content --if-changed` run in `.claude/hooks/session-start.sh`, not in
  the setup script. The cloud docs put project installs in a SessionStart hook, and typecheck fails without
  the generated `src/content/bundle.json`.
- Session 0: `secrets.sh` scans added lines and untracked files with `gitleaks stdin`, not
  `gitleaks git --staged`, because the hook runs before `git add -A && git commit` stages anything.
- Session 0: the `executing-plans` skill is not copied. It points at skills the cloud lacks; "How every cloud
  session runs" in `PLAN.md` replaces it.

## Open
- Session 0: on a cold uv cache, the first local `pnpm content` failed with two 30 s timeouts
  (`w3/c/knn-sklearn`, `w3/c/train-test` example blocks); the warm rerun passed in 75 s. The setup script
  warms the cache, but the framework should not let a cold machine flake a check (Session 4 owns timing).
- Session 0: ruff 0.17.0 reports 35 findings in `tools/` and `py/` today (FURB167, PLW1510, S102, and F821 in
  fixtures). The Stop hook lints only changed files, so Task 1.1 meets them as soon as it touches those files.

## Next
- Session 1 (cloud): Tasks 1.1 to 1.5 in `PLAN.md`. Track B runs in parallel on `report-button`.
