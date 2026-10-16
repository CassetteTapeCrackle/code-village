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
