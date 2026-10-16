from sklearn.neighbors import KNeighborsClassifier


def crowd(X, y, new_rows):
    model = ...
    model.fit(X, y)
    return model.predict(new_rows).tolist()
