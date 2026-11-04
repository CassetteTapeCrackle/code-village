# Content Test Framework Implementation Plan

> **For agentic workers:** follow "How every cloud session runs" below to implement this plan task by
> task, one **Session** per fresh cloud session. Steps use checkbox (`- [ ]`) syntax for tracking. Tick boxes in
> this file as you go and commit the ticks with the work.

**Goal:** A content test framework that proves, by running code, that every lesson is true and every Check
accepts right answers and rejects wrong ones, and that a new world gets all of it from content files alone.

**Architecture:** A typed Python package `tools/vet/` holds a rule engine. Each check is a module that turns
the loaded content into `Finding`s. One language adapter (Python) runs, mutates, rewrites and scans code.
`tools/content_check.py` stays the entry point (`pnpm content`): it runs `vet`, compares findings with the
tracked gap list `vet/gaps.toml`, and writes the bundle. The browser gains hidden cases (inputs and expected
results computed at build time). Model calls (DeepSeek) run only in a GitHub Actions job whose results a
session commits. Canary fixtures prove each rule fires.

**Tech Stack:** Python 3.14 via `uv` (pinned libraries), `ast`, mypy strict, ruff; Pyodide 314.0.7 in Node;
TypeScript strict, Svelte, Vitest, Playwright; Cloudflare Worker with D1; GitHub Actions.

**Spec:** `docs/test-framework/SPEC.md` (committed copy of the approved design). Read it fully before Session 1
and keep it open. This plan argues from it; item numbers like (S6) point at its sections.

## Global Constraints

- Oldest supported Python: 3.12. Site runtime: Pyodide 314.0.7 (Python 3.14.2).
- Pins: numpy 2.4.6, pandas 3.0.2, scikit-learn 1.8.0, ruff 0.17.0. Pin every new tool exactly (mypy,
  coverage, gitleaks) at its current release and record the version in the commit message.
- Models: DeepSeek V4.1 Flash only (`deepseek/deepseek-flash`; API model id read from repo variable
  `DEEPSEEK_MODEL`, default `deepseek-flash`, verified against `GET https://api.deepseek.com/models` at job
  start). Secret: `DEEPSEEK_API_KEY`. No other provider. Model calls only inside GitHub Actions.
- Claude's half of sentence review: a fresh Sonnet 5.5 subagent in the session that never sees DeepSeek's
  answers.
- Hidden cases: 100 per item by default, seeded by the item id, small and readable. The bundle never holds a
  model solution.
- Exact learner message for a failed hidden case: `We also tried larger(3, 7): expected 7, your code returned 3.`
  (shape: `We also tried {show}: expected {expected}, your code {returned {actual} | raised {Type}: {msg}}.`).
- Check may add at most about one second on a typical task. Measure in Task 2.4.
- CI budget: 2000 Actions minutes a month (private repo, GitHub Free). A pull request run targets about 10
  minutes. Full browser sweep only on manual dispatch and on pushes to `main`.
- No em dash or en dash in any prose, comment, commit or pull request text.
- Never merge into `dev` or `main`, never force-push, never delete a branch. The owner merges.
- Commit every sub-step that passes its own check. Push at every task boundary and before ending a session.
- Project rules: TypeScript strict, no `any`, named exports, ESLint and Prettier fixed never disabled, Vitest
  for TS logic. Python in `tools/` and `py/`: type hints everywhere, mypy strict, ruff (config in
  `tools/ruff.toml`, `py/ruff.toml`). Use the `clean-code-ts` and `clean-code-python` skills.
- Every existing guard keeps working: claims, `wrong/`, ruff on solutions, hint giveaway, `strict`.

## Review Focus

1. A function task whose learner code also prints: hidden cases capture stdout and ignore it unless the task
   checks printing. Test `test_hidden_case_ignores_learner_prints` in Task 2.2.
2. Floats: `0.1 + 0.2` style results must pass under the `float` comparator and messages show a short repr.
   Test `test_float_compare_tolerates_rounding` in Task 2.2.
3. A learner function that mutates its argument must not poison later cases: every case evaluates its
   arguments fresh. Test `test_each_hidden_case_gets_fresh_arguments` in Task 2.2.
4. A misspelled function name must give one readable failure, not 100. Test
   `test_missing_function_reported_once` in Task 2.2.
5. A correct but slow learner solution must not time out on hidden inputs: generated sizes stay small. Test
   `test_generated_sizes_stay_small` in Task 2.1.

---

## How every cloud session runs

1. Read `docs/test-framework/SPEC.md`, this plan, and `docs/test-framework/PROGRESS.md` (the handoff from the
   last session). Work only on your Session's tasks.
2. Per task: failing test, run it, implement, run it, commit. Run the quick gate before each commit:
   `pnpm lint && pnpm typecheck && pnpm test:py`. The full suite (`pnpm test`, `pnpm test:worker`) runs in the
   VM before each push. Playwright runs on CI only.
3. At the end of the Session: dispatch a fresh reviewer subagent with only the Session's diff
   (`git diff <session start>..HEAD`), `.claude/rules/standards.md` and the spec. Fix what it finds, commit.
4. Update `PROGRESS.md` (done, decisions with reasons, open problems, next Session), commit, push.
5. Track B runs in its own session on branch `report-button` (see Track B). Everything else is on
   `test-framework`, in order.

## File map

```
tools/vet/__init__.py            public: vet(), Finding
tools/vet/finding.py             Finding, GapKey
tools/vet/rules.py               loads vet/rules.toml into RULES
tools/vet/model.py               typed content model (World, Lesson, Boss, Item, Block)
tools/vet/load.py                load_content(): files -> model + load findings (moved from content_check.py)
tools/vet/adapter.py             LanguageAdapter protocol, CheckJob, CheckOutcome
tools/vet/python/adapter.py      PythonAdapter (harness subprocess pool, per interpreter)
tools/vet/python/interpreters.py cached venvs for 3.12 and 3.13
tools/vet/python/mutate.py       mutants()
tools/vet/python/rewrite.py      rewrites()
tools/vet/cases/spec.py          declaration grammar -> ArgSpec
tools/vet/cases/generate.py      generate_inputs()
tools/vet/cases/expect.py        hidden_cases() (runs the solution, builds bundle cases)
tools/vet/prose.py               sentences(), fingerprint_text()
tools/vet/ledger.py              ledger load/check/pending/merge CLI
tools/vet/gaps.py                gap list compare/write/base check CLI
tools/vet/changed.py             items touched since a base ref
tools/vet/checks/*.py            one module per rule group, each exposes check(content, adapter)
tools/vet/models/deepseek.py     chat() client with call cap
tools/vet/models/review_sentences.py, blind_solve.py
tools/vet/data/python-3.12-objects.inv
tools/fixtures/canaries/<rule>/<case>/canary.toml
tools/test_vet_*.py              unit tests, one file per module
vet/rules.toml  vet/gaps.toml  vet/blind/<item>.json  vet/triage.md  vet/results/ (model outputs)
content/features.toml            feature vocabulary
content/**/ledger.toml           per lesson and per boss
py/harness.py                    + hidden cases, comparators, feature detection
src/runner/{protocol,client}.ts  + cases in check jobs
src/lesson/TestResults.svelte    + hidden case line
scripts/vet-pyodide.mjs          Pyodide parity runner
e2e/generated.spec.ts, e2e/generated-bosses.spec.ts
.github/workflows/ci.yml (changed), vet-models.yml, e2e-full.yml
```

