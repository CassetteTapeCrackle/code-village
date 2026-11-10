# Known content gaps

Written by `python -m tools.vet.gaps --write --summary docs/test-framework/GAPS.md`; the list itself is
`vet/gaps.toml`. Worst severity first.

| Severity | Gaps |
| --- | --- |
| wrong-accepted | 47 |
| false-claim | 16 |
| ambiguous | 3 |

**66 findings in all.**

## By world and rule

| World | Rule | Severity | Count |
| --- | --- | --- | --- |
| w1 | blind-missing | ambiguous | 1 |
| w1 | cases-target-unused | wrong-accepted | 1 |
| w1 | remember-unbacked | false-claim | 4 |
| w2 | blind-missing | ambiguous | 2 |
| w2 | remember-unbacked | false-claim | 6 |
| w2 | weak-tests | wrong-accepted | 46 |
| w3 | remember-unbacked | false-claim | 6 |
