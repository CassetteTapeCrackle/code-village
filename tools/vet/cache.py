"""Results kept per solution group and fingerprint in .vet-cache/<kind>/, so a run recomputes only what changed.

The cache serves the real content, and the folder named by VET_CACHE for other content: the Python tests set
it, so canaries share the results of the items they leave unchanged. A result also depends on part of the
framework's source, the pins and the Python version (framework_hash), so each file records a hash of them and a
different hash is a miss. CI restores the latest cache whatever its hash and relies on this check alone.
"""

import hashlib
import json
import os
import sys
import tempfile
from collections.abc import Callable, Sequence
from pathlib import Path

from .model import Content, Item
from .python.adapter import ROOT

CACHE_ROOT = ROOT / ".vet-cache"
Group = list[Item]  # items that share one model solution (Content.solution_groups)
# a JSON value, and whether it is settled: a result a slower machine could change (a timeout) is not stored
Computed = tuple[object, bool]


def cache_for(content: Content, kind: str) -> Path | None:
    if content.root.resolve() == (ROOT / "content").resolve():
        return CACHE_ROOT / kind
    shared = os.environ.get("VET_CACHE")
    return Path(shared) / kind if shared else None


VET = ROOT / "tools" / "vet"
# the code a cached result depends on: how jobs run, how hidden cases are built, how code is mutated and rewritten,
# and the checks that judge the runs; an edit anywhere else in tools/vet keeps the cache
RESULT_SOURCES = (ROOT / "py" / "harness.py", VET / "adapter.py", VET / "cache.py", VET / "python", VET / "cases",
                  VET / "checks" / "mutation.py", VET / "checks" / "rewrites.py", VET / "checks" / "right.py")


def library_pins() -> str:
    """The `pnpm content` command, which holds the Python and library pins the results were computed under."""
    scripts = json.loads((ROOT / "package.json").read_text())["scripts"]
    return str(scripts["content"])


def result_files() -> list[Path]:
    return sorted(f for path in RESULT_SOURCES for f in ([path] if path.is_file() else path.rglob("*.py")))


def framework_hash() -> str:
    """Everything besides an item's own files that can change a cached result: the result files, the pins and the
    exact Python version."""
    digest = hashlib.sha256(f"{sys.version}\0{library_pins()}".encode())
    for path in result_files():
        digest.update(str(path.relative_to(ROOT)).encode() + b"\0" + path.read_bytes())
    return digest.hexdigest()[:12]


def read(folder: Path, fingerprint: str, framework: str) -> object | None:
    try:
        data = json.loads((folder / f"{fingerprint}.json").read_text())
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict) or data.get("framework") != framework:
        return None
    value: object = data.get("value")
    return value


def _write(folder: Path, group: Group, framework: str, value: object) -> None:
    # written aside and renamed, so a run reading the cache at the same time never sees half a file
    folder.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=folder, suffix=".tmp", delete=False) as out:
        json.dump({"framework": framework, "item": group[0].id, "value": value}, out, indent=1)
    Path(out.name).replace(folder / f"{group[0].fingerprint}.json")


def per_group(groups: Sequence[Group], folder: Path | None,
              compute: Callable[[list[Group]], list[Computed]]) -> list[object]:
    """Each group's value: read from folder when its fingerprint is there, else computed (all misses at once,
    so their jobs run side by side) and stored when settled."""
    framework = framework_hash() if folder else ""
    stored = [read(folder, g[0].fingerprint, framework) if folder else None for g in groups]
    fresh = iter(compute([g for g, s in zip(groups, stored, strict=True) if s is None]))
    values = []
    for group, found in zip(groups, stored, strict=True):
        if found is not None:
            values.append(found)
            continue
        value, settled = next(fresh)
        if folder and settled:
            _write(folder, group, framework, value)
        values.append(value)
    return values
