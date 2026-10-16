def test_lightest():
    expect_equal(learner["lightest"]("pack,kg\nbig,12\nday,4\nmid,7"), "day", "lightest(big 12, day 4, mid 7)")
