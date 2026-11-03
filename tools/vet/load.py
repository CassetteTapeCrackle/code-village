"""load_content(): content files to the typed model, plus the problems found while reading them.

Moved from tools/content_check.py with its messages unchanged. Nothing here runs content code.
"""

import re
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

from .finding import Finding, subject
from .model import (
    Block,
    Boss,
    CodeBlock,
    CodeKind,
    Content,
    Lesson,
    Meta,
    Stage,
    Task,
    TaskBlock,
    TextBlock,
    Variant,
    World,
    fingerprint_files,
    fingerprint_text,
)

Fields = dict[str, type]
LESSON_FIELDS: Fields = {"id": str, "title": str, "world": str, "region": str, "order": int, "concepts": list,
                         "remember": list, "loot": dict}
TASK_FIELDS: Fields = {"id": str, "concept": str, "kind": str, "title": str, "prompt": str, "hints": list,
                       "gotcha": bool}
VARIANT_FIELDS: Fields = {"id": str, "title": str, "prompt": str}
BOSS_FIELDS: Fields = {"id": str, "title": str, "world": str, "region": str, "hard_checks": int, "trophy": dict,
                       "hard_trophy": dict}
STAGE_FIELDS: Fields = {"id": str, "title": str, "prompt": str, "hp": int}
WORLD_FIELDS: Fields = {"id": str, "order": int, "name": str, "area": str, "regions": dict, "building": dict,
                        "teacher": dict}
BUILDING_FIELDS: Fields = {"name": str, "place": str}
TEACHER_FIELDS: Fields = {"name": str, "portrait": str}
KEY_FIELDS: Fields = {"boss": str, "trophy": str, "trophy_name": str, "opens": str, "gate_hint": str}
CODE_FILES = ("starter", "solution", "tests")
KINDS = {"write", "fix", "complete"}
FENCE = re.compile(r"^```python (example|predict|claim)\n(.*?)^```\n", re.S | re.M)
TASK_LINE = re.compile(r"^::task ([\w-]+)\s*$", re.M)
CODE_KINDS: dict[str, CodeKind] = {"example": "example", "predict": "predict", "claim": "claim"}
BLOCK = re.compile(FENCE.pattern + "|" + TASK_LINE.pattern, re.S | re.M)


@dataclass
class Report:
    """Findings collected while loading one piece of content, all pinned to the same fingerprint."""

    root: Path
    fingerprint: str
    findings: list[Finding] = field(default_factory=list)

    def add(self, rule: str, item: str, message: str, path: Path) -> None:
        self.findings.append(subject(item, self.fingerprint, path, self.root).finding(rule, message))

    def require(self, meta: Meta, fields: Fields, where: str, source: str, path: Path) -> None:
        for name, kind in fields.items():
            if not isinstance(meta.get(name), kind):
                self.add("field-missing", where, f"{source} field {name} missing or not a {kind.__name__}", path)


def subfolders(folder: Path) -> list[Path]:
    return sorted(p for p in folder.iterdir() if p.is_dir()) if folder.is_dir() else []


def _strict(meta: Meta, where: str, report: Report, path: Path) -> bool:
    strict = meta.get("strict", False)
    if not isinstance(strict, bool):
        report.add("field-invalid", where, "strict must be true or false", path)
        return bool(strict)
    return strict


def _read_folder(folder: Path, toml_name: str, code_names: tuple[str, ...], where: str,
                 report: Report) -> tuple[Meta, dict[str, str]] | None:
    """A folder's TOML file and .py files, or None after reporting why not."""
    try:
        meta = tomllib.loads((folder / toml_name).read_text())
        files = {name: (folder / f"{name}.py").read_text() for name in code_names}
    except (OSError, tomllib.TOMLDecodeError) as e:
        report.add("file-unreadable", where, f"unreadable {toml_name} folder: {e}", folder / toml_name)
        return None
    return meta, files


def _wrong_files(folder: Path) -> tuple[Path, ...]:
    return tuple(sorted((folder / "wrong").glob("*.py")))


def _load_variant(folder: Path, lesson_text: str, root: Path) -> tuple[Variant | None, list[Finding]]:
    where = f"{folder.parents[1].name}/variants/{folder.name}"
    report = Report(root, fingerprint_files(folder, lesson_text))
    read = _read_folder(folder, "variant.toml", CODE_FILES, where, report)
    if read is None:
        return None, report.findings
    meta, files = read
    toml = folder / "variant.toml"
    report.require(meta, VARIANT_FIELDS, where, "variant.toml", toml)
    strict = _strict(meta, where, report, toml)
    variant = Variant(str(meta.get("id", where)), where, folder, meta, files["starter"], files["solution"],
                      files["tests"], strict, _wrong_files(folder), report.fingerprint)
    return variant, report.findings


