"""The seam between the rule engine and a language: every type shared across checks, and the adapter protocol.

A language adapter runs code and tests, breaks code (mutants), rewrites it (equivalent forms) and lists the
features it uses. Rules call it by file extension and never touch the language directly.
"""

from collections.abc import Mapping, Sequence
from dataclasses import asdict, dataclass
from typing import Literal, Protocol, TypedDict

# seconds a run may take: a guard against runaway loops, not a speed budget (World 3 runs take ~2 s alone but
# 10+ s on a loaded machine)
LIMIT = 30
class ToolError(RuntimeError):
    """A tool a check needs could not run: a problem with the machine, not with the content."""


Compare = Literal["exact", "unordered", "float", "text", "array", "frame", "valid"]


@dataclass(frozen=True)
class ExprInput:
    """A generated call: `setup` lines, then `expr` evaluated; `show` is what the learner reads."""

    show: str
    setup: str
    expr: str


@dataclass(frozen=True)
class ProgramInput:
    """Typed lines for a whole program's input() calls."""

    show: str
    stdin: tuple[str, ...]


CaseInput = ExprInput | ProgramInput


@dataclass(frozen=True)
class CaseValue:
    """What the model solution gave for one input: source for its answer, or the type of the exception it raised.
    repr is None when the answer has no source that evaluates back to it (an object with the default repr)."""

    repr: str | None
    raises: str | None


@dataclass(frozen=True)
class ExprCase:
    """A hidden case. With compare "valid", `expect` is the input, which the tests.py function `valid` judges."""

    show: str
    setup: str
    expr: str
    expect: str
    raises: str | None
    compare: Compare
    valid: str | None = None


@dataclass(frozen=True)
class ProgramCase:
    show: str
    stdin: tuple[str, ...]
    expect: str
    compare: Compare
    valid: str | None = None


HiddenCase = ExprCase | ProgramCase


def case_json(case: HiddenCase) -> dict[str, object]:
    """A case as the harness and the bundle read it: tagged with its kind, `valid` only when set."""
    fields = {k: list(v) if isinstance(v, tuple) else v for k, v in asdict(case).items()
              if k != "valid" or v is not None}
    return {"kind": "expr" if isinstance(case, ExprCase) else "program", **fields}


@dataclass(frozen=True)
class Required:
    """A construct a task asks for by name (spec 11b): detectors over the syntax tree and what to tell the learner."""

    id: str
    detect: tuple[str, ...]
    say: str


@dataclass(frozen=True)
class Mutant:
    id: str
    operator: str
    line: int
    code: str
    summary: str


@dataclass(frozen=True)
class Rewrite:
    id: str
    transform: str
    code: str


@dataclass(frozen=True)
class FeatureQuery:
    """Code to list the features of. `own_names` are methods defined elsewhere (a hint names a method of the
    task's class), which are the learner's own and no feature."""

    code: str
    own_names: tuple[str, ...] = ()


@dataclass(frozen=True)
class CheckJob:
    code: str
    tests: str
    strict: bool = False
    cases: tuple[HiddenCase, ...] = ()
    requires: tuple[Required, ...] = ()
    limit: float = LIMIT  # seconds before the job counts as running out of time
    hash_seed: int = 0  # PYTHONHASHSEED of the run: fixed, so set and dict order repeat; the flaky check varies it


class TestResultDict(TypedDict):
    name: str
    passed: bool
    message: str
    hidden: bool


class CheckOutcome(TypedDict):
    error: str | None
    results: list[TestResultDict]


class RunOutcome(TypedDict):
    stdout: str
    error: str | None


class LanguageAdapter(Protocol):
    extension: str

    def run(self, codes: Sequence[str]) -> list[RunOutcome | None]:
        """Run each program with no input; None means it ran out of time."""
        ...

    def check(self, jobs: Sequence[CheckJob]) -> list[CheckOutcome | None]:
        """Run each job's code against its tests; None means it ran out of time."""
        ...

    def expect(self, code: str, cases: Sequence[CaseInput]) -> list[CaseValue] | None:
        """The code's answer for each input; None means it ran out of time."""
        ...

    def mutants(self, code: str) -> list[Mutant]: ...

    def rewrites(self, code: str) -> list[Rewrite]: ...

    def features(self, queries: Sequence[FeatureQuery], vocabulary: Mapping[str, Sequence[str]]
                 ) -> list[frozenset[str]]:
        """The feature ids each piece of code uses (`unknown:<detector>` for what the vocabulary lacks)."""
        ...


def passes(outcome: CheckOutcome | None) -> bool:
    """True when the code ran in time, loaded, and every test passed."""
    if outcome is None or outcome["error"] or not outcome["results"]:
        return False
    return all(r["passed"] for r in outcome["results"])
