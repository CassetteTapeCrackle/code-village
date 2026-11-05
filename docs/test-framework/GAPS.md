# Known content gaps

Written by `python -m tools.vet.gaps --write --summary docs/test-framework/GAPS.md`; the list itself is
`vet/gaps.toml`. Worst severity first.

| Severity | Gaps |
| --- | --- |
| wrong-accepted | 727 |
| right-refused | 208 |
| false-claim | 111 |
| ambiguous | 38 |
| progression | 34 |

**1118 findings in all.**

## By world and rule

| World | Rule | Severity | Count |
| --- | --- | --- | --- |
| w1 | blind-missing | ambiguous | 3 |
| w1 | blind-untriaged | ambiguous | 1 |
| w1 | cases-missing | wrong-accepted | 86 |
| w1 | claim-id-missing | false-claim | 12 |
| w1 | fence-untyped | false-claim | 1 |
| w1 | ledger-missing | false-claim | 16 |
| w1 | prompt-asks-construct | ambiguous | 3 |
| w1 | remember-unbacked | false-claim | 13 |
| w1 | right-missing | right-refused | 76 |
| w1 | teaches-missing | progression | 13 |
| w1 | weak-tests | wrong-accepted | 86 |
| w1 | wrong-too-few | wrong-accepted | 76 |
| w2 | blind-missing | ambiguous | 3 |
| w2 | cases-missing | wrong-accepted | 79 |
| w2 | claim-id-missing | false-claim | 11 |
| w2 | ledger-missing | false-claim | 14 |
| w2 | prompt-asks-construct | ambiguous | 18 |
| w2 | remember-unbacked | false-claim | 11 |
| w2 | right-missing | right-refused | 69 |
| w2 | teaches-missing | progression | 11 |
| w2 | weak-tests | wrong-accepted | 112 |
| w2 | wrong-too-few | wrong-accepted | 67 |
| w3 | blind-missing | ambiguous | 1 |
| w3 | blind-untriaged | ambiguous | 2 |
| w3 | cases-missing | wrong-accepted | 73 |
| w3 | claim-id-missing | false-claim | 10 |
| w3 | ledger-missing | false-claim | 13 |
| w3 | prompt-asks-construct | ambiguous | 7 |
| w3 | remember-unbacked | false-claim | 10 |
| w3 | right-missing | right-refused | 63 |
| w3 | teaches-missing | progression | 10 |
| w3 | weak-tests | wrong-accepted | 87 |
| w3 | wrong-too-few | wrong-accepted | 61 |
