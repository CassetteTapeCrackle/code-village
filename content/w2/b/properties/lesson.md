+++
id = "properties"
title = "Properties and validation"
world = "w2"
region = "b"
order = 5
concepts = ["properties"]
remember = ["@property lets a method be read like an attribute: plot.area, no brackets.", "A setter (@area.setter) runs on assignment and can refuse bad values.", "Store the real value under another name, like self._age, or the setter calls itself forever.", "A leading underscore means: please do not touch this from outside."]
[loot]
id = "bark-ledger"
name = "Bark Ledger"
+++

Anyone can change an object's attributes from outside. Often that is fine. Sometimes a value should be **worked out** from others, or **checked** before it is stored. A **property** handles both while still reading like a plain attribute.

```python example
class Plot:
    def __init__(self, width, depth):
        self.width = width
        self.depth = depth

    @property
    def area(self):
        return self.width * self.depth

p = Plot(3, 4)
print(p.area)
p.width = 5
print(p.area)
```

`@property` turns `area` into something you read without brackets, and it is always up to date.

```python predict
class Box:
    def __init__(self, items):
        self.items = items

    @property
    def size(self):
        return len(self.items)

b = Box(["acorn"])
b.items.append("cone")
print(b.size, b.size + 1)
```

::task plot

A **setter** runs whenever the attribute is assigned, so it can refuse bad values. The real value is stored under another name, by convention with a leading underscore: `_degrees` means "please do not touch from outside".

```python claim
class Thermometer:
    def __init__(self, degrees):
        self.degrees = degrees

    @property
    def degrees(self):
        return self._degrees

    @degrees.setter
    def degrees(self, value):
        if value < -50:
            raise ValueError("too cold to be true")
        self._degrees = value

try:
    Thermometer(-60)
    raised = False
except ValueError:
    raised = True
assert raised
```

```python example
class Thermometer:
    def __init__(self, degrees):
        self.degrees = degrees  # this already goes through the setter

    @property
    def degrees(self):
        return self._degrees

    @degrees.setter
    def degrees(self, value):
        if value < -50:
            raise ValueError("too cold to be true")
        self._degrees = value

t = Thermometer(12)
t.degrees = 20
print(t.degrees)
```

::task fuel

If the setter assigned `self.degrees` instead of `self._degrees`, it would call itself again, and again, until Python gives up with a `RecursionError`.

```python claim
class Ranger:
    def __init__(self, age):
        self.age = age

    @property
    def age(self):
        return self._age

    @age.setter
    def age(self, value):
        self.age = value

try:
    Ranger(30)
    raised = False
except RecursionError:
    raised = True
assert raised
```

::task ranger-age
