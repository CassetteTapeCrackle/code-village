def test_order():
    B = learner["Bird"]
    got = [b.name for b in learner["alphabetical"]([B("wren"), B("jay"), B("owl")])]
    expect_equal(got, ["jay", "owl", "wren"], "alphabetical(wren, jay, owl)")
