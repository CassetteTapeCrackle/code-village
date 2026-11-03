# Progress

Each session reads this first and updates it last. Newest entries at the top of each section.

## Done
- Session 3 (2026-11-03, cloud): Tasks 3.1 to 3.4, pushed to `test-framework`. `mutants()` with the plan's 18
  operators (`tools/vet/python/mutate.py`), the mutation check with fuzz equivalence and a results cache
  (`tools/vet/checks/mutation.py`, rule `weak-tests`), `rewrites()` with the plan's 13 transforms
  (`tools/vet/python/rewrite.py`) and rule `right-refused`, `right/*.py` answers with `right-fails` and
  `right-missing`, `wrong-too-few`, and `test-inspects-code`. Today's content: 2927 mutants, 290 survivors on 87
  items (`weak-tests`, none of them with `[cases]` yet), 1043 rewrites of which 719 are kept and none refused, no
  test that inspects code. The gap list holds 707 entries: 208 `cases-missing`, 208 `right-missing`, 204
  `wrong-too-few`, 87 `weak-tests`. Format in `content/README.md`, "Wrong answers must fail, right answers must
  pass".
- Session 2 (2026-11-03, cloud): Tasks 2.1 to 2.4, committed locally on `test-framework` and exported as a
  patch (not pushed: see Open). `[cases]` declarations (`tools/vet/cases/spec.py`), the seeded input
  generator (`generate.py`), hidden cases with seven comparators and an `expect` job mode in `py/harness.py`,
  `hidden_cases()` and four rules (`cases-missing`, `cases-decl-invalid`, `cases-too-few`,
  `solution-fails-cases`), bundle version 4 with `cases` on every task, variant and stage and `hardCases` on
  every boss, and Check sending them in the browser. Today's content is 208 `cases-missing` gaps. Format in
  `content/README.md`, "Hidden cases".
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
- Session 3, owner's supervisor: the memory cap broke `pnpm content` on macOS (`setrlimit(RLIMIT_AS)` raises
  `ValueError` there, so every harness job crashed: 550 problems). The cap now lives in
  `tools/vet/python/capped.py`, which runs the harness capped where the platform accepts it and uncapped (the
  30 s limit still applies) where `setrlimit` raises `ValueError` or `OSError`. Test
  `test_harness_runs_uncapped_where_the_cap_is_refused` patches `setrlimit` to raise and runs a job.
- Session 3 review (fresh subagent on the session diff): fixed findings 1 to 8 and 11 to 12, each with a
  regression test. `rename-params` skips a name the code passes by keyword; `for-to-while` stays lazy
  (`iter()` and `next()`), so endless iterators and lists that grow while walked behave the same;
  `rename-locals`, `rename-params` and `extract-helper` skip functions that bind names through `except ... as`,
  `match`, a local import or an inner function or class; `extract-helper` skips a recursive return;
  `fstring-to-concat` writes `format(x, "")`, since an f-string uses `__format__`. Mutation results that met a
  fuzz timeout or a fuzz set that could not be built are never cached, and a fuzz set that cannot be built is
  said in the finding. (The review also asked not to cache a mutant that times out on its tests; that cost
  every CI run 8 min, so such a mutant now counts as killed and is cached: see the budget entry.) The cache key (file and CI) includes `package.json` and the Python version. The memory cap never
  raises a lower existing limit. `add-debug-print` is skipped for program declarations too.
  `test-inspects-code` also catches `Path("x.py").read_text()`.
- Session 3: the `right-refused` canary calls `double(n=2)` by keyword while the prompt never names the
  parameter, instead of the plan's `str(result)` spacing example. No rewrite in the list changes a result's
  text, so a spacing canary could not fail; the keyword case is the real way a test refuses a right answer
  (spec 11, parameter names count only when the prompt names them).
