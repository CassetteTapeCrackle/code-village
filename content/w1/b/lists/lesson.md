+++
id = "lists"
title = "Lists"
world = "w1"
region = "b"
order = 6
concepts = ["lists"]
remember = [
  "A list keeps values in order; the first index is 0 and -1 is the last.",
  "append, remove and sort change the list itself and return None.",
  "b = a does not copy a list: both names point at the same list. Use a.copy() or list(a).",
]
[loot]
id = "slot-tray"
name = "Slot Tray"
+++

A list holds several values in order, between square brackets. You read one value by its position, its **index**, counting from 0. Negative indexes count from the end.

```python example
fruits = ["apple", "pear", "fig"]
print(fruits[0], fruits[-1], len(fruits))
```

::task last-item

A list can change. `append(x)` adds `x` at the end. It changes the list itself and returns `None`, so you never write `items = items.append(x)`. `remove(x)` deletes the first `x` it finds and `sort()` puts the list in order; they change the list itself too.

```python claim
items = [3, 1, 3]
assert items.append(2) is None and items == [3, 1, 3, 2]
items.remove(3)
assert items == [1, 3, 2]
assert items.sort() is None and items == [1, 2, 3]
```

```python example
nums = [3, 1]
nums.append(4)
print(nums)
```

::task add-twice

One trap catches almost everyone. `b = a` does not make a copy: it gives the same list a second name. Change it through one name, and the other name sees the change.

```python predict
a = [1, 2]
b = a
b.append(3)
print(a)
```

To get an independent list, copy it: `a.copy()` or `list(a)`.

```python claim
a = [1, 2]
b, c = a.copy(), list(a)
b.append(3)
assert a == [1, 2] and b is not a and c is not a
```

::task copy-and-add
