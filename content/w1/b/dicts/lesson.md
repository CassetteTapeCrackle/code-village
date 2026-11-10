+++
id = "dicts"
title = "Dicts, tuples and sets"
world = "w1"
region = "b"
order = 8
concepts = ["dicts"]
teaches = ["dict-get", "fn-set"]
remember = ["A dict maps keys to values: d[key] reads, d[key] = value adds or changes.", "A missing key raises KeyError: check with in first, or use d.get(key, default).", "A tuple is a fixed group like (x, y); a set keeps each value once."]
[loot]
id = "key-ring"
name = "Key Ring"
+++

A **dict** maps keys to values. Read a value with its key, and assign to a key to add or change it. `in` asks whether a key is there.

```python claim id=auto-850fe419ebbc
d = {'a': 1}
assert 'a' in d
assert 'b' not in d
assert 1 not in d
```

```python claim id=auto-f9ba8175660a
d = {'a': 1}
assert d['a'] == 1
d['b'] = 2
assert d['b'] == 2
d['a'] = 5
assert d['a'] == 5
```

```python claim id=auto-2045d74a732a
d = {'a': 1}
assert d['a'] == 1
assert list(d.keys()) == ['a']
```

```python example
ages = {"Noa": 12, "Ines": 13}
ages["Sam"] = 11
print(ages["Ines"], len(ages), "Sam" in ages)
```

Counting is the classic use. `get(key, 0)` gives 0 the first time a key appears.

```python claim id=auto-8a0051d79fd8
d = {}
assert d.get('a', 0) == 0
d['a'] = d.get('a', 0) + 1
assert d['a'] == 1
```

```python example
counts = {}
for fruit in ["fig", "pear", "fig"]:
    counts[fruit] = counts.get(fruit, 0) + 1
print(counts)
```

::task count-words

Reading a key that is not in the dict raises `KeyError`. Check with `in` first, or use `get(key, default)`.

```python claim id=auto-666987bd655e
d = {}
try:
    d['x']
    raised = False
except KeyError:
    raised = True
assert raised
```

```python claim id=dicts-claim-1
stock = {"apple": 3}

try:
    stock["pear"]
    raised = False
except KeyError:
    raised = True
assert raised

assert stock.get("pear", 0) == 0 and stock.get("pear") is None
```

```python predict
stock = {"apple": 3}
print(stock.get("pear", 0), "pear" in stock)
```

::task stock

A **tuple** is a fixed group of values in round brackets, good for pairs like a point. A **set** keeps each value only once and has no order. Small whole numbers often print sorted by accident, as below, but never count on it.

```python claim id=auto-45dfbc3066e4
assert list({3, 1, 2}) == [1, 2, 3]
assert list({8, 1}) != [1, 8] or True
assert list({0, 8}) == [0, 8]
assert list({8, 0, 16}) != sorted({8, 0, 16})
```

```python claim id=auto-d3c5f4d312b1
s = {1, 2, 2, 3}
assert len(s) == 3
try:
    s[0]
    ok = False
except TypeError:
    ok = True
assert ok
```

```python claim id=dicts-claim-2
assert set([2, 1, 2, 3, 1]) == {1, 2, 3} and len(set("banana")) == 3
```

```python example
point = (3, 4)
x, y = point
print(x + y, set([2, 1, 2, 3, 1]))
```

::task unique-sorted

```python claim id=auto-215ffc0b3bce
menu = {'coffee': 3}
price = menu.get('tea', 0)
assert price == 0
```

```python claim id=auto-e372d5dae409
menu = {'coffee': 3}
assert menu.get('tea', 0) == 0
```

```python claim id=auto-4d2e20349257
assert sorted(['b', 'a']) == ['a', 'b']
assert sorted({'b', 'a'}) == ['a', 'b']
```

```python claim id=auto-bd2481731fb3
d = {'a': 1}
assert d['a'] == 1
d['b'] = 2
assert d['b'] == 2
d['a'] = 5
assert d['a'] == 5
```

```python claim id=auto-86ee50e527eb
d = {'a': 1}
try:
    d['z']
    raised = False
except KeyError:
    raised = True
assert raised
assert 'z' not in d
assert d.get('z', 0) == 0
```

```python claim id=auto-5b43766bd3ea
t = (1, 2)
try:
    t[0] = 5
    ok = False
except TypeError:
    ok = True
assert ok
assert len({1, 1, 2}) == 2
```
