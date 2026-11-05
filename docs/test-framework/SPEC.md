# Content test framework: design

Date: 2026-11-03. Status: approved by the owner on 2026-11-03.
Built by Claude Code cloud sessions (about $100 of budget, 2026-11-04 and 2026-11-05).

## Why

Every lesson, task and boss in Code Village is written by AI. The owner can review only so much and can
run only a few end-to-end scenarios by hand. The site goes public soon, and three kinds of error must not
reach learners:

1. a lesson that teaches something false;
2. a Check that accepts a wrong answer;
3. a Check that refuses a right answer ("it worked in VS Code, Check refused" is real classmate feedback).

The answer is not "more agent review passes". It is a framework where nothing counts as true unless it ran,
where every judgment that cannot be run is pinned to the exact text it judged, and where the framework
proves on planted bugs that it catches each kind of error. A new world must get all of it by adding content
files only, with no test code.

## What exists today (build on it, keep every guard)

- `tools/content_check.py` (623 lines) checks all content in CPython 3.14 (pinned numpy 2.4.6, pandas
  3.0.2, scikit-learn 1.8.0, ruff 0.17.0, run through `uv`) and writes `src/content/bundle.json`, which the app
  loads. `pnpm content` runs it; `pnpm test` runs it before Vitest.
- `py/harness.py` runs learner code and tests (the same file runs in the browser under Pyodide).
- Guards in place (see `content/README.md`): `example`/`predict` blocks show real output; `claim` blocks back
  a sentence with asserts; solutions pass, starters fail; `wrong/*.py` must fail; ruff on solutions; hints
  must not quote or rename the answer; `strict = true` for exact-format tasks.
- `content/README.md` ends with a manual review checklist. **This framework turns that checklist into
  machine checks.**
- `tools/test_content_check.py`, `tools/test_harness.py`, `tools/fixtures/good/`.
- Browser: Pyodide 314.0.7 (Python 3.14.2), runner in `src/runner/` (`worker.ts` loads numpy, pandas, scipy,
  scikit-learn on demand). Model solutions never reach the browser (`worker/src/mcp.ts:68`); tests do.
- Worker API on Cloudflare (`worker/src/`): D1, Turnstile, rate limits in `limits.ts`.
- CI (`.github/workflows/ci.yml`): a `check` job (lint, prettier, `pnpm test`, typecheck, `test:py`,
  `test:worker`, build) and an `e2e` job (Playwright, 39 tests). About 6 minutes. Repo is private, so
  Actions minutes are limited.
- Size today: 3 worlds, 34 lessons, 9 bosses, 208 solutions (tasks, variants, boss stages), only 14
  `wrong/*.py` files.
- Checked during the design review: Pyodide 314.0.7 ships numpy 2.4.6, pandas 3.0.2 and scikit-learn 1.8.0,
  the same as the CPython pins. The level 9 and level 11 invariants already live in
  `src/learning/curve.test.ts`. `bundle.json` holds no solutions, so checks that need solutions read the
  content files.

## Goals

The bar, in the owner's words: as gapless as possible. Each failure class below gets a mechanical check.

### A. Lessons that teach something false

1. **Every runnable statement runs.** Already true for `example`, `predict`, `claim`. Keep. Reject any untyped
   Python fence.
