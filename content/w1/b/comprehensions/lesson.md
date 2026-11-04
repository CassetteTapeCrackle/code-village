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

```python claim id=auto-e134244d8cfd
assert list(enumerate(['a', 'b'])) == [(0, 'a'), (1, 'b')]
assert list(enumerate(['a', 'b'], start=1)) == [(1, 'a'), (2, 'b')]
assert list(zip([1, 2], ['a', 'b'])) == [(1, 'a'), (2, 'b')]
```

```python claim id=comprehensions-claim-1
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

```python claim id=auto-dfe5c5a81f5a
import warnings
warnings.simplefilter('error')
assert list(zip([1, 2, 3], ['a', 'b'])) == [(1, 'a'), (2, 'b')]
```

```python predict
names = ["Noa", "Ines", "Sam"]
scores = [12, 15]
print(list(zip(names, scores)))
```

::task pair-up

::task numbered

```python claim id=auto-954175a1ce04
assert all(n % 2 == 1 for n in [-3, -1, 1, 3])
assert all(n % 2 != 1 for n in [-2, 0, 2])
```

```python claim id=auto-0c1c7caf35b7
words = ['a', 'tea', 'jam', 'bread', 'cake']
assert [w.upper() for w in words if len(w) > 3] == ['BREAD', 'CAKE']
```

```python claim id=auto-07577722abd8
assert max(3, 2) == 3
assert max(len([1, 2, 3]), len([10, 20])) == 3
assert list(range(max(3, 2))) == [0, 1, 2]
```

```python claim id=auto-197e503dd2f2
items = ['tea', 'jam']
assert list(enumerate(items, start=1)) == [(1, 'tea'), (2, 'jam')]
```

```python claim id=auto-423e5f1b0b36
items = [1, 2, 3, 4]
assert [x * 10 for x in items if x > 2] == [30, 40]
```

```python claim id=auto-f928c4da3c8b
assert list(enumerate('ab')) == [(0, 'a'), (1, 'b')]
assert list(enumerate('ab', start=1)) == [(1, 'a'), (2, 'b')]
```

```python claim id=auto-81b117ec7371
import warnings
warnings.simplefilter('error')
assert list(zip([1, 2, 3], [4])) == [(1, 4)]
```
