"""Results kept per solution group and fingerprint in .vet-cache/<kind>/, so a run recomputes only what changed.

The cache serves the real content, and the folder named by VET_CACHE for other content: the Python tests set
it, so canaries share the results of the items they leave unchanged. A result also depends on the framework's
source, the pins and the Python version, so each file records a hash of them and a different hash is a miss.
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


def framework_hash() -> str:
    digest = hashlib.sha256(sys.version.encode())
    for path in [ROOT / "py" / "harness.py", ROOT / "package.json", *sorted((ROOT / "tools" / "vet").rglob("*.py"))]:
        digest.update(path.read_bytes())
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
