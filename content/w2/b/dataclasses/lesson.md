+++
id = "dataclasses"
title = "Dataclasses"
world = "w2"
region = "b"
order = 8
concepts = ["dataclasses"]
remember = ["@dataclass writes __init__, __repr__ and __eq__ from the fields you list.", "name: str names a field and notes its type; Python does not check the type.", "A list default needs field(default_factory=list).", "@dataclass(order=True) sorts by the fields, in order."]
[loot]
id = "seed-packet"
name = "Seed Packet"
+++

Many classes only hold data: an `__init__` that stores each argument, a `__repr__` to show it, an `__eq__` to compare. A **dataclass** writes all three for you from a list of **fields**. `from dataclasses import dataclass` loads the `dataclasses` module and gives you just its `dataclass` tool by name, so you can write `dataclass` without the module's name in front.

```python claim
import sys
from dataclasses import dataclass

assert "dataclasses" in sys.modules and "dataclasses" not in dir()
```

```python example
from dataclasses import dataclass

@dataclass
class Seed:
    name: str
    days: int

s = Seed("fern", 12)
print(s, s == Seed("fern", 12))
```

`name: str` names a field and notes its type. The type is a note for readers: Python does not check it. A field can have a default, and the class can still have methods of its own.

```python claim
from dataclasses import dataclass

@dataclass
class Seed:
    name: str
    days: int

assert Seed(5, "twelve").days == "twelve"
```

```python predict
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int = 0

p = Point(3)
print(p, p == Point(3, 0))
```

::task sapling

`@dataclass(order=True)` also writes `__lt__` and friends: objects compare field by field, in the order the fields are written.

```python claim
from dataclasses import dataclass

@dataclass(order=True)
class Score:
    points: int
    name: str

assert Score(7, "Ines") < Score(7, "Sam") < Score(9, "Al")
```

```python example
from dataclasses import dataclass

@dataclass(order=True)
class Score:
    points: int
    name: str

print(sorted([Score(7, "Sam"), Score(9, "Noa"), Score(7, "Ines")]))
```

::task scores

A list as a default would be shared by every object, the old trap from World 1. Dataclasses refuse it outright. Ask for a new list each time with `field(default_factory=list)`.

```python claim
from dataclasses import dataclass

try:
    @dataclass
    class Bag:
        items: list = []
    raised = None
except ValueError as error:
    raised = error
assert raised is not None and "default_factory" in str(raised)
```

```python example
from dataclasses import dataclass, field

@dataclass
class Bag:
    items: list = field(default_factory=list)

a = Bag()
b = Bag()
a.items.append("rope")
print(a, b)
```

The `__eq__` a dataclass writes has the same cost as your own: its objects cannot go in a set.

```python claim
from dataclasses import dataclass

@dataclass
class Seed:
    name: str

assert Seed.__hash__ is None
```

::task satchel
