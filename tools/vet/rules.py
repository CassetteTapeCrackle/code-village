"""The rule ids every Finding uses, loaded from vet/rules.toml."""

import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, get_args

Severity = Literal["wrong-accepted", "right-refused", "false-claim", "ambiguous", "progression", "wiring", "data"]
SEVERITIES: tuple[str, ...] = get_args(Severity)
RULES_PATH = Path(__file__).resolve().parents[2] / "vet" / "rules.toml"


class RulesError(ValueError):
    """vet/rules.toml has an entry the engine cannot use."""


@dataclass(frozen=True)
class Rule:
    id: str
    summary: str
    severity: Severity


_BY_NAME: dict[str, Severity] = {name: name for name in get_args(Severity)}


def _severity(value: object, where: str) -> Severity:
    if isinstance(value, str) and value in _BY_NAME:
        return _BY_NAME[value]
    raise RulesError(f"{where}: severity must be one of {', '.join(SEVERITIES)}")


def load_rules(path: Path) -> dict[str, Rule]:
    table = tomllib.loads(path.read_text()).get("rule", {})
    rules = {}
    for rule_id, entry in table.items():
        where = f"{path.name} [rule.{rule_id}]"
        summary = entry.get("summary")
        if not isinstance(summary, str) or not summary:
            raise RulesError(f"{where}: summary must be a non-empty string")
        rules[rule_id] = Rule(id=rule_id, summary=summary, severity=_severity(entry.get("severity"), where))
    return rules


RULES = load_rules(RULES_PATH)