---

## Session 0 (local, done by Claude in the owner's terminal before any cloud session)

### Task 0.1: Rules, skills and hooks travel with the repo

**Files:**
- Modify: `.gitignore` (track `.claude/rules`, `skills`, `hooks`, `settings.json`, `cloud-setup.sh` and
  `docs/test-framework/`)
- Commit: `CLAUDE.md`, `AGENTS.md` (symlink to `CLAUDE.md`), force-added
- Create: `.claude/rules/standards.md`, `.claude/skills/<name>/SKILL.md` (clean-code-core, clean-code-ts,
  clean-code-python, self-review, test-quality, ponytail, verification-before-completion,
  test-driven-development), `.claude/settings.json`, `.claude/hooks/guard.sh`, `.claude/hooks/quick-gate.sh`,
  `.claude/hooks/secrets.sh`, `.claude/hooks/session-start.sh`, `.claude/cloud-setup.sh`, `.gitleaks.toml`

**Interfaces:**
- Produces: hooks every later session runs under; `.claude/cloud-setup.sh` the owner pastes into the cloud
  environment.

- [x] **Step 1:** Write `standards.md` from the owner's global rules (sections: prose without dashes, plans
  are plans, never merge, commit cadence for the cloud, tests in the VM and on CI, smallest complete change,
  clean code, comments). Leave out everything machine specific.
- [x] **Step 2:** `guard.sh` (PreToolUse on Bash) denies, with a reason on stderr and exit 2: `git merge` while
  on `dev` or `main`; `git push` naming `dev` or `main`; `--force`, `--force-with-lease`, `-f` on push;
  `git push --delete`, `git push origin :x`, `git branch -D` or `-d`; `gh pr merge`; `gh api` paths ending in
  `/merge`; em or en dash inside `git commit` messages or `gh` bodies.
- [x] **Step 3:** `secrets.sh` (PreToolUse on Bash, matching `git commit`) runs
  `gitleaks git --staged --redact --config .gitleaks.toml` and denies on a finding. `.gitleaks.toml`
  allowlists the fake tokens in `worker/test/auth.test.ts`.
- [x] **Step 4:** `quick-gate.sh` (Stop hook): when `stop_hook_active` is false, take the files changed in
  the working tree and in commits not yet pushed; run eslint on the TS and Svelte ones, ruff on the Python
  ones, and `pnpm typecheck` when any TS changed; on failure print the errors and exit 2.
- [x] **Step 5:** `cloud-setup.sh`: install gitleaks (pinned release from GitHub, checksum verified), run
  `uv python install 3.12 3.13 3.14` and warm the uv cache. Must finish in under 5 minutes.
  `session-start.sh` (SessionStart, cloud only) runs `pnpm install --frozen-lockfile` and
  `pnpm content --if-changed`, because the docs put project installs in a hook and typecheck needs the bundle.
- [x] **Step 6:** Verify each hook by feeding it a sample tool input JSON on stdin: a merge on `dev` is denied,
  a commit with an em dash is denied, a staged fake key is denied, a clean commit passes.
- [x] **Step 7:** Commit.

### Task 0.2: Branches and documents

- [x] **Step 1:** `git worktree add .claude/worktrees/test-framework -b test-framework dev`, link `AGENTS.md`.
- [x] **Step 2:** Copy the spec and this plan to `docs/test-framework/SPEC.md` and `PLAN.md`, create
  `PROGRESS.md` (empty sections: Done, Decisions, Open, Next), `git add -f docs/test-framework`.
- [x] **Step 3:** Commit Task 0.1 and 0.2 on `test-framework`, push. Create `report-button` from that commit,
  push.

---

## Session 1: engine, gap list, canaries, CI gates

### Task 1.1: CI quality gates and secret scan

**Files:**
- Create: `tools/ruff.toml`, `py/ruff.toml`, `tools/mypy.ini`
- Modify: `package.json` (`test:py` gets the same `--with` pins as `content` plus mypy and coverage; new
  `lint:py`, `typecheck:py`), `.github/workflows/ci.yml` (new `secrets` job, `lint:py` and `typecheck:py` in
  `check`)

- [x] **Step 1:** Ruff config for `tools/` and `py/`: select `E,F,W,B,SIM,I,UP,C90,PL,RUF,ANN`, max complexity
  10. Solution lint keeps `LINT_RULES` (content folder has no config, so nothing changes there; assert this by
  running `pnpm content` unchanged).
- [x] **Step 2:** `secrets` job: checkout with `fetch-depth: 0`, pinned gitleaks binary, `gitleaks git
  --redact --config .gitleaks.toml`. Runs on every pull request and push.
- [x] **Step 3:** `pnpm lint:py` and `pnpm typecheck:py` (mypy strict over `tools/vet` and `py/`) pass. Bring
  `py/harness.py` up to strict types now; `tools/content_check.py` is shrunk in Task 1.3 instead of typed.
- [x] **Step 4:** Coverage: `test:py` runs under `coverage` and fails under 90 percent line coverage for
  `tools/vet`. Dead code: `vulture tools/vet py --min-confidence 80` in `lint:py`.
- [ ] **Step 5:** Push, confirm the CI run is green, commit any fixes.

### Task 1.2: Findings, rules and the adapter seam

**Files:**
- Create: `tools/vet/__init__.py`, `finding.py`, `rules.py`, `adapter.py`, `python/adapter.py`,
  `vet/rules.toml`, `tools/test_vet_adapter.py`

