import math
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier


def scale_columns(rows):
    columns = []
    for column in zip(*rows):
        low, high = min(column), max(column)
        columns.append([0.0 if high == low else (v - low) / (high - low) for v in column])
    return [list(row) for row in zip(*columns)]


def nearest_label(X, y, point):
    best = min(range(len(X)), key=lambda i: math.dist(X[i], point))
    return y[best]


def knn_predict(X, y, rows, k):
    model = KNeighborsClassifier(n_neighbors=k).fit(X, y)
    return model.predict(rows).tolist()


def star_accuracy(X, y):
    X_train, X_test, y_train, y_test = train_test_split(scale_columns(X), y, test_size=0.25, random_state=0)
    model = KNeighborsClassifier(n_neighbors=3).fit(X_train, y_train)
    return float(model.score(X_test, y_test))
