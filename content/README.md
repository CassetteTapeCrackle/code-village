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
`remember`, `[loot]`), then Markdown with four kinds of block:

- ` ```python example ` runs at build time; the app shows its real output, never a typed one.
- ` ```python predict ` is the same, but the learner guesses the output first. It must print something.
- ` ```python claim ` backs the sentence just above it with `assert`s. It runs at build time and is
  never shown. Put one after every sentence that states a fact about the language or a library: what a
  function returns, which error appears, a default, a limit. Leave a blank line on both sides.
- `::task <folder>` places a task. Every folder under `tasks/` must be placed.

## A task

- `task.toml`: `id`, `concept`, `kind` (`write`, `fix` or `complete`), `title`, `prompt`, `hints`, `gotcha`.
  Add `strict = true` only when the task teaches exact output formatting (decimals, alignment, `repr`): its
  checks then compare text exactly instead of forgiving case, spacing and punctuation.
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
`solution.py` must pass every stage's tests and `hard_tests.py`. One boss per region, in a region with lessons.

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
  Results are cached in `.vet-cache/mutation/`, one file per item, keyed by the item's files.
- **Rewrites**: the build rewrites the solution in ways that keep its behaviour (renamed variables or
  parameters, loop and comprehension, `for` and `while`, f-string and `+`, `x += 1` and `x = x + 1`, `if` and a
  conditional expression, one `return`, a helper function, a docstring, a debug `print`). Each must pass
  (`right-refused`): a test that refuses one checks how the code is written. A parameter keeps its name when the
  prompt names it, and the debug `print` is left out when the tests read printed output.
- **Tests compare results only** (`test-inspects-code`): no `inspect`, `ast`, `dis`, `tokenize` or `linecache`,
  no `__code__`, no `open()` on a `.py` file.

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
