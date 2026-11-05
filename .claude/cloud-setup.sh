#!/bin/bash
# Paste this into the cloud environment's Setup script box (claude.ai/code, default package manager list on).
# It provisions the VM; node packages install per session in .claude/hooks/session-start.sh.
# A failed step warns instead of failing, because a non-zero exit stops every session from starting;
# the session then sees what is missing and says so.
set -uo pipefail

# gitleaks, pinned (used by .claude/hooks/secrets.sh). The release tarball is checksum-verified; if GitHub
# release downloads are blocked, build the same version through the Go module proxy (checked by sum.golang.org).
GITLEAKS_VERSION=8.30.1
GITLEAKS_SHA256=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb
tarball=/tmp/gitleaks.tar.gz
if curl -fsSL -o "$tarball" \
  "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" \
  && echo "${GITLEAKS_SHA256}  ${tarball}" | sha256sum --check --status; then
  tar -xzf "$tarball" -C /usr/local/bin gitleaks
else
  echo "WARNING: gitleaks release download failed; building it with go" >&2
  GOBIN=/usr/local/bin go install "github.com/zricethezav/gitleaks/v8@v${GITLEAKS_VERSION}" \
    || echo "WARNING: gitleaks is not installed; commits will be blocked until it is" >&2
fi
rm -f "$tarball"

# Every Python the framework checks against, plus a warm uv cache for the pinned libraries
uv python install 3.12 3.13 3.14 || echo "WARNING: uv python install failed" >&2
for version in 3.12 3.13 3.14; do
  uv run -q --no-project --python "$version" --with numpy==2.4.6 --with pandas==3.0.2 \
    --with scikit-learn==1.8.0 --with ruff==0.17.0 python -c 'import numpy, pandas, sklearn' &
done
wait

gitleaks version || true
uv python list --only-installed || true
exit 0
