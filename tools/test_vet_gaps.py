import subprocess
import tempfile
import unittest
from pathlib import Path

from vet import Finding, GapKey
from vet.gaps import BaseError, added_for_old_rules, compare, dump_gaps, load_gaps, world_summary


def finding(rule: str = "solution-fails", item: str = "a", fingerprint: str = "f1") -> Finding:
    return Finding(rule, item, fingerprint, "message", "path")


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-c", "commit.gpgsign=false", "-c", "user.name=t", "-c", "user.email=t@t", *args],
                   cwd=repo, check=True, capture_output=True)


def repo_with(rules: str, gaps: str) -> Path:
    """A git repo whose first commit holds vet/rules.toml and vet/gaps.toml; tag base points at it."""
    repo = Path(tempfile.mkdtemp())
    (repo / "vet").mkdir()
    (repo / "vet" / "rules.toml").write_text(rules)
    (repo / "vet" / "gaps.toml").write_text(gaps)
    git(repo, "init", "-q")
    git(repo, "add", ".")
    git(repo, "commit", "-q", "-m", "base")
    git(repo, "tag", "base")
    return repo


OLD_RULE = '[rule.solution-fails]\nsummary = "s"\nseverity = "right-refused"\n'
NEW_RULE = '[rule.cases-missing]\nsummary = "s"\nseverity = "wrong-accepted"\n'


class Compare(unittest.TestCase):
    def test_new_finding_fails(self) -> None:
        diff = compare([finding()], set())
        self.assertEqual(diff.new, [finding()])

    def test_stale_gap_fails(self) -> None:
        gone = GapKey("solution-fails", "a", "old")
        diff = compare([], {gone})
        self.assertEqual(diff.stale, [gone])

    def test_known_gap_passes(self) -> None:
        diff = compare([finding()], {finding().key})
        self.assertEqual((diff.new, diff.stale, diff.known), ([], [], [finding()]))

    def test_unreadable_files_can_never_be_listed(self) -> None:
        unreadable = finding(rule="file-unreadable")
        diff = compare([unreadable], {unreadable.key})
        self.assertEqual((diff.new, diff.known), ([unreadable], []))

    def test_changed_fingerprint_is_new_and_stale(self) -> None:
        diff = compare([finding(fingerprint="f2")], {finding().key})
        self.assertEqual((len(diff.new), diff.stale), (1, [finding().key]))


class File(unittest.TestCase):
    def test_dump_is_sorted_and_loads_back(self) -> None:
        keys = {GapKey("b", "x", "1"), GapKey("a", "y", "2")}
        text = dump_gaps(keys)
        self.assertLess(text.index('rule = "a"'), text.index('rule = "b"'))
        path = Path(tempfile.mkdtemp()) / "gaps.toml"
        path.write_text(text)
        self.assertEqual(load_gaps(path), keys)

    def test_missing_file_is_an_empty_list(self) -> None:
        self.assertEqual(load_gaps(Path(tempfile.mkdtemp()) / "gaps.toml"), set())


class Summary(unittest.TestCase):
    def test_summary_counts_per_world_and_rule(self) -> None:
        findings = [Finding("solution-fails", "a", "1", "m", "w1/a/x/tasks/t/solution.py"),
                    Finding("solution-fails", "b", "2", "m", "w1/b/y/tasks/u/solution.py"),
                    Finding("concept-no-gotcha", "content", "3", "m", "concepts.toml")]
        summary = world_summary(findings)
        self.assertIn("| w1 | solution-fails | right-refused | 2 |", summary)
        self.assertIn("| all | concept-no-gotcha | wiring | 1 |", summary)

    def test_summary_says_none(self) -> None:
        self.assertIn("None.", world_summary([]))


class Base(unittest.TestCase):
    def test_base_check_rejects_added_entry_for_old_rule(self) -> None:
        repo = repo_with(OLD_RULE, "")
        added = GapKey("solution-fails", "a", "f1")
        (repo / "vet" / "gaps.toml").write_text(dump_gaps({added}))
        self.assertEqual(added_for_old_rules("base", repo), [added])

    def test_base_check_allows_entry_for_new_rule(self) -> None:
        repo = repo_with(OLD_RULE, "")
        (repo / "vet" / "rules.toml").write_text(OLD_RULE + NEW_RULE)
        (repo / "vet" / "gaps.toml").write_text(dump_gaps({GapKey("cases-missing", "a", "f1")}))
        self.assertEqual(added_for_old_rules("base", repo), [])

    def test_base_check_allows_a_known_gap_with_a_new_fingerprint(self) -> None:
        repo = repo_with(OLD_RULE, dump_gaps({GapKey("solution-fails", "a", "f1")}))
        (repo / "vet" / "gaps.toml").write_text(dump_gaps({GapKey("solution-fails", "a", "f2")}))
        self.assertEqual(added_for_old_rules("base", repo), [])

    def test_base_check_refuses_an_unknown_ref(self) -> None:
        with self.assertRaisesRegex(BaseError, "nowhere is not a commit"):
            added_for_old_rules("nowhere", repo_with(OLD_RULE, ""))

    def test_base_check_allows_entries_the_base_already_had(self) -> None:
        kept = GapKey("solution-fails", "a", "f1")
        repo = repo_with(OLD_RULE, dump_gaps({kept}))
        self.assertEqual(added_for_old_rules("base", repo), [])

    def test_base_without_a_rules_file_makes_every_rule_new(self) -> None:
        repo = repo_with(OLD_RULE, "")
        git(repo, "rm", "-q", "vet/rules.toml", "vet/gaps.toml")
        git(repo, "commit", "-q", "-m", "no rules")
        git(repo, "tag", "bare")
        (repo / "vet").mkdir(exist_ok=True)
        (repo / "vet" / "rules.toml").write_text(OLD_RULE)
        (repo / "vet" / "gaps.toml").write_text(dump_gaps({GapKey("solution-fails", "a", "f1")}))
        self.assertEqual(added_for_old_rules("bare", repo), [])


if __name__ == "__main__":
    unittest.main()
