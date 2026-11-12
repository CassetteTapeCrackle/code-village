+++
id = "recursion"
title = "Recursion"
world = "w1"
region = "c"
order = 12
concepts = ["recursion"]
teaches = []
remember = ["A recursive function calls itself on a smaller input.", "Every recursion needs a base case that answers without calling itself.", "With no base case, Python stops with RecursionError after about 1000 calls."]
[loot]
id = "nesting-dolls"
name = "Nesting Dolls"
+++

A **recursive** function calls itself on a smaller problem. It needs a **base case**: an input small enough to answer directly, so the calls stop.

```python example
def countdown(n):
    if n == 0:
        print("liftoff")
        return
    print(n)
    countdown(n - 1)

countdown(3)
```

Each call waits for the smaller call to finish, then uses its answer.

```python claim id=auto-610d76da992d
order = []

def f(n):
    order.append(("enter", n))
    if n == 0:
        return 0
    result = f(n - 1) + 1
    order.append(("after", n))
    return result

assert f(3) == 3
assert order == [("enter", 3), ("enter", 2), ("enter", 1), ("enter", 0), ("after", 1), ("after", 2), ("after", 3)]
```

```python example
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
```

::task total

```python predict
def f(n):
    if n == 0:
        return 0
    return n + f(n - 1)

print(f(4))
```

Without a base case the calls never stop. Python gives up after about a thousand of them with a `RecursionError`.

```python claim id=auto-db472a1cf51c
import sys
def f(n):
    return f(n + 1)
assert sys.getrecursionlimit() == 1000
try:
    f(0)
    raised = False
except RecursionError:
    raised = True
assert raised
```

```python claim id=recursion-claim-1
import sys

depth = 0

def forever(n):
    global depth
    depth = n
    return forever(n + 1)

try:
    forever(1)
    raised = False
except RecursionError:
    raised = True
assert raised and sys.getrecursionlimit() == 1000 and 900 < depth <= 1000
```

::task power

::task countdown-list

```python claim id=auto-fc57096c331d
numbers = [4, 5, 6]
assert numbers[0] == 4
assert numbers[1:] == [5, 6]
```

```python claim id=auto-dd57b7bcd03f
word = 'hi'
assert [word] + ['hi'] == ['hi', 'hi']
assert [1] + [2] == [1, 2]
```

```python claim id=auto-579273e78ba0
import sys
def f(n):
    return f(n + 1)
assert sys.getrecursionlimit() == 1000
try:
    f(0)
    raised = False
except RecursionError:
    raised = True
assert raised
```

```python claim id=remember-15baa40d7c64
seen = []

def countdown(n):
    seen.append(n)
    if n == 0:
        return "done"
    return countdown(n - 1)

assert countdown(3) == "done"
assert seen == [3, 2, 1, 0]
```

```python claim id=remember-e611f88b22b0
import inspect
import sys

def forever(n):
    return forever(n - 1)

def total(n):
    if n == 0:
        return 0
    return n + total(n - 1)

assert total(4) == 10
limit = sys.getrecursionlimit()
sys.setrecursionlimit(len(inspect.stack()) + 50)  # fail fast
try:
    forever(3)
    stopped = False
except RecursionError:
    stopped = True
finally:
    sys.setrecursionlimit(limit)
assert stopped
```