2. **Every `remember` bullet is backed.** These are what learners revise from. A bullet that states a
   runnable fact must point to a `claim` (by id) that asserts it. A bullet that is advice ("prefer having a
   part to being one") gets a ledger entry with status `advice` instead (see 4), and the ledger review
   checks that it really is advice and not an untested fact. A bullet with neither is a failure.
3. **Several Python versions.** Every example, predict, claim, solution, starter, `wrong/` and `right/` file
   runs on CPython 3.12, 3.13 and 3.14 and on Pyodide 314.0.7. Output or verdict that differs between them
   fails, unless the block declares the version it needs and the lesson says so in the text. The site gets a
   one-line note: "written for Python 3.12 and newer" (owner: 3.12 is the oldest supported version).
4. **A claims ledger for sentences that cannot run.** Every sentence in lesson prose, task prompts, hints,
   boss text and stage prompts has a ledger entry holding a fingerprint of the normalized sentence and one
   status:
   - `claim:<id>`: backed by a runnable `claim`;
   - `doc:<url#anchor>`: backed by the official Python docs (3.12 or newer); CI checks the anchor exists
     against a pinned copy of the docs inventory (`objects.inv`);
   - `simplification:<reason>`: a deliberate teaching simplification, reviewed as such;
   - `advice`: a recommendation, not a statement about how Python behaves;
   - `not-a-fact`: instructions, story, encouragement.
   A missing or stale entry (fingerprint mismatch) fails CI. Editing one word re-opens that sentence.
5. **How ledger entries get made.** Two model families review each new or changed sentence, with its
   paragraph, independently. Family one is DeepSeek V4.1 Flash (`deepseek/deepseek-flash`), called by a
   script in a GitHub Actions job. Family two is Claude: a fresh Sonnet 5.5 reviewer subagent in the cloud
   session, which never sees DeepSeek's answers. (Owner: the Z.AI key is nearly empty, so GLM is not used;
   DeepSeek is the funded key.) Each returns a status, a truth verdict for Python 3.12+, and, where the fact
   is runnable, a proposed assert. Proposed asserts are executed. An entry is accepted automatically only
   when both families agree and any proposed assert passes. Claude wrote the content, so Claude agreeing
   alone proves little; the independent DeepSeek verdict is what makes agreement count. Everything else
   (disagreement, a "false" verdict, a failing assert) goes to a triage list the owner settles. Accepted
   runnable facts become `claim` blocks, so the judgment layer keeps shrinking. The gap report counts
   non-runnable factual sentences per lesson.

### B. Check accepts a wrong answer

