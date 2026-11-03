#!/bin/bash
# Paste this into the cloud environment's Setup script box (claude.ai/code, Trusted network).
# It provisions the VM; node packages install per session in .claude/hooks/session-start.sh.
set -euo pipefail

# gitleaks, pinned and checksum-verified (used by .claude/hooks/secrets.sh)
GITLEAKS_VERSION=8.30.1
GITLEAKS_SHA256=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb
tarball=/tmp/gitleaks.tar.gz
curl -fsSL -o "$tarball" \
  "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
echo "${GITLEAKS_SHA256}  ${tarball}" | sha256sum --check --status
tar -xzf "$tarball" -C /usr/local/bin gitleaks
rm -f "$tarball"

# Every Python the framework checks against, plus a warm uv cache for the pinned libraries
uv python install 3.12 3.13 3.14
for version in 3.12 3.13 3.14; do
  uv run -q --no-project --python "$version" --with numpy==2.4.6 --with pandas==3.0.2 \
    --with scikit-learn==1.8.0 --with ruff==0.17.0 python -c 'import numpy, pandas, sklearn' &
done
wait

gitleaks version
