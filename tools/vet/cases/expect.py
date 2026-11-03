"""hidden_cases(): an item's generated inputs with the answers its model solution gives, ready for the bundle."""

from ..adapter import (
    CaseInput,
    CaseValue,
    ExprCase,
    ExprInput,
    HiddenCase,
    LanguageAdapter,
    ProgramCase,
    ProgramInput,
)
from ..model import Item
from .generate import generate_inputs
from .spec import CallShape, CasesDecl, DeclError, NoCases, parse_decl


class CasesProblem(Exception):
    """Why an item's hidden cases cannot be built, as the rule that reports it and a message."""

    def __init__(self, rule: str, message: str) -> None:
        super().__init__(message)
        self.rule = rule
        self.message = message


def item_decl(item: Item) -> CasesDecl | None:
    """The item's parsed [cases] table; None when it has none."""
    if item.cases is None:
        return None
    if not isinstance(item.cases, dict):
        raise CasesProblem("cases-decl-invalid", f"{item.seed} [cases]: must be a table")
    try:
        return parse_decl(item.cases, item.seed)
    except DeclError as e:
        raise CasesProblem("cases-decl-invalid", str(e)) from None


def _valid_input(decl: CasesDecl, case: CaseInput) -> str:
    """What a validity function receives as the input: the call's arguments, or a program's typed lines."""
    if isinstance(case, ProgramInput):
        return repr(case.stdin)
    assert isinstance(decl.shape, CallShape), "parse_decl allows valid only on a call or a program"
    inside = case.show.removeprefix(f"{decl.shape.call}(").removesuffix(")")
    return f"({inside},)" if inside else "()"


def _case(decl: CasesDecl, case: CaseInput, value: CaseValue) -> HiddenCase | None:
    """The hidden case for one input, or None when the solution raises an error the prompt does not name."""
    raises = value.raises
    if raises and raises not in decl.raises:
        return None
    expect = _valid_input(decl, case) if decl.valid else value.repr
    if isinstance(case, ExprInput):
        return ExprCase(case.show, case.setup, case.expr, expect, raises, decl.compare, decl.valid)
    if raises:  # a program has no way to expect an error, so the input is left out
        return None
    return ProgramCase(case.show, case.stdin, expect, decl.compare, decl.valid)


def hidden_cases(item: Item, adapter: LanguageAdapter) -> list[HiddenCase]:
    """The item's hidden cases; none when it declares none. Raises CasesProblem."""
    decl = item_decl(item)
    if decl is None or isinstance(decl.shape, NoCases):
        return []
    inputs = generate_inputs(decl, item.seed, decl.count)
    values = adapter.expect(item.solution, inputs)
    if values is None:
        raise CasesProblem("solution-fails-cases", f"{item.label} ran out of time on its hidden inputs")
    return [case for case_input, value in zip(inputs, values, strict=True)
            if (case := _case(decl, case_input, value)) is not None]
