+++
id = "classes"
title = "Classes and objects"
world = "w2"
region = "a"
order = 1
concepts = ["classes"]
teaches = ["class-def"]
remember = ["A class is a blueprint; calling it, like Fox(\"Sly\", 3), makes an object.", "__init__ runs when the object is made; self is that object.", "self.name = name stores an attribute on that one object.", "Every method's first parameter is self."]
[loot]
id = "acorn-badge"
name = "Acorn Badge"
+++

You have used **objects** all along: `"hi"` is an object of the `str` class, and `upper()` is something it can do. A **class** is a blueprint for making your own objects, with their own data and their own actions.

```python claim id=auto-54436124c274
assert isinstance("hi", str)
assert "hi".upper() == "HI"
```

```python example
class Fox:
    def __init__(self, name, age):
        self.name = name
        self.age = age

sly = Fox("Sly", 3)
print(sly.name, sly.age, type(sly).__name__)
```

Calling `Fox("Sly", 3)` makes a new object and runs `__init__` on it. `self` is the object being made, so `self.name = name` stores an **attribute** on that object. Each object keeps its own attributes.

```python claim id=auto-33f41835a10c
class Fox:
    def __init__(self, name):
        self.name = name
a, b = Fox("A"), Fox("B")
assert a.name == "A" and b.name == "B"
```

```python claim id=auto-cd8d37511a26
class Fox:
    def __init__(self, name):
        self.me = self
        self.name = name
f = Fox("Sly")
assert f.me is f
assert f.__dict__['name'] == "Sly"
```

```python claim id=auto-3743c3296af4
calls = []
class Fox:
    def __init__(self, name, age):
        calls.append((self, name, age))
f = Fox("Sly", 3)
assert calls == [(f, "Sly", 3)]
```

```python claim id=classes-claim-1
class Fox:
    def __init__(self, name):
        self.name = name

a, b = Fox("Sly"), Fox("Red")
assert (a.name, b.name) == ("Sly", "Red")
assert type("hi") is str and "hi".upper() == "HI"
```

::task tent

A function written inside a class is a **method**. Its first parameter is always `self`, the object you called it on, so the method can read and change that object's attributes.

```python claim id=auto-690c5066e44e
import types
class A:
    def f(self):
        pass
assert isinstance(A().f, types.MethodType)
```

```python example
class Fox:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def describe(self):
        return f"{self.name} is {self.age}"

print(Fox("Sly", 3).describe())
```

```python predict
class Lamp:
    def __init__(self, colour):
        self.colour = colour

a = Lamp("red")
b = Lamp("blue")
a.colour = "green"
print(a.colour, b.colour)
```

When you call `a.describe()`, Python passes `a` in as `self` for you. If you forget to write `self` in the `def`, the call hands over one argument too many.

```python claim id=auto-45b361e00a13
class A:
    def describe():
        pass
try:
    A().describe()
    assert False
except TypeError as e:
    assert '0 positional arguments but 1 was given' in str(e)
```

```python claim id=auto-ff91d5105782
class A:
    def describe(self):
        return self
a = A()
assert a.describe() is a
```

```python claim id=classes-claim-2
class Fox:
    def describe():
        return "fox"

try:
    Fox().describe()
    raised = None
except TypeError as error:
    raised = error
assert raised is not None and "takes 0 positional arguments but 1 was given" in str(raised)
```

::task counter

::task backpack

```python claim id=auto-bbc37da04262
class Counter:
    def add(me, amount):
        return me
c = Counter()
assert c.add(2) is c
```

```python claim id=auto-45bdc2200b54
assert len([1, 2, 3]) == 3
assert len([]) == 0
```

```python claim id=auto-b5392ef34e4b
fruits = ['apple', 'pear']
assert ('apple' in fruits) is True
assert ('fig' in fruits) is False
```

```python claim id=auto-fe3251c21e43
seen = []
class A:
    def __init__(self):
        seen.append(self)
a = A()
assert seen == [a] and seen[0] is a
```

```python claim id=auto-a42c91cdd14d
class Fox:
    def __init__(self, name):
        self.name = name
a = Fox('Sly')
b = Fox('Rex')
assert a.name == 'Sly' and b.name == 'Rex'
assert 'name' in vars(a)
assert not hasattr(Fox, 'name')
```
