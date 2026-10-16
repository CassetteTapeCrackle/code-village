def test_with_a_question_mark():
    expect_equal(learner["total_price"]("item,price\ntea,3\njam,?\nbun,2"), 5.0, "total_price(tea 3, jam ?, bun 2)")

def test_all_numbers():
    expect_equal(learner["total_price"]("item,price\ntea,3\nbun,2"), 5.0, "total_price(tea 3, bun 2)")
