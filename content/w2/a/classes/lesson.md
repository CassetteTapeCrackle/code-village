+++
id = "classes"
title = "Classes and objects"
world = "w2"
region = "a"
order = 1
concepts = ["classes"]
remember = ["A class is a blueprint; calling it, like Fox(\"Sly\", 3), makes an object.", "__init__ runs when the object is made; self is that object.", "self.name = name stores an attribute on that one object.", "Every method's first parameter is self."]
[loot]
id = "acorn-badge"
name = "Acorn Badge"
+++

You have used **objects** all along: `"hi"` is an object of the `str` class, and `upper()` is something it can do. A **class** is a blueprint for making your own objects, with their own data and their own actions.

```python example
class Fox:
    def __init__(self, name, age):
        self.name = name
        self.age = age

sly = Fox("Sly", 3)
print(sly.name, sly.age, type(sly).__name__)
```

Calling `Fox("Sly", 3)` makes a new object and runs `__init__` on it. `self` is the object being made, so `self.name = name` stores an **attribute** on that object. Each object keeps its own attributes.

```python claim
class Fox:
    def __init__(self, name):
        self.name = name

a, b = Fox("Sly"), Fox("Red")
assert (a.name, b.name) == ("Sly", "Red")
assert type("hi") is str and "hi".upper() == "HI"
```

::task tent

A function written inside a class is a **method**. Its first parameter is always `self`, the object you called it on, so the method can read and change that object's attributes.

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

```python claim
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
