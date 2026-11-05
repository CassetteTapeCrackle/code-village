from sklearn.neighbors import KNeighborsClassifier


def label_one(X, y, x, z):
    model = KNeighborsClassifier(n_neighbors=1)
    model.fit(X, y)
    return model.predict([[x, z]]).tolist()[0]
