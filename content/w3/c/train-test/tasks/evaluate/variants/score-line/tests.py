X = [[1], [2], [3], [4], [6], [7], [8], [9], [2.5], [7.5], [3.5], [6.5]]
Y = ["a", "a", "a", "b", "a", "b", "b", "b", "a", "b", "a", "b"]
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier

def expected():
    X_train, X_test, y_train, y_test = train_test_split(X, Y, test_size=0.25, random_state=0)
    return float(KNeighborsClassifier(n_neighbors=1).fit(X_train, y_train).score(X_test, y_test))

def test_the_score():
    expect_equal(learner["test_score"](X, Y), expected(), "test_score(X, Y)")

NOISY_X = [[8], [19], [18], [5], [12], [20], [16], [19], [3], [20], [1], [16]]
NOISY_Y = ["b", "a", "a", "b", "b", "b", "a", "a", "a", "b", "a", "a"]

def test_noisy_data():
    """here one neighbour scores 1.0 and two or three neighbours score 0.67"""
    expect_equal(learner["test_score"](NOISY_X, NOISY_Y), 1.0, "test_score(NOISY_X, NOISY_Y)")
