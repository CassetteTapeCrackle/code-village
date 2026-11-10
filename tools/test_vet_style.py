"""The solution lint rule."""

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from typing import cast

from vet.checks import style
from vet.model import Content
from vet.python.adapter import PythonAdapter


class Lint(unittest.TestCase):
    def test_a_solution_under_the_working_folder_is_reported(self) -> None:
        # ruff prints such a path relative to the working folder; the real content lies under it
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as folder:
            solution = Path(folder) / "solution.py"
            solution.write_text("import os\n\n\ndef double(n):\n    return n * 2\n")
            content = cast(Content, SimpleNamespace(root=Path(folder)))
            found = list(style.check(content, PythonAdapter()))
        self.assertEqual([(f.rule, f.item) for f in found], [("solution-lint", "solution.py")])
