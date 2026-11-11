# Known content gaps

Written by `python -m tools.vet.gaps --write --summary docs/test-framework/GAPS.md`; the list itself is
`vet/gaps.toml`. Worst severity first.

| Severity | Gaps |
| --- | --- |
| wrong-accepted | 128 |
| false-claim | 2 |
| ambiguous | 2 |

**132 findings in all.**

## By world and rule

| World | Rule | Severity | Count |
| --- | --- | --- | --- |
| w1 | cases-missing | wrong-accepted | 24 |
| w1 | fence-untyped | false-claim | 1 |
| w1 | prompt-asks-construct | ambiguous | 2 |
| w1 | weak-tests | wrong-accepted | 3 |
| w2 | cases-missing | wrong-accepted | 25 |
| w2 | weak-tests | wrong-accepted | 55 |
| w3 | cases-missing | wrong-accepted | 21 |
