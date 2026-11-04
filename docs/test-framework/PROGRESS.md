# Progress

Each session reads this first and updates it last. Newest entries at the top of each section.

## Done
- Session 9 (2026-11-04, overnight cloud session): Tasks 9.1 and 9.2, pushed to `test-framework`. Three held-out rounds
  (prompt `docs/test-framework/prompts/heldout-canaries.md`; a fresh Sonnet subagent each time that read only the spec,
  the canary README and the good fixture). `python -m unittest tools.test_canaries -k heldout` judges them. Round 1:
  22 canaries, 11 missed at first. Round 2: 36 canaries, 16 missed. Round 3: 34 canaries, 16 missed. Every miss a
  program can find from the files became a rule with a canary under `tools/fixtures/canaries/`: 16 new rules
  (`test-keyword-unnamed`, `test-name-unnamed`, `test-without-learner`, `test-swallows-failure`, `wrong-misses-name`,
  `trophy-duplicate`, `lesson-id-mismatch`, `lesson-order-duplicate`, `region-no-boss`, `stage-order-duplicate`,
  `stage-hp-invalid`, `claim-vacuous`, `claim-id-duplicate`, `cases-target-unused`, `valid-always-true`,
  `solution-flaky`) and four extensions (`test-inspects-code` reads `__name__` and the like, `docstring` is a construct,
  unlisted keyword arguments of builtins are unknown features, and `weak-tests` leaves out equivalent mutants). 17 defects stay open, each with
  its reason, in `tools/fixtures/canaries-heldout/README.md`. Flags are real (9.2): see Decisions.
- Session 8 (2026-11-04, overnight cloud session): Tasks 8.1 to 8.3, pushed to `test-framework`.
  `tools/vet/changed.py` (`python -m tools.vet.changed --base origin/dev` prints a VET_ITEMS value) and
  `content_check.py --items-out .vet-cache/e2e-items.json` (`tools/vet/e2e_items.py`); the specs
  `e2e/generated.spec.ts` (per task: starter fails, first `wrong/` fails, the mutant only hidden cases kill shows "We
  also tried", the solution passes; one page per lesson) and `e2e/generated-bosses.spec.ts` (solution beats the
  boss, then hard mode), both reading `e2e/generatedItems.ts`; `ci.yml` (the e2e job picks VET_ITEMS from the change)
  and `e2e-full.yml` (everything, four shards, manual dispatch and pushes to main). Format in `content/README.md` is
  unchanged; VET_ITEMS is described at the top of `tools/vet/changed.py`.
- Session 7 (2026-11-04, overnight cloud session): Task 7.1, pushed to `test-framework`. Blind solvers:
  `tools/vet/models/blind_solve.py` (the Actions side: five DeepSeek attempts per item, only the code comes back),
  `tools/vet/blind_eval.py` (the session side: `request`, `evaluate`, `triage`), results in `vet/blind/<id>.json`
  pinned to the item's fingerprint, and the rules `blind-missing`, `blind-untriaged`, `blind-too-strict` and
  `blind-disagrees` (`tools/vet/checks/blind.py`), each with a canary on recorded attempts (fixture `blind-base`).
  Live run on three items (`conditions-sign`, `properties-fuel`, `statistics-median`): all 15 attempts pass their
  visible tests. The other 205 solutions are `blind-missing` gaps (the list holds 1082 entries). Format in
  `content/README.md`, "Blind solvers".
- Session 6 (2026-11-04, overnight cloud session): Tasks 6.1 to 6.3, pushed to `test-framework`. Sentences and the
  claims ledger: `tools/vet/prose.py` cuts every sentence a learner reads, `ledger.toml` next to each lesson and boss
  pins one entry per sentence by fingerprint, claim blocks take `id=`, and the rules `ledger-missing`,
  `ledger-stale`, `remember-unbacked`, `claim-id-missing`, `claim-id-unknown`, `doc-anchor-missing` and
  `fence-untyped` (`tools/vet/checks/ledger.py`) each have a canary. The pinned docs inventory is
  `tools/vet/data/python-3.12-objects.inv` (14868 anchors). `python -m tools.vet.pending <out.json>` lists the 1163
  sentences without an entry. DeepSeek: `tools/vet/models/deepseek.py` (urllib, three retries, call cap, model check),
  `review_sentences.py`, the shared reply schema `reply.py`, and `.github/workflows/vet-models.yml`, started by pushing
  a file under `vet/requests/`. Claude's half: `docs/test-framework/prompts/review-sentences.md` and
  `merge_sentences.py`, which accepts a sentence only when both families say true, name the same backing and every
  assert passes, and writes the rest to `vet/triage.md`. The five-sentence sample ran end to end (see Decisions for
  cost). Today's content adds 111 gaps (43 `ledger-missing`, 34 `remember-unbacked`, 33 `claim-id-missing`, 1
  `fence-untyped`, the boss's map of rooms); the list holds 877 entries. Format in `content/README.md`, "The claims
  ledger".
