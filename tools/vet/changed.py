"""Which items the generated browser tests should cover for a change (spec 16).

python -m tools.vet.changed --base origin/dev

prints a VET_ITEMS value: comma separated tokens, each `all`, `sample` (the first task of every lesson and the first
boss) or an item id; `none` when nothing that the browser tests depend on changed. A content file maps to its task
or boss. A change to the framework or the browser runner asks for a sample; a change to the generated specs asks
for everything.
"""

import argparse
import subprocess
import sys
from collections.abc import Iterable
from pathlib import Path, PurePosixPath

from .load import load_content
from .model import Content

ROOT = Path(__file__).resolve().parents[2]
SAMPLE_PREFIXES = ("py/", "src/runner/", "src/lesson/", "tools/vet/")
ALL_PREFIXES = ("e2e/generated",)
SHARED_CONTENT = ("features.toml", "concepts.toml", "world.toml")  # a change can reach any item


def changed_paths(base: str, root: Path = ROOT) -> list[str]:
    """The files changed between base and HEAD (git diff base...HEAD)."""
    done = subprocess.run(["git", "diff", "--name-only", f"{base}...HEAD"], cwd=root, capture_output=True, text=True,
                          check=False)
    if done.returncode != 0:
        raise ValueError(f"git cannot compare with {base}: {done.stderr.strip()}: fetch it first")
    return done.stdout.splitlines()


def tokens_for(paths: Iterable[str], content: Content, root: Path = ROOT) -> frozenset[str]:
    """The VET_ITEMS tokens for changed files; `all` swallows the rest."""
    tokens: set[str] = set()
    owners = _owners(content, root)
    for path in paths:
        if path.startswith(ALL_PREFIXES):
            tokens.add("all")
        elif path.startswith(SAMPLE_PREFIXES):
            tokens.add("sample")
        elif path.startswith("content/"):
            tokens |= _content_tokens(path, owners)
    return frozenset({"all"}) if "all" in tokens else frozenset(tokens)


def _owners(content: Content, root: Path) -> list[tuple[str, str]]:
    """(folder prefix, item id) for every task, variant (as its task), lesson and boss, folders relative to root."""
    def relative(path: Path) -> str:
        return PurePosixPath(path.resolve().relative_to(root.resolve())).as_posix() + "/"

    owners = []
    for lesson in content.lessons:
        for task in lesson.tasks:
            owners.append((relative(task.folder), task.id))
        owners.append((relative(lesson.path.parent) + "lesson.md", ""))  # marks the lesson's own files
    owners += [(relative(boss.folder), boss.id) for boss in content.bosses]
    return owners


def _content_tokens(path: str, owners: list[tuple[str, str]]) -> set[str]:
    name = PurePosixPath(path).name
    if name in SHARED_CONTENT:
        return {"sample"}
    for prefix, item in owners:
        if item and path.startswith(prefix):
            return {item}
    lesson_folder = str(PurePosixPath(path).parent) + "/"
    if name in ("lesson.md", "ledger.toml"):  # the text before every task of the lesson
        return {item for prefix, item in owners if item and prefix.startswith(lesson_folder + "tasks/")}
    return {"sample"}


def changed_items(base: str, root: Path = ROOT) -> frozenset[str]:
    content, _ = load_content(root / "content")
    return tokens_for(changed_paths(base, root), content, root)


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    args.add_argument("--base", required=True, help="the git ref the change is compared with")
    opts = args.parse_args()
    try:
        tokens = changed_items(opts.base)
    except ValueError as e:
        sys.exit(f"changed: {e}")
    print(",".join(sorted(tokens)) or "none")


if __name__ == "__main__":
    main()
