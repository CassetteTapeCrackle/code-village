+++
id = "loops"
title = "Loops"
world = "w1"
region = "a"
order = 4
concepts = ["loops"]
remember = ["range(a, b) starts at a and stops before b: range(1, 4) is 1, 2, 3.", "for repeats once per item; while repeats as long as its condition is True.", "break leaves the loop at once; continue skips to the next round."]
[loot]
id = "knotted-rope"
name = "Knotted Rope"
+++

`for` repeats a block once per item. `range(n)` gives 0, 1, up to n - 1. `range(a, b)` starts at `a` and stops **before** `b`.

```python claim id=auto-ae2738c4931f
assert list(range(2, 5)) == [2, 3, 4]
assert 5 not in range(2, 5)
```

```python claim id=auto-da43ff7fce8c
assert list(range(5)) == [0, 1, 2, 3, 4]
```

```python claim id=auto-82a10f6b558d
n = 0
for item in ['a', 'b', 'c']:
    n += 1
assert n == 3
```

```python claim
assert list(range(3)) == [0, 1, 2] and list(range(1, 4)) == [1, 2, 3] and list(range(0)) == []
```

```python example
for i in range(3):
    print(i)
print(list(range(2, 6)))
```

A loop often keeps a running total: start at 0 and add each item.

```python example
total = 0
for n in [4, 8, 15]:
    total = total + n
print(total)
```

::task sum-to

```python predict
for n in range(1, 4):
    print(n, end=" ")
```

::task up-to

`while` repeats as long as its condition is `True`. `break` leaves a loop at once, and `continue` skips to the next round.

```python claim id=auto-b93bd5decfb7
out = []
for i in range(5):
    if i == 1:
        continue
    if i == 3:
        break
    out.append(i)
assert out == [0, 2]
```

```python claim
seen = []
for n in range(10):
    if n == 1:
        continue
    if n == 4:
        break
    seen.append(n)
assert seen == [0, 2, 3]
```

```python example
n = 1
while n < 50:
    n = n * 3
print(n)
```

::task first-over

```python claim id=auto-7ef1433e332c
def prod(n):
    product = 1
    for i in range(1, n + 1): product = product * i
    return product
assert prod(5) == 120
assert prod(0) == 1
```

```python claim id=auto-ae8f764298dc
assert list(range(1, 4)) == [1, 2, 3]
assert list(range(1, 3 + 1))[-1] == 3
```

```python claim id=auto-3fd47a5a1cb5
assert list(range(3, 0, -1)) == [3, 2, 1]
```

```python claim id=auto-ed0d0275cb2c
def f(xs, limit):
    for x in xs:
        if x > limit:
            return x
    return None
assert f([1, 5, 9], 3) == 5
assert f([1], 3) is None
```

```python claim id=auto-93f2664edb45
assert all((n % 2 == 0) == (n in (-4, 0, 2, 10)) for n in (-4, -3, 0, 1, 2, 10, 11))
```

```python claim id=auto-136fa65510f5
assert list(range(1, 4)) == [1, 2, 3]
```

```python claim id=auto-8c5a2e3aed14
c = 0
for _ in 'abc':
    c += 1
assert c == 3
n = 0
while n < 2:
    n += 1
assert n == 2
```

```python claim id=auto-b156fc7703ff
out = []
for i in range(4):
    if i == 1:
        continue
    if i == 3:
        break
    out.append(i)
assert out == [0, 2]
```
