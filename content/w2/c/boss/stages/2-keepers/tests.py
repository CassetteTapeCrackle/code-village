def test_feed():
    k = learner["Keeper"]("Noa")
    k.adopt(learner["Animal"]("Sly", "fox"))
    k.adopt(learner["Bird"]("Ollie", "owl", 95))
    expect_equal(k.feed_all(), ["Sly is fed", "Ollie is fed"], "feed_all() after adopting Sly and Ollie")
