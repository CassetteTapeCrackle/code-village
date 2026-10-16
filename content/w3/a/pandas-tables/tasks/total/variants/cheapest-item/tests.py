def test_cheapest():
    expect_equal(learner["cheapest"]("item,price\ntea,10\njam,?\nbun,9"), "bun", "cheapest(tea 10, jam ?, bun 9)")
