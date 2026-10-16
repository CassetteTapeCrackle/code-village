TEXT = "product,quantity,price\nlamp,2,12.5\nrope,3,4\nlamp,1,12.5\npick,1,30"

def test_rows():
    expect_equal(learner["read_sales"](TEXT)[0], {"product": "lamp", "quantity": 2, "price": 12.5}, "the first row")
    expect_equal(len(learner["read_sales"](TEXT)), 4, "how many rows")

def test_plain_types():
    row = learner["read_sales"](TEXT)[1]
    expect_equal((type(row["quantity"]).__name__, type(row["price"]).__name__), ("int", "float"), "the types of quantity and price")
