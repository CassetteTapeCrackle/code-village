#!/usr/bin/env bash
# PreToolUse(Bash): before a git commit runs, scan every added line and every untracked file for secrets.
# The hook runs before `git add -A && git commit` stages anything, so it reads the working tree, not the index.
# CI's secrets job scans the whole history as the backstop.
set -uo pipefail

deny() {
  echo "Blocked by .claude/hooks/secrets.sh: $1" >&2
  exit 2
}

command -v jq >/dev/null || deny "jq is missing, so the command cannot be checked."
input=$(cat)
cmd=$(jq -r '.tool_input.command // ""' <<<"$input") || deny "the tool input is not valid JSON."
grep -qE '(^|[;&|[:space:]])git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+)*[[:space:]]+commit' <<<"$cmd" || exit 0

command -v gitleaks >/dev/null || deny "gitleaks is missing; install it (see .claude/cloud-setup.sh) before committing."
root=$(git -C "$(jq -r '.cwd // "."' <<<"$input")" rev-parse --show-toplevel) || deny "not inside a git repository."
cd "$root" || deny "cannot enter $root."

report=$(
  {
    git diff HEAD -U0 --no-color | grep '^+' | grep -v '^+++ ' || true
    git ls-files -z --others --exclude-standard | xargs -0 cat 2>/dev/null || true
  } | gitleaks stdin --redact --no-banner --no-color --config .gitleaks.toml 2>&1
)
status=$?
if [[ $status -eq 1 ]]; then
  deny "gitleaks found a possible secret in the changes about to be committed. Remove it, or if it is a fake test value, allowlist it in .gitleaks.toml.
$report"
fi
[[ $status -eq 0 ]] || deny "gitleaks failed (exit $status): $report"
exit 0
