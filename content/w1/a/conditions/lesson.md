+++
id = "conditions"
title = "Conditions"
world = "w1"
region = "a"
order = 3
concepts = ["conditions"]
remember = ["== compares, = stores. if x = 3: is a syntax error.", "if / elif / else: only the first branch whose condition is True runs.", "Write a full comparison on each side: x == 1 or x == 2, never x == 1 or 2."]
[loot]
id = "brass-compass"
name = "Brass Compass"
+++

A comparison gives a `bool`: `==` equal, `!=` not equal, `<`, `<=`, `>`, `>=`. Careful: one `=` stores a value, two `==` compare, and `if x = 3:` is a syntax error.

```python claim
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

```python claim
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
