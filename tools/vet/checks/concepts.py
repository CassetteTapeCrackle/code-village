"""Rules concept-unnamed, concept-name-unused, concept-too-few-tasks and concept-no-gotcha."""

from collections.abc import Iterable

from ..adapter import LanguageAdapter
from ..finding import Finding, Subject
from ..model import Content, fingerprint_text

MIN_TASKS = 3


def _about(item: str, message: str, path: str) -> Subject:
    # a concept spans many files, so a finding is pinned to its own text: it goes stale once it is fixed
    return Subject(item, fingerprint_text(message), path)


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    tasks = content.tasks
    lesson_concepts = {c for lesson in content.lessons for c in _strings(lesson.meta.get("concepts"))}
    used = lesson_concepts | {str(t.meta.get("concept")) for t in tasks}
    names = content.concepts
    for concept in sorted(used - names.keys()):
        message = f"concept {concept} has no name"
        yield _about("concepts.toml", message, "concepts.toml").finding("concept-unnamed", message)
    for concept in sorted(names.keys() - used):
        message = f"concept {concept} is named but no lesson or task uses it"
        yield _about("concepts.toml", message, "concepts.toml").finding("concept-name-unused", message)
    for concept in sorted(used):
        mine = [t for t in tasks if t.meta.get("concept") == concept]
        if len(mine) < MIN_TASKS:
            message = f"concept {concept} has {len(mine)} tasks, needs at least {MIN_TASKS}"
            yield _about("content", message, "concepts.toml").finding("concept-too-few-tasks", message)
        if not any(t.meta.get("gotcha") for t in mine):
            message = f"concept {concept} has no gotcha task"
            yield _about("content", message, "concepts.toml").finding("concept-no-gotcha", message)


def _strings(value: object) -> list[str]:
    return [str(v) for v in value] if isinstance(value, list) else []
