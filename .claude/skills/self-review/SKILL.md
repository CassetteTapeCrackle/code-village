---
name: self-review
description: Use before saying a code task is done, fixed, or ready for review, and before committing. A checklist the agent runs on its own diff - scope, leftovers, tests, verification, house rules. Complements ponytail's bloat check and /code-review's bug hunt.
---

# Self-review (before "done")

Run `git diff` (plus untracked files) and walk this list. Fix what fails, then report.

## Scope
- Every hunk traces back to what was asked. Unrequested refactors, renames, or formatting churn come out, or get named as a separate suggestion.
- Nothing touched outside the task's files without a stated reason.

## Leftovers
- No debug prints, temporary logging, probe files, `TODO` without an owner, or commented-out code.
- No backup files (`*.bak`, `*.orig`) or scratch files left in the tree.

## Tests
- A bug fix comes with a regression test that fails without the fix.
- New non-trivial logic has at least one test or assert-based check.
- The suite was actually run after the last edit, and the output was read.

## Verification
- The change was exercised the way a user would hit it (run the app, call the command, load the plugin), not only compiled.
- Claims in the final report match the evidence. Anything unverified is labeled as such.

## House rules (from the user's CLAUDE.md)
- No em dashes or en dashes used as sentence punctuation in comments, commit messages, PR text, or docs.
- Commit only at a verified checkpoint. Never merge, force-push, or delete branches unless explicitly told to merge.