- Session 5 (2026-11-03, overnight cloud session): Tasks 5.1 to 5.4, pushed to `test-framework`. `content/features.toml`
  holds 93 features (syntax, builtins, methods of the core types, libraries) with detectors, `words` and `say`;
  `detect_features` in `py/harness.py` finds them and reports the rest as `unknown:<detector>`. Lessons declare
  `teaches`. Rules `untaught-feature`, `unknown-feature`, `teaches-missing` (`tools/vet/checks/progression.py`),
  `required-untaught`, `required-not-in-prompt`, `prompt-asks-construct` (`tools/vet/checks/required.py`),
  `gate-boss-missing` and `trophy-mismatch` (split out of `world-key-invalid`, in `checks/worlds.py`). A task, variant,
  stage or boss lists `requires`; Check says "Your code works, but this task asks you to ..." once the behaviour
  passes (harness, bundle version 5, TypeScript runner). Today's content: 0 `unknown-feature`, 34 `teaches-missing`
  (so no lesson is judged yet), 28 `prompt-asks-construct` (prompts that name a construct without requiring it,
  for example "Try a list comprehension"). The gap list holds 766 entries. Format in `content/README.md`, "Nothing
  is used before it is taught" and "Required constructs".
- Session 4 (2026-11-03, cloud): Task 0 (CI speed) and Tasks 4.1 and 4.2, pushed to `test-framework`, CI green
  on each push. `pnpm content --quick` for `pnpm dev`, `pnpm build`, the SessionStart hook and the e2e job; each
  check lists its rules (`tools/vet/run.py`) and canaries run only theirs; a narrower cache key and uncached CI
  runs on main, manual dispatch and nightly. Rules `version-differs` and `min-unexplained`
  (`tools/vet/checks/versions.py`, `tools/vet/python/interpreters.py`, `min` on fences and item TOML). `pnpm
  test` writes every CPython verdict (`tools/vet/jobs.py`) and `pnpm vet:pyodide`
  (`scripts/vet-pyodide.mjs`) repeats them in Pyodide; CI runs it after `pnpm test`. Today's content: no
  `version-differs`, and all 695 Pyodide jobs agree on CI. The gap list is unchanged (no new findings). Format in
  `content/README.md`, "Python 3.12 and newer".
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
- Session 9, flags are real (Task 9.2): the full `vet` on today's content gives findings in 11 rules (weak-tests 290,
  cases-missing 238, right-missing 208, blind-missing 205, wrong-too-few 204, ledger-missing 43, teaches-missing 34,
  remember-unbacked 34, claim-id-missing 33, prompt-asks-construct 28, fence-untyped 1). Sample: 3 per rule drawn with
  `random.Random("flags-are-real:<rule>")` from the findings sorted by item and message (33 flags). All 33 were
  checked against the files. 32 are real: the file, folder or table the message says is missing is missing, or the
  sentences it quotes are in the lesson; the three `prompt-asks-construct` flags name a construct in the prompt
  that no test requires (one, `sortable-by-height`, says "finish the key function" and its starter already passes
  `key=`, so requiring it would be trivial; the owner decides between `requires` and `construct_words_ok`). One was
  a false alarm: `gradebook` (`weak-tests`): `m.strip()` became `m.lstrip()` inside `if m.strip()`, and the two are
  empty for exactly the same strings. The other two `weak-tests` samples are real (`squirrel-storehouse`: no test
  sells twice; `statistics-trimmed`: no test has a fractional mean, so `//` passes). Fix: `mutants()` skips a
  strip, lstrip or rstrip used only as a condition and the value of a seed argument (`random_state`, `seed`), with a
  canary in the good direction (`weak-tests/strip-in-a-filter-is-not-weak`). Without `[cases]` other equivalent
  mutants can still be reported (an index `[0]` and `[-1]` on a one-element list is an example); declaring `[cases]`
  lets the fuzz set clear them, so the gap list stays the place where they wait.
