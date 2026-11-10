def test_k_too_big():
    """more neighbours than stars: your own ValueError, whose message mentions the stars"""
    try:
        learner["knn_predict"]([[0, 0], [1, 1]], ["dwarf", "giant"], [[0, 1]], 5)
    except ValueError as e:
        if "star" not in str(e).lower():
            raise Failure(f"the ValueError says {str(e)!r}: raise your own, with a message about the stars")
        return
    raise Failure("knn_predict with k=5 and 2 stars should raise ValueError")

def test_k_as_big_as_the_data():
    """k equal to the number of stars is allowed: they all vote"""
    got = learner["knn_predict"]([[0], [1], [9]], ["dwarf", "dwarf", "giant"], [[9]], 3)
    expect_equal(got, ["dwarf"], "knn_predict with k=3 and 3 stars")

def test_scaling_leaves_the_catalogue_alone():
    """scale_columns returns new rows and leaves the old ones as they were"""
    rows = [[3000, 1.0], [9000, 5.0]]
    learner["scale_columns"](rows)
    expect_equal(rows, [[3000, 1.0], [9000, 5.0]], "the rows after scale_columns(rows)")

def test_flat_column():
    """a column where every value is the same scales to 0.0"""
    expect_equal(learner["scale_columns"]([[5, 1], [5, 3]]), [[0.0, 0.0], [0.0, 1.0]], "scale_columns([[5, 1], [5, 3]])")

def test_the_split_is_the_one_asked_for():
    """on noisy data the accuracy depends on test_size, the random_state and the 3 neighbours"""
    X = [[3974, 9], [3534, 6], [6751, 8], [5562, 2], [5480, 1], [6722, 8], [4062, 9], [3959, 4], [5937, 8], [5215, 9], [4951, 7], [5617, 3], [3949, 3], [6555, 9], [4597, 1], [5750, 2]]
    y = ["dwarf", "dwarf", "giant", "dwarf", "giant", "giant", "giant", "giant", "giant", "giant", "dwarf", "giant", "dwarf", "dwarf", "dwarf", "giant"]
    expect_equal(learner["star_accuracy"](X, y), 0.5, "star_accuracy on 16 noisy stars")
