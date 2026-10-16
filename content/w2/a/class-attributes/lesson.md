+++
id = "class-attributes"
title = "Class and instance attributes"
world = "w2"
region = "a"
order = 4
concepts = ["class-attributes"]
remember = ["An attribute set on the class is shared by every object of that class.", "An attribute set through self belongs to that one object.", "A list on the class is one list for everybody: make lists in __init__.", "Change a shared counter through the class: Ranger.count += 1."]
[loot]
id = "shared-lantern-hook"
name = "Shared Lantern Hook"
+++

Attributes set through `self` belong to one object. An attribute written directly in the class body belongs to the **class**: every object sees the same one.

```python example
class Hiker:
    trail = "Forest loop"

    def __init__(self, name):
        self.name = name

a = Hiker("Noa")
b = Hiker("Sam")
print(a.trail, b.trail, Hiker.trail, a.name, b.name)
```

Class attributes suit things that are the same for everybody, like a limit or a counter. To change a shared value, change it through the class.

```python example
class Ranger:
    count = 0

    def __init__(self, name):
        self.name = name
        Ranger.count += 1

Ranger("Noa")
Ranger("Alex")
print(Ranger.count)
```

Why through the class? Assigning through `self` makes a **new** attribute on that one object, and the shared value never moves.

```python claim
class Ranger:
    count = 0

r = Ranger()
r.count += 1
assert (r.count, Ranger.count) == (1, 0) and "count" in vars(r)
```

```python predict
class Ranger:
    count = 0

    def __init__(self, name):
        self.count += 1

a = Ranger("Noa")
print(a.count, Ranger.count)
```

::task cabin

::task rangers

A list in the class body is **one** list, shared by every object. Appending to it through one object changes it for all of them.

```python claim
class Pack:
    items = []

p, q = Pack(), Pack()
p.items.append("rope")
assert q.items is p.items
assert q.items == ["rope"]
```

```python predict
class Pack:
    items = []

    def add(self, item):
        self.items.append(item)

p = Pack()
q = Pack()
p.add("rope")
print(q.items)
```

Give each object its own list by making it in `__init__`.

::task camp
