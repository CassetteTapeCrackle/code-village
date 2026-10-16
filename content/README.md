# Writing content

Every lesson, task and boss lives here as plain files. `pnpm content` (`tools/content_check.py`) runs all of
it in the same Python as the browser and fails the build on any problem. The checks below are what keep the
game from teaching something wrong. A rule nothing checks is a rule that will break, so keep them all.

## Layout

```
content/<world>/<region>/<lesson>/lesson.md
content/<world>/<region>/<lesson>/tasks/<task>/          task.toml, starter.py, solution.py, tests.py
content/<world>/<region>/<lesson>/tasks/<task>/variants/<variant>/   variant.toml, starter.py, solution.py, tests.py
content/<world>/<region>/boss/                           boss.md, starter.py, solution.py, hard_tests.py
content/<world>/<region>/boss/stages/<n-name>/           stage.toml, tests.py
```

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

## The three guards

1. **Claims** (above): the prose is checked, not only the code.
2. **`wrong/*.py`**: a plausible mistake, written out. Some test must fail it, or the build fails with
   "the tests miss that mistake". Add one whenever a test could be passed by half a solution: one side of a
   range, an edge (0, empty, equal to the limit), an attribute in the wrong place, the wrong `k`. For a boss,
   the mistake must fail at least one stage or the hard tests.
3. **Lint**: every `solution.py` passes ruff (rules in `LINT_RULES`). Model answers are what learners copy.

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
