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

```python claim id=auto-1d420bca9e3e
class T:
    def __init__(self):
        self._d = 0
    @property
    def f(self):
        return self._d * 2
    @property
    def d(self):
        return self._d
    @d.setter
    def d(self, v):
        if v < 0:
            raise ValueError
        self._d = v
t = T()
t.d = 3
assert t.d == 3
assert t.f == 6
try:
    t.d = -1
except ValueError:
    pass
else:
    assert False
```

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

```python claim id=auto-3cdb7055760c
class R:
    def __init__(self, w, h):
        self.w = w
        self.h = h
    @property
    def area(self):
        return self.w * self.h
r = R(2, 3)
assert r.area == 6
r.w = 5
assert r.area == 15
```

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

```python claim id=auto-fa7a0e3c1b41
calls = []
class T:
    @property
    def d(self):
        return self._d
    @d.setter
    def d(self, v):
        calls.append(v)
        if v < 0:
            raise ValueError
        self._d = v
t = T()
t.d = 1
t.d = 2
assert calls == [1, 2]
try:
    t.d = -5
except ValueError:
    pass
else:
    assert False
assert t.d == 2
```

```python claim id=properties-claim-1
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

```python claim id=auto-3d503da21671
class T:
    @property
    def degrees(self):
        return self._d
    @degrees.setter
    def degrees(self, v):
        self.degrees = v
t = T()
try:
    t.degrees = 1
except RecursionError:
    pass
else:
    assert False
```

```python claim id=properties-claim-2
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

```python claim id=auto-baba3b0facef
class Plot:
    def __init__(self):
        self.w = 2
        self.h = 3
    @property
    def area(self):
        return self.w * self.h
plot = Plot()
assert plot.area == 6
```

```python claim id=auto-08a956703e8d
class P:
    @property
    def area(self):
        return self._area
    @area.setter
    def area(self, v):
        if v <= 0:
            raise ValueError
        self._area = v
p = P()
p.area = 5
assert p.area == 5
try:
    p.area = -1
    assert False
except ValueError:
    pass
```
