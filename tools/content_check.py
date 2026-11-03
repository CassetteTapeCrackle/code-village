"""Check every lesson and boss and write the app's content bundle.

The checks live in tools/vet (one module per rule group, rule ids in vet/rules.toml); this script runs them,
prints every finding as one line and fails the build on any. World 3 needs NumPy, pandas and scikit-learn at the
versions Pyodide ships: `pnpm content` runs this under uv. content/README.md explains how to write content.
With --if-changed it skips everything when the bundle was built from these exact inputs (what `pnpm dev` uses).
Usage: python3 tools/content_check.py [--content DIR] [--out FILE] [--no-version-check] [--if-changed]
"""

import argparse
import hashlib
import json
import os
import sys
from collections import Counter
from pathlib import Path

from vet.adapter import LanguageAdapter
from vet.checks.libraries import PYODIDE_LOCK, build_python, environment_problems
from vet.checks.style import ToolError
from vet.finding import Finding, GapKey
from vet.gaps import GAPS_PATH, GapDiff, compare, load_gaps, world_summary
from vet.load import LESSON_FIELDS, STAGE_FIELDS, TASK_FIELDS, VARIANT_FIELDS, Fields, load_content
from vet.model import Boss, CodeBlock, Content, Lesson, Meta, Task, TaskBlock, TextBlock, World
from vet.python.adapter import PythonAdapter
from vet.run import vet_content

ROOT = Path(__file__).resolve().parent.parent
BUNDLE_VERSION = 3
Json = dict[str, object]


def pick(meta: Meta, fields: Fields) -> Json:
    return {k: meta.get(k) for k in fields}


def task_entry(task: Task) -> Json:
    variants = [{**pick(v.meta, VARIANT_FIELDS), "concept": task.meta.get("concept"), "strict": v.strict,
                 "starter": v.starter, "tests": v.tests} for v in task.variants]
    return {**pick(task.meta, TASK_FIELDS), "strict": task.strict, "starter": task.starter, "tests": task.tests,
            "variants": variants}


def lesson_entry(lesson: Lesson, adapter: LanguageAdapter) -> Json:
    blocks: list[Json] = []
    for block in lesson.blocks:
        if isinstance(block, TextBlock):
            blocks.append({"type": "text", "markdown": block.markdown})
        elif isinstance(block, TaskBlock):
            blocks.append({"type": "task", "task": task_entry(block.task)})
        elif isinstance(block, CodeBlock) and block.kind != "claim":  # claims back a sentence and are never shown
            [ran] = adapter.run([block.code])  # already run by the checks, so this reads the same outcome
            blocks.append({"type": block.kind, "code": block.code, "output": ran["stdout"] if ran else ""})
    entry = {**pick(lesson.meta, LESSON_FIELDS), "blocks": blocks}
    if lesson.meta.get("tour"):
        entry["tour"] = True
    return entry


def boss_entry(boss: Boss) -> Json:
    meta = boss.meta
    return {"id": boss.id, "title": meta.get("title"), "world": meta.get("world"), "region": meta.get("region"),
            "intro": boss.intro, "starter": boss.starter, "hardTests": boss.hard_tests,
            "hardChecks": meta.get("hard_checks"), "trophy": meta.get("trophy"), "hardTrophy": meta.get("hard_trophy"),
            "stages": [{**pick(s.meta, STAGE_FIELDS), "tests": s.tests} for s in boss.stages]}


def world_entry(world: World) -> Json:
    """A world.toml as the game's World type reads it."""
    meta = world.meta
    building, teacher, key = _table(meta.get("building")), _table(meta.get("teacher")), meta.get("key")
    lock = _table(key)
    return {
        "id": meta["id"], "order": meta["order"], "name": meta["name"], "area": meta["area"],
        "regions": meta["regions"],
        "building": {"name": building["name"], "placeId": building["place"]},
        "teacher": {"name": teacher["name"], "portrait": teacher["portrait"]},
        "key": {"bossId": lock["boss"], "trophyId": lock["trophy"], "trophyName": lock["trophy_name"],
                "opens": lock["opens"], "gateHint": lock["gate_hint"]} if key else key,
    }


def _table(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}