**Interfaces:**
- Produces:
  - `@dataclass(frozen=True) class Finding: rule: str; item: str; fingerprint: str; message: str; path: str`
  - `@dataclass(frozen=True) class GapKey: rule: str; item: str; fingerprint: str` and `Finding.key -> GapKey`
  - `vet/rules.toml`: `[rule.<id>] summary = "...", severity = "<one of: wrong-accepted, right-refused,
    false-claim, ambiguous, progression, wiring, data>"`. `RULES: dict[str, Rule]` loads it.
  - `adapter.py` holds every type shared across tasks, defined now with the shapes later tasks fill:
    `HiddenCase`, `CaseInput`, `CaseValue` (Tasks 2.1 and 2.2), `Required` (`{id, detect, say}`, Task 5.3),
    `Mutant` (Task 3.1), `Rewrite` (Task 3.3). Later modules import them from here.
  - `@dataclass(frozen=True) class CheckJob: code: str; tests: str; strict: bool = False;
    cases: tuple[HiddenCase, ...] = (); requires: tuple[Required, ...] = ()`
  - `CheckOutcome = TypedDict` matching the harness result: `error: str | None`, `results:
    list[TestResultDict]` where `TestResultDict` has `name, passed, message, hidden`; `None` means timeout.
  - `class LanguageAdapter(Protocol): extension: str; def check(self, jobs: Sequence[CheckJob]) ->
    list[CheckOutcome | None]; def expect(self, code: str, cases: Sequence[CaseInput]) -> list[CaseValue];
    def mutants(self, code: str) -> list[Mutant]; def rewrites(self, code: str) -> list[Rewrite];
    def features(self, code: str) -> frozenset[str]`
  - `PythonAdapter(python: Path | None = None)`: `check` runs jobs in a thread pool of harness
    subprocesses (the current `harness()` moved here, `LIMIT = 30` seconds). Unimplemented methods raise
    `NotImplementedError` until their tasks land.

- [x] **Step 1:** Tests: `test_check_passes_solution`, `test_check_reports_timeout_as_none`,
  `test_check_runs_jobs_in_parallel` (two 1-second sleeps finish in under 1.8 seconds),
  `test_rules_toml_has_severity_for_every_rule`.
- [x] **Step 2:** Run `pnpm test:py`: they fail.
- [x] **Step 3:** Implement the files above.
- [x] **Step 4:** Run: pass. Commit.

### Task 1.3: Move today's checks into the engine, behavior unchanged

Use the `refactor-safely` approach: move code, change nothing it does, tests green after every move.

**Files:**
- Create: `tools/vet/model.py`, `tools/vet/load.py`, `tools/vet/checks/{solutions,wrong,hints,claims,style,
  concepts,ids,bosses,worlds,libraries}.py`, `tools/vet/run.py`
- Modify: `tools/content_check.py` (thin entry), `tools/test_content_check.py` (imports only)

**Interfaces:**
- Produces: `load_content(root: Path) -> tuple[Content, list[Finding]]`; every check module exposes
  `def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]`; `CHECKS: list[CheckFn]` in
  `run.py`; `vet(root: Path, adapter: LanguageAdapter | None = None, only: frozenset[str] | None = None) ->
  list[Finding]`. `Content` has `worlds, lessons, bosses, concepts` and `items()` yielding every `Item`
  (task, variant, boss stage, boss hard tests) with `id, kind, folder, prompt, starter, solution, tests,
  strict, wrong, right, decl, requires`. Item fingerprint: sha256 over its files and its lesson text, first
  12 hex digits.
- Every existing problem string becomes a Finding with a rule id in `vet/rules.toml` (for example
  `solution-fails`, `starter-passes`, `wrong-passes`, `hint-giveaway`, `claim-fails`, `field-missing`).

- [x] **Step 1:** Before moving anything, run `pnpm content` and save its output and `bundle.json` hash.
- [x] **Step 2:** Move one check at a time; after each, `pnpm test:py` and `pnpm content` give the same
  output and the same bundle hash. Commit after each move.
- [x] **Step 3:** `content_check.py` keeps its CLI (`--content`, `--out`, `--no-version-check`,
  `--if-changed`) and output lines, and joins the `typecheck:py` scope (mypy strict) once it is thin.

### Task 1.4: The gap list