- Session 9: a held-out canary counts as caught when the full `vet` gives any finding except a file that cannot be
  read (`file-unreadable`, `field-missing`, `field-invalid`), as the plan says ("a canary with no finding is a miss").
  The failure class the writer names is a label: one defect can be filed under another class (a test that fails on
  Python 3.12 is a `false-claim`). My first version required the class to match, which was wrong.
- Session 9: every harness run now uses `PYTHONHASHSEED=0` (`-s -P` instead of `-I`, since isolated mode ignores the
  variable). Before, set and dict order changed from run to run, so a test that depended on it passed or failed at
  random, against the "no flaky" anti-goal. `solution-flaky` (a slow rule) reruns each solution under seeds 1 to 4.
- Session 9: the held-out writers were told in round 3 to leave out defects only a reader of prose can find, and
  round 2 and 3 prompts listed earlier themes to avoid. Round 1 made no such steer. The rounds are therefore not
  independent samples; no round came back with no miss, and the cap of three rounds ended the task.
- Session 8: `changed_items` returns a frozenset of VET_ITEMS tokens (`all`, `sample`, item ids), not the plan's
  `set | Literal`, because one change can need a sample and some ids. `all` swallows the rest. A content file maps to
  its task (a variant file to its task, `lesson.md` and `ledger.toml` to every task of the lesson, a boss file to the
  boss); `features.toml`, `concepts.toml` and `world.toml` ask for a sample; so do `py/`, `src/runner/`,
  `src/lesson/`, `src/screens/`, `src/learning/`, `tools/vet/`, `tools/content_check.py` and the lockfile; the
  generated specs and `e2e/helpers.ts` ask for all. `sample` is the first task of every lesson and the first boss.
- Session 8: a pull request never runs `all` in the e2e job (it would take most of the 30 minute limit, unsharded): a
  change to the generated specs runs the sample there, and the full sweep is `e2e-full.yml`. It cannot be started by
  hand until the file is on the default branch, so the first full sweep is after the merge (or a push to main).
- Session 8: a bare `git diff base...HEAD` finds no merge base in a shallow checkout of a pull request's merge commit;
  `changed_paths` then compares tree to tree, which is the change since HEAD is the base plus the pull request.
- Session 8: the e2e jobs restore the check job's `.vet-cache` so the items file can name a mutant that only hidden
  cases kill. Quick content builds skip the mutation rule but read the cache.
- Session 8: the generated lesson spec waits for each Check with a MutationObserver on the button's `disabled`
  attribute: the old result stays on the page until the new one replaces it, so result text alone cannot tell a run
  is over (found by the reviewer). Files are parallel (`test.describe.configure`), lessons serial, so shards balance.
- Session 8: the first CI run of the generated sample hit the 30 minute job limit. Cause: every lesson and boss of World
  2 and World 3 showed the blocked-world page (a world opens with the trophy of an earlier boss), so each task waited
  4 minutes for a region that never appeared. The specs now seed a save with every other boss beaten (`openRoads` in
  `e2e/generatedItems.ts`). The generated specs also moved to their own job `generated` (four shards, no production
  preview build, `E2E_NO_PREVIEW`), as the supervisor asked; the `e2e` job runs the hand-written specs only.
- Session 8 review (fresh Sonnet subagent on the session diff): fixed findings 1 to 7. Finding 8 (a failed task
  skips the rest of its lesson; a `browser.newPage()` gets no failure screenshot) is under Open.
- From Session 7 on, on the supervisor's word (the cloud credit can end without warning): push after every commit,
  not only at task boundaries, and run the full suites at part boundaries. Each commit still passes lint, types and
  the tests of the files it touches.
- Session 7 review (fresh Sonnet subagent on the session diff): fixed findings 1 to 3, 5 to 7 and 9 to 11, and the
  parts of 4 and 8 that are cheap. Code that cannot load (a syntax error, an `input()` at the top) now fails the
  hidden verdict too, so it cannot be mistaken for `blind-too-strict`. An item is written only with all five
  attempts, and the check wants all five. Asking again keeps the triage of the same version. A model-wrong decision
  needs a non-empty quote, and one invalid decision unsettles the attempt. A malformed file is `blind-missing`
  instead of a crash. Item ids must be plain file names. `request --stale N` adds up to N items with no current run.
