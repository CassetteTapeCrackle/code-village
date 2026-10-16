+++
id = "recursion"
title = "Recursion"
world = "w1"
region = "c"
order = 12
concepts = ["recursion"]
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

```python claim
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
