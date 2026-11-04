# Held-out canaries

Written by reviewers who never saw the checker or its canaries (`docs/test-framework/prompts/heldout-canaries.md`).
`expect` names a failure class, not a rule: `false-claim`, `wrong-accepted`, `right-refused`, `ambiguous`,
`progression` or `wiring`. A canary counts as caught when the full `vet` gives any finding (other than a file that
cannot be read) on a copy of `tools/fixtures/good/` with the one planted defect: the clean fixture gives none.

- `round-<n>/`: canaries the checker catches. `python -m unittest tools.test_canaries -k heldout` keeps them caught.
  A defect that was missed at first was fixed with a new check and moved to `tools/fixtures/canaries/<rule>/`.
- `open/`: defects the deterministic checker cannot catch, kept as the record of the limit. They are not run.
  - `false-claim-*`, `r2-false-claim-*`: false or weakly proved sentences. Only the two-family review (DeepSeek and
    Claude, `tools/vet/models/`) can read them.
  - `ambiguous-2`, `r2-ambiguous-*`: wording that allows two readings. Only the blind solvers (`vet/blind/`) can
    show that, once an item's run has been done.
  - `wrong-accepted-3`: a hard-coded answer that a validity rule accepts. No mutation of the solution produces it.
  - `wrong-accepted-4`: hidden inputs declared over too narrow a space. A mutant that differs only outside the space
    looks equivalent.
  - `r2-right-refused-5`: a test requires the result to be an `int` though the prompt never names a type.
  - `r3-ambiguous-2`, `r3-ambiguous-3`: "round the result" with no digits; a prompt asking to print as well as return.
    Wording a blind solver would show.
  - `r3-ambiguous-4`, `r3-right-refused-6`: a hint or prompt names a function (`thrice`, `halve`) that the starter,
    tests and solution call something else. A check could compare backticked names in text with the code's names;
    not built, because prompts also name library functions and examples.
  - `r3-false-claim-5`: a hint shows code that raises. Hint code is only checked to compile.
  - `r3-right-refused-3`: a test keeps results in a module-level list, so a second run fails a right answer.
  - `r3-wiring-7`: `kind = "fix"` with an empty stub as its starter.
  - `r3-wrong-accepted-1`, `r3-wrong-accepted-5`: a float tolerance of 0.5 and a validity rule that compares only
    signs. No mutation of the solution slips through them.

Round 1 had 22 canaries (11 missed at first), round 2 had 36 (16) and round 3 had 34 (16). Every miss that a program
can find from the files became a rule with a canary under `tools/fixtures/canaries/`: 20 rules in all.
