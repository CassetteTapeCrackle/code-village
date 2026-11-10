+++
id = "numpy-arrays"
title = "NumPy arrays"
world = "w3"
region = "b"
order = 5
concepts = ["numpy-arrays"]
teaches = []
remember = ["np.array(values) makes an array: maths on it (a * 2, a + b) works on every value at once.", "grid.shape gives (rows, columns); grid[r, c] reads one value and grid[:, c] a whole column; grid.sum(axis=0) adds down the columns.", "NumPy answers are NumPy numbers: float(x), int(x) and a.tolist() turn them into plain Python ones.", "* repeats a list but multiplies an array: [1, 2] * 2 is [1, 2, 1, 2], np.array([1, 2]) * 2 is [2 4]."]
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

```python claim id=auto-e86f52592516
import time
import numpy as np
n = 1_000_000
a = np.arange(n)
xs = list(range(n))
start = time.perf_counter()
b = a * 2
arr_time = time.perf_counter() - start
start = time.perf_counter()
c = [x * 2 for x in xs]
loop_time = time.perf_counter() - start
assert arr_time * 3 < loop_time
```

```python claim id=auto-0c5f89edd451
import numpy as np
assert str(np.array([1, 2, 3])) == '[1 2 3]'
assert ',' not in str(np.array([1.5, 2.5]))
```

```python claim id=auto-adb4b5b26c03
import numpy as np
a = np.array([1, 2, 3])
assert (a * 2).tolist() == [2, 4, 6]
assert (a + a).tolist() == [2, 4, 6]
assert a.sum() == 6 and a.min() == 1 and a.max() == 3 and a.mean() == 2.0
```

```python claim id=numpy-arrays-claim-1
import numpy as np

a = np.array([3, 5, 8])
assert str(a) == "[3 5 8]"
assert (a * 2).tolist() == [6, 10, 16] and (a + a).tolist() == [6, 10, 16]
```

::task scale

An array can have rows and columns. `shape` tells you how many of each. `grid[r, c]` reads one value; a `:` means "all of them", so `grid[:, 0]` is the first column. `axis=0` works down the columns, `axis=1` along the rows.

```python claim id=auto-1351e1260046
import numpy as np
g = np.array([[1, 2], [3, 4]])
assert g.sum(axis=0).tolist() == [4, 6]
assert g.sum(axis=1).tolist() == [3, 7]
```

```python claim id=auto-4e0eb53ca73e
import numpy as np
g = np.array([[1, 2], [3, 4]])
assert g[1, 0] == 3
assert g[:, 0].tolist() == [1, 3]
```

```python claim id=auto-46f2c90e43fe
import numpy as np
g = np.array([[1, 2, 3], [4, 5, 6]])
assert g.shape == (2, 3)
```

```python claim id=auto-2efaabfaec35
import numpy as np
g = np.array([[1, 2], [3, 4]])
assert g.ndim == 2 and g.shape == (2, 2)
```

```python claim id=numpy-arrays-claim-2
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

```python claim id=auto-6ed488d4bafb
import numpy as np
a = np.array([1, 2, 3])
assert type(a.sum()) is not int
assert isinstance(a.sum(), np.integer)
assert type(a.mean()) is not float
```

```python claim id=auto-fb02aadf87dd
import numpy as np
x = np.float64(2.5)
assert type(float(x)) is float
assert type(int(np.int64(3))) is int
l = np.array([1, 2]).tolist()
assert type(l) is list and type(l[0]) is int
```

```python claim id=auto-bef88be929d1
import numpy as np
x = np.float64(2.0)
assert str(x) == '2.0'
assert repr(x) == 'np.float64(2.0)'
assert str([x]) == '[np.float64(2.0)]'
```

```python claim id=numpy-arrays-claim-3
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

```python claim id=auto-b53ec373654c
assert [1, 2, 3] * 2 == [1, 2, 3, 1, 2, 3]
```

```python claim id=auto-3d8426e215ad
import numpy as np
assert [1, 2] * 2 == [1, 2, 1, 2]
assert (np.array([1, 2]) * 2).tolist() == [2, 4]
```

```python predict
import numpy as np

print([1, 2] * 2)
print(np.array([1, 2]) * 2)
```

::task doubled

```python claim id=auto-3120ac69ec57
import numpy as np
assert (np.array([1, 2]) * 3).tolist() == [3, 6]
```

```python claim id=auto-03d04b538442
import numpy as np
rows = [[1, 2], [3, 4], [5, 6]]
assert np.array(rows).sum(axis=0).tolist() == [9, 12]
```

```python claim id=auto-3c9fe7d92143
import numpy as np
a = np.array([1, 2, 3])
assert isinstance(a, np.ndarray)
assert (a * 4).tolist() == [4, 8, 12]
```

```python claim id=auto-7c9a2a849df6
import numpy as np
l = np.array([1, 2]).tolist()
assert type(l) is list
```

```python claim id=auto-fc36ec77e9c7
assert [1, 2] * 3 == [1, 2, 1, 2, 1, 2]
```

```python claim id=auto-8ed8dd04c455
import numpy as np
a = np.array([1, 2])
b = np.array([10, 20])
assert (a * 2).tolist() == [2, 4]
assert (a + b).tolist() == [11, 22]
```

```python claim id=auto-a158ca50e7c1
import numpy as np
a = np.array([1.5, 2.5])
assert type(a.sum()) is not float
assert type(float(a.sum())) is float
assert type(int(np.int64(3))) is int
assert type(a.tolist()[0]) is float
```

```python claim id=auto-ef955cb85221
import numpy as np
assert [1, 2] * 2 == [1, 2, 1, 2]
assert str(np.array([1, 2]) * 2) == '[2 4]'
```

```python claim id=auto-833faae90837
import numpy as np
r = np.array([1, 2]).sum(axis=0) * np.array([1, 1])
assert type(r.tolist()) is list
```

```python claim id=auto-3438a0ef3fa6
assert [1, 2, 3] * 2 == [1, 2, 3, 1, 2, 3]
```

```python claim id=auto-6f035779a1fe
import numpy as np
grid = np.array([[1, 2, 3], [4, 5, 6]])
assert grid.shape == (2, 3)
assert grid[1, 2] == 6
assert grid[:, 1].tolist() == [2, 5]
assert grid.sum(axis=0).tolist() == [5, 7, 9]
```