- Session 7 blind run (workflow run 41754579815, commit cd55019): 3 items, 15 calls, 8608 tokens (about 570 per
  attempt), 4.0 s with 8 calls in flight, 0 failed. At that size all 205 remaining solutions would be about 590,000
  tokens (1025 attempts). I did not turn tokens into money, since I do not know the price. The run was started by
  pushing `vet/requests/blind-sample.json`.
- Session 7: the Actions job only asks for code; the session runs it. The plan has the harness, hidden cases and the
  fuzz set run the attempts, and those need the project's libraries and the content tooling, which the stdlib-only
  job does not have, and "model calls only in Actions" does not forbid running code in the session. The workflow file
  needed no change: the job is chosen by `job` in the request file (the plan asked for a `blind` job in the YAML).
- Session 7: the unit is a solution group, like the mutation check: a task, a variant, or a boss (its intro and stage
  prompts stand in for the prompt, with no lesson text). Variants ask with the lesson text up to their task. The
  context holds the lesson prose and example and predict code before the task, never claims, tests or solutions.
- Session 7: an attempt record also holds `failure` (the first failing visible test), `temperature` and `hidden`
  "none" when the item declares no `[cases]` (today every item). `blind-too-strict` and the fuzz comparison need
  cases, so on today's content only visible failures can show up. A failed call (`error`) is kept out of the file;
  a run with no attempt left writes none and stays `blind-missing`.
- Session 7: the check is silent when `vet/blind/` does not exist (fixtures and canary bases), and asks for every
  group once it does. A model-wrong triage must contain the failing case or failing test message word for word, and
  the check enforces it on the stored file, so editing the JSON cannot skip it. The canaries use a one-task fixture
  (`tools/fixtures/blind-base`) so each needs one recorded file, pinned to that fixture's fingerprint.
- Session 6 sample run (workflow run 41747686729, commit c1293c4): 5 sentences, 5 calls, 6229 tokens (about 1250 per
  sentence), 6.2 s wall time with 8 calls in flight. All 1163 sentences would be about 1.45 million tokens and a few
  minutes; I did not turn tokens into money, since I do not know the price. Claude's half (one Sonnet 5.5 subagent
  that saw no DeepSeek answer) and a dry run of the merge: 4 accepted, 1 to triage (`super()` in
  `w2/c/inheritance`: DeepSeek says simplification, Claude says claim), nothing written to the content. The full
  review is Task 10.1.
