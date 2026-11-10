"""Rules hint-code-invalid, hint-giveaway and field-invalid (a hint that is not text).

Code in a hint must compile, and a hint must not quote a solution line, renamed or not.
Review sessions show a task's variants without hints, so only the task's own solution matters.
"""

import builtins
import io
import keyword
import re
import tokenize
from collections.abc import Iterable

from ..adapter import LanguageAdapter
from ..finding import Finding, subject
from ..model import Content

HINT_CODE = re.compile(r"`([^`]+)`")
# A hint often shows half a statement: wrap it in each context it could come from and accept it if one compiles.
HINT_WRAPS = (
    "{s}", "{s}\n    pass", "{s}\nclass _C: pass",
    "if _x:\n    pass\n{s}\n    pass", "try:\n    pass\n{s}\n    pass", "for _ in _:\n    {s}",
    "def _f():\n    {s}", "def _f():\n    {s}\n        pass", "def _f():\n    {s}\n    except Exception:\n        pass",
    "def _f():\n    if _x:\n        pass\n    {s}", "def _f():\n    try:\n        pass\n    {s}",
    "def _f():\n    for _ in _:\n        {s}",
    "_x {s}", "_d = {{s}}",
)
# `_y` glued after the span finishes a fragment: a bare operator (`*`, `==`, `+`), a keyword-argument
# prefix (`key=`) or a half element (`x,`). It must not finish a whole statement, or `x = 1 +` would
# parse as the keyword argument `x=1+_y` and pass. So only a span with no space, or one ending in a
# comma, takes the glue.
GLUE_WRAPS = ("_x {s} _y", "_f(_x, {s}_y)")
SKIP_TOKENS = {tokenize.NL, tokenize.NEWLINE, tokenize.INDENT, tokenize.DEDENT, tokenize.ENDMARKER, tokenize.COMMENT}
STRING_TOKENS = {tokenize.STRING, tokenize.FSTRING_START, tokenize.FSTRING_MIDDLE, tokenize.FSTRING_END}
BUILTINS = set(dir(builtins))
MIN_GIVEAWAY = 8  # characters, spaces removed: shorter lines teach nothing on their own
MIN_MASKED = 4  # tokens: a masked shape shorter than this matches too much
Shape = tuple[str, ...]


def takes_glue(span: str) -> bool:
    return not any(c.isspace() for c in span) or span.rstrip().endswith(",")


def looks_like_code(span: str) -> bool:
    """A lone word or a file name in backticks is prose, not code to check."""
    return " " in span.strip() or any(c in span for c in "()[]{}=:<>+-*/%'\"")


def hint_code_compiles(span: str) -> bool:
    # a format spec like {total:.2f} only makes sense inside an f-string
    wraps = HINT_WRAPS + (('f"{s}"',) if span.startswith("{") else ())
    if takes_glue(span):
        wraps += GLUE_WRAPS
    for text in (span, span + ":"):
        for wrap in wraps:
            try:
                compile(wrap.replace("{s}", text), "<hint>", "exec")  # replace, not format: hints hold braces
                return True
            except SyntaxError:
                continue
    return False


def squeeze(code: str) -> str:
    """Code with every space gone, so a hint cannot dodge the check by reformatting a line."""
    return "".join(code.split())


def _shape(code: str, *, mask_literals: bool) -> Shape | None:
    """A token sequence with names numbered v1, v2... in first-seen order; None if it cannot be tokenized.

    Keywords, builtins, operators and punctuation keep their spelling. Unmasked, attribute names after a dot
    and literals keep theirs too, so a consistent rename of a solution line keeps the same shape. Masked,
    attributes are numbered like names and every string and number becomes a placeholder.
    """
    names: dict[str, str] = {}
    kept = []
    previous = ""
    try:
        for tok in tokenize.generate_tokens(io.StringIO(code).readline):
            if tok.type in SKIP_TOKENS:
                continue
            renamable = (tok.type == tokenize.NAME and not keyword.iskeyword(tok.string)
                         and tok.string not in BUILTINS and (mask_literals or previous != "."))
            if renamable:
                kept.append(names.setdefault(tok.string, f"v{len(names) + 1}"))
            elif mask_literals and tok.type in STRING_TOKENS:
                kept.append("s")
            elif mask_literals and tok.type == tokenize.NUMBER:
                kept.append("n")
            else:
                kept.append(tok.string)
            previous = tok.string
    except (tokenize.TokenError, IndentationError):
        return None
    return tuple(kept)


def renamed_shape(code: str) -> Shape | None:
    return _shape(code, mask_literals=False)


def masked_shape(code: str) -> Shape | None:
    return _shape(code, mask_literals=True)


def giveaway_lines(solution: str, starter: str) -> list[str]:
    """The solution lines a hint must not quote: short ones and ones the starter already shows teach nothing."""
    shown = {squeeze(line) for line in starter.splitlines()}
    return [line.strip() for line in solution.splitlines()
            if not line.strip().startswith("#") and len(squeeze(line)) >= MIN_GIVEAWAY and squeeze(line) not in shown]


def hint_problems(hints: Iterable[object], solution: str, starter: str) -> list[tuple[str, str]]:
    """(rule, message) for every problem in a task's hints."""
    shown = {squeeze(line) for line in starter.splitlines()}
    answers = giveaway_lines(solution, starter)
    quoted = {squeeze(line) for line in answers}
    shapes = {renamed: line for line in answers if (renamed := renamed_shape(line))}
    masked = {shape: line for line in answers if (shape := masked_shape(line)) and len(shape) >= MIN_MASKED}
    problems = []
    for number, hint in enumerate(hints, 1):
        if not isinstance(hint, str):
            problems.append(("field-invalid", "a hint must be a string"))
            continue
        for span in HINT_CODE.findall(hint):
            if looks_like_code(span) and not hint_code_compiles(span):
                problems.append(("hint-code-invalid", f"hint code is not valid Python: `{span}`"))
            giveaway = f"hint {number} gives away the solution: `{span}`"
            if squeeze(span) in quoted:
                problems.append(("hint-giveaway", giveaway))
            elif (len(squeeze(span)) >= MIN_GIVEAWAY and squeeze(span) not in shown
                  and (line := shapes.get(renamed_shape(span) or ()))):
                problems.append(("hint-giveaway", f"{giveaway} is `{line}` renamed"))
            elif (shape := masked_shape(span)) and len(shape) >= MIN_MASKED and (line := masked.get(shape)):
                problems.append(("hint-giveaway", f"{giveaway} is `{line}` with names, strings or numbers changed"))
    return problems


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    for task in content.tasks:
        about = subject(task.id, task.fingerprint, task.folder / "task.toml", content.root)
        for rule, message in hint_problems(task.hints, task.solution, task.starter):
            yield about.finding(rule, message)
