+++
id = "methods"
title = "Methods that change, methods that answer"
world = "w2"
region = "a"
order = 2
concepts = ["methods"]
teaches = ["augmented-assignment"]
remember = ["A method that answers returns a value and changes nothing.", "A method that changes updates attributes on self and usually returns None.", "self.other() calls another method on the same object.", "obj.method without () is the method itself, not its result."]
[loot]
id = "whittled-spoon"
name = "Whittled Spoon"
+++

Methods come in two kinds. Some **answer** a question: they look at the object and return a value, changing nothing. Others **change** the object: they update its attributes and usually return `None`.

```python claim id=auto-2cd6733225ee
s = "abc"
t = s.upper()
assert t == "ABC"
assert s == "abc"
d = {1: 2}
v = d.get(1)
assert v == 2
assert d == {1: 2}
```

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

```python claim id=methods-claim-1
class Wallet:
    def __init__(self):
        self.coins = 10

    def spend(self, n):
        self.coins -= n

assert Wallet().spend(3) is None
```

::task torch

A method can call another method of the same object through `self`. Then the work is written once and reused.

```python claim id=auto-ca66e17ab7cf
class A:
    def a(self):
        return 1
    def b(self):
        return self.a() + 1
assert A().b() == 2
```

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

```python claim id=auto-8e8dce7e0d78
class A:
    def m(self):
        return False
assert bool(A().m) is True
assert bool(A().m()) is False
```

```python claim id=auto-5891ff3f2606
class A:
    def m(self):
        return 5
assert A().m() == 5
assert A().m != 5
assert callable(A().m)
```

```python claim id=methods-claim-2
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

```python claim id=auto-3b1d55cfd3ea
assert max(3, 7) == 7
assert max(-2, 0) == 0
assert max(5, 5) == 5
```

```python claim id=auto-c4134f4158da
class K:
    def is_hot(self):
        return False
k = K()
assert k.is_hot() is False
assert callable(k.is_hot)
assert k.is_hot is not False
assert type(k.is_hot).__name__ == 'method'
```

```python claim id=auto-2a1e80a3418d
class A:
    def other(self):
        return 'o'
    def m(self):
        return self.other()
assert A().m() == 'o'
```

```python claim id=auto-9bfc2a7bb292
class A:
    def m(self):
        return 3
a = A()
assert a.m != 3
assert a.m() == 3
assert a.m.__func__ is A.m
```

```python claim id=remember-f5731ae902c1
class Lantern:
    def __init__(self):
        self.oil = 0

    def refill(self, amount):
        self.oil = self.oil + amount

lantern = Lantern()
result = lantern.refill(5)
assert lantern.oil == 5 and result is None
```

```python claim id=remember-5144fa2f620c
class Basket:
    def __init__(self, apples):
        self.apples = apples

    def count(self):
        return len(self.apples)

basket = Basket(["red", "green"])
before = (dict(vars(basket)), list(basket.apples))
assert basket.count() == 2
assert (dict(vars(basket)), list(basket.apples)) == before
```
