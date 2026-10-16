+++
id = "numpy-arrays"
title = "NumPy arrays"
world = "w3"
region = "b"
order = 5
concepts = ["numpy-arrays"]
remember = ["np.array(values) makes an array: maths on it (a * 2, a + b) works on every value at once.", "grid.shape gives (rows, columns); grid[r, c] reads one value and grid[:, c] a whole column; sum(axis=0) adds down the columns.", "NumPy answers are NumPy numbers: float(x), int(x) and a.tolist() turn them into plain Python ones.", "* repeats a list but multiplies an array: [1, 2] * 2 is [1, 2, 1, 2], np.array([1, 2]) * 2 is [2 4]."]
[loot]
id = "abacus-beads"
name = "Abacus Beads"
+++

To double every price in a list, you write a loop or a comprehension. **NumPy** gives you the **array**: a list of numbers where maths works on every value at once.

```python example
import numpy as np

prices = [3, 5, 8]
print([p * 2 for p in prices])
a = np.array(prices)
print(a * 2, a + a, a.sum())
```

An array prints without commas. `a * 2` doubles each value, `a + a` adds the values pair by pair, and arrays have `sum`, `min`, `max` and `mean` built in. With a million numbers, this is also much faster than a loop.

```python claim
import numpy as np

a = np.array([3, 5, 8])
assert str(a) == "[3 5 8]"
assert (a * 2).tolist() == [6, 10, 16] and (a + a).tolist() == [6, 10, 16]
```

::task scale

An array can have rows and columns. `shape` tells you how many of each. `grid[r, c]` reads one value; a `:` means "all of them", so `grid[:, 0]` is the first column. `axis=0` works down the columns, `axis=1` along the rows.

```python claim
import numpy as np

grid = np.array([[1, 2, 3], [4, 5, 6]])
assert grid.shape == (2, 3) and grid[:, 0].tolist() == [1, 4]
assert grid.sum(axis=0).tolist() == [5, 7, 9] and grid.sum(axis=1).tolist() == [6, 15]
```

```python example
import numpy as np

grid = np.array([[1, 2, 3], [4, 5, 6]])
print(grid.shape)
print(grid[1, 2], grid[:, 0])
print(grid.sum(axis=0))
```

The answers NumPy gives are NumPy numbers. They print like plain numbers on their own, but show their type inside a list. `float()`, `int()` and `.tolist()` turn them into plain Python values, which is what you want to return, save to JSON, or compare.

```python claim
import numpy as np

m = np.array([1.5, 2.5]).mean()
assert str(m) == "2.0" and repr(m) == "np.float64(2.0)"
assert type(float(m)) is float and type(np.array([1, 2]).tolist()[0]) is int
```

```python example
import numpy as np

a = np.array([1.5, 2.5])
print([a.mean()])
print([float(a.mean())], a.tolist())
```

::task columns

Careful: the same `*` does different things to a list and to an array. A list times 2 is the list **repeated** twice.

```python predict
import numpy as np

print([1, 2] * 2)
print(np.array([1, 2]) * 2)
```

::task doubled
