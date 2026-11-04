from sklearn.neighbors import KNeighborsClassifier


def labels_for(X, y, new_rows):
    model = KNeighborsClassifier(n_neighbors=1)
    model.fit(X, y)
    return model.predict(new_rows).tolist()
