# Known content gaps

Written by `python -m tools.vet.gaps --write --summary docs/test-framework/GAPS.md`; the list itself is
`vet/gaps.toml`. Worst severity first.

| Severity | Gaps |
| --- | --- |
| false-claim | 16 |

**16 findings in all.**

## By world and rule

| World | Rule | Severity | Count |
| --- | --- | --- | --- |
| w1 | remember-unbacked | false-claim | 4 |
| w2 | remember-unbacked | false-claim | 6 |
| w3 | remember-unbacked | false-claim | 6 |
