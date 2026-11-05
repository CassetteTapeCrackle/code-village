+++
id = "conditions"
title = "Conditions"
world = "w1"
region = "a"
order = 3
concepts = ["conditions"]
teaches = ["if-statement"]
remember = ["== compares, = stores. if x = 3: is a syntax error.", "if / elif / else: only the first branch whose condition is True runs.", "Write a full comparison on each side: x == 1 or x == 2, never x == 1 or 2."]
[loot]
id = "brass-compass"
name = "Brass Compass"
+++

A comparison gives a `bool`: `==` equal, `!=` not equal, `<`, `<=`, `>`, `>=`. Careful: one `=` stores a value, two `==` compare, and `if x = 3:` is a syntax error.

```python claim id=auto-c877a2edb333
x = 1
assert (x == 1) is True
try:
    compile('if x = 3:\n    pass', 's', 'exec')
    raise AssertionError('no error')
except SyntaxError:
    pass
```

```python claim id=conditions-claim-1
try:
    compile("if x = 3:\n    pass", "lesson", "exec")
    raised = False
except SyntaxError:
    raised = True
assert raised
```

```python example
print(3 == 3, 3 != 4, 10 <= 9)
```

`if` runs its indented block only when its condition is `True`. `elif` tries another condition, and `else` catches everything left. Only the first branch that matches runs.

```python claim id=auto-0cf29863d7c0
out = []
x = 5
if x > 1:
    out.append('first')
elif x > 2:
    out.append('second')
else:
    out.append('third')
assert out == ['first']
```

```python claim id=auto-15427b090620
def pick(n):
    if n > 10:
        return "big"
    elif n > 5:
        return "mid"
    else:
        return "small"
assert [pick(20), pick(7), pick(1)] == ["big", "mid", "small"]
ran = []
if True:
    ran.append(1)
elif True:
    ran.append(2)
else:
    ran.append(3)
assert ran == [1]
```

```python example
temp = 18
if temp > 25:
    print("hot")
elif temp > 15:
    print("mild")
else:
    print("cold")
```

::task sign

Combine conditions with `and`, `or` and `not`. Each side must be a full comparison. `x == 1 or 2` does not mean "x is 1 or 2": Python reads it as `(x == 1) or 2`. When the left side is False, `or` hands back the right side itself, so the result is `2`, which counts as true in an `if`.

```python claim id=auto-1b1eba359878
x = 3
r = (x == 1 or 2)
assert r == 2
assert bool(r) is True
```

```python claim id=auto-547e08bd9da4
import ast
x = 3
t = ast.parse('x == 1 or 2', mode='eval').body
assert isinstance(t, ast.BoolOp) and isinstance(t.values[0], ast.Compare)
assert (x == 1 or 2) == 2
```

```python claim id=conditions-claim-2
x = 5
assert (x == 1 or 2) == 2 and bool(2) is True
assert (x == 1 or x == 2) is False
```

```python predict
x = 5
print(x == 1 or x == 2, x == 1 or 2)
```

::task weekend

::task ticket-price

```python claim id=auto-c3be7811b58c
out = []
x = 10
if x > 1:
    out.append(1)
elif x > 5:
    out.append(2)
else:
    out.append(3)
assert out == [1]
```
