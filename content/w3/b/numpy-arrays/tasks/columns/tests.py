def test_totals():
    expect_equal(learner["column_totals"]([[1, 2, 3], [4, 5, 6]]), [5, 7, 9], "column_totals([[1, 2, 3], [4, 5, 6]])")

def test_one_row():
    expect_equal(learner["column_totals"]([[7, 8]]), [7, 8], "column_totals([[7, 8]])")
