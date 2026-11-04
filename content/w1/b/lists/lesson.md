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

```python claim id=auto-4dfbf2abbe78
x = ['a', 'b', 'c']
assert x[-1] == 'c'
assert x[-3] == 'a'
```

```python claim id=auto-30983f41fba4
x = ['a', 'b', 'c']
assert x[0] == 'a'
assert x[2] == 'c'
```

```python claim id=auto-1ea7253e7227
x = [3, 1, 2]
assert type(x) is list
assert x[0] == 3 and x[1] == 1 and x[2] == 2
```

```python example
fruits = ["apple", "pear", "fig"]
print(fruits[0], fruits[-1], len(fruits))
```

::task last-item

A list can change. `append(x)` adds `x` at the end. It changes the list itself and returns `None`, so you never write `items = items.append(x)`. `remove(x)` deletes the first `x` it finds and `sort()` puts the list in order; they change the list itself too.

```python claim id=auto-f5b12b3da4fe
x = [3, 1, 3, 2]
r = x.remove(3)
assert r is None and x == [1, 3, 2]
r = x.sort()
assert r is None and x == [1, 2, 3]
```

```python claim id=auto-63dd43df4bbd
items = [1]
r = items.append(2)
assert r is None
assert items == [1, 2]
items = items.append(3)
assert items is None
```

```python claim id=auto-3fec6558ce22
x = [1, 2]
x.append(3)
assert x[-1] == 3 and x == [1, 2, 3]
```

```python claim id=auto-425d0466fda7
x = [1, 2]
x[0] = 9
x.append(3)
assert x == [9, 2, 3]
```

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

```python claim id=auto-a858cf32a1c1
a = [1, 2]
b = a
b.append(3)
assert a == [1, 2, 3]
a[0] = 9
assert b[0] == 9
```

```python claim id=auto-b3d804a25a65
a = [1, 2]
b = a
assert b is a
```

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

```python claim id=auto-8b145ebb50a3
items = [4, 5, 6]
assert items[-1] == 6
```

```python claim id=auto-90634fb1c15b
x = [1]
x.append([2, 3])
assert x == [1, [2, 3]]
assert len(x) == 2
```

```python claim id=auto-b99de4985f96
items = [1, 2]
new = items
assert new is items
new2 = items.copy()
assert new2 is not items and new2 == items
```

```python claim id=auto-a9fb964c68b1
x = [5, 6, 7]
assert x[0] == 5
assert x[-1] == 7
```

```python claim id=auto-a61015c6df1a
x = [3, 1, 2]
assert x.append(4) is None and x == [3, 1, 2, 4]
assert x.remove(3) is None and x == [1, 2, 4]
assert x.sort() is None and x == [1, 2, 4]
y = [2, 1]
assert y.sort() is None and y == [1, 2]
```

```python claim id=auto-6a9b3bfe01f6
a = [1]
b = a
assert a is b
b.append(2)
assert a == [1, 2]
```
