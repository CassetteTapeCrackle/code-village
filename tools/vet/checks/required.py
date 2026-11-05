"""Rules required-untaught, required-not-in-prompt and prompt-asks-construct (spec 11b).

A prompt may ask for a way of writing the code ("put @property above the method"). Such a task lists the feature in
`requires` and Check verifies it. The prompt must name the construct and a lesson up to the task must teach it. A
prompt that names a construct without requiring it is a gap, unless `construct_words_ok = "reason"` says why not.
"""

from collections.abc import Iterable

from ..adapter import LanguageAdapter
from ..finding import Finding, Subject, subject
from ..model import Content, Feature, Item
from .progression import item_positions, judged_count, lesson_order, taught_at


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    del adapter  # reads the declarations and prompts only
    order = lesson_order(content)
    judged = judged_count(order)
    positions = item_positions(content, order)
    for item in content.items():
        about = subject(item.id, item.fingerprint, item.folder, content.root)
        prompt = item.prompt.lower()
        for feature_id in item.requires_ids:
            feature = content.features.get(feature_id)
            if feature is None:
                yield about.finding("unknown-feature", f"{item.seed} requires {feature_id}, which "
                                                       "content/features.toml does not list")
                continue
            yield from _requirement(item, feature, about, prompt)
            position = positions.get(item.id)
            if position is not None and position <= judged and feature_id not in taught_at(order, position):
                yield about.finding("required-untaught", f"{item.seed} requires {feature_id}, which no lesson up to "
                                                         "here teaches: add it to a lesson's teaches")
        if not item.words_ok:
            yield from _unrequired(item, content.features.values(), about, prompt)


def _requirement(item: Item, feature: Feature, about: Subject, prompt: str) -> Iterable[Finding]:
    if not feature.say:
        yield about.finding("field-missing", f"{item.seed} requires {feature.id}, which has no `say` in "
                                             "content/features.toml: Check cannot tell the learner what to do")
    if not any(word in prompt for word in feature.words):
        looked_for = ", ".join(feature.words) or "no words listed"
        yield about.finding("required-not-in-prompt", f"{item.seed} requires {feature.id}, but its prompt never "
                                                      f"names it (looked for: {looked_for})")


def _unrequired(item: Item, features: Iterable[Feature], about: Subject, prompt: str) -> Iterable[Finding]:
    for feature in features:
        word = next((w for w in feature.words if w in prompt), None)
        if word and feature.id not in item.requires_ids:
            yield about.finding("prompt-asks-construct", f"the prompt of {item.seed} names '{word}' but the task does "
                                                         f"not require {feature.id}: add it to `requires`, or give "
                                                         "`construct_words_ok = \"why not\"`")
