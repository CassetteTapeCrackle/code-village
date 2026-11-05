from sklearn.neighbors import KNeighborsClassifier


def classify(X, y, new_rows):
    model = KNeighborsClassifier(n_neighbors=2)
    model.fit(X, y)
    return model.predict(new_rows).tolist()
