"""World gates: a [key] opens a world with the trophy of a boss in an earlier world."""

import shutil
import tempfile
import unittest
from pathlib import Path

from vet import vet

GOOD = Path(__file__).resolve().parent / "fixtures" / "good"
RULES = frozenset({"gate-boss-missing", "trophy-mismatch", "world-key-invalid"})
WORLD = """id = "{id}"
order = {order}
name = "W"
area = "forest"
regions = {{ a = "A" }}

[building]
name = "B"
place = "p"

[teacher]
name = "T"
portrait = "t"

[key]
boss = "calc"
trophy = "calc-trophy"
trophy_name = "Calc Trophy"
opens = "o"
gate_hint = "h"
"""


def rules_with_world(world_id: str, order: int) -> list[str]:
    with tempfile.TemporaryDirectory() as into:
        content = Path(into) / "content"
        shutil.copytree(GOOD, content)
        (content / world_id).mkdir(exist_ok=True)
        (content / world_id / "world.toml").write_text(WORLD.format(id=world_id, order=order))
        return [f.rule for f in vet(content, only=RULES)]


class Gates(unittest.TestCase):
    def test_a_key_with_the_trophy_of_an_earlier_boss_is_fine(self) -> None:
        self.assertEqual(rules_with_world("w2", order=2), [])


if __name__ == "__main__":
    unittest.main()
