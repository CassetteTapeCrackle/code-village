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
