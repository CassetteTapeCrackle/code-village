def test_feed():
    k = learner["Keeper"]("Noa")
    k.adopt(learner["Animal"]("Sly"))
    k.adopt(learner["Animal"]("Ollie"))
    expect_equal(k.feed_all(), ["Sly is fed", "Ollie is fed"], "adopt Sly and Ollie, then feed_all()")

def test_own_animals():
    a = learner["Keeper"]("Noa")
    a.adopt(learner["Animal"]("Sly"))
    expect_equal(learner["Keeper"]("Sam").feed_all(), [], "a second keeper's feed_all()")