def _load_task(folder: Path, lesson_text: str, root: Path) -> tuple[Task | None, list[Finding]]:
    where = f"{folder.parent.parent.name}/{folder.name}"
    report = Report(root, fingerprint_files(folder, lesson_text))
    read = _read_folder(folder, "task.toml", CODE_FILES, where, report)
    if read is None:
        return None, report.findings
    meta, files = read
    toml = folder / "task.toml"
    report.require(meta, TASK_FIELDS, where, "task.toml", toml)
    if meta.get("kind") not in KINDS:
        report.add("field-invalid", where, f"kind must be one of {sorted(KINDS)}", toml)
    hints = meta.get("hints")
    if not hints:
        report.add("field-missing", where, "a task needs at least one hint", toml)
    strict = _strict(meta, where, report, toml)
    variants = []
    for variant_folder in subfolders(folder / "variants"):
        variant, found = _load_variant(variant_folder, lesson_text, root)
        report.findings += found
        if variant:
            variants.append(variant)
    task = Task(str(meta.get("id", where)), where, folder, meta, files["starter"], files["solution"], files["tests"],
                strict, tuple(hints) if isinstance(hints, list) else (), _wrong_files(folder), tuple(variants),
                report.fingerprint)
    return task, report.findings


def front_matter(text: str, where: str, fields: Fields, report: Report, path: Path) -> tuple[Meta, str] | None:
    """The +++ TOML header and the body after it, or None after reporting why not."""
    parts = text.split("+++\n")
    if len(parts) < len(("", "front matter", "body")) or parts[0] != "":
        report.add("file-unreadable", where, "must start with +++ front matter", path)
        return None
    try:
        meta = tomllib.loads(parts[1])
    except tomllib.TOMLDecodeError as e:
        report.add("file-unreadable", where, f"unreadable front matter: {e}", path)
        return None
    report.require(meta, fields, where, "front matter", path)
    return meta, "+++\n".join(parts[2:])


def split_body(body: str) -> list[TextBlock | CodeBlock | str]:
    """Text, example, predict and claim blocks in order; a str is a ::task folder name."""
    blocks: list[TextBlock | CodeBlock | str] = []
    pos = 0
    for m in BLOCK.finditer(body):
        text = body[pos:m.start()].strip()
        if text:
            blocks.append(TextBlock(text))
        kind = CODE_KINDS.get(m.group(1) or "")
        blocks.append(CodeBlock(kind, m.group(2)) if kind else m.group(3))
        pos = m.end()
    tail = body[pos:].strip()
    if tail:
        blocks.append(TextBlock(tail))
    return blocks


def _load_lesson(lesson_md: Path, root: Path) -> tuple[Lesson | None, list[Finding]]:
    where = str(lesson_md.parent.relative_to(root))
    text = lesson_md.read_text()
    report = Report(root, fingerprint_text(text))
    parsed = front_matter(text, where, LESSON_FIELDS, report, lesson_md)
    if parsed is None:
        return None, report.findings
    meta, body = parsed
    if "tour" in meta and not isinstance(meta["tour"], bool):
        report.add("field-invalid", where, "tour must be true or false", lesson_md)
    blocks: list[Block] = []
    placed = set()
    for block in split_body(body):
        if not isinstance(block, str):
            blocks.append(block)
            continue
        folder = lesson_md.parent / "tasks" / block
        if not folder.is_dir():
            report.add("task-folder-missing", where, f"::task {block} has no folder", lesson_md)
            continue
        placed.add(block)
        task, found = _load_task(folder, text, root)
        report.findings += found
        if task:
            blocks.append(TaskBlock(task))
    for folder in subfolders(lesson_md.parent / "tasks"):
        if folder.name not in placed:
            report.add("task-unplaced", where, f"task folder {folder.name} is never placed with ::task", folder)
    return Lesson(where, lesson_md, meta, tuple(blocks), report.fingerprint), report.findings


