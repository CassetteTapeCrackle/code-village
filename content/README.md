# Writing content

Every lesson, task and boss lives here as plain files. `pnpm content` (`tools/content_check.py`) runs all of
it in the same Python as the browser and fails the build on any problem. The checks below are what keep the
game from teaching something wrong. A rule nothing checks is a rule that will break, so keep them all.

## Layout

```
content/<world>/world.toml
content/<world>/<region>/<lesson>/lesson.md
content/<world>/<region>/<lesson>/tasks/<task>/          task.toml, starter.py, solution.py, tests.py
content/<world>/<region>/<lesson>/tasks/<task>/variants/<variant>/   variant.toml, starter.py, solution.py, tests.py
content/<world>/<region>/boss/                           boss.md, starter.py, solution.py, hard_tests.py
content/<world>/<region>/boss/stages/<n-name>/           stage.toml, tests.py
```

`world.toml` holds a world's words and wiring: `id` (the folder name), `order`, `name`, `area` (the look, drawn in
code in `src/village/areas.ts`), `regions` (a name per region letter), `[building]` (`name`, `place`), `[teacher]`
(`name`, `portrait`) and, for every world but the first, `[key]`: the earlier boss whose trophy opens it (`boss`,
`trophy`, `trophy_name`, `opens`, `gate_hint`). See `content/w2/world.toml`.

Any task, variant or boss folder may also hold `wrong/*.py` (see below).

## A lesson

`lesson.md` starts with `+++` TOML front matter (`id`, `title`, `world`, `region`, `order`, `concepts`,
`teaches`, `remember`, `[loot]`), then Markdown with four kinds of block:

- ` ```python example ` runs at build time; the app shows its real output, never a typed one.
- ` ```python predict ` is the same, but the learner guesses the output first. It must print something.
- ` ```python claim ` backs the sentence just above it with `assert`s. It runs at build time and is
  never shown. Put one after every sentence that states a fact about the language or a library: what a
  function returns, which error appears, a default, a limit. Leave a blank line on both sides.
- `::task <folder>` places a task. Every folder under `tasks/` must be placed.

## A task

- `task.toml`: `id`, `concept`, `kind` (`write`, `fix` or `complete`), `title`, `prompt`, `hints`, `gotcha`.
  Add `strict = true` only when the task teaches exact case, spacing or punctuation (alignment, `repr`): its
  checks then compare text exactly instead of forgiving them. Lenient checks keep a `.` or `,` that sits between
  two digits, so `7.50` stays exact and a decimals task can stay lenient, which forgives a stray `.` at the end of
  a line.
  Every concept needs at least 3 tasks and one gotcha.
- `solution.py` must pass every test, and `starter.py` must fail at least one.
- `tests.py` defines `test_*` functions. They read the learner's names with `learner["name"]`, compare with
  `expect_equal(actual, expected, "the call, as the learner would write it")`, and fail with
  `raise Failure("message")`. A test file that sets `PROGRAM = True` runs the whole program instead,
  with `run_program(["typed", "answers"])` returning what it printed.
- `variants/` hold review versions of the task (same files, `variant.toml` has `id`, `title`, `prompt`).

## A boss

`boss.md` front matter: `id`, `title`, `world`, `region`, `hard_checks`, `[trophy]`, `[hard_trophy]`; the
text below it is the intro. A boss needs 3 to 5 stages (`stage.toml`: `id`, `title`, `prompt`, `hp`), and
`solution.py` must pass every stage's tests and `hard_tests.py`. One boss per region, in a region with lessons. Hard mode only drops the starter code: every rule `hard_tests.py` checks must be stated in the boss
text or a stage prompt, so a player never loses a Check on something the prompt did not say.

## Hidden cases

Visible tests try a few inputs. Hidden cases try about 100 more: the build generates small inputs, runs the
model solution on each, and ships only the inputs and the expected results. Check runs them after the visible
tests and shows the learner the first case that fails, for example
`We also tried larger(3, 7): expected 7, your code returned 3.`

Declare them with a `[cases]` table at the end of `task.toml`, `variant.toml` and each `stage.toml`. A boss's
hard mode reads `[cases]` from the `boss.md` front matter. Pick one of four shapes:

```toml
[cases]                                   # a function
call = "larger"
args = ["int -50..50", "int -50..50"]

