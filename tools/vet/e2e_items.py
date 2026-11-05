"""The items file the generated browser tests read (.vet-cache/e2e-items.json).

One entry per task (id, lesson, title, and the paths of its solution, starter and first wrong/ answer) and per boss
(its lessons, solution and title). A task also carries the first mutant that only the hidden cases kill, read from
the mutation cache, so the browser test can show the "We also tried" line; none when the mutation check has not run.
"""

import json
import os
from pathlib import Path

from .cache import cache_for, framework_hash, read
from .checks.mutation import KIND
from .model import Boss, Content

ROOT = Path(__file__).resolve().parents[2]


def _rel(path: Path) -> str:
    try:
        return os.path.relpath(path, ROOT)
    except ValueError:
        return str(path)


def hidden_only_mutant(content: Content, fingerprint: str) -> str | None:
    """The code of the first cached mutant that only hidden cases kill, None when there is none or no cache."""
    folder = cache_for(content, KIND)
    value = read(folder, fingerprint, framework_hash()) if folder else None
    for entry in value if isinstance(value, list) else []:
        if isinstance(entry, dict) and entry.get("verdict") == "hidden":
            return str(entry["code"])
    return None


def _boss_entry(content: Content, boss: Boss) -> dict[str, object]:
    region = (boss.meta.get("world"), boss.meta.get("region"))
    lessons = [str(lesson.meta.get("id")) for lesson in content.lessons
               if (lesson.meta.get("world"), lesson.meta.get("region")) == region]
    return {"id": boss.id, "title": str(boss.meta.get("title")), "solution": _rel(boss.folder / "solution.py"),
            "lessons": lessons}


def e2e_items(content: Content) -> dict[str, list[dict[str, object]]]:
    tasks: list[dict[str, object]] = []
    for lesson in content.lessons:
        for task in lesson.tasks:
            tasks.append({
                "id": task.id, "lesson": str(lesson.meta.get("id")), "title": str(task.meta.get("title")),
                "solution": _rel(task.folder / "solution.py"), "starter": _rel(task.folder / "starter.py"),
                "wrong": _rel(task.wrong[0]) if task.wrong else None,
                "hiddenMutant": hidden_only_mutant(content, task.fingerprint)})
    bosses = [_boss_entry(content, boss) for boss in content.bosses]
    return {"tasks": tasks, "bosses": bosses}


def write_items(content: Content, path: Path) -> int:
    """Write the items file; returns how many tasks and bosses it holds."""
    items = e2e_items(content)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(items, indent=1) + "\n")
    return len(items["tasks"]) + len(items["bosses"])
