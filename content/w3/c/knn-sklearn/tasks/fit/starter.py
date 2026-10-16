from sklearn.neighbors import KNeighborsClassifier


def classify(X, y, new_rows):
    model = KNeighborsClassifier(n_neighbors=1)
    pass
    return model.predict(new_rows).tolist()
