"""Check every lesson and boss and write the app's content bundle.

The checks live in tools/vet (one module per rule group, rule ids in vet/rules.toml); this script runs them,
prints every finding as one line and fails the build on any. World 3 needs NumPy, pandas and scikit-learn at the
versions Pyodide ships: `pnpm content` runs this under uv. content/README.md explains how to write content.
With --quick it leaves out the slow checks (mutation, rewrites, right/ answers) and judges only the gaps of the
rules it ran: `pnpm dev` and `pnpm build` use it, and `pnpm test` (CI) runs everything. With --if-changed it skips
everything when the bundle was built from these exact inputs, by a run at least as thorough.
With --jobs-out FILE it also writes every runtime verdict for scripts/vet-pyodide.mjs (`pnpm vet:pyodide`).
Usage: python3 tools/content_check.py [--content DIR] [--out FILE] [--no-version-check] [--quick] [--if-changed]
       [--jobs-out FILE]
"""

import argparse
import hashlib
import json
import os
import sys
from collections import Counter
from dataclasses import asdict
from pathlib import Path

from vet.adapter import LanguageAdapter, case_json
from vet.cache import CACHE_ROOT, use_report
from vet.cases.expect import CasesProblem, hidden_cases
from vet.checks import mutation
from vet.checks.libraries import PYODIDE_LOCK, build_python, environment_problems
from vet.finding import Finding, GapKey
from vet.gaps import GAPS_PATH, GapDiff, compare, load_gaps, world_summary
from vet.jobs import write_jobs
from vet.load import LESSON_FIELDS, STAGE_FIELDS, TASK_FIELDS, VARIANT_FIELDS, Fields, load_content
from vet.model import Boss, CodeBlock, Content, Lesson, Meta, Task, TaskBlock, TextBlock, World
from vet.python.adapter import PythonAdapter
from vet.rules import RULES
from vet.run import SLOW_RULES, vet_content

ROOT = Path(__file__).resolve().parent.parent
BUNDLE_VERSION = 5
Json = dict[str, object]


def pick(meta: Meta, fields: Fields) -> Json:
    return {k: meta.get(k) for k in fields}


CasesBySeed = dict[str, list[Json]]


def bundle_cases(content: Content, adapter: LanguageAdapter) -> CasesBySeed:
    """Every item's hidden cases by its seed id. The checks built them already, so this reads the same runs;
    an item whose cases cannot be built (a known gap) ships none."""
    found: CasesBySeed = {}
    for item in content.items():
        try:
            found[item.seed] = [case_json(case) for case in hidden_cases(item, adapter)]
        except CasesProblem:
            found[item.seed] = []
    return found


def bundle_requires(content: Content) -> dict[str, list[Json]]:
    """The constructs each item requires, by its seed id: what Check verifies after the behaviour passes."""
    return {item.seed: [asdict(need) for need in item.requires] for item in content.items()}


def task_entry(task: Task, cases: CasesBySeed, requires: dict[str, list[Json]]) -> Json:
    variants = [{**pick(v.meta, VARIANT_FIELDS), "concept": task.meta.get("concept"), "strict": v.strict,
                 "starter": v.starter, "tests": v.tests, "cases": cases[v.id], "requires": requires[v.id]}
                for v in task.variants]
    return {**pick(task.meta, TASK_FIELDS), "strict": task.strict, "starter": task.starter, "tests": task.tests,
            "cases": cases[task.id], "requires": requires[task.id], "variants": variants}


def lesson_entry(lesson: Lesson, adapter: LanguageAdapter, cases: CasesBySeed,
                 requires: dict[str, list[Json]]) -> Json:
    blocks: list[Json] = []
    for block in lesson.blocks:
        if isinstance(block, TextBlock):
            blocks.append({"type": "text", "markdown": block.markdown})
        elif isinstance(block, TaskBlock):
            blocks.append({"type": "task", "task": task_entry(block.task, cases, requires)})
        elif isinstance(block, CodeBlock) and block.kind != "claim":  # claims back a sentence and are never shown
            [ran] = adapter.run([block.code])  # already run by the checks, so this reads the same outcome
            blocks.append({"type": block.kind, "code": block.code, "output": ran["stdout"] if ran else ""})
    entry = {**pick(lesson.meta, LESSON_FIELDS), "blocks": blocks}
    if lesson.meta.get("tour"):
        entry["tour"] = True
    return entry


def boss_entry(boss: Boss, cases: CasesBySeed, requires: dict[str, list[Json]]) -> Json:
    meta = boss.meta
    return {"id": boss.id, "title": meta.get("title"), "world": meta.get("world"), "region": meta.get("region"),
            "intro": boss.intro, "starter": boss.starter, "hardTests": boss.hard_tests,
            "hardCases": cases[f"{boss.id}:hard"], "hardRequires": requires[f"{boss.id}:hard"],
            "hardChecks": meta.get("hard_checks"), "trophy": meta.get("trophy"),
            "hardTrophy": meta.get("hard_trophy"),
            "stages": [{**pick(s.meta, STAGE_FIELDS), "tests": s.tests, "cases": cases[s.id],
                        "requires": requires[s.id]} for s in boss.stages]}


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
    cases = bundle_cases(content, adapter)
    requires = bundle_requires(content)
    return {"version": BUNDLE_VERSION, "python": build_python(), "concepts": dict(sorted(content.concepts.items())),
            "worlds": [world_entry(w) for w in worlds],
            "lessons": [lesson_entry(lesson, adapter, cases, requires) for lesson in lessons],
            "bosses": [boss_entry(b, cases, requires) for b in bosses]}


