+++
id = "methods"
title = "Methods that change, methods that answer"
world = "w2"
region = "a"
order = 2
concepts = ["methods"]
remember = ["A method that answers returns a value and changes nothing.", "A method that changes updates attributes on self and usually returns None.", "self.other() calls another method on the same object.", "obj.method without () is the method itself, not its result."]
[loot]
id = "whittled-spoon"
name = "Whittled Spoon"
+++

Methods come in two kinds. Some **answer** a question: they look at the object and return a value, changing nothing. Others **change** the object: they update its attributes and usually return `None`.

```python example
class Wallet:
    def __init__(self, coins):
        self.coins = coins

    def spend(self, n):
        self.coins -= n

    def can_buy(self, price):
        return self.coins >= price

w = Wallet(10)
w.spend(3)
print(w.coins, w.can_buy(8))
```

`spend` changes the wallet; `can_buy` only answers. Keeping the two apart makes code easy to follow: you know which calls can change things.

```python claim
class Wallet:
    def __init__(self):
        self.coins = 10

    def spend(self, n):
        self.coins -= n

assert Wallet().spend(3) is None
```

::task torch

A method can call another method of the same object through `self`. Then the work is written once and reused.

```python example
class Garden:
    def __init__(self):
        self.plants = []

    def plant(self, name):
        self.plants.append(name)

    def plant_many(self, names):
        for name in names:
            self.plant(name)

g = Garden()
g.plant_many(["fern", "moss"])
print(g.plants)
```

::task tally

To **call** a method you need the brackets. Without them, `obj.method` is the method itself, an object that is always true in an `if`.

```python claim
class Owl:
    def hoot(self):
        return ""

assert bool(Owl().hoot) is True and Owl().hoot() == ""
```

```python predict
class Owl:
    def hoot(self):
        return "hoo"

o = Owl()
print(o.hoot() == "hoo", o.hoot == "hoo")
```

::task kettle
