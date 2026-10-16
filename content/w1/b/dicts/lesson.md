+++
id = "dicts"
title = "Dicts, tuples and sets"
world = "w1"
region = "b"
order = 8
concepts = ["dicts"]
remember = ["A dict maps keys to values: d[key] reads, d[key] = value adds or changes.", "A missing key raises KeyError: check with in first, or use d.get(key, default).", "A tuple is a fixed group like (x, y); a set keeps each value once."]
[loot]
id = "key-ring"
name = "Key Ring"
+++

A **dict** maps keys to values. Read a value with its key, and assign to a key to add or change it. `in` asks whether a key is there.

```python example
ages = {"Noa": 12, "Ines": 13}
ages["Sam"] = 11
print(ages["Ines"], len(ages), "Sam" in ages)
```

Counting is the classic use. `get(key, 0)` gives 0 the first time a key appears.

```python example
counts = {}
for fruit in ["fig", "pear", "fig"]:
    counts[fruit] = counts.get(fruit, 0) + 1
print(counts)
```

::task count-words

Reading a key that is not in the dict raises `KeyError`. Check with `in` first, or use `get(key, default)`.

```python claim
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

```python claim
assert set([2, 1, 2, 3, 1]) == {1, 2, 3} and len(set("banana")) == 3
```

```python example
point = (3, 4)
x, y = point
print(x + y, set([2, 1, 2, 3, 1]))
```

::task unique-sorted