- Session 6 review (fresh Sonnet subagent on the session diff): fixed findings 1 to 8 and 10. A claim block is
  inserted after the body paragraph only (a remember bullet equal to a paragraph had corrupted the TOML header in the
  reviewer's probe). A remember bullet that repeats other text stays a remember bullet. `merge_sentences` refuses to
  rewrite a ledger that does not read whole. An entry must say who settled it (`decided`), an auto entry needs both
  families to agree, and a fingerprint may appear once. A sentence may end in a number, "..." does not split, and
  case counts inside backticks. A proposed assert must contain an assert statement. A dropped connection is retried,
  and a run where most calls failed exits non-zero after writing its results (the log prints them either way). A log
  with no result file is an error. The workflow reads request paths NUL separated and accepts only
  `vet/requests/*.json`. Each fix has a test; findings 9, 11 and 12 (partly) are under Open.
- Session 6: GitHub starts a workflow from the dispatches API only when the workflow file is on the default branch, so
  `vet-models.yml` runs `on: push` for `vet/requests/**` on `test-framework` (owner's correction); `workflow_dispatch`
  stays for after the merge. A request file is JSON with a `job` (`inventory`, `sentences`; `blind` comes with Task 7.1).
- Session 6: the VM cannot download an Actions artifact (the proxy refuses `blob.core.windows.net`), but `gh api
  .../jobs/<id>/logs` works. A job prints its result files between markers, base64 with a sha256, and
  `python -m tools.vet.models.logs <log> <folder>` writes them back and refuses a cut or changed log. The artifact is
  still uploaded for the owner. The plan's `gh run download` is replaced by this.
- Session 6: the docs inventory could not be fetched in the VM (docs.python.org answers 403 through the proxy), so the
  `inventory` job downloads it and the session commits it from the log, as the plan allows.
- Session 6: `fingerprint_text` of the plan is `sentence_fingerprint` (model.py already has a `fingerprint_text` that
  hashes bytes), and the pending-list CLI is `python -m tools.vet.pending` (a `__main__` in `ledger.py` would need an
  import inside a function, which ruff refuses, because `load.py` imports `ledger.py`).
- Session 6: a code sentence is judged where it sits: each sentence of a `remember` bullet, task prompt, hint, variant
  prompt, boss intro and stage prompt is a ledger sentence, like lesson text; titles are not. One finding per lesson or
  boss per rule (not per sentence), pinned to the lesson's text, so the gap list grows by 43 `ledger-missing` and not
  by 1163 entries. `ledger.toml` is left out of item fingerprints, so reviewing a sentence does not re-pin gaps.
- Session 6: both families use the same prompt file and reply schema (`{fp, status, verdict, reason, assert}`, in a
  file `{model, replies}`), and a reply that does not fit becomes `unsure`. DeepSeek runs at temperature 0 with JSON
  output and 8 calls at once; `VET_MAX_CALLS` defaults to 3000 and counts retries.
- Session 6: boss text cannot hold a claim block, so a runnable fact found there goes to triage. A claim block for a
  fact from a remember bullet, a task or a hint is appended at the end of `lesson.md`. Merging edits `lesson.md`,
  which re-pins that lesson's gaps: run `pnpm gaps` after a real merge (Task 10.1).
- Session 6: the repository secret is named `DSKEY`, not `DEEPSEEK_API_KEY` (the first sample run failed with
  "DEEPSEEK_API_KEY is not set"). The workflow step maps `DEEPSEEK_API_KEY: ${{ secrets.DSKEY }}`, so the code keeps
  reading `DEEPSEEK_API_KEY`. The supervisor gave this fix.
- Session 5 review (fresh Sonnet subagent on the session diff): fixed findings 1, 2, 4, 5, 6, 7, 8 (annotations and
  async only), 9, 10 and 11, with a test for each. Mutation jobs run without `requires`, so a mutant that loses a
  construct is not "killed" by the construct check. A builtin passed as a value (`key=len`, `except ValueError`)
  counts as used (`call:<name>`). A decorator the code defines, and decorator calls like `functools.wraps(f)`, are
  not features. A defined method name hides only calls on a name or object, not `self.items.pop()`.
  `features.toml` is in the results cache key. `dataclasses-module` became `dataclasses-import` and
  `dataclass-decorator` (detectors are OR, so requiring the module would have accepted a bare import). Finding 3
  and the operator part of 8 are under Open.
- Session 5: code is judged for `untaught-feature` only up to the first lesson (world order, then `order`) that has
  no `teaches`, since an earlier lesson with no list makes every later feature look untaught. `unknown-feature`
  applies everywhere. A boss is judged after the last lesson of its region and needs all lessons before that to
  declare `teaches`. Without this rule today's content would give about 1000 `untaught-feature` gaps with no signal.
- Session 5: `claim` blocks, `tests.py` and boss intro text are not judged: learners never read them (the plan lists
  the checked code). Hint code spans count only when they parse alone (shortcut in `progression.py`).
- Session 5: the vocabulary lists only what today's content uses (plus the plan's syntax list), not every builtin
  and method of the core types: unused entries would be code nobody asked for, and a new world that needs one fails
  with `unknown-feature` until it is added, which is the spec's "stays complete" mechanism.
- Session 5: `LanguageAdapter.features` takes a batch of `FeatureQuery` (code and `own_names`) and the vocabulary,
  and returns one set per query. The plan's `features(code)` could not work without the vocabulary, and one
  harness job for all of the content is much cheaper than a subprocess per snippet. `detect_features` gained an
  optional `own_names` (methods defined in the lesson's other code, for hints and snippets).
- Session 5: `Required` is called `RequiredConstruct` in TypeScript (the global `Required<T>` utility type).
  `Feature` gains `say`, `Item` gains `requires`, `requires_ids` and `words_ok`; the TOML key `construct_words_ok`
  silences `prompt-asks-construct`. Boss hard mode reads `requires` from the `boss.md` front matter, like `[cases]`.
- Session 5: the gate rules live in `checks/worlds.py` next to `world-key-invalid`, not in a new `wiring.py`: the
  plan lists `task-unplaced`, `concept-*` and `item-id-duplicate` as already existing, which left two new rules.
  The XP-total Vitest test the plan asks for already exists (`src/learning/curve.test.ts` reads the built bundle).
- Session 5: Tasks 1.1 Step 5 and 1.5 Step 3 are ticked: CI has been green on every push since Session 3.
- Session 4 review (fresh subagent on the session diff): fixed findings 1 to 4, 6 and 9 with a regression test
  each where code changed. A block or job that times out on 3.14 leaves its unit uncached, a timeout on 3.12 or
  3.13 is not a `version-differs`, an unknown `min` is only `field-invalid` (it crashed the run), and the cache
  key now covers `load.py`, `model.py`, `claims.py` and `libraries.py`. Findings 5, 7 and 8 are under Open.
- Session 4: canaries run only the checks behind their folder's rule and their `expect` list
  (`vet(only=...)`); the `good` fixture runs every check. Owner's Task 0 requirement. The cost: a canary whose
  defect also trips an unrelated rule is no longer seen; false positives on clean content stay covered by the
  `good` fixture. `test:py` went from 5 min 21 s to about 4 min in the VM before Task 4.1 added its tests.
- Session 4: `--quick` leaves out `weak-tests`, `right-refused`, `right-fails` and `version-differs`
  (`SLOW_RULES`), and compares only gap entries of rules that ran. A quick bundle is identical to a full one;
  `--if-changed` lets a full build's stamp serve a quick run, never the reverse. The quick build takes 54 s in
  the VM.
- Session 4: the cache key (`framework_hash`) is the Python version, the `pnpm content` pins and the files in
  `RESULT_SOURCES` (harness, adapter, cache, load, model, `python/`, `cases/`, and the claims, libraries,
  mutation, rewrites, right and versions checks). CI's key is just the run id with restore-keys `vet-cache-`:
  each cached file carries its own hash, so one key cannot drift from the code. A mistake in the list is caught
  by the uncached runs (push to main, dispatch, nightly at 03:17 UTC). The older Pythons and the jobs file are
  kept out of the Actions cache.
- Session 4: the versions check compares example and predict output (stdout and error), claim pass or fail,
  and the pass or fail of the solution, starter, `wrong/` and `right/` answers on every suite with its hidden
  cases (3.14's expected values, so the cases are cross-checked too). It is cached per lesson and per solution
  group (`cache.per_unit`). `min` on a block or item skips the older Pythons below it, and needs "Python 3.13"
  (for example) in the text right before or after the block, or in an item's prompt.
- Session 4: the plan's canary for 4.1 is a docstring: Python 3.13 strips its common indentation, so `print(repr(
  f.__doc__))` differs on 3.12. Verified on 3.12.13, 3.13.14 and 3.14.6.
- Session 4: the Pyodide parity check is a test (`tools/test_vet_jobs.py`), not a gap-listed rule, since it
  runs in Node outside the rule engine and a difference must fail the build. Its canary plants a claim that
  starts a thread (works in CPython, `RuntimeError` in Pyodide, verified). Example and predict jobs compare
  stdout and error (the plan's `{"output": ...}` plus the error).
- Session 4: `pnpm vet:pyodide` runs Node with `--stack-size=4000`. The `w2/b/properties` claim that recurses
  until `RecursionError` aborted Pyodide with Node's default stack; 2000 KB was enough, 4000 leaves room.
- Session 4: `pnpm content` prints `cache: <kind> N read, M computed, K unsettled (key ...)` for the real
  content, since the first warm pull request run restored the cache and still spent 8 min in `pnpm content`.
  On CI every unit settles (cold run on d3dcd0a: 0 unsettled in every kind, key 850318c159cf).
- Session 4: CI pins Python 3.14.9 in `setup-python`. The next run on the same code got 3.14.8 from a
  different runner image, so the key (which holds `sys.version`) changed and every unit recomputed.
- Session 4: `PythonAdapter.check` remembers outcomes per job like `run`, so writing the jobs file runs nothing
  twice. `Item` gains `wrong` and `min`; `CodeBlock` gains `min`.
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
  `pnpm test:py` 5 min 21 s (2 min 11 s before). On GitHub (run on 160ed08, green, cold cache since the
  framework changed): `pnpm content` 6 min 37 s in e2e and 7 min 42 s in `check` (inside the 8 minute budget),
  `pnpm test:py` 7 min 21 s, `pnpm build` 3 s, `check` job 16 min, e2e job 9 min. A warm run skips most of the
  content time.
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
- Session 9, Task 9.1 stopped at the cap of three rounds with misses in round 3 (as the supervisor allowed). Open:
  17 planted defects the deterministic checker does not find; reasons per canary in
  `tools/fixtures/canaries-heldout/README.md`. In short: false or weakly proved sentences, wording open to two
  readings and a hard-coded answer under a validity rule need the model reviews (`vet-models`, Task 10.1) or the blind
  solvers; an input space declared too narrow, a float tolerance too loose, a validity rule that compares only signs
  and an `isinstance` test need a person; a prompt or hint naming a function the code calls something else, a hint
  with code that raises, `kind = "fix"` with an empty starter and a test that keeps state between runs are cheap
  checks nobody wrote yet. Run the four false sentences of round 1 and 2 (`open/false-claim-*`) through the live
  DeepSeek review in Task 10.1 to see whether the model half catches them.
- Session 9: the new rules are quiet on today's content, so the gap list is unchanged (1082 entries).
- Session 8: Playwright cannot run in the VM (the dev server copies Pyodide wheels from cdn.jsdelivr.net, which the
  proxy refuses), so the generated specs ran only on CI. The uploaded Playwright report is an artifact the VM cannot
  download either, so I sized the shards from the Playwright list printed in the job log.
- Session 8 CI minutes, first fully green run (ac6cd91, run 41764063250, branch push, VET_ITEMS=sample: the first task
  of each of the 34 lessons plus the first boss): `check` 12 min 20 s (warm cache), `e2e` (the hand-written specs)
  3 min 54 s, `generated` shards 1 to 4: 2 min 46 s, 2 min 8 s, 2 min 56 s and 2 min 45 s, `secrets` 5 s. Wall time
  about 12.5 min (the `check` job), runner time about 27 min. A full sweep (`e2e-full.yml`, 100 tasks and 9 bosses)
  has not run; at about 6.5 s per World 1 task it should fit four shards well under 12 minutes, but World 3 tasks
  load NumPy, pandas or scikit-learn and cost more. Measure it on the first run after the merge.
- Session 8: variants are not covered by the generated lesson spec (their path in the app is the review session). No
  item declares `[cases]`, so no task has a hidden-case mutant and the "We also tried" check has never run. The
  `chosen()` selection logic in `e2e/generatedItems.ts` has no unit test (Vitest only reads `src/`).
- Session 8: a failed task in a lesson skips the later tasks of that lesson (serial mode), and the page made in
  `beforeAll` gets no failure screenshot; the e2e job still uploads the HTML report.
- Session 7 review findings left: 4 in part (an owner can still write `by: owner` into the JSON by hand; the CLI
  now takes only `session`, and every session decision is listed in `vet/triage.md`); a `prompt-fixed`,
  `test-fixed` or `solution-fixed` decision settles an attempt without proof of a change, since a change to the item
  asks for a new run anyway; the default paths of the CLI depend on the current directory (run it from the repo root).
- Session 7: the three live items were not triaged because none failed. Blind results for the other 205 solutions,
  triage of whatever they show, and the fuzz comparison (needs `[cases]`) are for the fixing sessions and Task 10.1.
- Session 7: `contexts` for a boss carry no lesson text (a boss spans several lessons). A DeepSeek attempt at a boss
  therefore tests the intro and stage prompts alone.
- Session 6 review finding 9: the merge reads all `deepseek-sentences*.json` and `claude-sentences-*.json` files and
  a later file overwrites an earlier reply for the same sentence; a triage note is never updated or removed once the
  sentence is later accepted. Prune `vet/triage.md` by hand after the owner settles it.
- Session 6 review finding 11: not in today's content, not handled: an indented fence inside a list, `~~~` fences,
  curly closing quotes, a heading without a blank line after it, and `fence-untyped` reading prompts and hints.
- Session 6: proposed asserts run on one CPython (the merge's own), so a fact that differs on 3.12 or in Pyodide is
  found later by `version-differs` and `pnpm vet:pyodide`, after the entry is written.
- Session 6: `vet/results/` holds only the five-sentence samples (`deepseek-sentences-sample.json`,
  `claude-sentences-sample.json`); no ledger or lesson was changed by a merge. Task 10.1 runs the real review.
- Session 5 review finding 3: builtin shadowing ignores scope (a parameter named `type` hides every call to `type`
  in the code). Shortcut comment in `py/harness.py`. Upgrade to per-scope names if a lesson shadows a builtin on
  purpose.
- Session 5: operators (`//`, `%`, `**`), list, tuple, dict and set displays are not tracked syntax, so a lesson can
  use them before teaching them. Add `node:` entries to `TRACKED_NODES` and `features.toml` if that matters.
- Session 5: no content item uses `requires` yet, so `pnpm vet:pyodide` and the worker never run a real requirement;
  the browser path is covered by the mocked `client.test.ts` and harness tests only. No lesson has `teaches`, so
  `untaught-feature` never fires on real content. Both are for the fixing sessions: someone must decide which
  prompts really require a construct (28 `prompt-asks-construct` gaps) and write `teaches` for the 34 lessons.
- Session 5: `pnpm test` in the VM still fails only `src/village/terrainCache.test.ts` (575 of 576 pass); CI passes it.
- Session 4: CI timing, measured on GitHub. Warm pull request run (1b49482, run 41724842270, every unit read
  from the cache): 9 min 30 s wall time; runner time `check` 9 min 26 s, e2e 3 min 11 s, `secrets` 7 s, so
  12 min 44 s in all (15 billed minutes, rounded up per job). Inside `check`: `pnpm test` 1 min 17 s,
  `vet:pyodide` 12 s, `pnpm test:py` 6 min 22 s. Before Session 4: `check` 16 min and e2e 9 min on a cold
  run, 57 min on d1feee4. A cold run (any change to `RESULT_SOURCES`) still costs `check` about 21 min. `pnpm
  test:py` is now the longest step and never uses the Actions cache (each run has a fresh `VET_CACHE`); it is
  the next thing to cut if CI must get faster.
- Session 4 review finding 5: `vet-pyodide.mjs` compares hidden expected values as exact repr text, not with
  the case's comparison (`float`, `array`, `frame`). A last-bit float difference between wasm and native maths
  would fail. No item declares `[cases]` yet; fix when World 3 items do (shortcut comment in the script).
- Session 4 review finding 7: spec 15 says the Node job runs from the built bundle; it reads a separate jobs
  file instead, because the bundle holds no solutions. Mutant and rewrite verdicts are not repeated in Pyodide.
  A library version difference cannot be recorded, only fixed. The site note "Written for Python 3.12 and
  newer" is Track B's Task B.2.
- Session 4: the VM cannot reach the Pyodide wheel CDN (jsdelivr answers 403 through the proxy), so locally
  `pnpm vet:pyodide` reports the 129 World 3 jobs as "could not load"; CI runs all 695.
- Session 4: `test_a_job_that_fills_memory_stops_early` took 15.04 s once in the VM against its 15 s bound
  while other work ran (13.9 s alone). It passes on CI; a slower runner could flake it.
- Session 4: the older Pythons' patch versions are not in the cache key (shortcut comment in `cache.py`).
- Session 3: the GitHub access problems of Sessions 1 and 2 are gone: `origin` pushes and CI runs on every
  push.
- Session 3: CI time. A framework change still means a cold run of the new checks in both jobs (about 7 min each
  on GitHub), and `pnpm test:py` is about 2.5 times slower than before Session 3
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
- Session 6 (cloud): Tasks 6.1 to 6.3 in `PLAN.md`. Correction from the owner: GitHub dispatches a workflow only
  when its file is on the default branch, and `vet-models.yml` exists only on `test-framework`. So trigger it with a
  push: commit a request file under `vet/requests/` and let the workflow run `on: push` for `paths: vet/requests/**`
  (keep `workflow_dispatch` for after the merge); read the results from the run's artifact with `gh api`, then
  commit them. Secret `DEEPSEEK_API_KEY`, DeepSeek V4.1 Flash only, with the plan's call caps.
- A new rule's check goes in `CHECKS` with its rules (`tools/vet/run.py`); a check that reruns code many times belongs
  in `SLOW_RULES`, and code that shapes a cached result belongs in `RESULT_SOURCES`.
- Track B Task B.3 can merge `test-framework` into `report-button`.