def _load_stage(folder: Path, where: str, report: Report) -> Stage | None:
    stage_where = f"{where}/stages/{folder.name}"
    read = _read_folder(folder, "stage.toml", ("tests",), stage_where, report)
    if read is None:
        return None
    meta, files = read
    report.require(meta, STAGE_FIELDS, stage_where, "stage.toml", folder / "stage.toml")
    return Stage(str(meta.get("id")), stage_where, meta, files["tests"])


def _load_boss(boss_md: Path, root: Path) -> tuple[Boss | None, list[Finding]]:
    folder = boss_md.parent
    where = str(folder.relative_to(root))
    report = Report(root, fingerprint_files(folder))
    parsed = front_matter(boss_md.read_text(), where, BOSS_FIELDS, report, boss_md)
    if parsed is None:
        return None, report.findings
    meta, intro = parsed
    try:
        files = {name: (folder / f"{name}.py").read_text() for name in ("starter", "solution", "hard_tests")}
    except OSError as e:
        report.add("file-unreadable", where, f"unreadable boss files: {e}", folder)
        return None, report.findings
    stages = tuple(s for d in subfolders(folder / "stages") if (s := _load_stage(d, where, report)))
    if not 3 <= len(stages) <= 5:  # noqa: PLR2004 - the game's boss screen is drawn for 3 to 5 stages
        report.add("boss-stage-count", where, f"a boss needs 3 to 5 stages, found {len(stages)}", folder / "stages")
    boss = Boss(str(meta.get("id", where)), where, folder, meta, intro.strip(), files["starter"], files["solution"],
                files["hard_tests"], stages, _wrong_files(folder), report.fingerprint)
    return boss, report.findings


def _load_concepts(root: Path) -> tuple[dict[str, str], list[Finding]]:
    """content/concepts.toml: the readable name of every concept."""
    where = "concepts.toml"
    path = root / where
    try:
        text = path.read_text()
    except OSError:
        report = Report(root, fingerprint_text(""))
        report.add("file-unreadable", where, "missing: every concept needs a name", path)
        return {}, report.findings
    report = Report(root, fingerprint_text(text))
    try:
        names = tomllib.loads(text)
    except tomllib.TOMLDecodeError as e:
        report.add("file-unreadable", where, f"unreadable: {e}", path)
        return {}, report.findings
    for concept, name in names.items():
        if not isinstance(name, str) or not name.strip():
            report.add("concept-unnamed", where, f"concept {concept} needs a name", path)
    return {c: n for c, n in names.items() if isinstance(n, str) and n.strip()}, report.findings


def _load_world(folder: Path, root: Path) -> tuple[World | None, list[Finding]]:
    """A world folder's world.toml: its words and wiring (the look lives in code)."""
    where = f"{folder.name}/world.toml"
    path = folder / "world.toml"
    try:
        text = path.read_text()
    except OSError:
        report = Report(root, fingerprint_text(""))
        report.add("file-unreadable", where, "missing: every world folder needs one", path)
        return None, report.findings
    report = Report(root, fingerprint_text(text))
    try:
        meta = tomllib.loads(text)
    except tomllib.TOMLDecodeError as e:
        report.add("file-unreadable", where, f"unreadable: {e}", path)
        return None, report.findings
    report.require(meta, WORLD_FIELDS, where, "world.toml", path)
    report.require(meta.get("building") or {}, BUILDING_FIELDS, where, "[building]", path)
    report.require(meta.get("teacher") or {}, TEACHER_FIELDS, where, "[teacher]", path)
    if "key" in meta:
        report.require(meta["key"], KEY_FIELDS, where, "[key]", path)
    if meta.get("id") != folder.name:
        report.add("world-id-mismatch", where, f"id must be the folder name, {folder.name}", path)
    return World(str(meta.get("id")), where, path, meta, report.fingerprint), report.findings


def load_content(root: Path) -> tuple[Content, list[Finding]]:
    findings: list[Finding] = []
    lessons = []
    for lesson_md in sorted(root.glob("*/*/*/lesson.md")):
        lesson, found = _load_lesson(lesson_md, root)
        findings += found
        if lesson:
            lessons.append(lesson)
    bosses = []
    for boss_md in sorted(root.glob("*/*/boss/boss.md")):
        boss, found = _load_boss(boss_md, root)
        findings += found
        if boss:
            bosses.append(boss)
    concepts, found = _load_concepts(root)
    findings += found
    worlds = []
    for folder in subfolders(root):
        world, found = _load_world(folder, root)
        findings += found
        if world:
            worlds.append(world)
    return Content(root, tuple(worlds), tuple(lessons), tuple(bosses), concepts), findings
