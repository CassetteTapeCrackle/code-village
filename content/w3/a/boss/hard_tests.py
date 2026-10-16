def test_no_sales():
    """a slip with only its header line: no rows, totals {}, and a report with total 0 and best None"""
    expect_equal(learner["read_sales"]("product,quantity,price"), [], "read_sales with no rows")
    expect_equal(learner["totals"]([]), {}, "totals([])")
    learner["save_report"]("empty.json", [])
    report = learner["load_report"]("empty.json")
    expect_equal((report["total"], report["by_product"], report["best"]), (0, {}, None), "the report with no sales")

def test_a_product_that_sold_nothing():
    sales = learner["read_sales"]("product,quantity,price\nlamp,0,12.5\nrope,2,4")
    expect_equal(learner["totals"](sales), {"lamp": 0.0, "rope": 8.0}, "totals with a lamp that sold 0")

def test_thousands():
    """a price written "1,200" (in quotes, since it holds a comma)"""
    sales = learner["read_sales"]('product,quantity,price\ntent,1,"1,200"')
    expect_equal(sales, [{"product": "tent", "quantity": 1, "price": 1200.0}], 'read_sales with a price of "1,200"')
