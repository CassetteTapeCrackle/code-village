"""The build machine must run the browser's Python and libraries, or outputs could differ.

These are problems with the machine, not the content, so they are plain messages, never gap-listed findings.
"""

import importlib.metadata
import json
import sys
from pathlib import Path

PYODIDE_LOCK = Path(__file__).resolve().parents[3] / "node_modules" / "pyodide" / "pyodide-lock.json"
LIBRARIES = ("numpy", "pandas", "scikit-learn")  # what World 3 imports, checked against the Pyodide lock


def pyodide_python() -> str:
    python: str = json.loads(PYODIDE_LOCK.read_text())["info"]["python"]
    return python


def build_python() -> str:
    return ".".join(map(str, sys.version_info[:2]))


def library_problems() -> list[str]:
    packages = json.loads(PYODIDE_LOCK.read_text())["packages"]
    problems = []
    for name in LIBRARIES:
        wanted = packages[name]["version"]
        try:
            have = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            have = "missing"
        if have != wanted:
            problems.append(f"libraries: {name} is {have} here, Pyodide ships {wanted}: "
                            "run the check with pnpm content")
    return problems


def environment_problems() -> list[str]:
    wanted = ".".join(pyodide_python().split(".")[:2])
    python = build_python()
    if python == wanted:
        return library_problems()
    return [f"python: build Python is {python}, Pyodide runs {wanted}: use python{wanted}", *library_problems()]
