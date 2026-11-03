#!/usr/bin/env bash
# SessionStart, cloud only: install node packages when package.json or the lockfile changed, then build the
# content bundle that typecheck needs. Output goes to a log, because SessionStart stdout lands in the agent's
# context; only failures are reported there.
[[ "${CLAUDE_CODE_REMOTE:-}" == "true" ]] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 1
stamp=node_modules/.install.sha256
log=/tmp/session-start.log
if ! sha256sum --check --status "$stamp" 2>/dev/null; then
  rm -f "$stamp"
  if pnpm install --frozen-lockfile >"$log" 2>&1; then
    sha256sum package.json pnpm-lock.yaml >"$stamp"
  else
    echo "pnpm install failed; see $log"
    exit 0
  fi
fi
pnpm -s content --quick --if-changed >>"$log" 2>&1 || echo "pnpm content failed (typecheck needs its bundle); see $log and run it again."
exit 0
