+++
id = "dunders"
title = "Dunder methods"
world = "w2"
region = "b"
order = 6
concepts = ["dunders"]
remember = ["__str__ returns the text print shows; __repr__ the text you see inside a list.", "__eq__ decides what == means for your objects.", "__len__ makes len(obj) work, and an empty object then counts as false.", "Dunder methods return their answer: a __str__ that prints breaks print."]
[loot]
id = "carved-nameplate"
name = "Carved Nameplate"
+++

Python calls some methods for you. They are named with double underscores, "**dunder**" methods: `print(x)` calls `x.__str__()`, `len(x)` calls `x.__len__()`, and `a == b` calls `a.__eq__(b)`. Write them, and your objects work with Python's own tools.

```python claim id=auto-2bc85859096b
calls = []
class A:
    def __len__(self):
        calls.append(1)
        return 3
assert len(A()) == 3
assert calls == [1]
```

```python example
class Fox:
    def __init__(self, name):
        self.name = name

    def __str__(self):
        return f"Fox {self.name}"

    def __repr__(self):
        return f"Fox('{self.name}')"

f = Fox("Sly")
print(f)
print([f])
```

`__str__` is the friendly text that `print` shows. `__repr__` is the precise text you see when the object sits inside a list.

```python claim id=auto-55f73ccce074
class A:
    def __str__(self):
        return 'friendly'
    def __repr__(self):
        return 'precise'
assert str([A()]) == '[precise]'
```

```python claim id=auto-9d4445d077f8
import io, contextlib
class A:
    def __str__(self):
        return 'friendly'
    def __repr__(self):
        return 'precise'
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    print(A())
assert buf.getvalue() == 'friendly\n'
```

```python claim
class Fox:
    def __str__(self):
        return "friendly"

    def __repr__(self):
        return "precise"

assert (str(Fox()), str([Fox()]), f"{Fox()}") == ("friendly", "[precise]", "friendly")
```

::task mushroom

`__eq__` decides what `==` means. Here, two coins are equal when they have the same value, even if they are different objects.

```python claim id=auto-60e625e673b9
class Coin:
    def __init__(self, value):
        self.value = value
    def __eq__(self, other):
        return isinstance(other, Coin) and self.value == other.value
a, b = Coin(5), Coin(5)
assert a == b
assert a is not b
```

```python claim id=auto-d74724c79b29
class A:
    def __eq__(self, other):
        return True
assert A() == A()
assert A() == 5
```

```python example
class Coin:
    def __init__(self, value):
        self.value = value

    def __eq__(self, other):
        return isinstance(other, Coin) and self.value == other.value

print(Coin(2) == Coin(2), Coin(2) == Coin(5), Coin(2) == 2)
```

Writing `__eq__` has one cost: Python no longer lets those objects go in a set or be keys in a dict (`TypeError: unhashable type`). Sets and dicts find items by a number worked out from each object, and the old one, based on identity, would disagree with your new `==`.

```python claim
class Coin:
    def __init__(self, value):
        self.value = value

    def __eq__(self, other):
        return isinstance(other, Coin) and self.value == other.value

assert Coin.__hash__ is None

try:
    {Coin(2)}
    raised = None
except TypeError as error:
    raised = error
assert raised is not None and "unhashable" in str(raised)
```

With `__len__`, `len(obj)` works, and an `if` treats an object of length 0 as false.

```python predict
class Shelf:
    def __init__(self, books):
        self.books = books

    def __len__(self):
        return len(self.books)

print(len(Shelf(["Ferns", "Moss"])), bool(Shelf([])))
```

::task quiver

These methods **return** their answer. A `__str__` that prints its text and returns nothing hands `None` to `print`, which raises a `TypeError`.

```python claim id=auto-79d28a2cd836
class B:
    def __str__(self):
        print('x')
try:
    print(B())
except TypeError:
    pass
else:
    assert False
```

```python claim
class Badge:
    def __str__(self):
        print("Badge of Sam")

try:
    str(Badge())
    raised = None
except TypeError as error:
    raised = error
assert raised is not None and "returned non-string" in str(raised)
```

::task badge

```python claim id=auto-45bdc2200b54
assert len([1, 2, 3]) == 3
assert len([]) == 0
```

```python claim id=auto-14d138cf1cb5
class P:
    def __str__(self):
        return 's'
    def __repr__(self):
        return 'r'
assert str(P()) == 's'
assert str([P()]) == '[r]'
```

```python claim id=auto-c181a27577db
class A:
    def __init__(self, v):
        self.v = v
    def __eq__(self, other):
        return self.v == other.v
assert A(1) == A(1)
assert A(1) != A(2)
```

```python claim id=auto-9b8f9a993644
class Q:
    def __init__(self, items):
        self.items = items
    def __len__(self):
        return len(self.items)
assert len(Q([1])) == 1
assert not Q([])
assert Q([1])
```