6. **Hidden cases.** Each task, variant and boss stage declares its inputs in its TOML (one short entry: the
   function or class under test and the type and range of each argument; for whole programs, the typed input
   lines). At build time the framework generates about 100 small, readable inputs, always including the edge
   cases (0, empty, one item, the limits, ties), seeded so the bundle is reproducible. It computes the
   expected results by running the model solution **in Pyodide** (the learner's runtime) and cross-checks
   them against CPython 3.12 to 3.14. The bundle ships inputs and expected results only, never the
   solution.
   - Classes: random sequences of method calls, comparing return values, raised exception types and
     declared attributes.
   - Inputs on which the model solution raises are either expected-raise cases (only when the prompt names
     the error) or excluded from generation.
   - Arguments the task mutates are compared after the call when declared.
   - Tasks with several right answers ship a small validity rule (a function in `tests.py` that judges an
     answer for an input) instead of one expected value.
   - Tasks that cannot have hidden cases (randomness, for example) declare why; they are counted in the gap
     report.
7. **Check runs the hidden cases in the browser** after the visible tests. On a mismatch the learner sees
   the smallest failing case, for example: "We also tried `larger(3, 7)`: expected 7, your code returned 3."
   (Owner's choice: show the case.) Target: no more than about one second added to a typical Check; measure
   it.
8. **Mutation testing.** The framework breaks each model solution automatically (comparison and arithmetic
   swaps, constants off by one, `and`/`or`, dropped `not`, deleted statements, shifted range and slice
   bounds, swapped arguments, `is`/`==`, `in`/`not in`, `break`/`continue`, wrong return value, and more).
   Every broken version must fail the visible tests plus the hidden cases. A survivor fails CI and the report
   shows an input where it differs from the model solution. A broken version that agrees with the model
   solution on a large fuzz set (thousands of inputs inside the declared input space) is listed as
   equivalent instead of failing. Broken versions killed only by hidden cases are reported as "visible tests
   could be stronger" (warning, not failure). Keep the broken versions as structured data: a later "Spot the
   bug" mode will reuse them.

### C. Check refuses a right answer

9. **Equivalent rewrites.** The framework rewrites each model solution in ways that keep its behavior:
   renamed local variables, loop and comprehension swapped, `for` and `while`, f-string and concatenation,
   `x += 1` and `x = x + 1`, `if`/`else` and a conditional expression, an extracted helper function, an
   added docstring or debug `print` (function tasks only, unless the task checks printing). Every rewrite
   must pass visible tests and hidden cases. A failure means a test is too strict.
10. **`right/*.py`**, the mirror of `wrong/`: hand-written alternative correct answers that must pass.
11. **Declared comparison rules.** Tests compare results only through declared rules (exact, order ignored,
    float tolerance, forgiving text as today, `strict` exact text). A test may not inspect how the code is
    written, with one declared exception below. Parameter names count as part of the task only when the
    prompt names them.
11b. **Required constructs.** Some prompts ask for a way of writing the code, not only a behavior ("put
    `@property` above the method", "call `super().__init__(name)`", "give `sorted` a key function"). Such a
    task declares the construct as a required feature, using the feature ids of 13. Check verifies it with
    the same detectors and says which construct is missing. The prompt must name every required feature,
    and the lesson must teach it. Rewrites (9) that remove a required feature are expected to fail and do not
    count as a refused right answer. Undeclared construct requirements in prompts are a gap.

### D. A prompt that can be read two ways, and solutions that share a mistake with their tests

12. **Blind solvers.** DeepSeek V4.1 Flash solves every task several times (varied sampling and prompt
    phrasing) from what the learner sees at that point (lesson text, prompt, starter), never the tests or
    solution. Their code is run, never trusted:
    - fails visible tests but passes every hidden case: flagged as a probably too strict test;
    - fails hidden cases: goes to the triage list (prompt ambiguous, or model wrong); the decision is stored
      with the task fingerprint, so changing the prompt re-opens it;
    - passes: compared with the model solution on the large fuzz set. Disagreement means one of the two is
      wrong (N-version check).
    Runs in a GitHub Actions job with `DEEPSEEK_API_KEY` as a secret, only for tasks whose fingerprint changed,
    with a hard cap on calls per run. Model calls happen only in Actions, never in a cloud session (cloud
    sessions have no keys and limited network). The job uploads its results as an artifact; a session
    commits them to the branch, so CI runs on them (pushes made with the Actions token start no CI). Sessions
    start the job through the REST API (`gh api .../dispatches`), since `gh` commands that use GraphQL are
    blocked in cloud sessions. Results and triage decisions are stored in the repo, keyed by fingerprint.
    CI fails when a task has no current run or has untriaged results. Language model output is never
    re-judged on every CI run. The ledger review script (5) runs the same way.

### E. Progression

13. **Nothing is used before it is taught.** A vocabulary file maps feature ids to detectors over the syntax
    tree: syntax (comprehension, lambda, class, f-string, `try`, `with`, `yield`, `global`, starred
    unpacking), every builtin and every method of the core types, and every import. Each lesson declares the
    features it teaches. Every solution, starter, `wrong/`, `right/`, example, predict and code in a hint
    may use only features taught in that lesson or earlier (world, region, lesson order). A feature the
    vocabulary does not know fails, so the vocabulary stays complete.
14. **Progression invariants as tests.** XP totals against the level table (today a clean run reaches level
    9 and every hard mode reaches the level 11 cap), every gate's key boss exists, every task folder is
    placed, every concept has at least 3 tasks and a gotcha. Keep the ones that exist, add the missing ones.

### F. Browser and wiring

15. **Pyodide runs from the built bundle.** A Node job loads the built `bundle.json` and the same
    `py/harness.py` in the `pyodide` npm package at the site's version and runs every check above that has
    a runtime verdict. Package versions inside Pyodide are compared with the CPython pins; a difference
    fails until the pins match or the difference is recorded.
16. **Generated browser tests.** One Playwright spec built from the bundle: for every task and variant, the
    solution passes, the starter fails, one `wrong/` answer fails with its message, and one hidden-case
    failure shows the case message. Every boss: a full run through its stages with the solution, and hard
    mode. Pull requests run only the items whose fingerprints changed plus a fixed sample. **CI budget:** the
    repo is private on GitHub Free, so 2000 Actions minutes a month for everything. A pull request run should
    stay around 10 minutes. The full browser sweep runs on manual dispatch and before a release, not on every
    push to `dev`. One setting moves the full sweep to every `dev` push if the repo goes public or the account
    gets Pro (both lift the minutes limit or raise it). Shard it.

### G. What nobody imagined (after launch)

17. **"Report a problem" button** on every lesson and task: sends the lesson or task id, the learner's
    current code, an optional message and the build id. The worker stores it in D1 and opens a GitHub issue
    (fine-grained token with issues write access, as a worker secret), deduplicated by task and normalized
    code hash, with a daily cap on new issues (above it, store only). Turnstile and the existing rate limits
    apply.
18. **Automatic report.** When a learner's code passes every hidden case but fails a visible test, the
    browser sends the task id, the code, the failing test's message and the build id, fully anonymous (no
    nickname, no user id), at most once per task per session. A line under the editor says what is sent and
    that it is used to improve the site. (Owner: both 17 and 18, anonymous, it is "training data".)

### H. The framework proves itself

19. **Canaries.** For every rule, small fixture content with exactly one planted defect, and a test that the
    checker reports exactly that rule (and the existing `good` fixture reports nothing). Language model calls
    in canary tests use recorded responses.
20. **Held-out canaries.** A reviewer (a fresh subagent that did not build the rules) writes new planted
    defects into a separate folder, at least two per failure class, without reading the existing canaries or
    the framework's source. No round waits on the owner. Each miss becomes a new rule with its canary. Rounds
    repeat until one full round has no miss. This is the "works well" bar.
21. **Flags are real.** When the framework first runs on today's content, a sample of its flags in every
    rule is checked by hand (by the session) and confirmed real. A rule with false alarms is fixed before the
    gap list is written.

### I. Known gaps

22. **A tracked gap list.** One file lists every current gap as rule id, item id and fingerprint. CI fails
    on a gap that is not in the list and on a list entry that no longer exists, so the file is always exact.
    A pull request may add entries only for a rule introduced in that same pull request. The list can only
    shrink otherwise. A generated summary per world (counts per rule) goes to the CI job summary.

### J. Another language later

23. **One adapter per language**, a plain module with four jobs: run code and tests, break code (mutations),
    rewrite code (equivalent forms), list the features code uses. The rule engine calls the adapter by file
    extension. Build the Python adapter only. A JavaScript village later adds its own adapter and gets every
    rule above unchanged.

## Non-goals

- No new lessons, no world refactor, no "Spot the bug" mode, no JavaScript adapter in this build.
- No language model in the per-pull-request CI path. Only the ledger and blind-solver jobs call models, on
  changed items, and their results are pinned.
- Not judging how well a lesson teaches, only whether it is true and whether its checks are right.
- Villager chit-chat lines (`src/village/lines.ts`) and tutor answers are out of scope.

## Anti-goals (it would be a failure even if it technically worked)

- **Flaky.** Random failures teach people to ignore red. Everything is seeded and deterministic; model output
  is pinned.
- **False alarms.** Every rule has a canary and a clean fixture, and its flags on real content are sampled
  (21).
- **Painful to author.** Declarations stay short, and every failure says what to add or change, in which
  file.
- **So slow or costly that it gets skipped.** Pull requests run what changed. The full sweep runs where it
  matters.
- **A slower Check for learners.** See the target in 7.

## Constraints

- Project rules (`CLAUDE.md`): Svelte, TypeScript strict, pnpm, ESLint and Prettier (fix, never disable),
  Vitest, named exports. Python through `uv` with pinned versions. Use the `clean-code-ts` and
  `clean-code-python` skills.
- Tests run on GitHub CI, not the owner's Mac. Locally, only quick targeted checks.
- Branch `test-framework` off `dev`, in `.claude/worktrees/test-framework`. One pull request into `dev`,
  kept open; **the owner merges, never the session.** No em or en dashes in commit or pull request text (a
  hook enforces it).
- **Commit small and often** (owner: the cloud runs with less supervision than local work). Commit every
  sub-step whose own quick check passes: one rule with its canary, one generator, one fix. Each commit is
  a working state with a message that says what and why, so any bad step can be reset alone. Push at every
  step boundary and at least every few commits, so a session that dies loses little. CI cancels the older
  run on each push (`cancel-in-progress`), but every push to the open pull request still costs a run of
  Actions minutes: do not push after every single commit.
- Model solutions never leave the server. Hidden cases ship inputs and expected results only; validity rules
  ship as code that judges an answer, not as a solution.
- Oldest supported Python: 3.12.
- Cloud sessions see only what is committed. This design and the plan are committed on the branch under
  `docs/test-framework/` (force-added, since `/docs/` is ignored). `gh pr` and `gh issue` do not work there
  (GraphQL is blocked), so the pull request is opened from the cloud interface.
- Nobody edits content on `dev` during the build (owner's word, not a formal freeze). If `dev` changes
  anyway, merge `dev` into the branch and regenerate the gap list.

## Quality setup for cloud sessions (done locally before the cloud run, as the first commits of the branch)

Cloud sessions load the repo's committed `CLAUDE.md`, `.claude/rules/`, `.claude/skills/`, `.claude/agents/`
and the hooks in `.claude/settings.json`, and nothing from the owner's machine (no global `CLAUDE.md`, user
skills, plugins or hooks; plugins the repo declares are not installed either). Today the project's
`CLAUDE.md`, `AGENTS.md` and `.claude/agents/` are excluded from git, so a cloud session would see no rules at
all. Before the run:

- Commit the project `CLAUDE.md` and its `AGENTS.md` link (force-added; `.git/info/exclude` keeps hiding
  them from the owner's other checkouts until the branch is merged).
- Commit `.claude/rules/standards.md`: the owner's global rules that apply here (no em or en dashes in any
  prose, plans are plans, never merge or force-push or delete branches, commit only at verified checkpoints,
  tests on CI, smallest complete change, clean code), without the machine-specific parts.
- Commit copies of the skills the work needs into `.claude/skills/`: clean-code-core, clean-code-ts,
  clean-code-python, self-review, test-quality, ponytail, verification-before-completion,
  test-driven-development. (executing-plans is left out: it points at skills the cloud does not have; the
  plan's "How every cloud session runs" replaces it.)
- Commit hooks in `.claude/settings.json`: block merges, pushes to `dev` or `main`, force-pushes, branch
  deletion and the REST merge endpoint, always in the cloud (on the owner's machine the owner's own guard
  does this, with its "merge" override); block em and en dashes in
  commit and pull request text; and a stop hook that refuses to end a turn while lint, typecheck or ruff fail
  on the files the session changed. Branch protection is not available for a private repo on GitHub Free,
  so these hooks are the guard.
- **Secret scanning.** GitHub's own secret scanning is off (not available for a private repo on Free) and CI
  has no scanner. A gitleaks scan of the whole history on 2026-11-03 found only 4 fake tokens in
  `worker/test/auth.test.ts` (test fixtures). Add a hook that runs gitleaks on the staged changes before
  every commit and blocks on a finding, with those fixtures allowlisted. Step 1 adds the same scan to CI,
  over the full history, on every pull request and push.

In the build itself:

- Step 1 adds CI quality gates: wide ruff rules and strict type checking on all Python in `tools/` and `py/`
  (existing code brought up in the same step), complexity limits, a coverage floor on the framework code,
  and a dead-code check.
- Every step ends with a fresh reviewer subagent that reads only the diff, the rules and this design; its
  findings are fixed before the next step.
- When the pull request is ready, the owner runs `two-desk-review` locally, with the full setup, against
  this design and the standards, before saying "merge".

## Owner steps (only the owner can do these)

- Done 2026-11-03: `DEEPSEEK_API_KEY` added as an Actions secret. DeepSeek runs V4.1 Flash (owner: cheaper
  than V4 Pro and better). No Z.AI key.
- Create a fine-grained GitHub token with issues write access on `code-village` and set it as a worker secret
  with wrangler (needed by 17).
- Read and settle the triage lists (5, 12) when sessions hand them over.
- Optional: the GitHub Student Pack gives Pro, which allows branch protection on a private repo and more
  Actions minutes. Going public is undecided; the framework works either way.

## Order of work for the cloud sessions

Each step lands with its rules, its canaries and green CI, so stopping anywhere leaves a working subset.

1. Rule engine skeleton, gap list mechanism (22), canary harness (19), Python adapter seam (23).
2. Hidden cases: declarations, generator, Pyodide expected values, bundle, Check in the browser (6, 7).
3. Mutation testing and equivalent rewrites, `right/` (8 to 11).
4. Versions and Pyodide from the bundle (3, 15).
5. Feature vocabulary and progression (13, 14).
6. Claims: `remember` backing, ledger, review script, docs anchors (2, 4, 5).
7. Blind solvers job (12).
8. Generated browser tests and the CI layout (16).
9. Report button, automatic report, worker endpoint, GitHub issues (17, 18).
10. Held-out canary rounds until one round has no miss (20); confirm flags on real content (21).
11. Write the gap list for today's content, with the per-world summary.
12. Fix gaps, worst first: wrong answers that pass, right answers refused, false claims, ambiguous prompts,
    then missing declarations and ledger entries. Stop with about $5 left and write a handoff note (intent,
    state, decisions, next steps, files) in the pull request description.

## After this build (owner's order, not in scope)

Owner and Claude finish the gap list, go public, add the "Spot the bug" mode (built on the stored broken
versions), then the world refactor: W1 intro, W2 OOP basics, W3 going further (deeper OOP, power tools,
testing, the craft), W4 libraries and towards AI, W5 inside AI. Then a JavaScript village.

## Left to the builder

File names and syntax of declarations and the ledger, generator internals, the exact mutation and rewrite
lists (at least those named above), number of blind-solver attempts, fuzz set size, how results are stored,
CI sharding, issue labels. Every choice must keep the goals, anti-goals and constraints above.
