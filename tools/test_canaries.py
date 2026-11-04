"""Canaries prove each rule fires: a copy of a clean fixture with one planted defect must give its rules.

The format is in tools/fixtures/canaries/README.md.
"""

import shutil
import tempfile
import tomllib
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from vet import vet
from vet.rules import RULES

FIXTURES = Path(__file__).resolve().parent / "fixtures"
CANARIES = FIXTURES / "canaries"
HELDOUT = FIXTURES / "canaries-heldout"  # written by a reviewer who never saw the checker or the canaries above
# the failure classes a held-out canary may name, as the severities of the rules that belong to them
FAILURE_CLASSES = ("false-claim", "wrong-accepted", "right-refused", "ambiguous", "progression", "wiring")


def materialize(canary_dir: Path, into: Path) -> Path:
    """Copy the canary's base fixture into `into`/content and apply its patch; returns that content folder."""
    canary = tomllib.loads((canary_dir / "canary.toml").read_text())
    content = into / "content"
    shutil.copytree(FIXTURES / canary["base"], content)
    for gone in canary.get("delete", []):
        target = content / gone["path"]
        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()
    for patch in canary.get("file", []):
        target = content / patch["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(patch["text"])
    return content


def canary_dirs() -> list[Path]:
    return sorted(p.parent for p in CANARIES.glob("*/*/canary.toml"))


def expected_rules(canary_dir: Path) -> set[str]:
    return set(tomllib.loads((canary_dir / "canary.toml").read_text())["expect"])


def found_rules(canary_dir: Path) -> set[str]:
    """The rules a canary's planted defect gives. Only the checks behind the rule it is filed under and the rules
    it expects run; the good fixture runs every check, which is where a false alarm would show."""
    targets = frozenset({canary_dir.parent.name, *expected_rules(canary_dir)})
    with tempfile.TemporaryDirectory() as into:
        return {f.rule for f in vet(materialize(canary_dir, Path(into)), only=targets)}


def heldout_dirs() -> list[Path]:
    return sorted(p.parent for p in HELDOUT.glob("round-*/*/canary.toml"))


# findings that only say a file could not be read or lacks a field: a broken file is not a caught defect
LOADER_RULES = {"file-unreadable", "field-missing", "field-invalid"}


def caught_rules(canary_dir: Path) -> set[str]:
    """The rules of every finding a held-out canary gives when all checks run. The clean fixture gives none, so any
    finding is the planted defect; the class the author guessed is a label, not a condition, because one defect can
    be filed under another class (a test that fails on Python 3.12 is a false claim, not a refused answer)."""
    with tempfile.TemporaryDirectory() as into:
        return {f.rule for f in vet(materialize(canary_dir, Path(into)))} - LOADER_RULES


class Canaries(unittest.TestCase):
    def test_good_fixture_has_no_findings(self) -> None:
        self.assertEqual(vet(FIXTURES / "good"), [])

    def test_each_canary_finds_exactly_its_rules(self) -> None:
        dirs = canary_dirs()
        self.assertTrue(dirs)
        # each vet() already runs its jobs in parallel; a few canaries at once keep every CPU busy
        with ThreadPoolExecutor(max_workers=4) as pool:
            found = dict(zip(dirs, pool.map(found_rules, dirs), strict=True))
        for canary_dir, rules in found.items():
            with self.subTest(canary=str(canary_dir.relative_to(CANARIES))):
                self.assertEqual(rules, expected_rules(canary_dir))

    def test_heldout_canaries_are_caught(self) -> None:
        dirs = heldout_dirs()
        with ThreadPoolExecutor(max_workers=4) as pool:
            caught = dict(zip(dirs, pool.map(caught_rules, dirs), strict=True))
        for canary_dir, rules in caught.items():
            with self.subTest(canary=str(canary_dir.relative_to(HELDOUT))):
                self.assertTrue(rules, "the checker missed this planted defect")

    def test_heldout_canaries_name_a_failure_class(self) -> None:
        for canary_dir in heldout_dirs():
            with self.subTest(canary=str(canary_dir.relative_to(HELDOUT))):
                self.assertTrue(expected_rules(canary_dir))
                self.assertEqual(sorted(expected_rules(canary_dir) - set(FAILURE_CLASSES)), [])

    def test_every_rule_has_a_canary(self) -> None:
        covered = set().union(*(expected_rules(d) for d in canary_dirs()))
        self.assertEqual(sorted(RULES.keys() - covered), [])

    def test_canaries_name_only_known_rules(self) -> None:
        for canary_dir in canary_dirs():
            with self.subTest(canary=canary_dir.name):
                self.assertEqual(sorted(expected_rules(canary_dir) - RULES.keys()), [])

    def test_materialize_writes_and_deletes(self) -> None:
        canary_dir = Path(tempfile.mkdtemp())
        (canary_dir / "canary.toml").write_text(
            'base = "good"\nexpect = []\n[[file]]\npath = "w1/new.txt"\ntext = "hi"\n'
            '[[delete]]\npath = "w1/a/boss/stages"\n[[delete]]\npath = "concepts.toml"\n')
        content = materialize(canary_dir, Path(tempfile.mkdtemp()))
        self.assertEqual((content / "w1" / "new.txt").read_text(), "hi")
        self.assertFalse((content / "w1" / "a" / "boss" / "stages").exists())
        self.assertFalse((content / "concepts.toml").exists())


if __name__ == "__main__":
    unittest.main()