**Files:**
- Create: `tools/vet/gaps.py`, `vet/gaps.toml` (empty list), `tools/test_vet_gaps.py`
- Modify: `tools/content_check.py`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `load_gaps(path: Path) -> set[GapKey]`; `compare(findings: Iterable[Finding], gaps: set[GapKey])
  -> GapDiff` with `new: list[Finding]`, `stale: list[GapKey]`, `known: list[Finding]`; CLI
  `python -m tools.vet.gaps --write` (rewrite the list from current findings),
  `python -m tools.vet.gaps --base origin/dev` (fail when an entry was added for a rule that already existed
  at the base: read the base's `vet/rules.toml` and `vet/gaps.toml` with `git show`).
- `vet/gaps.toml` format: `[[gap]] rule = "...", item = "...", fingerprint = "..."`, sorted.
- `content_check.py` fails on `new` or `stale`, prints `known` as a count per rule, and writes a markdown
  summary per world to `$GITHUB_STEP_SUMMARY` when set.

- [x] **Step 1:** Tests: `test_new_finding_fails`, `test_stale_gap_fails`, `test_known_gap_passes`,
  `test_base_check_rejects_added_entry_for_old_rule`, `test_base_check_allows_entry_for_new_rule`.
- [x] **Step 2 to 4:** Fail, implement, pass. Add the `--base` check to the `check` job for pull requests.
  Commit.

### Task 1.5: Canary harness and canaries for every existing rule

**Files:**
- Create: `tools/fixtures/canaries/README.md` (the format), `tools/fixtures/canaries/<rule>/<case>/
  canary.toml`, `tools/test_canaries.py`

**Interfaces:**
- Produces: `canary.toml`: `base = "good"`, `expect = ["rule-id", ...]`, `[[file]] path = "...", text =
  """..."""`, `[[delete]] path = "..."`. `materialize(canary_dir: Path, into: Path) -> Path` copies
  `tools/fixtures/<base>` and applies the patch. Later tasks add one canary per new rule; a rule without a
  canary fails `test_every_rule_has_a_canary`.

- [x] **Step 1:** Tests: `test_good_fixture_has_no_findings`, `test_each_canary_finds_exactly_its_rules`
  (parametrized over folders), `test_every_rule_has_a_canary`.
- [x] **Step 2:** Write one canary for each rule from Task 1.3.
- [ ] **Step 3:** Run, pass, commit, push. End of Session 1 (reviewer, PROGRESS, push).

---

## Session 2: hidden cases

### Task 2.1: Declarations and the input generator

**Files:**
- Create: `tools/vet/cases/spec.py`, `tools/vet/cases/generate.py`, `tools/test_vet_cases.py`
- Modify: `tools/vet/load.py` (read `[cases]` from task, variant and stage TOML), `content/README.md`

**Interfaces:**
- Declaration (`[cases]` table), one of three shapes:
  - function: `call = "larger"`, `args = ["int -50..50", "int -50..50"]`
  - object: `class = "Account"`, `init = ["int 0..500"]`, `methods = { deposit = ["int 1..200"] }`,
    `reads = ["balance"]`, `steps = "2..6"`
  - program: `stdin = ["int 0..120"]`
  - optional in all: `compare` (`exact` default, `unordered`, `float`, `text`, `array`, `frame`), `valid`
    (name of a validity function in `tests.py`), `setup` (import lines), `mutates` (argument indexes compared
    after the call), `raises` (exception names allowed as expected results), `count` (default 100), `none`
    (reason the item has no hidden cases).
- Type grammar: `int A..B`, `float A..B`, `bool`, `str A..B` (ASCII letters and spaces), `word`, `choice
  a|b|c`, `list<T> A..B`, `set<T> A..B`, `tuple<T, U>`, `dict<K, V> A..B`, `optional<T>`, `array<T> A..B`,
  `matrix<T> R..R C..C`, `frame{col: T, ...} A..B`. Default container size cap 12.
- `parse_decl(table: dict[str, object], where: str) -> CasesDecl` (raises `DeclError` with the field and a
  fix); `generate_inputs(decl: CasesDecl, seed: str, count: int) -> list[CaseInput]` where
  `CaseInput(setup: str, expr: str, show: str)` holds Python source (for programs: `stdin: tuple[str, ...]`).
  Output sorted by size (length of `show`), edge cases first: bounds, 0 when in range, empty and single-item
  containers, duplicates, ties. Deterministic for a given seed.

- [x] **Step 1:** Tests: `test_same_seed_same_inputs`, `test_edges_come_first` (for `int -50..50`: -50, 50
  and 0 are among the first five), `test_generated_sizes_stay_small` (no container over 12, no string over
  20), `test_bad_decl_names_the_field`, `test_object_steps_are_valid_python`.
- [x] **Step 2 to 4:** Fail, implement, pass. Document the format in `content/README.md`. Commit.

### Task 2.2: Hidden cases and comparators in the harness

**Files:**
- Modify: `py/harness.py`, `tools/test_harness.py`

**Interfaces:**
- Bundle case (JSON), produced by Task 2.3, read here:
  `{"kind": "expr", "show": "larger(3, 7)", "setup": "", "expr": "larger(3, 7)", "expect": "7",
  "raises": null, "compare": "exact"}` or `{"kind": "program", "show": "typing 34", "stdin": ["34"],
  "expect": "'Adult\\n'", "compare": "text"}`. `expect` is Python source evaluated after `setup`.
- `run_tests(code, tests, strict=False, cases=None, requires=None)`: runs visible tests as today, then the
  hidden cases in order until the first failure. Hidden cases run even when a visible test failed (Track B
  needs to know). Every result dict gains `"hidden": bool`. At most one hidden result is returned: the first
  failing case, or one passing summary entry when all pass.
- New job mode `{"mode": "expect", "code": ..., "cases": [CaseInput...]}` returns
  `{"values": [{"repr": ..., "raises": null | "TypeName"}]}` for building expected results.
- Comparators: `exact` (==, type-aware so `1 != True`), `unordered` (sorted or multiset), `float`
  (`math.isclose`, rel 1e-9, abs 1e-9), `text` (the existing lenient text rules; `strict` tasks use exact),
  `array` (`numpy.allclose` plus equal shape), `frame` (`DataFrame.equals` after `reset_index`), `valid`
  (calls the named function from `tests.py` with the input and the answer).
- Message: exactly the shape in Global Constraints. `actual` uses `repr`, cut to 80 characters with `...`.

- [x] **Step 1:** Tests: `test_hidden_case_message_shape` (expects the exact `larger` sentence),
  `test_hidden_raise_message`, `test_hidden_case_ignores_learner_prints`,
  `test_float_compare_tolerates_rounding`, `test_each_hidden_case_gets_fresh_arguments`,
  `test_missing_function_reported_once`, `test_unordered_compare`, `test_valid_function_compare`,
  `test_expect_mode_returns_reprs`, `test_program_case_compares_output`.
- [x] **Step 2 to 4:** Fail, implement, pass. Commit.

### Task 2.3: Cases in the bundle

**Files:**
- Create: `tools/vet/cases/expect.py`, `tools/vet/checks/cases.py`, canaries for the new rules
- Modify: `tools/content_check.py` (bundle gains `cases` on every task, variant, stage, hard tests)

**Interfaces:**
- Consumes: `generate_inputs`, `PythonAdapter.expect` (implemented here over the `expect` mode).
- Produces: `hidden_cases(item: Item, adapter: LanguageAdapter) -> list[HiddenCase]`. Inputs on which the
  solution raises an exception not listed in `raises` are dropped. Rules: `cases-missing` (no `[cases]` and
  no `none`), `cases-decl-invalid`, `cases-too-few` (fewer than 20 left after drops), `solution-fails-cases`
  (the solution does not reproduce its own expected values, a determinism check run twice).
- `bundle.json` `version` becomes 4. No solution text enters the bundle: test
  `test_bundle_holds_no_solution_text` searches the bundle for each solution's distinctive lines.

- [x] **Step 1:** Tests for each rule via canaries, plus `test_bundle_holds_no_solution_text`.
- [x] **Step 2 to 4:** Fail, implement, pass. Run `vet.gaps --write`: today's content lands as
  `cases-missing` gaps. Commit.

### Task 2.4: Check sends cases in the browser

**Files:**
- Modify: `src/runner/protocol.ts`, `src/runner/client.ts`, `src/runner/worker.ts`, `src/content/types.ts`,
  `src/lesson/TaskPanel.svelte`, `src/screens/{ReviewSession,ExamRun,BossView}.svelte`,
  `src/lesson/TestResults.svelte`, their tests

**Interfaces:**
- `export type HiddenCase = { kind: "expr"; show: string; setup: string; expr: string; expect: string;
  raises: string | null; compare: Compare } | { kind: "program"; show: string; stdin: string[]; expect:
  string; compare: Compare }`
- `export type CheckSuite = { tests: string; strict: boolean; cases: HiddenCase[]; requires: Required[] }`
  (`Required` arrives in Task 5.3; ship it as `[]` now).
- `Runner.check(code: string, suite: CheckSuite): Promise<Outcome<CheckResult>>` replaces
  `check(code, tests, strict)`; bundle exercises satisfy `CheckSuite` structurally, so call sites pass the
  task, variant or stage object. The boss entry gains `hardCases` and `hardRequires`; `BossView` builds the
  hard-mode suite from them.
- `TestResult` gains `hidden: boolean`. `TestResults.svelte` shows the hidden failure as its own line with the
  harness message.

- [x] **Step 1:** Tests: `client.test.ts` sends `cases` in the job; `TestResults.test.ts` renders the hidden
  line; `TaskPanel.test.ts` passes the suite through.
- [x] **Step 2 to 4:** Fail, implement, pass. Measure Check time on the `larger` canary task with 100 cases in
  Pyodide in Node (`scripts/vet-pyodide.mjs` arrives in Task 4.2, so time it with a short Node script now)
  and record it in PROGRESS. Over one second extra: reduce `count` default and record why. Commit, push. End
  of Session 2.

---

## Session 3: wrong answers must fail, right answers must pass

### Task 3.1: Mutants

**Files:**
- Create: `tools/vet/python/mutate.py`, `tools/test_vet_mutate.py`

**Interfaces:**
- `Mutant` (from `tools/vet/adapter.py`): `id: str; operator: str; line: int; code: str; summary: str`
- `mutants(code: str) -> list[Mutant]`, deterministic order, so the later "Spot the bug" mode can regenerate
  the same broken versions from the solution alone. Operators (each its own id): `cmp-swap` (each
  of `< <= > >= == !=` to each other), `arith-swap` (`+ - * / // %`), `const-off-by-one`, `const-zero-one`,
  `bool-swap` (`and`/`or`), `not-drop`, `stmt-delete` (non-final statements), `return-none`,
  `return-first-arg`, `range-bound` (start and stop plus and minus one), `slice-bound`, `args-swap` (two
  positional arguments), `is-eq-swap`, `in-swap`, `break-continue-swap`, `augassign-swap`,
  `method-swap` (`append`/`extend`, `strip`/`lstrip`/`rstrip`, `lower`/`upper`, `sort`/`reverse`),
  `index-shift`. Only mutants that still compile are returned.

- [x] **Step 1:** Tests: one per operator on a small source (for example `cmp-swap` on `if a < b:` yields
  `<=`, `>`, `>=`, `==`, `!=`), `test_mutants_compile`, `test_order_is_stable`.
- [x] **Step 2 to 4:** Fail, implement, pass. Commit.

### Task 3.2: Mutation check

**Files:**
- Create: `tools/vet/checks/mutation.py`, canaries
- Modify: `.github/workflows/ci.yml` (cache `.vet-cache/` keyed by framework source hash)

**Interfaces:**
- For each item: every mutant runs against visible tests plus hidden cases. A survivor is compared with the
  solution on 2000 extra generated inputs (`count=2000`, seed `<item>:fuzz`): identical everywhere means
  `equivalent` (listed in the summary, not a finding); a difference gives rule `weak-tests` with the operator,
  line and the first differing input in the message. Items without `[cases]` report survivors as
  `weak-tests` with the hint "declare [cases] so equivalent mutants can be told apart".
- Mutants killed only by hidden cases go to the summary as "visible tests could be stronger".
- Results cache: `.vet-cache/mutation/<item fingerprint>.json`, skipped when present.
- Budget: the whole content in under 8 minutes on CI's 4 cores with a warm harness. Measure and record.

- [x] **Step 1:** Canaries: `weak-tests` (a task whose tests miss `<=`), an equivalent mutant that must not be
  a finding.
- [x] **Step 2 to 4:** Fail, implement, pass. `gaps --write`. Commit.

### Task 3.3: Equivalent rewrites

**Files:**
- Create: `tools/vet/python/rewrite.py`, `tools/vet/checks/rewrites.py`, `tools/test_vet_rewrite.py`, canaries

**Interfaces:**
- `Rewrite` (from `tools/vet/adapter.py`): `id: str; transform: str; code: str`;
  `rewrites(code: str) -> list[Rewrite]`. Transforms: `rename-locals`, `rename-params` (skipped when the
  prompt names a parameter), `comprehension-to-loop`,
  `loop-to-comprehension`, `for-to-while`, `fstring-to-concat`, `augassign-expand`, `ifelse-to-ternary`,
  `ternary-to-ifelse`, `early-return-to-single`, `extract-helper`, `add-docstring`, `add-debug-print`
  (function tasks only, not when the decl or tests check printing). Each test of a transform asserts the
  rewrite returns the same results as the original on a few calls.
- Check: every rewrite passes visible tests plus hidden cases, else rule `right-refused` naming the transform
  and the failing test. Rewrites that remove a required feature are skipped (Task 5.3 fills `requires`).

- [x] **Step 1:** Tests per transform; canary `right-refused` (tests that compare `str(result)` with spacing
  that a rewrite changes).
- [x] **Step 2 to 4:** Fail, implement, pass. `gaps --write`. Commit.

### Task 3.4: `right/` answers and tests that inspect code

**Files:**
- Create: `tools/vet/checks/right.py`, `tools/vet/checks/test_shape.py`, canaries
- Modify: `content/README.md`

**Interfaces:**
- Rule `right-fails`: a `right/*.py` must pass visible tests plus hidden cases.
- Rule `test-inspects-code`: `tests.py` that uses `inspect`, `ast`, `__code__`, `dis`, `open(` on the
  learner file, or reads source text.
- Rule `right-missing`: an item with fewer than 1 `right/` file. Rule `wrong-too-few`: fewer than 2 `wrong/`
  files.

- [x] **Step 1 to 4:** Canaries, fail, implement, pass. `gaps --write`. Commit, push. End of Session 3.

---

## Session 4: every Python version, and Pyodide

### Task 4.1: CPython 3.12 and 3.13

**Files:**
- Create: `tools/vet/python/interpreters.py`, `tools/vet/checks/versions.py`, canaries
- Modify: `tools/vet/load.py` (fence attribute `min=3.13`), `content/README.md`

**Interfaces:**
- `interpreter(version: str) -> Path`: creates `.vet-cache/py<ver>` with `uv venv --python <ver>` and the
  pinned libraries, returns its python.
- Check: examples, predicts, claims (output and pass), solutions, starters, `wrong/`, `right/` and hidden
  expected values run on 3.12 and 3.13 through `PythonAdapter(interpreter(v))`. Any verdict or output that
  differs from 3.14 gives rule `version-differs`, unless the block or item declares `min` at or above the
  first version where it holds and the lesson text near it names that version (`min-unexplained` otherwise).

- [x] **Step 1 to 4:** Canaries (a predict block whose output differs between 3.12 and 3.14, such as an
  error message whose wording changed; verify the difference on the pinned interpreters before using it),
  fail, implement, pass. Commit.

### Task 4.2: Pyodide parity

**Files:**
- Create: `scripts/vet-pyodide.mjs`, `tools/vet/jobs.py`
- Modify: `tools/content_check.py` (`--jobs-out .vet-cache/pyodide-jobs.json`), `package.json`
  (`vet:pyodide`), `.github/workflows/ci.yml` (step after `pnpm test`)

**Interfaces:**
- `jobs.py` writes every runtime verdict CPython reached: `{id, kind, code, tests, strict, cases, expect:
  "pass" | "fail" | {"output": "..."} | {"values": [...]}}`. The file lives in `.vet-cache/` (gitignored) and
  is never bundled.
- `vet-pyodide.mjs` loads `node_modules/pyodide` (314.0.7) and `py/harness.py`, loads the packages a job
  needs, runs each job, and exits 1 listing every mismatch. It also compares the Pyodide package versions with
  the pins and fails on a difference.

- [x] **Step 1:** Canary: a claim that holds in CPython but not in Pyodide (starting a `threading.Thread`
  works in CPython and raises in Pyodide; verify it first).
- [x] **Step 2 to 4:** Fail, implement, pass. Commit, push. End of Session 4.

---

## Session 5: progression and required constructs

### Task 5.1: Feature vocabulary and detection

**Files:**
- Create: `content/features.toml`
- Modify: `py/harness.py` (`detect_features`), `tools/vet/python/adapter.py` (`features`),
  `tools/vet/load.py` (lesson front matter `teaches`), `content/README.md`

**Interfaces:**
- `content/features.toml`: `[feature.<id>] summary = "...", detect = ["<detector>", ...], words = ["..."]`.
  Detectors: `node:<AstClass>` (for example `node:ListComp`, `node:Lambda`, `node:ClassDef`, `node:Try`,
  `node:With`, `node:Yield`, `node:Global`, `node:Starred`, `node:JoinedStr`), `call:<builtin>`,
  `method:<name>`, `import:<module>`, `decorator:<name>`, `kwarg:<call>.<name>` (for `sorted(key=)`).
- `detect_features(code: str, vocabulary: dict[str, list[str]]) -> set[str]` in `harness.py` (the browser
  needs it in Task 5.3). Any builtin call, method call, import or listed node with no feature id is reported
  as `unknown:<detector>`.

- [x] **Step 1 to 4:** Tests per detector kind, `test_unknown_feature_reported`; fail, implement, pass.
  Commit.

### Task 5.2: Nothing used before it is taught

**Files:**
- Create: `tools/vet/checks/progression.py`, canaries

**Interfaces:**
- Taught set at a point = union of `teaches` of every lesson before it (world order, region, lesson order)
  plus its own. Checked code: solution, starter, `wrong/`, `right/`, examples, predicts, hint code spans, boss
  starter and solution. Rules: `untaught-feature` (names the feature, the file and the lesson that teaches it
  if any), `unknown-feature`, `teaches-missing` (a lesson without `teaches`).

- [x] **Step 1 to 4:** Canaries (a W1 solution using a class), fail, implement, pass. `gaps --write`.
  Commit.

### Task 5.3: Required constructs (S11b)

**Files:**
- Create: `tools/vet/checks/required.py`, canaries
- Modify: `py/harness.py` (`run_tests(..., requires=...)`), `tools/vet/load.py` (`requires = [...]` in item
  TOML), `tools/content_check.py` (bundle `requires`), `src/runner/*`, `src/content/types.ts`,
  `tools/vet/checks/rewrites.py`

**Interfaces:**
- Bundle: `requires: [{"id": "property", "detect": ["decorator:property"], "say": "put @property above the
  method"}]`. `say` comes from `features.toml` (`say` field, added here).
- Harness: when the learner code lacks a required feature, one visible failing result: `Your code works,
  but this task asks you to {say}.` Runs only when all behavior checks pass.
- Rules: `required-untaught`, `required-not-in-prompt` (none of the feature's `words` appear in the prompt),
  `prompt-asks-construct` (heuristic: the prompt contains a feature's `words` but the item does not require
  it; an item may silence it with `construct_words_ok = "reason"`).
- Rewrites drop a rewrite whose features lose a required id.

- [x] **Step 1 to 4:** Canaries and harness tests (`test_required_feature_message`), fail, implement, pass.
  Commit.

### Task 5.4: Wiring invariants

**Files:**
- Create: `tools/vet/checks/wiring.py`, canaries

**Interfaces:**
- Rules: `gate-boss-missing`, `trophy-mismatch`, `task-unplaced` (move from Task 1.3 if already there),
  `concept-too-few-tasks`, `concept-no-gotcha`, `item-id-duplicate`. The level-curve invariants stay in
  `src/learning/curve.test.ts`; add a Vitest test there that reads the built bundle and recomputes the XP
  totals, so new content cannot break the cap silently.

- [x] **Step 1 to 4:** Canaries, fail, implement, pass. Commit, push. End of Session 5.

---

## Session 6: claims and the ledger

### Task 6.1: Sentences and ledger checks

**Files:**
- Create: `tools/vet/prose.py`, `tools/vet/ledger.py`, `tools/vet/checks/ledger.py`,
  `tools/vet/data/python-3.12-objects.inv`, `tools/test_vet_prose.py`, canaries
- Modify: `tools/vet/load.py` (fence `id=` on claims)

**Interfaces:**
- `@dataclass(frozen=True) class Sentence: text: str; where: str; fingerprint: str` (`where` like
  `text:3`, `task:<id>:prompt`, `task:<id>:hint:2`, `remember:0`, `boss:intro`, `stage:<id>:prompt`).
- `sentences(markdown: str, where: str) -> list[Sentence]`: drop fenced code, keep inline code, split on
  `.`, `!`, `?` followed by whitespace, not after `e.g`, `i.e`, a digit or inside backticks.
- `fingerprint_text(text: str) -> str`: sha256 of lowercase text with whitespace collapsed, 12 hex digits.
- `ledger.toml` next to each `lesson.md` and `boss.md`:
  `[[sentence]] fp, text, where, status ("claim:<id>" | "doc:<url>" | "simplification" | "advice" |
  "not-a-fact"), reason, deepseek, claude ("agree" | "disagree" | "false" | "unsure"), decided ("auto" |
  "owner")`.
- Rules: `ledger-missing`, `ledger-stale`, `claim-id-unknown`, `doc-anchor-missing` (URL must be
  `https://docs.python.org/3/...#anchor` and the anchor must be in the pinned inventory),
  `remember-unbacked` (a `remember` bullet whose status is not `claim:` or `advice`), `claim-id-missing` (a
  claim block without `id=`), `fence-untyped` (a Python fence that is not `example`, `predict` or `claim`).
- The docs inventory: download `https://docs.python.org/3.12/objects.inv` once (in the VM if its network
  allows, else in an Actions step that uploads it) and commit it.
- CLI: `python -m tools.vet.ledger --pending <out.json>` writes every sentence without a current entry, with
  its paragraph.

- [x] **Step 1 to 4:** Tests (`test_split_keeps_inline_code`, `test_eg_does_not_split`,
  `test_fingerprint_ignores_spacing`), canaries per rule, fail, implement, pass. `gaps --write`. Commit.

### Task 6.2: DeepSeek in Actions

**Files:**
- Create: `tools/vet/models/deepseek.py`, `tools/vet/models/review_sentences.py`,
  `.github/workflows/vet-models.yml`, `tools/test_vet_models.py` (recorded responses, no network)

**Interfaces:**
- `chat(messages: list[Message], *, temperature: float, cap: CallCap) -> str` over
  `POST https://api.deepseek.com/chat/completions` with `urllib`, three retries with backoff, `CallCap`
  raising once `VET_MAX_CALLS` (default 3000) is reached. Model id from `DEEPSEEK_MODEL`; at start,
  `GET /models` must list it, else exit 1.
- `review_sentences.py --in pending.json --out vet/results/deepseek-sentences.json`: one JSON reply per
  sentence `{fp, status, verdict, reason, assert}` validated against a schema; an invalid or failed reply
  becomes `verdict: "unsure"`.
- Workflow: `workflow_dispatch` with input `job` (`sentences`, `blind`, `both`) on the given ref; uploads
  artifact `vet-model-results`. Sessions start it with
  `gh api repos/CassetteTapeCrackle/code-village/actions/workflows/vet-models.yml/dispatches -f
  ref=test-framework -f 'inputs[job]=sentences'` and fetch it with `gh run download`.

- [x] **Step 1:** Tests: `test_invalid_reply_becomes_unsure`, `test_call_cap_stops`,
  `test_missing_model_exits`.
- [x] **Step 2 to 4:** Fail, implement, pass. Run the workflow once on a 5-sentence sample and record cost and
  time in PROGRESS. Commit.

### Task 6.3: Claude's review, merge and triage

**Files:**
- Create: `docs/test-framework/prompts/review-sentences.md`, `tools/vet/models/merge_sentences.py`
- Modify: `tools/vet/ledger.py`

**Interfaces:**
- The session dispatches one Sonnet 5.5 subagent per lesson with the prompt file and that lesson's pending
  sentences. It writes `vet/results/claude-sentences-<lesson>.json` in the same schema, before the DeepSeek
  results are downloaded.
- `merge_sentences.py vet/results/` : an entry is `decided = "auto"` only when both verdicts are `agree`, the
  statuses match and any proposed assert passes through the harness; an accepted runnable fact also gets a
  `claim` block with a generated id inserted after its paragraph in `lesson.md`. Everything else is appended
  to `vet/triage.md` (sentence, file, both verdicts and reasons, proposed fix) and stays a `ledger-missing`
  gap until the owner decides.

- [x] **Step 1 to 4:** Tests on recorded inputs (`test_disagreement_goes_to_triage`,
  `test_agreement_with_failing_assert_goes_to_triage`, `test_accepted_fact_gets_claim_block`), fail,
  implement, pass. Commit, push. End of Session 6.

---

## Session 7: blind solvers

### Task 7.1: Solve, run, store

**Files:**
- Create: `tools/vet/models/blind_solve.py`, `tools/vet/checks/blind.py`, `vet/blind/` (results),
  canaries with recorded attempts
- Modify: `.github/workflows/vet-models.yml` (`blind` job)

**Interfaces:**
- Input per item: the lesson text up to the task, the prompt and the starter. Five attempts: temperatures
  0.2, 0.6, 1.0, 0.6, 0.2 over two prompt phrasings. Each reply's code runs through the harness (visible
  tests, hidden cases) and passing attempts are compared with the solution on the 2000-input fuzz set.
- `vet/blind/<item-id>.json`: `{fingerprint, attempts: [{code, visible: "pass"|"fail", hidden:
  "pass"|"fail", case: "...", fuzz: "agree"|"differs", input: "..."}], triage: [{attempt, decision:
  "model-wrong"|"prompt-fixed"|"test-fixed"|"solution-fixed", by: "owner"|"session", note}]}`.
- Rules: `blind-missing` (no run for the current fingerprint), `blind-untriaged`, `blind-too-strict` (visible
  fail, every hidden case passes: cannot be triaged as `model-wrong`), `blind-disagrees` (passing attempt that
  differs on the fuzz set).
- A session may triage `model-wrong` only with the failing case quoted in `note`; the owner audits
  `vet/triage.md`, which lists every session triage.

- [x] **Step 1 to 4:** Tests and canaries on recorded attempts, fail, implement, pass. Run the job on 3 items,
  record cost. Commit, push. End of Session 7.

---

## Session 8: generated browser tests and the CI layout

### Task 8.1: Changed items

**Files:**
- Create: `tools/vet/changed.py`, `tools/test_vet_changed.py`
- Modify: `tools/content_check.py` (`--items-out .vet-cache/e2e-items.json`: id, lesson id, task title,
  paths of solution, starter, first `wrong/`, the first mutant killed only by hidden cases)

**Interfaces:**
- `changed_items(base: str) -> set[str] | Literal["sample", "all"]`: from `git diff --name-only
  <base>...HEAD`; content files map to their item ids; changes in `py/`, `src/runner/`, `src/lesson/`,
  `tools/vet/` give `"sample"` (one item per lesson); changes in `e2e/generated*` give `"all"`.

- [x] **Step 1 to 4:** Tests, fail, implement, pass. Commit.

### Task 8.2: Generated specs

**Files:**
- Create: `e2e/generated.spec.ts`, `e2e/generated-bosses.spec.ts`

**Interfaces:**
- Reads `.vet-cache/e2e-items.json` and `VET_ITEMS` (`all`, `sample` or comma ids). One page per lesson; per
  item: solution shows `Passed`; starter does not; the first `wrong/` shows a failing message; the hidden-only
  mutant shows `We also tried`. Bosses: full run through every stage with the solution, then hard mode.
  Uses `showTask`, `typeCode` from `e2e/helpers.ts`.

- [x] **Step 1 to 3:** Write, run on 2 items in the VM if Playwright installs there (else on CI), commit.

### Task 8.3: CI layout

**Files:**
- Modify: `.github/workflows/ci.yml`; create `.github/workflows/e2e-full.yml`

- [ ] **Step 1:** Pull requests: `VET_ITEMS` from `changed.py` against the base. `e2e-full.yml`: manual
  dispatch and pushes to `main`, `VET_ITEMS=all`, 4 shards.
- [ ] **Step 2:** Push and read the run time; record PR run minutes in PROGRESS. Over 12 minutes: move the
  slowest step behind the changed-items filter. Commit, push. End of Session 8.

---

## Track B (parallel session on branch `report-button`)

### Task B.1: Report endpoint and GitHub issues

**Files:**
- Create: `worker/migrations/0003_reports.sql`, `worker/src/routes/report.ts`, `worker/src/github.ts`,
  `worker/test/report.test.ts`
- Modify: `worker/src/router.ts`, `worker/src/limits.ts`, `worker/src/env.ts`

**Interfaces:**
- `POST /api/report` body `{kind: "button" | "auto", item: string, code: string, message?: string, build:
  string, turnstile?: string}`. Button reports need a valid Turnstile token (`deps.verifyHuman`); auto
  reports do not. Both use `takeIpSlot` with new actions `report` and `auto-report`
  (`LIMITS.reportPerIpPerDay = 10`, `LIMITS.autoReportPerIpPerDay = 20`), code at most `MAX_CODE_CHARS`.
- Tables: `reports(id, at, kind, item, code_hash, code, message, build)` and
  `report_issues(item, code_hash, issue, count)`. Auto reports store no nickname and no user id.
- `Deps.openIssue(title: string, body: string, labels: string[]) => Promise<number | null>` over the GitHub
  REST API with secret `GITHUB_ISSUES_TOKEN`; same item and code hash: increment `count`, no new issue.
  `LIMITS.issuesPerDay = 20`; above it, store only.
- Tests with a fake `openIssue`: `dedupes_same_item_and_code`, `daily_issue_cap`, `button_needs_turnstile`,
  `auto_report_has_no_identity`, `rate_limited`.
- The owner sets `GITHUB_ISSUES_TOKEN` with wrangler before deploying; with no token, reports are stored and
  no issue is opened (test `no_token_stores_only`).

- [ ] **Step 1 to 4:** Fail, implement, pass (`pnpm test:worker`). Commit, push.

### Task B.2: Button, notice, version note

**Files:**
- Create: `src/ui/ReportButton.svelte` (+ test)
- Modify: `src/lesson/LessonView.svelte`, `src/lesson/TaskPanel.svelte`, `src/lesson/CodePanel.svelte`,
  `src/net/api.ts`

- [ ] **Step 1:** The button sits on every lesson and task, sends a button report with the current code. The
  line under the editor reads exactly: `If Check looks wrong, we send your code anonymously so we can fix it
  and improve the site.` The lesson footer reads: `Written for Python 3.12 and newer.`
- [ ] **Step 2 to 4:** Component tests, implement, pass. Commit, push.

### Task B.3: Automatic report (after Session 2 is on `test-framework`)

- [ ] **Step 1:** `git merge test-framework` into `report-button` (allowed: not `dev` or `main`).
- [ ] **Step 2:** `src/learning/autoReport.ts`: `shouldAutoReport(result: CheckResult): boolean` is true when
  some visible result failed and the hidden summary passed. At most once per item per session. Tests first.
- [ ] **Step 3:** Commit, push. The owner opens the pull request for `report-button` into `dev`.

---

## Session 9: prove the framework

### Task 9.1: Held-out canary rounds (S20)

- [ ] **Step 1:** Dispatch a fresh reviewer subagent with `docs/test-framework/prompts/heldout-canaries.md`
  (write it now): it may read the spec, `tools/fixtures/canaries/README.md` and `tools/fixtures/good/`, but
  not `tools/fixtures/canaries/*/` or `tools/vet/`. It writes at least two canaries per failure class (spec
  A to H) into `tools/fixtures/canaries-heldout/round-<n>/`, each with `expect` naming the failure class,
  not a rule id.
- [ ] **Step 2:** Run `python -m unittest tools.test_canaries -k heldout`. A canary with no finding is a miss.
- [ ] **Step 3:** Each miss: add or fix a rule, move the canary into `tools/fixtures/canaries/` with its rule
  id, commit per miss.
- [ ] **Step 4:** Repeat with a new round until one round has no miss. Record every round in PROGRESS.

### Task 9.2: Flags are real (S21)

- [ ] **Step 1:** Run the full `vet` on today's content. For every rule with findings, read 3 at random (all
  if fewer) against the content and decide real or false alarm. Record the sample in PROGRESS.
