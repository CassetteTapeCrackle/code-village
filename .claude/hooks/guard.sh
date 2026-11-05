#!/usr/bin/env bash
# PreToolUse(Bash): cloud sessions load no user config, so the owner's git rules travel with the repo.
#   - em/en dashes in commit, PR or issue text: denied everywhere
#   - merges on dev or main, pushes to them, force-push, branch deletion, PR merges: denied in the cloud.
#     On the owner's machine ~/.claude/bin/guard.sh already handles these, with its "merge" override.
# Every denial and every failure exits 2, so a broken guard blocks instead of letting a command through.
set -uo pipefail

deny() {
  echo "Blocked by .claude/hooks/guard.sh: $1" >&2
  exit 2
}

command -v jq >/dev/null || deny "jq is missing, so the command cannot be checked."
input=$(cat)
cmd=$(jq -r '.tool_input.command // ""' <<<"$input") || deny "the tool input is not valid JSON."
cwd=$(jq -r '.cwd // ""' <<<"$input")

start='(^|[;&|(`[:space:]])'
# "git", then global options (-C <dir>, -c <k=v>, --long[=v]), then the subcommand.
GIT='git([[:space:]]+(-[Cc][[:space:]]+[^[:space:]]+|--[^[:space:]]+))*[[:space:]]+'
PROTECTED='(dev|main)'
end='([[:space:]"'"'"';&|)]|$)'

writes_text="${start}(${GIT}(commit|tag)|gh[[:space:]]+((pr|issue)[[:space:]]+(create|edit|comment)|api))"
if grep -qE "$writes_text" <<<"$cmd" && grep -qE '—|–' <<<"$cmd"; then
  deny "em or en dash in commit, PR or issue text. Rewrite the sentence: split it, or use a colon or parentheses."
fi

if [[ "${CLAUDE_CODE_REMOTE:-}" != "true" && -x "$HOME/.claude/bin/guard.sh" ]]; then
  exit 0
fi

branch=$(git -C "${cwd:-.}" branch --show-current 2>/dev/null || true)
on_protected=false
[[ "$branch" =~ ^${PROTECTED}$ ]] && on_protected=true

push="${start}${GIT}push"
api_write='[[:space:]](-X|--method|-f|-F|--field|--raw-field|--input)([[:space:]=]|$)'
rules=(
  "${start}gh[[:space:]]+pr[[:space:]]+merge@@merging a pull request is the owner's call."
  "${start}gh[[:space:]]+api[^;&|]*/merges?${end}@@merging through the API is the owner's call."
  "${start}gh[[:space:]]+api([^;&|]*git/refs[^;&|]*${api_write}|[^;&|]*${api_write}[^;&|]*git/refs)@@changing refs through the API is not allowed; push your own branch with git."
  "${push}[^;&|]*([[:space:]]-f|--force|[[:space:]]\+[^[:space:]])@@force-pushing is not allowed."
  "${push}[^;&|]*([[:space:]]-d${end}|--delete|[[:space:]]:[^[:space:]])@@deleting a remote branch is not allowed."
  "${push}[^;&|]*[[:space:]:/]${PROTECTED}${end}@@pushing to dev or main is the owner's call. Push your session branch."
  "${start}${GIT}branch[^;&|]*[[:space:]](-[dD]|--delete)${end}@@deleting a branch is not allowed."
  "${start}${GIT}(switch|checkout)[^;&|]*[[:space:]]${PROTECTED}${end}@@work stays on your session branch; dev and main are the owner's."
)
for rule in "${rules[@]}"; do
  if grep -qE "${rule%%@@*}" <<<"$cmd"; then
    deny "${rule#*@@}"
  fi
done

if $on_protected; then
  if grep -qE "${start}${GIT}merge${end}" <<<"$cmd"; then
    deny "merging while on $branch is the owner's call."
  fi
  if grep -qE "$push" <<<"$cmd"; then
    deny "pushing while on $branch is the owner's call."
  fi
fi
exit 0
