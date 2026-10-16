+++
id = "knn-sklearn"
title = "k nearest neighbours with scikit-learn"
world = "w3"
region = "c"
order = 9
concepts = ["knn-sklearn"]
remember = ["X is a list of rows (one list of features per example); y is the list of their labels.", "model = KNeighborsClassifier(n_neighbors=k), then model.fit(X, y) learns and model.predict(rows) labels new rows.", "predict gives a NumPy array: .tolist() turns it into a plain list.", "predict wants a list of rows, even for one point: model.predict([[x, y]]), not model.predict([x, y])."]
[loot]
id = "telescope-lens"
name = "Telescope Lens"
+++

**scikit-learn** has the nearest-neighbour method ready, along with many other ways to learn from examples. They all work the same way. The examples go in `X`, a list of rows with one list of features each, and their labels go in `y`. `fit` learns from them; `predict` labels new rows.

```python example
from sklearn.neighbors import KNeighborsClassifier

X = [[1, 1], [2, 1], [8, 9], [9, 8]]
y = ["fern", "fern", "pine", "pine"]
model = KNeighborsClassifier(n_neighbors=1)
model.fit(X, y)
print(model.predict([[2, 2], [7, 7]]).tolist())
```

This is the `nearest` function from the last lesson, in three lines. `predict` returns a NumPy array, so `.tolist()` gives a plain list back.

```python claim
import numpy as np
from sklearn.neighbors import KNeighborsClassifier

model = KNeighborsClassifier(n_neighbors=1).fit([[1, 1], [9, 9]], ["fern", "pine"])
assert isinstance(model.predict([[2, 2]]), np.ndarray)
assert model.predict([[2, 2]]).tolist() == ["fern"]
```

::task predict

`n_neighbors` is the **k**: how many neighbours vote. A small k follows every single example, odd ones too; a big k listens to the crowd, and with k as big as the data it always says the most common label.

```python example
from sklearn.neighbors import KNeighborsClassifier

X = [[1], [2], [3], [10], [11]]
y = ["low", "low", "low", "high", "high"]
for k in [1, 3, 5]:
    model = KNeighborsClassifier(n_neighbors=k).fit(X, y)
    print(k, model.predict([[7]]).tolist())
```

`fit` returns the model itself, so `KNeighborsClassifier(...).fit(X, y)` fits it in one line.

```python claim
from sklearn.neighbors import KNeighborsClassifier

model = KNeighborsClassifier(n_neighbors=1)
assert model.fit([[1], [9]], ["a", "b"]) is model
```

::task fit

`predict` always takes a **list of rows**, like `X`, even when you ask about one point. One point is a list holding one row:

```python predict
from sklearn.neighbors import KNeighborsClassifier

model = KNeighborsClassifier(n_neighbors=1).fit([[1, 1], [9, 9]], ["fern", "pine"])
print(model.predict([[8, 8]]).tolist())
```

`model.predict([8, 8])` (one pair of brackets) stops with `ValueError: Expected 2D array, got 1D array instead`.

```python claim
from sklearn.neighbors import KNeighborsClassifier

model = KNeighborsClassifier(n_neighbors=1).fit([[1, 1], [9, 9]], ["fern", "pine"])

try:
    model.predict([8, 8])
    raised = None
except ValueError as error:
    raised = error
assert raised is not None and str(raised).startswith("Expected 2D array, got 1D array instead")
```

::task one-point
