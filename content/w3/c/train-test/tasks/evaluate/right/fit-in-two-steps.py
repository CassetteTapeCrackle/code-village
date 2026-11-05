from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier


def evaluate(X, y):
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=0)
    model = KNeighborsClassifier(n_neighbors=1)
    model.fit(X_train, y_train)
    return float(model.score(X_test, y_test))
