# Progress

Each session reads this first and updates it last. Newest entries at the top of each section.

## Done
- Session 1 (2026-11-03, cloud): Tasks 1.1 to 1.5, committed locally on `test-framework`. Not pushed: see
  Open. `pnpm lint:py` (ruff, vulture) and `pnpm typecheck:py` (mypy strict over `tools/vet`,
  `tools/content_check.py`, `py/`) pass; `pnpm test:py` runs 98 tests under a 90 percent coverage floor on
  `tools/vet` (92 percent today). The checks live in `tools/vet` (one module per rule group in
  `tools/vet/checks/`, 28 rule ids in `vet/rules.toml`), `vet/gaps.toml` is the empty gap list, and every
  rule has a canary in `tools/fixtures/canaries/`. `pnpm content` builds the same bundle as before
  (sha256 `b20b14a9...`) in 52 s instead of 95 s.
- Session 0 (2026-11-03, local): project rules, skills and hooks committed; `test-framework` and
  `report-button` branches created from it; spec and plan copied here.

## Decisions
- Session 1 review (fresh subagent on the session diff): fixed all eight findings. `--base` compares rule
  and item, not the fingerprint, so editing an item with a known gap does not count as a new gap.
  Fingerprints skip dot files (`.DS_Store`, swap files) that never reach CI. `file-unreadable`,
  `field-missing` and `field-invalid` can never be listed, because the bundle writer needs those fields.
  `pnpm gaps` runs the CLI under the content pins, checks the machine first, and only writes for
  `content/`. A broken linter no longer hides the other checks' findings. The job summary is written only
  for the real content. An unknown `--base` ref fails instead of passing. Tests cover the summary and the
  broken-tool path.
- Session 1: `LanguageAdapter` gains `run(codes) -> list[RunOutcome | None]`, which the plan's protocol
  lacks. Claims, examples and predicts run code without tests, and spec 23 names "run code and tests" as
  the adapter's first job.
- Session 1: Task 1.3 moved every check in one commit, not one per check. The old loader ran checks while
  it loaded, so a partial move meant rewriting each check twice. The proof is the same: identical bundle
  hash on the real content and the unchanged `test_content_check.py` assertions.
- Session 1: every finding's `item` is the label the old output used (task id, lesson path, `ids`,
  `concepts.toml`, `w1/world.toml`...), so `content_check.py` prints the same lines. Boss stage and hard
  mode findings carry the boss id and say the stage in the message.
- Session 1: fingerprints are the item's folder files plus its lesson text (tasks, variants), the boss
  folder (bosses), the file text (lessons, worlds, concepts, lint), and the message itself for findings that
  span files (`item-id-duplicate`, `world-order-duplicate`, concept counts), so those go stale once fixed.
- Session 1: Python and library version mismatches and a missing or broken ruff stay plain messages that
  always fail the build. They describe the machine, and no gap list should ever hold them, so they are not
  rules and need no canary.
- Session 1: `content_check.py` reads `vet/gaps.toml` only for the real `content/` folder unless `--gaps` is
  given. Fixture and canary runs would otherwise see every real gap as stale.
- Session 1: `PythonAdapter.run` remembers outcomes per code string, so the bundle shows the very run the
  checks judged and no example runs twice.
- Session 1: coverage follows subprocesses (`tools/coverage.ini`, `patch = subprocess`), because the
  `content_check.py` tests run the engine in a child process.
- Session 1: `Item` holds only the fields the current checks read. `right`, `decl` and `requires` arrive with
  the tasks that use them (3.4, 2.1, 5.3), per "no for-later code".
- Session 1: line length 120 for `tools/` and `py/` (Prettier uses 110 for TS); existing code fits it.
- Session 1: `expect_equal` in `py/harness.py` takes `strict` as a keyword bound per run with
  `functools.partial`, replacing a module global (mypy strict and ruff `PLW0603`). Tests call it the same way.
- Session 1: tool pins: mypy 2.4.1, coverage 7.17.0, vulture 2.16, gitleaks 8.30.1 (CI binary, checksum
  verified, same as `.claude/cloud-setup.sh`).

## Open
- Session 1: GitHub access is not enabled for this cloud session. The clone came from an uploaded bundle
  with no `origin`; after `git remote add origin`, `git push` gets 403 from the git proxy ("not in this
  session's authorized repository set"), and `gh api` answers "GitHub access to this repository is not
  enabled for this session". So nothing is pushed, the draft pull request is not open, and CI has never run
  on Session 1. Task 1.1 Step 5 and the push in Task 1.5 Step 3 stay unticked. The owner needs to add the
  repo to the session's sources, then push `test-framework` and open the draft PR (command in the Session 1
  prompt).
- Session 1: the CI changes (`secrets` job, `lint:py`, `typecheck:py`, the `--base` gap check) are untested
  on GitHub for the same reason. Locally: full-history gitleaks scan clean (293 commits), YAML parses,
  Prettier passes.
- Session 1: `pnpm test` in the VM fails one Vitest test outside this session's diff (nothing under `src/`
  changed): `src/village/terrainCache.test.ts` "a stored picture is decoded and drawn over the whole terrain
  canvas" raises `TypeError: object.stream is not a function` at line 19 (`new Response(blob)` with jsdom's
  Blob under Node 22.23.4). 570 of 571 pass. CI uses `lts/*`, so it may pass there; check on the first run.
  `pnpm test:worker` passes.
- Session 1 environment check: gitleaks 8.30.1 installed; CPython 3.12.13, 3.13.14 and 3.14.6 installed
  through uv; `src/content/bundle.json` was built by the SessionStart hook. Nothing missing.
- Session 0: on a cold uv cache, the first local `pnpm content` failed with two 30 s timeouts
  (`w3/c/knn-sklearn`, `w3/c/train-test` example blocks); the warm rerun passed in 75 s. The setup script
  warms the cache, but the framework should not let a cold machine flake a check (Session 4 owns timing).

## Next
- Before Session 2: push `test-framework`, open the draft pull request into `dev`, and read the first CI run
  (Task 1.1 Step 5). Fix anything red before starting Task 2.1.
- Session 2 (cloud): Tasks 2.1 to 2.4 in `PLAN.md`. New rules go in `vet/rules.toml` with a canary in
  `tools/fixtures/canaries/<rule>/` in the same commit; `pnpm gaps --write` records today's content as gaps. Track B runs in parallel on `report-button`.