[cases]                                   # a class: a fresh object, then 2 to 6 random method calls
class = "Account"
init = ["int 0..500"]
methods = { deposit = ["int 1..200"], withdraw = ["int 1..200"] }
reads = ["balance"]                       # attributes compared after the calls
steps = "2..6"                            # optional, default 1..6

[cases]                                   # a whole program: one typed line per input()
stdin = ["int 0..120"]

[cases]                                   # no hidden cases, and why (counted in the gap report)
none = "the answer is random"
```

Types: `int A..B`, `float A..B`, `bool`, `str A..B` (letters and spaces, length A to B, at most 20), `word`,
`choice a|b|c`, `list<T> A..B`, `set<T> A..B`, `tuple<T, U>`, `dict<K, V> A..B`, `optional<T>`,
`array<T> A..B` (NumPy), `matrix<T> R..R C..C`, `frame{col: T, ...} A..B` (pandas rows). Container sizes are
at most 12 and default to `0..12`. Set items, dict keys, frame columns and `stdin` lines take simple types.

Optional fields:

- `compare`: `exact` (the default for calls and classes), `unordered`, `float` (tolerates rounding), `text`
  (forgiving, like the visible tests; the default for programs), `array`, `frame`.
- `valid = "is_valid"`: for tasks with several right answers, a function in `tests.py` that takes the input
  (the call's arguments as a tuple, or a program's typed lines) and the answer, and says whether the answer
  is right. Calls and programs only.
- `setup`: import lines the inputs need. `array` and `frame` inputs import NumPy and pandas on their own.
- `mutates = [0]`: argument positions the function changes; they are compared after the call too.
- `raises = ["ValueError"]`: errors the prompt names. Inputs that make the solution raise any other error
  are dropped.
- `count`: how many inputs, default 100.

The inputs are seeded by the item id, so every build ships the same ones. Edge cases come first: the bounds, 0,
empty and one-item containers, duplicates and ties. The build fails when an item has no `[cases]`
(`cases-missing`), when the table cannot be read (`cases-decl-invalid`), when fewer than 20 cases are left
(`cases-too-few`), or when the solution does not reproduce its own expected values (`solution-fails-cases`).

## The three guards

1. **Claims** (above): the prose is checked, not only the code.
2. **`wrong/*.py`**: a plausible mistake, written out. Some test must fail it, or the build fails with
   "the tests miss that mistake". Add one whenever a test could be passed by half a solution: one side of a
   range, an edge (0, empty, equal to the limit), an attribute in the wrong place, the wrong `k`. For a boss,
   the mistake must fail at least one stage or the hard tests.
3. **Lint**: every `solution.py` passes ruff (rules in `LINT_RULES`). Model answers are what learners copy.

## Wrong answers must fail, right answers must pass

The build also checks the tests themselves, on every task, variant and boss (a boss counts its stages and hard
mode together):

- **`right/*.py`**: a correct answer written differently from the solution (another loop, other names,
  another library call). It must pass the visible tests and the hidden cases (`right-fails`). Every item needs at
  least one (`right-missing`) and at least two `wrong/*.py` (`wrong-too-few`).
- **Mutants**: the build breaks the solution one small change at a time (a comparison or operator swapped, a
  constant off by one, a statement deleted, a bound shifted, two arguments swapped...). Each broken version must
  fail a visible test or a hidden case. A survivor that differs from the solution on 2000 extra inputs from
  `[cases]` is `weak-tests`, with the input where it differs: add a test for it. A survivor that agrees
  everywhere is equivalent and only counted. Without `[cases]` every survivor is `weak-tests`, so declare them.
  With `none`, list the survivors you checked by hand, each named as its finding names it:
  ``equivalent = ["const-off-by-one:6:3 (line 6: `0` became `1`)"]``. Editing the solution changes those names, so
  the survivors come back as findings and the old entries are reported until you drop them.
  Results are cached in `.vet-cache/mutation/`, one file per item, keyed by the item's files.
- **Rewrites**: the build rewrites the solution in ways that keep its behaviour (renamed variables or
  parameters, loop and comprehension, `for` and `while`, f-string and `+`, `x += 1` and `x = x + 1`, `if` and a
  conditional expression, one `return`, a helper function, a docstring, a debug `print`). Each must pass
  (`right-refused`): a test that refuses one checks how the code is written. A parameter keeps its name when the
  prompt names it, and the debug `print` is left out when the tests read printed output.
- **Tests compare results only** (`test-inspects-code`): no `inspect`, `ast`, `dis`, `tokenize` or `linecache`,
  no `__code__`, no `open()` on a `.py` file.

## Python 3.12 and newer

Content is written for Python 3.12 and newer. The build runs it on 3.14 (the browser's version) and again on
CPython 3.12 and 3.13: every example, predict and claim block must print the same, and every solution,
starter, `wrong/` and `right/` answer must pass or fail the same tests and hidden cases (`version-differs`).
When something really needs a newer Python, declare the oldest one it holds on and tell the learner:

- a block: ` ```python predict min=3.13 `, with "Python 3.13" in the text just before or after it;
- a task or variant: `min = "3.13"` in its TOML; a boss: `min = "3.13"` in its front matter. The prompt (for a
  boss, the intro or a stage prompt) must say "Python 3.13".

A `min` the text never names is `min-unexplained`. The older Pythons live in `.vet-cache/py3.12` and
`.vet-cache/py3.13` (made by uv with the library pins), and results are cached in `.vet-cache/versions/`.
`pnpm dev` and `pnpm build` skip this check (and mutants, rewrites and `right/`); `pnpm test` runs it.

CI also repeats every output and verdict in Pyodide, the browser's Python, through the same harness
(`pnpm vet:pyodide`, after `pnpm test`). Something that works in CPython and not in the browser (starting a
thread, for one) fails the build there; rewrite it so it works in both.

## Nothing is used before it is taught

`content/features.toml` lists every feature code can use and a lesson can teach: syntax (`node:For`,
`node:ListComp`, `node:Lambda`), builtins (`call:len`), methods (`method:append`), imports (`import:math`),
decorators (`decorator:property`) and keyword arguments (`kwarg:sorted.key`). One `[feature.<id>]` table holds a
`summary`, the `detect` list of detectors that find it (a detector belongs to one feature) and, optionally,
`words`: how a task prompt names the construct, lower case.

Each lesson lists in `teaches` (front matter) the feature ids it introduces: `teaches = ["fn-len", "for-loop"]`.
Starters, solutions, `wrong/` and `right/` answers, examples, predicts, code in backticks inside hints and a boss's
files may use only what the lesson or an earlier one teaches. Lessons run in world order, then `order`; a boss
comes after the last lesson of its region. The rules:

- `unknown-feature`: code (or a `teaches` list) uses something `features.toml` does not list. Add it there.
- `untaught-feature`: code uses a feature no lesson up to that point teaches. The message names the file and the
  lesson that teaches it later, if any. Teach it earlier, or write the code without it.
- `teaches-missing`: a lesson has no `teaches`. Code is judged only up to the first lesson without one, so add
  `teaches` from the first lesson on. `claim` blocks and `tests.py` are never judged: learners do not read them.

`call:<builtin>` also counts a builtin passed as a value (`key=len`, `except ValueError`). Operators (`//`, `%`, `**`) and
list, tuple, dict and set displays are not tracked. A method the lesson's own code defines (`def feed(self)`) is the
learner's own and not a feature, unless it is called through an attribute (`self.items.pop()`). A code span in a
hint that is only half a statement is not read.

## Required constructs

Some prompts ask for a way of writing the code, not only a behaviour ("put `@property` above the method"). Such a
task lists the feature ids in its TOML (`requires = ["property-decorator"]`; for a boss stage in `stage.toml`, for
hard mode in the `boss.md` front matter). Check first judges the behaviour. When that passes, it looks for the
construct with the feature's detectors and says what is missing, using the feature's `say`: "Your code works, but
this task asks you to put @property above the method." The rules:

- `required-not-in-prompt`: none of the feature's `words` appears in the prompt. Name the construct there.
- `required-untaught`: no lesson up to the task teaches the feature.
- `prompt-asks-construct`: the prompt contains a feature's `words` but the task does not require it, so Check would
  accept code that ignores the ask. Either add it to `requires`, or give `construct_words_ok = "why not"` (a
  suggestion such as "Try a list comprehension" is a reason).

The solution must use every required construct, and `right/` answers too. The equivalent rewrites that remove a
required construct are skipped.

## The claims ledger

Every sentence a learner reads (lesson text, `remember` bullets, task and variant prompts, hints, boss intro and
stage prompts) has an entry in the `ledger.toml` next to its `lesson.md` or `boss.md`:

```toml
[[sentence]]
fp = "5200066b97e8"            # fingerprint of the sentence with case and spacing ignored
text = "Numbers can be multiplied."
where = "text:0"               # text:3, remember:0, task:<id>:prompt, task:<id>:hint:2, boss:intro, stage:<id>:prompt
status = "claim:times-two"     # claim:<id>, doc:<url#anchor>, simplification, advice or not-a-fact
reason = ""                    # required for a simplification
deepseek = "agree"             # what each model family said: agree, disagree, false or unsure
claude = "agree"
decided = "auto"               # auto when both agreed and any proposed assert passed, owner otherwise
```

- `claim:<id>`: a ` ```python claim id=<id> ` block in the lesson asserts it. Give every claim an `id`.
- `doc:<url>`: the Python docs state it. The link must be `https://docs.python.org/3/<page>#<anchor>` and the anchor
  must exist in `tools/vet/data/python-3.12-objects.inv`.
- `simplification`: a deliberate teaching simplification, with a `reason`. `advice`: a recommendation, not a
  statement about how Python behaves. `not-a-fact`: instructions, story, encouragement.

Editing a sentence changes its fingerprint, so the old entry goes stale and the new wording needs a review. A
`remember` bullet needs `claim:` or `advice`, or `doc:` with `no_claim` saying why no claim can run (claims cannot
call the real `input()`). The rules: `ledger-missing`, `ledger-stale`, `remember-unbacked`,
`claim-id-missing`, `claim-id-unknown`, `doc-anchor-missing`, and `fence-untyped` (a Python fence that is not an
example, predict or claim). `python -m tools.vet.pending <out.json>` lists the sentences without an entry, with their
paragraphs; the model reviews described in `docs/test-framework/PLAN.md` (Tasks 6.2 and 6.3) fill the ledger.

## Blind solvers

DeepSeek solves every task, variant and boss five times from what a learner has seen at that point: the lesson text
before the task, the prompt and the starter (never the tests or the solution). The attempts are run, never trusted,
through the visible tests, the hidden cases and the 2000-input fuzz set, and stored in `vet/blind/<id>.json`, pinned
to the item's fingerprint. Editing the item asks for a new run. The rules:

- `blind-missing`: no stored run for this version of the item.
- `blind-untriaged`: an attempt fails a test and nobody has said why.
- `blind-too-strict`: an attempt fails a visible test but passes every hidden case. The test is probably too strict;
  this cannot be triaged as `model-wrong`.
- `blind-disagrees`: an attempt passes every test but differs from the solution on the fuzz inputs.

A failing attempt is settled by a `triage` entry in its file: `python -m tools.vet.blind_eval triage <id> <attempt>
<model-wrong|prompt-fixed|test-fixed|solution-fixed> --note "..."`. A `model-wrong` note must quote the failing case
(or failing test message) word for word. Session decisions are also listed in `vet/triage.md` for the owner to
audit. Without `[cases]` an item has no hidden cases or fuzz set, so only its visible tests can fail an attempt.

How a run goes: `python -m tools.vet.blind_eval request <id>... --out vet/requests/blind-<name>.json`, push it (the
vet-models workflow starts on a push to `vet/requests/`), read the job log with `gh api .../jobs/<id>/logs`, extract
it with `python -m tools.vet.models.logs <log> <folder>`, then `python -m tools.vet.blind_eval evaluate
<folder>/blind-raw.json`.

## Review checklist

Before a world is done, read every lesson, prompt, hint, starter, solution and test, and ask:

- Is every sentence true, without "except when..." hiding behind it? If it states a fact, is there a claim?
- Does every prompt promise exactly what the tests check (names, types, rounding, edge cases)?
- Could a wrong answer pass? Write it to `wrong/`.
- Does each concept appear in a lesson before a task or boss needs it?
- Is anything true in CPython but different in the browser (Pyodide)? Check it there.

## Another language

A new language needs the same pipeline before its first lesson: a runner for its examples, predicts and
claims in the real target runtime at pinned versions; solutions that pass and starters that fail; `wrong/`
files; and that language's standard linter on the solutions.
