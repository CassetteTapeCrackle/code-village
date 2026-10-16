from sklearn.neighbors import KNeighborsClassifier


def vote_labels(X, y, new_rows):
    model = KNeighborsClassifier(n_neighbors=5).fit(X, y)
    return model.predict(new_rows).tolist()
