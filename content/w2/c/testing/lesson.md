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

```python claim id=auto-91ad12355b4f
try:
    assert 1 == 2, 'one is not two'
except AssertionError as e:
    assert str(e) == 'one is not two'
else:
    raise SystemExit('no error')
```

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

```python claim id=auto-6eab27f928fc
import warnings
warnings.simplefilter('ignore')
x = 1
exec('assert (x == 3, "message")')
assert bool((x == 3, 'message')) is True
```

```python claim id=auto-3d51136997a2
import ast, keyword
assert 'assert' in keyword.kwlist
assert isinstance(ast.parse('assert True').body[0], ast.Assert)
assert not callable(globals().get('assert'))
```

```python claim
x = 2
assert bool((x == 3, "message")) is True
```

::task total-test

```python claim id=auto-c639303e4080
import warnings
warnings.simplefilter('ignore')
t = (False, 'msg')
assert bool(t) is True
exec('assert (1 == 2, "msg")')
```

```python claim id=auto-6d7512c5971a
import warnings
warnings.simplefilter('ignore')
exec('assert ("a" == "b", "msg")')
assert bool((False, 'msg'))
```

```python claim id=auto-d41009efc60b
try:
    exec('assert 1 == 2, "message"')
except AssertionError as e:
    assert str(e) == 'message'
else:
    raise SystemExit('no error')
```
