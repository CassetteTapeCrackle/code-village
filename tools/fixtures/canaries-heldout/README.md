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
