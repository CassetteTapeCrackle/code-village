+++
id = "grids"
title = "Lists of lists"
world = "w1"
region = "b"
order = 7
concepts = ["grids"]
remember = ["grid[r][c]: first the row, then the column.", "A loop inside a loop visits every cell.", "[[0] * 3] * 3 repeats one row three times; build each row on its own."]
[loot]
id = "slate-grid"
name = "Slate Grid"
+++

A list can hold lists. A **grid** is a list of rows, and `grid[row][col]` reads one cell: first the row, then the column.

```python claim id=auto-ef8e9696d81d
grid = [[1, 2, 3], [4, 5, 6]]
assert grid[1][0] == 4
assert grid[0][2] == 3
```

```python claim id=auto-7033d148d2d1
x = [[1, 2], [3]]
assert x[0] == [1, 2]
assert isinstance(x[1], list)
```

```python example
grid = [[1, 2, 3],
        [4, 5, 6]]
print(grid[1][0], len(grid), len(grid[0]))
```

Two loops, one inside the other, visit every cell: the outer loop takes a row, the inner loop walks along it.

```python example
grid = [[1, 2], [3, 4]]
for row in grid:
    for cell in row:
        print(cell, end=" ")
```

::task grid-sum

Building a grid needs care. `[[0] * 3] * 3` makes **one** row and puts it in the grid three times, so changing one row changes them all. Build each row on its own instead.

```python claim id=auto-177ddc457419
g = [[0] * 3] * 3
assert g[0] is g[1] is g[2]
g[0][0] = 9
assert g == [[9, 0, 0]] * 3
```

```python claim id=grids-claim-1
shared = [[0] * 3] * 3
assert shared[0] is shared[1]
own = [[0] * 3 for _ in range(3)]
own[0][0] = 9
assert own[1] == [0, 0, 0] and own[0] is not own[1]
```

```python predict
grid = [[0] * 3] * 3
grid[0][0] = 9
print(grid)
```

::task board

::task column

```python claim id=auto-8935ab4deef3
line = [2, 3, 4]
product = 1
for value in line:
    product = product * value
assert product == 24
```

```python claim id=auto-7bdad4550074
grid = [[1, 2], [3, 4]]
assert grid[0][1] == 2
assert grid[1][0] == 3
```

```python claim id=auto-1e6a0c38fa1f
g = [[0] * 3] * 3
assert g[0] is g[1] is g[2]
g[0][0] = 1
assert g == [[1, 0, 0]] * 3
h = [[0] * 3 for _ in range(3)]
h[0][0] = 1
assert h[1][0] == 0
```
