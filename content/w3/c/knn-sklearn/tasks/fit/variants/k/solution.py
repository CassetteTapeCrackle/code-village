from sklearn.neighbors import KNeighborsClassifier


def crowd(X, y, new_rows):
    model = KNeighborsClassifier(n_neighbors=5)
    model.fit(X, y)
    return model.predict(new_rows).tolist()
