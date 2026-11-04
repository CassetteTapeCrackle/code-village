"""Rules claim-no-assert, claim-fails, example-fails and predict-silent: every runnable lesson block runs.

A claim block backs the sentence above it with asserts and is never shown. Example and predict blocks show
their real output, so they must run cleanly, and a predict block must print something to predict.
"""

import ast
from collections.abc import Iterable

from ..adapter import LIMIT, LanguageAdapter, RunOutcome
from ..finding import Finding, Subject, subject
from ..model import CodeBlock, Content, Lesson


def runnable(content: Content) -> list[tuple[Lesson, CodeBlock]]:
    return [(lesson, block) for lesson in content.lessons for block in lesson.blocks
            if isinstance(block, CodeBlock) and (block.kind != "claim" or "assert" in block.code)]


def vacuous_asserts(code: str) -> list[str]:
    """Asserts that cannot fail: a non-empty tuple (assert (cond, "message") is always true) or a constant."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []
    asserts = [n.test for n in ast.walk(tree) if isinstance(n, ast.Assert)]
    return [ast.unparse(test) for test in asserts
            if (isinstance(test, ast.Tuple) and test.elts) or (isinstance(test, ast.Constant) and test.value)]


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    for lesson in content.lessons:
        for block in lesson.blocks:
            if isinstance(block, CodeBlock) and block.kind == "claim" and "assert" not in block.code:
                yield _about(content, lesson).finding("claim-no-assert", "a claim block needs an assert")
            if isinstance(block, CodeBlock) and block.kind == "claim" and (vacuous := vacuous_asserts(block.code)):
                yield _about(content, lesson).finding("claim-vacuous", f"a claim asserts {vacuous[0]}, which can never "
                                                      "fail: write the condition alone, and the message after a comma")
    blocks = runnable(content)
    for (lesson, block), ran in zip(blocks, adapter.run([block.code for _, block in blocks]), strict=True):
        about = _about(content, lesson)
        problems = _judge_claim(ran) if block.kind == "claim" else _judge_example(block, ran)
        yield from (about.finding(rule, message) for rule, message in problems)


def _judge_claim(ran: RunOutcome | None) -> list[tuple[str, str]]:
    if ran is None:
        return [("claim-fails", f"a claim block ran longer than {LIMIT} s")]
    if ran["error"]:
        return [("claim-fails", f"a claim is false: {ran['error']}")]
    return []


def _judge_example(block: CodeBlock, ran: RunOutcome | None) -> list[tuple[str, str]]:
    if ran is None:
        return [("example-fails", f"this {block.kind} block ran longer than {LIMIT} s")]
    problems = [("example-fails", f"this {block.kind} block raised: {ran['error']}")] if ran["error"] else []
    if block.kind == "predict" and not ran["stdout"]:
        problems.append(("predict-silent", "a predict block prints nothing"))
    return problems


def _about(content: Content, lesson: Lesson) -> Subject:
    return subject(lesson.where, lesson.fingerprint, lesson.path, content.root)
