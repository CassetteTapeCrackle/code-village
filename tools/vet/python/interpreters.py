"""interpreter(): a virtual environment per older CPython with the library pins, kept in .vet-cache/py<version>.

The content is written for Python 3.12 and newer (spec 3); the build itself runs 3.14, so the versions check
reruns the content on these. uv makes the environment and downloads the Python when the machine lacks it.
"""

import re
import subprocess
import threading
from pathlib import Path

from ..adapter import ToolError
from ..cache import CACHE_ROOT, library_pins
from ..checks.libraries import LIBRARIES

OLDER_PYTHONS = ("3.12", "3.13")
_made: dict[str, Path] = {}
_making = threading.Lock()  # canaries run side by side, and two installs into one environment would collide


def pins() -> list[str]:
    """`name==version` for each library World 3 imports, as `pnpm content` pins it."""
    found = dict(re.findall(r"--with ([\w-]+)==(\S+)", library_pins()))
    return [f"{name}=={found[name]}" for name in LIBRARIES]


def interpreter(version: str) -> Path:
    """The python of .vet-cache/py<version>, made or brought up to the pins on first use in this process."""
    with _making:
        if version not in _made:
            _made[version] = _make(version, CACHE_ROOT / f"py{version}")
        return _made[version]


def _make(version: str, venv: Path) -> Path:
    python = venv / "bin" / "python"
    # a restored cache can hold an environment whose base Python this machine lacks, so it is checked, not trusted
    if not _runs(python, version):
        _uv(["venv", "--quiet", "--clear", "--python", version, str(venv)])
    _uv(["pip", "install", "--quiet", "--python", str(python), *pins()])
    return python


def _runs(python: Path, version: str) -> bool:
    try:
        done = subprocess.run([str(python), "-c", "import sys; print(sys.version)"], capture_output=True, text=True,
                              timeout=30, check=False)
    except OSError:
        return False
    return done.returncode == 0 and done.stdout.startswith(f"{version}.")


def _uv(args: list[str]) -> None:
    try:
        done = subprocess.run(["uv", *args], capture_output=True, text=True, timeout=600, check=False)
    except (OSError, subprocess.TimeoutExpired) as e:
        raise ToolError(f"uv {args[0]} failed: {e}") from None
    if done.returncode != 0:
        last = (done.stderr.strip().splitlines() or ["no output"])[-1]
        raise ToolError(f"uv {' '.join(args[:2])} failed: {last}")
