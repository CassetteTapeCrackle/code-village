TEXT = "product,quantity,price\nlamp,2,12.5\nrope,3,4\nlamp,1,12.5\npick,1,30"

def test_totals():
    expect_equal(learner["totals"](learner["read_sales"](TEXT)), {"lamp": 37.5, "rope": 12.0, "pick": 30.0}, "totals of the four slips")
