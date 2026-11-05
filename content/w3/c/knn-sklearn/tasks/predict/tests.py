X = [[1, 1], [2, 1], [8, 9], [9, 8]]
Y = ["dim", "dim", "bright", "bright"]

def test_two():
    expect_equal(learner["labels_for"](X, Y, [[1, 2], [9, 9]]), ["dim", "bright"], "labels_for(X, Y, [[1, 2], [9, 9]])")

def test_plain_list():
    result = learner["labels_for"](X, Y, [[5, 6]])
    if not isinstance(result, list):
        raise Failure("labels_for should return a plain list: end with .tolist()")

def test_only_the_closest_point_votes():
    expect_equal(learner["labels_for"](X, Y, [[9, 0]]), ["dim"], "labels_for(X, Y, [[9, 0]])")