def fingerprint(content: Path, gaps: Path) -> str:
    """A hash of everything the bundle is built from: the content, the checks, the harness and the pins."""
    digest = hashlib.sha256(sys.version.encode())
    files = sorted(p for p in content.rglob("*") if p.is_file() and "__pycache__" not in p.parts)
    checks = sorted(p for p in (ROOT / "tools" / "vet").rglob("*.py") if "__pycache__" not in p.parts)
    inputs = [ROOT / "py" / "harness.py", Path(__file__), *checks, ROOT / "vet" / "rules.toml", gaps,
              ROOT / "package.json", PYODIDE_LOCK]
    for path in [*files, *inputs]:
        if path.exists():
            digest.update(str(path).encode() + b"\0" + path.read_bytes())
    return digest.hexdigest()


def gap_failures(diff: GapDiff) -> list[str]:
    stale = [f"gap list: {k.rule} {k.item} {k.fingerprint} no longer happens: run pnpm gaps --write"
             for k in diff.stale]
    return [f"{f.item}: {f.message}" for f in diff.new] + stale


def report_known(known: list[Finding], to_job_summary: bool) -> None:
    for rule, count in sorted(Counter(f.rule for f in known).items()):
        print(f"known gap: {rule} x{count}")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary and to_job_summary:
        with Path(summary).open("a") as out:
            out.write(world_summary(known))


def report_mutation(line: str) -> None:
    print(line)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with Path(summary).open("a") as out:
            out.write(f"\n{line}\n")


def is_real_content(opts: argparse.Namespace) -> bool:
    return Path(opts.content).resolve() == (ROOT / "content").resolve()


def gaps_for(opts: argparse.Namespace, rules: frozenset[str]) -> set[GapKey]:
    """The known gaps of the rules that ran: --gaps, else vet/gaps.toml for the real content; other content
    (fixtures) has no known gaps."""
    path = Path(opts.gaps) if opts.gaps else GAPS_PATH if is_real_content(opts) else None
    return {gap for gap in (load_gaps(path) if path else set()) if gap.rule in rules}


def stamps(source: str, quick: bool) -> tuple[str, set[str]]:
    """The stamp this run writes, and the stamps that let --if-changed skip it: a full run serves a quick one."""
    full, fast = source, f"{source} quick"
    return (fast, {full, fast}) if quick else (full, {full})


def main() -> None:
    args = argparse.ArgumentParser()
    args.add_argument("--content", default=str(ROOT / "content"))
    args.add_argument("--out", default=str(ROOT / "src" / "content" / "bundle.json"))
    args.add_argument("--gaps", help="known gaps file (default: vet/gaps.toml for the real content, none otherwise)")
    args.add_argument("--no-version-check", action="store_true")
    args.add_argument("--quick", action="store_true", help=f"leave out the slow rules: {', '.join(sorted(SLOW_RULES))}")
    args.add_argument("--if-changed", action="store_true")
    args.add_argument("--jobs-out", help="also write every runtime verdict here, for pnpm vet:pyodide")
    opts = args.parse_args()
    out = Path(opts.out)
    stamp = out.with_name(out.name + ".sha256")
    writes, skips_on = stamps(fingerprint(Path(opts.content), Path(opts.gaps) if opts.gaps else GAPS_PATH), opts.quick)
    if opts.if_changed and out.exists() and stamp.exists() and stamp.read_text() in skips_on:
        print(f"content unchanged: kept {out}")
        return
    rules = frozenset(RULES) - SLOW_RULES if opts.quick else frozenset(RULES)
    content, load_findings = load_content(Path(opts.content))
    adapter = PythonAdapter()
    checked, broken = vet_content(content, adapter, rules)
    findings = load_findings + checked
    machine = (environment_problems() if not opts.no_version_check else []) + [f"lint: {e}" for e in broken]
    if machine:  # a broken machine says nothing about which gaps went stale, so every finding is listed
        failures = machine + [f"{f.item}: {f.message}" for f in findings]
    else:
        diff = compare(findings, gaps_for(opts, rules))
        report_known(diff.known, to_job_summary=is_real_content(opts) and not opts.quick)
        if is_real_content(opts) and not opts.quick:
            report_mutation(mutation.summary(content, CACHE_ROOT / mutation.KIND))
            print(f"cache: {use_report()}")
        failures = gap_failures(diff)
    if failures:
        print("\n".join(sorted(failures)))
        print(f"content check FAILED: {len(failures)} problem(s)")
        sys.exit(1)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(bundle(content, adapter), indent=1))
    stamp.write_text(writes)
    if opts.jobs_out:
        print(f"pyodide jobs: {write_jobs(content, adapter, Path(opts.jobs_out))} -> {opts.jobs_out}")
    skipped = f" (quick: {', '.join(sorted(SLOW_RULES))} not checked)" if opts.quick else ""
    print(f"content ok: {len(content.lessons)} lesson(s), {len(content.tasks)} task(s), {len(content.bosses)} boss(es)"
          f" -> {out}{skipped}")


if __name__ == "__main__":
    main()