- [ ] **Step 2:** Fix every rule with a false alarm, add a canary for the false alarm in the `good` direction
  (a fixture that must give no finding), re-run, commit, push. End of Session 9.

---

## Session 10: the gap list

### Task 10.1: Write it

- [ ] **Step 1:** Start the `vet-models` job for `both` on all pending sentences and items, run Claude's
  sentence review, merge. Record the cost.
- [ ] **Step 2:** `python -m tools.vet.gaps --write`; commit `vet/gaps.toml` and the per-world summary (as
  `docs/test-framework/GAPS.md`, counts per rule and severity).
- [ ] **Step 3:** Push, CI green. End of Session 10.

---

## Sessions 11 and on: fixing until the budget ends

- [ ] Each session takes the highest severity group left (`wrong-accepted`, then `right-refused`,
  `false-claim`, `ambiguous`, `progression`, `wiring`, `data`), fixes items one at a time (content edits:
  tests, prompts, declarations, `right/`, `wrong/`, ledger entries), removes each fixed gap with
  `gaps --write`, and commits per item. Prompt rewrites that change what a task asks go to `vet/triage.md` for
  the owner instead of being made.
- [ ] Stop when the owner says so. Before the last session ends, write the handoff in PROGRESS and in the
  pull request description: intent, state, decisions, open problems, next steps, files.
