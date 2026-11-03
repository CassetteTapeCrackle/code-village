"""Run a script (the harness) with its memory capped where the platform allows it.

A broken solution can grow a list until memory runs out (four at once took a CI runner down), while real jobs
stay under 200 MB. macOS refuses the cap (setrlimit raises ValueError), so there the job runs uncapped and only
the time limit stops a runaway. Standard library only: the adapter starts this file with python -I.
"""

import resource
import runpy
import sys

MEMORY_CAP = 2 * 1024**3


def cap_memory() -> bool:
    """Cap the address space at MEMORY_CAP (or the lower hard limit); False when the platform refuses."""
    try:
        hard = resource.getrlimit(resource.RLIMIT_AS)[1]
        cap = MEMORY_CAP if hard == resource.RLIM_INFINITY else min(MEMORY_CAP, hard)
        resource.setrlimit(resource.RLIMIT_AS, (cap, hard))
    except (ValueError, OSError):
        return False
    return True


def main(script: str) -> None:
    cap_memory()
    runpy.run_path(script, run_name="__main__")


if __name__ == "__main__":
    main(sys.argv[1])
