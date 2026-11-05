#!/usr/bin/env bash
# Stop hook: before the agent ends its turn, lint and typecheck what it changed (working tree plus commits not
# yet pushed). Exit 2 hands the errors back so the agent fixes them before stopping.
set -uo pipefail

input=$(cat)
[[ "$(jq -r '.stop_hook_active // false' <<<"$input")" == "true" ]] && exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

base=$(git rev-parse -q --verify '@{upstream}' 2>/dev/null || git merge-base HEAD origin/dev 2>/dev/null || echo HEAD)
changed=$( { git diff --name-only --diff-filter=d "$base"; git ls-files --others --exclude-standard; } | sort -u)
# content/ and tools/fixtures/ hold lesson code with injected names; pnpm content lints those with its own rules.
ts=$(grep -E '\.(ts|js|mjs|svelte)$' <<<"$changed" || true)
py=$(grep -E '\.py$' <<<"$changed" | grep -vE '^(content|tools/fixtures)/' || true)

errors=""
run() {
  local label=$1 out
  shift
  out=$("$@" 2>&1) || errors+="== $label failed:
$out
"
}
if [[ -n "$ts" ]]; then
  # shellcheck disable=SC2086 # one path per word; repo paths have no spaces
  run eslint pnpm exec eslint --no-warn-ignored $ts
  run typecheck pnpm -s typecheck
  grep -q '^worker/' <<<"$ts" && run typecheck:worker pnpm -s typecheck:worker
fi
if [[ -n "$py" ]]; then
  # shellcheck disable=SC2086
  run ruff uv run -q --no-project --with ruff==0.17.0 ruff check $py
fi

[[ -z "$errors" ]] && exit 0
echo "Quick gate (.claude/hooks/quick-gate.sh) found problems in files you changed. Fix them before stopping:
$errors" >&2
exit 2
