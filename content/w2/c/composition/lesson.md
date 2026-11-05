+++
id = "composition"
title = "Composition"
world = "w2"
region = "c"
order = 10
concepts = ["composition"]
teaches = ["fn-sum"]
remember = ["Inheritance says 'is a': an owl is an animal.", "Composition says 'has a': a keeper has animals, kept as attributes.", "The outer object hands work to its parts: self.engine.start().", "When in doubt, prefer having a part to being one."]
[loot]
id = "toolbelt"
name = "Toolbelt"
+++

Inheritance answers "is a": an owl **is an** animal. Many objects are better described by "has a": a boat **has an** engine, a keeper **has** animals. Then the object keeps its parts as attributes and hands work to them. This is **composition**.

```python example
class Engine:
    def start(self):
        return "vroom"

class Boat:
    def __init__(self, name):
        self.name = name
        self.engine = Engine()

    def start(self):
        return f"{self.name}: {self.engine.start()}"

print(Boat("Otter").start())
```

`Boat` does not inherit from `Engine`: a boat is not an engine. It holds one and asks it to do the engine's job. Below, `sum` adds up a list of numbers.

```python claim id=auto-6671a2672b0e
assert sum([1, 2, 3]) == 6
```

```python predict
class Wheel:
    def __init__(self, size):
        self.size = size

class Cart:
    def __init__(self):
        self.wheels = [Wheel(2), Wheel(2), Wheel(3)]

    def total(self):
        return sum([w.size for w in self.wheels])

cart = Cart()
print(cart.total(), len(cart.wheels))
```

::task keeper

::task lamp

Inheriting just to reuse some methods is tempting, and it makes odd claims: if `Ranger` inherits from `Backpack`, a ranger **is** a backpack, and every backpack method becomes a ranger method. Give the ranger a backpack instead.

```python claim id=composition-claim-1
class Backpack:
    def add(self, item):
        pass

class Ranger(Backpack):
    pass

assert isinstance(Ranger(), Backpack) and hasattr(Ranger(), "add")
```

::task ranger-pack
