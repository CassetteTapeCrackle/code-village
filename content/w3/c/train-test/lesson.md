+++
id = "train-test"
title = "Testing a model fairly"
world = "w3"
region = "c"
order = 10
concepts = ["train-test"]
remember = ["model.score(X, y) is the accuracy: the share of rows it labels right, from 0.0 to 1.0.", "train_test_split(X, y, test_size=0.25, random_state=0) keeps a quarter of the examples aside to test on; random_state makes the split the same every run.", "fit on the training part only, then score on the test part.", "Scoring a model on the data it learned from looks too good: a 1-neighbour model scores 1.0 there. Only the test score tells you how it does on new data."]
[loot]
id = "summit-pennant"
name = "Summit Pennant"
+++

How good is a model? Ask it about examples whose labels you know, and count how often it is right: that share is its **accuracy**. By hand, and then with scikit-learn:

```python example
from sklearn.metrics import accuracy_score

truth = ["a", "b", "b", "a"]
guess = ["a", "b", "a", "a"]
print(sum(t == g for t, g in zip(truth, guess)) / len(truth))
print(accuracy_score(truth, guess))
```

A model's `score(X, y)` predicts every row of `X` and gives the accuracy against `y` in one go.

```python claim id=train-test-claim-1
from sklearn.metrics import accuracy_score
from sklearn.neighbors import KNeighborsClassifier

X, y = [[1], [2], [8], [9]], ["a", "a", "b", "b"]
model = KNeighborsClassifier(n_neighbors=1).fit([[1], [9]], ["a", "b"])
assert model.score(X, y) == accuracy_score(y, model.predict(X)) == 1.0
assert model.score([[2], [8]], ["b", "b"]) == 0.5
```

::task accuracy

But which examples should you ask about? Not the ones it learned from: that is like giving a class the exam's answers the day before. Keep some examples aside. `train_test_split` shuffles the rows and splits them into a **training** part to `fit` on and a **test** part to `score` on. `random_state` fixes the shuffle, so every run gives the same split (and the same results).

```python claim id=auto-75a13d00fe2d
from sklearn.model_selection import train_test_split
X = list(range(20))
y = list(range(20))
a, b, c, d = train_test_split(X, y, test_size=0.25, random_state=0)
assert len(a) == 15 and len(b) == 5
assert sorted(a + b) == X
assert a != sorted(a)
e = train_test_split(X, y, test_size=0.25, random_state=0)
assert e[0] == a and e[1] == b
assert train_test_split(X, y, test_size=0.25, random_state=1)[0] != a
```

```python claim id=train-test-claim-2
from sklearn.model_selection import train_test_split

first = train_test_split(list(range(10)), test_size=0.3, random_state=0)
again = train_test_split(list(range(10)), test_size=0.3, random_state=0)
assert first == again and len(first[1]) == 3
assert first[1] != [7, 8, 9]
```

```python example
from sklearn.model_selection import train_test_split

X = [[i] for i in range(10)]
y = ["low"] * 5 + ["high"] * 5
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
print(len(X_train), len(X_test))
print(X_test)
```

::task evaluate

A model that has seen an example knows its label. A 1-neighbour model is the extreme case: each training point's nearest neighbour is itself, so on its own training data it is never wrong (unless two identical rows have different labels).

```python claim id=auto-a82e58ac9ac1
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
rng = np.random.RandomState(0)
X = rng.rand(50, 3)
y = rng.randint(0, 2, 50)
m = KNeighborsClassifier(n_neighbors=1).fit(X, y)
assert m.score(X, y) == 1.0
X2 = np.vstack([X, X[:1]])
y2 = np.append(y, 1 - y[0])
m2 = KNeighborsClassifier(n_neighbors=1).fit(X2, y2)
assert m2.score(X2, y2) < 1.0
```

```python claim id=train-test-claim-3
from sklearn.neighbors import KNeighborsClassifier

X, y = [[1], [2], [3]], ["a", "b", "a"]
assert KNeighborsClassifier(n_neighbors=1).fit(X, y).score(X, y) == 1.0
X, y = [[1], [2], [1]], ["a", "b", "b"]
assert KNeighborsClassifier(n_neighbors=1).fit(X, y).score(X, y) < 1.0
```

```python predict
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier

X = [[1], [2], [3], [4], [6], [7], [8], [9]]
y = ["a", "a", "a", "b", "a", "b", "b", "b"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=2)
model = KNeighborsClassifier(n_neighbors=1).fit(X_train, y_train)
print(model.score(X_train, y_train), model.score(X_test, y_test))
```

Perfect on what it has seen, a coin toss on what it has not. Only the test score is the honest one.

::task honest

```python claim id=auto-d33a47dbeb20
assert list(zip([1, 2], [1, 3])) == [(1, 1), (2, 3)]
```

```python claim id=auto-721fee6027f7
import numpy as np
from sklearn.model_selection import train_test_split
X = np.arange(40).reshape(20, 2)
y = np.arange(20)
a = train_test_split(X, y, test_size=0.25, random_state=0)
b = train_test_split(X, y, test_size=0.25, random_state=0)
assert len(a[1]) == 5 and len(a[0]) == 15
assert all((p == q).all() for p, q in zip(a, b))
```