- Session 3: mutation budget (plan: whole content under 8 minutes on CI's 4 cores). Not met on CI. The first
  green CI run of the finished checks (d1feee4) took 22 min for a cold `pnpm content`, 24 min for `pnpm test:py`
  and 57 min for the `check` job; the GitHub runner is about 3.5 times slower than this VM. The e2e job failed
  there, because `pnpm build` (the preview server) reran the whole check past its 240 s start limit. Fixed after
  it: a mutant that runs out of time counts as killed and is cached (uncached, the 65 endless ones cost every
  run 8 min), mutant jobs stop after 10 s instead of 30 s, the rewrite and `right/` results are cached per item
  like mutation (`tools/vet/cache.py`), `pnpm build` uses `--if-changed` like `pnpm dev`, and the CI cache is
  shared by both jobs. In the VM now: cold `pnpm content` 5 min 16 s, warm 26 s (33 s before Session 3),
  `pnpm test:py` 5 min 21 s (2 min 11 s before). Read the next CI run for the GitHub figures.
- Session 3: CI caches `.vet-cache/`, keyed by the framework source, `py/harness.py` and `package.json`, plus
  the run id and job so each run saves its new results and both jobs restore the latest. The e2e job runs
  `pnpm content` as its own step before Playwright, because a cold check passes the dev server's start timeout.
- Session 3: the cache (`tools/vet/cache.py`, `.vet-cache/<check>/<fingerprint>.json`) serves the real content
  and, through `VET_CACHE`, the Python tests, which share one temporary cache per run so each canary recomputes
  only the item it changes. Fixture runs without `VET_CACHE` always compute everything. A value is stored only
  when settled: a fuzz run or a rewrite or `right/` run that met a timeout is computed again next time.
- Session 3: each harness process gets at most 2 GiB of address space. Two `generators` mutants grew a list to
  7 GB and 5 GB in their 30 s, and the first Session 3 CI run lost both runners to it. Real jobs peak at 160 MB.
- Session 3: mutants are spliced into the original text (comments and layout kept, for "Spot the bug"); rewrites
  are unparsed whole, since they are only run.
- Session 3: a boss's stages and hard mode form one group with the shared solution: a mutant counts as killed
  when any stage or hard mode fails it, and a rewrite or `right/` answer must pass all of them, as `wrong/` does.
- Session 3: `rename-params` gives one rewrite per parameter (`rename-params:<name>`), so the check can skip
  exactly the names a prompt mentions. `Item` gains `prompt` (the boss intro for hard mode) and `right`.
- Session 3: `right-fails` and `right-refused` stay quiet while the solution itself fails its suite;
  `solution-fails` reports that, and the tests may be what is wrong.
- Session 3: severities: `weak-tests` and `wrong-too-few` are `wrong-accepted`; `right-fails`, `right-missing`
  and `test-inspects-code` are `right-refused`. `open()` stays allowed in tests except on a `.py` file or
  `__file__`, because the file tasks write data files with it.
- Session 2 review (fresh subagent on the session diff): fixed all seven findings. Learner code and odd task
  data can no longer crash the harness: a raising `__repr__`, `__eq__` or validity function, and an `expect`
  that does not evaluate, each give a message instead of a browser timeout. `expect` is evaluated with the
  imports of the case's `setup`. The expect mode writes every answer as source and keeps it only when it
  evaluates back to the same value (sets sorted so builds repeat, `inf` and `nan`, nested NumPy scalars,
  pandas index and dtype); an answer with no such source is `solution-fails-cases`. A Check that comes back
  with no hidden result (a crash) is `solution-fails-cases` too. Message wording: `your code stopped:` for an
  `input()` the case cannot answer, no `: ` after an exception with no message, `1 more input`. The result
  header is no longer green when the hidden line failed. A regression test for each.
- Session 2: Check with 100 hidden cases, measured on a `larger` task in Pyodide 314.0.7 under Node (20 runs
  each) after the review fixes: 0.9 ms with the visible tests alone, 16.3 ms median and 24 ms worst with the
  cases. The budget is one second, so `count` stays at 100.
- Session 2: boss hard mode reads `[cases]` from the `boss.md` front matter. The plan names task, variant and
  stage TOML only, and hard mode needs a place too; the front matter is the boss's only TOML.
- Session 2: `Item` gains `seed` (its own id: the stage id for a stage, `<boss>:hard` for hard mode) and the
  raw `cases` table. A stage's `id` is its boss's, so it cannot seed the inputs alone.
- Session 2: `requires` is left out of `run_tests`, `CheckJob` serialization and `CheckSuite` until Task 5.3
  produces it. The plan ships it as `[]` now; "no for-later code" wins, and the bundle has no field to fill.
- Session 2: a case with `compare = "valid"` carries the validity function's name in `valid`, and its
  `expect` holds the input (the call's arguments as a tuple, or a program's typed lines). The plan's bundle
  case shape had no field for the name. `valid` works for calls and programs, not classes.
- Session 2: every hidden case runs the learner code from scratch (exec, setup, call). It costs little (see
  the timing) and isolates globals and objects as well as arguments.
- Session 2: a class declaration becomes one expression case: `setup` builds `obj`, `expr` is the list of
  method results followed by the declared reads. A step that raises makes the whole case raise, compared by
  exception type.
- Session 2: a mutated argument is bound to `_argN` in `setup`, and `expr` returns `(result, _argN...)`, so
  the change is compared after the call.
- Session 2: programs compare with `text` by default (the forgiving rules the visible tests use); calls and
  classes with `exact`, which is type aware (`True` is not `1`, `2.0` is not `2`).
- Session 2: expected NumPy and pandas values are written as `__import__('numpy').array([...])` and
  `__import__('pandas').DataFrame({...})`, so they evaluate without the learner's imports; NumPy scalars
  become Python numbers on both sides.
- Session 2: hidden-case findings for a boss share the boss's gap key, like Session 1's stage findings, so 238
  findings make 208 gap entries.
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
- Session 3: the GitHub access problems of Sessions 1 and 2 are gone: `origin` pushes and CI runs on every
  push.
- Session 3: CI time. A framework change still means a cold run of the new checks in both jobs (about 5 min in
  the VM, likely 15 min or more on GitHub), and `pnpm test:py` is about 2.5 times slower than before Session 3
  (more canaries, a bigger `good` fixture, the `wrong/` and solution checks are not cached). That works against
  the 2000 Actions minutes a month. Options for Session 4 (timing): cache the remaining runtime checks the same
  way, or run the canaries' runtime checks in fewer harness processes.
- Session 3: a mutant that runs past 10 s counts as killed. A correct but slow mutant on a loaded runner would
  hide a survivor; today's slowest real job takes about 2 s in the VM. A fuzz timeout still reports
  `weak-tests`, which could flicker on a slow runner; no item has `[cases]` yet, so it cannot happen today.
- Session 3: `test-inspects-code` allows `open(name)` with a variable (shortcut comment in
  `tools/vet/checks/test_shape.py`).
- Session 3: some of today's 290 `weak-tests` survivors look equivalent, not weak: `random_state=1` changed to 2
  in W3 train-test tasks, `t == g` to `t is g` on small ints. They stop being findings once those items declare
  `[cases]` (fuzz equivalence), or Session 9 (flags are real) decides.
- Session 3: `pnpm test` in the VM still fails only `src/village/terrainCache.test.ts` (575 of 576 pass, CI
  passes it); `pnpm test:worker` passes (89 tests).
- Session 2: still no GitHub access in the cloud session. No `origin`; `gh api` answers "GitHub access to
  this repository is not enabled for this session", and the session has no tool to request it. Nothing from
  Session 1 or 2 is pushed and CI has never run on either. The Session 2 commits went out as a patch from
  `87c23e0` through the session's Artifact page. The owner applies it with `git am` on top of Session 1, then
  pushes `test-framework` and reads CI.
- Session 2: `pnpm test:py` takes 160 s in the VM, up from 98 s. The cases check runs one `expect` job per
  item and a second Check per item, which roughly doubles each canary and fixture build, and coverage traces
  every harness subprocess. `pnpm content` on today's content is unchanged (33 s), because no item declares
  `[cases]` yet. Once content declares them, expect about one more harness run per item.
- Session 2: an answer with no Python source that gives it back (an instance of a class with the default
  `repr`, a `Fraction` without its import) is refused as `solution-fails-cases`. Function tasks that return
  such objects need a class declaration with `reads`, or `none`, until a later task decides how they compare.
- Session 2: `pnpm test` in the VM still fails the one `src/village/terrainCache.test.ts` test recorded by
  Session 1 (`object.stream is not a function`), 574 of 575 pass. `pnpm test:worker` passes (89 tests).
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
- Session 4 (cloud): Tasks 4.1 and 4.2 in `PLAN.md`. Read CI on the last Session 3 push first and fix anything
  red. The mutation, rewrite and `right/` checks run through `PythonAdapter`, so the interpreters of Task 4.1
  plug in there.
- Track B Task B.3 can merge `test-framework` into `report-button`.
