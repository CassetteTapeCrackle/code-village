import math
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier


def scale_columns(rows):
    columns = []
    for c in range(len(rows[0])):
        column = []
        for row in rows:
            column.append(row[c])
        low = min(column)
        high = max(column)
        scaled = []
        for v in column:
            if high == low:
                scaled.append(0.0)
            else:
                scaled.append((v - low) / (high - low))
        columns.append(scaled)
    result = []
    for r in range(len(columns[0])):
        row = []
        for column in columns:
            row.append(column[r])
        result.append(row)
    return result


def nearest_label(X, y, point):
    best = min(range(len(X)), key=lambda i: math.dist(X[i], point))
    return y[best]


def knn_predict(X, y, rows, k):
    if k > len(X):
        raise ValueError(f"k is {k}, but there are only {len(X)} known stars")
    model = KNeighborsClassifier(n_neighbors=k).fit(X, y)
    return model.predict(rows).tolist()


def star_accuracy(X, y):
    X_train, X_test, y_train, y_test = train_test_split(scale_columns(X), y, test_size=0.25, random_state=0)
    model = KNeighborsClassifier(n_neighbors=3).fit(X_train, y_train)
    return float(model.score(X_test, y_test))
