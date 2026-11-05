# Held-out canaries: plant defects the checker should catch

You test a content checker you have never seen. The checker reads the lessons, tasks and bosses of a Python course
(Code Village) and must catch every kind of error below before a learner meets it. Your job is to plant such errors,
one per canary, in a copy of a clean fixture. A canary the checker misses is a hole in the checker, so be inventive
and realistic: write the mistakes an AI that wrote the course content would plausibly make, not toy ones.

## What you may read

- `docs/test-framework/SPEC.md` (the design: goals A to H)
- `tools/fixtures/canaries/README.md` (the canary file format)
- everything under `tools/fixtures/good/` (the clean fixture every canary starts from)
- `content/README.md` (how content is written)

Do **not** read `tools/vet/`, `tools/fixtures/canaries/*/` (the existing canaries), `vet/rules.toml`, `vet/gaps.toml`,
or any test file. Do not run the checker. You must not know how it works, or the test proves nothing.

## What to write

Create folders `tools/fixtures/canaries-heldout/round-<n>/<class>-<number>/canary.toml` (use the round number you are
given). Write **at least three canaries per failure class below**, each with a different kind of defect. Use the
format of `tools/fixtures/canaries/README.md` with `base = "good"`, but `expect` names the **failure class**, not a
rule id:

```toml
# one comment line: the defect, in plain words
base = "good"
expect = ["wrong-accepted"]

[[file]]
path = "w1/a/basics/tasks/half/tests.py"
text = '''
...
'''
```

Failure classes (use these exact words in `expect`):

- `false-claim`: a lesson or hint teaches something false, or states a fact that nothing backs (goal A). Sentences
  that cannot run need a ledger entry; remember bullets must be backed; code blocks must run; claims must hold.
- `wrong-accepted`: Check accepts a wrong answer (goal B). Weak tests, a starter that already passes, a `wrong/`
  answer that passes, missing or too few `wrong/` and hidden-case declarations, a mutation of the solution that
  survives.
- `right-refused`: Check refuses a right answer (goal C). Tests that inspect how code is written, tests that depend on
  names or formatting the prompt never states, a solution that fails its own tests, a `right/` answer that fails.
- `ambiguous`: a prompt that can be read two ways, or that asks for a construct (such as `@property` or a key
  function) that Check does not verify, or a required construct that the prompt never names (goal D, 11b).
- `progression`: code uses something before a lesson teaches it, a lesson teaches nothing declared, or the
  vocabulary does not know a feature used in code (goal E).
- `wiring`: ids, gates, trophies, regions, concepts or folders that do not line up (goal E item 14, goal F).

Rules for a good canary:

- Plant exactly one defect, as small as possible. Keep the rest of the fixture clean.
- Make the defect one a careful human reviewer could still miss: not a syntax error, not a missing file. A canary
  that only breaks a file's format tests the loader, not the checks.
- The defect must be a real error in the sense of the class, so the checker is right to flag it.
- Different canaries of one class should plant different kinds of defect, not the same one in three files.
- Never include a dash character (the long or the medium one) in any text you write; use a colon or a new sentence.

When you are done, reply with one line per canary: its folder name and the defect in a few words. Do not edit any
other file.
