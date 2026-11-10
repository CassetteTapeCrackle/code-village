# Canaries

A canary proves a rule fires. Each one is a copy of a clean fixture with one planted defect, and
`tools/test_canaries.py` checks that `vet` reports exactly the rules the canary names. To stay fast, a canary runs
only the checks behind its folder's rule and the rules it names, so other rules are not looked at. The clean
fixture itself (`tools/fixtures/good/`) runs every check and must report nothing.

## Layout

```
tools/fixtures/canaries/<rule>/<case>/canary.toml
```

The folder is named after the rule the canary is for, and `<case>` says what was planted.

## canary.toml

```toml
base = "good"                       # the folder under tools/fixtures/ to copy
expect = ["solution-fails"]         # every rule vet must report, and no other among the rules it runs

[[file]]                            # write a file (created or replaced), path relative to the copy
path = "w1/a/basics/tasks/half/solution.py"
text = """
def half(n):
    return n
"""

[[delete]]                          # remove a file or a folder
path = "w1/a/basics/tasks/half/tests.py"
```

`expect` usually names one rule. Name more only when the defect cannot be planted without tripping another rule,
and say why in a comment.

## Rules

- Every rule in `vet/rules.toml` has at least one canary (`test_every_rule_has_a_canary`).
- A new rule lands with its canary in the same commit.
- Keep the patch to the smallest change that shows the defect.
