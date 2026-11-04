from sklearn.neighbors import KNeighborsClassifier


def size_of(X, y, height):
    model = KNeighborsClassifier(n_neighbors=1).fit(X, y)
    return str(model.predict([[height]])[0])
