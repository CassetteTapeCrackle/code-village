from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier


def evaluate(X, y):
    X_train, X_test, y_train, y_test = ...
    model = KNeighborsClassifier(n_neighbors=1).fit(X_train, y_train)
    return float(model.score(X_test, y_test))
