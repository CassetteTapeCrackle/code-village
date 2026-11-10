+++
id = "generators"
title = "Generators"
world = "w3"
region = "a"
order = 2
concepts = ["generators"]
teaches = ["fn-next", "generator-expression", "generator-yield"]
remember = ["yield hands out one value and pauses the function; asking for the next value carries on from there.", "A generator makes its values on demand: loop over it, call next() on it, or give it to sum, max or list.", "(n * n for n in items) is a generator expression: a list comprehension in round brackets.", "A generator is used up after one pass: a second loop gets nothing. Keep a list if you need the values twice."]
[loot]
id = "spring-coil"
name = "Spring Coil"
+++

A function with `yield` in it is a **generator**. Calling it runs nothing yet. Each time a loop asks for the next value, the function runs until its next `yield`, hands out that value, and pauses there.

```python claim id=auto-421c53fe3a1f
log = []
def g():
    log.append('a')
    yield 1
    log.append('b')
    yield 2
x = g()
assert next(x) == 1 and log == ['a']
assert next(x) == 2 and log == ['a', 'b']
```

```python claim id=auto-d5237e4443c6
log = []
def g():
    log.append('ran')
    yield 1
x = g()
assert log == []
next(x)
assert log == ['ran']
```

```python claim id=auto-defb2b6ff81c
import inspect
def g():
    yield 1
assert inspect.isgeneratorfunction(g)
assert inspect.isgenerator(g())
```

```python claim id=generators-claim-1
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

```python claim id=auto-807a4dcba440
import sys
g = (i for i in range(1_000_000))
assert sys.getsizeof(g) < 1000
assert sys.getsizeof(g) < sys.getsizeof(list(range(1000)))
```

```python claim id=auto-d8fc989711ce
log = []
def g():
    for i in range(3):
        log.append(i)
        yield i
x = g()
next(x)
assert log == [0]
```

```python claim id=generators-claim-2
import sys

assert sys.getsizeof(n for n in range(1_000_000)) < 1000
assert sys.getsizeof([n for n in range(1_000_000)]) > 1_000_000
```

::task evens

`next()` asks a generator for one value. A **generator expression** is a list comprehension in round brackets: it builds a generator instead of a list, which suits functions that only need to walk through the values once, like `sum` or `max`.

```python claim id=auto-ebbf99d6396f
import types
g = (n for n in [1, 2, 3])
assert isinstance(g, types.GeneratorType)
assert sum(n for n in [1, 2, 3]) == 6
assert max(n for n in [1, 3, 2]) == 3
```

```python claim id=auto-40291418cdef
g = (i for i in [5, 6])
assert next(g) == 5
assert next(g) == 6
```

```python example
squares = (n * n for n in range(4))
print(next(squares), next(squares))
print(sum(n * n for n in range(4)))
```

`map` and `filter` from the last lesson work the same way, which is why they needed `list()` to show their results.

```python claim id=auto-98d39d66b132
m = map(str, [1, 2])
f = filter(None, [0, 1])
assert not isinstance(m, list) and not isinstance(f, list)
assert iter(m) is m and iter(f) is f
assert list(m) == ["1", "2"] and list(f) == [1]
assert list(m) == []
```

```python claim id=generators-claim-3
m = map(abs, [-1, -2])
assert list(m) == [1, 2] and list(m) == []
```

::task letters

A generator remembers where it stopped, and it never starts over. Once a loop, `max` or `list` has walked through it, it is used up: anything after that gets nothing.

```python claim id=auto-09bfb46d4ae6
g = (i for i in [1, 2])
assert max(g) == 2
assert list(g) == []
g2 = (i for i in [1, 2])
for _ in g2:
    pass
assert list(g2) == []
```

```python claim id=auto-c7fbd5ed460e
g = (i for i in range(3))
assert next(g) == 0
assert list(g) == [1, 2]
assert list(g) == []
```

```python predict
scores = (s for s in [4, 9, 2])
print(max(scores))
print(list(scores))
```

If you need the values twice, keep them in a list: `scores = [s for s in [4, 9, 2]]`.

::task spread

```python claim id=auto-9c615cd0fb13
def evens(limit):
    n = 0
    while n < limit:
        yield n
        n += 2
assert list(evens(7)) == [0, 2, 4, 6]
```

```python claim id=auto-2d0ee773b714
def down(start, step):
    n = start
    while n > 0:
        yield n
        n -= step
assert list(down(10, 3)) == [10, 7, 4, 1]
```

```python claim id=auto-c707fdf728a1
assert sum(len(w) for w in ["hi", "there"]) == 7
```

```python claim id=auto-458cae9ad58f
values = (n for n in [3, 1, 2])
assert max(values) == 3
assert list(values) == []
```

```python claim id=auto-000480a0f259
g = (i for i in [1, 2])
assert sum(g) == 3
assert sum(g) == 0
```

```python claim id=auto-564b7d36b670
def g():
    yield 1
    yield 2
x = g()
assert next(x) == 1
assert next(x) == 2
```

```python claim id=auto-753aa04099ec
def mk():
    return (i for i in [1, 2, 3])
assert [i for i in mk()] == [1, 2, 3]
assert next(mk()) == 1
assert sum(mk()) == 6
assert max(mk()) == 3
assert list(mk()) == [1, 2, 3]
```

```python claim id=auto-b56a8023540b
g = (i for i in [1, 2])
for _ in g:
    pass
assert [x for x in g] == []
```

```python claim id=auto-8e89549aa44d
import types
items = [1, 2]
g = (n * n for n in items)
assert isinstance(g, types.GeneratorType)
assert list(g) == [1, 4]
```