def bundle(content: Content, adapter: LanguageAdapter) -> Json:
    lessons = sorted(content.lessons, key=lambda lesson: (str(lesson.meta["world"]), int(str(lesson.meta["order"]))))
    bosses = sorted(content.bosses, key=lambda boss: (str(boss.meta["world"]), str(boss.meta["region"])))
    worlds = sorted(content.worlds, key=lambda world: int(str(world.meta["order"])))
    return {"version": BUNDLE_VERSION, "python": build_python(), "concepts": dict(sorted(content.concepts.items())),
            "worlds": [world_entry(w) for w in worlds],
            "lessons": [lesson_entry(lesson, adapter) for lesson in lessons], "bosses": [boss_entry(b) for b in bosses]}


def fingerprint(content: Path) -> str:
    """A hash of everything the bundle is built from: the content, the checks, the harness and the pins."""
    digest = hashlib.sha256(sys.version.encode())
    files = sorted(p for p in content.rglob("*") if p.is_file() and "__pycache__" not in p.parts)
    checks = sorted(p for p in (ROOT / "tools" / "vet").rglob("*.py") if "__pycache__" not in p.parts)
    inputs = [ROOT / "py" / "harness.py", Path(__file__), *checks, ROOT / "vet" / "rules.toml", GAPS_PATH,
              ROOT / "package.json", PYODIDE_LOCK]
    for path in [*files, *inputs]:
        if path.exists():
            digest.update(str(path).encode() + b"\0" + path.read_bytes())
    return digest.hexdigest()


def problems(content: Content, load_findings: list[Finding], adapter: LanguageAdapter,
             version_check: bool) -> tuple[list[str], list[Finding]]:
    """Problems with the machine, which always fail the build, and every finding on the content."""
    machine = environment_problems() if version_check else []
    try:
        return machine, load_findings + vet_content(content, adapter)
    except ToolError as e:
        return [*machine, f"lint: {e}"], load_findings


def gap_failures(diff: GapDiff) -> list[str]:
    stale = [f"gap list: {k.rule} {k.item} {k.fingerprint} no longer happens: run python -m tools.vet.gaps --write"
             for k in diff.stale]
    return [f"{f.item}: {f.message}" for f in diff.new] + stale


def report_known(known: list[Finding]) -> None:
    for rule, count in sorted(Counter(f.rule for f in known).items()):
        print(f"known gap: {rule} x{count}")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with Path(summary).open("a") as out:
            out.write(world_summary(known))


def gaps_for(opts: argparse.Namespace) -> set[GapKey]:
    """--gaps, else vet/gaps.toml for the real content; other content (fixtures) has no known gaps."""
    if opts.gaps:
        return load_gaps(Path(opts.gaps))
    return load_gaps(GAPS_PATH) if Path(opts.content).resolve() == (ROOT / "content").resolve() else set()


def main() -> None:
    args = argparse.ArgumentParser()
    args.add_argument("--content", default=str(ROOT / "content"))
    args.add_argument("--out", default=str(ROOT / "src" / "content" / "bundle.json"))
    args.add_argument("--gaps", help="known gaps file (default: vet/gaps.toml for the real content, none otherwise)")
    args.add_argument("--no-version-check", action="store_true")
    args.add_argument("--if-changed", action="store_true")
    opts = args.parse_args()
    out = Path(opts.out)
    stamp = out.with_name(out.name + ".sha256")
    source = fingerprint(Path(opts.content))
    if opts.if_changed and out.exists() and stamp.exists() and stamp.read_text() == source:
        print(f"content unchanged: kept {out}")
        return
    content, load_findings = load_content(Path(opts.content))
    adapter = PythonAdapter()
    machine, findings = problems(content, load_findings, adapter, not opts.no_version_check)
    diff = compare(findings, gaps_for(opts))
    report_known(diff.known)
    failures = machine + gap_failures(diff)
    if failures:
        print("\n".join(sorted(failures)))
        print(f"content check FAILED: {len(failures)} problem(s)")
        sys.exit(1)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(bundle(content, adapter), indent=1))
    stamp.write_text(source)
    print(f"content ok: {len(content.lessons)} lesson(s), {len(content.tasks)} task(s), {len(content.bosses)} boss(es)"
          f" -> {out}")


if __name__ == "__main__":
    main()
