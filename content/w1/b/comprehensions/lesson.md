+++
id = "comprehensions"
title = "Comprehensions, zip and enumerate"
world = "w1"
region = "b"
order = 9
concepts = ["comprehensions"]
remember = ["[f(x) for x in items if test(x)] builds a list in one line.", "enumerate(items) gives (index, item); add start=1 to count from 1.", "zip stops at the shortest list, without any warning."]
[loot]
id = "weaving-loom"
name = "Weaving Loom"
+++

A **list comprehension** builds a list in one line: what to put in, then the loop, then an optional `if` to filter.

```python example
nums = [1, 2, 3, 4, 5]
print([n * n for n in nums])
print([n for n in nums if n % 2 == 0])
```

::task odd-squares

`enumerate` gives each item together with its index (add `start=1` to count from 1), and `zip` walks two lists side by side.

```python claim
assert list(enumerate("ab")) == [(0, "a"), (1, "b")]
assert list(enumerate("ab", start=1)) == [(1, "a"), (2, "b")]
assert [n for n in [1, 2, 3, 4] if n % 2 == 0] == [2, 4]
```

```python example
for i, name in enumerate(["Noa", "Ines"]):
    print(i, name)
for i, name in enumerate(["Noa", "Ines"], start=1):
    print(i, name)
for name, score in zip(["Noa", "Ines"], [12, 15]):
    print(name, score)
```

`zip` stops at the **shortest** list, silently: the extra items are dropped without any error.

```python predict
names = ["Noa", "Ines", "Sam"]
scores = [12, 15]
print(list(zip(names, scores)))
```

::task pair-up

::task numbered
