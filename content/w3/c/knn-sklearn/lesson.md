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

```python claim id=auto-9403544dd4ce
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=1)
m.fit([[0], [10]], ['low', 'high'])
assert list(m.predict([[1], [9]])) == ['low', 'high']
```

```python claim id=auto-4b9e3cd2c922
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
assert hasattr(KNeighborsClassifier, 'fit')
assert hasattr(DecisionTreeClassifier, 'fit')
assert hasattr(LogisticRegression, 'fit')
```

```python example
from sklearn.neighbors import KNeighborsClassifier

X = [[1, 1], [2, 1], [8, 9], [9, 8]]
y = ["fern", "fern", "pine", "pine"]
model = KNeighborsClassifier(n_neighbors=1)
model.fit(X, y)
print(model.predict([[2, 2], [7, 7]]).tolist())
```

This is the `nearest` function from the last lesson, in three lines. `predict` returns a NumPy array, so `.tolist()` gives a plain list back.

```python claim id=auto-12fc83219328
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=1).fit([[0], [10]], ['low', 'high'])
r = m.predict([[1], [9]])
assert isinstance(r, np.ndarray)
assert type(r.tolist()) is list
assert r.tolist() == ['low', 'high']
```

```python claim
import numpy as np
from sklearn.neighbors import KNeighborsClassifier

model = KNeighborsClassifier(n_neighbors=1).fit([[1, 1], [9, 9]], ["fern", "pine"])
assert isinstance(model.predict([[2, 2]]), np.ndarray)
assert model.predict([[2, 2]]).tolist() == ["fern"]
```

::task predict

`n_neighbors` is the **k**: how many neighbours vote. A small k follows every single example, odd ones too; a big k listens to the crowd, and with k as big as the data it always says the most common label.

```python claim id=auto-f3affc83bf89
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=3).fit([[0],[1],[2],[3]], [0,0,1,1])
assert m.kneighbors([[0]])[1].shape == (1, 3)
```

```python example
from sklearn.neighbors import KNeighborsClassifier

X = [[1], [2], [3], [10], [11]]
y = ["low", "low", "low", "high", "high"]
for k in [1, 3, 5]:
    model = KNeighborsClassifier(n_neighbors=k).fit(X, y)
    print(k, model.predict([[7]]).tolist())
```

`fit` returns the model itself, so `KNeighborsClassifier(...).fit(X, y)` fits it in one line.

```python claim id=auto-d0f0a81ed20c
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=1)
assert m.fit([[0],[1]], [0,1]) is m
assert KNeighborsClassifier(n_neighbors=1).fit([[0],[1]], [0,1]).predict([[1]]).tolist() == [1]
```

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

```python claim id=auto-bf85acf7822e
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=1).fit([[0,0],[10,10]], ['a','b'])
try:
    m.predict([8, 8])
    raise SystemExit('no error')
except ValueError as e:
    assert 'Expected 2D array, got 1D array instead' in str(e)
```

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

```python claim id=auto-d3ce613b8589
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
model = KNeighborsClassifier(n_neighbors=1).fit([[0], [10]], [0, 1])
r = model.predict([[1], [9]])
assert isinstance(r, np.ndarray)
assert r.tolist() == [0, 1]
assert type(r.tolist()) is list
```

```python claim id=auto-775b68c29768
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=1)
assert not hasattr(m, 'classes_')
m.fit([[0],[1]], ['a','b'])
assert list(m.classes_) == ['a','b']
```

```python claim id=auto-4cfee319f792
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=1).fit([[0],[10]], ['low','high'])
assert m.predict([[9]]).tolist() == ['high']
```

```python claim id=auto-2471b9f35dd5
from sklearn.neighbors import KNeighborsClassifier
k = 1
model = KNeighborsClassifier(n_neighbors=k)
model.fit([[0],[10]], ['a','b'])
assert model.predict([[1],[9]]).tolist() == ['a','b']
```

```python claim id=auto-7d0d4f939d14
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=1).fit([[0],[10]], ['a','b'])
r = m.predict([[1]])
assert isinstance(r, np.ndarray)
out = r.tolist()
assert type(out) is list and type(out[0]) is str and out == ['a']
```

```python claim id=auto-292f2cc772b9
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=1).fit([[0,0],[10,10]], ['a','b'])
assert m.predict([[1, 1]]).tolist() == ['a']
try:
    m.predict([1, 1])
    raise SystemExit('no error')
except ValueError:
    pass
```
