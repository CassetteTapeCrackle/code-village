+++
id = "generators"
title = "Generators"
world = "w3"
region = "a"
order = 2
concepts = ["generators"]
remember = ["yield hands out one value and pauses the function; asking for the next value carries on from there.", "A generator makes its values on demand: loop over it, call next() on it, or give it to sum, max or list.", "(n * n for n in items) is a generator expression: a list comprehension in round brackets.", "A generator is used up after one pass: a second loop gets nothing. Keep a list if you need the values twice."]
[loot]
id = "spring-coil"
name = "Spring Coil"
+++

A function with `yield` in it is a **generator**. Calling it runs nothing yet. Each time a loop asks for the next value, the function runs until its next `yield`, hands out that value, and pauses there.

```python claim
ran = []

def countdown(n):
    ran.append("started")
    yield n

g = countdown(3)
assert ran == []
assert next(g) == 3 and ran == ["started"]
```

```python example
def countdown(n):
    while n > 0:
        yield n
        n -= 1

for x in countdown(3):
    print(x)
```

The values are made one at a time, only when asked for. A generator over a million numbers never holds a million numbers in memory.

```python claim
import sys

assert sys.getsizeof(n for n in range(1_000_000)) < 1000
assert sys.getsizeof([n for n in range(1_000_000)]) > 1_000_000
```

::task evens

`next()` asks a generator for one value. A **generator expression** is a list comprehension in round brackets: it builds a generator instead of a list, which suits functions that only need to walk through the values once, like `sum` or `max`.

```python example
squares = (n * n for n in range(4))
print(next(squares), next(squares))
print(sum(n * n for n in range(4)))
```

`map` and `filter` from the last lesson work the same way, which is why they needed `list()` to show their results.

```python claim
m = map(abs, [-1, -2])
assert list(m) == [1, 2] and list(m) == []
```

::task letters

A generator remembers where it stopped, and it never starts over. Once a loop, `max` or `list` has walked through it, it is used up: anything after that gets nothing.

```python predict
scores = (s for s in [4, 9, 2])
print(max(scores))
print(list(scores))
```

If you need the values twice, keep them in a list: `scores = [s for s in [4, 9, 2]]`.

::task spread
