"""Canaries prove each rule fires: a copy of a clean fixture with one planted defect must give exactly its rules.

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
    return {f.rule for f in vet(materialize(canary_dir, Path(tempfile.mkdtemp())))}


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
