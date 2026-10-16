+++
id = "testing"
title = "Testing with assert"
world = "w2"
region = "c"
order = 11
concepts = ["testing"]
remember = ["assert condition, \"message\" stops with AssertionError when the condition is false.", "A test calls your code with inputs whose answers you already know.", "Test the edges too: zero, one item, an empty list, the limits.", "Never put brackets around assert's two parts: a tuple is always true."]
[loot]
id = "rangers-whistle"
name = "Ranger's Whistle"
+++

Until now the checks were written for you. Writing your own is how real programmers stay sure their code still works after every change. The tool is `assert`: it does nothing when its condition is true, and stops with an `AssertionError` when it is false.

```python example
def double(n):
    return n * 2

def test_double():
    assert double(2) == 4
    assert double(0) == 0, "zero stays zero"

test_double()
print("all good")
```

A **test** is a function that calls your code with inputs whose answers you already know. The text after the comma is the message shown when the check fails.

```python claim
assert 1 + 1 == 2
try:
    assert 1 + 1 == 3, "maths is broken"
    raised = None
except AssertionError as error:
    raised = error
assert raised is not None and str(raised) == "maths is broken"
```

```python example
try:
    assert 1 + 1 == 3, "maths is broken"
except AssertionError as error:
    print("AssertionError:", error)
```

Good tests also try the **edges**: zero, a single item, an empty list, the exact limits. That is where bugs like to hide.

```python predict
def clamp(n, low, high):
    return max(low, min(n, high))

print(clamp(5, 0, 10), clamp(-3, 0, 10), clamp(99, 0, 10))
```

::task clamp-test

::task average-test

`assert` is a statement, not a function. Written with brackets around both parts, `assert (x == 3, "message")` checks a pair of values, and a pair is always true: the test can never fail.

```python claim
x = 2
assert bool((x == 3, "message")) is True
```

::task total-test
