+++
id = "nearest-neighbour"
title = "The nearest neighbour"
world = "w3"
region = "c"
order = 8
concepts = ["nearest-neighbour"]
remember = ["math.dist(a, b) is the straight-line distance between two points, in any number of dimensions.", "Nearest neighbour: to label a new point, copy the label of the closest point you already know.", "With k neighbours, the k closest points vote.", "Columns with big numbers swamp the small ones in a distance: scale every column to 0 to 1 first."]
[loot]
id = "star-map"
name = "Star Map"
+++

This region builds a first piece of **machine learning**: a program that learns to label things from examples instead of from rules you write. It starts with a distance. `math.dist` measures the straight line between two points.

```python claim id=auto-4fa394281648
import math
assert math.dist((0, 0), (3, 4)) == 5.0
```

```python example
import math

a = (1, 2)
b = (4, 6)
print(math.dist(a, b))
print(math.sqrt((4 - 1) ** 2 + (6 - 2) ** 2))
```

A point can have as many numbers as you like: one per thing you measured (height, weight, age...). Each number is a **feature**.

```python claim
import math

assert math.dist((0, 0, 0), (1, 2, 2)) == 3.0
assert math.dist((1,), (4,)) == 3.0
```

::task closest

Now the idea. You know some points and their labels. To label a new point, find the **nearest** known point and copy its label. That is the whole nearest-neighbour method.

```python example
import math

known = [((1, 1), "fern"), ((2, 1), "fern"), ((8, 9), "pine"), ((9, 8), "pine")]

def nearest(point):
    best = min(known, key=lambda pair: math.dist(pair[0], point))
    return best[1]

print(nearest((2, 2)), nearest((7, 7)))
```

With one neighbour, one odd example can mislead you. Taking the **k** nearest and letting them vote is steadier.

::task classify

A distance adds up the (squared) differences of every feature, so the feature with the biggest numbers decides almost everything. Here the weight is in grams and the length in metres:

```python predict
import math

mouse = (20, 0.1)      # (grams, metres)
snake = (500, 1.5)
mystery = (150, 1.3)   # light and long: surely a snake?
print(math.dist(mystery, mouse) < math.dist(mystery, snake))
```

The grams swamp the metres. The fix is to **scale** every column to the same range, 0 for its smallest value and 1 for its largest, before measuring:

```python example
def scale(column):
    low, high = min(column), max(column)
    return [(x - low) / (high - low) for x in column]

print([round(x, 2) for x in scale([20, 500, 150])])
```

::task similar

```python claim id=auto-ada86b3c692b
import math
assert math.dist((0, 0), (3, 4)) == 5.0
```

```python claim id=auto-a18a6824a545
assert sorted([3, 1, 2])[:2] == [1, 2]
assert sorted([3, 1, 2, 0])[:3] == [0, 1, 2]
```

```python claim id=auto-59d2e0d6b302
import math
assert math.dist((0, 0), (3, 4)) == 5.0
assert math.dist((0, 0, 0), (1, 2, 2)) == 3.0
assert math.dist((1,), (4,)) == 3.0
```
