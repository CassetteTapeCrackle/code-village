def test_pours():
    b = learner["Bucket"](3)
    b.pour(1)
    expect_equal((b.litres, b.is_dry()), (2, False), "Bucket(3), pour(1)")

def test_dry():
    b = learner["Bucket"](2)
    b.pour(5)
    expect_equal((b.litres, b.is_dry()), (0, True), "Bucket(2), pour(5)")
