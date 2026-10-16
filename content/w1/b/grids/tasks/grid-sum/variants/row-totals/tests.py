def test_two_rows():
    expect_equal(learner["row_totals"]([[1, 2], [3, 4]]), [3, 7], "row_totals([[1, 2], [3, 4]])")

def test_empty():
    expect_equal(learner["row_totals"]([]), [], "row_totals([])")
