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

```python claim id=auto-5ee19bbb24f6
class A:
    x = 5
a, b = A(), A()
assert 'x' in vars(A)
assert a.x == b.x == 5
A.x = 6
assert a.x == b.x == 6
```

```python claim id=auto-62834b9ea1b3
class A:
    def __init__(self, v):
        self.v = v
a, b = A(1), A(2)
assert a.v == 1 and b.v == 2
assert 'v' not in vars(A)
```

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

```python claim id=auto-9ef7b85f49f3
class A:
    n = 0
a, b = A(), A()
a.n = 5
assert A.n == 0
assert b.n == 0
assert vars(a) == {'n': 5}
```

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

```python claim id=auto-6235f1362d0e
class A:
    items = []
a, b = A(), A()
a.items.append(1)
assert b.items == [1] and A.items == [1]
```

```python claim id=auto-2ed2ce02f8ca
class A:
    items = []
a, b = A(), A()
assert a.items is b.items is A.items
```

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

```python claim id=auto-1c8020532f0c
count = 0
class A:
    global count
    count += 1
    items = []
A(); A()
assert count == 1
assert A().items is A().items
```

```python claim id=auto-4af4bee4f30b
class A:
    x = 1
a, b = A(), A()
A.x = 5
assert a.x == 5 and b.x == 5
```

```python claim id=auto-7b2a4363a68b
class A:
    pass
a, b = A(), A()
a.x = 1
assert a.x == 1 and not hasattr(b, 'x')
```

```python claim id=auto-444f94573a5f
class A:
    L = []
class B:
    def __init__(self):
        self.L = []
assert A().L is A().L
assert B().L is not B().L
```
