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

```python claim id=auto-e2b98438f996
import sys
ns = {}
exec('from dataclasses import dataclass', ns)
assert 'dataclasses' in sys.modules
assert 'dataclass' in ns
assert 'dataclasses' not in ns
```

```python claim id=auto-4aa42932afba
from dataclasses import dataclass
@dataclass
class P:
    x: int
    y: int
assert '__init__' in P.__dict__
assert '__repr__' in P.__dict__
assert '__eq__' in P.__dict__
assert P(1, 2) == P(1, 2)
assert repr(P(1, 2)) == 'P(x=1, y=2)'
```

```python claim id=dataclasses-claim-1
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

```python claim id=auto-c17870ec18bb
from dataclasses import dataclass
@dataclass
class A:
    x: int = 1
    def double(self):
        return self.x * 2
assert A().x == 1
assert A(4).double() == 8
```

```python claim id=auto-40ba8c023c38
from dataclasses import dataclass
@dataclass
class P:
    name: str
p = P(123)
assert p.name == 123
```

```python claim id=auto-163b554ae513
from dataclasses import dataclass, fields
@dataclass
class P:
    name: str
f = fields(P)[0]
assert f.name == 'name'
assert f.type is str
```

```python claim id=dataclasses-claim-2
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

```python claim id=auto-8c018517ce6d
from dataclasses import dataclass
@dataclass(order=True)
class P:
    a: int
    b: int
assert P(1, 9) < P(2, 0)
assert P(1, 2) < P(1, 3)
assert not (P(2, 0) < P(1, 9))
assert hasattr(P, '__lt__') and hasattr(P, '__le__') and hasattr(P, '__gt__') and hasattr(P, '__ge__')
```

```python claim id=dataclasses-claim-3
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

```python claim id=auto-884114da1da0
from dataclasses import dataclass
try:
    @dataclass
    class A:
        items: list = []
    raised = False
except ValueError:
    raised = True
assert raised
```

```python claim id=dataclasses-claim-4
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

```python claim id=dataclasses-claim-5
from dataclasses import dataclass

@dataclass
class Seed:
    name: str

assert Seed.__hash__ is None
```

::task satchel

```python claim id=auto-dc3c89753e0b
from dataclasses import dataclass
@dataclass
class Sapling:
    name: str
    height: int = 1
    def grow(self, cm):
        self.height += cm
assert repr(Sapling('oak')) == "Sapling(name='oak', height=1)"
```

```python claim id=auto-1cdab5f9e5ee
from dataclasses import dataclass, fields
@dataclass
class A:
    n: int = 5
assert A().n == 5
assert fields(A)[0].default == 5
```

```python claim id=auto-e4fc39be4b96
from dataclasses import dataclass
@dataclass(order=True)
class P:
    a: int
assert sorted([P(3), P(1), P(2)]) == [P(1), P(2), P(3)]
```

```python claim id=auto-02ed8607cac2
from dataclasses import dataclass
@dataclass(order=True)
class Race:
    time: float
    runner: str
rs = [Race(3.0, 'a'), Race(1.5, 'b'), Race(2.0, 'c')]
assert min(rs).runner == 'b'
assert sorted(rs)[0] == Race(1.5, 'b')
```

```python claim id=auto-630cd812963b
from dataclasses import dataclass
@dataclass
class A:
    x: int
    y: int = 0
assert '__init__' in A.__dict__ and '__repr__' in A.__dict__ and '__eq__' in A.__dict__
assert A(1) == A(1, 0)
assert repr(A(1)) == 'A(x=1, y=0)'
```

```python claim id=auto-c86cf282530a
from dataclasses import dataclass
@dataclass
class A:
    name: str
assert A(5).name == 5
```

```python claim id=auto-c6b29f000258
from dataclasses import dataclass, field
try:
    @dataclass
    class Bad:
        items: list = []
    bad = False
except ValueError:
    bad = True
assert bad
@dataclass
class Good:
    items: list = field(default_factory=list)
assert Good().items == []
```
