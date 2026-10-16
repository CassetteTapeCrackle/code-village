def test_size():
    expect_equal(learner["zeros"](2), [[0, 0], [0, 0]], "zeros(2)")

def test_rows_are_separate():
    grid = learner["zeros"](2)
    grid[0][0] = 1
    expect_equal(grid, [[1, 0], [0, 0]], "zeros(2), then setting grid[0][0] to 1")
