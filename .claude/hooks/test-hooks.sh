#!/usr/bin/env bash
# Feeds guard.sh and secrets.sh sample tool inputs from scratch repos. Run after changing either hook:
#   bash .claude/hooks/test-hooks.sh
# Needs git, jq and gitleaks. Exits 1 when any case fails.
HOOKS=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HOOKS/../.." && pwd)
EM=$(printf '\xe2\x80\x94'); EN=$(printf '\xe2\x80\x93'); CURLY=$(printf '\xe2\x80\x99')
failures=0
out=$(mktemp)

# expect (deny|allow), hook, repo, label
run_case() {
  local rc=$1 expect=$2 label=$3 got
  got=$([ "$rc" -eq 2 ] && echo deny || echo allow)
  if [ "$got" = "$expect" ]; then
    echo "ok   $got  $label"
  else
    echo "FAIL $got  $label (wanted $expect)"; cat "$out"; failures=$((failures + 1))
  fi
}

repo=$(mktemp -d)
git -C "$repo" init -q -b dev
git -C "$repo" commit -q --allow-empty -m init
git -C "$repo" branch test-framework
git -C "$repo" branch main
check() { # expect, branch, command
  git -C "$repo" checkout -q "$2"
  jq -n --arg c "$3" --arg d "$repo" '{tool_input:{command:$c},cwd:$d}' \
    | CLAUDE_CODE_REMOTE=true bash "$HOOKS/guard.sh" >"$out" 2>&1
  run_case $? "$1" "guard [$2] $3"
}
check deny  dev            "git merge test-framework"
check deny  main           "git -C . merge --no-ff x"
check allow test-framework "git merge origin/dev"
check deny  test-framework "git push origin dev"
check deny  test-framework "git push origin HEAD:main"
check deny  dev            "git push"
check allow test-framework "git push -u origin test-framework"
check deny  test-framework "git push --force origin test-framework"
check deny  test-framework "git push -f"
check deny  test-framework "git push --force-with-lease"
check deny  test-framework "git push origin +test-framework"
check deny  test-framework "git push origin --delete old"
check deny  test-framework "git push origin :old"
check deny  test-framework "git branch -D old"
check allow test-framework "git branch -a"
check deny  test-framework "gh pr merge 12"
check deny  test-framework "gh api -X PUT repos/o/r/pulls/3/merge"
check deny  test-framework "gh api repos/o/r/merges -f base=dev -f head=x"
check deny  test-framework "gh api -X DELETE repos/o/r/git/refs/heads/x"
check allow test-framework "gh api repos/o/r/git/refs/heads/x"
check allow test-framework "gh api repos/o/r/actions/runs --jq '.workflow_runs[0].conclusion'"
check deny  test-framework "git checkout dev"
check allow test-framework "git checkout -- main.py"
check allow test-framework "git merge-base HEAD origin/dev"
check deny  test-framework "git commit -m 'Add vet $EM the engine'"
check deny  test-framework "gh api repos/o/r/pulls -f body='one $EN two'"
check allow test-framework "git commit -m 'Add the vet engine: findings and rules'"
check allow test-framework "git commit -m 'Quote ${CURLY}curly${CURLY} text'"
check allow test-framework "git log --oneline main..HEAD"
rm -rf "$repo"

repo=$(mktemp -d)
cp "$ROOT/.gitleaks.toml" "$repo/"
git -C "$repo" init -q -b test-framework
echo "hello" >"$repo/a.txt"
git -C "$repo" add -A
git -C "$repo" commit -q -m init
check() { # expect, label, command
  jq -n --arg c "$3" --arg d "$repo" '{tool_input:{command:$c},cwd:$d}' | bash "$HOOKS/secrets.sh" >"$out" 2>&1
  run_case $? "$1" "secrets: $2"
}
check allow "clean tree" "git add -A && git commit -m x"
echo 'const token = "tok-main-0123456789012345678901234567890123";' >>"$repo/a.txt"
check allow "fake test token in a tracked file" "git commit -am x"
git -C "$repo" checkout -q -- a.txt
printf 'GITHUB_TOKEN=ghp_%s\n' "aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5" >"$repo/new.env.txt"
check deny "untracked file with a GitHub token" "git add -A && git commit -m x"
check allow "same tree, not a commit" "git status"
rm "$repo/new.env.txt"
# Fake keys are assembled at run time so this file never holds a secret-shaped string.
printf 'aws_secret_access_key = "%s"\naws_access_key_id = "%s"\n' "wJalrXUtnFEMI/K7MDENG/bPxRfiCY""zEXAMPLEKEY9" "AKIA""Z3MFYX4ABCD2EFGH" >>"$repo/a.txt"
check deny "AWS key added to a tracked file" "git -C . commit -am x"
rm -rf "$repo" "$out"

[ "$failures" -eq 0 ] || { echo "$failures case(s) failed"; exit 1; }
echo "all hook cases pass"
